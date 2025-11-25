# Step 1-6: Auth Service 생성

> **Phase 1: 기초 인프라 구축**
> **작성일**: 2025년 10월 2일
> **상태**: ✅ 완료

---

## 📋 작업 개요

### 목적
인증(Authentication) 관련 비즈니스 로직을 담당하는 Service 레이어를 구현합니다.

### 작업 내용
- `src/services/auth.service.js` 파일 생성
- `register()` 함수 구현 - 회원가입 비즈니스 로직
- `login()` 함수 구현 - 로그인 비즈니스 로직
- `changePassword()` 함수 구현 - 비밀번호 변경 로직

---

## 🎯 Service 레이어를 사용하는 이유

### 1. 관심사 분리 (Separation of Concerns)

각 레이어가 명확한 역할을 가집니다:

| 레이어 | 역할 | 예시 |
|--------|------|------|
| **Controller** | HTTP 요청/응답 처리 | `req.body` 추출, `res.json()` 반환 |
| **Service** | 비즈니스 로직 | 중복 확인, 비밀번호 해싱, 트랜잭션 |
| **Repository** | 데이터베이스 접근 | `prisma.member.create()` |

```javascript
// ❌ Controller에 비즈니스 로직을 넣으면 (안티패턴)
async function register(req, res) {
  const { email, password } = req.body;

  // 중복 확인, 해싱, 생성, 권한 부여 모두 Controller에서
  const exists = await prisma.member.findUnique({ ... });
  const hashed = await bcrypt.hash(password, 10);
  const member = await prisma.member.create({ ... });
  // ...
}
// 문제점: Controller가 너무 많은 일을 함

// ✅ Service로 분리 (권장)
async function register(req, res) {
  const result = await authService.register(req.body);
  return successResponse(res, result, 'Registration successful', 201);
}
// 장점: Controller는 단순, Service는 테스트 가능, 재사용 가능
```

### 2. 재사용성

```javascript
// authController.js에서
const result = await authService.register({ email, password, nickname });

// adminController.js에서도 같은 로직 재사용
const result = await authService.register({ email, password, nickname });

// 테스트 코드에서도
const result = await authService.register({ email, password, nickname });
```

### 3. 트랜잭션 관리

여러 Repository 작업을 하나의 원자적 작업으로 묶을 수 있습니다:

```javascript
async function register(data) {
  // 회원 생성 + 권한 부여 → 둘 다 성공하거나 둘 다 실패
  const member = await memberRepository.create(data);
  await memberPermissionRepository.create({ member_id: member.member_id, role: 'buyer' });
  return { member };
}
```

### 4. 테스트 용이성

```javascript
// Service 테스트 (단위 테스트)
describe('authService.register', () => {
  it('should throw error when email exists', async () => {
    memberRepository.existsByEmail = jest.fn(() => true);

    await expect(
      authService.register({ email: 'existing@example.com' })
    ).rejects.toThrow('Email already exists');
  });
});
```

---

## 📁 파일 위치

```
src/
└── services/
    └── auth.service.js  ← 생성한 파일
```

---

## 💻 구현 코드

### 전체 구조

```javascript
const bcrypt = require('bcrypt');
const memberRepository = require('../repositories/member.repository');
const memberPermissionRepository = require('../repositories/memberPermission.repository');
const { generateToken } = require('../utils/jwt');
const { ValidationError, UnauthorizedError, NotFoundError } = require('../utils/errors');

// 3개의 함수 제공:
// - register(data) - 회원가입
// - login(email, password) - 로그인
// - changePassword(memberId, currentPassword, newPassword) - 비밀번호 변경
```

---

## 🔧 함수 설명

### 1. `register(data)` - 회원가입

**역할**: 새 회원을 등록하고 JWT 토큰을 발급합니다.

**파라미터**:
```javascript
data = {
  email: 'user@example.com',
  password: 'secure123!',      // 평문 (해싱 전)
  nickname: '홍길동',
  phone: '010-1234-5678'       // 선택
}
```

**반환값**:
```javascript
{
  member: {
    member_id: 123,
    member_email: 'user@example.com',
    member_nickname: '홍길동',
    member_phone: '010-1234-5678',
    member_status: 'active',
    member_created_at: '2025-10-02T00:00:00.000Z',
    role: 'buyer',              // 주 역할
    roles: ['buyer']            // 모든 역할
  },
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
}
```

