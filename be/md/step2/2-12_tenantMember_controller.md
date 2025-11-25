# Step 2-12: TenantMember Controller 구현

## 1. 개요

**TenantMember Controller**는 판매사 구성원(TenantMember) 관련 HTTP 요청/응답을 처리하는 컨트롤러입니다.

### 주요 역할

- 판매사 가입 신청 처리
- 판매사 구성원 목록 조회
- 구성원 승인/거절 (Owner 권한)
- 구성원 정보 수정 (Owner 권한)
- 내 소속 판매사 목록 조회

### 파일 위치

```
src/controllers/tenantMember.controller.js
```

### 의존성

```javascript
const tenantMemberService = require('../services/tenantMember.service');
const { successResponse } = require('../utils/response');
```

---

## 2. 개념

### TenantMember의 역할

**TenantMember**는 Member와 Tenant를 연결하는 중간 테이블입니다.

```
Member (N) ←→ (N) Tenant
           ↑
      TenantMember
      (Join Table)
```

#### 주요 특징

1. **멀티 멤버십**: 한 회원이 여러 판매사에 소속 가능
2. **역할 구분**: `owner`, `manager`, `staff`
3. **승인 절차**: 가입 신청 → Owner 승인 → 활동 가능
4. **상품 소유**: Product는 TenantMember에 속함 (Tenant가 아님!)

#### 워크플로우

```
1. [회원] POST /tenants/:id/members (판매사 가입 신청)
   → tenant_member_approval_status: 'pending'
   → tenant_member_role: 'staff' (기본값)

2. [Owner] GET /tenants/:id/members?status=pending (대기 중인 신청 조회)

3a. [Owner] PUT /tenant-members/:id/approve (승인)
   → tenant_member_approval_status: 'approved'
   → 상품 등록 가능

3b. [Owner] PUT /tenant-members/:id/reject (거절)
   → tenant_member_approval_status: 'rejected'
```

---

## 3. 함수 설명

### 3.1 `applyToTenant(req, res, next)`

**판매사 가입 신청** (인증 필요)

#### HTTP 요청
```
POST /api/v1/tenants/:id/members
Authorization: Bearer <JWT_TOKEN>
```

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

#### Response (201 Created)
```json
{
  "success": true,
  "message": "Application submitted. Waiting for tenant owner approval.",
  "data": {
    "tenant_member_id": 10,
    "tenant_member_role": "staff",
    "tenant_member_approval_status": "pending",
    "tenant": {
      "tenant_id": 1,
      "tenant_name": "홍길동 공방"
    }
  }
}
```

#### 주요 로직
1. URL 파라미터에서 `tenantId`, JWT에서 `memberId` 추출
2. Request Body에서 구성원 데이터 추출
3. `tenantMemberService.applyToTenant(memberId, tenantId, data)` 호출
4. `successResponse` 헬퍼로 201 응답 반환

---

### 3.2 `getTenantMembers(req, res, next)`

**판매사 구성원 목록 조회** (Public)

#### HTTP 요청
```
GET /api/v1/tenants/:id/members?status=approved
```

#### Query Parameters
- `status` (string, optional): 상태 필터 (`pending`, `approved`, `rejected`)

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "tenant_member_id": 10,
      "tenant_member_role": "owner",
      "tenant_member_approval_status": "approved",
      "member": {
        "member_id": 123,
        "member_name": "홍길동",
        "member_nickname": "도자기장인"
      }
    }
  ]
}
```

#### 주요 로직
1. URL 파라미터에서 `tenantId` 추출
2. Query Parameters에서 `status` 추출
3. `tenantMemberService.getTenantMembers(tenantId, options)` 호출
4. 성공 응답 반환

---

### 3.3 `getMyTenantMemberships(req, res, next)`

**내 소속 판매사 목록 조회** (인증 필요)

#### HTTP 요청
```
GET /api/v1/members/me/tenants?status=approved
Authorization: Bearer <JWT_TOKEN>
```

#### Query Parameters
- `status` (string, optional): 상태 필터

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "tenant_id": 1,
      "tenant_name": "A 공방",
      "tenant_member_id": 10,
      "tenant_member_role": "owner",
      "tenant_member_approval_status": "approved",
      "tenant_member_total_sales_amount": 1000000,
      "tenant_member_total_sales_count": 50
    }
  ]
}
```

