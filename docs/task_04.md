# 지도 시각화 좌표 변환 개선 프로젝트 계획서

## 📋 프로젝트 개요

### 현재 문제점
- 백엔드 DB → 프론트엔드(카카오맵)로 데이터 전송 시 장소명, 지역명의 좌표 변환 실패율이 높음
- 카카오맵 API가 검색하지 못하는 장소명, 지역명 다수 존재

### 해결 방안
백엔드에서 **3단계 처리 시스템** 구축
1. 1차: 카카오 API로 주소 → 좌표 변환 시도
2. 2차: 실패 시 장소명/지역명으로 재시도
3. 3차: 여전히 실패 시 AI로 주소 보정 후 재시도

### 핵심 원칙
- ✅ **백엔드에서 모든 처리 완료** → 프론트엔드는 완성된 좌표만 받음
- ✅ **실패한 케이스만 AI 사용** → 비용 최적화
- ✅ **성공한 결과는 DB 저장** → 중복 처리 방지

---

## 🎯 프로젝트 목표

| 목표 | 현재 | 목표 |
|------|------|------|
| 좌표 변환 성공률 | ~60-70% | 95% 이상 |
| API 응답 속도 | 느림 | 2초 이내 |
| AI 사용 비율 | - | 전체의 5-10%만 |
| 재처리 필요성 | 매번 | 최초 1회만 |

---

## 📊 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                         백엔드 처리                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  [DB 조회]                                                    │
│      ↓                                                        │
│  좌표 있음? ──YES→ [즉시 반환]                                │
│      ↓ NO                                                     │
│  [1차: 카카오 API - 주소로 검색]                              │
│      ↓ 실패                                                   │
│  [2차: 카카오 API - 장소명으로 검색]                          │
│      ↓ 실패                                                   │
│  [3차: AI 주소 보정]                                          │
│      ↓                                                        │
│  [카카오 API - 보정된 주소로 검색]                            │
│      ↓                                                        │
│  [성공한 좌표를 DB에 저장]                                    │
│      ↓                                                        │
│  [완성된 데이터 반환]                                         │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      프론트엔드 처리                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  [API 호출: /api/locations]                                   │
│      ↓                                                        │
│  [좌표 데이터 수신]                                           │
│      ↓                                                        │
│  [카카오맵에 마커 표시]                                       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗓️ 단계별 실행 계획

### **Phase 1: 데이터베이스 준비** (1일)

#### 작업 내용
DB 테이블에 좌표 저장 컬럼 추가

#### 실행 SQL
```sql
-- locations 테이블에 컬럼 추가
ALTER TABLE locations 
ADD COLUMN latitude DECIMAL(10, 8),
ADD COLUMN longitude DECIMAL(11, 8),
ADD COLUMN geocoded_at TIMESTAMP,
ADD COLUMN geocode_status VARCHAR(20) DEFAULT 'pending';
-- 'pending', 'success', 'failed'

-- 인덱스 추가 (성능 향상)
CREATE INDEX idx_geocode_status ON locations(geocode_status);
```

#### 체크리스트
- [ ] DB 백업 완료
- [ ] 컬럼 추가 실행
- [ ] 기존 데이터 확인

---

### **Phase 2: 백엔드 API 구현** (2-3일)

#### 2-1. 환경 설정

**필요한 패키지 설치**
```bash
npm install node-fetch dotenv
```

**환경 변수 설정 (.env)**
```env
KAKAO_API_KEY=your_kakao_rest_api_key
CLAUDE_API_KEY=your_claude_api_key
DATABASE_URL=your_database_connection_string
```

#### 2-2. 유틸리티 함수 작성

**파일: `utils/geocode.js`**
```javascript
// 카카오 API 호출 함수
async function tryKakaoGeocode(query) {
  if (!query || query.trim() === '') return null;
  
  try {
    const response = await fetch(
      `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(query)}`,
      {
        headers: {
          'Authorization': `KakaoAK ${process.env.KAKAO_API_KEY}`
        }
      }
    );
    
    const data = await response.json();
    
    if (data.documents && data.documents.length > 0) {
      return {
        lat: parseFloat(data.documents[0].y),
        lng: parseFloat(data.documents[0].x),
        address: data.documents[0].address_name
      };
    }
    
    // 주소 검색 실패 시 키워드 검색 시도
    const keywordResponse = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}`,
      {
        headers: {
          'Authorization': `KakaoAK ${process.env.KAKAO_API_KEY}`
        }
      }
    );
    
    const keywordData = await keywordResponse.json();
    
    if (keywordData.documents && keywordData.documents.length > 0) {
      return {
        lat: parseFloat(keywordData.documents[0].y),
        lng: parseFloat(keywordData.documents[0].x),
        address: keywordData.documents[0].address_name
      };
    }
    
    return null;
  } catch (error) {
    console.error('Kakao API error:', error);
    return null;
  }
}

