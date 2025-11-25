# Step 2-8: TenantMember Service 생성

> **Phase 2: 판매자 기능 구축**
> **작성일**: 2025년 10월 13일
> **상태**: ✅ 완료

---

## 📋 작업 개요

### 목적
판매사 구성원 가입 및 관리 비즈니스 로직을 구현하여 멀티테넌시 시스템의 구성원 관리 기능을 제공합니다.

### 작업 내용
- `src/services/tenantMember.service.js` 파일 생성
- 구성원 가입 신청 및 승인 프로세스 구현
- Owner 권한 확인 로직 구현
- 여러 Repository 조합 (TenantMember, Tenant)

---

## 🎯 TenantMember Service란?

### 1. Service의 역할

```
Controller (HTTP 요청/응답)
    ↓
Service (비즈니스 로직) ← 여기!
    ↓
Repository (데이터 접근)
    ↓
Database
```

**Repository와의 차이**:
| 구분 | Repository | Service |
|------|-----------|---------|
| 역할 | 데이터 접근 | 비즈니스 로직 |
| 책임 | CRUD | 규칙 검증, Repository 조합 |
| 권한 확인 | ❌ | ✅ (Owner인지 확인) |
| 예시 | `create(data)` | `applyToTenant(memberId, tenantId, data)` |

**Service가 하는 일**:
- 비즈니스 규칙 검증 (중복 가입 방지, 승인된 판매사만 가입 가능)
- 권한 확인 (Owner만 승인/거절/수정 가능)
- 여러 Repository 조합
- 상태 흐름 관리 (pending → approved/rejected)

---

### 2. 구성원 가입 프로세스

```
회원 → 판매사 가입 신청 → 공방주(owner) 검토 → 승인/거절
  (pending)                         (approved/rejected)
```

**상태 흐름**:
```javascript
tenant_member_approval_status: 'pending'   // 신청 (대기중)
  ↓ (owner 승인)
tenant_member_approval_status: 'approved'  // 승인됨
  ↓ 또는
tenant_member_approval_status: 'rejected'  // 거절됨
```

**Owner vs Staff/Manager**:
| 구분 | Owner | Staff/Manager |
|------|-------|---------------|
| 생성 시점 | 판매사 등록 시 자동 생성 | 가입 신청 |
| 초기 상태 | `approved` (자동 승인) | `pending` (승인 대기) |
| 권한 | 구성원 승인/거절, 정보 수정 | 상품 등록 |
| 역할 변경 | 불가 (본인 역할 변경 방지) | Owner가 변경 가능 |

---

### 3. Owner 권한

**Owner만 할 수 있는 작업**:
1. 구성원 가입 신청 승인 (`approveMember`)
2. 구성원 가입 신청 거절 (`rejectMember`)
3. 구성원 정보 수정 (`updateMember`)
4. 구성원 역할 변경 (staff ↔ manager)

**권한 확인 로직**:
```javascript
// 1. 판매사의 구성원인지 확인
const requester = await tenantMemberRepository.findByTenantIdAndMemberId(tenantId, requesterId);

// 2. Owner 역할인지 확인
if (!requester || requester.tenant_member_role !== 'owner') {
  throw new ForbiddenError('Only tenant owner can perform this action');
}

// 3. 승인된 Owner인지 확인
if (requester.tenant_member_approval_status !== 'approved') {
  throw new ForbiddenError('Only approved owner can perform this action');
}
```

---

## 📁 파일 위치

```
src/
└── services/
    ├── member.service.js      (Phase 1 완료)
    ├── admin.service.js       (Phase 1 완료)
    ├── auth.service.js        (Phase 1 완료)
    ├── tenant.service.js      (Step 2-7 완료)
    └── tenantMember.service.js  ← 생성한 파일
```

---

## 💻 구현 코드

### 전체 구조

```javascript
const prisma = require('../config/database');
const tenantRepository = require('../repositories/tenant.repository');
const tenantMemberRepository = require('../repositories/tenantMember.repository');
const { ValidationError, NotFoundError, ForbiddenError } = require('../utils/errors');

// 7개의 함수 제공:
// - 회원용: applyToTenant, getMyTenantMemberships, getTenantMemberById
// - Owner용: approveMember, rejectMember, updateMember
// - Public: getTenantMembers
```

---

## 🔧 함수 설명

### 1. 판매사 가입 신청 (회원용)

#### `applyToTenant(memberId, tenantId, data)`
**역할**: 판매사에 구성원 가입 신청

