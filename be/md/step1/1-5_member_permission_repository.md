# Step 1-5: MemberPermission Repository 생성

> **Phase 1: 기초 인프라 구축**
> **작성일**: 2025년 10월 1일
> **상태**: ✅ 완료

---

## 📋 작업 개요

### 목적
member_permission 테이블에 대한 데이터 접근 계층(Repository)을 구현하여 회원의 역할(role)과 권한을 관리합니다.

### 작업 내용
- `src/repositories/memberPermission.repository.js` 파일 생성
- 권한 조회, 생성, 삭제 함수 구현
- 역할 확인 및 관리 기능 제공

---

## 🎯 MemberPermission Repository를 사용하는 이유

### 1. 유연한 권한 관리
- 한 회원이 여러 역할 동시 보유 가능 (buyer + seller)
- 역할 추가/제거가 회원 정보에 영향 없음
- 역할 변경 이력 추적 가능

### 2. 멀티테넌트 지원
```javascript
// 홍길동 - 구매자이면서 판매자
member: { member_id: 1, email: "hong@example.com" }
permissions: [
  { permission_role: "buyer" },   // 다른 공방에서 구매
  { permission_role: "seller" }   // 자기 공방에서 판매
]
```

### 3. 확장 가능한 권한 체계
```javascript
// 미래에 새로운 역할 추가 가능
- wholesaler (도매업자)
- curator (큐레이터)
- partner (파트너)
```

---

## 📁 파일 위치

```
src/
└── repositories/
    ├── member.repository.js              (Step 1-4)
    └── memberPermission.repository.js    ← 생성한 파일
```

---

## 💻 구현 코드

### 전체 구조

```javascript
const prisma = require('../config/database');

// 10개의 함수 제공:
// - 조회: findByMemberId, findById, findByRole
// - 역할 확인: hasRole, getPrimaryRole, getRoles
// - 생성: create
// - 삭제: deleteByMemberIdAndRole, deleteAllByMemberId
// - 통계: countByRole
```

---

## 🔧 함수 설명

### 1. 조회 함수 (Read)

#### `findByMemberId(memberId)`
**역할**: 특정 회원의 모든 권한 조회

**파라미터**:
- `memberId` (number): 회원 ID

**반환값**:
- 권한 목록 배열 (생성일 오름차순)

**사용 예시**:
```javascript
const permissions = await memberPermissionRepository.findByMemberId(123);

console.log(permissions);
// [
//   {
//     permission_id: 1n,
//     member_id: 123n,
//     permission_role: 'buyer',
//     permission_created_at: 2025-01-01T00:00:00.000Z
//   },
//   {
//     permission_id: 2n,
//     member_id: 123n,
//     permission_role: 'seller',
//     permission_created_at: 2025-06-01T00:00:00.000Z
//   }
// ]
```

**사용처**:
- 로그인 시 회원의 모든 역할 조회
- 회원 정보 조회 시 권한 표시
- JWT 토큰 생성 시 역할 정보 포함

---

#### `findById(permissionId)`
**역할**: 권한 ID로 특정 권한 조회

**파라미터**:
- `permissionId` (number): 권한 ID

**반환값**:
- 권한 정보 객체 (회원 정보 포함)
- null (권한이 없는 경우)

**사용 예시**:
```javascript
const permission = await memberPermissionRepository.findById(1);

console.log(permission);
// {
//   permission_id: 1n,
//   member_id: 123n,
//   permission_role: 'buyer',
//   member: {
//     member_id: 123n,
//     member_email: 'user@example.com',
//     member_nickname: '홍길동'
//   }
// }
```

---

#### `findByRole(role, options)`
**역할**: 특정 역할을 가진 모든 회원 조회 (관리자용)

**파라미터**:
```javascript
role = 'seller';  // 'buyer', 'seller', 'admin'

options = {
  page: 1,        // 페이지 번호
  limit: 10       // 페이지당 항목 수
}
```

**반환값**:
```javascript
{
  permissions: [...],  // 권한 목록 (회원 정보 포함)
  total: 50,          // 전체 수
  page: 1,            // 현재 페이지
  totalPages: 5       // 전체 페이지 수
}
```

**사용 예시**:
```javascript
// 모든 판매자 조회
const result = await memberPermissionRepository.findByRole('seller', {
  page: 1,
  limit: 10
});

console.log(`전체 판매자 ${result.total}명 중 ${result.permissions.length}명 조회`);

result.permissions.forEach(p => {
  console.log(`${p.member.member_nickname} (${p.member.member_email})`);
});
```

