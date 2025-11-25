# Admin Login Test Case 1 - 실패 사례 분석

**테스트 일시**: 2025-10-09
**테스트 대상**: 관리자 로그인 페이지 및 데이터베이스 연결
**테스트 환경**: Windows, Node.js v22.20.0, Prisma 6.17.0, Supabase PostgreSQL

---

## 테스트 개요

Step 15에서 생성한 관리자 HTML 페이지(`/admin/index.html`)의 로그인 기능을 테스트하였으나, 여러 오류가 발생하여 실패하였습니다.

---

## 발견된 문제점 및 해결 과정

### 1. JavaScript 로드 순서 문제

#### 문제 상황
```
auth.js:8 Uncaught ReferenceError: isAuthenticated is not defined
```

#### 원인
`index.html`에서 `api.js`가 로드되지 않아 `isAuthenticated()` 함수를 찾을 수 없음.

```html
<!-- 문제가 있던 코드 (index.html) -->
<script src="js/auth.js"></script>
</body>
```

#### 해결 방법
`api.js`를 먼저 로드하도록 수정:

```html
<!-- 수정된 코드 (index.html) -->
<script src="js/api.js"></script>
<script src="js/auth.js"></script>
</body>
```

#### 해결 상태
✅ **해결 완료** - `index.html:55-56` 수정됨

---

### 2. Prisma Client 초기화 문제

#### 문제 상황
```
Error: @prisma/client did not initialize yet.
Please run "prisma generate" and try to import it again.
```

#### 원인
- Prisma Client가 생성되지 않았거나 손상됨
- 여러 Node.js 프로세스가 `query_engine-windows.dll.node` 파일을 점유

#### 해결 과정
1. 실행 중인 모든 Node.js 프로세스 확인:
   ```bash
   tasklist | findstr node.exe
   ```

2. 포트 3000을 사용하는 프로세스 종료:
   ```bash
   netstat -ano | findstr :3000
   taskkill //F //PID [PID번호] //T
   ```

3. Prisma Studio 및 dev 서버 종료 후 Prisma Client 재생성:
   ```bash
   npx prisma generate
   ```

#### 해결 상태
✅ **해결 완료** - Prisma Client 성공적으로 재생성됨

---

### 3. 데이터베이스 연결 문제 (현재 진행 중)

#### 문제 상황 1: 환경 변수 누락
```
error: Environment variable not found: DATABASE_URL.
  -->  schema.prisma:7
```

#### 원인
`.env` 파일에 `DATABASE_URL`이 있었으나, `schema.prisma`에서 요구하는 `DIRECT_URL`이 누락됨.

```prisma
// prisma/schema.prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")  // 이 환경 변수가 필요함
}
```

#### 해결 방법
`.env` 파일에 `DIRECT_URL` 추가:

```bash
# Database (Supabase PostgreSQL)
# Transaction pooler (for connections with session mode)
DATABASE_URL=postgresql://postgres:fleecat@5857@db.bzdrmshqarfgwkqrzgix.supabase.co:6543/postgres
# Direct connection (for migrations)
DIRECT_URL=postgresql://postgres:fleecat@5857@db.bzdrmshqarfgwkqrzgix.supabase.co:5432/postgres
```

#### 해결 상태
✅ **해결 완료** - `.env:11-14` 수정됨

---

#### 문제 상황 2: 데이터베이스 인증 실패

```
Error querying the database: FATAL: Tenant or user not found
```

#### 원인
Supabase PostgreSQL 연결 문자열의 형식 또는 자격 증명이 잘못됨.

**시도한 연결 문자열:**
1. ❌ `postgresql://postgres.bzdrmshqarfgwkqrzgix:fleecat@5857@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`
2. ❌ `postgresql://postgres:fleecat@5857@db.bzdrmshqarfgwkqrzgix.supabase.co:6543/postgres`

#### Prisma 연결 테스트 결과
```bash
npx prisma db pull
```

**에러 메시지:**
```
Error: P1001

Can't reach database server at `db.bzdrmshqarfgwkqrzgix.supabase.co:5432`

Please make sure your database server is running at
`db.bzdrmshqarfgwkqrzgix.supabase.co:5432`.
```

