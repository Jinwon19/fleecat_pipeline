# Step 1-9: Member Controller 생성

> **작업일**: 2025년 10월 2일
> **파일**: `src/controllers/member.controller.js`
> **목적**: 회원 정보 조회 및 수정 관련 HTTP 요청/응답 처리

---

## 📋 목차

1. [개요](#1-개요)
2. [Controller란?](#2-controller란)
3. [Member Controller vs Auth Controller](#3-member-controller-vs-auth-controller)
4. [구현 내용](#4-구현-내용)
5. [주요 함수 상세](#5-주요-함수-상세)
6. [데이터 흐름](#6-데이터-흐름)
7. [보안 고려사항](#7-보안-고려사항)
8. [테스트 예제](#8-테스트-예제)
9. [다음 단계](#9-다음-단계)

---

## 1. 개요

### 목적

**Member Controller**는 회원 정보 조회 및 수정과 관련된 HTTP 요청/응답을 처리합니다.

### 주요 역할

1. **HTTP 요청 데이터 추출**: `req.user`, `req.body`에서 필요한 데이터 추출
2. **Member Service 호출**: 비즈니스 로직은 Service에 위임
3. **HTTP 응답 반환**: 성공 시 200 OK, 에러 시 적절한 상태 코드
4. **에러 처리**: 모든 에러를 errorHandler 미들웨어로 전달

### 처리하는 API

| HTTP Method | Endpoint | 설명 | 접근 권한 |
|-------------|----------|------|----------|
| GET | `/api/v1/members/me` | 내 정보 조회 | Private (본인만) |
| PUT | `/api/v1/members/me` | 내 정보 수정 | Private (본인만) |

---

## 2. Controller란?

### Layered Architecture에서의 위치

```
Routes → Middleware → [Controller] → Service → Repository → Database
```

### Controller의 역할

#### ✅ Controller가 하는 일

1. **HTTP 요청 데이터 추출**
   - `req.body`, `req.params`, `req.query`, `req.user` 등에서 데이터 추출
2. **Service 호출**
   - 비즈니스 로직은 Service에 위임
3. **HTTP 응답 반환**
   - `successResponse()` 유틸리티 사용
   - 적절한 HTTP 상태 코드 설정 (200, 201, 400, 404 등)
4. **에러 처리**
   - `try-catch`로 에러 캐치
   - `next(error)`로 errorHandler 미들웨어에 전달

#### ❌ Controller가 하지 않는 일

1. **비즈니스 로직 처리** → Service의 역할
2. **데이터베이스 접근** → Repository의 역할
3. **입력 검증** → Validation 미들웨어의 역할
4. **JWT 토큰 검증** → authenticate 미들웨어의 역할

### Thin Controller 패턴

```javascript
async function controllerFunction(req, res, next) {
  try {
    // 1. 요청 데이터 추출
    const data = req.body;
    const userId = req.user.member_id;

    // 2. Service 호출 (비즈니스 로직은 Service에)
    const result = await someService.someMethod(userId, data);

    // 3. 성공 응답 반환
    return successResponse(res, result, 'Success message');
  } catch (error) {
    // 4. 에러 전달
    next(error);
  }
}
```

**핵심**: Controller는 얇게(thin) 유지하고, 비즈니스 로직은 Service에 위임

---

## 3. Member Controller vs Auth Controller

### 역할 비교

| 구분 | Auth Controller | Member Controller |
|------|----------------|-------------------|
| **목적** | 인증/인가 처리 | 회원 정보 관리 |
| **주요 기능** | 회원가입, 로그인, 비밀번호 변경 | 프로필 조회, 프로필 수정 |
| **엔드포인트** | `/api/v1/auth/*` | `/api/v1/members/*` |
| **사용 Service** | `authService` | `memberService` |
| **접근 권한** | Public (회원가입, 로그인)<br>Private (비밀번호 변경) | Private (본인만) |

### 기능 분리 이유

```
Auth Controller (인증/인가)
├── POST /auth/register       (회원가입)
├── POST /auth/login          (로그인)
└── PUT  /auth/change-password (비밀번호 변경)

Member Controller (회원 정보 관리)
├── GET /members/me           (내 정보 조회)
└── PUT /members/me           (내 정보 수정)
```

**단일 책임 원칙(SRP)**:
- **Auth Controller**: 인증/인가 처리만 담당
- **Member Controller**: 회원 정보 CRUD만 담당

---

## 4. 구현 내용

### 파일 구조

```javascript
// src/controllers/member.controller.js

const memberService = require('../services/member.service');
const { successResponse } = require('../utils/response');

async function getMe(req, res, next) { ... }
async function updateMe(req, res, next) { ... }

module.exports = {
  getMe,
  updateMe
};
```

### 구현한 함수

1. **`getMe(req, res, next)`**
   - 내 정보 조회 (본인만)
   - GET `/api/v1/members/me`

2. **`updateMe(req, res, next)`**
   - 내 정보 수정 (본인만)
   - PUT `/api/v1/members/me`

---

## 5. 주요 함수 상세

### (1) `getMe(req, res, next)` - 내 정보 조회

#### 목적

로그인한 사용자 본인의 정보를 조회합니다.

#### HTTP 정보

- **HTTP Method**: GET
- **Endpoint**: `/api/v1/members/me`
- **Access**: Private (authenticate 미들웨어 필요)

#### 처리 흐름

```javascript
async function getMe(req, res, next) {
  try {
    // 1. JWT 토큰에서 회원 ID 추출
    const memberId = req.user.member_id;

    // 2. Member Service 호출
    const member = await memberService.getMyProfile(memberId);

    // 3. 성공 응답 반환 (200 OK)
    return successResponse(res, member, 'Profile retrieved successfully');
  } catch (error) {
    // 4. 에러 전달
    next(error);
  }
}
```

#### 요청 예제

```http
GET /api/v1/members/me HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 응답 예제 (성공 - 200 OK)

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

#### 응답 예제 (실패 - 404 Not Found)

```json
{
  "success": false,
  "message": "Member not found or inactive"
}
```

#### 보안

- **본인만 조회 가능**: `req.user.member_id` 사용 (URL 파라미터 사용 금지)
- **활성 회원만 조회**: `member_status: 'active'`
- **비밀번호 제외**: 응답에 `member_password` 포함 안 됨

---

### (2) `updateMe(req, res, next)` - 내 정보 수정

#### 목적

로그인한 사용자 본인의 정보를 수정합니다.

#### HTTP 정보

- **HTTP Method**: PUT
- **Endpoint**: `/api/v1/members/me`
- **Access**: Private (authenticate 미들웨어 필요)

#### 처리 흐름

```javascript
async function updateMe(req, res, next) {
  try {
    // 1. JWT 토큰에서 회원 ID 추출
    const memberId = req.user.member_id;

    // 2. 요청 데이터 추출
    const { nickname, phone } = req.body;

    // 3. Member Service 호출
    const result = await memberService.updateProfile(memberId, {
      nickname,
      phone
    });

    // 4. 성공 응답 반환 (200 OK)
    return successResponse(res, result, 'Profile updated successfully');
  } catch (error) {
    // 5. 에러 전달
    next(error);
  }
}
```

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

#### 응답 예제 (성공 - 200 OK)

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

#### 응답 예제 (실패 - 400 Bad Request)

```json
{
  "success": false,
  "message": "Nickname already exists"
}
```

#### 수정 가능한 필드

- ✅ `nickname` - 닉네임 (중복 확인, 자기 자신 제외)
- ✅ `phone` - 전화번호 (null 허용)

#### 수정 불가능한 필드

- ❌ `member_email` - 이메일 변경 불가 (별도 API 필요)
- ❌ `member_password` - 비밀번호 변경 불가 (Auth Controller의 `changePassword` 사용)
- ❌ `member_status` - 상태 변경 불가 (관리자 전용)

---

## 6. 데이터 흐름

### (1) GET /api/v1/members/me 흐름

```
Client
  ↓ GET /api/v1/members/me + JWT Token
Routes (member.routes.js)
  ↓ authenticate 미들웨어 (JWT 검증, req.user 설정)
  ↓ member.controller.getMe 호출
Member Controller
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
  ← { success: true, data: { member_id, ..., role, roles } }
```

### (2) PUT /api/v1/members/me 흐름

```
Client
  ↓ PUT /api/v1/members/me + { nickname, phone } + JWT Token
Routes (member.routes.js)
  ↓ authenticate 미들웨어 (JWT 검증)
  ↓ validateUpdateMember 미들웨어 (입력 검증)
  ↓ member.controller.updateMe 호출
Member Controller
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
  ← { success: true, data: { member: {...}, message: '...' } }
```

---

## 7. 보안 고려사항

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

**Controller는 `req.user` 존재 여부만 확인하면 됨**:
```javascript
// authenticate 미들웨어가 통과했다면 req.user는 반드시 존재
const memberId = req.user.member_id; // 안전
```

### (3) 비밀번호 제외

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

### (4) 활성 회원만 조회

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

## 8. 테스트 예제

### (1) 통합 테스트 (Supertest)

#### getMe 테스트

```javascript
const request = require('supertest');
const app = require('../src/app');
const { generateToken } = require('../src/utils/jwt');

describe('GET /api/v1/members/me', () => {
  let token;

  beforeAll(async () => {
    // 테스트 회원 생성 및 토큰 발급
    const member = await createTestMember({
      email: 'test@example.com',
      password: 'password123!',
      nickname: '테스터'
    });

    token = generateToken({
      member_id: member.member_id,
      email: member.member_email
    });
  });

  it('내 정보 조회 성공', async () => {
    const response = await request(app)
      .get('/api/v1/members/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('member_id');
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
  });
});
```

#### updateMe 테스트

```javascript
describe('PUT /api/v1/members/me', () => {
  let token;

  beforeAll(async () => {
    const member = await createTestMember({
      email: 'test@example.com',
      password: 'password123!',
      nickname: '테스터'
    });

    token = generateToken({
      member_id: member.member_id,
      email: member.member_email
    });
  });

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

  it('닉네임 중복 시 400', async () => {
    // 다른 회원의 닉네임 사용
    await createTestMember({
      email: 'other@example.com',
      password: 'password123!',
      nickname: '이미존재'
    });

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
  });
});
```

### (2) 단위 테스트 (Jest)

```javascript
const memberController = require('../src/controllers/member.controller');
const memberService = require('../src/services/member.service');

jest.mock('../src/services/member.service');

describe('Member Controller - getMe', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: { member_id: 123 }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  it('성공 시 200 응답', async () => {
    const mockMember = {
      member_id: 123,
      member_email: 'test@example.com',
      role: 'buyer',
      roles: ['buyer']
    };

    memberService.getMyProfile.mockResolvedValue(mockMember);

    await memberController.getMe(req, res, next);

    expect(memberService.getMyProfile).toHaveBeenCalledWith(123);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Profile retrieved successfully',
      data: mockMember
    });
  });

  it('Service 에러 시 next 호출', async () => {
    const error = new Error('Service error');
    memberService.getMyProfile.mockRejectedValue(error);

    await memberController.getMe(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
```

---

## 9. 다음 단계

### Step 1-10: Auth Routes

**파일**: `src/routes/auth.routes.js`

**내용**:
- POST `/api/v1/auth/register` - 회원가입 (Public)
- POST `/api/v1/auth/login` - 로그인 (Public)
- PUT `/api/v1/auth/change-password` - 비밀번호 변경 (Private)

**미들웨어 연결**:
```javascript
router.post('/register', validateRegister, authController.register);
router.post('/login', validateLogin, authController.login);
router.put('/change-password', authenticate, validateChangePassword, authController.changePassword);
```

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
✅ Step 1-9: Member Controller ← 현재
⬜ Step 1-10: Auth Routes
⬜ Step 1-11: Member Routes
⬜ Step 1-12: 라우트 통합
⬜ Step 1-13: 테스트 작성
```

---

**작성자**: Backend Team
**최종 업데이트**: 2025년 10월 2일