---

### 2. 역할 확인 함수

#### `hasRole(memberId, role)`
**역할**: 특정 회원이 특정 역할을 가지고 있는지 확인

**파라미터**:
- `memberId` (number): 회원 ID
- `role` (string): 역할 ('buyer', 'seller', 'admin')

**반환값**:
- `true`: 역할 보유
- `false`: 역할 미보유

**사용 예시**:
```javascript
// 판매자 권한 확인
if (await memberPermissionRepository.hasRole(123, 'seller')) {
  console.log('판매자입니다');
} else {
  console.log('판매자가 아닙니다');
}

// 중복 권한 방지
async function becomeSeller(memberId) {
  if (await memberPermissionRepository.hasRole(memberId, 'seller')) {
    throw new ValidationError('Already a seller');
  }

  await memberPermissionRepository.create({
    member_id: memberId,
    permission_role: 'seller'
  });
}
```

---

#### `getPrimaryRole(memberId)`
**역할**: 회원의 주 역할(Primary Role) 조회

**우선순위**: `seller` > `admin` > `buyer`

**파라미터**:
- `memberId` (number): 회원 ID

**반환값**:
- 주 역할 문자열 ('buyer', 'seller', 'admin')

**사용 예시**:
```javascript
// 로그인 시 주 역할 결정
const primaryRole = await memberPermissionRepository.getPrimaryRole(123);

// JWT 토큰에 포함
const token = generateToken({
  member_id: 123,
  email: 'user@example.com',
  role: primaryRole  // 'seller' (가장 우선순위 높은 역할)
});
```

**우선순위 로직**:
```javascript
// 회원의 권한: ['buyer', 'seller']
// → 주 역할: 'seller' (seller가 buyer보다 우선)

// 회원의 권한: ['buyer', 'admin']
// → 주 역할: 'admin' (admin이 buyer보다 우선)

// 회원의 권한: ['buyer', 'seller', 'admin']
// → 주 역할: 'seller' (seller가 가장 우선)

// 회원의 권한: []
// → 주 역할: 'buyer' (기본값)
```

---

#### `getRoles(memberId)`
**역할**: 회원의 모든 역할 목록 조회

**파라미터**:
- `memberId` (number): 회원 ID

**반환값**:
- 역할 문자열 배열 ['buyer', 'seller']

**사용 예시**:
```javascript
const roles = await memberPermissionRepository.getRoles(123);

console.log(roles);  // ['buyer', 'seller']

// JWT 토큰에 모든 역할 포함
const token = generateToken({
  member_id: 123,
  email: 'user@example.com',
  role: 'seller',      // 주 역할
  roles: roles         // 모든 역할 ['buyer', 'seller']
});

// 프론트엔드에서 역할별 UI 표시
if (roles.includes('seller')) {
  // 판매자 대시보드 메뉴 표시
}
if (roles.includes('buyer')) {
  // 구매 내역 메뉴 표시
}
```

---

### 3. 생성 함수 (Create)

#### `create(permissionData)`
**역할**: 새 권한 부여

**파라미터**:
```javascript
permissionData = {
  member_id: 123,
  permission_role: 'seller'  // 'buyer', 'seller', 'admin'
}
```

**반환값**:
- 생성된 권한 정보 객체

**사용 예시**:

**예시 1: 회원가입 시 buyer 권한 자동 부여**
```javascript
// authService.register()
const member = await memberRepository.create({ email, password, nickname });

// 기본 권한 부여
const permission = await memberPermissionRepository.create({
  member_id: member.member_id,
  permission_role: 'buyer'
});

console.log(`회원 ${member.member_id}에게 buyer 권한 부여됨`);
```

**예시 2: 판매자 전환**
```javascript
// tenantService.createTenant()
async function createTenant(memberId, tenantData) {
  // 공방 생성
  const tenant = await tenantRepository.create(tenantData);

  // seller 권한 추가 (buyer는 유지)
  await memberPermissionRepository.create({
    member_id: memberId,
    permission_role: 'seller'
  });

  // tenant_member 연결
  await tenantMemberRepository.create({
    member_id: memberId,
    tenant_id: tenant.tenant_id
  });

  return tenant;
}
```

