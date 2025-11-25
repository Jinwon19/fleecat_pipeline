# Step 2-7: Tenant Service 생성

> **Phase 2: 판매자 기능 구축**
> **작성일**: 2025년 10월 13일
> **상태**: ✅ 완료

---

## 📋 작업 개요

### 목적
판매사 등록 및 관리 비즈니스 로직을 구현하여 멀티테넌시 시스템의 핵심 기능을 제공합니다.

### 작업 내용
- `src/services/tenant.service.js` 파일 생성
- 판매사 등록 신청 및 승인 프로세스 구현
- 여러 Repository 조합 (Tenant, TenantDetail, TenantMember)
- 트랜잭션 기반 데이터 일관성 보장

---

## 🎯 Service 레이어란?

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
| 트랜잭션 | 단일 테이블 | 여러 테이블 (트랜잭션) |
| 예시 | `create(data)` | `createTenant(memberId, data)` |

**Service가 하는 일**:
- 비즈니스 규칙 검증
- 여러 Repository 조합
- 트랜잭션 관리
- 권한 확인
- 복잡한 로직 처리

---

### 2. 판매사 등록 프로세스

```
회원 → 판매사 등록 신청 → 관리자 검토 → 승인/거절
  (pending)                    (approved/rejected)
```

**상태 흐름**:
```javascript
tenant_status: 'pending'   // 신청 (대기중)
  ↓ (관리자 승인)
tenant_status: 'approved'  // 승인됨
  ↓ 또는
tenant_status: 'rejected'  // 거절됨
```

**TenantMember도 함께 승인**:
```javascript
// 판매사 승인 시
tenant_status: 'pending' → 'approved'
tenant_member_approval_status: 'pending' → 'approved' (owner)
```

---

### 3. Tenant와 TenantDetail의 분리 이유

```
Tenant (기본 정보)        1:1        TenantDetail (상세 정보)
- tenant_id                        - tenant_detail_id
- tenant_name                      - tenant_id (FK)
- tenant_status                    - tenant_detail_description
- tenant_applied_at                - tenant_detail_phone
                                   - tenant_detail_address
                                   - tenant_detail_commission_rate
```

**왜 분리했나?**
- **Tenant**: 자주 조회되는 핵심 정보 (목록, 검색)
- **TenantDetail**: 가끔 필요한 상세 정보 (상세 페이지)
- **성능 향상**: JOIN 최소화
- **데이터 관리**: 변경 빈도가 다름

---

## 📁 파일 위치

```
src/
└── services/
    └── tenant.service.js  ← 생성한 파일
```

---

## 💻 구현 코드

### 전체 구조

```javascript
const prisma = require('../config/database');
const tenantRepository = require('../repositories/tenant.repository');
const tenantDetailRepository = require('../repositories/tenantDetail.repository');
const tenantMemberRepository = require('../repositories/tenantMember.repository');
const { ValidationError, NotFoundError, ForbiddenError } = require('../utils/errors');

// 7개의 함수 제공:
// - 회원용: createTenant, getMyTenants, getTenantById, updateTenant
// - 관리자용: approveTenant, rejectTenant, getAllTenants
```

---

## 🔧 함수 설명

### 1. 판매사 등록 (회원용)

#### `createTenant(memberId, data)`
**역할**: 판매사 등록 신청 (Tenant + TenantDetail + TenantMember를 트랜잭션으로 생성)

**파라미터**:
```javascript
memberId = 123;  // 신청 회원 ID

data = {
  tenant_name: "홍길동 공방",                     // 필수: 판매사 이름
  tenant_detail_description: "전통 도자기 공방",   // 선택: 판매사 설명
  tenant_detail_phone: "010-1234-5678",          // 선택: 연락처
  tenant_detail_email: "craft@example.com",      // 선택: 이메일
  tenant_detail_zipcode: "03000",                // 선택: 우편번호
  tenant_detail_address: "서울시 종로구...",      // 선택: 주소
  tenant_detail_address_detail: "2층",           // 선택: 상세 주소
  tenant_detail_business_hours: "평일 10-18시",  // 선택: 영업시간
  tenant_detail_commission_rate: 0.15            // 선택: 수수료율 (기본: 0.15)
}
```

**반환값**:
- 생성된 판매사 정보 (TenantDetail 포함)