// AI 주소 보정 함수
async function aiCorrectAddress(location) {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `다음 장소 정보를 분석하여 정확한 한국 주소를 반환해주세요:

장소명: ${location.placeName || '없음'}
지역명: ${location.regionName || '없음'}
원본 주소: ${location.address || '없음'}

반드시 다음 형식 중 하나로만 답변하세요:
- 도로명주소 (예: 서울특별시 강남구 테헤란로 123)
- 지번주소 (예: 서울특별시 강남구 역삼동 123-45)

주소만 출력하고 다른 설명은 하지 마세요.`
        }]
      })
    });
    
    const data = await response.json();
    return data.content[0].text.trim();
  } catch (error) {
    console.error('AI API error:', error);
    return null;
  }
}

// 전처리 함수
function preprocessQuery(query) {
  if (!query) return '';
  return query
    .replace(/\s+/g, ' ')  // 연속된 공백을 하나로
    .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))  // 전각 숫자를 반각으로
    .trim();
}

module.exports = {
  tryKakaoGeocode,
  aiCorrectAddress,
  preprocessQuery
};
```

#### 2-3. 메인 API 엔드포인트 작성

**파일: `routes/locations.js`**
```javascript
const express = require('express');
const router = express.Router();
const { tryKakaoGeocode, aiCorrectAddress, preprocessQuery } = require('../utils/geocode');
const db = require('../db'); // DB 연결 모듈

// 단일 location 처리 함수
async function processLocation(location) {
  // 1. 이미 좌표가 있으면 그대로 반환
  if (location.latitude && location.longitude) {
    return {
      id: location.id,
      name: location.placeName,
      lat: location.latitude,
      lng: location.longitude,
      address: location.address,
      status: 'cached'
    };
  }
  
  let coords = null;
  let method = '';
  
  // 2. 주소로 시도
  if (location.address) {
    const processedAddress = preprocessQuery(location.address);
    coords = await tryKakaoGeocode(processedAddress);
    if (coords) method = 'address';
  }
  
  // 3. 장소명으로 시도
  if (!coords && location.placeName) {
    const processedPlace = preprocessQuery(location.placeName);
    coords = await tryKakaoGeocode(processedPlace);
    if (coords) method = 'placeName';
  }
  
  // 4. 지역명으로 시도
  if (!coords && location.regionName) {
    const processedRegion = preprocessQuery(location.regionName);
    coords = await tryKakaoGeocode(processedRegion);
    if (coords) method = 'regionName';
  }
  
  // 5. AI 보정 시도
  if (!coords) {
    console.log(`🤖 AI 보정 시작: ${location.placeName}`);
    const correctedAddress = await aiCorrectAddress(location);
    
    if (correctedAddress) {
      coords = await tryKakaoGeocode(correctedAddress);
      if (coords) method = 'ai_corrected';
    }
  }
  
  // 6. 결과 DB 저장
  if (coords) {
    await db.query(
      `UPDATE locations 
       SET latitude = ?, longitude = ?, geocoded_at = NOW(), geocode_status = 'success'
       WHERE id = ?`,
      [coords.lat, coords.lng, location.id]
    );
    
    console.log(`✅ 성공 (${method}): ${location.placeName} → (${coords.lat}, ${coords.lng})`);
    
    return {
      id: location.id,
      name: location.placeName,
      lat: coords.lat,
      lng: coords.lng,
      address: coords.address,
      status: 'success',
      method: method
    };
  } else {
    await db.query(
      `UPDATE locations 
       SET geocode_status = 'failed', geocoded_at = NOW()
       WHERE id = ?`,
      [location.id]
    );
    
    console.log(`❌ 실패: ${location.placeName}`);
    
    return null;
  }
}

