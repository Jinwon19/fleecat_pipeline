# 소셜 로그인 API

> **작성일**: 2025-01-13
> **구현 파일**: `src/routes/auth.routes.js`, `src/controllers/auth.controller.js`, `src/services/auth.service.js`
> **지원 Provider**: Google, Kakao (향후 확장 가능)

---

## 📋 개요

소셜 로그인은 **Supabase Auth**를 사용하여 구현되어 있으며, 다음과 같은 흐름으로 동작합니다:

```
1. 프론트엔드 → 백엔드: OAuth URL 요청
2. 백엔드 → 프론트엔드: Google/Kakao OAuth URL 반환
3. 프론트엔드 → Google/Kakao: 사용자 로그인
4. Google/Kakao → 프론트엔드: Callback (access_token 포함)
5. 프론트엔드 → 백엔드: access_token 전송
6. 백엔드 → 프론트엔드: JWT 토큰 발급
```

---

## 🔐 API 목록

| 메서드 | 경로 | 설명 | 접근 권한 |
|--------|------|------|----------|
| GET | `/api/v1/auth/social/:provider` | OAuth URL 생성 | Public |
| POST | `/api/v1/auth/social/:provider/callback` | 콜백 처리 (PKCE Flow, 미사용) | Public |
| POST | `/api/v1/auth/social/:provider/token` | 토큰 처리 (Implicit Flow, 사용 중) | Public |

**Provider 파라미터**:
- `google` - Google 소셜 로그인
- `kakao` - Kakao 소셜 로그인

---

## 1. OAuth URL 생성

### GET /api/v1/auth/social/:provider

프론트엔드가 사용자를 리다이렉트할 OAuth URL을 생성합니다.

### 요청 명세

**경로 파라미터**:

| 파라미터 | 타입 | 필수 | 설명 | 가능한 값 |
|---------|------|------|------|----------|
| `provider` | String | ✅ | 소셜 로그인 제공자 | `google`, `kakao` |

**요청 예제**:
```http
GET /api/v1/auth/social/google HTTP/1.1
Host: localhost:3000
```

### 응답 명세

**성공 응답 (200 OK)**:

```json
{
  "success": true,
  "message": "Social login URL generated successfully",
  "data": {
    "url": "https://ymqnpsiephgvdzzizsns.supabase.co/auth/v1/authorize?provider=google&redirect_to=https://fleecat-production.up.railway.app/auth/callback",
    "provider": "google"
  }
}
```

**에러 응답 (400 Bad Request)**:

```json
{
  "success": false,
  "message": "Unsupported provider: naver. Supported: google, kakao"
}
```

### cURL 예제

```bash
# Google OAuth URL 생성
curl -X GET http://localhost:3000/api/v1/auth/social/google

# Kakao OAuth URL 생성
curl -X GET http://localhost:3000/api/v1/auth/social/kakao
```

### JavaScript 예제

```javascript
// Google 로그인 버튼 클릭 시
async function loginWithGoogle() {
  const response = await fetch('/api/v1/auth/social/google');
  const data = await response.json();

  if (data.success) {
    // Google 로그인 페이지로 리다이렉트
    window.location.href = data.data.url;
  } else {
    alert('OAuth URL 생성 실패: ' + data.message);
  }
}
```

---

## 2. 콜백 처리 (PKCE Flow)

### POST /api/v1/auth/social/:provider/callback

**현재 미사용 중** - PKCE Flow는 구현되어 있지만, Implicit Flow를 사용하고 있습니다.

OAuth 콜백에서 받은 `code`로 Supabase 세션을 생성하고 JWT 토큰을 발급합니다.

### 요청 명세

**경로 파라미터**:

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `provider` | String | ✅ | 소셜 로그인 제공자 |

**요청 본문**:

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `code` | String | ✅ | OAuth authorization code |

**요청 예제**:
```json
{
  "code": "4/0AY0e-g7..."
}
```

### 응답 명세

**성공 응답 (200 OK)**:

