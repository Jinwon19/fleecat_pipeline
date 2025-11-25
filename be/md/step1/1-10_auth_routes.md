# Step 1-10: Auth Routes 생성

> **작업일**: 2025년 10월 2일
> **파일**: `src/routes/auth.routes.js`
> **목적**: 인증 관련 API 엔드포인트 정의 및 미들웨어 연결

---

## 📋 목차

1. [개요](#1-개요)
2. [Routes란?](#2-routes란)
3. [구현 내용](#3-구현-내용)
4. [엔드포인트 상세](#4-엔드포인트-상세)
5. [미들웨어 체인](#5-미들웨어-체인)
6. [Public vs Private Routes](#6-public-vs-private-routes)
7. [데이터 흐름](#7-데이터-흐름)
8. [테스트 예제](#8-테스트-예제)
9. [다음 단계](#9-다음-단계)

---

## 1. 개요

### 목적

**Auth Routes**는 인증 관련 API 엔드포인트를 정의하고, 미들웨어와 컨트롤러를 연결합니다.

### 주요 역할

1. **API 엔드포인트 정의**: URL 패턴 및 HTTP 메서드 매핑
2. **미들웨어 연결**: 입력 검증, 인증 미들웨어 체인 구성
3. **컨트롤러 연결**: 각 엔드포인트에 컨트롤러 함수 연결

### 정의하는 API (3개)

| HTTP Method | Endpoint | 설명 | 접근 권한 |
|-------------|----------|------|----------|
| POST | `/api/v1/auth/register` | 회원가입 | Public |
| POST | `/api/v1/auth/login` | 로그인 | Public |
| PUT | `/api/v1/auth/change-password` | 비밀번호 변경 | Private |

---

## 2. Routes란?

### Layered Architecture에서의 위치

```
Client → [Routes] → Middleware → Controller → Service → Repository → Database
```

### Routes의 역할

#### ✅ Routes가 하는 일

1. **URL 패턴 정의**
   - `/register`, `/login`, `/change-password` 등
2. **HTTP 메서드 지정**
   - GET, POST, PUT, DELETE
3. **미들웨어 체인 구성**
   - 입력 검증, 인증, 권한 체크 등
4. **컨트롤러 함수 연결**
   - 최종 비즈니스 로직 처리

#### ❌ Routes가 하지 않는 일

1. **비즈니스 로직 처리** → Controller/Service의 역할
2. **입력 검증** → Validation 미들웨어의 역할
3. **JWT 토큰 검증** → authenticate 미들웨어의 역할
4. **데이터베이스 접근** → Repository의 역할

### Express Router 패턴

```javascript
const express = require('express');
const router = express.Router();

// 미들웨어 체인: validation → controller
router.post('/register', validateRegister, authController.register);

// 미들웨어 체인: authenticate → validation → controller
router.put('/change-password', authenticate, validateChangePassword, authController.changePassword);

module.exports = router;
```

**핵심**: Routes는 "누가(어떤 미들웨어가), 무엇을(어떤 컨트롤러를)" 연결하는 역할만

---

## 3. 구현 내용

### 파일 구조

```javascript
// src/routes/auth.routes.js

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { validateRegister, validateLogin, validateChangePassword } = require('../middlewares/validation');
const { authenticate } = require('../middlewares/auth');

// POST /register
router.post('/register', validateRegister, authController.register);

// POST /login
router.post('/login', validateLogin, authController.login);

// PUT /change-password
router.put('/change-password', authenticate, validateChangePassword, authController.changePassword);

module.exports = router;
```

### 의존성

#### 외부 모듈
- `express` - Express.js 프레임워크

#### 내부 모듈
- `authController` - Auth Controller 함수들
- `validation` 미들웨어 - 입력 검증
- `authenticate` 미들웨어 - JWT 토큰 검증

---

## 4. 엔드포인트 상세

### (1) POST /register - 회원가입

#### 전체 경로

```
POST /api/v1/auth/register
```

#### 미들웨어 체인

```javascript
router.post('/register', validateRegister, authController.register);
```

**실행 순서**:
1. `validateRegister` - 입력 검증 (email, password, nickname 등)
2. `authController.register` - 회원가입 처리

#### 요청 예제

```http
POST /api/v1/auth/register HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure123!",
  "nickname": "홍길동",
  "phone": "010-1234-5678"
}
```

#### 응답 예제 (201 Created)

```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "member": {
      "member_id": 123,
      "member_email": "user@example.com",
      "member_nickname": "홍길동",
      "member_status": "active"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### 접근 권한

- **Public**: 누구나 접근 가능 (로그인 불필요)
- **authenticate 미들웨어 불필요**

---

### (2) POST /login - 로그인

#### 전체 경로

```
POST /api/v1/auth/login
```

#### 미들웨어 체인

```javascript
router.post('/login', validateLogin, authController.login);
```

**실행 순서**:
1. `validateLogin` - 입력 검증 (email, password)
2. `authController.login` - 로그인 처리

#### 요청 예제

```http
POST /api/v1/auth/login HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure123!"
}
```

#### 응답 예제 (200 OK)

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "member": {
      "member_id": 123,
      "member_email": "user@example.com",
      "role": "seller",
      "roles": ["buyer", "seller"]
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### 접근 권한

- **Public**: 누구나 접근 가능 (로그인 불필요)
- **authenticate 미들웨어 불필요**

---

### (3) PUT /change-password - 비밀번호 변경

#### 전체 경로

```
PUT /api/v1/auth/change-password
```

#### 미들웨어 체인

```javascript
router.put('/change-password', authenticate, validateChangePassword, authController.changePassword);
```

**실행 순서**:
1. `authenticate` - JWT 토큰 검증, `req.user` 설정
2. `validateChangePassword` - 입력 검증 (current_password, new_password, confirm_password)
3. `authController.changePassword` - 비밀번호 변경 처리

#### 요청 예제

```http
PUT /api/v1/auth/change-password HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "current_password": "oldpass123!",
  "new_password": "newpass456!",
  "confirm_password": "newpass456!"
}
```

#### 응답 예제 (200 OK)

```json
{
  "success": true,
  "message": "Password changed successfully",
  "data": {
    "message": "Password changed successfully"
  }
}
```

#### 접근 권한

- **Private**: 로그인 필요 (JWT 토큰 필수)
- **authenticate 미들웨어 필요**

---

## 5. 미들웨어 체인

### 미들웨어 실행 순서

Express.js에서 미들웨어는 **왼쪽에서 오른쪽 순서**로 실행됩니다.

#### (1) 회원가입: POST /register

```javascript
router.post('/register', validateRegister, authController.register);
```

```
Client Request
  ↓
validateRegister (입력 검증)
  ↓ (검증 성공)
authController.register (회원가입 처리)
  ↓
Response
```

**검증 실패 시**:
```
Client Request
  ↓
validateRegister (입력 검증)
  ↓ (검증 실패)
errorHandler 미들웨어 (400 Bad Request 응답)
  ↓
Response (에러)
```

#### (2) 로그인: POST /login

```javascript
router.post('/login', validateLogin, authController.login);
```

```
Client Request
  ↓
validateLogin (입력 검증)
  ↓ (검증 성공)
authController.login (로그인 처리)
  ↓
Response
```

#### (3) 비밀번호 변경: PUT /change-password

```javascript
router.put('/change-password', authenticate, validateChangePassword, authController.changePassword);
```

```
Client Request (with JWT Token)
  ↓
authenticate (JWT 토큰 검증)
  ↓ (토큰 유효)
  ↓ req.user 설정
validateChangePassword (입력 검증)
  ↓ (검증 성공)
authController.changePassword (비밀번호 변경 처리)
  ↓
Response
```

**토큰 없거나 유효하지 않은 경우**:
```
Client Request
  ↓
authenticate (JWT 토큰 검증)
  ↓ (토큰 없음 또는 유효하지 않음)
errorHandler 미들웨어 (401 Unauthorized 응답)
  ↓
Response (에러)
```

---

## 6. Public vs Private Routes

### Public Routes (인증 불필요)

```javascript
// authenticate 미들웨어 없음
router.post('/register', validateRegister, authController.register);
router.post('/login', validateLogin, authController.login);
```

**특징**:
- JWT 토큰 불필요
- 누구나 접근 가능
- 회원가입, 로그인 등

### Private Routes (인증 필요)

```javascript
// authenticate 미들웨어 있음
router.put('/change-password', authenticate, validateChangePassword, authController.changePassword);
```

**특징**:
- JWT 토큰 필수 (`Authorization: Bearer {token}`)
- 로그인한 사용자만 접근
- `req.user`에 사용자 정보 설정됨
- 비밀번호 변경, 회원 정보 수정 등

### 미들웨어 위치의 중요성

```javascript
// ✅ 올바른 순서
router.put('/change-password', authenticate, validateChangePassword, authController.changePassword);
// 1. 먼저 JWT 검증 → req.user 설정
// 2. 입력 검증
// 3. 컨트롤러 실행

// ❌ 잘못된 순서
router.put('/change-password', validateChangePassword, authenticate, authController.changePassword);
// 입력 검증이 먼저 실행되어 불필요한 처리
// JWT 검증 전에 이미 입력 검증 완료 (비효율)
```

**Best Practice**: 인증 미들웨어를 가장 먼저 실행하여 인증되지 않은 요청을 빠르게 차단

---

## 7. 데이터 흐름

### (1) POST /register 흐름

```
Client
  ↓ POST /api/v1/auth/register
  ↓ { email, password, nickname, phone }
Express App
  ↓ app.use('/api/v1/auth', authRoutes)
Auth Routes
  ↓ router.post('/register', ...)
  ↓ validateRegister 미들웨어
Validation Middleware
  ↓ req.body 검증 (email, password, nickname)
  ↓ 검증 성공 → next()
Auth Controller
  ↓ authController.register(req, res, next)
  ↓ authService.register(...) 호출
Auth Service
  ↓ 이메일 중복 확인
  ↓ 닉네임 중복 확인
  ↓ 비밀번호 해싱
  ↓ 회원 생성
  ↓ 권한 부여
  ↓ JWT 토큰 발급
Auth Controller
  ↓ successResponse(res, result, '...', 201)
Client
  ← 201 Created
  ← { success: true, data: { member, token } }
```

### (2) POST /login 흐름

```
Client
  ↓ POST /api/v1/auth/login
  ↓ { email, password }
Express App
  ↓ app.use('/api/v1/auth', authRoutes)
Auth Routes
  ↓ router.post('/login', ...)
  ↓ validateLogin 미들웨어
Validation Middleware
  ↓ req.body 검증 (email, password)
  ↓ 검증 성공 → next()
Auth Controller
  ↓ authController.login(req, res, next)
  ↓ authService.login(email, password) 호출
Auth Service
  ↓ 이메일로 회원 조회
  ↓ 비밀번호 검증
  ↓ 권한 조회
  ↓ JWT 토큰 발급
Auth Controller
  ↓ successResponse(res, result, '...', 200)
Client
  ← 200 OK
  ← { success: true, data: { member, token } }
```

### (3) PUT /change-password 흐름

```
Client
  ↓ PUT /api/v1/auth/change-password
  ↓ Authorization: Bearer {token}
  ↓ { current_password, new_password, confirm_password }
Express App
  ↓ app.use('/api/v1/auth', authRoutes)
Auth Routes
  ↓ router.put('/change-password', ...)
  ↓ authenticate 미들웨어
Auth Middleware
  ↓ Authorization 헤더에서 토큰 추출
  ↓ JWT 토큰 검증
  ↓ req.user = { member_id, email } 설정
  ↓ next()
Validation Middleware
  ↓ validateChangePassword
  ↓ req.body 검증 (current_password, new_password, confirm_password)
  ↓ 검증 성공 → next()
Auth Controller
  ↓ authController.changePassword(req, res, next)
  ↓ req.user.member_id 추출
  ↓ authService.changePassword(...) 호출
Auth Service
  ↓ 회원 조회
  ↓ 현재 비밀번호 검증
  ↓ 새 비밀번호 != 현재 비밀번호 확인
  ↓ 새 비밀번호 해싱
  ↓ 비밀번호 업데이트
Auth Controller
  ↓ successResponse(res, result, '...', 200)
Client
  ← 200 OK
  ← { success: true, data: { message: '...' } }
```

---

## 8. 테스트 예제

### (1) 통합 테스트 (Supertest)

```javascript
const request = require('supertest');
const app = require('../src/app');

describe('Auth Routes', () => {
  describe('POST /api/v1/auth/register', () => {
    it('회원가입 성공', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'password123!',
          nickname: '신규회원',
          phone: '010-1234-5678'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('member');
      expect(response.body.data).toHaveProperty('token');
    });

    it('이메일 중복 시 400', async () => {
      // 첫 번째 회원가입
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'password123!',
          nickname: '중복테스트'
        });

      // 두 번째 회원가입 (이메일 중복)
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'password456!',
          nickname: '다른닉네임'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Email already exists');
    });

    it('입력 검증 실패 시 400', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',  // 잘못된 이메일
          password: '123',         // 너무 짧은 비밀번호
          nickname: 'ab'           // 너무 짧은 닉네임
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeAll(async () => {
      // 테스트용 회원 생성
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'logintest@example.com',
          password: 'password123!',
          nickname: '로그인테스트'
        });
    });

    it('로그인 성공', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'logintest@example.com',
          password: 'password123!'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('member');
      expect(response.body.data).toHaveProperty('token');
    });

    it('잘못된 비밀번호 시 401', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'logintest@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('존재하지 않는 이메일 시 401', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'notexist@example.com',
          password: 'password123!'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });
  });

  describe('PUT /api/v1/auth/change-password', () => {
    let token;

    beforeAll(async () => {
      // 테스트용 회원 생성 및 로그인
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'changepass@example.com',
          password: 'oldpassword123!',
          nickname: '비번변경테스트'
        });

      token = registerResponse.body.data.token;
    });

    it('비밀번호 변경 성공', async () => {
      const response = await request(app)
        .put('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          current_password: 'oldpassword123!',
          new_password: 'newpassword456!',
          confirm_password: 'newpassword456!'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('JWT 토큰 없이 요청 시 401', async () => {
      const response = await request(app)
        .put('/api/v1/auth/change-password')
        .send({
          current_password: 'oldpassword123!',
          new_password: 'newpassword456!',
          confirm_password: 'newpassword456!'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('현재 비밀번호 틀림 시 401', async () => {
      const response = await request(app)
        .put('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          current_password: 'wrongpassword',
          new_password: 'newpassword456!',
          confirm_password: 'newpassword456!'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Current password is incorrect');
    });
  });
});
```

### (2) 엔드포인트 수동 테스트 (curl)

#### 회원가입

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123!",
    "nickname": "테스터",
    "phone": "010-1234-5678"
  }'
```

#### 로그인

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123!"
  }'
```

#### 비밀번호 변경

```bash
curl -X PUT http://localhost:3000/api/v1/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_TOKEN_HERE}" \
  -d '{
    "current_password": "password123!",
    "new_password": "newpassword456!",
    "confirm_password": "newpassword456!"
  }'
```

---

## 9. 다음 단계

### Step 1-11: Member Routes

**파일**: `src/routes/member.routes.js`

**내용**:
- GET `/api/v1/members/me` - 내 정보 조회 (Private)
- PUT `/api/v1/members/me` - 내 정보 수정 (Private)

**미들웨어 연결**:
```javascript
router.get('/me', authenticate, memberController.getMe);
router.put('/me', authenticate, validateUpdateMember, memberController.updateMe);
```

**특징**:
- 모든 엔드포인트가 Private (authenticate 미들웨어 필수)
- 본인의 정보만 조회/수정 가능

### Step 1-12: 라우트 통합

**파일**: `src/routes/index.js` 또는 `src/app.js`

**내용**:
```javascript
const authRoutes = require('./routes/auth.routes');
const memberRoutes = require('./routes/member.routes');

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/members', memberRoutes);
```

---

## 📊 진행 현황

```
✅ Step 1-1: JWT 유틸리티
✅ Step 1-2: 인증 미들웨어
✅ Step 1-3: 입력 검증 미들웨어
✅ Step 1-4: Member Repository
✅ Step 1-5: MemberPermission Repository
✅ Step 1-6: Auth Service
✅ Step 1-7: Member Service
✅ Step 1-8: Auth Controller
✅ Step 1-9: Member Controller
✅ Step 1-10: Auth Routes ← 현재
⬜ Step 1-11: Member Routes
⬜ Step 1-12: 라우트 통합
⬜ Step 1-13: 테스트 작성
```

---

**작성자**: Backend Team
**최종 업데이트**: 2025년 10월 2일
