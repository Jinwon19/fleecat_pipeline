# Step 2-3: TenantMember Repository 생성

> **Phase 2: 판매자 기능 구축**
> **작성일**: 2025년 10월 2일
> **상태**: ✅ 완료

---

## 📋 작업 개요

### 목적
tenant_member 테이블에 대한 데이터 접근 계층(Repository)을 구현하여 회원과 판매사 간의 N:N 관계를 관리하고 멀티테넌시 구조를 구현합니다.

### 작업 내용
- `src/repositories/tenantMember.repository.js` 파일 생성
- Prisma를 사용한 CRUD 함수 구현
- Member와 Tenant를 연결하는 중간 테이블 관리
- 구성원 승인 프로세스 처리

---

## 🎯 TenantMember란?

### 개념

**TenantMember**는 회원(Member)과 판매사(Tenant)를 연결하는 **중간 테이블(Junction Table)**로, **N:N 관계**를 구현합니다.

### 멀티테넌시의 핵심

```
회원 "홍길동" (member_id: 1)
  ↓ 여러 판매사에 소속 가능
├─ TenantMember #10: A공방에서 owner 역할
├─ TenantMember #20: B공방에서 staff 역할
└─ TenantMember #30: C공방에서 manager 역할

판매사 "A공방" (tenant_id: 1)
  ↓ 여러 구성원을 보유
├─ TenantMember #10: 홍길동 (owner)
├─ TenantMember #11: 김철수 (manager)
└─ TenantMember #12: 이영희 (staff)
```

### 왜 중요한가?

**일반 쇼핑몰**:
```
Member → Product (회원이 직접 상품 등록)
```

**멀티테넌트 쇼핑몰**:
```
Member → TenantMember → Product
   ↓         ↓
 Tenant   역할(owner/manager/staff)
```

**핵심 특징**:
1. **한 회원, 여러 판매사**: 홍길동은 A공방과 B공방 모두에서 활동 가능
2. **Product는 TenantMember에 속함**: 상품은 판매사가 아닌 "특정 구성원"이 등록
3. **데이터 격리**: 판매사별 데이터 완전 분리

---

## 🔗 N:N 관계 구조

### 데이터베이스 구조

```sql
-- member 테이블
member_id (PK)  member_name
    1           홍길동
    2           김철수
    3           이영희

-- tenant 테이블
tenant_id (PK)  tenant_name
    1           도자기 공방
    2           목공예 공방

-- tenant_member 테이블 (중간 테이블)
tenant_member_id (PK)  tenant_id (FK)  member_id (FK)  tenant_member_role
        10                  1               1            owner
        11                  1               2            manager
        12                  1               3            staff
        20                  2               1            staff
```

**관계**:
- 홍길동(1): 도자기 공방(1)의 owner + 목공예 공방(2)의 staff
- 김철수(2): 도자기 공방(1)의 manager
- 이영희(3): 도자기 공방(1)의 staff

### Prisma 스키마

```prisma
model Member {
  member_id      BigInt         @id
  tenant_members TenantMember[]  // 1:N (한 회원이 여러 TenantMember)
}

model Tenant {
  tenant_id      BigInt         @id
  tenant_members TenantMember[]  // 1:N (한 판매사가 여러 TenantMember)
}

model TenantMember {
  tenant_member_id              BigInt  @id
  tenant_id                     BigInt  // FK → Tenant
  member_id                     BigInt  // FK → Member
  tenant_member_role            String
  tenant_member_approval_status String  @default("pending")
  // ...

  tenant   Tenant    @relation(...)
  member   Member    @relation(...)
  products Product[] // ← 상품은 TenantMember에 속함!
}

model Product {
  product_id        BigInt @id
  tenant_member_id  BigInt // FK → TenantMember (Tenant 아님!)

  tenant_member TenantMember @relation(...)
}
```

---

## 📁 파일 위치

```
src/
└── repositories/
    ├── member.repository.js          (Phase 1 완료)
    ├── memberPermission.repository.js (Phase 1 완료)
    ├── tenant.repository.js           (Step 2-1 완료)
    ├── tenantDetail.repository.js     (Step 2-2 완료)
    └── tenantMember.repository.js     ← 생성한 파일
```

---

## 💻 구현 코드

### 전체 구조

```javascript
const prisma = require('../config/database');

// 8개의 함수 제공:
// - 조회: findById, findByTenantId, findByMemberId, findByTenantIdAndMemberId
// - 확인: existsByTenantAndMember
// - 생성: create
// - 수정: updateApprovalStatus, update
```

