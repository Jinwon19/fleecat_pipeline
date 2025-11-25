# Step 1-11: Member Routes 생성

> **작업일**: 2025년 10월 2일
> **파일**: `src/routes/member.routes.js`
> **목적**: 회원 정보 관리 관련 API 엔드포인트 정의 및 미들웨어 연결

---

## 📋 목차

1. [개요](#1-개요)
2. [구현 내용](#2-구현-내용)
3. [엔드포인트 상세](#3-엔드포인트-상세)
4. [Auth Routes vs Member Routes](#4-auth-routes-vs-member-routes)
5. [미들웨어 체인](#5-미들웨어-체인)
6. [Private Routes만 존재하는 이유](#6-private-routes만-존재하는-이유)
7. [데이터 흐름](#7-데이터-흐름)
8. [보안 고려사항](#8-보안-고려사항)
9. [테스트 예제](#9-테스트-예제)
10. [다음 단계](#10-다음-단계)

---

## 1. 개요

### 목적

**Member Routes**는 회원 정보 조회 및 수정 관련 API 엔드포인트를 정의하고, 미들웨어와 컨트롤러를 연결합니다.

### 주요 역할

1. **API 엔드포인트 정의**: URL 패턴 및 HTTP 메서드 매핑
2. **미들웨어 연결**: 인증 및 입력 검증 미들웨어 체인 구성
3. **컨트롤러 연결**: 각 엔드포인트에 컨트롤러 함수 연결

### 정의하는 API (2개)

| HTTP Method | Endpoint | 설명 | 접근 권한 |
|-------------|----------|------|----------|
| GET | `/api/v1/members/me` | 내 정보 조회 | Private |
| PUT | `/api/v1/members/me` | 내 정보 수정 | Private |

---

## 2. 구현 내용

### 파일 구조

```javascript
// src/routes/member.routes.js

const express = require('express');
const router = express.Router();
const memberController = require('../controllers/member.controller');
const { validateUpdateMember } = require('../middlewares/validation');
const { authenticate } = require('../middlewares/auth');

// GET /me
router.get('/me', authenticate, memberController.getMe);

// PUT /me
router.put('/me', authenticate, validateUpdateMember, memberController.updateMe);

module.exports = router;
```

### 의존성

#### 외부 모듈
- `express` - Express.js 프레임워크

#### 내부 모듈
- `memberController` - Member Controller 함수들
- `authenticate` 미들웨어 - JWT 토큰 검증
- `validateUpdateMember` 미들웨어 - 입력 검증

---

## 3. 엔드포인트 상세

### (1) GET /me - 내 정보 조회

#### 전체 경로

```
GET /api/v1/members/me
```

#### 미들웨어 체인

```javascript
router.get('/me', authenticate, memberController.getMe);
```

**실행 순서**:
1. `authenticate` - JWT 토큰 검증, `req.user` 설정
2. `memberController.getMe` - 회원 정보 조회 처리

#### 요청 예제

```http
GET /api/v1/members/me HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 응답 예제 (200 OK)

```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "member_id": 123,
    "member_email": "user@example.com",
    "member_nickname": "홍길동",
    "member_phone": "010-1234-5678",
    "member_status": "active",
    "company_id": null,
    "member_created_at": "2025-10-01T12:00:00.000Z",
    "member_updated_at": "2025-10-01T12:00:00.000Z",
    "role": "seller",
    "roles": ["buyer", "seller"]
  }
}
```

#### 응답 예제 (401 Unauthorized)

```json
{
  "success": false,
  "message": "Authorization header is missing"
}
```

#### 응답 예제 (404 Not Found)

```json
{
  "success": false,
  "message": "Member not found or inactive"
}
```

#### 접근 권한

- **Private**: JWT 토큰 필수
- **본인만 조회 가능**: `req.user.member_id` 사용
- **활성 회원만**: `member_status: 'active'`

---

### (2) PUT /me - 내 정보 수정

#### 전체 경로

```
PUT /api/v1/members/me
```

#### 미들웨어 체인

```javascript
router.put('/me', authenticate, validateUpdateMember, memberController.updateMe);
```

**실행 순서**:
1. `authenticate` - JWT 토큰 검증, `req.user` 설정
2. `validateUpdateMember` - 입력 검증 (nickname, phone)
3. `memberController.updateMe` - 회원 정보 수정 처리

#### 요청 예제

```http
PUT /api/v1/members/me HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "nickname": "새닉네임",
  "phone": "010-9999-8888"
}
```

#### 응답 예제 (200 OK)

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "member": {
      "member_id": 123,
      "member_email": "user@example.com",
      "member_nickname": "새닉네임",
      "member_phone": "010-9999-8888",
      "member_status": "active",
      "company_id": null,
      "member_created_at": "2025-10-01T12:00:00.000Z",
      "member_updated_at": "2025-10-02T10:30:00.000Z"
    },
    "message": "Profile updated successfully"
  }
}
```

#### 응답 예제 (400 Bad Request - 닉네임 중복)

```json
{
  "success": false,
  "message": "Nickname already exists"
}
```

#### 응답 예제 (400 Bad Request - 입력 검증 실패)

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "nickname",
      "message": "Nickname must be between 2 and 20 characters"
    }
  ]
}
```

#### 수정 가능/불가능 필드

**✅ 수정 가능**:
- `nickname` - 닉네임 (중복 확인, 자기 자신 제외)
- `phone` - 전화번호 (null 허용)

**❌ 수정 불가능** (validateUpdateMember 미들웨어가 차단):
- `email` - 이메일 변경 불가 (별도 API 필요)
- `password` - 비밀번호 변경 불가 (`PUT /api/v1/auth/change-password` 사용)
- `member_status` - 상태 변경 불가 (관리자 전용)

#### 접근 권한

- **Private**: JWT 토큰 필수
- **본인만 수정 가능**: `req.user.member_id` 사용

---

## 4. Auth Routes vs Member Routes

### 역할 비교

| 구분 | **Auth Routes** | **Member Routes** |
|------|----------------|-------------------|
| **목적** | 인증/인가 처리 | 회원 정보 관리 |
| **엔드포인트** | `/api/v1/auth/*` | `/api/v1/members/*` |
| **Public 라우트** | ✅ (회원가입, 로그인) | ❌ (모두 Private) |
| **Private 라우트** | ✅ (비밀번호 변경) | ✅ (모두 Private) |
| **사용 Service** | `authService` | `memberService` |

### 엔드포인트 구조 비교

```
Auth Routes (인증/인가)
├── POST   /auth/register         (Public)
├── POST   /auth/login            (Public)
└── PUT    /auth/change-password  (Private)

Member Routes (회원 정보 관리)
├── GET    /members/me            (Private)
└── PUT    /members/me            (Private)
```

### 왜 분리하는가?

**단일 책임 원칙 (SRP)**:
- **Auth Routes**: 인증/인가 처리만 담당
- **Member Routes**: 회원 정보 CRUD만 담당

**접근 권한 차이**:
- **Auth Routes**: Public + Private 혼재
- **Member Routes**: 모두 Private (로그인 필수)

---

## 5. 미들웨어 체인

### 미들웨어 실행 순서

Express.js에서 미들웨어는 **왼쪽에서 오른쪽 순서**로 실행됩니다.

#### (1) GET /me - 내 정보 조회

```javascript
router.get('/me', authenticate, memberController.getMe);
```

```
Client Request (with JWT Token)
  ↓
authenticate (JWT 토큰 검증)
  ↓ (토큰 유효)
  ↓ req.user 설정
memberController.getMe (내 정보 조회)
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

#### (2) PUT /me - 내 정보 수정

```javascript
router.put('/me', authenticate, validateUpdateMember, memberController.updateMe);
```

```
Client Request (with JWT Token + Body)
  ↓
authenticate (JWT 토큰 검증)
  ↓ (토큰 유효)
  ↓ req.user 설정
validateUpdateMember (입력 검증)
  ↓ (검증 성공)
memberController.updateMe (내 정보 수정)
  ↓
Response
```

**입력 검증 실패 시**:
```
Client Request
  ↓
authenticate (JWT 토큰 검증)
  ↓ (토큰 유효)
validateUpdateMember (입력 검증)
  ↓ (검증 실패)
errorHandler 미들웨어 (400 Bad Request 응답)
  ↓
Response (에러)
```

### 미들웨어 순서의 중요성

```javascript
// ✅ 올바른 순서
router.put('/me', authenticate, validateUpdateMember, memberController.updateMe);
// 1. 먼저 JWT 검증 → req.user 설정
// 2. 입력 검증
// 3. 컨트롤러 실행

// ❌ 잘못된 순서
router.put('/me', validateUpdateMember, authenticate, memberController.updateMe);
// 입력 검증이 먼저 실행되어 불필요한 처리
// JWT 검증 전에 이미 입력 검증 완료 (비효율)
```

**Best Practice**: 인증 미들웨어를 가장 먼저 실행하여 인증되지 않은 요청을 빠르게 차단

---

## 6. Private Routes만 존재하는 이유

### Auth Routes는 Public + Private

```javascript
// Public (누구나 접근)
POST /api/v1/auth/register
POST /api/v1/auth/login

// Private (로그인 필요)
PUT /api/v1/auth/change-password
```

### Member Routes는 오직 Private

```javascript
// Private (모두 로그인 필요)
GET /api/v1/members/me
PUT /api/v1/members/me
```

### 왜 Member Routes는 Private만 있는가?

**1. 회원 정보는 본인만 조회/수정 가능**
- 로그인하지 않은 사용자는 조회할 정보가 없음
- 본인 확인을 위해 JWT 토큰 필수

**2. 인증 없이 접근 가능한 회원 정보 API는 보안 위험**
- 다른 사람의 정보를 조회/수정할 위험
- JWT 토큰으로 본인 확인 필수

**3. Public API는 Auth Routes에만**
- 회원가입, 로그인만 Public
- 나머지는 모두 Private

### /me 엔드포인트 패턴

```javascript
// ✅ 올바른 패턴 (JWT에서 ID 추출)
GET /api/v1/members/me
Authorization: Bearer {token}

// JWT 토큰에서 member_id 추출 → 본인 정보 조회
const memberId = req.user.member_id;

// ❌ 잘못된 패턴 (URL 파라미터 사용)
GET /api/v1/members/:id
Authorization: Bearer {token}

// 공격자가 다른 사람 ID로 접근 시도 가능
// GET /api/v1/members/999 (다른 사람 정보 조회 시도)
```

**핵심**: `/me` 엔드포인트는 항상 JWT 토큰의 사용자 정보를 사용하여 본인만 조회/수정

---

## 7. 데이터 흐름

### (1) GET /api/v1/members/me 흐름

```
Client
  ↓ GET /api/v1/members/me + JWT Token
Express App
  ↓ app.use('/api/v1', routes)
Routes (index.js)
  ↓ router.use('/members', memberRoutes)
Member Routes
  ↓ router.get('/me', ...)
  ↓ authenticate 미들웨어
Auth Middleware
  ↓ Authorization 헤더에서 토큰 추출
  ↓ JWT 토큰 검증
  ↓ req.user = { member_id, email } 설정
  ↓ next()
Member Controller
  ↓ memberController.getMe(req, res, next)
  ↓ req.user.member_id 추출
  ↓ memberService.getMyProfile(memberId) 호출
Member Service
  ↓ memberRepository.findActiveById(memberId)
  ↓ memberPermissionRepository.getPrimaryRole(memberId)
  ↓ memberPermissionRepository.getRoles(memberId)
  ↓ 비밀번호 제외, 권한 추가
Member Controller
  ↓ successResponse(res, member, '...', 200)
Client
  ← 200 OK
  ← { success: true, data: { member_id, ..., role, roles } }
```

### (2) PUT /api/v1/members/me 흐름

```
Client
  ↓ PUT /api/v1/members/me + JWT Token
  ↓ { nickname, phone }
Express App
  ↓ app.use('/api/v1', routes)
Routes (index.js)
  ↓ router.use('/members', memberRoutes)
Member Routes
  ↓ router.put('/me', ...)
  ↓ authenticate 미들웨어
Auth Middleware
  ↓ Authorization 헤더에서 토큰 추출
  ↓ JWT 토큰 검증
  ↓ req.user = { member_id, email } 설정
  ↓ next()
Validation Middleware
  ↓ validateUpdateMember
  ↓ req.body 검증 (nickname, phone)
  ↓ email/password 변경 시도 차단
  ↓ 검증 성공 → next()
Member Controller
  ↓ memberController.updateMe(req, res, next)
  ↓ req.user.member_id 추출
  ↓ req.body에서 { nickname, phone } 추출
  ↓ memberService.updateProfile(memberId, { nickname, phone })
Member Service
  ↓ memberRepository.findById(memberId) (존재 확인)
  ↓ memberRepository.findByNickname(nickname) (중복 확인, 자기 자신 제외)
  ↓ memberRepository.update(memberId, dataToUpdate)
  ↓ 비밀번호 제외
Member Controller
  ↓ successResponse(res, result, '...', 200)
Client
  ← 200 OK
  ← { success: true, data: { member: {...}, message: '...' } }
```

---

## 8. 보안 고려사항

### (1) 본인만 접근 가능

**문제**: 다른 사용자의 정보 조회/수정 방지

**해결**:
```javascript
// ❌ 잘못된 방법 - URL 파라미터 사용
// GET /api/v1/members/:id
// 공격자가 다른 사용자 ID로 접근 가능

// ✅ 올바른 방법 - JWT 토큰에서 ID 추출
// GET /api/v1/members/me
const memberId = req.user.member_id; // authenticate 미들웨어가 설정
```

### (2) JWT 토큰 검증

**authenticate 미들웨어가 처리**:
- Authorization 헤더에서 토큰 추출
- 토큰 검증 (만료, 서명)
- 유효한 경우 `req.user` 설정
- 유효하지 않은 경우 401 Unauthorized 응답

**모든 엔드포인트에 authenticate 미들웨어 필수**:
```javascript
// 모든 라우트에 authenticate 적용
router.get('/me', authenticate, memberController.getMe);
router.put('/me', authenticate, validateUpdateMember, memberController.updateMe);
```

### (3) 입력 검증

**validateUpdateMember 미들웨어가 처리**:
- `nickname`, `phone` 형식 검증
- `email`, `password` 변경 시도 차단
- 검증 실패 시 400 Bad Request 응답

```javascript
// validateUpdateMember 미들웨어 (Step 1-3)
body('email')
  .not()
  .exists()
  .withMessage('Email cannot be updated through this endpoint. Use /auth/change-email'),

body('password')
  .not()
  .exists()
  .withMessage('Password cannot be updated through this endpoint. Use /auth/change-password'),
```

### (4) 비밀번호 제외

**Member Service에서 처리**:
```javascript
// Service에서 이미 처리
const { member_password, ...memberData } = member;
return memberData; // 비밀번호 제외
```

**Controller는 Service 결과를 그대로 반환**:
```javascript
// 비밀번호는 이미 제외됨
return successResponse(res, member, '...');
```

### (5) 활성 회원만 조회

**getMe에서만 적용**:
```javascript
// Service에서 처리
const member = await memberRepository.findActiveById(memberId);
// member_status: 'active'인 회원만 조회
```

**updateMe는 모든 상태 허용**:
- 이유: 회원이 자신의 정보를 수정할 권리가 있음
- Service에서 `findById` 사용 (상태 무관)

---

## 9. 테스트 예제

### (1) 통합 테스트 (Supertest)

```javascript
const request = require('supertest');
const app = require('../src/app');
const { generateToken } = require('../src/utils/jwt');

describe('Member Routes', () => {
  let token;
  let memberId;

  beforeAll(async () => {
    // 테스트용 회원 생성
    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123!',
        nickname: '테스터',
        phone: '010-1234-5678'
      });

    token = registerResponse.body.data.token;
    memberId = registerResponse.body.data.member.member_id;
  });

  describe('GET /api/v1/members/me', () => {
    it('내 정보 조회 성공', async () => {
      const response = await request(app)
        .get('/api/v1/members/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('member_id', memberId);
      expect(response.body.data).toHaveProperty('member_email', 'test@example.com');
      expect(response.body.data).toHaveProperty('role');
      expect(response.body.data).toHaveProperty('roles');
      expect(response.body.data).not.toHaveProperty('member_password');
    });

    it('JWT 토큰 없이 요청 시 401', async () => {
      const response = await request(app)
        .get('/api/v1/members/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Authorization header is missing');
    });

    it('유효하지 않은 JWT 토큰 시 401', async () => {
      const response = await request(app)
        .get('/api/v1/members/me')
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/members/me', () => {
    it('내 정보 수정 성공', async () => {
      const response = await request(app)
        .put('/api/v1/members/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nickname: '새닉네임',
          phone: '010-9999-8888'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.member).toHaveProperty('member_nickname', '새닉네임');
      expect(response.body.data.member).toHaveProperty('member_phone', '010-9999-8888');
    });

    it('닉네임만 수정 성공', async () => {
      const response = await request(app)
        .put('/api/v1/members/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nickname: '또다른닉네임'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.member).toHaveProperty('member_nickname', '또다른닉네임');
    });

    it('전화번호만 수정 성공', async () => {
      const response = await request(app)
        .put('/api/v1/members/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          phone: '010-8888-7777'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.member).toHaveProperty('member_phone', '010-8888-7777');
    });

    it('닉네임 중복 시 400', async () => {
      // 다른 회원 생성
      const otherMemberResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'other@example.com',
          password: 'password123!',
          nickname: '이미존재'
        });

      // 중복된 닉네임으로 수정 시도
      const response = await request(app)
        .put('/api/v1/members/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nickname: '이미존재'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Nickname already exists');
    });

    it('입력 검증 실패 시 400', async () => {
      const response = await request(app)
        .put('/api/v1/members/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nickname: 'ab'  // 3자 미만
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('errors');
    });

    it('이메일 변경 시도 시 400', async () => {
      const response = await request(app)
        .put('/api/v1/members/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'newemail@example.com'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Email cannot be updated');
    });

    it('비밀번호 변경 시도 시 400', async () => {
      const response = await request(app)
        .put('/api/v1/members/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          password: 'newpassword123!'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Password cannot be updated');
    });

    it('JWT 토큰 없이 요청 시 401', async () => {
      const response = await request(app)
        .put('/api/v1/members/me')
        .send({
          nickname: '새닉네임'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
```

### (2) 엔드포인트 수동 테스트 (curl)

#### 내 정보 조회

```bash
curl -X GET http://localhost:3000/api/v1/members/me \
  -H "Authorization: Bearer {YOUR_TOKEN_HERE}"
```

#### 내 정보 수정

```bash
curl -X PUT http://localhost:3000/api/v1/members/me \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_TOKEN_HERE}" \
  -d '{
    "nickname": "새닉네임",
    "phone": "010-9999-8888"
  }'
```

### (3) Postman 컬렉션 예제

```json
{
  "info": {
    "name": "Fleecat - Member API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Get My Profile",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "url": {
          "raw": "{{base_url}}/api/v1/members/me",
          "host": ["{{base_url}}"],
          "path": ["api", "v1", "members", "me"]
        }
      }
    },
    {
      "name": "Update My Profile",
      "request": {
        "method": "PUT",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          },
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"nickname\": \"새닉네임\",\n  \"phone\": \"010-9999-8888\"\n}"
        },
        "url": {
          "raw": "{{base_url}}/api/v1/members/me",
          "host": ["{{base_url}}"],
          "path": ["api", "v1", "members", "me"]
        }
      }
    }
  ]
}
```

---

## 10. 다음 단계

### Step 1-12: 라우트 통합 (완료)

**파일**: `src/routes/index.js`

**내용**:
```javascript
const authRoutes = require('./auth.routes');
const memberRoutes = require('./member.routes');

router.use('/auth', authRoutes);
router.use('/members', memberRoutes);
```

**완료된 API 엔드포인트**:
```
Auth Routes
├── POST   /api/v1/auth/register
├── POST   /api/v1/auth/login
└── PUT    /api/v1/auth/change-password

Member Routes
├── GET    /api/v1/members/me
└── PUT    /api/v1/members/me
```

### Step 1-13: 테스트 작성 (다음)

**예정 작업**:
- 단위 테스트 (Jest)
- 통합 테스트 (Supertest)
- 테스트 커버리지 80% 이상 목표

**테스트 파일**:
```
tests/
├── unit/
│   ├── services/
│   │   ├── auth.service.test.js
│   │   └── member.service.test.js
│   └── repositories/
│       ├── member.repository.test.js
│       └── memberPermission.repository.test.js
└── integration/
    ├── auth.routes.test.js
    └── member.routes.test.js
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
✅ Step 1-10: Auth Routes
✅ Step 1-11: Member Routes ← 현재 (완료!)
✅ Step 1-12: 라우트 통합
⬜ Step 1-13: 테스트 작성
```

---

**작성자**: Backend Team
**최종 업데이트**: 2025년 10월 2일
