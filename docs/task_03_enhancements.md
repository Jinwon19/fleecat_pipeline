# Task 03: 향상된 기능 (Phase 5)

## 📋 목표

**자동화 + 모니터링 + 성능 최적화**
- 정기적 자동 크롤링 스케줄러
- 크롤링 로그 및 모니터링 시스템
- 에러 알림 기능
- (선택) 카카오맵 전환 및 성능 개선

**예상 소요 시간**: 2-3일

---

## ✅ Phase 5: 자동화 스케줄러

### 5.1 node-cron 설정
- [ ] `node-cron` 패키지 설치
  ```bash
  npm install node-cron
  ```

### 5.2 스케줄러 서비스 구현
- [ ] `be/src/services/scheduler.service.js` 생성
  ```javascript
  const cron = require('node-cron');
  const crawlerService = require('./crawler.service');
  const geocodingService = require('./geocoding.service');
  const logger = require('../utils/logger');

  class SchedulerService {
    constructor() {
      this.jobs = [];
    }

    // 매일 오전 6시 크롤링
    startDailyCrawl() {
      const job = cron.schedule('0 6 * * *', async () => {
        logger.info('Scheduled crawl started');
        try {
          await this.executeCrawl();
          logger.info('Scheduled crawl completed');
        } catch (error) {
          logger.error('Scheduled crawl failed:', error);
        }
      }, {
        timezone: 'Asia/Seoul'
      });

      this.jobs.push(job);
      logger.info('Daily crawl scheduled at 6:00 AM KST');
    }

    // 매주 일요일 오전 3시 전체 지오코딩 재실행
    startWeeklyGeocoding() {
      const job = cron.schedule('0 3 * * 0', async () => {
        logger.info('Weekly geocoding started');
        try {
          await geocodingService.geocodeAllMarkets();
          logger.info('Weekly geocoding completed');
        } catch (error) {
          logger.error('Weekly geocoding failed:', error);
        }
      }, {
        timezone: 'Asia/Seoul'
      });

      this.jobs.push(job);
      logger.info('Weekly geocoding scheduled at 3:00 AM on Sundays');
    }

    async executeCrawl() {
      const startTime = Date.now();
      const result = {
        success: 0,
        failed: 0,
        updated: 0,
        created: 0,
        errors: []
      };

      try {
        const markets = await crawlerService.crawlMarketList();

        for (const market of markets) {
          try {
            const existing = await marketRepository.getMarketByUrl(market.url);

            if (existing) {
              await marketRepository.updateMarket(existing.market_id, market);
              result.updated++;
            } else {
              await marketRepository.createMarket(market);
              result.created++;
            }

            // 지오코딩
            if (!existing || !existing.latitude) {
              await geocodingService.geocodeAddress(market.place);
            }

            result.success++;
          } catch (error) {
            result.failed++;
            result.errors.push({
              url: market.url,
              error: error.message
            });
          }

          await crawlerService.sleep(1000);
        }
      } catch (error) {
        logger.error('Crawl execution failed:', error);
        throw error;
      }

      const duration = Date.now() - startTime;
      result.duration = duration;

      // 로그 저장
      await this.saveCrawlLog(result);

      return result;
    }

    async saveCrawlLog(result) {
      // crawl_logs 테이블에 저장 (추후 구현)
      logger.info('Crawl result:', result);
    }

    stopAll() {
      this.jobs.forEach(job => job.stop());
      logger.info('All scheduled jobs stopped');
    }
  }

  module.exports = new SchedulerService();
  ```

### 5.3 서버 시작 시 스케줄러 활성화
- [ ] `be/server.js` 수정
  ```javascript
  const schedulerService = require('./src/services/scheduler.service');

  // 서버 시작 후 스케줄러 활성화
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);

    // 스케줄러 시작
    if (process.env.ENABLE_SCHEDULER === 'true') {
      schedulerService.startDailyCrawl();
      schedulerService.startWeeklyGeocoding();
    }
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    schedulerService.stopAll();
    process.exit(0);
  });
  ```

### 5.4 환경 변수 추가
- [ ] `.env` 파일 업데이트
  ```env
  ENABLE_SCHEDULER=true
  CRON_DAILY_CRAWL=0 6 * * *     # 매일 오전 6시
  CRON_WEEKLY_GEOCODING=0 3 * * 0 # 매주 일요일 오전 3시
  ```

### 5.5 수동 트리거 API
- [ ] `POST /api/admin/crawl/trigger` 엔드포인트 구현
  ```javascript
  async function triggerManualCrawl(req, res) {
    try {
      const result = await schedulerService.executeCrawl();
      res.json({ success: true, result });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  ```

### 5.6 테스트
- [ ] 스케줄 설정 확인 (cron expression 검증)
- [ ] 수동 트리거로 스케줄러 실행 테스트
- [ ] 로그 출력 확인
- [ ] 타임존 설정 확인 (Asia/Seoul)

---

## ✅ 크롤링 로그 시스템