**처리 과정**:
```
1. memberRepository.existsByEmail() - 이메일 중복 확인
   → 중복이면 ValidationError
   ↓
2. memberRepository.existsByNickname() - 닉네임 중복 확인
   → 중복이면 ValidationError
   ↓
3. bcrypt.hash(password, 10) - 비밀번호 해싱
   → '$2b$10$abc...'
   ↓
4. memberRepository.create() - 회원 생성
   → { member_id: 123, ... }
   ↓
5. memberPermissionRepository.create() - 권한 부여
   → { permission_id: 1, permission_role: 'buyer' }
   ↓
6. generateToken() - JWT 토큰 생성
   → 'eyJhbGci...'
   ↓
7. return { member, token }
```

**사용 예시**:
```javascript
// authController.js에서
const result = await authService.register({
  email: 'user@example.com',
  password: 'secure123!',
  nickname: '홍길동',
  phone: '010-1234-5678'
});

console.log(result.member.member_id);  // 123
console.log(result.token);             // 'eyJhbGci...'
```

**에러 처리**:
```javascript
try {
  const result = await authService.register({ email: 'existing@example.com', ... });
} catch (error) {
  if (error instanceof ValidationError) {
    // 400 Bad Request
    // "Email already exists" 또는 "Nickname already exists"
  }
}
```

---

### 2. `login(email, password)` - 로그인

**역할**: 이메일과 비밀번호로 인증하고 JWT 토큰을 발급합니다.

**파라미터**:
```javascript
email: 'user@example.com'
password: 'secure123!'  // 평문
```

**반환값**:
```javascript
{
  member: {
    member_id: 123,
    member_email: 'user@example.com',
    member_nickname: '홍길동',
    member_status: 'active',
    role: 'seller',              // 주 역할 (seller > admin > buyer 우선순위)
    roles: ['buyer', 'seller']   // 모든 역할
  },
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
}
```

**처리 과정**:
```
1. memberRepository.findByEmail() - 회원 조회
   → null이면 UnauthorizedError
   ↓
2. member_status === 'active' 확인
   → 'suspended' 또는 'inactive'면 UnauthorizedError
   ↓
3. bcrypt.compare(password, member.member_password) - 비밀번호 검증
   → false면 UnauthorizedError
   ↓
4. memberPermissionRepository.getPrimaryRole() - 주 역할 조회
   → 'seller' (seller > admin > buyer 우선순위)
   ↓
5. memberPermissionRepository.getRoles() - 모든 역할 조회
   → ['buyer', 'seller']
   ↓
6. generateToken() - JWT 토큰 생성
   → payload: { member_id, email, role, roles }
   ↓
7. return { member, token }
```

**사용 예시**:
```javascript
// authController.js에서
const result = await authService.login('user@example.com', 'secure123!');

console.log(result.member.role);   // 'seller' (주 역할)
console.log(result.member.roles);  // ['buyer', 'seller'] (모든 역할)
console.log(result.token);         // 'eyJhbGci...'
```

**에러 처리**:
```javascript
try {
  const result = await authService.login('user@example.com', 'wrongpass');
} catch (error) {
  if (error instanceof UnauthorizedError) {
    // 401 Unauthorized
    // "Invalid credentials" 또는 "Account is suspended or deleted"
  }
}
```

**보안 고려사항**:
```javascript
// ❌ 상세한 에러 메시지 (정보 노출)
if (!member) throw new Error('Email not found');
if (!isValid) throw new Error('Password incorrect');
// 해커가 이메일 존재 여부를 알 수 있음

// ✅ 통일된 에러 메시지
if (!member || !isValid) {
  throw new UnauthorizedError('Invalid credentials');
}
// 해커가 이메일 존재 여부를 알 수 없음
```

---

### 3. `changePassword(memberId, currentPassword, newPassword)` - 비밀번호 변경

**역할**: 현재 비밀번호를 확인하고 새 비밀번호로 변경합니다.

**파라미터**:
```javascript
memberId: 123
currentPassword: 'oldpass123!'  // 평문
newPassword: 'newpass456!'      // 평문
```

**반환값**:
```javascript
{
  message: 'Password changed successfully'
}
```

**처리 과정**:
```
1. memberRepository.findById() - 회원 조회
   → null이면 NotFoundError
   ↓
2. bcrypt.compare(currentPassword, member.member_password) - 현재 비밀번호 검증
   → false면 UnauthorizedError
   ↓
3. bcrypt.compare(newPassword, member.member_password) - 새 비밀번호와 현재 비밀번호 같은지 확인
   → true면 ValidationError (같은 비밀번호는 안 됨)
   ↓
4. bcrypt.hash(newPassword, 10) - 새 비밀번호 해싱
   → '$2b$10$xyz...'
   ↓
5. memberRepository.updatePassword() - 비밀번호 업데이트
   ↓
6. return { message: 'Password changed successfully' }
```

