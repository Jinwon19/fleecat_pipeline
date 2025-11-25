# Step 1-7: Member Service 생성

> **Phase 1: 기초 인프라 구축**
> **작성일**: 2025년 10월 2일
> **상태**: ✅ 완료

---

## 📋 작업 개요

### 목적
회원 정보 조회 및 수정 관련 비즈니스 로직을 담당하는 Service 레이어를 구현합니다.

### 작업 내용
- `src/services/member.service.js` 파일 생성
- `getMyProfile()` 함수 구현 - 내 정보 조회
- `updateProfile()` 함수 구현 - 내 정보 수정
- `getMemberById()` 함수 구현 - 관리자용 회원 조회

---

## 🎯 Auth Service vs Member Service

### 역할 분리

| 구분 | **Auth Service** (Step 1-6) | **Member Service** (Step 1-7) |
|------|---------------------------|------------------------------|
| **목적** | 인증/인가 (로그인, 회원가입) | 회원 정보 관리 |
| **주요 기능** | register, login, changePassword | getMyProfile, updateProfile |
| **사용 시점** | 로그인 전/회원가입 시 | 로그인 후 |
| **인증 필요** | X (로그인 전) | O (로그인 후) |
| **주요 Repository** | member, memberPermission | member, memberPermission |
| **주요 에러** | UnauthorizedError (인증 실패) | NotFoundError (회원 없음) |

### 왜 분리하는가?

**1. 단일 책임 원칙** (Single Responsibility Principle)

```javascript
// ❌ 모든 것을 authService에 넣으면
authService = {
  register,
  login,
  changePassword,
  getProfile,        // 인증과 무관
  updateProfile,     // 인증과 무관
  deleteAccount,     // 인증과 무관
}

// ✅ 역할별로 분리
authService = {
  register,          // 인증 관련
  login,
  changePassword
}

memberService = {
  getMyProfile,      // 정보 조회
  updateProfile,     // 정보 수정
  getMemberById      // 관리자용
}
```

**2. 권한 분리**

```javascript
// Auth Service - 누구나 접근
POST /api/v1/auth/register  (인증 불필요)
POST /api/v1/auth/login     (인증 불필요)

// Member Service - 로그인 필요
GET /api/v1/members/me      (authenticate 필요)
PUT /api/v1/members/me      (authenticate 필요)

// Admin용 - 관리자만
GET /api/v1/members/:id     (authenticate + authorize('admin') 필요)
```

---

## 📁 파일 위치

```
src/
└── services/
    ├── auth.service.js     (Step 1-6)
    └── member.service.js   ← 생성한 파일
```

---

## 💻 구현 코드

### 전체 구조

```javascript
const memberRepository = require('../repositories/member.repository');
const memberPermissionRepository = require('../repositories/memberPermission.repository');
const { ValidationError, NotFoundError } = require('../utils/errors');

// 3개의 함수 제공:
// - getMyProfile(memberId) - 내 정보 조회
// - updateProfile(memberId, updateData) - 내 정보 수정
// - getMemberById(memberId) - 관리자용 회원 조회
```

---

## 🔧 함수 설명

### 1. `getMyProfile(memberId)` - 내 정보 조회

**역할**: 로그인한 사용자 자신의 정보를 조회합니다.

**파라미터**:
```javascript
memberId: 123  // JWT 토큰에서 추출한 회원 ID
```

**반환값**:
```javascript
{
  member_id: 123,
  member_email: 'user@example.com',
  member_nickname: '홍길동',
  member_phone: '010-1234-5678',
  member_status: 'active',
  company_id: null,
  role: 'seller',              // 주 역할
  roles: ['buyer', 'seller'],  // 모든 역할
  member_created_at: '2025-10-01T00:00:00.000Z',
  member_updated_at: '2025-10-02T00:00:00.000Z'
}
```

**처리 과정**:
```
1. memberRepository.findActiveById(memberId)
   - 활성 회원만 조회 (member_status: 'active')
   - null이면 NotFoundError
   ↓
2. 권한 조회
   - memberPermissionRepository.getPrimaryRole()
   - memberPermissionRepository.getRoles()
   ↓
3. 민감 정보 제외
   - member_password 제거
   - BigInt → Number 변환
   ↓
4. return { 회원 정보 + role + roles }
```