```json
{
  "success": true,
  "message": "Social login successful",
  "data": {
    "member": {
      "member_id": 456,
      "member_email": "user@gmail.com",
      "member_name": "홍길동",
      "member_nickname": "google_user_1234",
      "member_status": "active",
      "member_account_role": "buyer",
      "member_auth_provider": "google",
      "role": "buyer",
      "roles": ["buyer"]
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "supabaseSession": {
      "access_token": "...",
      "refresh_token": "..."
    }
  }
}
```

---

## 3. 토큰 처리 (Implicit Flow) ⭐ **현재 사용 중**

### POST /api/v1/auth/social/:provider/token

Supabase에서 받은 `access_token`으로 사용자 정보를 조회하고 JWT 토큰을 발급합니다.

### 요청 명세

**경로 파라미터**:

| 파라미터 | 타입 | 필수 | 설명 | 가능한 값 |
|---------|------|------|------|----------|
| `provider` | String | ✅ | 소셜 로그인 제공자 | `google`, `kakao` |

**요청 본문**:

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `access_token` | String | ✅ | Supabase access token |
| `refresh_token` | String | ❌ | Supabase refresh token (선택) |

**요청 예제**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "..."
}
```

### 응답 명세

**성공 응답 (200 OK)**:

```json
{
  "success": true,
  "message": "Social login successful",
  "data": {
    "member": {
      "member_id": 456,
      "member_email": "user@gmail.com",
      "member_name": "홍길동",
      "member_nickname": "google_user_1234",
      "member_phone": null,
      "member_status": "active",
      "member_account_role": "buyer",
      "member_auth_id": "12345678-1234-1234-1234-123456789abc",
      "member_auth_provider": "google",
      "company_id": null,
      "member_created_at": "2025-01-13T12:00:00.000Z",
      "member_updated_at": "2025-01-13T15:30:00.000Z",
      "role": "buyer",
      "roles": ["buyer"]
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**에러 응답 (401 Unauthorized)**:

```json
{
  "success": false,
  "message": "Failed to verify google token: invalid signature"
}
```

### cURL 예제

```bash
curl -X POST http://localhost:3000/api/v1/auth/social/google/token \
  -H "Content-Type: application/json" \
  -d '{
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "..."
  }'
```

### JavaScript 예제

```javascript
// OAuth 콜백 페이지 (callback.html)에서 실행
async function handleOAuthCallback() {
  // URL 해시에서 access_token 추출
  const hash = window.location.hash.substring(1);
  const hashParams = new URLSearchParams(hash);
  const accessToken = hashParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token');

  if (!accessToken) {
    throw new Error('Access token이 없습니다.');
  }

  // Provider 판별 (URL 기반 또는 state 파라미터)
  const urlParams = new URLSearchParams(window.location.search);
  const provider = urlParams.get('provider') || 'google';

  // 백엔드 API 호출 (access_token을 JWT로 교환)
  const response = await fetch(`/api/v1/auth/social/${provider}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      access_token: accessToken,
      refresh_token: refreshToken
    })
  });

  const data = await response.json();

  if (data.success) {
    console.log('✅ Login successful:', data.data.member);

    // 로컬스토리지에 토큰 저장
    localStorage.setItem('fleecat_token', data.data.token);
    localStorage.setItem('fleecat_user', JSON.stringify(data.data.member));

    // 메인 페이지로 리디렉션
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 1000);
  } else {
    throw new Error(data.message || '로그인 처리 실패');
  }
}
```

---

## 🔄 전체 소셜 로그인 플로우

### 1단계: 프론트엔드 - OAuth URL 요청

```javascript
// 사용자가 "Google로 로그인" 버튼 클릭
const response = await fetch('/api/v1/auth/social/google');
const data = await response.json();

// 응답: { url: "https://accounts.google.com/...", provider: "google" }
```

### 2단계: 백엔드 - Supabase OAuth URL 생성

```javascript
// Auth Service
const { data, error } = await supabaseClient.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${process.env.FRONTEND_URL}/auth/callback`
  }
});

return { url: data.url, provider: 'google' };
```