**사용 예시**:
```javascript
const tenant = await tenantService.createTenant(123, {
  tenant_name: "홍길동 공방",
  tenant_detail_description: "전통 도자기 공방입니다",
  tenant_detail_phone: "010-1234-5678",
  tenant_detail_address: "서울시 종로구 인사동길 12"
});

console.log(tenant.tenant_status);  // "pending"
console.log(tenant.tenant_detail.tenant_detail_description);  // "전통 도자기 공방입니다"
```

**내부 동작 (트랜잭션)**:
```javascript
// 1. 판매사 이름 중복 확인
const nameExists = await tenantRepository.existsByName(tenant_name);
if (nameExists) {
  throw new ValidationError('Tenant name already exists');
}

// 2. 트랜잭션으로 3개 테이블에 INSERT
await prisma.$transaction(async (tx) => {
  // 2-1. Tenant 생성 (pending)
  const tenant = await tx.tenant.create({
    data: {
      tenant_name,
      tenant_status: 'pending'
    }
  });

  // 2-2. TenantDetail 생성
  const tenantDetail = await tx.tenantDetail.create({
    data: {
      tenant_id: tenant.tenant_id,
      tenant_detail_description: "...",
      tenant_detail_commission_rate: 0.15
    }
  });

  // 2-3. 신청자를 owner로 TenantMember 생성 (pending)
  const tenantMember = await tx.tenantMember.create({
    data: {
      tenant_id: tenant.tenant_id,
      member_id: memberId,
      tenant_member_role: 'owner',
      tenant_member_approval_status: 'pending'
    }
  });

  return { tenant, tenantDetail, tenantMember };
});
```

**특징**:
- 3개 테이블을 원자적으로 생성 (전부 성공 or 전부 실패)
- 신청자는 자동으로 owner 역할
- 관리자 승인 대기 상태 (pending)

**에러 처리**:
```javascript
try {
  const tenant = await tenantService.createTenant(123, data);
} catch (error) {
  if (error instanceof ValidationError) {
    // 이름 중복
    console.error('판매사 이름이 이미 존재합니다');
  }
}
```

---

#### `getMyTenants(memberId)`
**역할**: 내가 속한 판매사 목록 조회

**파라미터**:
- `memberId` (number): 회원 ID

**반환값**:
- 판매사 목록 배열 (TenantMember 정보 포함)

**사용 예시**:
```javascript
const tenants = await tenantService.getMyTenants(123);

// 결과:
[
  {
    tenant_id: 1,
    tenant_name: "A 공방",
    tenant_status: "approved",
    tenant_member: {
      tenant_member_id: 10,
      tenant_member_role: "owner",
      tenant_member_approval_status: "approved"
    }
  },
  {
    tenant_id: 2,
    tenant_name: "B 공방",
    tenant_status: "pending",
    tenant_member: {
      tenant_member_id: 20,
      tenant_member_role: "staff",
      tenant_member_approval_status: "pending"
    }
  }
]
```

**특징**:
- TenantMember 관계를 통해 조회
- 역할 및 승인 상태 포함
- 모든 상태의 판매사 포함 (pending, approved, rejected)

---

#### `getTenantById(tenantId)`
**역할**: 판매사 상세 조회 (Public API)

**파라미터**:
- `tenantId` (number): 판매사 ID

**반환값**:
- 판매사 정보 (TenantDetail 포함)

**사용 예시**:
```javascript
const tenant = await tenantService.getTenantById(1);

console.log(tenant.tenant_name);  // "홍길동 공방"
console.log(tenant.tenant_detail.tenant_detail_description);  // "전통 도자기..."
console.log(tenant.tenant_detail.tenant_detail_phone);  // "010-1234-5678"
```

**특징**:
- 누구나 조회 가능 (Public)
- TenantDetail 자동 포함
- 404 NotFoundError 처리

---

#### `updateTenant(tenantId, memberId, updateData)`
**역할**: 판매사 정보 수정 (owner만 가능)

**파라미터**:
```javascript
tenantId = 1;
memberId = 123;  // 수정 요청 회원

updateData = {
  tenant_name: "새로운 판매사명",              // 선택
  tenant_detail_description: "새로운 설명",    // 선택
  tenant_detail_phone: "010-9999-8888",       // 선택
  tenant_detail_address: "새 주소"            // 선택
}
```