### 6.1 로그 테이블 생성
- [ ] Supabase에 `crawl_logs` 테이블 생성
  ```sql
  CREATE TABLE crawl_logs (
    log_id BIGSERIAL PRIMARY KEY,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    success_count INT DEFAULT 0,
    failed_count INT DEFAULT 0,
    created_count INT DEFAULT 0,
    updated_count INT DEFAULT 0,
    duration_ms INT,
    errors JSONB,
    status VARCHAR(50) DEFAULT 'running', -- running, completed, failed
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE INDEX idx_crawl_logs_started ON crawl_logs(started_at DESC);
  ```

### 6.2 로그 저장 로직
- [ ] `be/src/repositories/crawl.repository.js` 생성
  - `createCrawlLog(data)` - 크롤링 시작 시 로그 생성
  - `updateCrawlLog(logId, data)` - 크롤링 완료 시 업데이트
  - `getCrawlLogs(limit)` - 최근 로그 조회

### 6.3 로그 조회 API
- [ ] `GET /api/admin/crawl/logs` 구현
  ```javascript
  async function getCrawlLogs(req, res) {
    try {
      const limit = req.query.limit || 20;
      const logs = await crawlRepository.getCrawlLogs(limit);
      res.json({ success: true, data: logs });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  ```

### 6.4 통계 대시보드 API
- [ ] `GET /api/admin/crawl/stats` 구현
  ```javascript
  async function getCrawlStats(req, res) {
    try {
      const stats = {
        totalMarkets: await marketRepository.countMarkets(),
        marketsWithCoords: await marketRepository.countMarketsWithCoords(),
        lastCrawl: await crawlRepository.getLastCrawlLog(),
        avgDuration: await crawlRepository.getAvgCrawlDuration(),
        successRate: await crawlRepository.getSuccessRate()
      };
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  ```

---

## ✅ 에러 알림 시스템

### 7.1 이메일 알림 (Nodemailer)
- [ ] `nodemailer` 패키지 설치
  ```bash
  npm install nodemailer
  ```

- [ ] `be/src/services/notification.service.js` 생성
  ```javascript
  const nodemailer = require('nodemailer');

  class NotificationService {
    constructor() {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });
    }

    async sendCrawlErrorEmail(result) {
      if (result.failed === 0) return;

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.ADMIN_EMAIL,
        subject: `[FleeCat] 크롤링 에러 발생 (${result.failed}건)`,
        html: `
          <h2>크롤링 에러 리포트</h2>
          <p>성공: ${result.success}건</p>
          <p>실패: ${result.failed}건</p>
          <p>소요 시간: ${result.duration}ms</p>
          <h3>에러 목록:</h3>
          <ul>
            ${result.errors.map(e => `<li>${e.url}: ${e.error}</li>`).join('')}
          </ul>
        `
      };

      await this.transporter.sendMail(mailOptions);
    }
  }

  module.exports = new NotificationService();
  ```

### 7.2 슬랙 알림 (선택 사항)
- [ ] Slack Webhook 설정
- [ ] `axios`로 Slack API 호출
  ```javascript
  async sendSlackNotification(message) {
    await axios.post(process.env.SLACK_WEBHOOK_URL, {
      text: message,
      channel: '#fleecat-alerts'
    });
  }
  ```

### 7.3 환경 변수 추가
- [ ] `.env` 파일 업데이트
  ```env
  # 이메일 알림
  EMAIL_USER=your-email@gmail.com
  EMAIL_PASSWORD=your-app-password
  ADMIN_EMAIL=admin@example.com

  # 슬랙 알림 (선택)
  SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
  ```

### 7.4 알림 트리거
- [ ] 크롤링 실패 시 알림
- [ ] 지오코딩 실패율 높을 시 알림
- [ ] 서버 에러 발생 시 알림

---

## ✅ (선택) 카카오맵 SDK 전환

### 8.1 Leaflet → 카카오맵 전환 결정
- [ ] 카카오맵 장점 검토
  - 한국 지역 최적화
  - 상세한 한국 지도
  - 카카오 생태계 연동
- [ ] Leaflet 유지 시 장점
  - 오픈소스 무료
  - 글로벌 표준
  - 커스터마이징 자유도

**결정**: ___________

### 8.2 카카오맵 적용 (선택한 경우)
- [ ] 카카오 개발자에서 JavaScript 키 발급
- [ ] `public/index.html`에 스크립트 추가
  ```html
  <script type="text/javascript" src="//dapi.kakao.com/v2/maps/sdk.js?appkey=YOUR_APP_KEY"></script>
  ```

- [ ] `Visual.jsx` 카카오맵으로 변경
  ```javascript
  useEffect(() => {
    const container = document.getElementById('map');
    const options = {
      center: new kakao.maps.LatLng(37.5665, 126.9780),
      level: 7
    };

    const map = new kakao.maps.Map(container, options);

    // 마커 추가
    markets.forEach(market => {
      const position = new kakao.maps.LatLng(
        market.latitude,
        market.longitude
      );

      const marker = new kakao.maps.Marker({ position });
      marker.setMap(map);

      // 인포윈도우
      const infowindow = new kakao.maps.InfoWindow({
        content: `<div>${market.market_name}</div>`
      });

      kakao.maps.event.addListener(marker, 'click', () => {
        infowindow.open(map, marker);
      });
    });
  }, [markets]);
  ```