#### 분석
- **호스트 형식**: `db.bzdrmshqarfgwkqrzgix.supabase.co` (올바른지 확인 필요)
- **포트**: 6543 (Transaction Pooler), 5432 (Direct Connection)
- **비밀번호**: `fleecat@5857` (특수문자 `@` 포함으로 URL 인코딩 필요할 수 있음)

#### 해결 상태
❌ **미해결** - Supabase 대시보드에서 올바른 연결 문자열 확인 필요

---

## Supabase 연결 문자열 확인 가이드

### 올바른 연결 문자열 확인 방법

1. **Supabase Dashboard 접속**
   - Project → Settings → Database

2. **Connection String 섹션**
   - **Transaction Mode** (Pooler): 일반 쿼리용
     ```
     postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
     ```

   - **Session Mode** (Direct): 마이그레이션 및 관리 작업용
     ```
     postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
     ```

3. **비밀번호 특수문자 처리**
   - 비밀번호에 `@`, `#`, `%` 등 특수문자가 있으면 URL 인코딩 필요
   - 예: `fleecat@5857` → `fleecat%405857`

### 예상되는 올바른 형식

```bash
# Transaction Mode (DATABASE_URL)
postgresql://postgres.bzdrmshqarfgwkqrzgix:fleecat%405857@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres

# Direct Connection (DIRECT_URL)
postgresql://postgres.bzdrmshqarfgwkqrzgix:fleecat%405857@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres
```

---

## 현재 프로젝트 상태

### 성공적으로 완료된 항목
✅ 관리자 HTML 페이지 생성 (index.html, dashboard.html, orders.html, products.html)
✅ JavaScript 파일 생성 (api.js, auth.js, dashboard.js, orders.js, products.js)
✅ CSS 파일 생성 (admin.css)
✅ Prisma Client 생성
✅ Express 서버 실행 (포트 3000)

### 미완료 항목
❌ Supabase PostgreSQL 데이터베이스 연결
❌ 관리자 계정 생성
❌ 관리자 로그인 기능 테스트
❌ 대시보드 데이터 로드 테스트

---

## 다음 단계 (Next Steps)

1. **Supabase 연결 문자열 확인**
   - Supabase Dashboard에서 정확한 연결 문자열 복사
   - 비밀번호 특수문자 URL 인코딩 확인

2. **`.env` 파일 업데이트**
   - `DATABASE_URL` 및 `DIRECT_URL` 올바른 값으로 수정
   - 서버 재시작

3. **데이터베이스 마이그레이션 실행**
   ```bash
   npx prisma db push
   # 또는
   npx prisma migrate deploy
   ```

4. **관리자 계정 생성**
   - Prisma Studio 또는 시드 스크립트로 `role: 'admin'` 계정 생성

5. **로그인 테스트**
   - `http://localhost:3000/admin/` 접속
   - 관리자 계정으로 로그인 시도

6. **대시보드 기능 테스트**
   - 통계 데이터 로드
   - 주문 관리 페이지
   - 상품 관리 페이지

---

## 참고 파일 위치

```
FleeCat-backendVER0.1/
├── .env                                    # 환경 변수 (수정 필요)
├── prisma/
│   └── schema.prisma                       # Prisma 스키마
├── public/
│   └── admin/
│       ├── index.html                      # 로그인 페이지 (수정됨)
│       ├── dashboard.html                  # 대시보드
│       ├── orders.html                     # 주문 관리
│       ├── products.html                   # 상품 관리
│       ├── css/
│       │   └── admin.css                   # 관리자 스타일
│       └── js/
│           ├── api.js                      # API 유틸리티
│           ├── auth.js                     # 인증 처리
│           ├── dashboard.js                # 대시보드 로직
│           ├── orders.js                   # 주문 관리 로직
│           └── products.js                 # 상품 관리 로직
└── src/
    ├── middlewares/
    │   └── auth.js                         # 백엔드 인증 미들웨어
    └── repositories/
        └── member.repository.js            # 회원 레포지토리

```

---

## 관련 문서

- [04_API_DEVELOPMENT.md](../04_API_DEVELOPMENT.md)
- [05_TESTING_DEPLOYMENT.md](../05_TESTING_DEPLOYMENT.md)
- [db_03_RELATIONSHIPS.md](../db_03_RELATIONSHIPS.md)
- [Admin 개발 가이드](./00_INDEX.md)

---

**작성자**: Claude Code
**최종 수정**: 2025-10-09