---

## 🔧 함수 설명

### 1. 조회 함수 (Read)

#### `findById(tenantMemberId)`
**역할**: ID로 구성원 조회

**파라미터**:
- `tenantMemberId` (number): 구성원 ID

**반환값**:
- 성공: 구성원 정보 객체 (tenant, member 포함)
- 실패: null

**사용 예시**:
```javascript
const tenantMember = await tenantMemberRepository.findById(10);

if (tenantMember) {
  console.log(tenantMember.tenant.tenant_name);           // '도자기 공방'
  console.log(tenantMember.member.member_name);           // '홍길동'
  console.log(tenantMember.tenant_member_role);           // 'owner'
  console.log(tenantMember.tenant_member_approval_status); // 'approved'
}
```

**특징**:
- `include`로 tenant, member 정보 자동 조인
- tenant_detail도 함께 조회

---

#### `findByTenantId(tenantId)`
**역할**: 판매사별 구성원 목록 조회

**파라미터**:
- `tenantId` (number): 판매사 ID

**반환값**:
- 성공: 구성원 목록 배열
- 실패: 빈 배열

**사용 예시**:
```javascript
// 도자기 공방의 모든 구성원
const members = await tenantMemberRepository.findByTenantId(1);

members.forEach(tm => {
  console.log(`${tm.member.member_name} (${tm.tenant_member_role})`);
});
// 출력:
// 홍길동 (owner)
// 김철수 (manager)
// 이영희 (staff)
```

**특징**:
- 신청일시 최신순 정렬
- member 정보 포함

**사용 시나리오**:
- 판매사 관리 페이지에서 구성원 목록 표시
- owner가 구성원 승인/거절 시 목록 조회

---

#### `findByMemberId(memberId)`
**역할**: 회원의 소속 판매사 목록 조회

**파라미터**:
- `memberId` (number): 회원 ID

**반환값**:
- 성공: 소속 판매사 목록 배열
- 실패: 빈 배열

**사용 예시**:
```javascript
// 홍길동의 소속 판매사 목록
const myTenants = await tenantMemberRepository.findByMemberId(1);

myTenants.forEach(tm => {
  console.log(`${tm.tenant.tenant_name} (${tm.tenant_member_role})`);
});
// 출력:
// 도자기 공방 (owner)
// 목공예 공방 (staff)
```

**특징**:
- tenant, tenant_detail 정보 포함
- 신청일시 최신순 정렬

**사용 시나리오**:
- "내 판매사 목록" 페이지
- 판매사 전환 (여러 판매사 소속 시)

---

#### `findByTenantIdAndMemberId(tenantId, memberId)`
**역할**: 특정 판매사의 특정 구성원 조회

**파라미터**:
- `tenantId` (number): 판매사 ID
- `memberId` (number): 회원 ID

**반환값**:
- 성공: 구성원 정보 객체
- 실패: null

**사용 예시**:
```javascript
// 홍길동이 도자기 공방의 구성원인지 확인
const tenantMember = await tenantMemberRepository.findByTenantIdAndMemberId(1, 1);

if (tenantMember) {
  console.log(`역할: ${tenantMember.tenant_member_role}`);  // 'owner'

  // 권한 체크
  if (tenantMember.tenant_member_role === 'owner') {
    console.log('Owner 권한 있음');
  }
}
```

**특징**:
- tenant, member 정보 모두 포함
- 권한 체크에 자주 사용

**사용 시나리오**:
- 권한 체크 (owner인지 확인)
- 상품 수정 시 본인 확인
- 판매사 정보 수정 권한 확인

---

### 2. 확인 함수

#### `existsByTenantAndMember(tenantId, memberId)`
**역할**: 중복 가입 확인

**파라미터**:
- `tenantId` (number): 판매사 ID
- `memberId` (number): 회원 ID

**반환값**:
- `true`: 이미 가입됨
- `false`: 가입 가능

**사용 예시**:
```javascript
// 중복 가입 방지
if (await tenantMemberRepository.existsByTenantAndMember(1, 1)) {
  throw new ValidationError('Already member of this tenant');
}

// 가입 신청 진행
await tenantMemberRepository.create({ ... });
```

**특징**:
- `count()`로 가벼운 조회
- Boolean 반환

---

### 3. 생성 함수 (Create)