**사용 예시**:
```javascript
// memberController.js에서
async function getMe(req, res, next) {
  try {
    // JWT 토큰에서 추출한 member_id 사용
    const memberId = req.user.member_id;

    const profile = await memberService.getMyProfile(memberId);

    return successResponse(res, profile, 'Member retrieved successfully');
  } catch (error) {
    next(error);
  }
}
```

**클라이언트 요청 예시**:
```http
GET /api/v1/members/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**응답**:
```json
{
  "success": true,
  "message": "Member retrieved successfully",
  "data": {
    "member_id": 123,
    "member_email": "user@example.com",
    "member_nickname": "홍길동",
    "member_phone": "010-1234-5678",
    "role": "seller",
    "roles": ["buyer", "seller"]
  }
}
```

**에러 처리**:
```javascript
try {
  const profile = await memberService.getMyProfile(999);
} catch (error) {
  if (error instanceof NotFoundError) {
    // 404 Not Found
    // "Member not found or inactive"
    // - 회원이 없거나
    // - member_status가 'inactive' 또는 'suspended'
  }
}
```

---

### 2. `updateProfile(memberId, updateData)` - 내 정보 수정

**역할**: 로그인한 사용자가 자신의 정보(닉네임, 전화번호)를 수정합니다.

**파라미터**:
```javascript
memberId: 123  // JWT 토큰에서 추출

updateData = {
  nickname: '새닉네임',        // 선택
  phone: '010-9999-8888'      // 선택
}
```

**반환값**:
```javascript
{
  member: {
    member_id: 123,
    member_email: 'user@example.com',
    member_nickname: '새닉네임',      // 변경됨
    member_phone: '010-9999-8888',    // 변경됨
    member_updated_at: '2025-10-02T12:00:00.000Z'
  },
  message: 'Profile updated successfully'
}
```

**처리 과정**:
```
1. memberRepository.findById(memberId)
   - 회원 존재 확인
   - null이면 NotFoundError
   ↓
2. 닉네임 변경 시 중복 확인
   - memberRepository.findByNickname(updateData.nickname)
   - 다른 사람이 사용 중이면 ValidationError
   - 자기 자신의 현재 닉네임이면 OK
   ↓
3. 업데이트할 데이터 준비
   - member_nickname, member_phone
   ↓
4. memberRepository.update(memberId, dataToUpdate)
   ↓
5. return { member, message }
```

**사용 예시**:
```javascript
// memberController.js에서
async function updateMe(req, res, next) {
  try {
    // ✅ JWT 토큰의 member_id 사용 (보안)
    const memberId = req.user.member_id;

    // ❌ URL 파라미터 사용 금지 (보안 문제)
    // const memberId = req.params.id;

    const result = await memberService.updateProfile(memberId, req.body);

    return successResponse(res, result, 'Profile updated successfully');
  } catch (error) {
    next(error);
  }
}
```

**클라이언트 요청 예시**:
```http
PUT /api/v1/members/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "nickname": "새닉네임",
  "phone": "010-9999-8888"
}
```

**응답**:
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "member": {
      "member_id": 123,
      "member_nickname": "새닉네임",
      "member_phone": "010-9999-8888"
    },
    "message": "Profile updated successfully"
  }
}
```

**에러 처리**:
```javascript
// 1. 닉네임 중복
try {
  await memberService.updateProfile(123, { nickname: '홍길동' });
} catch (error) {
  if (error instanceof ValidationError) {
    // 400 Bad Request
    // "Nickname already exists"
  }
}

// 2. 회원을 찾을 수 없음
try {
  await memberService.updateProfile(999, { nickname: '새닉네임' });
} catch (error) {
  if (error instanceof NotFoundError) {
    // 404 Not Found
    // "Member not found"
  }
}
```

