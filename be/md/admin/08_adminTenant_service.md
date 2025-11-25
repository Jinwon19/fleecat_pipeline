# Step 8: AdminTenant Service 생성

> **작성일**: 2025년 10월 7일
> **상태**: ✅ 완료
> **파일**: `src/services/admin/adminTenant.service.js`

---

## 📚 개념 설명

### 🎯 AdminTenant Service의 역할

판매사 관리 Service는 **판매사 승인 프로세스**를 중심으로 비즈니스 로직을 처리합니다:

- **승인/거절 프로세스** (pending → approved/rejected)
- **상태 전환 규칙** (approved ↔ suspended)
- **데이터 검증** (거절 사유 필수, 메모 길이 제한)
- **BigInt 변환** (복잡한 중첩 구조 처리)
- **통계 데이터 가공** (승인율, 거절율 계산)

---

## 🔑 핵심 개념

### 1. 판매사 승인 프로세스

**비즈니스 규칙:**
```javascript
async function approveTenant(tenantId, approvalData) {
  // 1. 판매사 조회
  const tenant = await tenantRepo.findById(tenantId);
  if (!tenant) {
    throw new NotFoundError('판매사를 찾을 수 없습니다');
  }

  // 2. 규칙: pending 상태만 승인 가능
  if (tenant.tenant_status !== 'pending') {
    throw new ValidationError(`${tenant.tenant_status} 상태의 판매사는 승인할 수 없습니다`);
  }

  // 3. admin_memo 검증 (선택적)
  if (approvalData.admin_memo && approvalData.admin_memo.length > 500) {
    throw new ValidationError('관리자 메모는 500자 이하로 입력해주세요');
  }

  // 4. 승인 처리 (트랜잭션)
  return await tenantRepo.approve(tenantId, approvalData);
}
```

**상태 전환:**
```
pending → approved ✅ (승인)
approved → pending ❌ (불가능)
rejected → approved ✅ (재승인, approve 사용)
```

---

### 2. 판매사 거절 프로세스

**비즈니스 규칙:**
```javascript
async function rejectTenant(tenantId, rejectReason) {
  // 1. 거절 사유 필수 검증
  if (!rejectReason || rejectReason.trim().length === 0) {
    throw new ValidationError('거절 사유를 입력해주세요');
  }

  // 2. 길이 검증
  if (rejectReason.length > 500) {
    throw new ValidationError('거절 사유는 500자 이하로 입력해주세요');
  }

  // 3. 판매사 조회
  const tenant = await tenantRepo.findById(tenantId);
  if (!tenant) {
    throw new NotFoundError('판매사를 찾을 수 없습니다');
  }

  // 4. 규칙: pending 상태만 거절 가능
  if (tenant.tenant_status !== 'pending') {
    throw new ValidationError(`${tenant.tenant_status} 상태의 판매사는 거절할 수 없습니다`);
  }

  // 5. 거절 처리 (트랜잭션)
  return await tenantRepo.reject(tenantId, rejectReason.trim());
}
```

**거절 사유:**
- 필수 입력 (빈 문자열 불가)
- 최대 500자
- trim() 적용

---

### 3. 판매사 상태 변경 규칙

**허용되는 상태 전환:**
```javascript
async function updateTenantStatus(tenantId, status) {
  const tenant = await tenantRepo.findById(tenantId);

  // 규칙 1: 이미 같은 상태면 에러
  if (tenant.tenant_status === status) {
    throw new ValidationError(`이미 ${status} 상태입니다`);
  }

  // 규칙 2: approved → pending 불가
  if (tenant.tenant_status === 'approved' && status === 'pending') {
    throw new ValidationError('승인된 판매사를 대기 상태로 변경할 수 없습니다');
  }

  // 규칙 3: rejected → suspended 불가
  if (tenant.tenant_status === 'rejected' && status === 'suspended') {
    throw new ValidationError('거절된 판매사를 정지할 수 없습니다');
  }

  // 허용되는 전환만 실행
  return await tenantRepo.updateStatus(tenantId, status);
}
```

**상태 전환 매트릭스:**

| 현재 상태 → | pending | approved | rejected | suspended |
|-----------|---------|----------|----------|-----------|
| **pending** | - | approve() | reject() | ❌ |
| **approved** | ❌ | - | ❌ | ✅ |
| **rejected** | ❌ | approve() | - | ❌ |
| **suspended** | ❌ | ✅ | ❌ | - |

---

### 4. 복잡한 BigInt 변환