#### `create(tenantMemberData)`
**역할**: 구성원 생성 (가입 신청 또는 owner 자동 생성)

**파라미터**:
```javascript
tenantMemberData = {
  tenant_id: 1,                                  // 필수
  member_id: 1,                                  // 필수
  tenant_member_role: 'owner',                   // 필수 (owner/manager/staff)
  tenant_member_approval_status: 'approved',     // 선택 (기본값: pending)
  tenant_member_bank_name: '국민은행',            // 선택
  tenant_member_bank_account: '123-456-789',     // 선택
  tenant_member_account_holder: '홍길동',         // 선택
  tenant_member_commission_rate: 0.0500          // 선택 (기본값: 5%)
}
```

**반환값**:
- 생성된 구성원 정보 객체

**사용 예시 1: Owner 자동 생성 (판매사 등록 시)**
```javascript
// tenantService.js에서 판매사 등록 시
const tenant = await tenantRepository.create({
  tenant_name: '홍길동 도자기 공방'
});

// 신청자를 owner로 자동 등록 (자동 승인)
await tenantMemberRepository.create({
  tenant_id: tenant.tenant_id,
  member_id: memberId,
  tenant_member_role: 'owner',
  tenant_member_approval_status: 'approved',  // ← 자동 승인!
  tenant_member_bank_name: '국민은행',
  tenant_member_bank_account: '123-456-789',
  tenant_member_account_holder: '홍길동'
});
```

**사용 예시 2: 구성원 가입 신청 (승인 대기)**
```javascript
// 다른 회원이 판매사에 가입 신청
await tenantMemberRepository.create({
  tenant_id: 1,
  member_id: 2,  // 김철수
  tenant_member_role: 'staff',
  tenant_member_approval_status: 'pending',  // ← 승인 대기
  tenant_member_bank_name: '신한은행',
  tenant_member_bank_account: '987-654-321',
  tenant_member_account_holder: '김철수'
});
```

**특징**:
- `approved` 상태로 생성 시 `approved_at`, `activated_at` 자동 설정
- `applied_at`은 항상 현재 시간으로 설정
- 기본 수수료율은 5% (0.0500)

---

### 4. 수정 함수 (Update)

#### `updateApprovalStatus(tenantMemberId, status, approverNote)`
**역할**: 승인 상태 변경 (승인/거절)

**파라미터**:
- `tenantMemberId` (number): 구성원 ID
- `status` (string): 상태 ('approved' 또는 'rejected')
- `approverNote` (string, 선택): 승인자 메모

**반환값**:
- 수정된 구성원 정보 객체

**사용 예시**:
```javascript
// Owner가 구성원 승인
const approved = await tenantMemberRepository.updateApprovalStatus(
  11,  // tenantMemberId
  'approved',
  'Welcome to our team!'
);

console.log(approved.tenant_member_approval_status);  // 'approved'
console.log(approved.tenant_member_approved_at);      // 2025-10-02T... (자동 설정)
console.log(approved.tenant_member_activated_at);     // 2025-10-02T... (자동 설정)

// 거절
const rejected = await tenantMemberRepository.updateApprovalStatus(
  12,
  'rejected',
  'Sorry, we are not hiring at the moment'
);

console.log(rejected.tenant_member_approval_status);  // 'rejected'
console.log(rejected.tenant_member_approved_at);      // null
```

**특징**:
- 승인 시 `approved_at`, `activated_at` 자동 설정
- 거절 시 타임스탬프는 null 유지

---

#### `update(tenantMemberId, updateData)`
**역할**: 구성원 정보 수정

**파라미터**:
```javascript
tenantMemberId = 10;

updateData = {
  tenant_member_role: 'manager',                   // 역할 변경
  tenant_member_bank_name: '우리은행',              // 계좌 정보 수정
  tenant_member_bank_account: '111-222-333',
  tenant_member_account_holder: '홍길동',
  tenant_member_commission_rate: 0.0300,           // 수수료율 변경 (3%)
  tenant_member_suspended_by: 'admin',             // 정지 처리
  tenant_member_suspended_reason: '규정 위반'
}
```

**반환값**:
- 수정된 구성원 정보 객체

**사용 예시**:
```javascript
// 역할 변경 (staff → manager)
await tenantMemberRepository.update(10, {
  tenant_member_role: 'manager'
});

// 계좌 정보 수정
await tenantMemberRepository.update(10, {
  tenant_member_bank_name: '우리은행',
  tenant_member_bank_account: '111-222-333'
});

// 구성원 정지
await tenantMemberRepository.update(10, {
  tenant_member_suspended_by: 'owner',
  tenant_member_suspended_reason: '장기 미활동',
  tenant_member_suspended_at: new Date()
});
```