**닉네임 중복 확인 로직**:
```javascript
// ❌ 잘못된 로직
const existing = await memberRepository.findByNickname(updateData.nickname);
if (existing) {
  throw new ValidationError('Nickname already exists');
}
// 문제: 자기 자신의 현재 닉네임으로 수정 시도 시 에러 발생

// ✅ 올바른 로직
const existing = await memberRepository.findByNickname(updateData.nickname);
if (existing && existing.member_id !== BigInt(memberId)) {
  throw new ValidationError('Nickname already exists');
}
// 다른 사람이 사용 중일 때만 에러
```

**수정 불가능한 필드**:
```javascript
// ❌ 이메일 변경 시도
{
  "email": "newemail@example.com"
}
// → validateUpdateMember 미들웨어에서 400 에러
// "Email cannot be updated through this endpoint. Use /auth/change-email"

// ❌ 비밀번호 변경 시도
{
  "password": "newpass123!"
}
// → validateUpdateMember 미들웨어에서 400 에러
// "Password cannot be updated through this endpoint. Use /auth/change-password"

// ✅ 변경 가능한 필드
{
  "nickname": "새닉네임",
  "phone": "010-9999-8888"
}
```

---

### 3. `getMemberById(memberId)` - 관리자용 회원 조회

**역할**: 관리자가 특정 회원의 정보를 조회합니다.

**파라미터**:
```javascript
memberId: 123  // 조회할 회원 ID
```

**반환값**:
```javascript
{
  member_id: 123,
  member_email: 'user@example.com',
  member_nickname: '홍길동',
  member_status: 'suspended',  // 모든 상태 조회 가능
  role: 'buyer',
  roles: ['buyer'],
  member_created_at: '2025-10-01T00:00:00.000Z'
}
```

**처리 과정**:
```
1. memberRepository.findById(memberId)
   - 모든 상태의 회원 조회 (active, inactive, suspended)
   - null이면 NotFoundError
   ↓
2. 권한 조회
   - memberPermissionRepository.getPrimaryRole()
   - memberPermissionRepository.getRoles()
   ↓
3. 민감 정보 제외
   - member_password 제거
   ↓
4. return member
```

**getMyProfile vs getMemberById 차이**:

| 항목 | **getMyProfile** | **getMemberById** |
|------|------------------|-------------------|
| **사용자** | 본인 | 관리자 |
| **조회 대상** | 자기 자신 | 다른 회원 |
| **상태 필터** | active만 | 모든 상태 |
| **Repository** | findActiveById | findById |
| **권한 필요** | authenticate | authenticate + authorize('admin') |
| **API 경로** | GET /members/me | GET /admin/members/:id |

**사용 예시**:
```javascript
// adminController.js에서
async function getMemberById(req, res, next) {
  try {
    const targetMemberId = req.params.id;

    const member = await memberService.getMemberById(targetMemberId);

    return successResponse(res, member, 'Member retrieved successfully');
  } catch (error) {
    next(error);
  }
}
```

**클라이언트 요청 예시**:
```http
GET /api/v1/admin/members/123
Authorization: Bearer {admin_token}
```

**라우터 설정 예시**:
```javascript
// src/routes/admin.routes.js (미래에 구현)
const { authenticate, authorize } = require('../middlewares/auth');

// 관리자만 접근 가능
router.get('/members/:id',
  authenticate,
  authorize('admin'),
  adminController.getMemberById
);
```

**응답**:
```json
{
  "success": true,
  "message": "Member retrieved successfully",
  "data": {
    "member_id": 123,
    "member_email": "user@example.com",
    "member_nickname": "홍길동",
    "member_status": "suspended",
    "role": "buyer",
    "roles": ["buyer"]
  }
}
```

---

## 🔄 전체 데이터 흐름

### 내 정보 조회 시나리오