**반환값**:
- 수정된 판매사 정보

**사용 예시**:
```javascript
const updated = await tenantService.updateTenant(1, 123, {
  tenant_detail_description: "새로운 설명입니다",
  tenant_detail_phone: "010-9999-8888"
});
```

**권한 확인 로직**:
```javascript
// 1. 판매사 존재 확인
const tenant = await tenantRepository.findById(tenantId);
if (!tenant) {
  throw new NotFoundError('Tenant not found');
}

// 2. owner 권한 확인
const tenantMember = await tenantMemberRepository.findByTenantIdAndMemberId(
  tenantId,
  memberId
);

if (!tenantMember || tenantMember.tenant_member_role !== 'owner') {
  throw new ForbiddenError('Only tenant owner can update');
}

// 3. 승인된 owner만 수정 가능
if (tenantMember.tenant_member_approval_status !== 'approved') {
  throw new ForbiddenError('Only approved owner can update');
}
```

**특징**:
- owner만 수정 가능
- 승인된 owner만 가능 (approved)
- 이름 변경 시 중복 확인
- Tenant와 TenantDetail 트랜잭션으로 수정

---

### 2. 판매사 승인/거절 (관리자용)

#### `approveTenant(tenantId, adminId)`
**역할**: 판매사 승인 (관리자)

**파라미터**:
- `tenantId` (number): 판매사 ID
- `adminId` (number): 승인 관리자 ID

**반환값**:
- 승인된 판매사 정보

**사용 예시**:
```javascript
// 관리자가 판매사 승인
const approved = await tenantService.approveTenant(1, 999);

console.log(approved.tenant_status);  // "approved"
console.log(approved.tenant_approved_at);  // 현재 시각
```

**내부 동작 (트랜잭션)**:
```javascript
await prisma.$transaction(async (tx) => {
  // 1. Tenant 승인
  await tx.tenant.update({
    where: { tenant_id: tenantId },
    data: {
      tenant_status: 'approved',
      tenant_approved_at: new Date()
    }
  });

  // 2. owner의 TenantMember도 승인
  await tx.tenantMember.updateMany({
    where: {
      tenant_id: tenantId,
      tenant_member_role: 'owner'
    },
    data: {
      tenant_member_approval_status: 'approved',
      tenant_member_approved_at: new Date(),
      tenant_member_activated_at: new Date()
    }
  });
});
```

**특징**:
- Tenant와 TenantMember(owner)를 함께 승인
- pending 상태만 승인 가능
- 이미 승인/거절된 경우 ValidationError

---

#### `rejectTenant(tenantId, adminId, reason)`
**역할**: 판매사 거절 (관리자)

**파라미터**:
- `tenantId` (number): 판매사 ID
- `adminId` (number): 거절 관리자 ID
- `reason` (string, 선택): 거절 사유

**반환값**:
- 거절된 판매사 정보

**사용 예시**:
```javascript
const rejected = await tenantService.rejectTenant(
  1,
  999,
  "부적절한 판매사 이름입니다"
);

console.log(rejected.tenant_status);  // "rejected"
console.log(rejected.tenant_approval_member);  // "부적절한 판매사 이름입니다"
```

**특징**:
- 거절 사유 저장 (선택)
- pending 상태만 거절 가능

---

#### `getAllTenants(options)`
**역할**: 판매사 목록 조회 (관리자)

**파라미터**:
```javascript
options = {
  page: 1,             // 페이지 번호
  limit: 10,           // 페이지당 항목 수
  status: 'pending'    // 상태 필터 (pending/approved/rejected)
}
```

**반환값**:
```javascript
{
  tenants: [...],    // 판매사 목록
  total: 50,         // 전체 개수
  page: 1,           // 현재 페이지
  totalPages: 5      // 전체 페이지 수
}
```

**사용 예시**:
```javascript
// 승인 대기 중인 판매사 조회
const result = await tenantService.getAllTenants({
  status: 'pending',
  page: 1,
  limit: 10
});

console.log(`${result.total}개의 대기 중인 판매사`);
```

**특징**:
- 페이징 지원
- 상태별 필터링
- 관리자 전용

---

## 🔄 실제 사용 흐름

### 시나리오 1: 판매사 등록 신청 (회원)