**특징**:
- 제공된 필드만 수정 (부분 업데이트)
- 승인 상태 변경은 `updateApprovalStatus()` 사용 권장

---

## 🔄 실제 사용 흐름

### 시나리오 1: 판매사 등록 시 Owner 자동 생성

```javascript
// tenantService.js
const tenantRepository = require('../repositories/tenant.repository');
const tenantDetailRepository = require('../repositories/tenantDetail.repository');
const tenantMemberRepository = require('../repositories/tenantMember.repository');

async function createTenant(memberId, data) {
  // 1. 이름 중복 확인
  if (await tenantRepository.existsByName(data.name)) {
    throw new ValidationError('Tenant name already exists');
  }

  // 2. Tenant 생성
  const tenant = await tenantRepository.create({
    tenant_name: data.name,
    tenant_status: 'pending'
  });

  // 3. TenantDetail 생성
  await tenantDetailRepository.create({
    tenant_id: tenant.tenant_id,
    tenant_detail_description: data.description,
    tenant_detail_phone: data.phone,
    tenant_detail_email: data.email
  });

  // 4. TenantMember 생성 (신청자를 owner로)
  await tenantMemberRepository.create({
    tenant_id: tenant.tenant_id,
    member_id: memberId,
    tenant_member_role: 'owner',
    tenant_member_approval_status: 'approved',  // ← 자동 승인!
    tenant_member_bank_name: data.bank_name,
    tenant_member_bank_account: data.bank_account,
    tenant_member_account_holder: data.account_holder
  });

  return tenant;
}
```

---

### 시나리오 2: 구성원 가입 신청

```javascript
// tenantMemberService.js
async function applyToTenant(memberId, tenantId, data) {
  // 1. Tenant 존재 및 승인 확인
  const tenant = await tenantRepository.findById(tenantId);

  if (!tenant) {
    throw new NotFoundError('Tenant not found');
  }

  if (tenant.tenant_status !== 'approved') {
    throw new ValidationError('Tenant is not approved yet');
  }

  // 2. 중복 가입 확인
  if (await tenantMemberRepository.existsByTenantAndMember(tenantId, memberId)) {
    throw new ValidationError('Already member of this tenant');
  }

  // 3. 구성원 가입 신청 (pending 상태)
  const tenantMember = await tenantMemberRepository.create({
    tenant_id: tenantId,
    member_id: memberId,
    tenant_member_role: data.role || 'staff',
    tenant_member_approval_status: 'pending',  // ← 승인 대기
    tenant_member_bank_name: data.bank_name,
    tenant_member_bank_account: data.bank_account,
    tenant_member_account_holder: data.account_holder
  });

  return {
    message: 'Application submitted. Waiting for approval.',
    tenantMember: {
      tenant_member_id: Number(tenantMember.tenant_member_id),
      tenant_id: Number(tenantMember.tenant_id),
      tenant_member_approval_status: tenantMember.tenant_member_approval_status
    }
  };
}
```

---

### 시나리오 3: 구성원 승인 (Owner만 가능)

```javascript
// tenantMemberService.js
async function approveMember(tenantMemberId, approverId) {
  // 1. 구성원 조회
  const tenantMember = await tenantMemberRepository.findById(tenantMemberId);

  if (!tenantMember) {
    throw new NotFoundError('TenantMember not found');
  }

  // 2. 승인자가 owner인지 확인
  const approver = await tenantMemberRepository.findByTenantIdAndMemberId(
    Number(tenantMember.tenant_id),
    approverId
  );

  if (!approver || approver.tenant_member_role !== 'owner') {
    throw new ForbiddenError('Only tenant owner can approve members');
  }

  // 3. 이미 승인/거절된 경우 체크
  if (tenantMember.tenant_member_approval_status !== 'pending') {
    throw new ValidationError(
      `Member is already ${tenantMember.tenant_member_approval_status}`
    );
  }

  // 4. 승인 처리
  const approved = await tenantMemberRepository.updateApprovalStatus(
    tenantMemberId,
    'approved',
    `Approved by ${approver.member.member_name}`
  );

  return {
    message: 'Member approved successfully',
    tenantMember: {
      tenant_member_id: Number(approved.tenant_member_id),
      tenant_member_approval_status: approved.tenant_member_approval_status,
      tenant_member_approved_at: approved.tenant_member_approved_at
    }
  };
}
```

