# Step 2-2: TenantDetail Repository 생성

> **Phase 2: 판매자 기능 구축**
> **작성일**: 2025년 10월 2일
> **상태**: ✅ 완료

---

## 📋 작업 개요

### 목적
tenant_detail 테이블에 대한 데이터 접근 계층(Repository)을 구현하여 판매사 상세 정보를 관리합니다.

### 작업 내용
- `src/repositories/tenantDetail.repository.js` 파일 생성
- Prisma를 사용한 CRUD 함수 구현
- Tenant와 1:1 관계를 맺는 상세 정보 관리

---

## 🎯 TenantDetail이란?

### 개념

**TenantDetail**은 Tenant(판매사)의 **상세 정보**를 저장하는 테이블로, Tenant와 **1:1 관계**를 맺습니다.

### 왜 테이블을 분리했는가?

**분리 전 (단일 테이블의 문제점)**:
```
tenant 테이블
├─ tenant_id
├─ tenant_name
├─ tenant_status
├─ tenant_description      ← 긴 TEXT 필드
├─ tenant_phone
├─ tenant_email
├─ tenant_address          ← 긴 VARCHAR 필드
├─ tenant_business_hours
└─ ... (많은 필드로 테이블이 가로로 길어짐)
```

**문제점**:
- 테이블이 너무 커짐 (많은 컬럼)
- 필수 정보와 선택 정보가 섞임
- 목록 조회 시 불필요한 필드까지 조회 (성능 저하)

**분리 후 (1:1 관계의 장점)**:
```
tenant (기본 정보)          tenant_detail (상세 정보)
├─ tenant_id (PK)          ├─ tenant_detail_id (PK)
├─ tenant_name (필수)      ├─ tenant_id (FK, Unique)
├─ tenant_status (필수)    ├─ tenant_detail_description (선택)
└─ tenant_approved_at      ├─ tenant_detail_phone (선택)
                           ├─ tenant_detail_email (선택)
                           ├─ tenant_detail_address (선택)
                           └─ ... (선택 정보들)
```

**장점**:
1. **테이블 정규화**: 핵심 정보와 상세 정보 분리
2. **성능 향상**: 목록 조회 시 tenant만 조회 → 빠름
3. **유지보수 용이**: 상세 정보 추가/변경이 tenant 테이블에 영향 없음

---

## 🔗 1:1 관계의 특징

### 데이터베이스 구조

```sql
-- tenant (parent)
tenant_id (PK)  tenant_name          tenant_status
    1           홍길동 도자기 공방    approved
    2           이순신 목공예 공방    pending

-- tenant_detail (child)
tenant_detail_id (PK)  tenant_id (FK, UNIQUE)  tenant_detail_phone
        1                      1                "010-1234-5678"
        2                      2                "010-5678-1234"
```

**핵심**:
- `tenant_id`는 **UNIQUE** 제약조건 → 하나의 Tenant는 하나의 TenantDetail만 가짐
- **FK + UNIQUE** = 1:1 관계

### Prisma 스키마

```prisma
// Tenant (parent)
model Tenant {
  tenant_id       BigInt         @id @default(autoincrement())
  tenant_name     String         @unique

  tenant_detail   TenantDetail?  // ← 1:1 관계 (optional)

  @@map("tenant")
}

// TenantDetail (child)
model TenantDetail {
  tenant_detail_id  BigInt  @id @default(autoincrement())
  tenant_id         BigInt  @unique  // ← UNIQUE 제약 (1:1)

  tenant_detail_description  String?
  tenant_detail_phone        String?
  // ...

  tenant  Tenant  @relation(fields: [tenant_id], references: [tenant_id], onDelete: Cascade)

  @@map("tenant_detail")
}
```

**CASCADE 정책**:
- Tenant 삭제 시 TenantDetail도 자동 삭제 (`onDelete: Cascade`)
- 판매사가 사라지면 상세 정보도 의미 없으므로 함께 삭제

---

## 📁 파일 위치

