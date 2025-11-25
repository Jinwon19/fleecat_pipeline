# Step 1-1: JWT 유틸리티 생성

> **Phase 1: 기초 인프라 구축**
> **작성일**: 2025년 10월 1일
> **상태**: ✅ 완료

---

## 📋 작업 개요

### 목적
사용자 인증을 위한 JWT(JSON Web Token) 토큰 생성 및 검증 유틸리티를 구현합니다.

### 작업 내용
- `src/utils/jwt.js` 파일 생성
- `generateToken()` 함수 구현 - JWT 토큰 발급
- `verifyToken()` 함수 구현 - JWT 토큰 검증

---

## 🎯 JWT를 사용하는 이유

### 1. Stateless (무상태) 인증
- 서버에 세션을 저장하지 않아도 됨
- 토큰 자체에 사용자 정보가 포함되어 있음
- 서버 확장성이 좋음 (여러 서버로 분산 가능)

### 2. RESTful API의 표준
- 현대 웹 개발에서 가장 많이 사용되는 인증 방식
- React, Vue 같은 SPA에 최적
- 모바일 앱에서도 사용 가능

### 3. 멀티테넌트 구조에 적합
- 토큰에 `tenant_id`, `tenant_member_id` 등을 포함 가능
- 한 번의 토큰 검증으로 회원 정보 + 판매사 정보 확인

---

## 📁 파일 위치

```
src/
└── utils/
    └── jwt.js  ← 생성한 파일
```

---

## 💻 구현 코드

### 전체 코드

```javascript
const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/constants');

/**
 * JWT 토큰 생성
 */
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN || '7d'
  });
}

/**
 * JWT 토큰 검증
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw new Error('Token verification failed');
  }
}

module.exports = {
  generateToken,
  verifyToken
};
```

---

## 🔧 함수 설명

### 1. `generateToken(payload)`

**역할**: 사용자 정보를 받아 JWT 토큰 생성

**파라미터**:
```javascript
{
  member_id: number,          // 회원 ID (필수)
  email: string,              // 이메일 (필수)
  role: string,               // 역할: buyer/seller/admin (필수)
  tenant_id?: number,         // 판매사 ID (선택)
  tenant_member_id?: number   // 판매사 구성원 ID (선택)
}
```

**반환값**: JWT 토큰 문자열

**사용 예시**:
```javascript
const token = generateToken({
  member_id: 123,
  email: 'user@example.com',
  role: 'buyer'
});

// 결과: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**언제 사용?**
- 로그인 API에서 인증 성공 시
- 회원가입 후 자동 로그인 시

---

### 2. `verifyToken(token)`

**역할**: 클라이언트가 보낸 토큰이 유효한지 검증

**파라미터**: JWT 토큰 문자열

**반환값**: 디코딩된 사용자 정보 객체

**에러 처리**:
- `Token has expired` - 토큰 만료 (7일 지남)
- `Invalid token` - 위조된 토큰
- `Token verification failed` - 기타 검증 실패

**사용 예시**:
```javascript
try {
  const decoded = verifyToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
  console.log(decoded.member_id); // 123
  console.log(decoded.email);     // 'user@example.com'
  console.log(decoded.role);      // 'buyer'
} catch (error) {
  console.error('토큰 검증 실패:', error.message);
}
```

**언제 사용?**
- 인증 미들웨어(`authenticate`)에서
- 보호된 API 요청 시 토큰 검증

---

## ⚙️ 환경변수 설정

### 필요한 환경변수

`.env` 파일에 다음 변수를 추가해야 합니다:

```bash
JWT_SECRET=your-super-secret-key-here
JWT_EXPIRES_IN=7d
```

### JWT_SECRET 생성 방법

**터미널에서 실행**:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**생성 예시**:
```
f3d8a9e1c7b4f2a6d5e8c9b0a7f1e3d6c2b8a5f4e9d7c1b3a6f2e5d8c0b9a4f7e1d3c6b2a8f5e4d9c7b0a3f6e2d5c8b1a4f7
```

**보안 주의사항**:
- ✅ 최소 64자 이상의 랜덤 문자열 사용
- ✅ `.env` 파일은 절대 Git에 커밋하지 말 것
- ✅ 개발/운영 환경별로 다른 키 사용
- ✅ 주기적으로 키 갱신 (6개월~1년)

---

## 🔐 JWT 토큰 구조

### 토큰 예시
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZW1iZXJfaWQiOjEyMywiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwicm9sZSI6ImJ1eWVyIiwiaWF0IjoxNjk2MTQ3MjAwLCJleHAiOjE2OTY3NTIwMDB9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

### 세 부분으로 구성
```
[Header].[Payload].[Signature]
```

1. **Header**: 알고리즘 정보 (HS256)
2. **Payload**: 사용자 정보 (member_id, email, role 등)
3. **Signature**: 위변조 방지 서명 (JWT_SECRET으로 생성)

### 디코딩 결과
```javascript
{
  member_id: 123,
  email: "user@example.com",
  role: "buyer",
  iat: 1696147200,  // 발급 시간 (issued at)
  exp: 1696752000   // 만료 시간 (expiration)
}
```

---

## 🧪 테스트 방법

### 방법 1: Node.js REPL

터미널에서:
```bash
node
```

실행:
```javascript
require('dotenv').config();
const { generateToken, verifyToken } = require('./src/utils/jwt');

