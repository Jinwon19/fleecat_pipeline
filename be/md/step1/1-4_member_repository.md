# Step 1-4: Member Repository 생성

> **Phase 1: 기초 인프라 구축**
> **작성일**: 2025년 10월 1일
> **상태**: ✅ 완료

---

## 📋 작업 개요

### 목적
member 테이블에 대한 데이터 접근 계층(Repository)을 구현하여 비즈니스 로직에서 데이터베이스 접근을 추상화합니다.

### 작업 내용
- `src/repositories/member.repository.js` 파일 생성
- Prisma를 사용한 CRUD 함수 구현
- 조회, 생성, 수정, 삭제 기능 제공

---

## 🎯 Repository 패턴을 사용하는 이유

### 1. 관심사 분리 (Separation of Concerns)
- **Service**: 비즈니스 로직만 담당
- **Repository**: 데이터 접근만 담당
- 각 계층이 자신의 역할에만 집중

### 2. 재사용성
```javascript
// 여러 서비스에서 같은 Repository 함수 재사용
// authService.js
const member = await memberRepository.findByEmail(email);

// memberService.js
const member = await memberRepository.findByEmail(email);

// adminService.js
const member = await memberRepository.findByEmail(email);
```

### 3. 테스트 용이성
```javascript
// 테스트 시 Repository를 Mock으로 대체 가능
jest.mock('../repositories/member.repository', () => ({
  findByEmail: jest.fn()
}));
```

### 4. 데이터베이스 독립성
```javascript
// Repository만 수정하면 DB 변경 가능
// Service 코드는 그대로 유지

// Before: Prisma
return await prisma.member.findUnique({ ... });

// After: MongoDB
return await Member.findOne({ ... });
```

---

## 📁 파일 위치

```
src/
└── repositories/
    └── member.repository.js  ← 생성한 파일
```

---

## 💻 구현 코드

### 전체 구조

```javascript
const prisma = require('../config/database');

// 11개의 함수 제공:
// - 조회: findById, findByEmail, findByNickname, findActiveById, findAll
// - 존재 확인: existsByEmail, existsByNickname
// - 생성: create
// - 수정: update, updatePassword
// - 삭제: deleteById (Soft Delete)
```

---

## 🔧 함수 설명

### 1. 조회 함수 (Read)

#### `findById(memberId)`
**역할**: ID로 회원 조회

**파라미터**:
- `memberId` (number): 회원 ID

**반환값**:
- 성공: 회원 정보 객체 (member_permission, company 포함)
- 실패: null

**사용 예시**:
```javascript
const member = await memberRepository.findById(123);

if (member) {
  console.log(member.member_email);       // 'user@example.com'
  console.log(member.member_nickname);    // '홍길동'
  console.log(member.member_permission);  // [{ permission_role: 'buyer' }]
  console.log(member.company);            // { company_name: '회사명' } 또는 null
}
```

**특징**:
- `include`로 관련 테이블 조인 (member_permission, company)
- BigInt 변환 처리

---

#### `findByEmail(email)`
**역할**: 이메일로 회원 조회 (로그인, 중복 확인 시 사용)

**파라미터**:
- `email` (string): 이메일 주소

**반환값**:
- 성공: 회원 정보 객체
- 실패: null

**사용 예시**:
```javascript
// 로그인 시
const member = await memberRepository.findByEmail('user@example.com');

if (!member) {
  throw new UnauthorizedError('Invalid credentials');
}

// 비밀번호 검증
const isValid = await bcrypt.compare(password, member.member_password);
```

**특징**:
- `member_email`은 UNIQUE 제약조건이 있어 최대 1개만 반환
- 권한 정보도 함께 조회 (member_permission)

---

#### `findByNickname(nickname)`
**역할**: 닉네임으로 회원 조회

**파라미터**:
- `nickname` (string): 닉네임

**반환값**:
- 성공: 회원 정보 객체
- 실패: null

**사용 예시**:
```javascript
// 닉네임 중복 확인
const existing = await memberRepository.findByNickname('홍길동');

if (existing) {
  throw new ValidationError('Nickname already exists');
}
```

---

#### `findActiveById(memberId)`
**역할**: 활성 회원만 조회 (member_status가 'active'인 회원)

**파라미터**:
- `memberId` (number): 회원 ID

