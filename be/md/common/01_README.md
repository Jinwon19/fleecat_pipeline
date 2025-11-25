# Fleecat 백엔드 - 프로젝트 개요

> [← 목차로 돌아가기](./00_INDEX.md)

---

## 1. 프로젝트 약어 및 용어 정의

### 1.1 백엔드 약어

| 분야 | 영문명 | 약어 | 설명 |
|------|--------|------|------|
| API | Application Programming Interface | API | 애플리케이션 인터페이스 |
| ORM | Object-Relational Mapping | ORM | 객체-관계 매핑 |
| CRUD | Create, Read, Update, Delete | CRUD | 기본 데이터 조작 |
| JWT | JSON Web Token | JWT | 인증 토큰 |
| RLS | Row Level Security | RLS | 행 수준 보안 |
| BaaS | Backend as a Service | BaaS | 백엔드 서비스 |

### 1.2 도메인 용어

| 한글명 | 영문명 | 약어 | 설명 |
|--------|--------|------|------|
| 판매사 | Tenant | - | 공방, 스토어 운영 주체 |
| 판매자 | Seller | - | 판매사 소속 구성원 |
| 구매자 | Buyer | - | 상품 구매 회원 |
| 멀티테넌트 | Multi-tenant | MT | 여러 판매사 지원 구조 |

---

## 2. 프로젝트 개요

### 2.1 프로젝트 정보

| 항목 | 내용 |
|------|------|
| 프로젝트명 | Fleecat 멀티테넌트 쇼핑몰 |
| 프로젝트 유형 | E-commerce Platform (B2C, C2C) |
| 핵심 기능 | 상품 관리, 주문/결제, 회원 관리, 판매자 관리 |
| 데이터베이스 | PostgreSQL (via Supabase) |
| 총 테이블 수 | 17개 |

### 2.2 주요 비즈니스 프로세스

#### 1. 판매자 등록 프로세스
```
회원가입 → 판매자 신청 → 관리자 승인 → 상품 등록
```

#### 2. 상품 판매 프로세스
```
상품 등록 → 관리자 승인 → 상품 노출 → 주문 → 배송
```

#### 3. 주문 처리 프로세스
```
장바구니 → 주문 생성 → 결제 → 배송 → 구매 확정
```

---

## 3. 기술 스택

### 3.1 핵심 기술

| 구분 | 기술 | 버전 | 역할 |
|------|------|------|------|
| 런타임 | Node.js | 20.x LTS | JavaScript 실행 환경 |
| 프레임워크 | Express.js | 4.x | 웹 애플리케이션 프레임워크 |
| ORM | Prisma | 5.x | 데이터베이스 ORM |
| BaaS | Supabase | Latest | 데이터베이스, 인증, 스토리지 |

### 3.2 주요 라이브러리

| 라이브러리 | 용도 |
|------------|------|
| @supabase/supabase-js | Supabase 클라이언트 |
| @prisma/client | Prisma 클라이언트 |
| jsonwebtoken | JWT 인증 |
| bcrypt | 비밀번호 암호화 |
| express-validator | 입력 검증 |
| cors | CORS 설정 |
| helmet | 보안 헤더 |
| morgan | HTTP 로깅 |
| dotenv | 환경변수 관리 |

---

## 4. 프로젝트 구조