#### 주요 로직
1. JWT 토큰에서 `memberId` 추출
2. Query Parameters에서 `status` 추출
3. `tenantMemberService.getMyTenantMemberships(memberId, options)` 호출
4. 성공 응답 반환

---

### 3.4 `approveMember(req, res, next)`

**구성원 승인** (Owner 전용)

#### HTTP 요청
```
PUT /api/v1/tenant-members/:id/approve
Authorization: Bearer <JWT_TOKEN> (owner)
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Member approved successfully",
  "data": {
    "tenant_member_id": 10,
    "tenant_member_role": "staff",
    "tenant_member_approval_status": "approved",
    "tenant_member_approved_at": "2025-10-13T10:30:00Z"
  }
}
```

#### 주요 로직
1. URL 파라미터에서 `tenantMemberId`, JWT에서 `approverId` 추출
2. `tenantMemberService.approveMember(tenantMemberId, approverId)` 호출
   - Service에서 Owner 권한 검증
3. 성공 응답 반환

---

### 3.5 `rejectMember(req, res, next)`

**구성원 거절** (Owner 전용)

#### HTTP 요청
```
PUT /api/v1/tenant-members/:id/reject
Authorization: Bearer <JWT_TOKEN> (owner)
```

#### Request Body
```json
{
  "reason": "현재 구성원을 모집하지 않습니다"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Member rejected",
  "data": {
    "tenant_member_id": 10,
    "tenant_member_approval_status": "rejected"
  }
}
```

#### 주요 로직
1. URL 파라미터에서 `tenantMemberId`, JWT에서 `approverId`, Body에서 `reason` 추출
2. `tenantMemberService.rejectMember(tenantMemberId, approverId, reason)` 호출
3. 성공 응답 반환

---

### 3.6 `updateMember(req, res, next)`

**구성원 정보 수정** (Owner 전용)

#### HTTP 요청
```
PUT /api/v1/tenant-members/:id
Authorization: Bearer <JWT_TOKEN> (owner)
```

#### Request Body
```json
{
  "tenant_member_role": "manager",
  "tenant_member_commission_rate": 0.03,
  "tenant_member_bank_account": "999-888-777"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Member updated successfully",
  "data": {
    "tenant_member_id": 10,
    "tenant_member_role": "manager",
    "tenant_member_commission_rate": 0.03
  }
}
```

#### 주요 로직
1. URL 파라미터에서 `tenantMemberId`, JWT에서 `requesterId` 추출
2. Request Body에서 수정 데이터 추출
3. `tenantMemberService.updateMember(tenantMemberId, requesterId, updateData)` 호출
   - Service에서 Owner 권한 검증
   - Owner 본인은 역할 수정 불가
4. 성공 응답 반환

---

### 3.7 `getTenantMemberById(req, res, next)`

**구성원 상세 조회** (인증 필요, 본인 또는 같은 판매사 구성원)

#### HTTP 요청
```
GET /api/v1/tenant-members/:id
Authorization: Bearer <JWT_TOKEN>
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "tenant_member_id": 10,
    "tenant_member_role": "owner",
    "tenant_member_approval_status": "approved",
    "tenant": {
      "tenant_id": 1,
      "tenant_name": "홍길동 공방"
    },
    "member": {
      "member_id": 123,
      "member_name": "홍길동"
    }
  }
}
```

#### 주요 로직
1. URL 파라미터에서 `tenantMemberId`, JWT에서 `requesterId` 추출
2. `tenantMemberService.getTenantMemberById(tenantMemberId, requesterId)` 호출
   - Service에서 접근 권한 검증 (본인 또는 같은 판매사 구성원)