**예시 3: 관리자 권한 부여 (수동)**
```javascript
// adminService.grantAdminRole()
async function grantAdminRole(targetMemberId) {
  // 이미 admin인지 확인
  if (await memberPermissionRepository.hasRole(targetMemberId, 'admin')) {
    throw new ValidationError('Already an admin');
  }

  // admin 권한 부여
  await memberPermissionRepository.create({
    member_id: targetMemberId,
    permission_role: 'admin'
  });

  return { message: 'Admin role granted successfully' };
}
```

**에러 처리**:
```javascript
// 중복 권한 시도 시
try {
  await memberPermissionRepository.create({
    member_id: 123,
    permission_role: 'seller'
  });
} catch (error) {
  // "Permission already exists for this member"
  console.error(error.message);
}

// UNIQUE 제약조건 위반 (member_id, permission_role)
// Prisma 에러 코드: P2002
```

---

### 4. 삭제 함수 (Delete)

#### `deleteByMemberIdAndRole(memberId, role)`
**역할**: 특정 회원의 특정 역할 제거

**파라미터**:
- `memberId` (number): 회원 ID
- `role` (string): 제거할 역할

**반환값**:
- 삭제된 권한 정보 객체

**사용 예시**:

**예시 1: 판매자 권한 제거 (강등)**
```javascript
// tenantService.closeTenant()
async function closeTenant(memberId, tenantId) {
  // 공방 폐쇄
  await tenantRepository.update(tenantId, { tenant_status: 'inactive' });

  // seller 권한 제거 (buyer는 유지)
  await memberPermissionRepository.deleteByMemberIdAndRole(memberId, 'seller');

  return { message: 'Tenant closed and seller role removed' };
}
```

**예시 2: 관리자 권한 해제**
```javascript
// adminService.revokeAdminRole()
async function revokeAdminRole(targetMemberId) {
  await memberPermissionRepository.deleteByMemberIdAndRole(targetMemberId, 'admin');

  return { message: 'Admin role revoked' };
}
```

---

#### `deleteAllByMemberId(memberId)`
**역할**: 회원의 모든 권한 삭제

**파라미터**:
- `memberId` (number): 회원 ID

**반환값**:
- 삭제 결과 객체 `{ count: 2 }` (삭제된 권한 수)

**사용 예시**:
```javascript
// memberService.deleteMember()
async function deleteMember(memberId) {
  // 1. 모든 권한 삭제
  const result = await memberPermissionRepository.deleteAllByMemberId(memberId);
  console.log(`${result.count}개의 권한이 삭제됨`);

  // 2. 회원 상태 변경 (Soft Delete)
  await memberRepository.deleteById(memberId);

  return { message: 'Member deleted successfully' };
}
```

**주의사항**:
- 일반적으로 권한을 완전히 삭제하는 경우는 드뭄
- 회원 탈퇴 시에만 사용
- Cascade Delete로 member 삭제 시 자동으로 삭제됨

---

### 5. 통계 함수

#### `countByRole(role)`
**역할**: 특정 역할을 가진 회원 수 조회

**파라미터**:
- `role` (string): 역할 ('buyer', 'seller', 'admin')

**반환값**:
- 회원 수 (number)

**사용 예시**:
```javascript
// 대시보드 통계
const buyerCount = await memberPermissionRepository.countByRole('buyer');
const sellerCount = await memberPermissionRepository.countByRole('seller');
const adminCount = await memberPermissionRepository.countByRole('admin');

console.log(`구매자: ${buyerCount}명`);
console.log(`판매자: ${sellerCount}명`);
console.log(`관리자: ${adminCount}명`);
```

---

## 🔄 실제 사용 흐름

### 회원가입 시나리오 (authService.js)

```javascript
const memberRepository = require('../repositories/member.repository');
const memberPermissionRepository = require('../repositories/memberPermission.repository');
const bcrypt = require('bcrypt');
const { generateToken } = require('../utils/jwt');

async function register(email, password, nickname) {
  // 1. 이메일 중복 확인
  if (await memberRepository.existsByEmail(email)) {
    throw new ValidationError('Email already exists');
  }

  // 2. 비밀번호 해싱
  const hashedPassword = await bcrypt.hash(password, 10);

  // 3. 회원 생성 (Step 1-4)
  const member = await memberRepository.create({
    member_email: email,
    member_password: hashedPassword,
    member_nickname: nickname
  });

  // 4. 기본 권한 부여 (Step 1-5) ← 여기!
  await memberPermissionRepository.create({
    member_id: member.member_id,
    permission_role: 'buyer'
  });

  // 5. JWT 토큰 생성
  const token = generateToken({
    member_id: member.member_id,
    email: member.member_email,
    role: 'buyer'
  });

  return {
    member: {
      member_id: member.member_id,
      member_email: member.member_email,
      member_nickname: member.member_nickname
    },
    token
  };
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

  // 4. 권한 조회 (Step 1-5) ← 여기!
  const primaryRole = await memberPermissionRepository.getPrimaryRole(member.member_id);
  const allRoles = await memberPermissionRepository.getRoles(member.member_id);

  // 5. JWT 토큰 생성
  const token = generateToken({
    member_id: member.member_id,
    email: member.member_email,
    role: primaryRole,     // 'seller' (주 역할)
    roles: allRoles        // ['buyer', 'seller'] (모든 역할)
  });

  return {
    member: {
      member_id: member.member_id,
      member_email: member.member_email,
      member_nickname: member.member_nickname,
      role: primaryRole,
      roles: allRoles
    },
    token
  };
}
```