**파라미터**:
```javascript
memberId = 123;  // 신청 회원 ID
tenantId = 1;    // 가입하려는 판매사 ID

data = {
  tenant_member_role: 'staff',                  // 선택: 역할 (기본: staff)
  tenant_member_bank_name: '국민은행',            // 선택: 은행명
  tenant_member_bank_account: '123-456-789',    // 선택: 계좌번호
  tenant_member_account_holder: '홍길동',        // 선택: 예금주
  tenant_member_commission_rate: 0.0500         // 선택: 수수료율 (기본: 5%)
}
```

**반환값**:
- 생성된 구성원 정보 (pending 상태)

**사용 예시**:
```javascript
const tenantMember = await tenantMemberService.applyToTenant(123, 1, {
  tenant_member_role: 'staff',
  tenant_member_bank_name: '국민은행',
  tenant_member_bank_account: '123-456-789',
  tenant_member_account_holder: '홍길동'
});

console.log(tenantMember.tenant_member_approval_status);  // "pending"
console.log(tenantMember.tenant.tenant_name);  // "도자기 공방"
```

**내부 동작**:
```javascript
// 1. 판매사 존재 확인
const tenant = await tenantRepository.findById(tenantId);
if (!tenant) {
  throw new NotFoundError('Tenant not found');
}

// 2. 판매사 승인 상태 확인
if (tenant.tenant_status !== 'approved') {
  throw new ValidationError('Cannot apply to non-approved tenant');
}

// 3. 중복 가입 확인
const exists = await tenantMemberRepository.existsByTenantAndMember(tenantId, memberId);
if (exists) {
  throw new ValidationError('Already member of this tenant');
}

// 4. 구성원 생성 (pending 상태)
const tenantMember = await tenantMemberRepository.create({
  tenant_id: tenantId,
  member_id: memberId,
  tenant_member_role: data.tenant_member_role || 'staff',
  tenant_member_approval_status: 'pending',
  // ...
});
```

**특징**:
- **승인된 판매사**만 가입 가능
- **중복 가입** 방지 (같은 판매사에 이미 가입 불가)
- 초기 상태는 `pending` (승인 대기)

**에러 처리**:
```javascript
try {
  const tenantMember = await tenantMemberService.applyToTenant(123, 1, data);
} catch (error) {
  if (error instanceof NotFoundError) {
    // 판매사가 존재하지 않음
  } else if (error instanceof ValidationError) {
    // 중복 가입 or 승인되지 않은 판매사
  }
}
```

---

### 2. 구성원 승인 (Owner용)

#### `approveMember(tenantMemberId, approverId)`
**역할**: 구성원 가입 신청 승인 (Owner만 가능)

**파라미터**:
- `tenantMemberId` (number): 구성원 ID
- `approverId` (number): 승인자 회원 ID (Owner)

**반환값**:
- 승인된 구성원 정보

**사용 예시**:
```javascript
// Owner가 구성원 승인
const approved = await tenantMemberService.approveMember(10, 999);

console.log(approved.tenant_member_approval_status);  // "approved"
console.log(approved.tenant_member_approved_at);      // 현재 시각
console.log(approved.tenant_member_activated_at);     // 현재 시각
```

**내부 동작**:
```javascript
// 1. 구성원 조회
const tenantMember = await tenantMemberRepository.findById(tenantMemberId);

// 2. 승인자가 해당 판매사의 owner인지 확인
const approver = await tenantMemberRepository.findByTenantIdAndMemberId(
  tenantMember.tenant_id,
  approverId
);

if (!approver || approver.tenant_member_role !== 'owner') {
  throw new ForbiddenError('Only tenant owner can approve members');
}

// 3. 승인자가 승인된 owner인지 확인
if (approver.tenant_member_approval_status !== 'approved') {
  throw new ForbiddenError('Only approved owner can approve members');
}

// 4. 이미 승인/거절된 경우 확인
if (tenantMember.tenant_member_approval_status !== 'pending') {
  throw new ValidationError('Cannot approve member with status: ...');
}

// 5. 승인 처리
const approved = await tenantMemberRepository.updateApprovalStatus(
  tenantMemberId,
  'approved',
  'Approved by ...'
);
```

**특징**:
- **Owner만** 승인 가능
- **승인된 Owner**만 가능 (pending 상태 owner 불가)
- `pending` 상태만 승인 가능
- 승인 시 `approved_at`, `activated_at` 자동 설정