---

### 시나리오 4: 내 소속 판매사 목록

```javascript
// memberService.js
async function getMyTenants(memberId) {
  // 회원의 모든 TenantMember 조회
  const tenantMembers = await tenantMemberRepository.findByMemberId(memberId);

  // 승인된 것만 필터링
  const approved = tenantMembers.filter(
    tm => tm.tenant_member_approval_status === 'approved'
  );

  // BigInt 변환 및 응답 형식 정리
  return approved.map(tm => ({
    tenant_member_id: Number(tm.tenant_member_id),
    tenant_id: Number(tm.tenant_id),
    tenant_name: tm.tenant.tenant_name,
    tenant_status: tm.tenant.tenant_status,
    role: tm.tenant_member_role,
    joined_at: tm.tenant_member_approved_at,
    total_sales: Number(tm.tenant_member_total_sales_amount),
    sales_count: tm.tenant_member_total_sales_count
  }));
}
```

---

## 📊 데이터 흐름도

```
Controller
    ↓ (HTTP 요청)
Service
    ↓ (비즈니스 로직)
Repository ← Step 2-3 (여기!)
    ↓ (Prisma 쿼리)
Database (tenant_member 테이블)
```

### 예시: POST /api/v1/tenants/:id/members (구성원 가입 신청)

```
1. tenantMemberController.applyToTenant
   - req.user.member_id 추출
   - req.params.id (tenantId) 추출
   - req.body (계좌 정보 등) 추출
   - tenantMemberService.applyToTenant() 호출
       ↓
2. tenantMemberService.applyToTenant
   - tenantRepository.findById() 호출 (존재 확인)
   - tenantMemberRepository.existsByTenantAndMember() 호출 (중복 확인)
   - tenantMemberRepository.create() 호출
       ↓
3. tenantMemberRepository.create
   - prisma.tenantMember.create() 실행
   - DB에 INSERT
       ↓
4. Database
   - tenant_member 테이블에 레코드 추가
   - tenant_member_approval_status: 'pending'
```

---

## ⚠️ 주의사항

### 1. BigInt 처리

```javascript
// ✅ 올바른 사용
const tenantMember = await tenantMemberRepository.findById(10);

// Repository에서 변환 처리
async function create(tenantMemberData) {
  return await prisma.tenantMember.create({
    data: {
      tenant_id: BigInt(tenantMemberData.tenant_id),    // ← 변환 필수
      member_id: BigInt(tenantMemberData.member_id)     // ← 변환 필수
    }
  });
}
```

### 2. 중복 가입 방지

```javascript
// ❌ 중복 가입 시도
const exists = await tenantMemberRepository.existsByTenantAndMember(1, 1);
if (exists) {
  throw new ValidationError('Already member of this tenant');
}

// ✅ 확인 후 생성
await tenantMemberRepository.create({ ... });
```

### 3. Owner 자동 승인

```javascript
// Tenant 등록 시 신청자는 자동으로 owner + approved
await tenantMemberRepository.create({
  tenant_id: tenant.tenant_id,
  member_id: memberId,
  tenant_member_role: 'owner',
  tenant_member_approval_status: 'approved'  // ← 자동 승인!
});

// 내부적으로 approved_at, activated_at 자동 설정됨
```

### 4. Product와의 관계

```javascript
// Product는 TenantMember에 속함!
const product = await prisma.product.findUnique({
  where: { product_id: BigInt(1) },
  include: {
    tenant_member: {
      include: {
        tenant: true,   // 판매사 정보
        member: true    // 등록자 정보
      }
    }
  }
});

console.log(product.tenant_member.tenant.tenant_name);     // 판매사명
console.log(product.tenant_member.member.member_name);     // 등록자
console.log(product.tenant_member.tenant_member_role);     // 역할
```

### 5. CASCADE DELETE

```javascript
// Member 삭제 시 TenantMember도 자동 삭제
await prisma.member.delete({
  where: { member_id: BigInt(1) }
});
// → tenant_member 테이블의 해당 레코드도 삭제

// Tenant 삭제 시 TenantMember도 자동 삭제
await prisma.tenant.delete({
  where: { tenant_id: BigInt(1) }
});
// → tenant_member 테이블의 해당 레코드도 삭제
```