**반환값**:
- 성공: 활성 회원 정보
- 실패: null (탈퇴했거나 정지된 회원)

**사용 예시**:
```javascript
// 로그인된 사용자 정보 조회 시
const member = await memberRepository.findActiveById(req.user.member_id);

if (!member) {
  throw new UnauthorizedError('Account is suspended or deleted');
}
```

**특징**:
- `findById`와 달리 `member_status: 'active'` 조건 추가
- 탈퇴/정지 회원 필터링

---

#### `findAll(options)`
**역할**: 모든 회원 조회 (관리자용, 페이지네이션 지원)

**파라미터**:
```javascript
options = {
  page: 1,           // 페이지 번호
  limit: 10,         // 페이지당 항목 수
  status: 'active'   // 상태 필터 (선택)
}
```

**반환값**:
```javascript
{
  members: [...],    // 회원 목록
  total: 150,        // 전체 회원 수
  page: 1,           // 현재 페이지
  totalPages: 15     // 전체 페이지 수
}
```

**사용 예시**:
```javascript
// 전체 회원 조회 (페이지 1, 10명씩)
const result = await memberRepository.findAll({ page: 1, limit: 10 });

console.log(`전체 ${result.total}명 중 ${result.members.length}명 조회`);
console.log(`${result.page}/${result.totalPages} 페이지`);

// 활성 회원만 조회
const activeMembers = await memberRepository.findAll({
  page: 1,
  limit: 10,
  status: 'active'
});
```

**특징**:
- 페이지네이션 자동 계산
- 상태 필터링 지원
- 최신 가입순 정렬 (member_created_at DESC)

---

### 2. 존재 확인 함수

#### `existsByEmail(email)`
**역할**: 이메일 중복 확인

**파라미터**:
- `email` (string): 이메일 주소

**반환값**:
- `true`: 이메일이 이미 존재
- `false`: 사용 가능한 이메일

**사용 예시**:
```javascript
// 회원가입 시 중복 확인
if (await memberRepository.existsByEmail('user@example.com')) {
  throw new ValidationError('Email already exists');
}

// 생성 진행
await memberRepository.create({ ... });
```

**특징**:
- `findByEmail`보다 가벼움 (count만 조회)
- Boolean 반환으로 조건문에 바로 사용 가능

---

#### `existsByNickname(nickname)`
**역할**: 닉네임 중복 확인

**파라미터**:
- `nickname` (string): 닉네임

**반환값**:
- `true`: 닉네임이 이미 존재
- `false`: 사용 가능한 닉네임

**사용 예시**:
```javascript
// 닉네임 중복 확인
if (await memberRepository.existsByNickname('홍길동')) {
  throw new ValidationError('Nickname already exists');
}
```

---

### 3. 생성 함수 (Create)

#### `create(memberData)`
**역할**: 새 회원 생성

**파라미터**:
```javascript
memberData = {
  member_email: 'user@example.com',     // 필수
  member_password: 'hashed_password',   // 필수 (해싱된 비밀번호)
  member_nickname: '홍길동',             // 필수
  member_phone: '010-1234-5678',        // 선택
  member_status: 'active',              // 선택 (기본값: 'active')
  company_id: 10                        // 선택
}
```

**반환값**:
- 생성된 회원 정보 객체

**사용 예시**:
```javascript
// authService.js에서 회원가입
const hashedPassword = await bcrypt.hash(password, 10);

const member = await memberRepository.create({
  member_email: 'user@example.com',
  member_password: hashedPassword,
  member_nickname: '홍길동',
  member_phone: '010-1234-5678'
});

console.log(`회원 생성 완료: ID ${member.member_id}`);
```

**특징**:
- `member_created_at`, `member_updated_at`는 자동 설정
- 기본 상태는 'active'
- company_id는 선택 (null 가능)

---

### 4. 수정 함수 (Update)

#### `update(memberId, updateData)`
**역할**: 회원 정보 수정

**파라미터**:
```javascript
memberId = 123;

updateData = {
  member_nickname: '새닉네임',       // 선택
  member_phone: '010-9999-8888',    // 선택
  member_status: 'suspended'        // 선택
}
```

**반환값**:
- 수정된 회원 정보 객체