// GET /api/locations - 모든 지역 데이터 반환
router.get('/', async (req, res) => {
  try {
    // 1. 이미 처리된 데이터 가져오기
    const processedLocations = await db.query(
      `SELECT id, placeName as name, latitude as lat, longitude as lng, address
       FROM locations 
       WHERE geocode_status = 'success' AND latitude IS NOT NULL`
    );
    
    // 2. 미처리 데이터 가져오기 (최대 20개씩)
    const unprocessedLocations = await db.query(
      `SELECT * FROM locations 
       WHERE geocode_status = 'pending' 
       LIMIT 20`
    );
    
    // 3. 미처리 데이터 처리 (병렬 처리)
    const newlyProcessed = await Promise.all(
      unprocessedLocations.map(loc => processLocation(loc))
    );
    
    // 4. null 제거 및 합치기
    const validNewlyProcessed = newlyProcessed.filter(loc => loc !== null);
    const allLocations = [...processedLocations, ...validNewlyProcessed];
    
    res.json({
      success: true,
      total: allLocations.length,
      data: allLocations
    });
    
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/locations/stats - 처리 현황 통계
router.get('/stats', async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT 
        geocode_status,
        COUNT(*) as count
      FROM locations
      GROUP BY geocode_status
    `);
    
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
```

#### 2-4. 서버 메인 파일 수정

**파일: `server.js` 또는 `app.js`**
```javascript
require('dotenv').config();
const express = require('express');
const locationsRouter = require('./routes/locations');

const app = express();

app.use(express.json());
app.use('/api/locations', locationsRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
});
```

#### 체크리스트
- [ ] 환경 변수 설정 완료
- [ ] 카카오 API 키 발급 및 테스트
- [ ] Claude API 키 발급 및 테스트
- [ ] 유틸리티 함수 작성 완료
- [ ] API 엔드포인트 작성 완료
- [ ] Postman/curl로 API 테스트

**테스트 명령어:**
```bash
curl http://localhost:3000/api/locations
curl http://localhost:3000/api/locations/stats
```

---

### **Phase 3: 프론트엔드 연동** (1일)

#### 3-1. React 컴포넌트 수정

**파일: `components/KakaoMap.jsx`**
```javascript
import React, { useEffect, useState } from 'react';

function KakaoMap() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadKakaoMap();
  }, []);

  async function loadKakaoMap() {
    try {
      // 카카오맵 스크립트 로드
      const script = document.createElement('script');
      script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=YOUR_JAVASCRIPT_KEY&autoload=false`;
      script.async = true;
      document.head.appendChild(script);

      script.onload = async () => {
        window.kakao.maps.load(async () => {
          // 지도 생성
          const container = document.getElementById('map');
          const options = {
            center: new window.kakao.maps.LatLng(37.5665, 126.9780), // 서울 중심
            level: 8
          };
          const map = new window.kakao.maps.Map(container, options);

          // 백엔드에서 데이터 가져오기
          const response = await fetch('/api/locations');
          const result = await response.json();

          if (result.success) {
            setLocations(result.data);

            // 마커 표시
            result.data.forEach(location => {
              const markerPosition = new window.kakao.maps.LatLng(
                location.lat, 
                location.lng
              );

              const marker = new window.kakao.maps.Marker({
                position: markerPosition,
                map: map
              });

              // 인포윈도우
              const infowindow = new window.kakao.maps.InfoWindow({
                content: `<div style="padding:5px;">${location.name}</div>`
              });

              window.kakao.maps.event.addListener(marker, 'click', () => {
                infowindow.open(map, marker);
              });
            });

            console.log(`✅ ${result.data.length}개 지역 표시 완료`);
          }

          setLoading(false);
        });
      };

      // 통계 가져오기
      const statsResponse = await fetch('/api/locations/stats');
      const statsResult = await statsResponse.json();
      if (statsResult.success) {
        setStats(statsResult.stats);
      }

    } catch (error) {
      console.error('지도 로드 에러:', error);
      setLoading(false);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '10px' }}>
        {loading && <p>⏳ 지도 로딩 중...</p>}
        {stats && (
          <div>
            {stats.map(s => (
              <span key={s.geocode_status} style={{ marginRight: '15px' }}>
                {s.geocode_status}: {s.count}개
              </span>
            ))}
          </div>
        )}
      </div>
      <div id="map" style={{ width: '100%', height: '600px' }}></div>
    </div>
  );
}