```
📱 클라이언트
GET /api/v1/members/me
Authorization: Bearer eyJhbGci...
    ↓
🔐 authenticate 미들웨어 (Step 1-2)
- Authorization 헤더에서 토큰 추출
- verifyToken(token)
- req.user = { member_id: 123, email: 'user@example.com', role: 'seller' }
- next()
    ↓
🎯 memberController.getMe (Step 1-9 예정)
- const memberId = req.user.member_id;
- memberService.getMyProfile(memberId)
    ↓
💼 memberService.getMyProfile(123) ← Step 1-7 (여기!)
┌────────────────────────────────────────────┐
│ 1. memberRepository.findActiveById(123)    │
│    → {                                     │
│        member_id: 123n,                    │
│        member_email: 'user@example.com',   │
│        member_nickname: '홍길동',           │
│        member_password: '$2b$10$...',      │
│        member_status: 'active',            │
│        member_permission: [...]            │
│      }                                     │
│                                            │
│ 2. memberPermissionRepository.getPrimaryRole│
│    → 'seller'                              │
│                                            │
│ 3. memberPermissionRepository.getRoles()   │
│    → ['buyer', 'seller']                   │
│                                            │
│ 4. 민감 정보 제외 + BigInt 변환            │
│    const { member_password, ...memberData }│
│                                            │
│ 5. return {                                │
│      member_id: 123,                       │
│      member_email: 'user@example.com',     │
│      member_nickname: '홍길동',             │
│      role: 'seller',                       │
│      roles: ['buyer', 'seller']            │
│    }                                       │
└────────────────────────────────────────────┘
    ↓
🎯 memberController.getMe
- successResponse(res, result, 'Member retrieved successfully')
    ↓
✅ 클라이언트 응답 (200 OK)
{
  "success": true,
  "message": "Member retrieved successfully",
  "data": {
    "member_id": 123,
    "member_email": "user@example.com",
    "member_nickname": "홍길동",
    "role": "seller",
    "roles": ["buyer", "seller"]
  }
}
```

---

### 내 정보 수정 시나리오

```
📱 클라이언트
PUT /api/v1/members/me
Authorization: Bearer eyJhbGci...
Body: { nickname: "새닉네임", phone: "010-9999-8888" }
    ↓
🔍 validateUpdateMember 미들웨어 (Step 1-3)
- nickname 형식 검증 ✅ (2~20자, 한글/영문/숫자)
- phone 형식 검증 ✅ (010-XXXX-XXXX)
- email/password 변경 시도 확인 ✅ (없음)
- next()
    ↓
🔐 authenticate 미들웨어
- req.user = { member_id: 123, ... }
- next()
    ↓
🎯 memberController.updateMe
- const memberId = req.user.member_id;
- memberService.updateProfile(memberId, req.body)
    ↓
💼 memberService.updateProfile(123, { nickname: "새닉네임", phone: "..." })
┌────────────────────────────────────────────┐
│ 1. memberRepository.findById(123)          │
│    → { member_id: 123n, ... } (회원 존재)   │
│                                            │
│ 2. 닉네임 중복 확인                         │
│    memberRepository.findByNickname("새닉네임")│
│    → null (중복 없음) ✅                    │
│                                            │
│    (만약 중복이면)                          │
│    → { member_id: 456n, ... }              │
│    → existing.member_id !== 123            │
│    → ValidationError!                      │
│                                            │
│ 3. 업데이트할 데이터 준비                   │
│    dataToUpdate = {                        │
│      member_nickname: "새닉네임",           │
│      member_phone: "010-9999-8888"         │
│    }                                       │
│                                            │
│ 4. memberRepository.update(123, dataToUpdate)│
│    → { member_id: 123n, ... } (업데이트됨)  │
│                                            │
│ 5. return {                                │
│      member: { ... },                      │
│      message: 'Profile updated successfully'│
│    }                                       │
└────────────────────────────────────────────┘
    ↓
✅ 클라이언트 응답 (200 OK)
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "member": {
      "member_id": 123,
      "member_nickname": "새닉네임",
      "member_phone": "010-9999-8888"
    },
    "message": "Profile updated successfully"
  }
}
```

---

## 📊 Auth Service vs Member Service 비교

```
┌──────────────────────────────────────────────────────────────┐
│                    사용자 흐름                                 │
└──────────────────────────────────────────────────────────────┘

신규 사용자
    ↓
┌─────────────────────────────────────┐
│ Auth Service (Step 1-6)             │
├─────────────────────────────────────┤
│ register() - 회원가입                │
│  → JWT 토큰 발급                     │
│                                     │
│ login() - 로그인                     │
│  → JWT 토큰 발급                     │
└─────────────────────────────────────┘
    ↓
JWT 토큰 보유 (로그인 상태)
    ↓
┌─────────────────────────────────────┐
│ Member Service (Step 1-7)           │
├─────────────────────────────────────┤
│ getMyProfile() - 내 정보 조회        │
│ updateProfile() - 내 정보 수정       │
└─────────────────────────────────────┘
    ↓
비밀번호 변경 필요 시
    ↓
┌─────────────────────────────────────┐
│ Auth Service                        │
├─────────────────────────────────────┤
│ changePassword() - 비밀번호 변경     │
└─────────────────────────────────────┘
    ↓
계속 Member Service 사용
```