**사용 예시**:
```javascript
// 회원 정보 수정
const updated = await memberRepository.update(123, {
  member_nickname: '새닉네임',
  member_phone: '010-9999-8888'
});

console.log(updated.member_nickname);  // '새닉네임'
```

**특징**:
- `member_updated_at`는 자동 갱신
- 제공된 필드만 수정 (부분 업데이트)

---

#### `updatePassword(memberId, hashedPassword)`
**역할**: 비밀번호 변경 (전용 함수)

**파라미터**:
- `memberId` (number): 회원 ID
- `hashedPassword` (string): 해싱된 새 비밀번호

**반환값**:
- 수정된 회원 정보 객체

**사용 예시**:
```javascript
// authService.js에서 비밀번호 변경
async function changePassword(memberId, currentPassword, newPassword) {
  // 1. 현재 비밀번호 확인
  const member = await memberRepository.findById(memberId);
  const isValid = await bcrypt.compare(currentPassword, member.member_password);

  if (!isValid) {
    throw new UnauthorizedError('Current password is incorrect');
  }

  // 2. 새 비밀번호 해싱
  const hashedNewPassword = await bcrypt.hash(newPassword, 10);

  // 3. 비밀번호 업데이트
  await memberRepository.updatePassword(memberId, hashedNewPassword);

  return { message: 'Password changed successfully' };
}
```

**특징**:
- 비밀번호 변경 전용 함수 (명시적)
- `update()` 대신 이 함수 사용 권장

---

### 5. 삭제 함수 (Delete)

#### `deleteById(memberId)`
**역할**: 회원 삭제 (Soft Delete - 실제로는 상태 변경)

**파라미터**:
- `memberId` (number): 회원 ID

**반환값**:
- 수정된 회원 정보 객체 (member_status: 'inactive')

**사용 예시**:
```javascript
// 회원 탈퇴
const deleted = await memberRepository.deleteById(123);

console.log(deleted.member_status);  // 'inactive'
```

**Soft Delete란?**
- 실제로 DB에서 삭제하지 않음
- `member_status`를 'inactive'로 변경
- 주문 내역 등 관련 데이터 보존
- 법적 요구사항 (거래 기록 보관)

**Hard Delete vs Soft Delete**:
```javascript
// ❌ Hard Delete (실제 삭제)
await prisma.member.delete({ where: { member_id: 123 } });
// 문제: 주문 기록도 함께 삭제됨 (CASCADE)

// ✅ Soft Delete (상태 변경)
await prisma.member.update({
  where: { member_id: 123 },
  data: { member_status: 'inactive' }
});
// 장점: 데이터는 보존, 로그인만 차단
```

---

## 🔄 실제 사용 흐름

### 회원가입 시나리오 (authService.js)

```javascript
const memberRepository = require('../repositories/member.repository');
const bcrypt = require('bcrypt');
const { ValidationError } = require('../utils/errors');

async function register(email, password, nickname, phone) {
  // 1. 이메일 중복 확인
  if (await memberRepository.existsByEmail(email)) {
    throw new ValidationError('Email already exists');
  }

  // 2. 닉네임 중복 확인
  if (await memberRepository.existsByNickname(nickname)) {
    throw new ValidationError('Nickname already exists');
  }

  // 3. 비밀번호 해싱
  const hashedPassword = await bcrypt.hash(password, 10);

  // 4. 회원 생성
  const member = await memberRepository.create({
    member_email: email,
    member_password: hashedPassword,
    member_nickname: nickname,
    member_phone: phone
  });

  // 5. 권한 생성 (memberPermissionRepository 사용 - Step 1-5)
  await memberPermissionRepository.create({
    member_id: member.member_id,
    permission_role: 'buyer'
  });

  // 6. JWT 토큰 생성
  const token = generateToken({
    member_id: member.member_id,
    email: member.member_email,
    role: 'buyer'
  });

  return { member, token };
}
```

---

### 로그인 시나리오 (authService.js)