3. 성공 응답 반환

---

## 4. 사용 흐름

### 4.1 판매사 가입 → 승인 프로세스

```
1. [회원] POST /api/v1/tenants/1/members (판매사 가입 신청)
   → tenant_member_approval_status: 'pending'
   → tenant_member_role: 'staff' (기본값)

2. [Owner] GET /api/v1/tenants/1/members?status=pending (대기 중인 신청 조회)
   → 가입 신청 목록 확인

3a. [Owner] PUT /api/v1/tenant-members/10/approve (승인)
   → tenant_member_approval_status: 'approved'
   → tenant_member_approved_at 기록
   → 이제 상품 등록 가능

3b. [Owner] PUT /api/v1/tenant-members/10/reject (거절)
   → tenant_member_approval_status: 'rejected'

4. [회원] GET /api/v1/members/me/tenants (내 소속 판매사 조회)
   → 승인된 판매사 목록 확인
```

### 4.2 구성원 역할 변경 프로세스

```
1. [Owner] GET /api/v1/tenants/1/members (구성원 목록 조회)

2. [Owner] PUT /api/v1/tenant-members/10 (역할 변경)
   {
     "tenant_member_role": "manager"
   }
   → staff → manager 승격

3. [Manager] 이제 상품 관리 권한 확대 (구현 예정)
```

---

## 5. 주의사항

### 5.1 권한 검증은 Service에서

Controller는 **데이터 추출만** 수행하고, **권한 검증은 Service에 위임**:

```javascript
// ❌ 잘못된 예시: Controller에서 권한 검증
async function approveMember(req, res, next) {
  const tenantMember = await prisma.tenantMember.findUnique(...);
  if (tenantMember.tenant.owner_id !== req.user.member_id) {
    throw new ForbiddenError('...');
  }
  // ...
}

// ✅ 올바른 예시: Service에 위임
async function approveMember(req, res, next) {
  const tenantMemberId = parseInt(req.params.id, 10);
  const approverId = req.user.member_id;
  const approved = await tenantMemberService.approveMember(tenantMemberId, approverId);
  return successResponse(res, approved, '...', 200);
}
```

### 5.2 정수 변환 필수

URL 파라미터는 항상 문자열:

```javascript
const tenantId = parseInt(req.params.id, 10); // 10진수 변환
```

### 5.3 TenantMember vs Tenant 구분

- **Tenant**: 판매사 자체 (공방, 브랜드)
- **TenantMember**: 판매사 구성원 (판매자)
- **Product**: TenantMember에 속함 (Tenant가 아님!)

따라서 상품 등록 시 `tenant_member_id`가 필요합니다.

### 5.4 Owner 자동 생성

Tenant 등록 시 Owner가 자동으로 생성되므로, Owner는 별도로 가입 신청할 필요가 없습니다.

```javascript
// tenantService.createTenant()에서 자동 생성
await tenantMemberRepository.create({
  tenant_id: tenant.tenant_id,
  member_id: memberId,
  tenant_member_role: 'owner',
  tenant_member_approval_status: 'approved' // 자동 승인
});
```

---

## 6. 테스트 시나리오

### 6.1 판매사 가입 신청 테스트

```javascript
// 1. 성공: 정상적인 가입 신청
POST /api/v1/tenants/1/members
Authorization: Bearer <valid_token>
{
  "tenant_member_role": "staff",
  "tenant_member_bank_name": "국민은행",
  "tenant_member_bank_account": "123-456-789"
}
→ 201 Created

// 2. 실패: 이미 가입된 판매사
POST /api/v1/tenants/1/members
→ 400 Bad Request (Already member of this tenant)

// 3. 실패: 존재하지 않는 판매사
POST /api/v1/tenants/999/members
→ 404 Not Found (Tenant not found)

// 4. 실패: 승인되지 않은 판매사에 가입
POST /api/v1/tenants/2/members (tenant_status: 'pending')
→ 400 Bad Request (Cannot join unapproved tenant)
```

