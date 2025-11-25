# Step 2-16: TenantMember Routes 구현

## 1. 개요

**TenantMember Routes**는 판매사 구성원(TenantMember) 관련 API 엔드포인트를 정의하는 라우팅 레이어입니다.

### 주요 역할

- 판매사 가입 신청 및 구성원 목록 조회
- 내 소속 판매사 목록 조회
- 구성원 승인/거절/수정 (Owner 권한)

### 파일 위치

```
src/routes/tenantMember.routes.js
```

### 의존성

```javascript
const express = require('express');
const tenantMemberController = require('../controllers/tenantMember.controller');
const { authenticate } = require('../middlewares/auth');
```

---

## 2. 개념

### TenantMember Routes의 특수 구조

TenantMember Routes는 **3가지 URL 패턴**을 사용합니다:

```
1. /tenants/:id/members         - 판매사별 구성원 관리
2. /members/me/tenants          - 회원별 소속 판매사 조회
3. /tenant-members/:id          - 구성원별 상세/승인/거절/수정
```

### 왜 여러 URL 패턴을 사용하나?

#### RESTful 설계 원칙

1. **판매사 관점** (`/tenants/:id/members`):
   - "판매사의 구성원들"을 조회/추가
   - 판매사를 기준으로 구성원을 관리

2. **회원 관점** (`/members/me/tenants`):
   - "나의 소속 판매사들"을 조회
   - 회원을 기준으로 판매사 멤버십 확인

3. **구성원 관점** (`/tenant-members/:id`):
   - "특정 구성원"의 상세 정보 조회/수정
   - TenantMember 자체를 리소스로 관리

---

## 3. API 엔드포인트

### 3.1 판매사 구성원 목록 조회

```javascript
GET /api/v1/tenants/:id/members
```

#### 권한
- **Public**
- 미들웨어: 없음

#### Controller
`tenantMemberController.getTenantMembers`

#### URL Parameters
- `id` (number): 판매사 ID

#### Query Parameters
- `status` (string, optional): 상태 필터 (`pending`, `approved`, `rejected`)

#### 사용 예시
```bash
# 승인된 구성원만 조회
GET /api/v1/tenants/1/members?status=approved

# 대기 중인 신청 조회 (Owner용)
GET /api/v1/tenants/1/members?status=pending
```

---

### 3.2 판매사 가입 신청

```javascript
POST /api/v1/tenants/:id/members
```

#### 권한
- **Private**
- 미들웨어: `authenticate`

#### Controller
`tenantMemberController.applyToTenant`

#### URL Parameters
- `id` (number): 판매사 ID

#### Request Body
```json
{
  "tenant_member_role": "staff",
  "tenant_member_bank_name": "국민은행",
  "tenant_member_bank_account": "123-456-789",
  "tenant_member_account_holder": "홍길동",
  "tenant_member_commission_rate": 0.05
}
```

#### 사용 예시
```bash
POST /api/v1/tenants/1/members
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "tenant_member_role": "staff",
  "tenant_member_bank_name": "국민은행",
  "tenant_member_bank_account": "123-456-789"
}
```

---

### 3.3 내 소속 판매사 목록 조회

```javascript
GET /api/v1/members/me/tenants
```

#### 권한
- **Private**
- 미들웨어: `authenticate`

#### Controller
`tenantMemberController.getMyTenantMemberships`

#### Query Parameters
- `status` (string, optional): 상태 필터 (`pending`, `approved`, `rejected`)

#### 사용 예시
```bash
# 승인된 소속 판매사만 조회
GET /api/v1/members/me/tenants?status=approved
Authorization: Bearer <JWT_TOKEN>

# 모든 소속 판매사 조회
GET /api/v1/members/me/tenants
Authorization: Bearer <JWT_TOKEN>
```

---

### 3.4 구성원 상세 조회

```javascript
GET /api/v1/tenant-members/:id
```

#### 권한
- **Private** (본인 또는 같은 판매사 구성원)
- 미들웨어: `authenticate`
- 권한 검증: Service Layer에서 수행