```javascript
async function login(email, password) {
  // 1. 이메일로 회원 조회
  const member = await memberRepository.findByEmail(email);

  if (!member) {
    throw new UnauthorizedError('Invalid credentials');
  }

  // 2. 회원 상태 확인
  if (member.member_status !== 'active') {
    throw new UnauthorizedError('Account is suspended or deleted');
  }

  // 3. 비밀번호 검증
  const isValid = await bcrypt.compare(password, member.member_password);

  if (!isValid) {
    throw new UnauthorizedError('Invalid credentials');
  }

  // 4. 역할 정보 가져오기
  const role = member.member_permission[0]?.permission_role || 'buyer';

  // 5. JWT 토큰 생성
  const token = generateToken({
    member_id: member.member_id,
    email: member.member_email,
    role
  });

  return { member, token };
}
```

---

### 회원 정보 조회 시나리오 (memberService.js)

```javascript
async function getMyProfile(memberId) {
  // 활성 회원만 조회
  const member = await memberRepository.findActiveById(memberId);

  if (!member) {
    throw new NotFoundError('Member not found or inactive');
  }

  // 비밀번호 제외하고 반환
  const { member_password, ...memberData } = member;

  return memberData;
}
```

---

### 회원 정보 수정 시나리오 (memberService.js)

```javascript
async function updateProfile(memberId, updateData) {
  // 1. 닉네임 변경 시 중복 확인
  if (updateData.member_nickname) {
    const existing = await memberRepository.findByNickname(updateData.member_nickname);

    // 자기 자신이 아니면서 같은 닉네임이 있으면 에러
    if (existing && existing.member_id !== BigInt(memberId)) {
      throw new ValidationError('Nickname already exists');
    }
  }

  // 2. 회원 정보 수정
  const updated = await memberRepository.update(memberId, {
    member_nickname: updateData.member_nickname,
    member_phone: updateData.member_phone
  });

  return updated;
}
```

---

## 📊 데이터 흐름도

```
Controller
    ↓ (HTTP 요청)
Service
    ↓ (비즈니스 로직)
Repository ← Step 1-4 (여기!)
    ↓ (Prisma 쿼리)
Database
```

### 예시: POST /auth/register

```
1. authController.register
   - req.body에서 데이터 추출
   - authService.register() 호출
       ↓
2. authService.register
   - memberRepository.existsByEmail() 호출
   - memberRepository.existsByNickname() 호출
   - bcrypt.hash() 실행
   - memberRepository.create() 호출
   - memberPermissionRepository.create() 호출
   - generateToken() 호출
       ↓
3. memberRepository.create
   - prisma.member.create() 실행
   - DB에 INSERT
       ↓
4. Database
   - member 테이블에 레코드 추가
   - member_id 자동 생성 (AUTO_INCREMENT)
```

---

## ⚠️ 주의사항

### 1. BigInt 처리

Prisma에서 `BigInt` 타입은 JavaScript의 `BigInt`로 변환됩니다:

```javascript
// ✅ 올바른 사용
const member = await memberRepository.findById(123);
// 내부적으로 BigInt(123)로 변환

// ❌ 잘못된 사용 (BigInt를 직접 전달)
const member = await memberRepository.findById(BigInt(123));
// BigInt(BigInt(123)) → 에러 발생 가능
```

**Repository에서 변환 처리**:
```javascript
async function findById(memberId) {
  return await prisma.member.findUnique({
    where: { member_id: BigInt(memberId) }  // ← 여기서 변환
  });
}
```

### 2. 비밀번호는 해싱 후 저장

```javascript
// ❌ 평문 비밀번호 저장 금지
await memberRepository.create({
  member_password: 'password123'  // 위험!
});

// ✅ 해싱된 비밀번호 저장
const hashedPassword = await bcrypt.hash('password123', 10);
await memberRepository.create({
  member_password: hashedPassword
});
```

### 3. 에러 처리

Repository 함수는 모두 에러를 throw합니다:

```javascript
// Service에서 try-catch 처리
try {
  const member = await memberRepository.findById(999);
} catch (error) {
  // Repository 에러 처리
  console.error('Failed to find member:', error.message);
  throw new Error('Database error occurred');
}
```

### 4. Soft Delete 사용

```javascript
// ✅ Soft Delete 사용
await memberRepository.deleteById(123);
// member_status: 'inactive'

// 조회 시 활성 회원만 필터링
const member = await memberRepository.findActiveById(123);
// null 반환 (inactive 상태)
```

### 5. include vs select

