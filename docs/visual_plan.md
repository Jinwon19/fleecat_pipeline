# FleeCat 플리마켓 자동화 시스템 기획안

## 📋 프로젝트 개요

**목표**: Python 크롤링 데이터 → Node.js 백엔드 → Supabase DB → React 프론트엔드 지도 시각화 자동화

---

## 🗂️ 1. 데이터베이스 설계 (Supabase)

### 테이블 구조

#### `markets` 테이블 (플리마켓 기본 정보)
```sql
CREATE TABLE markets (
  market_id BIGSERIAL PRIMARY KEY,
  market_name VARCHAR(255) NOT NULL,
  place VARCHAR(255) NOT NULL,
  url VARCHAR(500) UNIQUE NOT NULL,
  image_url TEXT,
  latitude DECIMAL(10, 8),      -- 위도 (지오코딩 결과)
  longitude DECIMAL(11, 8),     -- 경도 (지오코딩 결과)
  geocoded_at TIMESTAMPTZ,      -- 지오코딩 수행 시각
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_markets_url ON markets(url);
CREATE INDEX idx_markets_location ON markets(latitude, longitude);
```

#### `sessions` 테이블 (플리마켓 개최 일정)
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

---

## 🏗️ 2. 백엔드 아키텍처 (Node.js + Express)

### 폴더 구조
```
be/
├── src/
│   ├── controllers/
│   │   └── market.controller.js       # 플리마켓 API 컨트롤러
│   ├── services/
│   │   ├── market.service.js          # 비즈니스 로직
│   │   ├── crawler.service.js         # 크롤링 로직 (Python → JS 변환)
│   │   └── geocoding.service.js       # 카카오 지오코딩
│   ├── repositories/
│   │   └── market.repository.js       # Supabase DB 접근
│   ├── routes/
│   │   └── market.routes.js           # API 라우트
│   └── utils/
│       ├── supabase.js                # Supabase 클라이언트
│       └── kakaoMap.js                # 카카오맵 API 유틸
```

### 주요 API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/markets` | 전체 플리마켓 목록 조회 (위도/경도 포함) |
| GET | `/api/markets?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` | 날짜 필터링 조회 |
| GET | `/api/markets/:id` | 특정 플리마켓 상세 조회 |
| POST | `/api/markets/crawl` | 수동 크롤링 트리거 (관리자용) |
| POST | `/api/markets/import` | JSON 파일 임포트 (초기 데이터 이관) |

---

## 🔄 3. 구현 단계별 계획

### Phase 1: 기본 인프라 구축 (1-2일)
**목표**: Supabase 연결 + 기존 JSON 데이터 DB 이관

**작업 내용**:
1. Supabase에 `markets`, `sessions` 테이블 생성
2. `be/src/utils/supabase.js` - Supabase 클라이언트 설정
3. `market.repository.js` - DB CRUD 함수 구현
4. `POST /api/markets/import` - `fleamarket_structured.json` → DB 저장 스크립트
5. 테스트: Supabase Studio에서 데이터 확인

**산출물**:
- DB에 기존 크롤링 데이터 저장 완료
- 기본 조회 API 작동 확인

---

### Phase 2: 지오코딩 기능 구현 (1-2일)
**목표**: 주소 → 위도/경도 변환 (카카오 Local API)

**작업 내용**:
1. 카카오 개발자 계정 생성 + REST API 키 발급
2. `geocoding.service.js` 구현
   - 카카오 Local API 주소 검색
   - `markets.place` → `latitude`, `longitude` 업데이트
3. `POST /api/markets/geocode` - 누락된 좌표 일괄 지오코딩
4. 에러 핸들링 (API 한도 초과, 주소 없음 등)