- [ ] 마커 클러스터링 구현 (카카오 Clusterer)

---

## ✅ 성능 최적화

### 9.1 데이터베이스 최적화
- [ ] 인덱스 추가
  ```sql
  CREATE INDEX idx_markets_geocoded ON markets(latitude, longitude) WHERE latitude IS NOT NULL;
  CREATE INDEX idx_sessions_date_range ON sessions USING BTREE (start_date, end_date);
  ```

- [ ] 쿼리 최적화
  - JOIN 최소화
  - 필요한 컬럼만 SELECT
  - LIMIT/OFFSET 페이지네이션

### 9.2 API 응답 캐싱
- [ ] Redis 캐싱 (선택 사항)
  ```bash
  npm install redis
  ```

  ```javascript
  const redis = require('redis');
  const client = redis.createClient();

  async function getCachedMarkets() {
    const cached = await client.get('markets:all');
    if (cached) return JSON.parse(cached);

    const markets = await marketRepository.getAllMarkets();
    await client.setEx('markets:all', 3600, JSON.stringify(markets)); // 1시간 캐시
    return markets;
  }
  ```

### 9.3 프론트엔드 최적화
- [ ] 마커 가상화 (Viewport만 렌더링)
- [ ] 이미지 Lazy Loading
- [ ] React.memo로 불필요한 리렌더링 방지
- [ ] useCallback/useMemo 적용

### 9.4 크롤링 최적화
- [ ] 병렬 크롤링 (Promise.all)
  ```javascript
  const promises = urls.map(url => crawlPage(url));
  const results = await Promise.all(promises);
  ```

- [ ] 실패한 URL 재시도 로직
- [ ] 타임아웃 설정

---

## 📦 산출물

**완료 후 확인 사항**:
1. ✅ 매일 오전 6시 자동 크롤링 실행됨
2. ✅ 크롤링 로그가 DB에 저장됨
3. ✅ 에러 발생 시 이메일/슬랙 알림 발송
4. ✅ 관리자 대시보드 API 작동
5. ✅ (선택) 카카오맵으로 전환 완료
6. ✅ 성능 최적화 적용

**Cron Schedule 예시**:
```javascript
'0 6 * * *'       // 매일 오전 6시
'0 */6 * * *'     // 6시간마다
'0 3 * * 0'       // 매주 일요일 오전 3시
'0 0 1 * *'       // 매월 1일 자정
```

**로그 API 응답 예시**:
```json
{
  "success": true,
  "data": [
    {
      "log_id": 1,
      "started_at": "2025-10-15T06:00:00Z",
      "completed_at": "2025-10-15T06:05:32Z",
      "success_count": 45,
      "failed_count": 2,
      "created_count": 3,
      "updated_count": 42,
      "duration_ms": 332000,
      "status": "completed",
      "errors": [
        {
          "url": "https://example.com",
          "error": "Timeout"
        }
      ]
    }
  ]
}
```

---

## 📝 참고사항

### Cron Expression 가이드
```
┌───────────── 분 (0 - 59)
│ ┌───────────── 시 (0 - 23)
│ │ ┌───────────── 일 (1 - 31)
│ │ │ ┌───────────── 월 (1 - 12)
│ │ │ │ ┌───────────── 요일 (0 - 7) (0과 7은 일요일)
│ │ │ │ │
* * * * *
```

### Logger 설정 (Winston)
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console()
  ]
});

module.exports = logger;
```

### PM2로 프로덕션 실행
```bash
npm install -g pm2

# 서버 시작
pm2 start server.js --name fleecat-backend

# 로그 확인
pm2 logs fleecat-backend

# 재시작
pm2 restart fleecat-backend
```

---

## ⚠️ 주의사항

1. **스케줄러 중복 실행 방지**
   - 서버 여러 대 운영 시 한 곳에서만 실행
   - 분산 락 (Redis) 사용 고려

2. **크롤링 부하 관리**
   - 피크 시간대 피하기 (오전 6시 권장)
   - 사이트별 delay 설정
   - 너무 자주 실행하지 않기

3. **알림 스팸 방지**
   - 동일 에러 반복 알림 방지
   - 알림 간격 제한 (최소 1시간)
   - 중요도별 알림 채널 분리

4. **환경별 설정 분리**
   - 개발: 스케줄러 비활성화
   - 스테이징: 1일 1회 실행
   - 프로덕션: 자동화 활성화

5. **로그 용량 관리**
   - 오래된 로그 주기적 삭제 (90일 이상)
   - 에러 상세 로그는 별도 저장

---

## 🎯 프로젝트 완료

모든 Task 완료 후:
1. ✅ 전체 시스템 통합 테스트
2. ✅ 프로덕션 배포 준비
3. ✅ 모니터링 대시보드 확인
4. ✅ 사용자 문서 작성

**축하합니다! FleeCat 플리마켓 자동화 시스템이 완성되었습니다!**