---

## 📈 Repository 비교

### 공통점

| 항목 | 설명 |
|------|------|
| 패턴 | Repository 패턴 사용 |
| ORM | Prisma 사용 |
| 에러 처리 | Try-catch 사용 |
| 주석 | JSDoc 형식 |

### 차이점

| 항목 | Tenant | TenantDetail | TenantMember |
|------|--------|-------------|-------------|
| **관계** | 1:1 (parent) | 1:1 (child) | N:N (junction) |
| **함수 개수** | 7개 | 3개 | 8개 |
| **주요 조회** | `findById`, `findByName` | `findByTenantId` | `findByTenantId`, `findByMemberId` |
| **중복 확인** | `existsByName` | ❌ | `existsByTenantAndMember` |
| **승인 프로세스** | `updateStatus` | ❌ | `updateApprovalStatus` |
| **주요 관심사** | 판매사 등록, 승인 | 상세 정보 | 구성원 관리, 역할 |

---

## 🧪 테스트 가이드

### 수동 테스트 시나리오

#### 1. 판매사 등록 시 Owner 자동 생성
```javascript
POST /api/v1/tenants
Authorization: Bearer {token}
{
  "name": "홍길동 도자기 공방",
  "description": "전통 도자기를 만듭니다",
  "bank_name": "국민은행",
  "bank_account": "123-456-789",
  "account_holder": "홍길동"
}

// 예상: tenant, tenant_detail, tenant_member(owner) 모두 생성
```

#### 2. 구성원 가입 신청
```javascript
POST /api/v1/tenants/1/members
Authorization: Bearer {token}
{
  "role": "staff",
  "bank_name": "신한은행",
  "bank_account": "987-654-321",
  "account_holder": "김철수"
}

// 예상 응답 (201 Created)
{
  "success": true,
  "message": "Application submitted",
  "data": {
    "tenant_member_id": 11,
    "tenant_member_approval_status": "pending"
  }
}
```

#### 3. 구성원 승인 (Owner)
```javascript
PUT /api/v1/tenant-members/11/approve
Authorization: Bearer {owner_token}

// 예상 응답 (200 OK)
{
  "success": true,
  "message": "Member approved successfully",
  "data": {
    "tenant_member_id": 11,
    "tenant_member_approval_status": "approved",
    "tenant_member_approved_at": "2025-10-02T..."
  }
}
```

#### 4. 내 소속 판매사 목록
```javascript
GET /api/v1/members/me/tenants
Authorization: Bearer {token}

// 예상 응답 (200 OK)
{
  "success": true,
  "data": [
    {
      "tenant_member_id": 10,
      "tenant_id": 1,
      "tenant_name": "홍길동 도자기 공방",
      "role": "owner",
      "joined_at": "2025-10-01T..."
    },
    {
      "tenant_member_id": 20,
      "tenant_id": 2,
      "tenant_name": "이순신 목공예 공방",
      "role": "staff",
      "joined_at": "2025-10-02T..."
    }
  ]
}
```

---

## 🔗 다음 단계

### Step 2-4: Category Repository
다음 단계에서는 category 테이블의 Repository를 만들 예정입니다:

- `src/repositories/category.repository.js`
- 계층형 카테고리 관리 (자기 참조 구조)
- 대분류 → 중분류 → 소분류

---

## 📚 참고 자료

### 프로젝트 가이드
- [프로젝트 개요](../01_README.md)
- [코딩 표준](../02_CODING_STANDARDS.md)
- [아키텍처](../03_ARCHITECTURE.md)

### 데이터베이스 가이드
- [변수 빠른 참조](../db_01_VARIABLE_REFERENCE.md)
- [네이밍 규칙 & 데이터 타입](../db_02_NAMING_DATATYPES.md)
- [변수 관계도 & FK](../db_03_RELATIONSHIPS.md)

### Phase 2 계획
- [Step 2-0: Phase 2 계획](./00_INDEX.md)
- [Step 2-1: Tenant Repository](./2-1_tenant_repository.md)
- [Step 2-2: TenantDetail Repository](./2-2_tenantDetail_repository.md)

### 이전 Phase
- [Phase 1: 기초 인프라 구축](../step1/00_INDEX.md)
- [Step 1-4: Member Repository](../step1/1-4_member_repository.md)

---

**작성일**: 2025년 10월 2일
**작성자**: Backend Team
**상태**: ✅ 완료
