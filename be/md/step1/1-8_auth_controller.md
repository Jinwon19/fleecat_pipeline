# Step 1-8: Auth Controller 생성

> **Phase 1: 기초 인프라 구축**
> **작성일**: 2025년 10월 2일
> **상태**: ✅ 완료

---

## 📋 작업 개요

### 목적
인증 관련 HTTP 요청/응답을 처리하고 Auth Service를 호출하는 Controller 레이어를 구현합니다.

### 작업 내용
- `src/controllers/auth.controller.js` 파일 생성
- `register(req, res, next)` 함수 구현 - POST /api/v1/auth/register
- `login(req, res, next)` 함수 구현 - POST /api/v1/auth/login
- `changePassword(req, res, next)` 함수 구현 - PUT /api/v1/auth/change-password

---

## 🎯 Controller의 역할

### 아키텍처에서의 위치

```
📱 클라이언트
    ↓ HTTP 요청
🌐 Routes (라우트 정의)
    ↓
🔍 Middleware (검증, 인증)
    ↓
🎯 Controller ← 여기! (HTTP 요청/응답 처리)
    ↓
💼 Service (비즈니스 로직)
    ↓
🗄️ Repository (데이터 접근)
    ↓
💾 Database
```

### Controller가 하는 일

| 항목 | 설명 | 예시 |
|------|------|------|
| **1. 요청 데이터 추출** | `req.body`, `req.params`, `req.query` 추출 | `const { email } = req.body;` |
| **2. Service 호출** | 비즈니스 로직 실행 | `authService.register(data)` |
| **3. 응답 반환** | 성공/실패 응답 포맷팅 | `successResponse(res, result, 'Success', 201)` |
| **4. 에러 전달** | 에러를 미들웨어로 전달 | `next(error)` |

### Controller가 하지 않는 일 ❌

- ❌ 비즈니스 로직 (중복 확인, 해싱, 검증 등)
- ❌ 데이터베이스 접근
- ❌ 복잡한 데이터 처리

**이유**: 관심사 분리 (Separation of Concerns)

---

## 📁 파일 위치

```
src/
└── controllers/
    └── auth.controller.js  ← 생성한 파일
```

---

## 💻 구현 코드

### 전체 구조

```javascript
const authService = require('../services/auth.service');
const { successResponse } = require('../utils/response');

// 3개의 함수 제공:
// - register(req, res, next) - 회원가입
// - login(req, res, next) - 로그인
// - changePassword(req, res, next) - 비밀번호 변경
```

---

## 🔧 함수 설명

### 1. `register(req, res, next)` - 회원가입

**역할**: 회원가입 HTTP 요청을 처리합니다.

**HTTP 요청**:
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure123!",
  "nickname": "홍길동",
  "phone": "010-1234-5678"
}
```

**처리 과정**:
```
1. req.body에서 데이터 추출
   const { email, password, nickname, phone } = req.body;
   ↓
2. authService.register() 호출
   const result = await authService.register({ email, password, nickname, phone });
   ↓
3. 성공 응답 반환 (201 Created)
   return successResponse(res, result, 'Registration successful', 201);
   ↓
4. 에러 발생 시 next(error)로 전달
```

**구현 코드**:
```javascript
async function register(req, res, next) {
  try {
    // 1. 요청 데이터 추출
    const { email, password, nickname, phone } = req.body;

    // 2. Auth Service 호출
    const result = await authService.register({
      email,
      password,
      nickname,
      phone
    });

    // 3. 성공 응답 반환 (201 Created)
    return successResponse(res, result, 'Registration successful', 201);
  } catch (error) {
    // 4. 에러를 errorHandler 미들웨어로 전달
    next(error);
  }
}
```

**응답 (성공 - 201 Created)**:
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "member": {
      "member_id": 123,
      "member_email": "user@example.com",
      "member_nickname": "홍길동",
      "member_phone": "010-1234-5678",
      "member_status": "active",
      "role": "buyer",
      "roles": ["buyer"]
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**응답 (실패 - 400 Bad Request)**:
```json
{
  "success": false,
  "message": "Email already exists"
}
```

---

### 2. `login(req, res, next)` - 로그인

**역할**: 로그인 HTTP 요청을 처리합니다.

**HTTP 요청**:
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure123!"
}
```