```
src/
└── repositories/
    ├── member.repository.js          (Phase 1 완료)
    ├── memberPermission.repository.js (Phase 1 완료)
    ├── tenant.repository.js           (Step 2-1 완료)
    └── tenantDetail.repository.js     ← 생성한 파일
```

---

## 💻 구현 코드

### 전체 구조

```javascript
const prisma = require('../config/database');

// 3개의 함수 제공 (단순함):
// - 조회: findByTenantId
// - 생성: create
// - 수정: update
```

---

## 🔧 함수 설명

### 1. 조회 함수 (Read)

#### `findByTenantId(tenantId)`
**역할**: Tenant ID로 상세 정보 조회

**파라미터**:
- `tenantId` (number): 판매사 ID

**반환값**:
- 성공: 판매사 상세 정보 객체
- 실패: null

**사용 예시**:
```javascript
const detail = await tenantDetailRepository.findByTenantId(1);

if (detail) {
  console.log(detail.tenant_detail_description);  // '전통 도자기를 만드는 공방입니다'
  console.log(detail.tenant_detail_phone);        // '010-1234-5678'
  console.log(detail.tenant_detail_email);        // 'pottery@example.com'
}
```

**특징**:
- `tenant_id`는 UNIQUE이므로 최대 1개만 반환
- Tenant Repository의 `findById()`는 이미 `include`로 tenant_detail을 포함하므로 별도 호출은 드뭄

**언제 사용하는가?**:
```javascript
// ❌ 일반적으로는 사용 안 함
const tenant = await tenantRepository.findById(1);
const detail = await tenantDetailRepository.findByTenantId(1);  // 불필요

// ✅ Tenant Repository에서 이미 include함
const tenant = await tenantRepository.findById(1);
console.log(tenant.tenant_detail.tenant_detail_phone);  // 이미 포함됨

// ✅ 상세 정보만 따로 조회할 때 사용
const detail = await tenantDetailRepository.findByTenantId(1);
```

---

### 2. 생성 함수 (Create)

#### `create(tenantDetailData)`
**역할**: 판매사 상세 정보 생성

**파라미터**:
```javascript
tenantDetailData = {
  tenant_id: 1,                                      // 필수
  tenant_detail_description: '전통 도자기를 만드는...',  // 선택
  tenant_detail_phone: '010-1234-5678',              // 선택
  tenant_detail_email: 'pottery@example.com',        // 선택
  tenant_detail_zipcode: '06234',                    // 선택
  tenant_detail_address: '서울시 강남구...',          // 선택
  tenant_detail_address_detail: '3층 A동',           // 선택
  tenant_detail_business_hours: '평일 09:00-18:00',  // 선택
  tenant_detail_commission_rate: 5.0                 // 선택 (수수료율 5%)
}
```

**반환값**:
- 생성된 판매사 상세 정보 객체

**사용 예시**:
```javascript
// tenantService.js에서 판매사 등록 시
const tenant = await tenantRepository.create({
  tenant_name: '홍길동 도자기 공방',
  tenant_status: 'pending'
});

// 상세 정보 함께 생성
const detail = await tenantDetailRepository.create({
  tenant_id: tenant.tenant_id,
  tenant_detail_description: '전통 도자기를 만드는 공방입니다',
  tenant_detail_phone: '010-1234-5678',
  tenant_detail_email: 'pottery@example.com',
  tenant_detail_address: '서울시 강남구 테헤란로 123',
  tenant_detail_commission_rate: 5.0
});

console.log(`TenantDetail 생성 완료: ID ${detail.tenant_detail_id}`);
```

**특징**:
- 모든 필드가 선택적 (null 허용)
- `tenant_id`만 필수 (FK)
- `tenant_created_at`, `tenant_updated_at`는 자동 설정

---

### 3. 수정 함수 (Update)

#### `update(tenantId, updateData)`
**역할**: 판매사 상세 정보 수정

