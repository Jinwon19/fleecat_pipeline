# FleeCat 🎪

> AI 기반 플리마켓 데이터 플랫폼 - 웹크롤링부터 지도 시각화까지 완전한 데이터 파이프라인

**FleeCat**은 플리마켓 정보를 자동으로 수집, 정제, 시각화하는 **풀스택 데이터 플랫폼**입니다. 웹크롤링으로 수집한 비정형 데이터를 GPT-4를 활용해 구조화하고, 멀티테넌트 E-Commerce 아키텍처로 저장하여 카카오맵으로 시각화합니다.

---

## 🌟 핵심 기능

### 1. 병렬 웹크롤링
- **Selenium + Requests 하이브리드** 방식으로 10배 빠른 크롤링
- **ThreadPoolExecutor** 병렬 처리 (최대 10 workers)
- 자동 재시도 로직 및 진행률 표시

### 2. AI 데이터 정제
- **GPT-4o-mini**를 활용한 비정형 텍스트 구조화
- **Vision API**로 이미지에서 정보 추출
- 3단계 정제 프로세스로 90%+ 정확도 달성

### 3. 멀티테넌트 DB 설계
- **15개 테이블**로 구성된 복잡한 관계형 데이터베이스
- **Prisma ORM**으로 타입 안전성 보장
- **Supabase PostgreSQL** 클라우드 DB

### 4. 카카오맵 시각화
- **Kakao Maps API** 통합으로 100+ 마커 표시
- **지오코딩 캐싱**으로 API 호출 최소화
- 날짜 범위 필터링으로 사용자 맞춤 검색

---

## 🛠️ 기술 스택

### Backend
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express)
![Prisma](https://img.shields.io/badge/Prisma-5.x-2D3748?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?logo=postgresql&logoColor=white)

- **Runtime**: Node.js 18+ / Express.js
- **ORM**: Prisma
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT + Bcrypt

### Frontend
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?logo=vite&logoColor=white)

- **Framework**: React 19 + Vite
- **Maps**: Kakao Maps SDK
- **State**: Context API
- **UI**: Lucide React Icons

### Data Pipeline
![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-412991?logo=openai)

- **Scraping**: Selenium, BeautifulSoup4, Requests
- **LLM**: OpenAI GPT-4o-mini
- **Parallel**: ThreadPoolExecutor (10 workers)
- **Database**: Supabase Python Client

---

## 📂 프로젝트 구조

```
FleeCat/
├── flee/                       # 크롤링 & 데이터 파이프라인
│   ├── flea_list_fast.py      # 게시물 목록 크롤링 (병렬)
│   ├── flea_text_fast.py      # 상세 내용 크롤링
│   ├── llm_processor.py       # GPT-4o 데이터 정제
│   ├── supabase_manager.py    # Supabase DB 연동
│   ├── add_geocoding.py       # Kakao API 지오코딩
│   ├── master_pipeline.py     # 전체 파이프라인 통합
│   └── requirements.txt       # Python 의존성
│
├── be/                        # Node.js Backend
│   ├── prisma/
│   │   └── schema.prisma      # 15개 테이블 DB 스키마
│   ├── src/
│   │   ├── controllers/       # HTTP 요청/응답 처리
│   │   ├── services/          # 비즈니스 로직
│   │   ├── repositories/      # 데이터 액세스
│   │   └── middlewares/       # 인증, 검증, 에러 처리
│   └── package.json
│
└── fe-skeleton/               # React Frontend
    ├── src/
    │   ├── pages/
    │   │   └── Visual/        # 카카오맵 지도 시각화
    │   └── lib/
    │       └── supabaseClient.js
    └── package.json
```

---

## 🚀 실행 방법

### 사전 요구사항
- Node.js 18+
- Python 3.10+
- Supabase 계정
- OpenAI API 키
- Kakao Maps API 키

### 1️⃣ 크롤링 파이프라인 실행

