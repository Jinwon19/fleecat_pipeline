# Step 2-1: Tenant Repository 생성

> **Phase 2: 판매자 기능 구축**
> **작성일**: 2025년 10월 2일
> **상태**: ✅ 완료

---

## 📋 작업 개요

### 목적
tenant 테이블에 대한 데이터 접근 계층(Repository)을 구현하여 판매사 관리 비즈니스 로직에서 데이터베이스 접근을 추상화합니다.

### 작업 내용
- `src/repositories/tenant.repository.js` 파일 생성
- Prisma를 사용한 CRUD 함수 구현
- 판매사 조회, 생성, 수정, 승인 기능 제공
- 페이지네이션 및 필터링 지원

---

## 🎯 Tenant Repository의 역할

### 멀티테넌시의 핵심
**Tenant**는 플랫폼의 핵심 개념으로, 여러 판매사(공방)가 하나의 플랫폼에서 독립적으로 운영됩니다.

```
플리캣 플랫폼
├─ 홍길동 도자기 공방 (Tenant #1)
├─ 이순신 목공예 공방 (Tenant #2)
└─ 신사임당 직물 공방 (Tenant #3)
```

### Repository 패턴 사용 이유

#### 1. 데이터 접근 로직 캡슐화
```javascript
// Service에서는 간단하게 호출
const tenant = await tenantRepository.findById(1);

// 내부적으로 복잡한 쿼리 처리 (include, BigInt 등)
```

#### 2. 승인 프로세스 관리
```javascript
// 상태 변경 시 자동으로 approved_at 설정
await tenantRepository.updateStatus(tenantId, 'approved');
```

#### 3. 재사용성
```javascript
// 여러 Service에서 같은 함수 사용
// tenantService.js
const tenant = await tenantRepository.findById(id);

// adminService.js
const tenant = await tenantRepository.findById(id);
```

---

## 📁 파일 위치

```
src/
└── repositories/
    ├── member.repository.js          (Phase 1 완료)
    ├── memberPermission.repository.js (Phase 1 완료)
    └── tenant.repository.js           ← 생성한 파일
```

---

## 💻 구현 코드

### 전체 구조

```javascript
const prisma = require('../config/database');

// 7개의 함수 제공:
// - 조회: findById, findByName, findAll
// - 존재 확인: existsByName
// - 생성: create
// - 수정: update, updateStatus
```

---

## 🔧 함수 설명

### 1. 조회 함수 (Read)

#### `findById(tenantId)`
**역할**: ID로 판매사 조회

**파라미터**:
- `tenantId` (number): 판매사 ID

**반환값**:
- 성공: 판매사 정보 객체 (tenant_detail 포함)
- 실패: null

**사용 예시**:
```javascript
const tenant = await tenantRepository.findById(1);

if (tenant) {
  console.log(tenant.tenant_name);           // '홍길동 도자기 공방'
  console.log(tenant.tenant_status);         // 'approved'
  console.log(tenant.tenant_detail);         // { tenant_detail_description: '...' }
}
```

**특징**:
- `include`로 tenant_detail 자동 조인
- BigInt 변환 처리
- 모든 상태의 판매사 조회 가능

---

#### `findByName(tenantName)`
**역할**: 이름으로 판매사 조회

**파라미터**:
- `tenantName` (string): 판매사 이름

**반환값**:
- 성공: 판매사 정보 객체
- 실패: null

**사용 예시**:
```javascript
// 중복 확인 시
const existing = await tenantRepository.findByName('홍길동 도자기 공방');

if (existing) {
  throw new ValidationError('Tenant name already exists');
}
```

**특징**:
- `tenant_name`은 UNIQUE 제약조건이 있어 최대 1개만 반환
- tenant_detail도 함께 조회

---

#### `findAll(options)`
**역할**: 판매사 목록 조회 (관리자용, 페이지네이션 지원)

**파라미터**:
```javascript
options = {
  page: 1,              // 페이지 번호
  limit: 10,            // 페이지당 항목 수
  status: 'approved'    // 상태 필터 (선택)
}
```

**반환값**:
```javascript
{
  tenants: [...],       // 판매사 목록
  total: 50,            // 전체 판매사 수
  page: 1,              // 현재 페이지
  totalPages: 5         // 전체 페이지 수
}
```

**사용 예시**:
```javascript
// 전체 판매사 조회 (페이지 1, 10개씩)
const result = await tenantRepository.findAll({ page: 1, limit: 10 });

console.log(`전체 ${result.total}개 중 ${result.tenants.length}개 조회`);

// 승인된 판매사만 조회
const approved = await tenantRepository.findAll({
  page: 1,
  limit: 10,
  status: 'approved'
});

// 대기 중인 판매사만 조회 (관리자 승인 대기 목록)
const pending = await tenantRepository.findAll({
  page: 1,
  limit: 10,
  status: 'pending'
});
```

