# Task 02: 핵심 기능 구현 (Phase 3-4)

## 📋 목표

**크롤링 자동화 + 프론트엔드 연동**
- Python 크롤링 로직을 JavaScript로 변환
- 크롤링 API 엔드포인트 구현
- React에서 백엔드 API 연동
- 지도에 실시간 데이터 표시

**예상 소요 시간**: 3-5일

---

## ✅ Phase 3: 크롤링 기능 JavaScript 변환

### 3.1 기존 Python 크롤링 로직 분석
- [ ] `flea_list_fast.py` 분석
  - 목록 페이지 크롤링 로직 파악
  - 사용된 라이브러리 확인 (requests, BeautifulSoup, Selenium)
- [ ] `flea_text_fast.py` 분석
  - 상세 페이지 크롤링 로직 파악
  - 데이터 추출 방식 확인
- [ ] `llm_processor.py` 분석
  - OpenAI API 사용 방식
  - 데이터 정제 로직

### 3.2 필수 NPM 패키지 설치
- [ ] 크롤링 패키지 설치
  ```bash
  npm install axios cheerio puppeteer
  ```
- [ ] OpenAI API 패키지 설치 (선택)
  ```bash
  npm install openai
  ```

### 3.3 crawler.service.js 구현

#### 3.3.1 기본 크롤러 설정
- [ ] `be/src/services/crawler.service.js` 생성
  ```javascript
  const axios = require('axios');
  const cheerio = require('cheerio');
  const puppeteer = require('puppeteer');

  const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

  class CrawlerService {
    constructor() {
      this.maxRetries = 3;
      this.delay = 1000; // 1초 delay
    }

    async sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 기본 HTTP 요청
    async fetchPage(url) {
      try {
        const response = await axios.get(url, {
          headers: { 'User-Agent': USER_AGENT },
          timeout: 10000
        });
        return response.data;
      } catch (error) {
        console.error(`Failed to fetch ${url}:`, error.message);
        throw error;
      }
    }
  }

  module.exports = new CrawlerService();
  ```

#### 3.3.2 목록 페이지 크롤링 (flea_list_fast.py 변환)
- [ ] `crawlMarketList()` 메서드 구현
  - 플리마켓 목록 페이지 HTML 가져오기
  - Cheerio로 DOM 파싱
  - 각 아이템에서 데이터 추출:
    - 마켓명
    - 장소
    - URL
    - 이미지 URL
  - 다음 페이지 처리 (페이지네이션)
- [ ] 에러 핸들링 및 재시도 로직

#### 3.3.3 상세 페이지 크롤링 (flea_text_fast.py 변환)
- [ ] `crawlMarketDetail(url)` 메서드 구현
  - 상세 페이지 HTML 가져오기
  - 일정 정보 추출:
    - 시작일/종료일
    - 시작 시간/종료 시간
    - 추가 정보 (notes)
  - 데이터 구조화

#### 3.3.4 동적 콘텐츠 처리 (Puppeteer)
- [ ] JavaScript로 렌더링되는 페이지 처리
  ```javascript
  async crawlDynamicPage(url) {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox']
    });

    try {
      const page = await browser.newPage();
      await page.setUserAgent(USER_AGENT);
      await page.goto(url, { waitUntil: 'networkidle2' });

      const content = await page.content();
      return content;
    } finally {
      await browser.close();
    }
  }
  ```