### 6.2 구성원 승인 테스트

```javascript
// 1. 성공: Owner가 pending 구성원 승인
PUT /api/v1/tenant-members/10/approve
Authorization: Bearer <owner_token>
→ 200 OK

// 2. 실패: 이미 승인된 구성원 재승인
PUT /api/v1/tenant-members/10/approve
→ 400 Bad Request (Cannot approve member with status: approved)

// 3. 실패: Owner가 아닌 사용자가 승인 시도
PUT /api/v1/tenant-members/10/approve
Authorization: Bearer <staff_token>
→ 403 Forbidden (Only tenant owner can approve members)

// 4. 실패: 다른 판매사의 구성원 승인 시도
PUT /api/v1/tenant-members/20/approve
Authorization: Bearer <owner_token> (다른 판매사 Owner)
→ 403 Forbidden
```

### 6.3 구성원 정보 수정 테스트

```javascript
// 1. 성공: Owner가 구성원 역할 변경
PUT /api/v1/tenant-members/10
Authorization: Bearer <owner_token>
{
  "tenant_member_role": "manager"
}
→ 200 OK

// 2. 실패: Owner가 본인 역할 변경 시도
PUT /api/v1/tenant-members/5 (owner 본인)
{
  "tenant_member_role": "staff"
}
→ 400 Bad Request (Cannot change your own role)

// 3. 실패: Staff가 다른 구성원 수정 시도
PUT /api/v1/tenant-members/10
Authorization: Bearer <staff_token>
→ 403 Forbidden (Only tenant owner can update...)

// 4. 실패: 수정할 필드가 없음
PUT /api/v1/tenant-members/10
{}
→ 400 Bad Request (No fields to update)
```

### 6.4 필터링 테스트

```javascript
// 1. 승인된 구성원만 조회
GET /api/v1/tenants/1/members?status=approved
→ 200 OK (approved 구성원만)

// 2. 대기 중인 신청 조회 (Owner용)
GET /api/v1/tenants/1/members?status=pending
→ 200 OK (pending 구성원만)

// 3. 모든 구성원 조회 (필터 없음)
GET /api/v1/tenants/1/members
→ 200 OK (모든 상태)

// 4. 내 소속 판매사 조회 (승인된 것만)
GET /api/v1/members/me/tenants?status=approved
Authorization: Bearer <valid_token>
→ 200 OK (내가 승인받은 판매사 목록)
```

---

## 7. Routes 연결 예시 (다음 단계)

```javascript
// src/routes/tenantMember.routes.js
const express = require('express');
const router = express.Router();
const tenantMemberController = require('../controllers/tenantMember.controller');
const { authenticate } = require('../middlewares/auth');

// 공개 API
router.get('/tenants/:id/members', tenantMemberController.getTenantMembers);

// 인증 필요
router.post('/tenants/:id/members', authenticate, tenantMemberController.applyToTenant);
router.get('/members/me/tenants', authenticate, tenantMemberController.getMyTenantMemberships);
router.get('/tenant-members/:id', authenticate, tenantMemberController.getTenantMemberById);

// Owner 전용 (권한 검증은 Service에서)
router.put('/tenant-members/:id/approve', authenticate, tenantMemberController.approveMember);
router.put('/tenant-members/:id/reject', authenticate, tenantMemberController.rejectMember);
router.put('/tenant-members/:id', authenticate, tenantMemberController.updateMember);

module.exports = router;
```

---

## 8. 다음 단계

1. **Step 2-13**: Category Controller 문서화
2. **Step 2-14**: Product Controller 문서화
3. **Step 2-15**: Tenant Routes 구현
4. **Step 2-16**: TenantMember Routes 구현
5. **Step 2-17**: Category Routes 구현