---

### 판매자 전환 시나리오 (tenantService.js)

```javascript
async function becomeSeller(memberId, tenantData) {
  // 1. 이미 판매자인지 확인
  if (await memberPermissionRepository.hasRole(memberId, 'seller')) {
    throw new ValidationError('Already a seller');
  }

  // 2. 공방(tenant) 생성
  const tenant = await tenantRepository.create({
    tenant_name: tenantData.tenant_name,
    tenant_description: tenantData.tenant_description
  });

  // 3. seller 권한 추가 (buyer는 유지)
  await memberPermissionRepository.create({
    member_id: memberId,
    permission_role: 'seller'
  });

  // 4. tenant_member 연결
  await tenantMemberRepository.create({
    member_id: memberId,
    tenant_id: tenant.tenant_id,
    tenant_member_role: 'owner'
  });

  return {
    tenant,
    message: 'Successfully became a seller'
  };
}
```

---

## 📊 데이터베이스 스키마

### member_permission 테이블

```prisma
model member_permission {
  permission_id           BigInt   @id @default(autoincrement())
  member_id               BigInt
  permission_role         String   @db.VarChar(20)
  permission_created_at   DateTime @default(now())
  permission_updated_at   DateTime @updatedAt

  // Relations
  member                  member   @relation(fields: [member_id], references: [member_id], onDelete: Cascade)

  @@unique([member_id, permission_role])  // 중복 방지
}
```

**핵심 제약조건**:
- `@@unique([member_id, permission_role])`: 같은 회원이 같은 역할을 중복으로 가질 수 없음
- `onDelete: Cascade`: 회원 삭제 시 권한도 자동 삭제

---

## ⚠️ 주의사항

### 1. 중복 권한 방지

```javascript
// ❌ 중복 권한 생성 시도
await memberPermissionRepository.create({
  member_id: 123,
  permission_role: 'buyer'
});

await memberPermissionRepository.create({
  member_id: 123,
  permission_role: 'buyer'  // 에러 발생!
});

// ✅ 올바른 방식 - 먼저 확인
if (!await memberPermissionRepository.hasRole(123, 'buyer')) {
  await memberPermissionRepository.create({
    member_id: 123,
    permission_role: 'buyer'
  });
}
```

### 2. 권한 삭제 시 최소 1개 유지

```javascript
// ❌ 모든 권한 삭제 (회원이 아무것도 못함)
await memberPermissionRepository.deleteAllByMemberId(123);

// ✅ 최소 buyer 권한은 유지
const roles = await memberPermissionRepository.getRoles(123);

if (roles.length === 1 && roles[0] === 'buyer') {
  throw new ValidationError('Cannot remove the last permission');
}

await memberPermissionRepository.deleteByMemberIdAndRole(123, 'seller');
```

### 3. Cascade Delete 주의

```javascript
// member 삭제 시 member_permission도 자동 삭제됨
await memberRepository.deleteById(123);
// → member_permission의 모든 레코드도 삭제 (Cascade)

// 별도로 deleteAllByMemberId() 호출 불필요
```

### 4. 권한 우선순위

```javascript
// getPrimaryRole()의 우선순위: seller > admin > buyer

// 이유:
// - seller: 플랫폼의 핵심 사용자
// - admin: 관리 기능 수행
// - buyer: 기본 사용자

// 커스터마이징 가능
async function getPrimaryRole(memberId) {
  const roles = await getRoles(memberId);

  // 우선순위 변경: admin > seller > buyer
  if (roles.includes('admin')) return 'admin';
  if (roles.includes('seller')) return 'seller';
  return 'buyer';
}
```

---

## 🧪 테스트 예시

### Jest 단위 테스트