#### 3.3.5 LLM 데이터 정제 (선택 사항)
- [ ] `llm_processor.py` 로직 변환
  ```javascript
  const { OpenAI } = require('openai');

  async function processWithLLM(rawText) {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const prompt = `
      다음 텍스트에서 플리마켓 정보를 추출해주세요:
      - 마켓명
      - 장소
      - 날짜/시간

      텍스트: ${rawText}
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }]
    });

    return JSON.parse(response.choices[0].message.content);
  }
  ```

### 3.4 크롤링 API 엔드포인트 구현

#### 3.4.1 크롤링 실행 API
- [ ] `POST /api/markets/crawl` 엔드포인트 추가
  ```javascript
  async function crawlAndSave(req, res) {
    try {
      // 1. 크롤링 실행
      const markets = await crawlerService.crawlMarketList();

      // 2. 각 마켓 처리
      for (const market of markets) {
        // 중복 체크 (URL 기반)
        const existing = await marketRepository.getMarketByUrl(market.url);

        if (existing) {
          // 업데이트
          await marketRepository.updateMarket(existing.market_id, market);
        } else {
          // 신규 추가
          await marketRepository.createMarket(market);
        }

        // 지오코딩 자동 실행
        await geocodingService.geocodeAddress(market.place);

        // Rate limiting
        await crawlerService.sleep(1000);
      }

      res.json({ success: true, count: markets.length });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  ```

#### 3.4.2 크롤링 상태 API
- [ ] `GET /api/markets/crawl/status` 구현
  - 마지막 크롤링 시간
  - 크롤링된 마켓 수
  - 실패한 URL 목록

### 3.5 중복 체크 및 업데이트 로직
- [ ] URL 기반 중복 체크 구현
- [ ] 기존 데이터 업데이트 vs 신규 추가 분기 처리
- [ ] 변경 감지 로직 (title, place, image 변경 시 업데이트)
- [ ] Sessions 데이터 병합 (기존 일정 유지 + 새 일정 추가)

### 3.6 크롤링 후 자동 지오코딩
- [ ] 크롤링 완료 후 자동으로 지오코딩 서비스 호출
- [ ] 좌표 없는 마켓만 지오코딩
- [ ] 실패한 경우 로그 기록

### 3.7 테스트
- [ ] 단일 URL 크롤링 테스트
- [ ] 전체 목록 크롤링 테스트
- [ ] 중복 체크 동작 확인
- [ ] 지오코딩 자동 연동 확인
- [ ] Supabase에서 데이터 확인

---

## ✅ Phase 4: 프론트엔드 연동

### 4.1 기존 Visual.jsx 분석
- [ ] 현재 Excel 파일 로드 방식 파악
- [ ] 지도 라이브러리 확인 (Leaflet)
- [ ] 마커 표시 로직 분석
- [ ] 클러스터링 사용 여부 확인

### 4.2 API 클라이언트 설정
- [ ] API base URL 환경 변수 설정
  ```javascript
  // fe/.env
  REACT_APP_API_URL=http://localhost:3000/api
  ```
- [ ] Axios 또는 Fetch API 설정
  ```javascript
  // fe/src/utils/api.js
  import axios from 'axios';

  const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL,
    timeout: 10000
  });

  export const getMarkets = async (params) => {
    const response = await api.get('/markets', { params });
    return response.data;
  };

  export const getMarketById = async (id) => {
    const response = await api.get(`/markets/${id}`);
    return response.data;
  };
  ```

### 4.3 Visual.jsx 수정

#### 4.3.1 Excel 파일 로드 제거
- [ ] Excel 파일 읽기 코드 제거
- [ ] 파일 입력 UI 제거 (있는 경우)

#### 4.3.2 API 데이터 로드
- [ ] `useEffect`에서 API 호출
  ```javascript
  import { useEffect, useState } from 'react';
  import { getMarkets } from '../utils/api';

  function Visual() {
    const [markets, setMarkets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
      const fetchMarkets = async () => {
        try {
          setLoading(true);
          const data = await getMarkets();
          setMarkets(data.data);
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };

      fetchMarkets();
    }, []);

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
      <div>
        {/* 지도 렌더링 */}
      </div>
    );
  }
  ```

#### 4.3.3 데이터 형식 변환
- [ ] API 응답을 지도용 데이터로 변환
  ```javascript
  const mapData = markets.map(market => ({
    id: market.market_id,
    name: market.market_name,
    position: [market.latitude, market.longitude],
    place: market.place,
    imageUrl: market.image_url,
    sessions: market.sessions
  }));
  ```

#### 4.3.4 마커 표시 업데이트
- [ ] Leaflet 마커 생성 로직 수정
- [ ] 마커 클릭 시 팝업 내용 업데이트
  ```javascript
  {markets.map(market => (
    <Marker
      key={market.market_id}
      position={[market.latitude, market.longitude]}
    >
      <Popup>
        <div>
          <h3>{market.market_name}</h3>
          <p>{market.place}</p>
          {market.image_url && (
            <img src={market.image_url} alt={market.market_name} />
          )}
          <div>
            {market.sessions.map(session => (
              <div key={session.session_id}>
                <p>{session.start_date} ~ {session.end_date}</p>
                <p>{session.start_time} - {session.end_time}</p>
              </div>
            ))}
          </div>
        </div>
      </Popup>
    </Marker>
  ))}
  ```

### 4.4 날짜 필터링 기능
- [ ] 날짜 선택 UI 추가 (DatePicker)
- [ ] 선택한 날짜로 API 호출
  ```javascript
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  useEffect(() => {
    const fetchFilteredMarkets = async () => {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const data = await getMarkets(params);
      setMarkets(data.data);
    };

    fetchFilteredMarkets();
  }, [startDate, endDate]);
  ```

### 4.5 로딩 및 에러 상태 처리
- [ ] 로딩 스피너 추가
- [ ] 에러 메시지 UI
- [ ] 데이터 없을 때 안내 메시지

### 4.6 CORS 설정 (백엔드)
- [ ] Express CORS 미들웨어 추가
  ```javascript
  const cors = require('cors');

  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true
  }));
  ```

### 4.7 테스트
- [ ] 프론트엔드에서 마켓 목록 표시 확인
- [ ] 지도에 마커 정상 표시 확인
- [ ] 마커 클릭 시 정보 팝업 확인
- [ ] 날짜 필터링 동작 확인
- [ ] 로딩/에러 상태 확인

---

## 📦 산출물

**완료 후 확인 사항**:
1. ✅ Python 크롤링 로직이 JavaScript로 변환됨
2. ✅ `POST /api/markets/crawl` 실행 시 데이터 수집됨
3. ✅ 중복 체크 및 업데이트 로직 작동
4. ✅ React에서 Excel 대신 API로 데이터 로드
5. ✅ 지도에 모든 마켓이 정확한 위치에 표시됨
6. ✅ 날짜 필터링 기능 작동

**API 응답 구조**:
```json
{
  "success": true,
  "data": [
    {
      "market_id": 1,
      "market_name": "옥스팜 슈퍼스토어",
      "place": "아이파크몰 용산점",
      "url": "https://...",
      "image_url": "https://...",
      "latitude": 37.5295,
      "longitude": 126.9645,
      "geocoded_at": "2025-10-15T10:30:00Z",
      "sessions": [
        {
          "session_id": 1,
          "start_date": "2025-10-25",
          "end_date": "2025-10-26",
          "start_time": "10:30:00",
          "end_time": "18:00:00",
          "notes": null
        }
      ]
    }
  ],
  "total": 1
}
```

---

## 📝 참고사항

### Python → JavaScript 변환 가이드

| Python | JavaScript (Node.js) |
|--------|---------------------|
| `requests.get()` | `axios.get()` |
| `BeautifulSoup(html)` | `cheerio.load(html)` |
| `selenium` | `puppeteer` |
| `time.sleep()` | `await sleep()` |
| `with open()` | `fs.readFileSync()` |

### Cheerio 기본 사용법
```javascript
const $ = cheerio.load(html);