**특징**:
- 페이지네이션 자동 계산
- 상태별 필터링 (pending/approved/rejected)
- 신청일시 최신순 정렬 (tenant_applied_at DESC)
- tenant_detail 포함

---

### 2. 존재 확인 함수

#### `existsByName(tenantName)`
**역할**: 판매사 이름 중복 확인

**파라미터**:
- `tenantName` (string): 판매사 이름

**반환값**:
- `true`: 이름이 이미 존재
- `false`: 사용 가능한 이름

**사용 예시**:
```javascript
// 판매사 등록 시 중복 확인
if (await tenantRepository.existsByName('홍길동 도자기 공방')) {
  throw new ValidationError('Tenant name already exists');
}

// 생성 진행
await tenantRepository.create({ ... });
```

**특징**:
- `findByName`보다 가벼움 (count만 조회)
- Boolean 반환으로 조건문에 바로 사용 가능

---

### 3. 생성 함수 (Create)

#### `create(tenantData)`
**역할**: 새 판매사 생성

**파라미터**:
```javascript
tenantData = {
  tenant_name: '홍길동 도자기 공방',           // 필수
  tenant_status: 'pending',                    // 선택 (기본값: 'pending')
  tenant_approval_member: '관리자 메모'        // 선택
}
```

**반환값**:
- 생성된 판매사 정보 객체

**사용 예시**:
```javascript
// tenantService.js에서 판매사 등록 신청
const tenant = await tenantRepository.create({
  tenant_name: '홍길동 도자기 공방',
  tenant_status: 'pending'  // 승인 대기 상태
});

console.log(`판매사 생성 완료: ID ${tenant.tenant_id}`);
console.log(`신청일시: ${tenant.tenant_applied_at}`);
```

**특징**:
- `tenant_applied_at`은 자동 설정 (현재 시간)
- 기본 상태는 'pending' (승인 대기)
- `tenant_updated_at`는 Prisma가 자동 설정

---

### 4. 수정 함수 (Update)

#### `update(tenantId, updateData)`
**역할**: 판매사 정보 수정

**파라미터**:
```javascript
tenantId = 1;

updateData = {
  tenant_name: '새 판매사명',              // 선택
  tenant_approval_member: '승인자 메모'    // 선택
}
```

**반환값**:
- 수정된 판매사 정보 객체

**사용 예시**:
```javascript
// 판매사명 변경
const updated = await tenantRepository.update(1, {
  tenant_name: '홍길동 도예 공방'
});

console.log(updated.tenant_name);  // '홍길동 도예 공방'
```

**특징**:
- `tenant_updated_at`는 자동 갱신
- 제공된 필드만 수정 (부분 업데이트)
- 상태 변경은 `updateStatus()` 사용 권장

---

#### `updateStatus(tenantId, status, approverNote)`
**역할**: 판매사 상태 변경 (승인/거절)

**파라미터**:
- `tenantId` (number): 판매사 ID
- `status` (string): 상태 ('approved' 또는 'rejected')
- `approverNote` (string, 선택): 승인자 메모

**반환값**:
- 수정된 판매사 정보 객체

**사용 예시**:
```javascript
// 관리자가 판매사 승인
const approved = await tenantRepository.updateStatus(
  1,
  'approved',
  '심사 완료. 승인합니다.'
);

console.log(approved.tenant_status);        // 'approved'
console.log(approved.tenant_approved_at);   // 2025-10-02T... (자동 설정)

// 판매사 거절
const rejected = await tenantRepository.updateStatus(
  2,
  'rejected',
  '서류 미비로 거절합니다.'
);

console.log(rejected.tenant_status);        // 'rejected'
console.log(rejected.tenant_approved_at);   // null (승인 안 됨)
```

**특징**:
- 승인 시 `tenant_approved_at` 자동 설정 (현재 시간)
- 거절 시 `tenant_approved_at`은 null 유지
- 승인자 메모 저장 가능

**승인 프로세스**:
```
pending (대기) → approved (승인)  → 구성원 모집 가능
               → rejected (거절)  → 활동 불가
```

---

## 🔄 실제 사용 흐름

### 판매사 등록 시나리오 (tenantService.js)