**중첩된 구조 처리:**
```javascript
async function getTenantById(tenantId) {
  const tenant = await tenantRepo.findByIdWithDetails(tenantId);

  return {
    ...tenant,
    tenant_id: tenant.tenant_id.toString(),

    // tenant_detail 변환
    tenant_detail: tenant.tenant_detail ? {
      ...tenant.tenant_detail,
      tenant_id: tenant.tenant_detail.tenant_id?.toString()
    } : null,

    // tenant_members 배열 변환
    tenant_members: tenant.tenant_members?.map(tm => ({
      ...tm,
      tenant_member_id: tm.tenant_member_id?.toString(),
      tenant_id: tm.tenant_id?.toString(),
      member_id: tm.member_id?.toString(),

      // member 변환
      member: tm.member ? {
        ...tm.member,
        member_id: tm.member.member_id?.toString()
      } : null
    }))
  };
}
```

**주의사항:**
- null/undefined 체크 필수 (optional chaining)
- 배열은 map() 사용
- 중첩된 객체는 재귀적으로 변환

---

### 5. 통계 데이터 가공

**비율 계산:**
```javascript
async function getTenantStatistics() {
  // 1. Repository 호출
  const stats = await tenantRepo.getStatistics();

  // 2. 비율 계산 (0으로 나누기 방지)
  const approvalRate = stats.totalTenants > 0
    ? (stats.approvedTenants / stats.totalTenants * 100).toFixed(1)
    : 0;

  const rejectionRate = stats.totalTenants > 0
    ? (stats.rejectedTenants / stats.totalTenants * 100).toFixed(1)
    : 0;

  const suspensionRate = stats.totalTenants > 0
    ? (stats.suspendedTenants / stats.totalTenants * 100).toFixed(1)
    : 0;

  // 3. 가공된 데이터 반환
  return {
    ...stats,
    approvalRate: parseFloat(approvalRate),
    rejectionRate: parseFloat(rejectionRate),
    suspensionRate: parseFloat(suspensionRate)
  };
}
```

**결과:**
```javascript
{
  totalTenants: 500,
  pendingTenants: 15,
  approvedTenants: 450,
  rejectedTenants: 20,
  suspendedTenants: 15,
  approvalRate: 90.0,      // 계산됨
  rejectionRate: 4.0,      // 계산됨
  suspensionRate: 3.0,     // 계산됨
  recentTenants: 30
}
```

---

## 📦 구현 내용

### 파일 위치
```
src/services/admin/adminTenant.service.js
```

### 주요 함수 (6개)

#### 1. getTenantList(options)
판매사 목록 조회

**파라미터:**
```javascript
{
  page: 1,
  limit: 20,
  status: 'pending',
  search: '공방'
}
```

**반환값:**
```javascript
{
  data: [
    {
      tenant_id: "1",
      tenant_name: "홍길동 공방",
      tenant_status: "pending",
      tenant_detail: {
        tenant_id: "1",
        tenant_detail_business_number: "123-45-67890"
      }
    }
  ],
  pagination: {
    currentPage: 1,
    totalPages: 5,
    totalItems: 100,
    itemsPerPage: 20,
    hasNextPage: true,
    hasPreviousPage: false
  }
}
```

**비즈니스 로직:**
- page 검증 (1 이상)
- limit 검증 (1~100)
- status 검증 (pending/approved/rejected/suspended)
- BigInt 변환 (중첩 구조)

---

#### 2. getTenantById(tenantId)
판매사 상세 조회

**반환값:**
```javascript
{
  tenant_id: "1",
  tenant_name: "홍길동 공방",
  tenant_status: "approved",
  tenant_detail: { ... },
  tenant_members: [
    {
      tenant_member_id: "1",
      tenant_id: "1",
      member_id: "123",
      member: {
        member_id: "123",
        member_name: "홍길동"
      }
    }
  ],
  _count: { ... }
}
```

**비즈니스 로직:**
- 존재 확인 (NotFoundError)
- 복잡한 BigInt 변환 (tenant_detail, tenant_members, member)

---

#### 3. approveTenant(tenantId, approvalData)
판매사 승인

**파라미터:**
```javascript
{
  admin_memo: "사업자등록증 확인 완료"
}
```

**비즈니스 로직:**
1. 판매사 존재 확인
2. **pending 상태만 승인 가능**
3. admin_memo 길이 검증 (500자 이하)
4. Repository 트랜잭션 호출
5. BigInt 변환

---

#### 4. rejectTenant(tenantId, rejectReason)
판매사 거절

**파라미터:**
- `rejectReason` (string, 필수): 거절 사유

**비즈니스 로직:**
1. **거절 사유 필수 검증**
2. **길이 검증 (500자 이하)**
3. 판매사 존재 확인
4. **pending 상태만 거절 가능**
5. Repository 트랜잭션 호출
6. BigInt 변환

---

#### 5. updateTenantStatus(tenantId, status)
판매사 상태 변경