export default KakaoMap;
```

#### 3-2. Vue.js 버전 (참고용)

**파일: `components/KakaoMap.vue`**
```vue
<template>
  <div>
    <div v-if="loading">⏳ 지도 로딩 중...</div>
    <div v-if="stats" style="margin-bottom: 10px;">
      <span v-for="s in stats" :key="s.geocode_status" style="margin-right: 15px;">
        {{ s.geocode_status }}: {{ s.count }}개
      </span>
    </div>
    <div id="map" style="width: 100%; height: 600px;"></div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      locations: [],
      loading: true,
      stats: null
    };
  },
  mounted() {
    this.loadKakaoMap();
  },
  methods: {
    async loadKakaoMap() {
      const script = document.createElement('script');
      script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=YOUR_JAVASCRIPT_KEY&autoload=false`;
      script.async = true;
      document.head.appendChild(script);

      script.onload = async () => {
        window.kakao.maps.load(async () => {
          const container = document.getElementById('map');
          const options = {
            center: new window.kakao.maps.LatLng(37.5665, 126.9780),
            level: 8
          };
          const map = new window.kakao.maps.Map(container, options);

          const response = await fetch('/api/locations');
          const result = await response.json();

          if (result.success) {
            this.locations = result.data;

            result.data.forEach(location => {
              const markerPosition = new window.kakao.maps.LatLng(
                location.lat,
                location.lng
              );

              const marker = new window.kakao.maps.Marker({
                position: markerPosition,
                map: map
              });

              const infowindow = new window.kakao.maps.InfoWindow({
                content: `<div style="padding:5px;">${location.name}</div>`
              });

              window.kakao.maps.event.addListener(marker, 'click', () => {
                infowindow.open(map, marker);
              });
            });
          }

          this.loading = false;
        });
      };

      const statsResponse = await fetch('/api/locations/stats');
      const statsResult = await statsResponse.json();
      if (statsResult.success) {
        this.stats = statsResult.stats;
      }
    }
  }
};
</script>
```

#### 체크리스트
- [ ] 카카오 JavaScript 키 발급
- [ ] 프론트엔드 컴포넌트 작성
- [ ] API 연동 테스트
- [ ] 마커 표시 확인

---

### **Phase 4: 배치 처리 스크립트** (1일)

#### 4-1. 일괄 처리 스크립트 작성

**파일: `scripts/batchGeocode.js`**
```javascript
require('dotenv').config();
const db = require('../db');
const { tryKakaoGeocode, aiCorrectAddress, preprocessQuery } = require('../utils/geocode');

async function batchProcess() {
  console.log('🚀 배치 처리 시작...\n');
  
  // 미처리 데이터 전체 가져오기
  const unprocessed = await db.query(
    `SELECT * FROM locations 
     WHERE geocode_status = 'pending' OR latitude IS NULL`
  );
  
  console.log(`📊 처리할 데이터: ${unprocessed.length}개\n`);
  
  let successCount = 0;
  let failCount = 0;
  let aiUsedCount = 0;
  
  for (let i = 0; i < unprocessed.length; i++) {
    const loc = unprocessed[i];
    console.log(`[${i + 1}/${unprocessed.length}] 처리 중: ${loc.placeName}`);
    
    let coords = null;
    let method = '';
    
    // 1. 주소로 시도
    if (loc.address) {
      coords = await tryKakaoGeocode(preprocessQuery(loc.address));
      if (coords) method = 'address';
    }
    
    // 2. 장소명으로 시도
    if (!coords && loc.placeName) {
      coords = await tryKakaoGeocode(preprocessQuery(loc.placeName));
      if (coords) method = 'placeName';
    }
    
    // 3. AI 보정
    if (!coords) {
      aiUsedCount++;
      const corrected = await aiCorrectAddress(loc);
      if (corrected) {
        coords = await tryKakaoGeocode(corrected);
        if (coords) method = 'ai';
      }
    }
    
    // 결과 저장
    if (coords) {
      await db.query(
        `UPDATE locations 
         SET latitude = ?, longitude = ?, geocode_status = 'success', geocoded_at = NOW()
         WHERE id = ?`,
        [coords.lat, coords.lng, loc.id]
      );
      successCount++;
      console.log(`  ✅ 성공 (${method}): (${coords.lat}, ${coords.lng})`);
    } else {
      await db.query(
        `UPDATE locations 
         SET geocode_status = 'failed', geocoded_at = NOW()
         WHERE id = ?`,
        [loc.id]
      );
      failCount++;
      console.log(`  ❌ 실패`);
    }
    
    // API 호출 제한 방지 (100ms 대기)
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n📊 처리 완료 통계:');
  console.log(`  - 성공: ${successCount}개`);
  console.log(`  - 실패: ${failCount}개`);
  console.log(`  - AI 사용: ${aiUsedCount}개`);
  console.log(`  - 성공률: ${((successCount / unprocessed.length) * 100).toFixed(1)}%`);
  
  process.exit(0);
}

batchProcess().catch(err => {
  console.error('배치 처리 에러:', err);
  process.exit(1);
});
```

#### 4-2. 실행 방법

```bash
# 수동 실행
node scripts/batchGeocode.js

# 백그라운드 실행 (리눅스)
nohup node scripts/batchGeocode.js > batch.log 2>&1 &
```

#### 4-3. 자동 스케줄링 (선택사항)

**Cron 설정 (매일 새벽 2시 실행)**
```bash
crontab -e
```

```cron
0 2 * * * cd /path/to/project && node scripts/batchGeocode.js >> /var/log/batch.log 2>&1
```

**또는 PM2 사용**
```bash
npm install -g pm2
pm2 start scripts/batchGeocode.js --cron "0 2 * * *"
```

#### 체크리스트
- [ ] 배치 스크립트 작성 완료
- [ ] 소량 데이터로 테스트 (10개)
- [ ] 전체 데이터 처리 실행
- [ ] 로그 확인
- [ ] 스케줄러 설정 (선택)

---

## 🧪 테스트 계획

### 테스트 1: API 단위 테스트

```bash
# 1. 통계 확인
curl http://localhost:3000/api/locations/stats

# 2. 데이터 조회
curl http://localhost:3000/api/locations | jq '.'

# 3. 특정 개수만 확인
curl http://localhost:3000/api/locations | jq '.data | length'
```

### 테스트 2: 카카오 API 직접 테스트

```javascript
// test/kakaoTest.js
const { tryKakaoGeocode } = require('../utils/geocode');

async function test() {
  // 정상 주소
  console.log('1. 정상 주소:', await tryKakaoGeocode('서울특별시 강남구 테헤란로 152'));
  
  // 장소명
  console.log('2. 장소명:', await tryKakaoGeocode('서울역'));
  
  // 실패 케이스
  console.log('3. 실패 케이스:', await tryKakaoGeocode('알수없는장소123'));
}

test();
```

### 테스트 3: AI 보정 테스트

```javascript
// test/aiTest.js
const { aiCorrectAddress } = require('../utils/geocode');

async function test() {
  const testCases = [
    { placeName: '강남구청', regionName: '서울', address: '' },
    { placeName: '63빌딩', regionName: '', address: '' },
    { placeName: '이태원', regionName: '용산구', address: '' }
  ];
  
  for (const testCase of testCases) {
    const result = await aiCorrectAddress(testCase);
    console.log(`입력: ${testCase.placeName} → AI 결과: ${result}`);
  }
}

test();
```

### 테스트 체크리스트
- [ ] 카카오 API 키 정상 작동 확인
- [ ] AI API 키 정상 작동 확인
- [ ] 정상 주소 변환 성공
- [ ] 장소명 변환 성공
- [ ] AI 보정 기능 작동
- [ ] DB 저장 확인
- [ ] 중복 처리 방지 확인

---

## 📈 모니터링 및 로깅

### 로깅 전략

```javascript
// utils/logger.js
const fs = require('fs');
const path = require('path');

function log(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...data
  };
  
  // 콘솔 출력
  console.log(`[${timestamp}] ${level}: ${message}`, data);
  
  // 파일 저장
  const logFile = path.join(__dirname, '../logs', `${level}.log`);
  fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
}

module.exports = {
  info: (msg, data) => log('INFO', msg, data),
  error: (msg, data) => log('ERROR', msg, data),
  success: (msg, data) => log('SUCCESS', msg, data)
};
```

### 성능 모니터링

```javascript
// routes/locations.js에 추가
const startTime = Date.now();

// ... 처리 로직 ...

const processingTime = Date.now() - startTime;
console.log(`⏱️ 처리 시간: ${processingTime}ms`);
```

### 대시보드 API 추가

```javascript
// routes/locations.js
router.get('/dashboard', async (req, res) => {
  const stats = await db.query(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN geocode_status = 'success' THEN 1 ELSE 0 END) as success,
      SUM(CASE WHEN geocode_status = 'failed' THEN 1 ELSE 0 END) as failed,
      SUM(CASE WHEN geocode_status = 'pending' THEN 1 ELSE 0 END) as pending,
      AVG(CASE WHEN latitude IS NOT NULL THEN 1 ELSE 0 END) * 100 as success_rate
    FROM locations
  `);
  
  res.json(stats[0]);
});
```

---

## 💰 비용 예측 및 최적화

### AI API 비용 계산

**Claude API 가격** (2025년 기준)
- Input: $3.00 / 1M tokens
- Output: $15.00 / 1M tokens

**예상 사용량 (1건당)**
- Input: ~200 tokens
- Output: ~50 tokens
- 비용: ~$0.0009 (약 1.2원)

**전체 비용 예측**
```
총 데이터: 10,000개
카카오 API 성공률: 85% → 8,500개 성공
AI 사용: 1,500개 (15%)