```javascript
// include: 관련 테이블 조인
const member = await prisma.member.findUnique({
  where: { member_id: 123 },
  include: {
    member_permission: true,  // JOIN
    company: true
  }
});
// 결과: { member_id, member_email, ..., member_permission: [...], company: {...} }

// select: 특정 필드만 선택
const member = await prisma.member.findUnique({
  where: { member_id: 123 },
  select: {
    member_id: true,
    member_email: true,
    member_nickname: true
  }
});
// 결과: { member_id, member_email, member_nickname }
```

---

## 🧪 테스트 예시

### Jest 단위 테스트

```javascript
// __tests__/repositories/member.repository.test.js
const memberRepository = require('../../src/repositories/member.repository');
const prisma = require('../../src/config/database');

// Prisma Mock
jest.mock('../../src/config/database', () => ({
  member: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  }
}));

describe('Member Repository', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByEmail', () => {
    it('should return member when email exists', async () => {
      // Given
      const mockMember = {
        member_id: 1n,
        member_email: 'test@example.com',
        member_nickname: 'testuser'
      };

      prisma.member.findUnique.mockResolvedValue(mockMember);

      // When
      const result = await memberRepository.findByEmail('test@example.com');

      // Then
      expect(result).toEqual(mockMember);
      expect(prisma.member.findUnique).toHaveBeenCalledWith({
        where: { member_email: 'test@example.com' },
        include: expect.any(Object)
      });
    });

    it('should return null when email does not exist', async () => {
      // Given
      prisma.member.findUnique.mockResolvedValue(null);

      // When
      const result = await memberRepository.findByEmail('notfound@example.com');

      // Then
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new member', async () => {
      // Given
      const memberData = {
        member_email: 'new@example.com',
        member_password: 'hashedpassword',
        member_nickname: 'newuser'
      };

      const mockCreated = {
        member_id: 1n,
        ...memberData,
        member_status: 'active',
        member_created_at: new Date()
      };

      prisma.member.create.mockResolvedValue(mockCreated);

      // When
      const result = await memberRepository.create(memberData);

      // Then
      expect(result).toEqual(mockCreated);
      expect(prisma.member.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          member_email: 'new@example.com',
          member_status: 'active'
        })
      });
    });
  });
});
```

---

## 📈 성능 최적화 팁

### 1. 필요한 필드만 조회

```javascript
// ❌ 모든 필드 조회
const member = await prisma.member.findUnique({
  where: { member_id: 123 }
});

// ✅ 필요한 필드만 조회
const member = await prisma.member.findUnique({
  where: { member_id: 123 },
  select: {
    member_id: true,
    member_email: true,
    member_nickname: true
  }
});
```

### 2. 인덱스 활용

```prisma
// schema.prisma에 인덱스 추가
model member {
  member_email    String  @unique  // ← 자동 인덱스
  member_nickname String  @unique  // ← 자동 인덱스

  @@index([member_status])  // ← 수동 인덱스
}
```

### 3. 페이지네이션 사용

```javascript
// ❌ 전체 조회
const members = await prisma.member.findMany();  // 10만 건 조회 → 메모리 부족

// ✅ 페이지네이션
const members = await prisma.member.findMany({
  skip: 0,
  take: 10
});
```

---

## 🔗 다음 단계

### Step 1-5: MemberPermission Repository
다음 단계에서는 member_permission 테이블의 Repository를 만들 예정입니다:

- `src/repositories/memberPermission.repository.js`
- 회원 권한(role) 관리
- buyer/seller/admin 역할 생성 및 조회

---

## 📚 참고 자료

### Prisma 공식 문서
- [Prisma CRUD 작업](https://www.prisma.io/docs/concepts/components/prisma-client/crud)
- [Prisma Relations](https://www.prisma.io/docs/concepts/components/prisma-client/relation-queries)

### 관련 가이드
- [03. 데이터베이스 가이드](../03_DATABASE_GUIDE.md)
- [db_03_RELATIONSHIPS.md](../db_03_RELATIONSHIPS.md)

### 이전 단계
- [Step 1-1: JWT 유틸리티](./1-1_jwt_util.md)
- [Step 1-2: 인증 미들웨어](./1-2_auth_middleware.md)
- [Step 1-3: 입력 검증 미들웨어](./1-3_validation_middleware.md)

---

**작성일**: 2025년 10월 1일
**작성자**: Backend Team
**상태**: ✅ 완료