```bash
cd flee

# 가상환경 생성 및 활성화
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Mac/Linux

# 의존성 설치
pip install -r requirements.txt

# 환경 변수 설정
cp .env.example .env
# .env 파일에 OPENAI_API_KEY, SUPABASE_URL 등 입력

# 전체 파이프라인 실행 (크롤링 → LLM 정제 → DB 저장)
python master_pipeline.py

# 또는 단계별 실행
python flea_list_fast.py      # 1. 목록 크롤링
python flea_text_fast.py      # 2. 상세 크롤링
python llm_processor.py       # 3. LLM 정제
python supabase_manager.py    # 4. DB 저장
```

### 2️⃣ 백엔드 실행

```bash
cd be

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일에 DATABASE_URL, JWT_SECRET 등 입력

# Prisma 마이그레이션
npx prisma generate
npx prisma db push

# 서버 시작
npm run dev
```

### 3️⃣ 프론트엔드 실행

```bash
cd fe-skeleton

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일에 VITE_KAKAO_MAP_KEY, VITE_SUPABASE_URL 등 입력

# 개발 서버 시작
npm run dev
```

브라우저에서 `http://localhost:5173/visual` 접속하여 지도 시각화 확인

---

## 📊 데이터 플로우

```
웹사이트 (플리마켓 정보)
    ↓
┌─────────────────────────────────────┐
│  1. 웹크롤링 (Python)               │
│  - Selenium + Requests 병렬 처리    │
│  - 게시물 목록 + 상세 내용 수집      │
└─────────────────────────────────────┘
    ↓ fleamarket_detail.json
┌─────────────────────────────────────┐
│  2. LLM 데이터 정제 (GPT-4o)        │
│  - 비정형 텍스트 → JSON 구조화      │
│  - 이미지 분석 (Vision API)         │
└─────────────────────────────────────┘
    ↓ fleamarket_structured.json
┌─────────────────────────────────────┐
│  3. Supabase DB 저장                │
│  - PostgreSQL 15개 테이블           │
│  - 멀티테넌트 관계형 구조            │
└─────────────────────────────────────┘
    ↓ Supabase API
┌─────────────────────────────────────┐
│  4. React 지도 시각화               │
│  - Kakao Maps API                   │
│  - 마커 클러스터링 + 날짜 필터링     │
└─────────────────────────────────────┘
```

---

## 🎯 주요 특징

### 병렬 처리 최적화
- ThreadPoolExecutor로 10개 페이지 동시 크롤링
- Requests (빠름) → Selenium (JS 렌더링) 자동 폴백
- 최대 3회 재시도 로직

### 3단계 LLM 정제
1. **텍스트 분석**: 게시글에서 날짜, 장소, 시간 추출
2. **이미지 분석**: Vision API로 포스터에서 누락 정보 보완
3. **데이터 검증**: 날짜 형식 통일, "미정" 제거

### 멀티테넌트 아키텍처
- 하나의 플랫폼에서 여러 판매자 독립 운영
- FK 관계로 데이터 격리
- CASCADE/RESTRICT 정책으로 일관성 보장

### 지오코딩 캐싱
- Kakao Local API로 주소 → 좌표 변환
- SQLite 로컬 캐시로 중복 API 호출 방지
- 100+ 마커도 빠른 렌더링

---

## 📈 성과

- **데이터 수집**: 100+ 플리마켓 정보 자동 수집
- **처리 속도**: 병렬 처리로 10배 속도 향상
- **정확도**: LLM 정제로 90%+ 정확도 달성
- **DB 규모**: 15개 테이블, 복잡한 관계형 구조
- **코드 품질**: 600줄+ 상세 문서 작성

---

## 🔮 향후 계획

- [ ] Docker 컨테이너화
- [ ] CI/CD 파이프라인 구축 (GitHub Actions)
- [ ] 테스트 커버리지 확대
- [ ] Redis 캐싱 도입
- [ ] 관리자 대시보드 개발

---

## 📝 라이선스

This project is licensed under the MIT License.

---

## 🙏 감사의 말

이 프로젝트는 웹크롤링부터 AI 데이터 정제, DB 설계, API 개발, 프론트엔드 시각화까지 **풀스택 개발의 전 과정**을 경험하기 위해 제작되었습니다.
