# Task 01: MVP 구현 (Phase 1-2)

## 📋 목표

**데이터베이스 설정 + 지오코딩 기능 구현**
- Supabase DB 연결 및 테이블 생성
- 기존 JSON 데이터를 DB로 이관
- 카카오 지오코딩으로 좌표 변환
- 기본 조회 API 구현

**예상 소요 시간**: 2-4일

---

## ✅ Phase 1: 기본 인프라 구축

### 1.1 Supabase 테이블 생성
- [ ] Supabase 프로젝트 생성 (또는 기존 프로젝트 사용)
- [ ] `markets` 테이블 생성
  ```sql
  CREATE TABLE markets (
    market_id BIGSERIAL PRIMARY KEY,
    market_name VARCHAR(255) NOT NULL,
    place VARCHAR(255) NOT NULL,
    url VARCHAR(500) UNIQUE NOT NULL,
    image_url TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    geocoded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE INDEX idx_markets_url ON markets(url);
  CREATE INDEX idx_markets_location ON markets(latitude, longitude);
  ```
- [ ] `sessions` 테이블 생성
  ```sql
  CREATE TABLE sessions (
    session_id BIGSERIAL PRIMARY KEY,
    market_id BIGINT REFERENCES markets(market_id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE,
    start_time TIME,
    end_time TIME,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE INDEX idx_sessions_market ON sessions(market_id);
  CREATE INDEX idx_sessions_dates ON sessions(start_date, end_date);
  ```

### 1.2 백엔드 폴더 구조 생성
- [ ] 폴더 구조 생성
  ```
  be/
  ├── src/
  │   ├── controllers/
  │   │   └── market.controller.js
  │   ├── services/
  │   │   ├── market.service.js
  │   │   └── geocoding.service.js
  │   ├── repositories/
  │   │   └── market.repository.js
  │   ├── routes/
  │   │   └── market.routes.js
  │   └── utils/
  │       └── supabase.js
  ├── .env
  └── server.js
  ```

### 1.3 Supabase 클라이언트 설정
- [ ] `be/src/utils/supabase.js` 생성
  ```javascript
  const { createClient } = require('@supabase/supabase-js');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  module.exports = supabase;
  ```

### 1.4 환경 변수 설정
- [ ] `be/.env` 파일 생성
  ```env
  SUPABASE_URL=your_supabase_url
  SUPABASE_ANON_KEY=your_supabase_anon_key
  KAKAO_REST_API_KEY=your_kakao_api_key
  PORT=3000
  ```
- [ ] `.env` 파일 `.gitignore`에 추가

### 1.5 Repository 계층 구현
- [ ] `be/src/repositories/market.repository.js` 생성
  - `getAllMarkets()` - 전체 플리마켓 조회
  - `getMarketById(id)` - 특정 플리마켓 조회
  - `getMarketsByDateRange(startDate, endDate)` - 날짜 필터링 조회
  - `createMarket(marketData)` - 플리마켓 생성
  - `updateMarket(id, marketData)` - 플리마켓 수정
  - `deleteMarket(id)` - 플리마켓 삭제
  - `getMarketByUrl(url)` - URL로 조회 (중복 체크용)

### 1.6 Service 계층 구현
- [ ] `be/src/services/market.service.js` 생성
  - 비즈니스 로직 구현
  - Repository 호출
  - 데이터 변환 및 검증

### 1.7 Controller 계층 구현
- [ ] `be/src/controllers/market.controller.js` 생성
  - HTTP 요청/응답 처리
  - Service 호출
  - 에러 핸들링

### 1.8 API 라우트 설정
- [ ] `be/src/routes/market.routes.js` 생성
  ```javascript
  const express = require('express');
  const router = express.Router();
  const marketController = require('../controllers/market.controller');

  router.get('/markets', marketController.getAllMarkets);
  router.get('/markets/:id', marketController.getMarketById);
  router.post('/markets/import', marketController.importFromJson);

  module.exports = router;
  ```

### 1.9 JSON 데이터 임포트 API 구현
- [ ] `POST /api/markets/import` 엔드포인트 구현
- [ ] `fleamarket_structured.json` 파일 읽기
- [ ] JSON 데이터를 DB 형식으로 변환
- [ ] Markets 테이블에 데이터 삽입
- [ ] Sessions 테이블에 일정 데이터 삽입
- [ ] 중복 체크 (URL 기반)

### 1.10 테스트
- [ ] Supabase Studio에서 테이블 생성 확인
- [ ] POST /api/markets/import 실행
- [ ] GET /api/markets 호출하여 데이터 확인
- [ ] GET /api/markets/:id 테스트