#### Controller
`tenantMemberController.getTenantMemberById`

#### URL Parameters
- `id` (number): TenantMember ID

#### 사용 예시
```bash
GET /api/v1/tenant-members/10
Authorization: Bearer <JWT_TOKEN>
```

---

### 3.5 구성원 승인

```javascript
PUT /api/v1/tenant-members/:id/approve
```

#### 권한
- **Private** (Owner 전용)
- 미들웨어: `authenticate`
- 권한 검증: Service Layer에서 수행

#### Controller
`tenantMemberController.approveMember`

#### URL Parameters
- `id` (number): TenantMember ID

#### 사용 예시
```bash
PUT /api/v1/tenant-members/10/approve
Authorization: Bearer <OWNER_TOKEN>
```

---

### 3.6 구성원 거절

```javascript
PUT /api/v1/tenant-members/:id/reject
```

#### 권한
- **Private** (Owner 전용)
- 미들웨어: `authenticate`
- 권한 검증: Service Layer에서 수행

#### Controller
`tenantMemberController.rejectMember`

#### URL Parameters
- `id` (number): TenantMember ID

#### Request Body
```json
{
  "reason": "현재 구성원을 모집하지 않습니다"
}
```

#### 사용 예시
```bash
PUT /api/v1/tenant-members/10/reject
Authorization: Bearer <OWNER_TOKEN>
Content-Type: application/json

{
  "reason": "현재 구성원을 모집하지 않습니다"
}
```

---

### 3.7 구성원 정보 수정

```javascript
PUT /api/v1/tenant-members/:id
```

#### 권한
- **Private** (Owner 전용)
- 미들웨어: `authenticate`
- 권한 검증: Service Layer에서 수행

#### Controller
`tenantMemberController.updateMember`

#### URL Parameters
- `id` (number): TenantMember ID

#### Request Body
```json
{
  "tenant_member_role": "manager",
  "tenant_member_commission_rate": 0.03,
  "tenant_member_bank_account": "999-888-777"
}
```

#### 사용 예시
```bash
PUT /api/v1/tenant-members/10
Authorization: Bearer <OWNER_TOKEN>
Content-Type: application/json

{
  "tenant_member_role": "manager"
}
```

---

## 4. 라우트 구조 설계

### 4.1 RESTful 리소스 매핑

```
Resource: Tenant → Member (관계)
→ /tenants/:id/members

Resource: Member → Tenant (관계)
→ /members/me/tenants

Resource: TenantMember (엔티티)
→ /tenant-members/:id
```

### 4.2 라우트 정의 순서

```javascript
// 1. 판매사별 구성원 관리
router.get('/tenants/:id/members', ...);
router.post('/tenants/:id/members', ...);

// 2. 회원별 소속 판매사 조회
router.get('/members/me/tenants', ...);

// 3. 구성원별 상세/승인/거절/수정
router.get('/tenant-members/:id', ...);
router.put('/tenant-members/:id/approve', ...);
router.put('/tenant-members/:id/reject', ...);
router.put('/tenant-members/:id', ...);
```

### 4.3 index.js 등록 방식

```javascript
// src/routes/index.js
const tenantMemberRoutes = require('./tenantMember.routes');

// ✅ Root path에 등록 (여러 URL 패턴 지원)
router.use('/', tenantMemberRoutes);

// ❌ 특정 prefix로 등록하면 안 됨
router.use('/tenant-members', tenantMemberRoutes); // '/tenants/:id/members'가 작동 안 함
```

---

## 5. 사용 흐름

### 5.1 판매사 가입 → 승인 프로세스

