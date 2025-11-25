# GitHub 업로드 가이드 📦

> FleeCat 프로젝트가 GitHub에 업로드한 핵심 파일 목록 및 실행 가이드

**GitHub 리포지토리**: https://github.com/Jinwon19/fleecat_pipeline

---

## ✅ 업로드된 핵심 파일

### 1️⃣ 크롤링 & 데이터 파이프라인 (`flee/`)

**핵심 실행 파일:**
```
flee/
├── master_pipeline.py          # 🚀 전체 파이프라인 통합 실행
├── flea_list_fast.py          # 게시물 목록 크롤링 (병렬)
├── flea_text_fast.py          # 상세 내용 크롤링 (병렬)
├── llm_processor.py           # GPT-4o 데이터 정제
├── prompt_templates.py        # LLM 프롬프트 템플릿
├── supabase_manager.py        # Supabase DB 연동
├── add_geocoding.py           # Kakao API 지오코딩
├── extract_to_json.py         # LLM 정제 래퍼
├── structured_to_db.py        # 로컬 SQLite DB 저장
├── requirements.txt           # Python 의존성
└── .env.example              # 환경 변수 예시
```

**실행 방법:**
```bash
cd flee
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python master_pipeline.py
```

---

### 2️⃣ 백엔드 (`be/`)

**핵심 파일:**
```
be/
├── prisma/
│   └── schema.prisma          # 15개 테이블 DB 스키마
├── src/
│   ├── app.js                 # Express 앱 진입점
│   ├── server.js              # 서버 시작
│   ├── config/
│   │   └── supabase.js        # Supabase 설정
│   ├── controllers/           # HTTP 요청/응답 처리
│   ├── services/              # 비즈니스 로직
│   ├── repositories/          # 데이터 액세스 (Prisma)
│   ├── middlewares/           # 인증, 검증, 에러 처리
│   └── routes/                # API 라우팅
├── package.json               # Node.js 의존성
└── .env.example              # 환경 변수 예시
```

**실행 방법:**
```bash
cd be
npm install
npx prisma generate
npm run dev
```

---

### 3️⃣ 프론트엔드 (`fe-skeleton/`)

**핵심 파일:**
```
fe-skeleton/
├── src/
│   ├── main.jsx               # React 진입점
│   ├── pages/
│   │   └── Visual/
│   │       ├── Visual.jsx     # 카카오맵 지도 시각화
│   │       └── Visual.css     # 스타일
│   └── lib/
│       └── supabaseClient.js  # Supabase 클라이언트
├── package.json               # React 의존성
└── .env.example              # 환경 변수 예시
```

**실행 방법:**
```bash
cd fe-skeleton
npm install
npm run dev
```

브라우저에서 `http://localhost:5173/visual` 접속

---

### 4️⃣ 문서 (`docs/`, README 파일들)

```
FleeCat/
├── README.md                  # 프로젝트 전체 소개
├── flee/README.md             # 크롤링 파이프라인 가이드
├── fe-skeleton/README.md      # 프론트엔드 가이드
├── be/README.md               # 백엔드 상세 문서 (657줄)
├── be/CLAUDE.md              # Claude Code AI 가이드
└── docs/                      # 추가 참고 문서
    ├── task_01_mvp.md
    ├── task_02_core_features.md
    └── visual_plan.md
```

---

## ❌ 제외된 파일 (업로드 안 됨)

### 민감 정보
- ✅ `.env` 파일 (API 키, DB 비밀번호)
- ✅ `be/.env`, `fe-skeleton/.env`, `flee/.env`

### 의존성 (재설치 가능)
- ✅ `node_modules/` (npm install로 재생성)
- ✅ `venv/` (Python 가상환경)
- ✅ `__pycache__/` (Python 캐시)

### 바이너리 및 데이터 파일
- ✅ `chromedriver.exe` (약 20MB, Selenium 드라이버)
- ✅ `fleamarket.db` (로컬 SQLite DB)
- ✅ `fleamarket_posts.json`, `fleamarket_detail.json` (크롤링 결과)
- ✅ `fleamarket_structured.json` (정제된 데이터, 1,727줄)

### 분석 로그 파일
- ✅ `*.txt` 분석 로그 (단, `requirements.txt`는 포함)
- ✅ `logs/` 폴더

---

## 🚀 로컬에서 실행하기

### 사전 요구사항

1. **Node.js** 18+ 설치
2. **Python** 3.10+ 설치
3. **API 키 준비**:
   - OpenAI API 키
   - Supabase 프로젝트 (URL + Key)
   - Kakao Maps API 키 (JavaScript + REST)

### 1단계: 저장소 클론

```bash
git clone https://github.com/Jinwon19/fleecat_pipeline.git
cd fleecat_pipeline
```

### 2단계: 환경 변수 설정

각 디렉토리에서 `.env.example`을 복사하여 `.env` 생성:

```bash
# 크롤링 파이프라인
cd flee
copy .env.example .env
# .env 파일 편집: OPENAI_API_KEY, SUPABASE_URL 등 입력

# 백엔드
cd ../be
copy .env.example .env
# .env 파일 편집: DATABASE_URL, JWT_SECRET 등 입력

# 프론트엔드
cd ../fe-skeleton
copy .env.example .env
# .env 파일 편집: VITE_KAKAO_MAP_KEY 등 입력
```

### 3단계: 의존성 설치

```bash
# 크롤링 파이프라인
cd flee
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

# 백엔드
cd ../be
npm install
npx prisma generate

# 프론트엔드
cd ../fe-skeleton
npm install
```

### 4단계: 실행

**터미널 1 - 크롤링 파이프라인:**
```bash
cd flee
venv\Scripts\activate
python master_pipeline.py
```

**터미널 2 - 백엔드:**
```bash
cd be
npm run dev
```

**터미널 3 - 프론트엔드:**
```bash
cd fe-skeleton
npm run dev
```

---

## 🎯 주요 기능 테스트

### 1. 크롤링 파이프라인
```bash
cd flee
python master_pipeline.py
```
- 100+ 플리마켓 데이터 자동 수집
- LLM으로 데이터 정제
- Supabase에 자동 저장

### 2. 지도 시각화
브라우저에서 `http://localhost:5173/visual` 접속
- 카카오맵에 100+ 마커 표시
- 날짜 범위 필터링
- 마커 클릭으로 상세 정보 확인

### 3. API 테스트
```bash
curl http://localhost:3000/api/health
```

---

## 📊 프로젝트 통계

- **총 파일 수**: 559개
- **총 코드 라인**: 113,997줄
- **커밋 수**: 1개 (Initial commit)
- **브랜치**: main
- **최종 업데이트**: 2025-01-25

---

## 🔧 문제 해결

### ChromeDriver 오류
```bash
pip install webdriver-manager
```

### Prisma 오류
```bash
npx prisma generate
npx prisma db push
```

### Kakao Maps 로드 실패
1. `.env` 파일의 `VITE_KAKAO_MAP_KEY` 확인
2. Kakao Developers에서 웹 플랫폼 등록 확인

---

## 📝 추가 참고

- **백엔드 상세 문서**: `be/README.md` (657줄, 매우 상세)
- **DB 스키마 가이드**: `be/md/common/db_00_INDEX.md`
- **API 개발 가이드**: `be/md/common/04_API_DEVELOPMENT.md`
- **크롤링 사용 가이드**: `flee/README.md`

---

## 🙏 라이선스

MIT License

---

**제작**: Jinwon19
**GitHub**: https://github.com/Jinwon19/fleecat_pipeline
**최종 업데이트**: 2025-01-25