**비즈니스 로직:**
1. status 검증
2. 판매사 존재 확인
3. **이미 같은 상태면 에러**
4. **approved → pending 불가**
5. **rejected → suspended 불가**
6. Repository 호출
7. BigInt 변환

---

#### 6. getTenantStatistics()
판매사 통계 조회

**반환값:**
```javascript
{
  totalTenants: 500,
  pendingTenants: 15,
  approvedTenants: 450,
  rejectedTenants: 20,
  suspendedTenants: 15,
  approvalRate: 90.0,
  rejectionRate: 4.0,
  suspensionRate: 3.0,
  recentTenants: 30
}
```

**비즈니스 로직:**
- 비율 계산 (승인율, 거절율, 정지율)
- 0으로 나누기 방지
- parseFloat 변환

---

## 🔄 사용 예시

### 예시 1: 판매사 승인

```javascript
// Controller
async function approveTenant(req, res, next) {
  try {
    const { tenantId } = req.params;
    const { admin_memo } = req.body;

    const approved = await tenantService.approveTenant(
      parseInt(tenantId),
      { admin_memo }
    );

    res.json({
      success: true,
      message: '판매사가 승인되었습니다',
      data: approved
    });
  } catch (error) {
    next(error);
  }
}
```

---

### 예시 2: 판매사 거절

```javascript
async function rejectTenant(req, res, next) {
  try {
    const { tenantId } = req.params;
    const { reject_reason } = req.body;

    // 거절 사유 필수
    if (!reject_reason) {
      throw new ValidationError('거절 사유를 입력해주세요');
    }

    const rejected = await tenantService.rejectTenant(
      parseInt(tenantId),
      reject_reason
    );

    res.json({
      success: true,
      message: '판매사가 거절되었습니다',
      data: rejected
    });
  } catch (error) {
    next(error);
  }
}
```

---

### 예시 3: 판매사 정지

```javascript
async function suspendTenant(req, res, next) {
  try {
    const { tenantId } = req.params;

    const suspended = await tenantService.updateTenantStatus(
      parseInt(tenantId),
      'suspended'
    );

    res.json({
      success: true,
      message: '판매사가 정지되었습니다',
      data: suspended
    });
  } catch (error) {
    next(error);
  }
}
```

---

### 예시 4: 승인 대기 목록

```javascript
async function getPendingTenants(req, res, next) {
  try {
    const { page, limit } = req.query;

    const result = await tenantService.getTenantList({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      status: 'pending'
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
}
```

---

## ⚠️ 주의사항

### 1. 승인/거절은 pending 상태만
```javascript
// ✅ 올바른 사용
if (tenant.tenant_status !== 'pending') {
  throw new ValidationError('pending 상태의 판매사만 승인/거절할 수 있습니다');
}

// ❌ 다른 상태에서 승인 시도
// approved, rejected, suspended 상태에서는 approve/reject 불가
```

### 2. 거절 사유 필수
```javascript
// ✅ 거절 사유 검증
if (!rejectReason || rejectReason.trim().length === 0) {
  throw new ValidationError('거절 사유를 입력해주세요');
}

// ❌ 거절 사유 없이 거절
await tenantRepo.reject(tenantId, '');  // 에러 발생
```

### 3. 상태 전환 규칙
```javascript
// ✅ 허용되는 전환
approved → suspended  // 정지
suspended → approved  // 정지 해제
rejected → approved   // 재승인 (approve 함수 사용)

// ❌ 허용되지 않는 전환
approved → pending    // 불가능
rejected → suspended  // 불가능
```

### 4. 복잡한 BigInt 변환
```javascript
// ✅ null 체크 후 변환
tenant_detail: tenant.tenant_detail ? {
  ...tenant.tenant_detail,
  tenant_id: tenant.tenant_detail.tenant_id?.toString()
} : null

// ❌ null 체크 없이 변환
tenant_detail: {
  tenant_id: tenant.tenant_detail.tenant_id.toString()  // tenant_detail이 null이면 에러
}
```

### 5. 비율 계산 시 0 나누기 방지
```javascript
// ✅ 0으로 나누기 방지
const approvalRate = stats.totalTenants > 0
  ? (stats.approvedTenants / stats.totalTenants * 100).toFixed(1)
  : 0;

// ❌ 0으로 나누기 가능
const approvalRate = (stats.approvedTenants / stats.totalTenants * 100).toFixed(1);
// totalTenants가 0이면 Infinity
```

---

## 📝 다음 단계

✅ **Step 8 완료**

**다음**: Step 9 - AdminCategory Service 생성
- 카테고리 생성/수정 비즈니스 로직
- 계층 구조 검증
- depth/path 자동 계산 검증

---

**작성일**: 2025년 10월 7일
**상태**: ✅ 완료