**주요 코드 예시**:
```javascript
// geocoding.service.js
async function geocodeAddress(address) {
  const response = await axios.get('https://dapi.kakao.com/v2/local/search/address.json', {
    headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}` },
    params: { query: address }
  });

  if (response.data.documents.length > 0) {
    const { x, y } = response.data.documents[0];
    return { longitude: parseFloat(x), latitude: parseFloat(y) };
  }
  return null;
}
```

---

### Phase 3: 크롤링 기능 JavaScript 변환 (2-3일)
**목표**: Python 크롤링 로직을 Node.js로 이식

**작업 내용**:
1. `crawler.service.js` 구현
   - Python의 `flea_list_fast.py` → Axios + Cheerio로 변환
   - Python의 `flea_text_fast.py` → 상세 페이지 크롤링
   - Python의 `llm_processor.py` → OpenAI API 호출 (데이터 정제)
2. `POST /api/markets/crawl` - 크롤링 실행 엔드포인트
3. 중복 체크: URL 기반으로 기존 데이터 업데이트
4. 크롤링 후 자동 지오코딩 연동

**고려사항**:
- Python `requests` → Node.js `axios`
- Python `BeautifulSoup` → Node.js `cheerio`
- Python `Selenium` → Node.js `puppeteer` (필요시)

---

### Phase 4: 프론트엔드 연동 (1-2일)
**목표**: React에서 백엔드 API 호출로 지도 데이터 표시

**작업 내용**:
1. `Visual.jsx` 수정
   - Excel 파일 로드 제거
   - `useEffect`에서 `GET /api/markets` 호출
2. 응답 데이터를 지도에 맞는 형식으로 변환
3. 카카오맵으로 전환 (선택사항)
   - Leaflet → 카카오맵 SDK
   - 마커, 클러스터링 재구현

**API 응답 형식**:
```json
[
  {
    "market_id": 1,
    "market_name": "옥스팜 슈퍼스토어",
    "place": "아이파크몰 용산점",
    "latitude": 37.5295,
    "longitude": 126.9645,
    "image_url": "https://...",
    "sessions": [
      {
        "start_date": "2025-10-25",
        "end_date": "2025-10-26",
        "start_time": "10:30",
        "end_time": "18:00"
      }
    ]
  }
]
```

---

### Phase 5: 자동화 스케줄러 (추후 구현)
**목표**: 정기적 자동 크롤링

**작업 내용**:
1. `node-cron` 패키지 설치
2. 매일 오전 6시 자동 크롤링 스케줄 설정
3. 크롤링 결과 로그 저장 (성공/실패 통계)
4. 에러 발생 시 알림 (이메일/슬랙)

---

## 🛠️ 4. 기술 스택

| 분야 | 기술 |
|------|------|
| **백엔드** | Node.js, Express, Supabase JS Client |
| **크롤링** | Axios, Cheerio, (Puppeteer) |
| **지오코딩** | 카카오 Local API |
| **스케줄러** | node-cron (추후) |
| **프론트엔드** | React, (Kakao Maps SDK) |

---

## 📌 5. 환경 변수 (.env)

```env
# 기존 백엔드 변수
DATABASE_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=

# 신규 추가 필요
KAKAO_REST_API_KEY=            # 카카오 지오코딩용
OPENAI_API_KEY=                # LLM 데이터 정제용 (선택)
CRAWL_MAX_PAGES=10             # 크롤링 최대 페이지 수
```

---

## ⚠️ 주의사항

1. **Python 코드 활용**:
   - 기존 Python 크롤링 로직은 참고용으로 유지
   - JavaScript 변환 시 동일한 로직 구현

2. **카카오맵 전환**:
   - Leaflet → 카카오맵 전환은 **선택사항**
   - 당장은 Leaflet + 카카오 지오코딩만 사용 가능

3. **API 사용량 제한**:
   - 카카오 Local API: 일 300,000건
   - 크롤링: 사이트 부하 고려 (delay 추가)

4. **데이터 정합성**:
   - URL을 unique key로 중복 방지
   - 크롤링 시 기존 데이터 업데이트 vs 신규 추가 분기

---

## 🎯 다음 단계

위 기획안에 동의하시면, **Phase 1부터 순차적으로 구현**을 시작하겠습니다.

**첫 작업으로 시작할 내용**:
1. Supabase 테이블 생성 SQL 스크립트 작성
2. `be/src/utils/supabase.js` Supabase 클라이언트 설정
3. `POST /api/markets/import` - JSON 파일 임포트 API 구현

진행해도 될까요? 수정이 필요한 부분이 있으면 말씀해주세요!