**사용 예시**:
```javascript
// authController.js에서
await authService.changePassword(
  req.user.member_id,      // JWT에서 추출한 회원 ID
  'oldpass123!',
  'newpass456!'
);

// 반환: { message: 'Password changed successfully' }
```

**에러 처리**:
```javascript
try {
  await authService.changePassword(123, 'wrongpass', 'newpass456!');
} catch (error) {
  if (error instanceof UnauthorizedError) {
    // 401 Unauthorized
    // "Current password is incorrect"
  } else if (error instanceof ValidationError) {
    // 400 Bad Request
    // "New password must be different from current password"
  } else if (error instanceof NotFoundError) {
    // 404 Not Found
    // "Member not found"
  }
}
```

---

## 🔄 전체 데이터 흐름

### 회원가입 시나리오

```
📱 클라이언트
POST /api/v1/auth/register
Body: { email, password, nickname, phone }
    ↓
🔍 validateRegister 미들웨어 (Step 1-3)
- 이메일 형식 검증 ✅
- 비밀번호 강도 검증 ✅
- 닉네임 형식 검증 ✅
    ↓
🎯 authController.register (Step 1-8 예정)
- req.body 추출
- authService.register() 호출 ← 여기부터 Service!
    ↓
💼 authService.register (Step 1-6 - 현재!)
┌──────────────────────────────────────────────┐
│ 1. memberRepository.existsByEmail()          │
│    → false (사용 가능한 이메일)                │
│                                              │
│ 2. memberRepository.existsByNickname()       │
│    → false (사용 가능한 닉네임)                │
│                                              │
│ 3. bcrypt.hash('secure123!', 10)            │
│    → '$2b$10$abc123...'                     │
│                                              │
│ 4. memberRepository.create({                │
│      member_email: 'user@example.com',      │
│      member_password: '$2b$10$abc123...',   │
│      member_nickname: '홍길동',              │
│      member_phone: '010-1234-5678'          │
│    })                                        │
│    → { member_id: 123, ... }                │
│                                              │
│ 5. memberPermissionRepository.create({      │
│      member_id: 123,                        │
│      permission_role: 'buyer'               │
│    })                                        │
│    → { permission_id: 1, ... }              │
│                                              │
│ 6. generateToken({                          │
│      member_id: 123,                        │
│      email: 'user@example.com',             │
│      role: 'buyer'                          │
│    })                                        │
│    → 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'│
│                                              │
│ 7. return { member, token }                 │
└──────────────────────────────────────────────┘
    ↓
🎯 authController.register
- successResponse(res, result, 'Registration successful', 201)
    ↓
✅ 클라이언트 응답 (201 Created)
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "member": {
      "member_id": 123,
      "member_email": "user@example.com",
      "member_nickname": "홍길동",
      "role": "buyer",
      "roles": ["buyer"]
    },
    "token": "eyJhbGci..."
  }
}
```

---

### 로그인 시나리오

```
📱 클라이언트
POST /api/v1/auth/login
Body: { email: 'user@example.com', password: 'secure123!' }
    ↓
🔍 validateLogin 미들웨어 (Step 1-3)
- 이메일 형식 검증 ✅
- 비밀번호 필수 검증 ✅
    ↓
🎯 authController.login
- authService.login() 호출
    ↓
💼 authService.login
┌──────────────────────────────────────────────┐
│ 1. memberRepository.findByEmail()            │
│    → { member_id: 123, member_password: ... }│
│                                              │
│ 2. member_status === 'active' 확인           │
│    → true (활성 회원)                         │
│                                              │
│ 3. bcrypt.compare('secure123!', hashed)     │
│    → true (비밀번호 일치)                      │
│                                              │
│ 4. memberPermissionRepository.getPrimaryRole│
│    → 'seller' (buyer + seller 중 seller 우선) │
│                                              │
│ 5. memberPermissionRepository.getRoles()    │
│    → ['buyer', 'seller']                    │
│                                              │
│ 6. generateToken({ member_id, email, role })│
│    → 'eyJhbGci...'                          │
│                                              │
│ 7. return { member, token }                 │
└──────────────────────────────────────────────┘
    ↓
✅ 클라이언트 응답 (200 OK)
{
  "success": true,
  "message": "Login successful",
  "data": {
    "member": { ... },
    "token": "eyJhbGci..."
  }
}
```