```javascript
// Controller
async function register(req, res, next) {
  try {
    const memberId = req.user.member_id;
    const data = req.body;

    // Service 호출
    const tenant = await tenantService.createTenant(memberId, data);

    res.status(201).json({
      success: true,
      message: 'Tenant registration submitted',
      data: tenant
    });
  } catch (error) {
    next(error);
  }
}

// Service
async function createTenant(memberId, data) {
  // 1. 중복 확인
  // 2. 트랜잭션으로 Tenant, TenantDetail, TenantMember 생성
  // 3. 결과 반환
}
```

---

### 시나리오 2: 관리자가 판매사 승인

```javascript
// Controller (관리자)
async function approve(req, res, next) {
  try {
    const tenantId = req.params.id;
    const adminId = req.user.member_id;

    // 관리자 권한 확인 (middleware에서)
    // req.user.role === 'admin'

    // Service 호출
    const approved = await tenantService.approveTenant(tenantId, adminId);

    res.json({
      success: true,
      message: 'Tenant approved successfully',
      data: approved
    });
  } catch (error) {
    next(error);
  }
}

// Service
async function approveTenant(tenantId, adminId) {
  // 1. 존재 확인
  // 2. pending 상태 확인
  // 3. 트랜잭션으로 Tenant와 TenantMember(owner) 승인
  // 4. 결과 반환
}
```

---

### 시나리오 3: 내 판매사 목록 조회

```javascript
// Controller
async function getMyTenants(req, res, next) {
  try {
    const memberId = req.user.member_id;

    // Service 호출
    const tenants = await tenantService.getMyTenants(memberId);

    res.json({
      success: true,
      data: tenants
    });
  } catch (error) {
    next(error);
  }
}

// Service
async function getMyTenants(memberId) {
  // 1. TenantMember로 내 소속 판매사 조회
  // 2. Tenant 정보 조회
  // 3. 역할 및 승인 상태 포함하여 반환
}
```

---

### 시나리오 4: 판매사 정보 수정 (owner)

```javascript
// Controller
async function update(req, res, next) {
  try {
    const tenantId = req.params.id;
    const memberId = req.user.member_id;
    const updateData = req.body;

    // Service 호출
    const updated = await tenantService.updateTenant(tenantId, memberId, updateData);

    res.json({
      success: true,
      message: 'Tenant updated successfully',
      data: updated
    });
  } catch (error) {
    next(error);
  }
}

// Service
async function updateTenant(tenantId, memberId, updateData) {
  // 1. 판매사 존재 확인
  // 2. owner 권한 확인
  // 3. 승인된 owner 확인
  // 4. 이름 변경 시 중복 확인
  // 5. 트랜잭션으로 Tenant, TenantDetail 수정
  // 6. 결과 반환
}
```

---

## 📊 데이터 흐름도

```
Controller
    ↓ (HTTP 요청)
Service ← Step 2-7 (여기!)
    ↓ (Repository 조합)
Repository (Tenant, TenantDetail, TenantMember)
    ↓ (Prisma 쿼리)
Database
```

### 예시: POST /tenants (판매사 등록)

```
1. tenantController.register
   - req.body에서 데이터 추출
   - req.user.member_id로 회원 식별
   - tenantService.createTenant() 호출
       ↓
2. tenantService.createTenant
   - tenantRepository.existsByName() - 중복 확인
   - prisma.$transaction() 시작
     - tenantRepository (내부적으로 Prisma 사용)
     - tenantDetailRepository
     - tenantMemberRepository
   - 3개 테이블에 INSERT (원자적)
   - tenantRepository.findById() - 생성된 판매사 조회
       ↓
3. Database
   - tenant, tenant_detail, tenant_member 테이블에 레코드 추가
```

---

## ⚠️ 주의사항

### 1. 트랜잭션 필수

```javascript
// ❌ 트랜잭션 없이 (위험!)
const tenant = await tenantRepository.create(data);
const tenantDetail = await tenantDetailRepository.create(data);
const tenantMember = await tenantMemberRepository.create(data);
// 문제: tenantDetail 실패 시 tenant는 이미 생성됨 (불일치)

// ✅ 트랜잭션 사용
await prisma.$transaction(async (tx) => {
  const tenant = await tx.tenant.create(data);
  const tenantDetail = await tx.tenantDetail.create(data);
  const tenantMember = await tx.tenantMember.create(data);
});
// 전부 성공 or 전부 롤백
```