---

## ⚠️ 주의사항

### 1. 자기 자신의 정보만 수정 가능

```javascript
// ✅ 올바른 사용 (JWT 토큰의 member_id 사용)
async function updateMe(req, res) {
  const memberId = req.user.member_id;  // JWT에서 추출
  const result = await memberService.updateProfile(memberId, req.body);
}

// ❌ 잘못된 사용 (URL 파라미터 사용 금지)
async function updateMe(req, res) {
  const memberId = req.params.id;  // 다른 사람 ID를 넣으면?
  // 보안 문제 발생!
}
```

### 2. 닉네임 중복 확인 시 자기 자신 제외

```javascript
// ❌ 잘못된 로직
const existing = await memberRepository.findByNickname(updateData.nickname);
if (existing) {
  throw new ValidationError('Nickname already exists');
}
// 문제: 자기 자신의 현재 닉네임으로 수정 시도 시 에러 발생

// ✅ 올바른 로직
const existing = await memberRepository.findByNickname(updateData.nickname);
if (existing && existing.member_id !== BigInt(memberId)) {
  throw new ValidationError('Nickname already exists');
}
// 다른 사람이 사용 중일 때만 에러
```

### 3. 활성 회원만 조회 (일반 사용자)

```javascript
// getMyProfile - 활성 회원만
const member = await memberRepository.findActiveById(memberId);
// member_status가 'inactive' 또는 'suspended'면 null 반환

// getMemberById - 모든 회원 (관리자용)
const member = await memberRepository.findById(memberId);
// 모든 상태의 회원 조회 가능
```

### 4. 비밀번호는 절대 반환 금지

```javascript
// ❌ 비밀번호 포함
return { member };  // member_password가 포함됨

// ✅ 비밀번호 제외
const { member_password, ...memberData } = member;
return { member: memberData };
```

### 5. 이메일/비밀번호는 별도 API

```javascript
// Member Service에서 변경 불가
updateProfile(memberId, updateData) {
  // ❌ email, password 변경 시도는 미들웨어에서 차단됨
  // validateUpdateMember 미들웨어 참고 (Step 1-3)
}

// 별도 API 사용
PUT /api/v1/auth/change-password      // 비밀번호 변경 (구현됨)
PUT /api/v1/auth/change-email (미구현) // 이메일 변경 (향후 구현)
```

### 6. BigInt 변환 처리

```javascript
// Prisma는 BigInt 반환
const member = await memberRepository.findById(123);
console.log(member.member_id);  // 123n (BigInt)

// 반환 시 Number로 변환
return {
  ...memberData,
  member_id: Number(memberData.member_id),  // 123 (Number)
  company_id: memberData.company_id ? Number(memberData.company_id) : null
};
```

---

## 🔐 보안 고려사항

### 1. 권한 분리

```javascript
// 일반 사용자 - 자기 정보만
GET /api/v1/members/me
PUT /api/v1/members/me
→ authenticate 미들웨어만

// 관리자 - 다른 사람 정보
GET /api/v1/admin/members/:id
→ authenticate + authorize('admin')
```

### 2. 민감 정보 제외

```javascript
// 항상 비밀번호 제외
const { member_password, ...memberData } = member;
return memberData;
```

### 3. 자기 정보만 수정

```javascript
// ✅ JWT 토큰의 member_id만 사용
const memberId = req.user.member_id;

// ❌ URL 파라미터 사용 금지
const memberId = req.params.id;
```

### 4. 입력 검증

```javascript
// validateUpdateMember 미들웨어에서 차단
// - email 변경 시도
// - password 변경 시도
// - 형식에 맞지 않는 nickname/phone
```