### 3단계: 프론트엔드 - Google 로그인 페이지로 리다이렉트

```javascript
window.location.href = data.data.url;
// → https://accounts.google.com/o/oauth2/v2/auth?...
```

### 4단계: 사용자 - Google에서 로그인

사용자가 Google 계정으로 로그인하고 권한 승인

### 5단계: Google - Callback URL로 리다이렉트

```
https://fleecat-production.up.railway.app/auth/callback#access_token=eyJ...&refresh_token=...
```

### 6단계: 프론트엔드 - access_token 추출

```javascript
// callback.html
const hash = window.location.hash.substring(1);
const hashParams = new URLSearchParams(hash);
const accessToken = hashParams.get('access_token');
const refreshToken = hashParams.get('refresh_token');
```

### 7단계: 프론트엔드 - 백엔드로 access_token 전송

```javascript
const response = await fetch('/api/v1/auth/social/google/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ access_token: accessToken, refresh_token: refreshToken })
});
```

### 8단계: 백엔드 - JWT 검증 및 Member 동기화

```javascript
// Auth Service

// 1. JWT 서명 검증
const decoded = jwt.verify(accessToken, process.env.SUPABASE_JWT_SECRET);

// 2. 사용자 정보 추출
const supabaseUser = {
  id: decoded.sub,
  email: decoded.email,
  user_metadata: decoded.user_metadata || {}
};

// 3. Member 테이블에서 조회 또는 생성
let member = await memberRepository.findByAuthId(supabaseUser.id);

if (!member) {
  // 신규 회원 생성
  member = await memberRepository.create({
    member_email: supabaseUser.email,
    member_password: null,  // 소셜 로그인은 비밀번호 없음
    member_name: supabaseUser.user_metadata.full_name,
    member_nickname: `google_${supabaseUser.email.split('@')[0]}_${Date.now()}`,
    member_status: 'active',
    member_auth_id: supabaseUser.id,
    member_auth_provider: 'google'
  });

  // 기본 권한 부여
  await memberPermissionRepository.create({
    member_id: member.member_id,
    permission_role: 'buyer'
  });
}

// 4. JWT 토큰 생성 (자체 토큰)
const token = generateToken({
  member_id: Number(member.member_id),
  email: member.member_email,
  role: member.member_account_role || 'buyer'
});

return { member, token };
```

### 9단계: 프론트엔드 - JWT 토큰 저장 및 로그인 완료

```javascript
const data = await response.json();

if (data.success) {
  localStorage.setItem('fleecat_token', data.data.token);
  localStorage.setItem('fleecat_user', JSON.stringify(data.data.member));

  window.location.href = '/dashboard';
}
```

---

## 🔐 보안 고려사항

### 1. JWT 서명 검증 (중요!)

```javascript
const decoded = jwt.verify(accessToken, process.env.SUPABASE_JWT_SECRET, {
  algorithms: ['HS256']
});
```

**검증 항목**:
- 서명 유효성 (SUPABASE_JWT_SECRET)
- 만료 시간 (exp)
- 필수 필드 (sub, email)

### 2. Member 테이블 동기화

**신규 회원**:
- `member_auth_id` - Supabase Auth user ID 저장
- `member_auth_provider` - 'google' 또는 'kakao'
- `member_password` - NULL (소셜 로그인은 비밀번호 없음)
- `member_nickname` - 자동 생성 (중복 방지)

**기존 회원**:
- `member_auth_id`로 조회
- 로그인 시간 업데이트

### 3. 계정 연결

이메일이 같은 경우 기존 계정에 소셜 계정을 연결:

```javascript
// 1. member_auth_id로 검색
let member = await memberRepository.findByAuthId(authId);

if (!member) {
  // 2. email로 검색 (기존 회원)
  member = await memberRepository.findByEmail(email);

  if (member) {
    // 기존 회원에 소셜 계정 연결
    await memberRepository.update(member.member_id, {
      member_auth_id: authId,
      member_auth_provider: provider
    });
  }
}
```