### 2. 권한 확인 순서

```javascript
// 권한 확인 순서:
// 1. 존재 확인 → 2. 권한 확인 → 3. 상태 확인 → 4. 로직 실행

// ✅ 올바른 순서
const tenant = await tenantRepository.findById(tenantId);
if (!tenant) {
  throw new NotFoundError('Tenant not found');
}

const tenantMember = await tenantMemberRepository.findByTenantIdAndMemberId(...);
if (!tenantMember || tenantMember.tenant_member_role !== 'owner') {
  throw new ForbiddenError('Only owner can update');
}

if (tenantMember.tenant_member_approval_status !== 'approved') {
  throw new ForbiddenError('Only approved owner can update');
}

// 로직 실행
```

### 3. pending 상태만 승인/거절 가능

```javascript
// ❌ 이미 approved인데 또 승인 시도
const tenant = await tenantRepository.findById(tenantId);
// tenant.tenant_status === 'approved'

await tenantService.approveTenant(tenantId, adminId);
// Error: Cannot approve tenant with status: approved

// ✅ pending 상태 확인
if (tenant.tenant_status !== 'pending') {
  throw new ValidationError(`Cannot approve tenant with status: ${tenant.tenant_status}`);
}
```

### 4. BigInt 변환

```javascript
// Service에서 Number로 변환하여 반환
return {
  ...tenant,
  tenant_id: Number(tenant.tenant_id)  // BigInt → Number
};

// Controller에서 그대로 JSON 응답 가능
res.json({
  data: tenant  // tenant_id는 이미 Number
});
```

---

## 🧪 테스트 시나리오

### 1. 판매사 등록 테스트

```javascript
describe('Tenant Service - createTenant', () => {
  it('should create tenant with tenant_detail and tenant_member', async () => {
    // Given
    const memberId = 123;
    const data = {
      tenant_name: "Test 공방",
      tenant_detail_description: "테스트 설명"
    };

    // When
    const tenant = await tenantService.createTenant(memberId, data);

    // Then
    expect(tenant.tenant_name).toBe("Test 공방");
    expect(tenant.tenant_status).toBe('pending');
    expect(tenant.tenant_detail).toBeDefined();
    expect(tenant.tenant_detail.tenant_detail_description).toBe("테스트 설명");
  });

  it('should throw error if tenant name already exists', async () => {
    // Given: 이미 "Test 공방" 존재
    const data = { tenant_name: "Test 공방" };

    // When & Then
    await expect(
      tenantService.createTenant(123, data)
    ).rejects.toThrow('Tenant name already exists');
  });
});
```

### 2. 권한 확인 테스트

```javascript
describe('Tenant Service - updateTenant', () => {
  it('should allow owner to update', async () => {
    // Given: memberId=123은 tenantId=1의 owner
    const updateData = { tenant_detail_description: "새 설명" };

    // When
    const updated = await tenantService.updateTenant(1, 123, updateData);

    // Then
    expect(updated.tenant_detail.tenant_detail_description).toBe("새 설명");
  });

  it('should reject non-owner', async () => {
    // Given: memberId=456은 tenantId=1의 owner가 아님
    const updateData = { tenant_detail_description: "새 설명" };

    // When & Then
    await expect(
      tenantService.updateTenant(1, 456, updateData)
    ).rejects.toThrow('Only tenant owner can update');
  });
});
```

---

## 🔗 다음 단계

### Step 2-8: TenantMember Service
다음 단계에서는 TenantMember Service를 만들 예정입니다:

- `src/services/tenantMember.service.js`
- 판매사 구성원 가입 및 승인 비즈니스 로직
- owner/staff 역할 관리

---

## 📚 참고 자료

### Prisma 공식 문서
- [Prisma Transactions](https://www.prisma.io/docs/concepts/components/prisma-client/transactions)

### 관련 가이드
- [04. API 개발 가이드](../common/04_API_DEVELOPMENT.md)
- [02. 코딩 표준](../common/02_CODING_STANDARDS.md)

### 이전 단계
- [Step 2-6: ProductImg Repository](./2-6_productImg_repository.md)

---

**작성일**: 2025년 10월 13일
**작성자**: Backend Team
**상태**: ✅ 완료