---

## 📊 Service vs Repository vs Controller 비교

| 항목 | **Controller** | **Service** | **Repository** |
|------|---------------|------------|----------------|
| **역할** | HTTP 처리 | 비즈니스 로직 | 데이터 접근 |
| **예시** | `req.body` 추출, `res.json()` 반환 | 중복 확인 + 해싱 + 생성 | `prisma.member.create()` |
| **호출 대상** | Service 호출 | Repository 호출 | Database 호출 |
| **에러 처리** | try-catch, next(error) | throw CustomError | throw Error |
| **테스트** | 통합 테스트 (API) | 단위 테스트 (Mock Repository) | 단위 테스트 (Mock Prisma) |
| **HTTP 의존** | O (req, res, next) | X | X |

**예시**:

```javascript
// Controller - HTTP 요청/응답 처리
async function register(req, res, next) {
  try {
    const { email, password, nickname } = req.body;
    const result = await authService.register({ email, password, nickname });
    return successResponse(res, result, 'Registration successful', 201);
  } catch (error) {
    next(error);
  }
}

// Service - 비즈니스 로직 (여러 Repository 조합)
async function register(data) {
  if (await memberRepository.existsByEmail(data.email)) {
    throw new ValidationError('Email exists');
  }
  const hashed = await bcrypt.hash(data.password, 10);
  const member = await memberRepository.create({ ...data, password: hashed });
  await memberPermissionRepository.create({ member_id: member.member_id, role: 'buyer' });
  const token = generateToken({ ... });
  return { member, token };
}

// Repository - 데이터 접근
async function create(memberData) {
  return await prisma.member.create({ data: memberData });
}
```

---

## 🔐 보안 고려사항

### 1. 비밀번호 해싱 (bcrypt)

**bcrypt 사용 이유**:
- Salt 자동 생성 (같은 비밀번호도 다른 해시값)
- 느린 해싱 (무차별 대입 공격 방지)
- 단방향 암호화 (복호화 불가능)

```javascript
// 회원가입 시 해싱
const hashedPassword = await bcrypt.hash('password123', 10);
// '$2b$10$abc123...' (매번 다른 값)

// 로그인 시 검증
const isValid = await bcrypt.compare('password123', hashedPassword);
// true (원본 비밀번호와 해시값 비교)
```

**Salt Rounds**: 10
- 10 = 2^10 = 1024번 해싱 반복
- 값이 클수록 보안 ↑, 속도 ↓
- 권장값: 10~12

### 2. 민감 정보 제외

```javascript
// ❌ 비밀번호 포함 반환
return { member };  // member_password가 포함됨

// ✅ 비밀번호 제외
const { member_password, ...memberData } = member;
return { member: memberData };
```

### 3. 에러 메시지 통일 (정보 노출 방지)

```javascript
// ❌ 상세한 에러 메시지
if (!member) throw new Error('Email not found');
if (!isValid) throw new Error('Password incorrect');
// 해커가 이메일 존재 여부를 알 수 있음

// ✅ 통일된 에러 메시지
if (!member || !isValid) {
  throw new UnauthorizedError('Invalid credentials');
}
// 해커가 이메일 존재 여부를 알 수 없음
```

### 4. 계정 상태 확인

```javascript
// 로그인 시 반드시 상태 확인
if (member.member_status !== 'active') {
  throw new UnauthorizedError('Account is suspended or deleted');
}
// 정지(suspended) 또는 탈퇴(inactive) 회원 차단
```

---

## ⚠️ 주의사항

### 1. Service는 HTTP를 모름

```javascript
// ❌ Service에서 req, res 사용 금지
async function register(req, res) {
  const member = await memberRepository.create(req.body);
  res.json({ member });  // 안 됨!
}

// ✅ 값만 받고, 값만 반환
async function register(data) {
  const member = await memberRepository.create(data);
  return { member };
}
```

### 2. 에러는 throw, 응답은 반환

```javascript
// Service
async function login(email, password) {
  if (!member) {
    throw new UnauthorizedError('Invalid credentials');  // throw
  }
  return { member, token };  // return
}

// Controller에서 catch
try {
  const result = await authService.login(email, password);
  return successResponse(res, result);
} catch (error) {
  next(error);  // errorHandler 미들웨어로 전달
}
```

### 3. BigInt → Number 변환