**에러 처리**:
```javascript
try {
  await tenantMemberService.approveMember(10, 999);
} catch (error) {
  if (error instanceof ForbiddenError) {
    // Owner가 아니거나 승인되지 않은 Owner
  } else if (error instanceof ValidationError) {
    // 이미 승인/거절된 구성원
  }
}
```

---

#### `rejectMember(tenantMemberId, approverId, reason)`
**역할**: 구성원 가입 신청 거절 (Owner만 가능)

**파라미터**:
- `tenantMemberId` (number): 구성원 ID
- `approverId` (number): 거절 처리자 회원 ID (Owner)
- `reason` (string, 선택): 거절 사유

**반환값**:
- 거절된 구성원 정보

**사용 예시**:
```javascript
const rejected = await tenantMemberService.rejectMember(
  10,
  999,
  "현재 구성원을 모집하지 않습니다"
);

console.log(rejected.tenant_member_approval_status);  // "rejected"
```

**특징**:
- **Owner만** 거절 가능
- 거절 사유 저장 가능 (선택)
- `pending` 상태만 거절 가능

---

### 3. 구성원 목록 조회 (Public)

#### `getTenantMembers(tenantId, options)`
**역할**: 판매사별 구성원 목록 조회

**파라미터**:
```javascript
tenantId = 1;

options = {
  status: 'approved'  // 선택: 상태 필터 (pending/approved/rejected)
}
```

**반환값**:
- 구성원 목록 배열

**사용 예시**:
```javascript
// 모든 구성원 조회
const allMembers = await tenantMemberService.getTenantMembers(1);

// 승인된 구성원만 조회
const approvedMembers = await tenantMemberService.getTenantMembers(1, {
  status: 'approved'
});

approvedMembers.forEach(member => {
  console.log(`${member.member.member_name} (${member.tenant_member_role})`);
});
// 출력:
// 홍길동 (owner)
// 김철수 (manager)
// 이영희 (staff)
```

**특징**:
- 누구나 조회 가능 (Public)
- 상태 필터링 가능
- member 정보 포함

---

#### `getMyTenantMemberships(memberId, options)`
**역할**: 내 소속 판매사 목록 조회

**파라미터**:
```javascript
memberId = 123;

options = {
  status: 'approved'  // 선택: 상태 필터
}
```

**반환값**:
- 소속 판매사 목록 배열

**사용 예시**:
```javascript
// 내가 속한 모든 판매사
const myTenants = await tenantMemberService.getMyTenantMemberships(123);

myTenants.forEach(tm => {
  console.log(`${tm.tenant_name} (${tm.tenant_member_role})`);
  console.log(`  - 총 매출: ${tm.tenant_member_total_sales_amount}원`);
  console.log(`  - 판매 건수: ${tm.tenant_member_total_sales_count}건`);
});
// 출력:
// 도자기 공방 (owner)
//   - 총 매출: 1,000,000원
//   - 판매 건수: 50건
// 목공예 공방 (staff)
//   - 총 매출: 200,000원
//   - 판매 건수: 10건
```

**특징**:
- 본인의 소속 판매사만 조회
- 역할 및 판매 통계 포함
- 승인/미승인 모두 포함 (필터링 가능)

---

### 4. 구성원 정보 수정 (Owner용)

#### `updateMember(tenantMemberId, requesterId, updateData)`
**역할**: 구성원 정보 수정 (Owner만 가능)

**파라미터**:
```javascript
tenantMemberId = 10;
requesterId = 999;  // Owner

updateData = {
  tenant_member_role: 'manager',                  // 역할 변경
  tenant_member_bank_name: '우리은행',              // 계좌 정보 수정
  tenant_member_bank_account: '111-222-333',
  tenant_member_account_holder: '홍길동',
  tenant_member_commission_rate: 0.0300           // 수수료율 변경 (3%)
}
```

**반환값**:
- 수정된 구성원 정보

**사용 예시**:
```javascript
// 역할 변경 (staff → manager)
await tenantMemberService.updateMember(10, 999, {
  tenant_member_role: 'manager'
});

// 계좌 정보 수정
await tenantMemberService.updateMember(10, 999, {
  tenant_member_bank_name: '우리은행',
  tenant_member_bank_account: '111-222-333'
});

// 수수료율 조정
await tenantMemberService.updateMember(10, 999, {
  tenant_member_commission_rate: 0.0300  // 3%
});
```