---

## 🧪 테스트 예시

### Jest 단위 테스트

```javascript
// __tests__/services/member.service.test.js
const memberService = require('../../src/services/member.service');
const memberRepository = require('../../src/repositories/member.repository');
const memberPermissionRepository = require('../../src/repositories/memberPermission.repository');

// Repository Mock
jest.mock('../../src/repositories/member.repository');
jest.mock('../../src/repositories/memberPermission.repository');

describe('Member Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMyProfile', () => {
    it('should return member profile with roles', async () => {
      // Given
      const mockMember = {
        member_id: 123n,
        member_email: 'user@example.com',
        member_nickname: '홍길동',
        member_password: '$2b$10$hashedpassword',
        member_status: 'active'
      };

      memberRepository.findActiveById.mockResolvedValue(mockMember);
      memberPermissionRepository.getPrimaryRole.mockResolvedValue('seller');
      memberPermissionRepository.getRoles.mockResolvedValue(['buyer', 'seller']);

      // When
      const result = await memberService.getMyProfile(123);

      // Then
      expect(result.member_id).toBe(123);
      expect(result.member_email).toBe('user@example.com');
      expect(result.role).toBe('seller');
      expect(result.roles).toEqual(['buyer', 'seller']);
      expect(result.member_password).toBeUndefined();  // 비밀번호 제외 확인
    });

    it('should throw NotFoundError when member not found', async () => {
      // Given
      memberRepository.findActiveById.mockResolvedValue(null);

      // When & Then
      await expect(
        memberService.getMyProfile(999)
      ).rejects.toThrow('Member not found or inactive');
    });

    it('should throw NotFoundError when member is inactive', async () => {
      // Given
      memberRepository.findActiveById.mockResolvedValue(null);  // inactive 회원은 null

      // When & Then
      await expect(
        memberService.getMyProfile(123)
      ).rejects.toThrow('Member not found or inactive');
    });
  });

  describe('updateProfile', () => {
    it('should update nickname successfully', async () => {
      // Given
      const mockExistingMember = {
        member_id: 123n,
        member_nickname: '홍길동'
      };

      const mockUpdatedMember = {
        member_id: 123n,
        member_email: 'user@example.com',
        member_nickname: '새닉네임',
        member_phone: '010-9999-8888',
        member_password: '$2b$10$hashedpassword'
      };

      memberRepository.findById.mockResolvedValue(mockExistingMember);
      memberRepository.findByNickname.mockResolvedValue(null);  // 중복 없음
      memberRepository.update.mockResolvedValue(mockUpdatedMember);

      // When
      const result = await memberService.updateProfile(123, {
        nickname: '새닉네임',
        phone: '010-9999-8888'
      });

      // Then
      expect(result.member.member_nickname).toBe('새닉네임');
      expect(result.member.member_phone).toBe('010-9999-8888');
      expect(result.message).toBe('Profile updated successfully');
      expect(result.member.member_password).toBeUndefined();  // 비밀번호 제외 확인
      expect(memberRepository.update).toHaveBeenCalledWith(123, {
        member_nickname: '새닉네임',
        member_phone: '010-9999-8888'
      });
    });

    it('should throw ValidationError when nickname already exists', async () => {
      // Given
      memberRepository.findById.mockResolvedValue({ member_id: 123n });
      memberRepository.findByNickname.mockResolvedValue({
        member_id: 456n,  // 다른 사람이 사용 중
        member_nickname: '중복닉네임'
      });

      // When & Then
      await expect(
        memberService.updateProfile(123, { nickname: '중복닉네임' })
      ).rejects.toThrow('Nickname already exists');
    });

    it('should allow updating to own current nickname', async () => {
      // Given
      const mockMember = {
        member_id: 123n,
        member_nickname: '홍길동'
      };

      memberRepository.findById.mockResolvedValue(mockMember);
      memberRepository.findByNickname.mockResolvedValue(mockMember);  // 자기 자신
      memberRepository.update.mockResolvedValue(mockMember);

      // When
      const result = await memberService.updateProfile(123, {
        nickname: '홍길동'  // 현재 닉네임과 동일
      });

      // Then
      expect(result.member.member_nickname).toBe('홍길동');
      expect(result.message).toBe('Profile updated successfully');
    });

    it('should throw NotFoundError when member not found', async () => {
      // Given
      memberRepository.findById.mockResolvedValue(null);

      // When & Then
      await expect(
        memberService.updateProfile(999, { nickname: '새닉네임' })
      ).rejects.toThrow('Member not found');
    });

    it('should update only phone when nickname is not provided', async () => {
      // Given
      memberRepository.findById.mockResolvedValue({ member_id: 123n });
      memberRepository.update.mockResolvedValue({
        member_id: 123n,
        member_phone: '010-9999-8888',
        member_password: '$2b$10$hashedpassword'
      });

      // When
      await memberService.updateProfile(123, { phone: '010-9999-8888' });

      // Then
      expect(memberRepository.findByNickname).not.toHaveBeenCalled();
      expect(memberRepository.update).toHaveBeenCalledWith(123, {
        member_phone: '010-9999-8888'
      });
    });
  });

  describe('getMemberById', () => {
    it('should return member info including inactive status (admin)', async () => {
      // Given
      const mockMember = {
        member_id: 123n,
        member_email: 'user@example.com',
        member_status: 'suspended',  // 정지된 회원도 조회 가능
        member_password: '$2b$10$hashedpassword'
      };

      memberRepository.findById.mockResolvedValue(mockMember);
      memberPermissionRepository.getPrimaryRole.mockResolvedValue('buyer');
      memberPermissionRepository.getRoles.mockResolvedValue(['buyer']);

      // When
      const result = await memberService.getMemberById(123);

      // Then
      expect(result.member_id).toBe(123);
      expect(result.member_status).toBe('suspended');
      expect(result.role).toBe('buyer');
      expect(result.member_password).toBeUndefined();
    });

    it('should throw NotFoundError when member not found', async () => {
      // Given
      memberRepository.findById.mockResolvedValue(null);

      // When & Then
      await expect(
        memberService.getMemberById(999)
      ).rejects.toThrow('Member not found');
    });
  });
});
```