**처리 과정**:
```
1. req.body에서 데이터 추출
   const { email, password } = req.body;
   ↓
2. authService.login() 호출
   const result = await authService.login(email, password);
   ↓
3. 성공 응답 반환 (200 OK)
   return successResponse(res, result, 'Login successful');
```

**구현 코드**:
```javascript
async function login(req, res, next) {
  try {
    // 1. 요청 데이터 추출
    const { email, password } = req.body;

    // 2. Auth Service 호출
    const result = await authService.login(email, password);

    // 3. 성공 응답 반환 (200 OK)
    return successResponse(res, result, 'Login successful');
  } catch (error) {
    // 4. 에러를 errorHandler 미들웨어로 전달
    next(error);
  }
}
```

**응답 (성공 - 200 OK)**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "member": {
      "member_id": 123,
      "member_email": "user@example.com",
      "member_nickname": "홍길동",
      "member_status": "active",
      "role": "seller",
      "roles": ["buyer", "seller"]
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**응답 (실패 - 401 Unauthorized)**:
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

---

### 3. `changePassword(req, res, next)` - 비밀번호 변경

**역할**: 비밀번호 변경 HTTP 요청을 처리합니다.

**HTTP 요청**:
```http
PUT /api/v1/auth/change-password
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "current_password": "oldpass123!",
  "new_password": "newpass456!",
  "confirm_password": "newpass456!"
}
```

**처리 과정**:
```
1. JWT 토큰에서 회원 ID 추출
   const memberId = req.user.member_id;  // authenticate 미들웨어가 설정
   ↓
2. req.body에서 데이터 추출
   const { current_password, new_password } = req.body;
   ↓
3. authService.changePassword() 호출
   const result = await authService.changePassword(memberId, current_password, new_password);
   ↓
4. 성공 응답 반환 (200 OK)
   return successResponse(res, result, 'Password changed successfully');
```

**구현 코드**:
```javascript
async function changePassword(req, res, next) {
  try {
    // 1. JWT 토큰에서 회원 ID 추출 (authenticate 미들웨어가 설정)
    const memberId = req.user.member_id;

    // 2. 요청 데이터 추출
    const { current_password, new_password } = req.body;

    // 3. Auth Service 호출
    const result = await authService.changePassword(
      memberId,
      current_password,
      new_password
    );

    // 4. 성공 응답 반환 (200 OK)
    return successResponse(res, result, 'Password changed successfully');
  } catch (error) {
    // 5. 에러를 errorHandler 미들웨어로 전달
    next(error);
  }
}
```

**응답 (성공 - 200 OK)**:
```json
{
  "success": true,
  "message": "Password changed successfully",
  "data": {
    "message": "Password changed successfully"
  }
}
```

**응답 (실패 - 401 Unauthorized)**:
```json
{
  "success": false,
  "message": "Current password is incorrect"
}
```

**응답 (실패 - 400 Bad Request)**:
```json
{
  "success": false,
  "message": "New password must be different from current password"
}
```

---

## 🔄 전체 데이터 흐름

### 회원가입 시나리오

```
📱 클라이언트
POST /api/v1/auth/register
Content-Type: application/json
Body: {
  "email": "user@example.com",
  "password": "secure123!",
  "nickname": "홍길동",
  "phone": "010-1234-5678"
}
    ↓
🌐 Routes (src/routes/auth.routes.js - Step 1-10)
router.post('/register', validateRegister, authController.register);
    ↓
🔍 validateRegister 미들웨어 (Step 1-3)
- email 형식 검증 ✅
- password 강도 검증 ✅
- nickname 형식 검증 ✅
- phone 형식 검증 ✅
- next()
    ↓
🎯 authController.register ← Step 1-8 (여기!)
┌────────────────────────────────────────────┐
│ try {                                      │
│   // 1. 요청 데이터 추출                    │
│   const { email, password, nickname, phone }│
│     = req.body;                            │
│                                            │
│   // 2. Service 호출                       │
│   const result = await authService.register│
│     ({ email, password, nickname, phone }); │
│                                            │
│   // 3. 성공 응답 반환                      │
│   return successResponse(                  │
│     res,                                   │
│     result,                                │
│     'Registration successful',             │
│     201                                    │
│   );                                       │
│ } catch (error) {                          │
│   next(error);                             │
│ }                                          │
└────────────────────────────────────────────┘
    ↓
💼 authService.register (Step 1-6)
- 이메일 중복 확인
- 닉네임 중복 확인
- 비밀번호 해싱
- 회원 생성
- 권한 부여
- 토큰 발급
- return { member, token }
    ↓
🎯 authController.register (결과 받음)
    ↓
📤 successResponse 유틸리티
return res.status(201).json({
  success: true,
  message: 'Registration successful',
  data: result
});
    ↓
✅ 클라이언트 응답 (201 Created)
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "member": { ... },
    "token": "eyJhbGci..."
  }
}
```

---

### 로그인 시나리오

```
📱 클라이언트
POST /api/v1/auth/login
Body: { "email": "user@example.com", "password": "secure123!" }
    ↓
🌐 Routes
router.post('/login', validateLogin, authController.login);
    ↓
🔍 validateLogin 미들웨어
- email 형식 검증 ✅
- password 필수 검증 ✅
- next()
    ↓
🎯 authController.login
┌────────────────────────────────────────────┐
│ const { email, password } = req.body;      │
│ const result = await authService.login(    │
│   email, password                          │
│ );                                         │
│ return successResponse(res, result);       │
└────────────────────────────────────────────┘
    ↓
💼 authService.login
- 회원 조회
- 상태 확인
- 비밀번호 검증
- 권한 조회
- 토큰 발급
- return { member, token }
    ↓
✅ 클라이언트 응답 (200 OK)
```

---

### 비밀번호 변경 시나리오

```
📱 클라이언트
PUT /api/v1/auth/change-password
Authorization: Bearer eyJhbGci...
Body: {
  "current_password": "oldpass123!",
  "new_password": "newpass456!",
  "confirm_password": "newpass456!"
}
    ↓
🌐 Routes
router.put('/change-password',
  authenticate,
  validateChangePassword,
  authController.changePassword
);
    ↓
🔐 authenticate 미들웨어 (Step 1-2)
- JWT 토큰 검증
- req.user = { member_id: 123, email: '...', role: '...' }
- next()
    ↓
🔍 validateChangePassword 미들웨어 (Step 1-3)
- current_password 필수 검증 ✅
- new_password 강도 검증 ✅
- confirm_password 일치 검증 ✅
- new_password와 current_password 다른지 확인 ✅
- next()
    ↓
🎯 authController.changePassword
┌────────────────────────────────────────────┐
│ const memberId = req.user.member_id;       │
│ const { current_password, new_password }   │
│   = req.body;                              │
│                                            │
│ const result = await authService.          │
│   changePassword(                          │
│     memberId,                              │
│     current_password,                      │
│     new_password                           │
│   );                                       │
│                                            │
│ return successResponse(res, result);       │
└────────────────────────────────────────────┘
    ↓
💼 authService.changePassword
- 회원 조회
- 현재 비밀번호 확인
- 새 비밀번호 해싱
- 비밀번호 업데이트
- return { message }
    ↓
✅ 클라이언트 응답 (200 OK)
```

---

## 📊 Controller vs Service 비교

```javascript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Controller (Step 1-8) - HTTP 요청/응답 처리
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function register(req, res, next) {
  try {
    // 1. HTTP 요청 데이터 추출
    const { email, password, nickname } = req.body;

    // 2. Service 호출
    const result = await authService.register({ email, password, nickname });

    // 3. HTTP 응답 반환
    return successResponse(res, result, 'Registration successful', 201);
  } catch (error) {
    // 4. 에러 전달
    next(error);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Service (Step 1-6) - 비즈니스 로직
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function register(data) {
  // 1. 중복 확인
  if (await memberRepository.existsByEmail(data.email)) {
    throw new ValidationError('Email exists');
  }

  // 2. 비밀번호 해싱
  const hashedPassword = await bcrypt.hash(data.password, 10);

  // 3. 회원 생성
  const member = await memberRepository.create({ ...data, password: hashedPassword });

  // 4. 권한 부여
  await memberPermissionRepository.create({ member_id: member.member_id, role: 'buyer' });

  // 5. 토큰 발급
  const token = generateToken({ ... });

  return { member, token };
}
```

**비교 표**:

| 항목 | **Controller** | **Service** |
|------|---------------|------------|
| **역할** | HTTP 처리 | 비즈니스 로직 |
| **입력** | `req`, `res`, `next` | 일반 객체 |
| **출력** | HTTP 응답 | 일반 객체 |
| **의존성** | Service | Repository |
| **에러 처리** | try-catch, next(error) | throw CustomError |
| **HTTP 의존** | ✅ (req, res 사용) | ❌ |
| **테스트** | 통합 테스트 (Supertest) | 단위 테스트 (Jest) |

---

## ⚠️ 주의사항

### 1. Controller는 얇게 (Thin Controller)

```javascript
// ❌ 잘못된 예 (비즈니스 로직이 Controller에)
async function register(req, res) {
  const { email, password } = req.body;

  // 중복 확인 (비즈니스 로직)
  const exists = await prisma.member.findUnique({ where: { member_email: email } });
  if (exists) {
    return res.status(400).json({ error: 'Email exists' });
  }

  // 비밀번호 해싱 (비즈니스 로직)
  const hashed = await bcrypt.hash(password, 10);

  // 회원 생성
  const member = await prisma.member.create({ ... });

  return res.json({ member });
}

// ✅ 올바른 예 (Service에 위임)
async function register(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.register({ email, password });
    return successResponse(res, result, 'Registration successful', 201);
  } catch (error) {
    next(error);
  }
}
```

### 2. 에러는 throw, next로 전달

```javascript
// ❌ 잘못된 예 (에러를 직접 처리)
async function register(req, res) {
  try {
    const result = await authService.register(req.body);
    return res.json(result);
  } catch (error) {
    // 에러를 직접 처리 (일관성 없음)
    return res.status(400).json({ error: error.message });
  }
}

// ✅ 올바른 예 (errorHandler 미들웨어로 전달)
async function register(req, res, next) {
  try {
    const result = await authService.register(req.body);
    return successResponse(res, result, 'Registration successful', 201);
  } catch (error) {
    // errorHandler 미들웨어로 전달 (일관된 에러 처리)
    next(error);
  }
}
```

### 3. 항상 try-catch 사용

```javascript
// ❌ try-catch 없음 (에러 발생 시 서버 크래시)
async function register(req, res) {
  const result = await authService.register(req.body);
  return successResponse(res, result);
}

// ✅ try-catch로 감싸기
async function register(req, res, next) {
  try {
    const result = await authService.register(req.body);
    return successResponse(res, result);
  } catch (error) {
    next(error);
  }
}
```

### 4. 응답 헬퍼 함수 사용

```javascript
// ❌ 매번 수동으로 JSON 작성
return res.status(201).json({
  success: true,
  message: 'Registration successful',
  data: result
});

// ✅ 응답 헬퍼 함수 사용
return successResponse(res, result, 'Registration successful', 201);
```

### 5. JWT 토큰에서 회원 ID 추출

```javascript
// ✅ JWT 토큰의 member_id 사용 (authenticate 미들웨어가 설정)
async function changePassword(req, res, next) {
  try {
    const memberId = req.user.member_id;  // JWT에서 추출
    const { current_password, new_password } = req.body;

    const result = await authService.changePassword(memberId, current_password, new_password);
    return successResponse(res, result);
  } catch (error) {
    next(error);
  }
}

// ❌ URL 파라미터 사용 금지 (보안 위험)
async function changePassword(req, res, next) {
  const memberId = req.params.id;  // 다른 사람 ID를 넣으면?
  // 보안 문제!
}
```

---

## 🔐 보안 고려사항

### 1. JWT 토큰 사용

```javascript
// authenticate 미들웨어가 req.user를 설정
// Controller에서는 req.user.member_id만 사용

async function changePassword(req, res, next) {
  const memberId = req.user.member_id;  // 안전
  // ...
}
```

### 2. 민감한 정보 로깅 금지

```javascript
// ❌ 비밀번호를 로그에 출력
console.log('Login attempt:', req.body);  // { password: 'secure123!' }

// ✅ 민감 정보 제외
console.log('Login attempt:', { email: req.body.email });
```

### 3. 일관된 에러 메시지

```javascript
// Service에서 throw한 에러는 errorHandler 미들웨어가 처리
// Controller는 next(error)로만 전달

// errorHandler에서 일관된 형식으로 응답:
{
  "success": false,
  "message": "Email already exists"
}
```

---

## 🧪 테스트 예시

### 통합 테스트 (Supertest)

```javascript
// __tests__/integration/auth.controller.test.js
const request = require('supertest');
const app = require('../../src/app');

describe('Auth Controller', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should register a new member successfully', async () => {
      // Given
      const newMember = {
        email: 'newuser@example.com',
        password: 'secure123!',
        nickname: '테스트유저',
        phone: '010-1234-5678'
      };

      // When
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(newMember);

      // Then
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Registration successful');
      expect(response.body.data.member.member_email).toBe('newuser@example.com');
      expect(response.body.data.token).toBeDefined();
    });

    it('should return 400 when email already exists', async () => {
      // Given
      const duplicateMember = {
        email: 'existing@example.com',
        password: 'secure123!',
        nickname: '중복테스트'
      };

      // When
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(duplicateMember);

      // Then
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Email already exists');
    });

    it('should return 400 when validation fails', async () => {
      // Given
      const invalidMember = {
        email: 'not-an-email',
        password: '123',
        nickname: '홍'
      };

      // When
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(invalidMember);

      // Then
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      // Given
      const credentials = {
        email: 'user@example.com',
        password: 'secure123!'
      };

      // When
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(credentials);

      // Then
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.member.member_email).toBe('user@example.com');
    });

    it('should return 401 with invalid password', async () => {
      // Given
      const credentials = {
        email: 'user@example.com',
        password: 'wrongpassword'
      };

      // When
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(credentials);

      // Then
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should return 401 with non-existent email', async () => {
      // Given
      const credentials = {
        email: 'notfound@example.com',
        password: 'anypassword'
      };

      // When
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(credentials);

      // Then
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });
  });

  describe('PUT /api/v1/auth/change-password', () => {
    let token;

    beforeEach(async () => {
      // 로그인하여 토큰 획득
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'user@example.com',
          password: 'secure123!'
        });

      token = response.body.data.token;
    });

    it('should change password successfully', async () => {
      // Given
      const passwordData = {
        current_password: 'secure123!',
        new_password: 'newpass456!',
        confirm_password: 'newpass456!'
      };

      // When
      const response = await request(app)
        .put('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send(passwordData);

      // Then
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Password changed successfully');
    });

    it('should return 401 when current password is incorrect', async () => {
      // Given
      const passwordData = {
        current_password: 'wrongpassword',
        new_password: 'newpass456!',
        confirm_password: 'newpass456!'
      };

      // When
      const response = await request(app)
        .put('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send(passwordData);

      // Then
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Current password is incorrect');
    });

    it('should return 401 when token is missing', async () => {
      // Given
      const passwordData = {
        current_password: 'secure123!',
        new_password: 'newpass456!',
        confirm_password: 'newpass456!'
      };

      // When
      const response = await request(app)
        .put('/api/v1/auth/change-password')
        .send(passwordData);  // 토큰 없음

      // Then
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Authorization header is missing');
    });
  });
});
```

---

## 🔗 이전 단계들과의 관계

```
Step 1-1: JWT 유틸리티
  → generateToken(), verifyToken()

Step 1-2: 인증 미들웨어
  → authenticate, authorize
  → req.user 설정

Step 1-3: 입력 검증 미들웨어
  → validateRegister, validateLogin, validateChangePassword
  → Controller 실행 전 검증

Step 1-4: Member Repository
  → 데이터 접근

Step 1-5: MemberPermission Repository
  → 권한 데이터 접근

Step 1-6: Auth Service
  → register, login, changePassword
  → 비즈니스 로직 처리

Step 1-7: Member Service
  → 회원 정보 조회/수정

Step 1-8: Auth Controller ← 현재 단계!
  → authService 호출
  → HTTP 요청/응답 처리

Step 1-9: Member Controller (다음)
  → memberService 호출
  → HTTP 요청/응답 처리
```

---

## 🔄 다음 단계

### Step 1-9: Member Controller

Member Service를 호출하는 HTTP Controller를 구현할 예정입니다:

- `src/controllers/member.controller.js`
- `getMe(req, res, next)` - GET /api/v1/members/me
- `updateMe(req, res, next)` - PUT /api/v1/members/me

---

## 📚 참고 자료

### 관련 가이드
- [02. 코딩 표준](../02_CODING_STANDARDS.md)
- [04. API 개발 가이드](../04_API_DEVELOPMENT.md)

### 이전 단계
- [Step 1-6: Auth Service](./1-6_auth_service.md)
- [Step 1-7: Member Service](./1-7_member_service.md)

### Express 공식 문서
- [Express Routing Guide](https://expressjs.com/en/guide/routing.html)
- [Express Error Handling](https://expressjs.com/en/guide/error-handling.html)

---

**작성일**: 2025년 10월 2일
**작성자**: Backend Team
**상태**: ✅ 완료