```
fleecat-backend/
├── prisma/                    # Prisma 설정
│   ├── schema.prisma         # 데이터베이스 스키마
│   ├── migrations/           # 마이그레이션 파일
│   └── seed.js               # 초기 데이터
│
├── src/                      # 소스 코드
│   ├── config/               # 설정 파일
│   │   ├── database.js      # DB 연결 설정
│   │   ├── supabase.js      # Supabase 설정
│   │   └── constants.js     # 상수 정의
│   │
│   ├── middlewares/          # 미들웨어
│   │   ├── auth.js          # 인증 미들웨어
│   │   ├── validation.js    # 검증 미들웨어
│   │   ├── errorHandler.js  # 에러 핸들러
│   │   └── rateLimiter.js   # Rate Limiting
│   │
│   ├── routes/               # 라우터
│   │   ├── index.js         # 라우터 통합
│   │   ├── auth.routes.js   # 인증 라우트
│   │   ├── product.routes.js # 상품 라우트
│   │   ├── order.routes.js   # 주문 라우트
│   │   ├── cart.routes.js    # 장바구니 라우트
│   │   ├── member.routes.js  # 회원 라우트
│   │   └── admin.routes.js   # 관리자 라우트
│   │
│   ├── controllers/          # 컨트롤러
│   │   ├── auth.controller.js
│   │   ├── product.controller.js
│   │   ├── order.controller.js
│   │   └── ...
│   │
│   ├── services/             # 비즈니스 로직
│   │   ├── auth.service.js
│   │   ├── product.service.js
│   │   ├── order.service.js
│   │   └── ...
│   │
│   ├── repositories/         # 데이터 접근 계층
│   │   ├── product.repository.js
│   │   ├── order.repository.js
│   │   └── ...
│   │
│   ├── utils/                # 유틸리티
│   │   ├── logger.js        # 로깅
│   │   ├── validator.js     # 검증 함수
│   │   ├── helpers.js       # 헬퍼 함수
│   │   └── response.js      # 응답 포맷터
│   │
│   ├── types/                # TypeScript 타입 정의
│   │   └── index.d.ts
│   │
│   ├── app.js                # Express 앱 설정
│   └── server.js             # 서버 실행
│
├── tests/                    # 테스트 코드
│   ├── unit/                 # 단위 테스트
│   ├── integration/          # 통합 테스트
│   └── e2e/                  # E2E 테스트
│
├── docs/                     # 문서
│   ├── api/                  # API 문서
│   ├── architecture/         # 아키텍처 문서
│   └── database/             # DB 문서
│
├── scripts/                  # 스크립트
│   ├── setup.sh             # 초기 설정
│   └── deploy.sh            # 배포 스크립트
│
├── .env.example              # 환경변수 예시
├── .env.development          # 개발 환경변수
├── .env.production           # 운영 환경변수
├── .gitignore                # Git 무시 파일
├── .eslintrc.js              # ESLint 설정
├── .prettierrc               # Prettier 설정
├── package.json              # 패키지 정보
├── package-lock.json         # 패키지 잠금
└── README.md                 # 프로젝트 설명
```

### 4.1 디렉토리 설명

#### `/src/config/`
애플리케이션 설정 파일들을 관리합니다.
- 데이터베이스 연결, Supabase 설정, 상수 정의 등

#### `/src/middlewares/`
Express 미들웨어들을 관리합니다.
- 인증, 검증, 에러 처리, Rate Limiting 등

#### `/src/routes/`
API 엔드포인트 라우팅을 정의합니다.
- 각 도메인별로 라우터를 분리하여 관리

#### `/src/controllers/`
HTTP 요청/응답을 처리합니다.
- 요청 데이터 추출, 서비스 호출, 응답 반환

#### `/src/services/`
비즈니스 로직을 구현합니다.
- 핵심 비즈니스 규칙, 데이터 검증, 트랜잭션 관리

#### `/src/repositories/`
데이터베이스 접근을 담당합니다.
- Prisma를 통한 데이터 CRUD 작업

#### `/src/utils/`
공통 유틸리티 함수들을 관리합니다.
- 로깅, 검증, 헬퍼 함수, 응답 포맷 등

---

## 5. 개발 환경 설정

### 5.1 필수 요구사항

- Node.js 20.x LTS
- npm 또는 yarn
- PostgreSQL (Supabase 사용 시 불필요)
- Git

### 5.2 프로젝트 설정

```bash
# 저장소 클론
git clone <repository-url>
cd fleecat-backend

# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env.development
# .env.development 파일을 열어 환경변수 설정

# Prisma 마이그레이션
npx prisma migrate dev

# Prisma Client 생성
npx prisma generate

# 개발 서버 실행
npm run dev
```

### 5.3 주요 NPM 스크립트

```json
{
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js",
    "test": "jest --coverage",
    "test:watch": "jest --watch",
    "lint": "eslint src/**/*.js",
    "lint:fix": "eslint src/**/*.js --fix",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio",
    "prisma:seed": "node prisma/seed.js"
  }
}
```

---

## 다음 단계

- **코드를 작성하기 전**: [02. 코딩 표준](./02_CODING_STANDARDS.md)을 읽어주세요
- **API 개발 시**: [04. API 개발 가이드](./04_API_DEVELOPMENT.md)를 참고하세요
- **데이터베이스 작업 시**: [03. 데이터베이스 가이드](./03_DATABASE_GUIDE.md)를 참고하세요

---

> [← 목차로 돌아가기](./00_INDEX.md)