```javascript
// Prisma는 BigInt 반환
const member = await memberRepository.create({ ... });
console.log(member.member_id);  // 123n (BigInt)

// JWT 토큰 생성 시 Number로 변환
const token = generateToken({
  member_id: Number(member.member_id),  // 123 (Number)
  email: member.member_email
});
```

### 4. 비밀번호는 평문으로 받고, 해싱 후 저장

```javascript
// ✅ Service가 해싱 담당
async function register(data) {
  const hashedPassword = await bcrypt.hash(data.password, 10);  // 평문 → 해시
  const member = await memberRepository.create({
    ...data,
    member_password: hashedPassword  // 해시값 저장
  });
}

// ❌ Controller에서 해싱 X
// ❌ Repository에서 해싱 X
```

### 5. 트랜잭션 고려

현재는 순차 실행이지만, 향후 트랜잭션 필요 시:

```javascript
// Prisma 트랜잭션
async function register(data) {
  return await prisma.$transaction(async (tx) => {
    const member = await tx.member.create({ ... });
    await tx.member_permission.create({ ... });
    return { member };
  });
  // 둘 다 성공하거나 둘 다 실패 (원자성 보장)
}
```

---

## 🧪 테스트 예시

### Jest 단위 테스트

```javascript
// __tests__/services/auth.service.test.js
const authService = require('../../src/services/auth.service');
const memberRepository = require('../../src/repositories/member.repository');
const memberPermissionRepository = require('../../src/repositories/memberPermission.repository');
const bcrypt = require('bcrypt');

// Repository Mock
jest.mock('../../src/repositories/member.repository');
jest.mock('../../src/repositories/memberPermission.repository');
jest.mock('bcrypt');

describe('Auth Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new member successfully', async () => {
      // Given
      const mockData = {
        email: 'user@example.com',
        password: 'secure123!',
        nickname: '홍길동',
        phone: '010-1234-5678'
      };

      memberRepository.existsByEmail.mockResolvedValue(false);
      memberRepository.existsByNickname.mockResolvedValue(false);
      bcrypt.hash.mockResolvedValue('$2b$10$hashedpassword');
      memberRepository.create.mockResolvedValue({
        member_id: 1n,
        member_email: 'user@example.com',
        member_nickname: '홍길동',
        member_password: '$2b$10$hashedpassword'
      });
      memberPermissionRepository.create.mockResolvedValue({
        permission_id: 1n,
        member_id: 1n,
        permission_role: 'buyer'
      });

      // When
      const result = await authService.register(mockData);

      // Then
      expect(result.member.member_email).toBe('user@example.com');
      expect(result.member.role).toBe('buyer');
      expect(result.token).toBeDefined();
      expect(memberRepository.existsByEmail).toHaveBeenCalledWith('user@example.com');
      expect(bcrypt.hash).toHaveBeenCalledWith('secure123!', 10);
      expect(memberPermissionRepository.create).toHaveBeenCalledWith({
        member_id: 1,
        permission_role: 'buyer'
      });
    });

    it('should throw error when email already exists', async () => {
      // Given
      memberRepository.existsByEmail.mockResolvedValue(true);

      // When & Then
      await expect(
        authService.register({ email: 'existing@example.com' })
      ).rejects.toThrow('Email already exists');
    });

    it('should throw error when nickname already exists', async () => {
      // Given
      memberRepository.existsByEmail.mockResolvedValue(false);
      memberRepository.existsByNickname.mockResolvedValue(true);

      // When & Then
      await expect(
        authService.register({ email: 'new@example.com', nickname: '홍길동' })
      ).rejects.toThrow('Nickname already exists');
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      // Given
      const mockMember = {
        member_id: 1n,
        member_email: 'user@example.com',
        member_password: '$2b$10$hashedpassword',
        member_status: 'active'
      };

      memberRepository.findByEmail.mockResolvedValue(mockMember);
      bcrypt.compare.mockResolvedValue(true);
      memberPermissionRepository.getPrimaryRole.mockResolvedValue('seller');
      memberPermissionRepository.getRoles.mockResolvedValue(['buyer', 'seller']);

      // When
      const result = await authService.login('user@example.com', 'secure123!');

      // Then
      expect(result.member.member_email).toBe('user@example.com');
      expect(result.member.role).toBe('seller');
      expect(result.member.roles).toEqual(['buyer', 'seller']);
      expect(result.token).toBeDefined();
    });

    it('should throw error with invalid email', async () => {
      // Given
      memberRepository.findByEmail.mockResolvedValue(null);

      // When & Then
      await expect(
        authService.login('notfound@example.com', 'password')
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw error with invalid password', async () => {
      // Given
      memberRepository.findByEmail.mockResolvedValue({
        member_id: 1n,
        member_password: '$2b$10$hashedpassword',
        member_status: 'active'
      });
      bcrypt.compare.mockResolvedValue(false);

      // When & Then
      await expect(
        authService.login('user@example.com', 'wrongpassword')
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw error when account is inactive', async () => {
      // Given
      memberRepository.findByEmail.mockResolvedValue({
        member_id: 1n,
        member_status: 'inactive'
      });

      // When & Then
      await expect(
        authService.login('user@example.com', 'password')
      ).rejects.toThrow('Account is suspended or deleted');
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      // Given
      const mockMember = {
        member_id: 1n,
        member_password: '$2b$10$oldhashedpassword'
      };

      memberRepository.findById.mockResolvedValue(mockMember);
      bcrypt.compare
        .mockResolvedValueOnce(true)   // 현재 비밀번호 일치
        .mockResolvedValueOnce(false); // 새 비밀번호와 다름
      bcrypt.hash.mockResolvedValue('$2b$10$newhashedpassword');
      memberRepository.updatePassword.mockResolvedValue(mockMember);

      // When
      const result = await authService.changePassword(1, 'oldpass123!', 'newpass456!');

      // Then
      expect(result.message).toBe('Password changed successfully');
      expect(memberRepository.updatePassword).toHaveBeenCalledWith(1, '$2b$10$newhashedpassword');
    });

    it('should throw error when current password is incorrect', async () => {
      // Given
      memberRepository.findById.mockResolvedValue({
        member_id: 1n,
        member_password: '$2b$10$hashedpassword'
      });
      bcrypt.compare.mockResolvedValue(false);

      // When & Then
      await expect(
        authService.changePassword(1, 'wrongpass', 'newpass456!')
      ).rejects.toThrow('Current password is incorrect');
    });

    it('should throw error when new password is same as current', async () => {
      // Given
      memberRepository.findById.mockResolvedValue({
        member_id: 1n,
        member_password: '$2b$10$hashedpassword'
      });
      bcrypt.compare
        .mockResolvedValueOnce(true)  // 현재 비밀번호 일치
        .mockResolvedValueOnce(true); // 새 비밀번호도 같음

      // When & Then
      await expect(
        authService.changePassword(1, 'samepass', 'samepass')
      ).rejects.toThrow('New password must be different from current password');
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

Step 1-3: 입력 검증 미들웨어
  → validateRegister, validateLogin 제공

Step 1-4: Member Repository
  → findByEmail, create, updatePassword 제공

Step 1-5: MemberPermission Repository
  → create, getPrimaryRole, getRoles 제공

Step 1-6: Auth Service ← 현재 단계!
  → 위의 모든 것을 조합하여 비즈니스 로직 구현
  → register, login, changePassword 제공

Step 1-7: Member Service (다음)
  → 회원 정보 조회/수정 로직

Step 1-8: Auth Controller (다음)
  → authService를 호출하는 HTTP 핸들러
```

---

## 🔄 다음 단계

### Step 1-7: Member Service

회원 정보 조회/수정 로직을 구현할 예정입니다:

- `src/services/member.service.js`
- `getMyProfile(memberId)` - 내 정보 조회
- `updateProfile(memberId, updateData)` - 정보 수정
- `getMemberById(memberId)` - 관리자용 회원 조회

---

## 📚 참고 자료

### 공식 문서
- [bcrypt 라이브러리](https://github.com/kelektiv/node.bcrypt.js)
- [JWT 공식 사이트](https://jwt.io)

### 관련 가이드
- [02. 코딩 표준](../02_CODING_STANDARDS.md)
- [04. API 개발 가이드](../04_API_DEVELOPMENT.md)

### 이전 단계
- [Step 1-1: JWT 유틸리티](./1-1_jwt_util.md)
- [Step 1-2: 인증 미들웨어](./1-2_auth_middleware.md)
- [Step 1-3: 입력 검증 미들웨어](./1-3_validation_middleware.md)
- [Step 1-4: Member Repository](./1-4_member_repository.md)
- [Step 1-5: MemberPermission Repository](./1-5_member_permission_repository.md)

---

**작성일**: 2025년 10월 2일
**작성자**: Backend Team
**상태**: ✅ 완료
