# Railway 배포 가이드

## 목차
1. [배포란 무엇인가?](#배포란-무엇인가)
2. [Railway 소개](#railway-소개)
3. [Fleecat 프로젝트 배포 구조](#fleecat-프로젝트-배포-구조)
4. [배포 과정](#배포-과정)
5. [환경 변수 설정](#환경-변수-설정)
6. [Google OAuth 설정](#google-oauth-설정)
7. [트러블슈팅](#트러블슈팅)

---

## 배포란 무엇인가?

### 개념

**배포(Deployment)**는 개발 완료된 애플리케이션을 **실제 사용자가 접근할 수 있는 환경**에 올리는 과정입니다.

### 로컬 개발 vs 배포 환경

| 구분 | 로컬 개발 환경 | 배포 환경 (Production) |
|------|--------------|----------------------|
| **접근 범위** | 개발자 본인만 (localhost) | 전 세계 누구나 (공개 URL) |
| **실행 위치** | 개발자 PC | 클라우드 서버 |
| **데이터베이스** | 로컬 또는 개발용 DB | 운영용 DB (Supabase) |
| **안정성** | 개발/테스트 중 (불안정 가능) | 24/7 안정 운영 필요 |
| **URL 예시** | `http://localhost:3000` | `https://fleecat-production.up.railway.app` |

### 왜 배포를 하는가?

1. **실제 사용자 접근성**
   - 프론트엔드, 모바일 앱 등 외부 클라이언트가 API를 호출할 수 있도록 함
   - 개발자 PC가 꺼져도 서비스가 중단되지 않음

2. **프로덕션 환경 테스트**
   - 실제 운영 환경에서의 성능, 보안, 에러 확인
   - HTTPS, CORS, OAuth 등 프로덕션 전용 설정 검증

3. **협업 및 데모**
   - 팀원, 클라이언트와 공유 가능한 공개 URL 제공
   - GitHub OAuth, Google 소셜 로그인 등은 공개 URL이 필수

4. **지속적 통합/배포 (CI/CD)**
   - GitHub에 코드 푸시 시 자동 배포
   - 빠른 피드백과 반복 개발 가능

---

## Railway 소개

### Railway란?

[Railway](https://railway.app)는 **풀 스택 애플리케이션을 쉽게 배포할 수 있는 PaaS(Platform as a Service)** 플랫폼입니다.

### 주요 특징

- **GitHub 연동 자동 배포**: GitHub 저장소와 연결하면 `git push` 시 자동으로 배포
- **간편한 환경 변수 관리**: 웹 UI에서 환경 변수를 쉽게 추가/수정
- **무료 티어 제공**: 월 $5 크레딧 무료 (개인 프로젝트에 충분)
- **다양한 런타임 지원**: Node.js, Python, Go, Rust 등
- **데이터베이스 통합**: PostgreSQL, MySQL, Redis 등을 쉽게 추가 가능
- **HTTPS 자동 제공**: 커스텀 도메인 없이도 HTTPS URL 제공

### Railway를 선택한 이유

| Railway | Heroku | AWS/GCP |
|---------|--------|---------|
| 무료 티어 제공 | 무료 티어 폐지 (2022) | 초보자에게 복잡 |
| GitHub 자동 배포 | ✅ | 수동 설정 필요 |
| 설정 간편 | ✅ | 학습 곡선 높음 |
| Node.js 지원 | ✅ | ✅ |

---

## Fleecat 프로젝트 배포 구조

### 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                      사용자 브라우저                       │
│  https://fleecat-production.up.railway.app              │
└─────────────────────────────────────────────────────────┘
                          ↓ HTTPS
┌─────────────────────────────────────────────────────────┐
│                    Railway 서버                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Fleecat Backend API (Node.js + Express)        │   │
│  │  - PORT: 3000 (내부)                             │   │
│  │  - Prisma ORM                                    │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          ↓ PostgreSQL
┌─────────────────────────────────────────────────────────┐
│               Supabase PostgreSQL Database              │
│  aws-1-ap-northeast-2.pooler.supabase.com              │
│  - Port 6543 (Pooler - 애플리케이션 쿼리용)              │
│  - Port 5432 (Direct - Prisma 마이그레이션용)            │
└─────────────────────────────────────────────────────────┘
```

### 기술 스택

- **Backend**: Node.js (Express)
- **ORM**: Prisma
- **Database**: Supabase (PostgreSQL)
- **Hosting**: Railway
- **Auth**: Supabase Auth (Google OAuth)
- **Version Control**: GitHub

---

## 배포 과정

### 1. GitHub 저장소 준비

```bash
# 저장소 초기화 및 첫 커밋
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/username/fleecat-backend.git
git push -u origin main
```

### 2. Railway 프로젝트 생성

1. **Railway 계정 생성**
   - https://railway.app 접속
   - GitHub 계정으로 로그인

2. **새 프로젝트 생성**
   - Dashboard → "New Project" 클릭
   - "Deploy from GitHub repo" 선택
   - `fleecat-backend` 저장소 선택

3. **자동 감지**
   - Railway가 `package.json` 감지
   - Node.js 환경 자동 구성

### 3. 환경 변수 설정

Railway Dashboard → Variables 탭에서 설정:

```bash
NODE_ENV=production
PORT=3000

# Supabase
SUPABASE_URL=https://ymqnpsiephgvdzzizsns.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_KEY=eyJhbGci...
SUPABASE_JWT_SECRET=/EXGP3Vcd0N...

# Database (중요!)
DATABASE_URL=postgresql://postgres.ymqnpsiephgvdzzizsns:password@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.ymqnpsiephgvdzzizsns:password@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres

# JWT
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d

# CORS
ALLOWED_ORIGINS=https://fleecat-production.up.railway.app,http://localhost:3000

# Frontend (OAuth Redirect)
FRONTEND_URL=https://fleecat-production.up.railway.app
```

### 4. Prisma 마이그레이션 실행

Railway는 배포 시 자동으로 다음 명령을 실행합니다 (`package.json`의 `build` 스크립트):

```json
{
  "scripts": {
    "build": "prisma generate && prisma migrate deploy",
    "start": "node src/server.js"
  }
}
```

- `prisma generate`: Prisma Client 생성
- `prisma migrate deploy`: 데이터베이스 마이그레이션 적용

### 5. 배포 확인

배포가 완료되면 Railway가 자동으로 URL을 생성합니다:

```
https://fleecat-production.up.railway.app
```

**Health Check 테스트:**
```bash
curl https://fleecat-production.up.railway.app/health

# 응답:
# {"status":"ok","message":"Fleecat API is running"}
```

---

## 환경 변수 설정

### 필수 환경 변수

#### 1. Database 연결 (가장 중요!)

```bash
# Pooler 연결 (애플리케이션 쿼리용)
DATABASE_URL=postgresql://postgres.ymqnpsiephgvdzzizsns:password@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true

# Direct 연결 (Prisma 마이그레이션용)
DIRECT_URL=postgresql://postgres.ymqnpsiephgvdzzizsns:password@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres
```

**중요:**
- `DATABASE_URL`: **Port 6543** (Pooler + pgbouncer)
  - 일반 애플리케이션 쿼리용
  - Connection pooling으로 성능 최적화
- `DIRECT_URL`: **Port 5432** (Direct Connection)
  - Prisma 마이그레이션 전용
  - Pooler를 우회하여 직접 연결

#### 2. Supabase 인증

```bash
SUPABASE_URL=https://[project-id].supabase.co
SUPABASE_ANON_KEY=[Supabase Dashboard → Settings → API]
SUPABASE_SERVICE_KEY=[Supabase Dashboard → Settings → API]
SUPABASE_JWT_SECRET=[Supabase Dashboard → Settings → API → JWT Secret]
```

**JWT Secret 찾는 방법:**
1. Supabase Dashboard 접속
2. Settings → API 탭
3. "JWT Secret" 섹션에서 복사

#### 3. JWT (자체 토큰)

```bash
JWT_SECRET=[랜덤 문자열 생성 권장]
JWT_EXPIRES_IN=7d
```

**JWT_SECRET 생성 방법:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

#### 4. CORS

```bash
ALLOWED_ORIGINS=https://fleecat-production.up.railway.app,http://localhost:3000
```

- 쉼표로 구분하여 여러 origin 허용
- 프로덕션 URL과 로컬 개발 URL 모두 포함

#### 5. Frontend URL (OAuth Redirect)

```bash
FRONTEND_URL=https://fleecat-production.up.railway.app
```

- Google OAuth 콜백 URL에 사용됨
- Supabase Auth 설정과 일치해야 함

### 환경 변수 확인 방법

Railway CLI로 확인:

```bash
railway login
railway link  # 프로젝트 연결
railway variables
```

---

## Google OAuth 설정

### 1. Google Cloud Console 설정

1. **OAuth 동의 화면 구성**
   - https://console.cloud.google.com
   - APIs & Services → OAuth consent screen
   - User Type: External
   - App Name: Fleecat
   - Support Email: 본인 이메일

2. **OAuth 2.0 클라이언트 생성**
   - APIs & Services → Credentials
   - Create Credentials → OAuth 2.0 Client ID
   - Application Type: Web application
   - Name: Fleecat Backend

3. **Authorized redirect URIs 추가**
   ```
   https://ymqnpsiephgvdzzizsns.supabase.co/auth/v1/callback
   ```
   - Supabase Auth Callback URL 사용
   - Railway URL이 아님에 주의!

4. **Client ID와 Secret 복사**
   - 다음 단계에서 Supabase에 등록할 때 사용

### 2. Supabase Auth 설정

1. **Supabase Dashboard 접속**
   - https://supabase.com/dashboard
   - 프로젝트 선택

2. **Google Provider 활성화**
   - Authentication → Providers
   - Google 선택
   - Enable 토글

3. **Google OAuth 정보 입력**
   - Client ID: [Google Cloud Console에서 복사]
   - Client Secret: [Google Cloud Console에서 복사]
   - Save 클릭

4. **Redirect URLs 확인**
   - Authentication → URL Configuration
   - Site URL: `https://fleecat-production.up.railway.app`
   - Redirect URLs:
     ```
     https://fleecat-production.up.railway.app/auth/callback
     http://localhost:3000/auth/callback  # 로컬 개발용
     ```

### 3. 백엔드 코드 구현

소셜 로그인 플로우는 이미 구현되어 있습니다:

**API 엔드포인트:**
- `GET /api/v1/auth/social/google` - OAuth URL 생성
- `POST /api/v1/auth/social/google/token` - Access token으로 로그인 처리

**파일 위치:**
- `src/routes/auth.routes.js:38` - 라우트
- `src/controllers/auth.controller.js:222` - 컨트롤러
- `src/services/auth.service.js:241` - 비즈니스 로직

### 4. 테스트

**테스트 페이지:**
```
https://fleecat-production.up.railway.app/test-google-login.html
```

**플로우:**
1. 사용자가 "Google로 로그인" 버튼 클릭
2. 백엔드 API가 Google OAuth URL 생성
3. Google 로그인 페이지로 리다이렉트
4. 사용자 로그인 후 `/auth/callback`으로 돌아옴
5. `callback.html`이 access_token 추출
6. 백엔드로 access_token 전송
7. JWT 검증 후 자체 JWT 토큰 발급
8. Member 테이블에 사용자 정보 저장/업데이트

---

## 트러블슈팅

### 1. Database Connection Error (해결됨)

**증상:**
```
Can't reach database server at `aws-1-ap-northeast-2.pooler.supabase.co:5432`
```

**원인:**
- Railway 환경 변수에서 `DATABASE_URL`이 잘못 설정됨
- Port 5432 (Direct)를 사용하려고 시도했으나, 이는 Prisma 마이그레이션 전용
- 애플리케이션 쿼리는 Port 6543 (Pooler)를 사용해야 함

**해결 방법:**

Railway Variables 수정:
```bash
# ✅ 올바른 설정
DATABASE_URL=postgresql://postgres.ymqnpsiephgvdzzizsns:password@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true

DIRECT_URL=postgresql://postgres.ymqnpsiephgvdzzizsns:password@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres
```

**교훈:**
- Supabase는 두 가지 연결 방식을 제공:
  - **Pooler (6543)**: 애플리케이션 쿼리용, Connection pooling 지원
  - **Direct (5432)**: 마이그레이션 전용, RLS 우회 가능
- Prisma는 `schema.prisma`에서 두 URL을 구분하여 사용:
  ```prisma
  datasource db {
    provider  = "postgresql"
    url       = env("DATABASE_URL")    # Pooler
    directUrl = env("DIRECT_URL")      # Direct
  }
  ```

### 2. Google OAuth Redirect Mismatch

**증상:**
```
redirect_uri_mismatch
```

**원인:**
- Google Cloud Console의 Authorized redirect URIs와 실제 redirect_uri가 불일치

**해결 방법:**
1. Google Cloud Console → Credentials
2. OAuth 2.0 Client ID 편집
3. Authorized redirect URIs에 추가:
   ```
   https://ymqnpsiephgvdzzizsns.supabase.co/auth/v1/callback
   ```
4. Save 후 5-10분 대기 (Google 설정 반영 시간)

### 3. CORS Error

**증상:**
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**원인:**
- Railway 환경 변수의 `ALLOWED_ORIGINS`에 프론트엔드 URL이 없음

**해결 방법:**

Railway Variables 수정:
```bash
ALLOWED_ORIGINS=https://fleecat-production.up.railway.app,https://your-frontend-domain.com,http://localhost:3000
```

또는 `src/app.js`의 CORS 설정 확인:
```javascript
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));
```

### 4. JWT Verification Failed

**증상:**
```
Failed to verify google token: invalid signature
```

**원인:**
- Railway 환경 변수의 `SUPABASE_JWT_SECRET`이 잘못되었거나 누락됨

**해결 방법:**
1. Supabase Dashboard → Settings → API
2. JWT Secret 복사 (NOT Service Role Key!)
3. Railway Variables에 `SUPABASE_JWT_SECRET` 추가
4. 재배포 대기

### 5. Environment Variables Not Loaded

**증상:**
- 환경 변수가 `undefined`로 나옴

**원인:**
- Railway에서 환경 변수를 추가했지만 재배포하지 않음

**해결 방법:**
1. Railway Dashboard → Deployments
2. "Redeploy" 버튼 클릭 또는
3. GitHub에 새 커밋 푸시:
   ```bash
   git commit --allow-empty -m "Trigger redeploy"
   git push
   ```

---

## 배포 체크리스트

### 배포 전

- [ ] 로컬에서 모든 기능 테스트 완료
- [ ] `.env.example` 파일 최신화
- [ ] `package.json`의 `build`, `start` 스크립트 확인
- [ ] Prisma 스키마 최종 확인
- [ ] GitHub에 최신 코드 푸시

### Railway 설정

- [ ] GitHub 저장소 연결
- [ ] 모든 환경 변수 설정 (`DATABASE_URL`, `DIRECT_URL` 등)
- [ ] `FRONTEND_URL`을 Railway 도메인으로 설정
- [ ] `ALLOWED_ORIGINS`에 Railway 도메인 추가

### Supabase 설정

- [ ] Supabase 프로젝트 생성
- [ ] PostgreSQL 연결 정보 확인 (Pooler + Direct)
- [ ] Google OAuth Provider 활성화
- [ ] Redirect URLs 설정

### Google Cloud Console

- [ ] OAuth 2.0 Client ID 생성
- [ ] Authorized redirect URIs에 Supabase Callback URL 추가
- [ ] Client ID와 Secret을 Supabase에 등록

### 배포 후 테스트

- [ ] Health check 엔드포인트 확인 (`/health`)
- [ ] Database 연결 확인 (API 호출 테스트)
- [ ] Google 소셜 로그인 테스트
- [ ] JWT 토큰 발급/검증 테스트
- [ ] CORS 정책 확인 (프론트엔드 연동 시)

---

## 참고 자료

- [Railway 공식 문서](https://docs.railway.app/)
- [Prisma 배포 가이드](https://www.prisma.io/docs/guides/deployment)
- [Supabase Auth 가이드](https://supabase.com/docs/guides/auth)
- [Google OAuth 2.0 문서](https://developers.google.com/identity/protocols/oauth2)

---

**작성일**: 2025-01-13
**최종 수정**: 2025-01-13
**작성자**: Claude Code (Fleecat Backend Team)