```bash
# Step 1: 회원이 판매사에 가입 신청
POST /api/v1/tenants/1/members
Authorization: Bearer <user_token>
{
  "tenant_member_role": "staff",
  ...
}
→ 201 Created (tenant_member_approval_status: 'pending')

# Step 2: Owner가 대기 중인 신청 조회
GET /api/v1/tenants/1/members?status=pending
Authorization: Bearer <owner_token>
→ 200 OK (pending 구성원 목록)

# Step 3a: Owner가 승인
PUT /api/v1/tenant-members/10/approve
Authorization: Bearer <owner_token>
→ 200 OK (tenant_member_approval_status: 'approved')

# Step 3b: 또는 거절
PUT /api/v1/tenant-members/10/reject
Authorization: Bearer <owner_token>
{
  "reason": "현재 구성원을 모집하지 않습니다"
}
→ 200 OK (tenant_member_approval_status: 'rejected')

# Step 4: 회원이 자신의 소속 판매사 확인
GET /api/v1/members/me/tenants
Authorization: Bearer <user_token>
→ 200 OK (승인된 판매사 목록)
```

### 5.2 구성원 역할 변경

```bash
# Step 1: Owner가 구성원 목록 조회
GET /api/v1/tenants/1/members?status=approved
Authorization: Bearer <owner_token>

# Step 2: Owner가 구성원 역할 변경
PUT /api/v1/tenant-members/10
Authorization: Bearer <owner_token>
{
  "tenant_member_role": "manager"
}
→ 200 OK (staff → manager 승격)
```

---

## 6. 주의사항

### 6.1 Owner 권한은 Service에서 검증

Owner 권한은 `authorize` 미들웨어가 아닌 **Service Layer**에서 검증합니다:

```javascript
// ✅ Routes: authenticate만
router.put('/tenant-members/:id/approve', authenticate, tenantMemberController.approveMember);

// ✅ Service: Owner 권한 확인
async function approveMember(tenantMemberId, approverId) {
  const tenantMember = await tenantMemberRepository.findById(tenantMemberId);

  // Owner 확인
  const owner = await tenantMemberRepository.findOwner(tenantMember.tenant_id);
  if (Number(owner.member_id) !== approverId) {
    throw new ForbiddenError('Only tenant owner can approve members');
  }
  // ...
}
```

### 6.2 여러 URL 패턴 지원

하나의 Routes 파일에 여러 URL 패턴을 정의하므로 `router.use('/', ...)`로 등록해야 합니다:

```javascript
// src/routes/index.js

// ✅ Root path에 등록
router.use('/', tenantMemberRoutes);

// ❌ 특정 prefix는 안 됨
router.use('/tenant-members', tenantMemberRoutes); // 다른 URL 패턴 작동 안 함
```

### 6.3 Public API는 구성원 목록 조회만

판매사의 구성원 목록은 Public으로 조회 가능하지만, 나머지는 모두 인증 필요:

```javascript
// ✅ Public (구성원 목록)
router.get('/tenants/:id/members', tenantMemberController.getTenantMembers);

// ✅ Private (나머지 모두)
router.post('/tenants/:id/members', authenticate, ...);
router.get('/members/me/tenants', authenticate, ...);
router.get('/tenant-members/:id', authenticate, ...);
router.put('/tenant-members/:id/approve', authenticate, ...);
```

### 6.4 본인 확인

구성원 상세 조회는 **본인 또는 같은 판매사 구성원**만 가능:

```javascript
// Service Layer에서 권한 확인
async function getTenantMemberById(tenantMemberId, requesterId) {
  const tenantMember = await tenantMemberRepository.findById(tenantMemberId);

  // 본인 확인
  if (Number(tenantMember.member_id) === requesterId) {
    return convertBigIntToNumber(tenantMember);
  }

  // 같은 판매사 구성원 확인
  const isSameTenant = await tenantMemberRepository.isSameTenant(
    tenantMemberId,
    requesterId
  );

  if (!isSameTenant) {
    throw new ForbiddenError('Cannot view this tenant member information');
  }

  return convertBigIntToNumber(tenantMember);
}
```

---

## 7. 테스트 시나리오

### 7.1 판매사 가입 신청 테스트