---

## ✅ Phase 2: 지오코딩 기능 구현

### 2.1 카카오 개발자 설정
- [ ] 카카오 개발자 계정 생성 (https://developers.kakao.com)
- [ ] 애플리케이션 추가
- [ ] REST API 키 발급
- [ ] `.env` 파일에 `KAKAO_REST_API_KEY` 추가

### 2.2 지오코딩 서비스 구현
- [ ] `be/src/services/geocoding.service.js` 생성
  ```javascript
  const axios = require('axios');

  async function geocodeAddress(address) {
    try {
      const response = await axios.get(
        'https://dapi.kakao.com/v2/local/search/address.json',
        {
          headers: {
            Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}`
          },
          params: { query: address }
        }
      );

      if (response.data.documents.length > 0) {
        const { x, y } = response.data.documents[0];
        return {
          longitude: parseFloat(x),
          latitude: parseFloat(y),
          success: true
        };
      }

      return { success: false, error: 'Address not found' };
    } catch (error) {
      console.error('Geocoding error:', error.message);
      return { success: false, error: error.message };
    }
  }

  module.exports = { geocodeAddress };
  ```

### 2.3 지오코딩 API 엔드포인트
- [ ] `POST /api/markets/geocode` 구현
  - 좌표가 없는 모든 마켓 조회
  - 각 마켓의 `place` 필드로 지오코딩 수행
  - `latitude`, `longitude`, `geocoded_at` 업데이트
- [ ] `POST /api/markets/:id/geocode` 구현
  - 특정 마켓만 지오코딩

### 2.4 에러 핸들링
- [ ] API 한도 초과 처리
- [ ] 주소 없음 처리
- [ ] 네트워크 에러 처리
- [ ] Rate limiting 구현 (1초당 최대 10건)

### 2.5 테스트
- [ ] 카카오 API 키 유효성 확인
- [ ] 단일 주소 지오코딩 테스트
- [ ] 전체 마켓 일괄 지오코딩 실행
- [ ] Supabase에서 좌표 데이터 확인
- [ ] 지오코딩 실패 케이스 로그 확인

---

## 📦 산출물

**완료 후 확인 사항**:
1. ✅ Supabase에 `markets`, `sessions` 테이블 존재
2. ✅ 기존 JSON 데이터가 DB에 저장됨
3. ✅ 모든 마켓에 `latitude`, `longitude` 데이터 존재
4. ✅ `GET /api/markets` API 정상 작동
5. ✅ `GET /api/markets/:id` API 정상 작동
6. ✅ 백엔드 폴더 구조 완성

**API 응답 예시**:
```json
{
  "success": true,
  "data": [
    {
      "market_id": 1,
      "market_name": "옥스팜 슈퍼스토어",
      "place": "아이파크몰 용산점",
      "latitude": 37.5295,
      "longitude": 126.9645,
      "image_url": "https://...",
      "sessions": [
        {
          "session_id": 1,
          "start_date": "2025-10-25",
          "end_date": "2025-10-26",
          "start_time": "10:30:00",
          "end_time": "18:00:00"
        }
      ]
    }
  ]
}
```

---

## 📝 참고사항

### 필수 NPM 패키지
```bash
npm install express dotenv @supabase/supabase-js axios
```

### 카카오 Local API 한도
- 일일 요청: 300,000건
- 무료 사용 가능
- API 문서: https://developers.kakao.com/docs/latest/ko/local/dev-guide

### Supabase 연결 확인
```javascript
// 테스트 코드
const supabase = require('./src/utils/supabase');

async function testConnection() {
  const { data, error } = await supabase.from('markets').select('count');
  if (error) {
    console.error('Connection failed:', error);
  } else {
    console.log('Connection successful!');
  }
}
```

---

## ⚠️ 주의사항

1. **환경 변수 보안**
   - `.env` 파일을 절대 Git에 커밋하지 말 것
   - `.env.example` 파일 생성 권장

2. **데이터 중복 방지**
   - `markets.url` 필드에 UNIQUE 제약 조건 설정
   - 임포트 시 기존 데이터 확인

3. **지오코딩 정확도**
   - 주소가 부정확하면 좌표도 부정확함
   - 수동 검증 필요한 경우 별도 플래그 추가 고려

4. **API Rate Limiting**
   - 카카오 API 호출 시 적절한 delay 추가
   - 대량 지오코딩 시 배치 처리 고려

---

## 🎯 다음 단계

MVP 완성 후 → **task_02_core_features.md**로 이동
- 크롤링 기능 구현
- 프론트엔드 연동