---

## 🔗 이전 단계들과의 관계

```
Step 1-1: JWT 유틸리티
  → generateToken(), verifyToken() 제공

Step 1-2: 인증 미들웨어
  → authenticate, authorize 제공
  → req.user.member_id를 Member Service에서 사용

Step 1-3: 입력 검증 미들웨어
  → validateUpdateMember 제공
  → email/password 변경 시도 차단

Step 1-4: Member Repository
  → findActiveById, findById, findByNickname, update 제공
  → Member Service에서 사용

Step 1-5: MemberPermission Repository
  → getPrimaryRole, getRoles 제공
  → Member Service에서 사용

Step 1-6: Auth Service
  → 회원가입, 로그인 처리
  → JWT 토큰 발급

Step 1-7: Member Service ← 현재 단계!
  → 로그인 후 회원 정보 관리
  → getMyProfile, updateProfile, getMemberById 제공

Step 1-8: Auth Controller (다음)
  → authService를 호출하는 HTTP 핸들러

Step 1-9: Member Controller (다음)
  → memberService를 호출하는 HTTP 핸들러
```

---

## 🔄 다음 단계

### Step 1-8: Auth Controller

Auth Service를 호출하는 HTTP Controller를 구현할 예정입니다:

- `src/controllers/auth.controller.js`
- `register(req, res, next)` - POST /api/v1/auth/register
- `login(req, res, next)` - POST /api/v1/auth/login
- `changePassword(req, res, next)` - PUT /api/v1/auth/change-password

---

## 📚 참고 자료

### 관련 가이드
- [02. 코딩 표준](../02_CODING_STANDARDS.md)
- [04. API 개발 가이드](../04_API_DEVELOPMENT.md)

### 이전 단계
- [Step 1-4: Member Repository](./1-4_member_repository.md)
- [Step 1-5: MemberPermission Repository](./1-5_member_permission_repository.md)
- [Step 1-6: Auth Service](./1-6_auth_service.md)

---

**작성일**: 2025년 10월 2일
**작성자**: Backend Team
**상태**: ✅ 완료