```javascript
const tenantRepository = require('../repositories/tenant.repository');
const { ValidationError } = require('../utils/errors');

async function createTenant(memberId, tenantData) {
  // 1. 이름 중복 확인
  if (await tenantRepository.existsByName(tenantData.name)) {
    throw new ValidationError('Tenant name already exists');
  }

  // 2. 판매사 생성 (pending 상태)
  const tenant = await tenantRepository.create({
    tenant_name: tenantData.name,
    tenant_status: 'pending'
  });

  // 3. TenantDetail 생성 (tenantDetailRepository 사용 - Step 2-2)
  await tenantDetailRepository.create({
    tenant_id: tenant.tenant_id,
    tenant_detail_description: tenantData.description,
    tenant_detail_phone: tenantData.phone,
    tenant_detail_email: tenantData.email,
    tenant_detail_address: tenantData.address
  });

  // 4. TenantMember 생성 (신청자를 owner로 등록 - Step 2-3)
  await tenantMemberRepository.create({
    tenant_id: tenant.tenant_id,
    member_id: memberId,
    tenant_member_role: 'owner',
    tenant_member_approval_status: 'approved'  // owner는 자동 승인
  });

  return tenant;
}
```

---

### 판매사 승인 시나리오 (adminService.js)

```javascript
async function approveTenant(adminId, tenantId, note) {
  // 1. 판매사 존재 확인
  const tenant = await tenantRepository.findById(tenantId);

  if (!tenant) {
    throw new NotFoundError('Tenant not found');
  }

  // 2. 이미 승인/거절된 경우 체크
  if (tenant.tenant_status !== 'pending') {
    throw new ValidationError(`Tenant is already ${tenant.tenant_status}`);
  }

  // 3. 상태 변경 (approved)
  const approved = await tenantRepository.updateStatus(
    tenantId,
    'approved',
    note || `Approved by admin ${adminId}`
  );

  return approved;
}
```

---

### 판매사 목록 조회 시나리오 (adminService.js)

```javascript
async function getPendingTenants(page = 1, limit = 10) {
  // 승인 대기 중인 판매사 목록
  const result = await tenantRepository.findAll({
    page,
    limit,
    status: 'pending'
  });

  // BigInt 변환
  const tenants = result.tenants.map(tenant => ({
    ...tenant,
    tenant_id: Number(tenant.tenant_id),
    tenant_detail: tenant.tenant_detail ? {
      ...tenant.tenant_detail,
      tenant_id: Number(tenant.tenant_detail.tenant_id)
    } : null
  }));

  return {
    tenants,
    total: result.total,
    page: result.page,
    totalPages: result.totalPages
  };
}
```

---

## 📊 데이터 흐름도

```
Controller
    ↓ (HTTP 요청)
Service
    ↓ (비즈니스 로직)
Repository ← Step 2-1 (여기!)
    ↓ (Prisma 쿼리)
Database (tenant 테이블)
```

### 예시: POST /api/v1/tenants (판매사 등록)

```
1. tenantController.createTenant
   - req.body에서 데이터 추출
   - req.user.member_id 가져오기
   - tenantService.createTenant() 호출
       ↓
2. tenantService.createTenant
   - tenantRepository.existsByName() 호출
   - tenantRepository.create() 호출
   - tenantDetailRepository.create() 호출
   - tenantMemberRepository.create() 호출
       ↓
3. tenantRepository.create
   - prisma.tenant.create() 실행
   - DB에 INSERT
       ↓
4. Database
   - tenant 테이블에 레코드 추가
   - tenant_id 자동 생성 (BIGSERIAL)
```

---

## ⚠️ 주의사항

### 1. BigInt 처리

Prisma에서 `BigInt` 타입은 JavaScript의 `BigInt`로 변환됩니다:

```javascript
// ✅ 올바른 사용
const tenant = await tenantRepository.findById(1);
// 내부적으로 BigInt(1)로 변환

// ❌ 잘못된 사용 (BigInt를 직접 전달)
const tenant = await tenantRepository.findById(BigInt(1));
// BigInt(BigInt(1)) → 타입 에러
```

**Repository에서 변환 처리**:
```javascript
async function findById(tenantId) {
  return await prisma.tenant.findUnique({
    where: { tenant_id: BigInt(tenantId) }  // ← 여기서 변환
  });
}
```

### 2. 승인 프로세스

```javascript
// ✅ 승인 시 approved_at 자동 설정
await tenantRepository.updateStatus(tenantId, 'approved');
// → tenant_approved_at: 2025-10-02T...

// ❌ update()로 직접 상태 변경 금지
await tenantRepository.update(tenantId, {
  tenant_status: 'approved'
  // tenant_approved_at이 설정되지 않음!
});
```

### 3. Unique 제약조건