**권한 확인 로직**:
```javascript
// 1. 구성원 조회
const tenantMember = await tenantMemberRepository.findById(tenantMemberId);

// 2. 요청자가 해당 판매사의 owner인지 확인
const requester = await tenantMemberRepository.findByTenantIdAndMemberId(
  tenantMember.tenant_id,
  requesterId
);

if (!requester || requester.tenant_member_role !== 'owner') {
  throw new ForbiddenError('Only tenant owner can update member information');
}

// 3. Owner 자신의 역할 변경 방지
if (tenantMember.member_id === requesterId && updateData.tenant_member_role) {
  throw new ValidationError('Cannot change your own role');
}
```

**특징**:
- **Owner만** 수정 가능
- **본인 역할 변경** 방지 (owner가 자신의 역할을 변경할 수 없음)
- 승인된 Owner만 가능
- 부분 업데이트 지원

---

#### `getTenantMemberById(tenantMemberId, requesterId)`
**역할**: 구성원 상세 조회 (본인 또는 같은 판매사 구성원만)

**파라미터**:
- `tenantMemberId` (number): 구성원 ID
- `requesterId` (number): 요청자 회원 ID

**반환값**:
- 구성원 상세 정보

**사용 예시**:
```javascript
// 본인 정보 조회
const myInfo = await tenantMemberService.getTenantMemberById(10, 123);

// 같은 판매사 구성원 정보 조회
const memberInfo = await tenantMemberService.getTenantMemberById(11, 123);
```

**권한 확인**:
```javascript
// 1. 본인이거나
const isSelf = tenantMember.member_id === requesterId;

// 2. 같은 판매사의 구성원인지 확인
const requester = await tenantMemberRepository.findByTenantIdAndMemberId(
  tenantMember.tenant_id,
  requesterId
);

const isSameTenant = requester !== null;

if (!isSelf && !isSameTenant) {
  throw new ForbiddenError('Cannot view this tenant member information');
}
```

**특징**:
- **본인** 또는 **같은 판매사 구성원**만 조회 가능
- Tenant, Member 정보 포함

---

## 🔄 실제 사용 흐름

### 시나리오 1: 구성원 가입 신청

```javascript
// Controller
async function applyToTenant(req, res, next) {
  try {
    const memberId = req.user.member_id;
    const tenantId = req.params.id;
    const data = req.body;

    // Service 호출
    const tenantMember = await tenantMemberService.applyToTenant(memberId, tenantId, data);

    res.status(201).json({
      success: true,
      message: 'Application submitted. Waiting for approval.',
      data: tenantMember
    });
  } catch (error) {
    next(error);
  }
}

// Service
async function applyToTenant(memberId, tenantId, data) {
  // 1. 판매사 존재 확인
  // 2. 판매사 승인 상태 확인
  // 3. 중복 가입 확인
  // 4. 구성원 생성 (pending)
  // 5. 결과 반환
}
```

---

### 시나리오 2: Owner가 구성원 승인

```javascript
// Controller
async function approveMember(req, res, next) {
  try {
    const tenantMemberId = req.params.id;
    const approverId = req.user.member_id;

    // Service 호출
    const approved = await tenantMemberService.approveMember(tenantMemberId, approverId);

    res.json({
      success: true,
      message: 'Member approved successfully',
      data: approved
    });
  } catch (error) {
    next(error);
  }
}

// Service
async function approveMember(tenantMemberId, approverId) {
  // 1. 구성원 조회
  // 2. 승인자가 owner인지 확인
  // 3. 승인된 owner인지 확인
  // 4. 이미 승인/거절 여부 확인
  // 5. 승인 처리
  // 6. 결과 반환
}
```

---

### 시나리오 3: 내 소속 판매사 목록

```javascript
// Controller
async function getMyTenants(req, res, next) {
  try {
    const memberId = req.user.member_id;
    const status = req.query.status;  // 선택: approved/pending/rejected

    // Service 호출
    const tenants = await tenantMemberService.getMyTenantMemberships(memberId, { status });

    res.json({
      success: true,
      data: tenants
    });
  } catch (error) {
    next(error);
  }
}

// Service
async function getMyTenantMemberships(memberId, options) {
  // 1. TenantMember 목록 조회
  // 2. 상태 필터링 (옵션)
  // 3. BigInt 변환 및 응답 형식 정리
  // 4. 결과 반환
}
```

---

### 시나리오 4: 구성원 역할 변경 (Owner)