**파라미터**:
```javascript
tenantId = 1;

updateData = {
  tenant_detail_description: '업데이트된 설명',     // 선택
  tenant_detail_phone: '010-9999-8888',          // 선택
  tenant_detail_email: 'new@example.com',        // 선택
  tenant_detail_business_hours: '평일 10:00-19:00'  // 선택
}
```

**반환값**:
- 수정된 판매사 상세 정보 객체

**사용 예시**:
```javascript
// 판매사 정보 수정
const updated = await tenantDetailRepository.update(1, {
  tenant_detail_phone: '010-9999-8888',
  tenant_detail_email: 'new@example.com',
  tenant_detail_business_hours: '평일 10:00-19:00, 토요일 10:00-15:00'
});

console.log(updated.tenant_detail_phone);  // '010-9999-8888'
```

**특징**:
- `tenant_detail_updated_at`는 자동 갱신
- 제공된 필드만 수정 (부분 업데이트)

---

## 🔄 실제 사용 흐름

### 판매사 등록 시 (Tenant + TenantDetail 함께 생성)

```javascript
// tenantService.js
const tenantRepository = require('../repositories/tenant.repository');
const tenantDetailRepository = require('../repositories/tenantDetail.repository');
const tenantMemberRepository = require('../repositories/tenantMember.repository');
const { ValidationError } = require('../utils/errors');

async function createTenant(memberId, data) {
  // 1. 이름 중복 확인
  if (await tenantRepository.existsByName(data.name)) {
    throw new ValidationError('Tenant name already exists');
  }

  // 2. Tenant 생성 (기본 정보)
  const tenant = await tenantRepository.create({
    tenant_name: data.name,
    tenant_status: 'pending'
  });

  // 3. TenantDetail 생성 (상세 정보)
  await tenantDetailRepository.create({
    tenant_id: tenant.tenant_id,
    tenant_detail_description: data.description,
    tenant_detail_phone: data.phone,
    tenant_detail_email: data.email,
    tenant_detail_zipcode: data.zipcode,
    tenant_detail_address: data.address,
    tenant_detail_address_detail: data.address_detail,
    tenant_detail_business_hours: data.business_hours,
    tenant_detail_commission_rate: 5.0  // 기본 수수료율 5%
  });

  // 4. TenantMember 생성 (신청자를 owner로 등록)
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

### 판매사 정보 수정 시

```javascript
// tenantService.js
async function updateTenant(tenantId, memberId, data) {
  // 1. 권한 확인 (owner만 수정 가능)
  const tenantMember = await tenantMemberRepository.findByTenantIdAndMemberId(
    tenantId,
    memberId
  );

  if (!tenantMember || tenantMember.tenant_member_role !== 'owner') {
    throw new ForbiddenError('Only tenant owner can update tenant info');
  }

  // 2. 기본 정보 수정 (이름)
  if (data.name) {
    // 이름 중복 확인
    const existing = await tenantRepository.findByName(data.name);
    if (existing && existing.tenant_id !== BigInt(tenantId)) {
      throw new ValidationError('Tenant name already exists');
    }

    await tenantRepository.update(tenantId, {
      tenant_name: data.name
    });
  }

  // 3. 상세 정보 수정
  const updateData = {};
  if (data.description !== undefined) updateData.tenant_detail_description = data.description;
  if (data.phone !== undefined) updateData.tenant_detail_phone = data.phone;
  if (data.email !== undefined) updateData.tenant_detail_email = data.email;
  if (data.address !== undefined) updateData.tenant_detail_address = data.address;
  if (data.business_hours !== undefined) updateData.tenant_detail_business_hours = data.business_hours;

  if (Object.keys(updateData).length > 0) {
    await tenantDetailRepository.update(tenantId, updateData);
  }

  return { message: 'Tenant updated successfully' };
}
```

---

### 판매사 조회 시 (상세 정보 포함)

```javascript
// tenantService.js
async function getTenantById(tenantId) {
  // Tenant Repository의 findById는 이미 tenant_detail을 include함
  const tenant = await tenantRepository.findById(tenantId);

  if (!tenant) {
    throw new NotFoundError('Tenant not found');
  }

  // BigInt 변환 및 관계 데이터 제거
  const { tenant_detail, ...tenantData } = tenant;

  return {
    // 기본 정보
    tenant_id: Number(tenantData.tenant_id),
    tenant_name: tenantData.tenant_name,
    tenant_status: tenantData.tenant_status,
    tenant_applied_at: tenantData.tenant_applied_at,
    tenant_approved_at: tenantData.tenant_approved_at,

    // 상세 정보 (optional)
    description: tenant_detail?.tenant_detail_description,
    phone: tenant_detail?.tenant_detail_phone,
    email: tenant_detail?.tenant_detail_email,
    zipcode: tenant_detail?.tenant_detail_zipcode,
    address: tenant_detail?.tenant_detail_address,
    address_detail: tenant_detail?.tenant_detail_address_detail,
    business_hours: tenant_detail?.tenant_detail_business_hours,
    commission_rate: tenant_detail?.tenant_detail_commission_rate ? Number(tenant_detail.tenant_detail_commission_rate) : null
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
Repository ← Step 2-2 (여기!)
    ↓ (Prisma 쿼리)
Database (tenant_detail 테이블)
```

### 예시: POST /api/v1/tenants (판매사 등록)

```
1. tenantController.createTenant
   - req.body에서 데이터 추출
   - tenantService.createTenant() 호출
       ↓
2. tenantService.createTenant
   - tenantRepository.existsByName() 호출
   - tenantRepository.create() 호출
   - tenantDetailRepository.create() 호출  ← Step 2-2
   - tenantMemberRepository.create() 호출
       ↓
3. tenantDetailRepository.create
   - prisma.tenantDetail.create() 실행
   - DB에 INSERT
       ↓
4. Database
   - tenant_detail 테이블에 레코드 추가
   - tenant_detail_id 자동 생성 (BIGSERIAL)
```

---

## ⚠️ 주의사항

### 1. BigInt 처리

```javascript
// ✅ 올바른 사용
const detail = await tenantDetailRepository.findByTenantId(1);
// 내부적으로 BigInt(1)로 변환

// Repository에서 변환 처리
async function create(tenantDetailData) {
  return await prisma.tenantDetail.create({
    data: {
      tenant_id: BigInt(tenantDetailData.tenant_id)  // ← 변환 필수
    }
  });
}
```

### 2. 1:1 관계의 UNIQUE 제약

```javascript
// tenant_id는 UNIQUE
const detail1 = await tenantDetailRepository.create({
  tenant_id: 1,
  tenant_detail_phone: '010-1111-1111'
});

// ❌ 같은 tenant_id로 두 번째 생성 시도 → 에러
const detail2 = await tenantDetailRepository.create({
  tenant_id: 1,  // 이미 존재함
  tenant_detail_phone: '010-2222-2222'
});
// Error: Unique constraint failed on the fields: (`tenant_id`)

// ✅ 이미 존재하면 update 사용
const existing = await tenantDetailRepository.findByTenantId(1);
if (existing) {
  await tenantDetailRepository.update(1, {
    tenant_detail_phone: '010-2222-2222'
  });
}
```

### 3. CASCADE DELETE

```javascript
// Tenant 삭제 시 TenantDetail도 자동 삭제됨
await prisma.tenant.delete({
  where: { tenant_id: BigInt(1) }
});
// → tenant_detail 테이블의 해당 레코드도 함께 삭제 (onDelete: Cascade)

// 수동으로 삭제할 필요 없음 (자동 처리됨)
```

### 4. Optional 관계

```javascript
// TenantDetail이 없어도 Tenant는 존재 가능
const tenant = await tenantRepository.create({
  tenant_name: '홍길동 도자기 공방'
});
// tenant_detail은 나중에 추가 가능

// 조회 시 null 체크 필수
const tenant = await tenantRepository.findById(1);
const phone = tenant.tenant_detail?.tenant_detail_phone;  // ← ?. 사용

if (tenant.tenant_detail) {
  console.log(tenant.tenant_detail.tenant_detail_phone);
} else {
  console.log('상세 정보 없음');
}
```

### 5. findByTenantId vs findById

```javascript
// ❌ findById는 없음 (tenant_detail_id로 조회하는 함수)
const detail = await tenantDetailRepository.findById(1);  // 에러!

// ✅ findByTenantId 사용 (tenant_id로 조회)
const detail = await tenantDetailRepository.findByTenantId(1);

// 이유: 1:1 관계에서 FK(tenant_id)로 조회하는 게 일반적
```

---

## 📈 Tenant Repository vs TenantDetail Repository

### 공통점

| 항목 | 설명 |
|------|------|
| 패턴 | Repository 패턴 사용 |
| ORM | Prisma 사용 |
| 에러 처리 | Try-catch 사용 |
| 주석 | JSDoc 형식 |

### 차이점

| 항목 | Tenant Repository | TenantDetail Repository |
|------|------------------|------------------------|
| **대상 테이블** | `tenant` | `tenant_detail` |
| **함수 개수** | 7개 (복잡) | 3개 (단순) |
| **조회 함수** | `findById()`, `findByName()`, `findAll()` | `findByTenantId()` |
| **중복 확인** | ✅ `existsByName()` | ❌ 없음 (1:1 관계) |
| **승인 프로세스** | ✅ `updateStatus()` | ❌ 없음 |
| **페이징** | ✅ `findAll()` | ❌ 없음 (include로 조회) |
| **주요 관심사** | 판매사 등록, 승인 관리 | 상세 정보 관리 |

---

## 🧪 테스트 가이드

### 수동 테스트 시나리오

#### 1. 판매사 등록 시 상세 정보 함께 생성
```javascript
// Step 2에서 tenantService 완성 후 테스트
POST /api/v1/tenants
Authorization: Bearer {token}
{
  "name": "홍길동 도자기 공방",
  "description": "전통 도자기를 만드는 공방입니다",
  "phone": "010-1234-5678",
  "email": "pottery@example.com",
  "zipcode": "06234",
  "address": "서울시 강남구 테헤란로 123",
  "address_detail": "3층 A동",
  "business_hours": "평일 09:00-18:00"
}

// 예상: tenant와 tenant_detail 모두 생성됨
```

#### 2. 판매사 정보 수정
```javascript
PUT /api/v1/tenants/1
Authorization: Bearer {owner_token}
{
  "description": "업데이트된 설명",
  "phone": "010-9999-8888",
  "business_hours": "평일 10:00-19:00, 토요일 10:00-15:00"
}

// 예상: tenant_detail만 업데이트됨
```

#### 3. 판매사 조회 (상세 정보 포함)
```javascript
GET /api/v1/tenants/1

// 예상 응답 (200 OK)
{
  "success": true,
  "data": {
    "tenant_id": 1,
    "tenant_name": "홍길동 도자기 공방",
    "tenant_status": "approved",
    "description": "전통 도자기를 만드는 공방입니다",
    "phone": "010-1234-5678",
    "email": "pottery@example.com",
    "address": "서울시 강남구 테헤란로 123",
    "business_hours": "평일 09:00-18:00"
  }
}
```

---

## 🔗 다음 단계

### Step 2-3: TenantMember Repository
다음 단계에서는 tenant_member 테이블의 Repository를 만들 예정입니다:

- `src/repositories/tenantMember.repository.js`
- 판매사 구성원 관리 (회원과 판매사의 N:N 관계)
- 역할(owner/manager/staff) 및 승인 관리

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

### 이전 Phase
- [Phase 1: 기초 인프라 구축](../step1/00_INDEX.md)
- [Step 1-4: Member Repository](../step1/1-4_member_repository.md)

---

**작성일**: 2025년 10월 2일
**작성자**: Backend Team
**상태**: ✅ 완료