```bash
# 1. 성공: 정상적인 가입 신청
POST /api/v1/tenants/1/members
Authorization: Bearer <valid_token>
→ 201 Created

# 2. 실패: 이미 가입된 판매사
POST /api/v1/tenants/1/members
Authorization: Bearer <already_member_token>
→ 400 Bad Request (Already member of this tenant)

# 3. 실패: 승인되지 않은 판매사
POST /api/v1/tenants/2/members (tenant_status: 'pending')
→ 400 Bad Request (Cannot join unapproved tenant)

# 4. 실패: 인증 없음
POST /api/v1/tenants/1/members
→ 401 Unauthorized
```

### 7.2 구성원 승인 테스트

```bash
# 1. 성공: Owner가 승인
PUT /api/v1/tenant-members/10/approve
Authorization: Bearer <owner_token>
→ 200 OK

# 2. 실패: Staff가 승인 시도
PUT /api/v1/tenant-members/10/approve
Authorization: Bearer <staff_token>
→ 403 Forbidden (Only tenant owner can approve members)

# 3. 실패: 다른 판매사 Owner가 승인 시도
PUT /api/v1/tenant-members/20/approve
Authorization: Bearer <other_owner_token>
→ 403 Forbidden

# 4. 실패: 이미 승인된 구성원
PUT /api/v1/tenant-members/10/approve
→ 400 Bad Request (Cannot approve member with status: approved)
```

### 7.3 내 소속 판매사 조회 테스트

```bash
# 1. 승인된 판매사만 조회
GET /api/v1/members/me/tenants?status=approved
Authorization: Bearer <valid_token>
→ 200 OK (승인된 판매사 목록)

# 2. 모든 상태 조회
GET /api/v1/members/me/tenants
Authorization: Bearer <valid_token>
→ 200 OK (pending, approved, rejected 모두)

# 3. 실패: 인증 없음
GET /api/v1/members/me/tenants
→ 401 Unauthorized
```

### 7.4 구성원 정보 수정 테스트

```bash
# 1. 성공: Owner가 구성원 역할 변경
PUT /api/v1/tenant-members/10
Authorization: Bearer <owner_token>
{
  "tenant_member_role": "manager"
}
→ 200 OK

# 2. 실패: Owner가 본인 역할 변경
PUT /api/v1/tenant-members/5 (owner 본인)
Authorization: Bearer <owner_token>
{
  "tenant_member_role": "staff"
}
→ 400 Bad Request (Cannot change your own role)

# 3. 실패: 수정할 필드 없음
PUT /api/v1/tenant-members/10
Authorization: Bearer <owner_token>
{}
→ 400 Bad Request (No fields to update)
```

---

## 8. 전체 코드

```javascript
const express = require('express');
const router = express.Router();
const tenantMemberController = require('../controllers/tenantMember.controller');
const { authenticate } = require('../middlewares/auth');

/**
 * TenantMember Routes
 * 판매사 구성원(TenantMember) 관련 API 엔드포인트
 */

// 판매사별 구성원 관리
router.get('/tenants/:id/members', tenantMemberController.getTenantMembers);
router.post('/tenants/:id/members', authenticate, tenantMemberController.applyToTenant);

// 회원별 소속 판매사 조회
router.get('/members/me/tenants', authenticate, tenantMemberController.getMyTenantMemberships);

// 구성원별 상세/승인/거절/수정
router.get('/tenant-members/:id', authenticate, tenantMemberController.getTenantMemberById);
router.put('/tenant-members/:id/approve', authenticate, tenantMemberController.approveMember);
router.put('/tenant-members/:id/reject', authenticate, tenantMemberController.rejectMember);
router.put('/tenant-members/:id', authenticate, tenantMemberController.updateMember);

module.exports = router;
```

---

## 9. 다음 단계

1. **Step 2-17**: Category Routes 문서화
2. **Step 2-18**: Product Routes 문서화
3. **Step 2-19**: Validation Middleware 추가
4. **Step 2-20**: 00_INDEX.md 업데이트