```javascript
// Controller
async function updateMember(req, res, next) {
  try {
    const tenantMemberId = req.params.id;
    const requesterId = req.user.member_id;
    const updateData = req.body;

    // Service 호출
    const updated = await tenantMemberService.updateMember(
      tenantMemberId,
      requesterId,
      updateData
    );

    res.json({
      success: true,
      message: 'Member updated successfully',
      data: updated
    });
  } catch (error) {
    next(error);
  }
}

// Service
async function updateMember(tenantMemberId, requesterId, updateData) {
  // 1. 구성원 조회
  // 2. 요청자가 owner인지 확인
  // 3. 본인 역할 변경 방지
  // 4. 구성원 정보 수정
  // 5. 결과 반환
}
```

---

## 📊 데이터 흐름도

```
Controller
    ↓ (HTTP 요청)
Service ← Step 2-8 (여기!)
    ↓ (Repository 조합)
Repository (TenantMember, Tenant)
    ↓ (Prisma 쿼리)
Database
```

### 예시: POST /tenants/:id/members (구성원 가입 신청)

```
1. tenantMemberController.applyToTenant
   - req.user.member_id 추출
   - req.params.id (tenantId) 추출
   - req.body (계좌 정보 등) 추출
   - tenantMemberService.applyToTenant() 호출
       ↓
2. tenantMemberService.applyToTenant
   - tenantRepository.findById() - 판매사 존재 확인
   - 판매사 승인 상태 확인 (tenant_status === 'approved')
   - tenantMemberRepository.existsByTenantAndMember() - 중복 확인
   - tenantMemberRepository.create() - 구성원 생성
   - tenantMemberRepository.findById() - 생성된 구성원 조회
       ↓
3. Database
   - tenant_member 테이블에 레코드 추가
   - tenant_member_approval_status: 'pending'
```

---

## ⚠️ 주의사항

### 1. Owner 권한 확인 순서

```javascript
// 권한 확인 순서:
// 1. 존재 확인 → 2. Owner 확인 → 3. 승인 상태 확인 → 4. 로직 실행

// ✅ 올바른 순서
const tenantMember = await tenantMemberRepository.findById(tenantMemberId);
if (!tenantMember) {
  throw new NotFoundError('TenantMember not found');
}

const requester = await tenantMemberRepository.findByTenantIdAndMemberId(...);
if (!requester || requester.tenant_member_role !== 'owner') {
  throw new ForbiddenError('Only owner can perform this action');
}

if (requester.tenant_member_approval_status !== 'approved') {
  throw new ForbiddenError('Only approved owner can perform this action');
}

// 로직 실행
```

### 2. pending 상태만 승인/거절 가능

```javascript
// ❌ 이미 approved인데 또 승인 시도
const tenantMember = await tenantMemberRepository.findById(tenantMemberId);
// tenantMember.tenant_member_approval_status === 'approved'

await tenantMemberService.approveMember(tenantMemberId, approverId);
// Error: Cannot approve member with status: approved

// ✅ pending 상태 확인
if (tenantMember.tenant_member_approval_status !== 'pending') {
  throw new ValidationError(`Cannot approve member with status: ${tenantMember.tenant_member_approval_status}`);
}
```

### 3. 본인 역할 변경 방지

```javascript
// ❌ Owner가 자신의 역할을 변경하려고 시도
await tenantMemberService.updateMember(10, 999, {
  tenant_member_role: 'staff'  // owner → staff 변경 시도
});
// Error: Cannot change your own role

// ✅ 본인 확인
if (Number(tenantMember.member_id) === requesterId && updateData.tenant_member_role) {
  throw new ValidationError('Cannot change your own role');
}
```

### 4. 승인된 판매사만 가입 가능

```javascript
// ❌ pending 상태 판매사에 가입 시도
const tenant = await tenantRepository.findById(tenantId);
// tenant.tenant_status === 'pending'

await tenantMemberService.applyToTenant(memberId, tenantId, data);
// Error: Cannot apply to non-approved tenant

// ✅ 판매사 승인 상태 확인
if (tenant.tenant_status !== 'approved') {
  throw new ValidationError('Cannot apply to non-approved tenant');
}
```

### 5. 중복 가입 방지

```javascript
// ❌ 이미 가입한 판매사에 재가입 시도
const exists = await tenantMemberRepository.existsByTenantAndMember(tenantId, memberId);
// exists === true

await tenantMemberService.applyToTenant(memberId, tenantId, data);
// Error: Already member of this tenant

// ✅ 중복 확인
if (exists) {
  throw new ValidationError('Already member of this tenant');
}
```

### 6. BigInt 변환