### 4. CSRF 방어

Supabase OAuth는 자동으로 state 파라미터를 사용하여 CSRF를 방어합니다.

---

## 📊 관련 테이블

### Member 테이블 (소셜 로그인 관련 필드)

```sql
CREATE TABLE member (
  member_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  member_email VARCHAR(100) UNIQUE NOT NULL,
  member_password VARCHAR(255),  -- 소셜 로그인 시 NULL
  member_name VARCHAR(30) NOT NULL,
  member_nickname VARCHAR(30) UNIQUE NOT NULL,
  member_status VARCHAR(20) DEFAULT 'active',
  member_account_role VARCHAR(20) DEFAULT 'buyer',
  member_auth_id VARCHAR(255) UNIQUE,  -- Supabase Auth user ID
  member_auth_provider VARCHAR(20),  -- 'google', 'kakao'
  INDEX idx_auth_id (member_auth_id),
  INDEX idx_auth_provider (member_auth_provider)
);
```

---

## 🧪 테스트 방법

### 로컬 테스트

1. `.env` 파일 설정:
```bash
FRONTEND_URL=http://localhost:3000
SUPABASE_URL=https://ymqnpsiephgvdzzizsns.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_JWT_SECRET=/EXGP3Vcd0N...
```

2. Supabase Dashboard 설정:
   - Authentication → Providers → Google 활성화
   - Redirect URLs에 `http://localhost:3000/auth/callback` 추가

3. Google Cloud Console 설정:
   - Authorized redirect URIs에 Supabase Callback URL 추가:
     ```
     https://ymqnpsiephgvdzzizsns.supabase.co/auth/v1/callback
     ```

4. 테스트 페이지 접속:
```
http://localhost:3000/test-google-login.html
```

### Railway (프로덕션) 테스트

1. Railway 환경 변수 설정:
```bash
FRONTEND_URL=https://fleecat-production.up.railway.app
SUPABASE_JWT_SECRET=[Supabase Dashboard에서 복사]
```

2. Supabase Redirect URLs 추가:
```
https://fleecat-production.up.railway.app/auth/callback
```

3. 테스트 페이지 접속:
```
https://fleecat-production.up.railway.app/test-google-login.html
```

---

## ⚠️ 자주 발생하는 에러

### 1. JWT 검증 실패

**에러 메시지**:
```
Failed to verify google token: invalid signature
```

**원인**:
- `SUPABASE_JWT_SECRET` 환경 변수가 잘못됨
- Railway에 환경 변수가 설정되지 않음

**해결 방법**:
1. Supabase Dashboard → Settings → API → JWT Secret 복사
2. Railway Variables에 `SUPABASE_JWT_SECRET` 추가
3. 재배포

### 2. Redirect URI Mismatch

**에러 메시지**:
```
redirect_uri_mismatch
```

**원인**:
- Google Cloud Console의 Authorized redirect URIs와 실제 redirect_uri가 불일치

**해결 방법**:
1. Google Cloud Console → Credentials → OAuth 2.0 Client ID 편집
2. Authorized redirect URIs에 추가:
   ```
   https://ymqnpsiephgvdzzizsns.supabase.co/auth/v1/callback
   ```
3. Save 후 5-10분 대기

### 3. Database Connection Error

**에러 메시지**:
```
Can't reach database server at aws-1-ap-northeast-2.pooler.supabase.com:5432
```

**원인**:
- Railway의 `DATABASE_URL` 환경 변수가 잘못 설정됨

**해결 방법**:
Railway Variables 수정:
```bash
DATABASE_URL=postgresql://...@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**중요**: Port 6543 (Pooler) 사용

---

## 📚 관련 문서

- [회원가입 API](./auth_register.md)
- [로그인 API](./auth_login.md)
- [Auth Service 구현](../1-6_auth_service.md)
- [Railway 배포 가이드](../../railway/info.md)
- [Supabase Auth 공식 문서](https://supabase.com/docs/guides/auth)

---

**작성자**: Backend Team
**최종 업데이트**: 2025-01-13