AI 비용: 1,500 × 1.2원 = 1,800원
```

### 비용 절감 팁

1. **배치 크기 조절**: 한 번에 20개씩만 처리
2. **캐싱 활용**: 성공한 결과는 영구 저장
3. **재시도 제한**: AI 실패 시 더 이상 재시도 안 함

---

## 🚨 트러블슈팅

### 문제 1: 카카오 API Quota 초과

**증상**: `429 Too Many Requests` 에러

**해결책**:
```javascript
// 요청 간 딜레이 추가
async function tryKakaoGeocodeWithRetry(query, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await tryKakaoGeocode(query);
      return result;
    } catch (err) {
      if (err.status === 429 && i < retries - 1) {
        await new Promise(r => setTimeout(r, 1000 * (i + 1))); // 1초, 2초, 3초 대기
        continue;
      }
      throw err;
    }
  }
}
```

### 문제 2: AI가 잘못된 주소 반환

**증상**: AI가 존재하지 않는 주소를 생성

**해결책**:
```javascript
// AI 결과 검증
async function validateAndCorrect(location) {
  const aiResult = await aiCorrectAddress(location);
  const coords = await tryKakaoGeocode(aiResult);
  
  if (!coords) {
    // AI 결과가 카카오에서 검색되지 않으면 실패 처리
    return null;
  }
  
  return coords;
}
```

### 문제 3: DB 연결 타임아웃

**증상**: 대량 처리 시 DB 연결 끊김

**해결책**:
```javascript
// 연결 풀 설정
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
```

---

## ✅ 최종 체크리스트

### Phase 1 완료 확인
- [ ] DB 스키마 수정 완료
- [ ] 백업 완료

### Phase 2 완료 확인
- [ ] 환경 변수 설정
- [ ] API 키 발급 및 테스트
- [ ] 백엔드 API 구현 완료
- [ ] 단위 테스트 통과

### Phase 3 완료 확인
- [ ] 프론트엔드 연동 완료
- [ ] 지도에 마커 정상 표시
- [ ] UI/UX 확인

### Phase 4 완료 확인
- [ ] 배치 스크립트 작동 확인
- [ ] 전체 데이터 처리 완료
- [ ] 성공률 95% 이상 달성

### 운영 준비
- [ ] 모니터링 설정
- [ ] 로깅 시스템 구축
- [ ] 에러 알림 설정
- [ ] 문서화 완료

---

## 📚 참고 자료

### API 문서
- [카카오맵 API 가이드](https://apis.map.kakao.com/web/guide/)
- [Claude API 문서](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)

### 주요 링크
- 카카오 개발자 센터: https://developers.kakao.com/
- Anthropic Console: https://console.anthropic.com/

---

## 🎯 예상 결과

| 지표 | 개선 전 | 개선 후 |
|------|---------|---------|
| 좌표 변환 성공률 | 60-70% | **95% 이상** |
| 평균 응답 시간 | 5-10초 | **2초 이내** |
| 재처리 빈도 | 매번 | **최초 1회만** |
| AI 비용 (1만건) | - | **약 2,000원** |
| 개발 기간 | - | **5-7일** |

---

## 📞 지원 및 문의

프로젝트 진행 중 문제가 발생하면:
1. 로그 파일 확인 (`logs/` 디렉토리)
2. API 응답 상태 코드 확인
3. DB 쿼리 실행 여부 확인

**성공을 기원합니다! 🚀**