// CSS 선택자
const title = $('h1.title').text();
const links = $('a.link').map((i, el) => $(el).attr('href')).get();
const items = $('.item').map((i, el) => ({
  name: $(el).find('.name').text(),
  price: $(el).find('.price').text()
})).get();
```

### React + Leaflet 예시
```javascript
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

<MapContainer center={[37.5665, 126.9780]} zoom={11}>
  <TileLayer
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  />
  {markets.map(market => (
    <Marker key={market.market_id} position={[market.latitude, market.longitude]}>
      <Popup>{market.market_name}</Popup>
    </Marker>
  ))}
</MapContainer>
```

---

## ⚠️ 주의사항

1. **크롤링 윤리**
   - `robots.txt` 확인
   - User-Agent 설정
   - 적절한 delay (최소 1초)
   - 사이트 부하 고려

2. **중복 데이터 처리**
   - URL을 unique key로 사용
   - 업데이트 시 기존 sessions 병합 로직 필요
   - `updated_at` 타임스탬프 업데이트

3. **API Rate Limiting**
   - 카카오 지오코딩 API 호출 제한
   - OpenAI API 비용 고려
   - 크롤링 시 429 에러 핸들링

4. **에러 핸들링**
   - 네트워크 타임아웃
   - HTML 구조 변경 대응
   - 파싱 실패 시 로그 기록

5. **CORS 이슈**
   - 백엔드에서 CORS 허용 설정
   - 프로덕션 환경에서는 특정 도메인만 허용

---

## 🎯 다음 단계

핵심 기능 완성 후 → **task_03_enhancements.md**로 이동
- 자동화 스케줄러 구현
- 모니터링 및 로깅
- 성능 최적화