```javascript
// tenant_name은 UNIQUE
const tenant1 = await tenantRepository.create({
  tenant_name: '홍길동 도자기 공방'
});

// ❌ 같은 이름으로 생성 시도 → Prisma 에러
const tenant2 = await tenantRepository.create({
  tenant_name: '홍길동 도자기 공방'
});
// Error: Unique constraint failed on the fields: (`tenant_name`)

// ✅ 생성 전 중복 확인 필수
if (await tenantRepository.existsByName(name)) {
  throw new ValidationError('Tenant name already exists');
}
```

### 4. 관계 데이터 포함

```javascript
// include로 tenant_detail 자동 조인
const tenant = await tenantRepository.findById(1);

console.log(tenant.tenant_name);                // '홍길동 도자기 공방'
console.log(tenant.tenant_detail.tenant_detail_phone);  // '010-1234-5678'

// Service에서 BigInt 변환 시 관계 데이터 제외 필요
const { tenant_detail, ...tenantData } = tenant;

return {
  ...tenantData,
  tenant_id: Number(tenantData.tenant_id),
  tenant_detail: tenant_detail ? {
    ...tenant_detail,
    tenant_id: Number(tenant_detail.tenant_id)
  } : null
};
```

### 5. 상태별 필터링

```javascript
// 승인된 판매사만 조회 (공개 API)
const approved = await tenantRepository.findAll({
  status: 'approved'
});

// 대기 중인 판매사만 조회 (관리자 전용)
const pending = await tenantRepository.findAll({
  status: 'pending'
});

// 전체 조회 (status 미지정)
const all = await tenantRepository.findAll({
  page: 1,
  limit: 10
});
```

---

## 🧪 테스트 가이드

### 수동 테스트 시나리오

#### 1. 판매사 생성
```javascript
// Step 2에서 tenantService 완성 후 테스트
POST /api/v1/tenants
Authorization: Bearer {token}
{
  "name": "홍길동 도자기 공방",
  "description": "전통 도자기를 만듭니다",
  "phone": "010-1234-5678",
  "email": "pottery@example.com",
  "address": "서울시 강남구..."
}

// 예상 응답 (201 Created)
{
  "success": true,
  "message": "Tenant created successfully",
  "data": {
    "tenant_id": 1,
    "tenant_name": "홍길동 도자기 공방",
    "tenant_status": "pending"
  }
}
```

#### 2. 이름 중복 확인
```javascript
// 같은 이름으로 재시도
POST /api/v1/tenants
{
  "name": "홍길동 도자기 공방",
  ...
}

// 예상 응답 (400 Bad Request)
{
  "success": false,
  "message": "Tenant name already exists"
}
```

#### 3. 판매사 승인 (관리자)
```javascript
PUT /api/v1/tenants/1/approve
Authorization: Bearer {admin_token}
{
  "note": "심사 완료. 승인합니다."
}

// 예상 응답 (200 OK)
{
  "success": true,
  "message": "Tenant approved successfully",
  "data": {
    "tenant_id": 1,
    "tenant_status": "approved",
    "tenant_approved_at": "2025-10-02T..."
  }
}
```

---

## 📈 Member Repository vs Tenant Repository

### 공통점
| 항목 | 설명 |
|------|------|
| 패턴 | Repository 패턴 사용 |
| ORM | Prisma 사용 |
| 에러 처리 | Try-catch 사용 |
| 주석 | JSDoc 형식 |

### 차이점
| 항목 | Member Repository | Tenant Repository |
|------|------------------|-------------------|
| **대상 테이블** | `member` | `tenant` |
| **주요 관심사** | 회원 인증, 정보 관리 | 판매사 등록, 승인 관리 |
| **상태 관리** | `member_status` (active/inactive/suspended) | `tenant_status` (pending/approved/rejected) |
| **승인 프로세스** | ❌ 없음 (즉시 활성화) | ✅ 있음 (관리자 승인 필요) |
| **1:1 관계** | `MemberPermission` | `TenantDetail` |
| **중복 확인** | `existsByEmail()`, `existsByNickname()` | `existsByName()` |
| **특수 함수** | `updatePassword()` | `updateStatus()` |

---

## 🔗 다음 단계

### Step 2-2: TenantDetail Repository
다음 단계에서는 tenant_detail 테이블의 Repository를 만들 예정입니다:

- `src/repositories/tenantDetail.repository.js`
- 판매사 상세 정보 관리
- 설명, 연락처, 주소, 수수료율 등

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
- [Step 2-1 개념 설명](./2-1_tenant_repository_draft.md)

### 이전 Phase
- [Phase 1: 기초 인프라 구축](../step1/00_INDEX.md)
- [Step 1-4: Member Repository](../step1/1-4_member_repository.md)

---

**작성일**: 2025년 10월 2일
**작성자**: Backend Team
**상태**: ✅ 완료