```javascript
// __tests__/repositories/memberPermission.repository.test.js
const memberPermissionRepository = require('../../src/repositories/memberPermission.repository');
const prisma = require('../../src/config/database');

jest.mock('../../src/config/database', () => ({
  member_permission: {
    findMany: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    deleteMany: jest.fn()
  }
}));

describe('MemberPermission Repository', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('hasRole', () => {
    it('should return true when member has the role', async () => {
      // Given
      prisma.member_permission.count.mockResolvedValue(1);

      // When
      const result = await memberPermissionRepository.hasRole(123, 'seller');

      // Then
      expect(result).toBe(true);
      expect(prisma.member_permission.count).toHaveBeenCalledWith({
        where: {
          member_id: 123n,
          permission_role: 'seller'
        }
      });
    });

    it('should return false when member does not have the role', async () => {
      // Given
      prisma.member_permission.count.mockResolvedValue(0);

      // When
      const result = await memberPermissionRepository.hasRole(123, 'seller');

      // Then
      expect(result).toBe(false);
    });
  });

  describe('getPrimaryRole', () => {
    it('should return seller when member has buyer and seller', async () => {
      // Given
      prisma.member_permission.findMany.mockResolvedValue([
        { permission_role: 'buyer' },
        { permission_role: 'seller' }
      ]);

      // When
      const result = await memberPermissionRepository.getPrimaryRole(123);

      // Then
      expect(result).toBe('seller');
    });

    it('should return buyer as default when no permissions', async () => {
      // Given
      prisma.member_permission.findMany.mockResolvedValue([]);

      // When
      const result = await memberPermissionRepository.getPrimaryRole(123);

      // Then
      expect(result).toBe('buyer');
    });
  });

  describe('create', () => {
    it('should create a new permission', async () => {
      // Given
      const permissionData = {
        member_id: 123,
        permission_role: 'buyer'
      };

      const mockCreated = {
        permission_id: 1n,
        member_id: 123n,
        permission_role: 'buyer',
        permission_created_at: new Date()
      };

      prisma.member_permission.create.mockResolvedValue(mockCreated);

      // When
      const result = await memberPermissionRepository.create(permissionData);

      // Then
      expect(result).toEqual(mockCreated);
      expect(prisma.member_permission.create).toHaveBeenCalledWith({
        data: {
          member_id: 123n,
          permission_role: 'buyer'
        }
      });
    });
  });
});
```

---

## 📈 성능 최적화

### 1. 한 번에 권한 조회

```javascript
// ❌ N+1 쿼리 문제
const members = await memberRepository.findAll();
for (const member of members) {
  const permissions = await memberPermissionRepository.findByMemberId(member.member_id);
  console.log(member.member_email, permissions);
}

// ✅ JOIN으로 한 번에 조회
const members = await memberRepository.findAll();
// findAll()에서 include: { member_permission: true } 사용
members.forEach(member => {
  console.log(member.member_email, member.member_permission);
});
```

### 2. 권한 캐싱

```javascript
// Redis를 사용한 권한 캐싱 (추후 구현 가능)
async function getRolesWithCache(memberId) {
  const cacheKey = `member:${memberId}:roles`;

  // 캐시 확인
  let roles = await redis.get(cacheKey);

  if (!roles) {
    // 캐시 미스 - DB 조회
    roles = await memberPermissionRepository.getRoles(memberId);

    // 캐시 저장 (5분)
    await redis.setex(cacheKey, 300, JSON.stringify(roles));
  }

  return JSON.parse(roles);
}
```

---

## 🔗 다음 단계

### Step 1-6: Auth Service
다음 단계에서는 Repository를 사용하여 실제 회원가입/로그인 비즈니스 로직을 구현합니다:

- `src/services/auth.service.js`
- memberRepository + memberPermissionRepository 사용
- 회원가입, 로그인, 비밀번호 변경 로직

---

## 📚 참고 자료

### Prisma 공식 문서
- [Prisma Relations](https://www.prisma.io/docs/concepts/components/prisma-client/relation-queries)
- [Prisma Unique Constraints](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference#unique)

### 관련 가이드
- [03. 데이터베이스 가이드](../03_DATABASE_GUIDE.md)
- [04. API 개발 가이드](../04_API_DEVELOPMENT.md)

### 이전 단계
- [Step 1-4: Member Repository](./1-4_member_repository.md)

---

**작성일**: 2025년 10월 1일
**작성자**: Backend Team
**상태**: ✅ 완료