// 1. 토큰 생성
const token = generateToken({
  member_id: 123,
  email: 'test@example.com',
  role: 'buyer'
});
console.log('생성된 토큰:', token);

// 2. 토큰 검증
const decoded = verifyToken(token);
console.log('디코딩 결과:', decoded);
```

### 방법 2: 온라인 디버거

https://jwt.io 에서:
1. 생성된 토큰을 붙여넣기
2. `VERIFY SIGNATURE`에 `JWT_SECRET` 입력
3. Payload 내용 확인

---

## 📊 데이터 흐름

### 로그인 시 (토큰 발급)
```
1. 사용자가 이메일/비밀번호 입력
   ↓
2. 서버가 DB에서 회원 정보 조회
   ↓
3. 비밀번호 검증 (bcrypt)
   ↓
4. generateToken() 호출
   ↓
5. JWT 토큰 생성하여 클라이언트에게 반환
   ↓
6. 클라이언트가 토큰을 localStorage/쿠키에 저장
```

### API 요청 시 (토큰 검증)
```
1. 클라이언트가 요청 헤더에 토큰 포함
   Authorization: Bearer {token}
   ↓
2. 인증 미들웨어가 헤더에서 토큰 추출
   ↓
3. verifyToken() 호출
   ↓
4. 검증 성공 → req.user에 사용자 정보 저장
   ↓
5. 다음 미들웨어/컨트롤러로 진행
```

---

## ⚠️ 주의사항

### 1. JWT_SECRET 관리
- ❌ 하드코딩 금지: `const JWT_SECRET = 'my-secret'`
- ✅ 환경변수 사용: `process.env.JWT_SECRET`
- ❌ Git에 커밋 금지
- ✅ `.gitignore`에 `.env` 추가 확인

### 2. 토큰 만료 시간
- 짧게: 보안 ↑, 사용자 불편 ↑
- 길게: 사용자 편의 ↑, 보안 ↓
- 권장: 7일 (모바일), 1일 (웹)

### 3. 토큰 저장 위치
- **웹**: httpOnly 쿠키 (XSS 방지)
- **모바일**: Secure Storage
- ❌ localStorage는 XSS 공격에 취약

### 4. 에러 처리
- 만료된 토큰과 잘못된 토큰을 구분
- 명확한 에러 메시지 반환
- 프론트엔드에서 재로그인 처리

---

## 🔄 다음 단계

### Step 1-2: 인증 미들웨어
이제 생성한 `jwt.js`를 사용할 **인증 미들웨어**를 만들 차례입니다:

- `src/middlewares/auth.js`
- `authenticate()` - JWT 검증 미들웨어
- `authorize(...roles)` - 권한 체크 미들웨어

---

## 📚 참고 자료

### 공식 문서
- [jsonwebtoken 라이브러리](https://github.com/auth0/node-jsonwebtoken)
- [JWT 공식 사이트](https://jwt.io)

### 관련 코딩 표준
- [02. 코딩 표준](../02_CODING_STANDARDS.md)
- [04. API 개발 가이드](../04_API_DEVELOPMENT.md)

---

**작성일**: 2025년 10월 1일
**작성자**: Backend Team
**상태**: ✅ 완료