```javascript
// Service에서 Number로 변환하여 반환
return {
  ...tenantMember,
  tenant_member_id: Number(tenantMember.tenant_member_id),
  tenant_id: Number(tenantMember.tenant_id),
  member_id: Number(tenantMember.member_id)
};

// Controller에서 그대로 JSON 응답 가능
res.json({
  data: tenantMember  // 이미 Number로 변환됨
});
```

---

## 🧪 테스트 시나리오

### 1. 구성원 가입 신청 테스트

```javascript
describe('TenantMember Service - applyToTenant', () => {
  it('should apply to tenant successfully', async () => {
    // Given
    const memberId = 123;
    const tenantId = 1;
    const data = {
      tenant_member_role: 'staff',
      tenant_member_bank_name: '국민은행',
      tenant_member_bank_account: '123-456-789',
      tenant_member_account_holder: '홍길동'
    };

    // When
    const tenantMember = await tenantMemberService.applyToTenant(memberId, tenantId, data);

    // Then
    expect(tenantMember.tenant_member_approval_status).toBe('pending');
    expect(tenantMember.tenant_member_role).toBe('staff');
  });

  it('should throw error if tenant not found', async () => {
    // When & Then
    await expect(
      tenantMemberService.applyToTenant(123, 999, {})
    ).rejects.toThrow('Tenant not found');
  });

  it('should throw error if already member', async () => {
    // Given: memberId=123은 이미 tenantId=1의 구성원

    // When & Then
    await expect(
      tenantMemberService.applyToTenant(123, 1, {})
    ).rejects.toThrow('Already member of this tenant');
  });

  it('should throw error if tenant not approved', async () => {
    // Given: tenantId=2는 pending 상태

    // When & Then
    await expect(
      tenantMemberService.applyToTenant(123, 2, {})
    ).rejects.toThrow('Cannot apply to non-approved tenant');
  });
});
```

### 2. 구성원 승인 테스트

```javascript
describe('TenantMember Service - approveMember', () => {
  it('should approve member as owner', async () => {
    // Given: memberId=999는 tenantId=1의 owner

    // When
    const approved = await tenantMemberService.approveMember(10, 999);

    // Then
    expect(approved.tenant_member_approval_status).toBe('approved');
    expect(approved.tenant_member_approved_at).toBeDefined();
  });

  it('should throw error if not owner', async () => {
    // Given: memberId=123은 owner가 아님

    // When & Then
    await expect(
      tenantMemberService.approveMember(10, 123)
    ).rejects.toThrow('Only tenant owner can approve members');
  });

  it('should throw error if already approved', async () => {
    // Given: tenantMemberId=10은 이미 approved 상태

    // When & Then
    await expect(
      tenantMemberService.approveMember(10, 999)
    ).rejects.toThrow('Cannot approve member with status: approved');
  });
});
```

### 3. 구성원 정보 수정 테스트

```javascript
describe('TenantMember Service - updateMember', () => {
  it('should allow owner to update member role', async () => {
    // Given: memberId=999는 tenantId=1의 owner
    const updateData = { tenant_member_role: 'manager' };

    // When
    const updated = await tenantMemberService.updateMember(10, 999, updateData);

    // Then
    expect(updated.tenant_member_role).toBe('manager');
  });

  it('should prevent owner from changing own role', async () => {
    // Given: tenantMemberId=10의 memberId=999 (본인)
    const updateData = { tenant_member_role: 'staff' };

    // When & Then
    await expect(
      tenantMemberService.updateMember(10, 999, updateData)
    ).rejects.toThrow('Cannot change your own role');
  });
});
```

---

## 🔗 다음 단계

### Step 2-9: Category Service
다음 단계에서는 Category Service를 만들 예정입니다:

- `src/services/category.service.js`
- 계층형 카테고리 관리 비즈니스 로직
- 카테고리 트리 구조 조회
- 경로(path) 자동 계산

---

## 📚 참고 자료

### Prisma 공식 문서
- [Prisma Transactions](https://www.prisma.io/docs/concepts/components/prisma-client/transactions)

### 관련 가이드
- [04. API 개발 가이드](../common/04_API_DEVELOPMENT.md)
- [02. 코딩 표준](../common/02_CODING_STANDARDS.md)

### 이전 단계
- [Step 2-7: Tenant Service](./2-7_tenant_service.md)
- [Step 2-3: TenantMember Repository](./2-3_tenantMember_repository.md)

---

**작성일**: 2025년 10월 13일
**작성자**: Backend Team
**상태**: ✅ 완료
