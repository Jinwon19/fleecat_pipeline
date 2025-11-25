# Step 2-11: Tenant Controller 구현

## 1. 개요

**Tenant Controller**는 판매사(Tenant) 관련 HTTP 요청/응답을 처리하는 컨트롤러입니다.

### 주요 역할

- **HTTP 레이어**: 클라이언트 요청을 받고 적절한 Service 함수를 호출
- **응답 포맷팅**: 통일된 응답 형식으로 결과 반환 (`successResponse` 헬퍼 사용)
- **에러 처리 위임**: `next(error)`를 통해 `errorHandler` 미들웨어로 에러 전달
- **파라미터 추출**: URL 파라미터, 쿼리 파라미터, Request Body에서 필요한 데이터 추출

### 파일 위치

```
src/controllers/tenant.controller.js
```

### 의존성

```javascript
const tenantService = require('../services/tenant.service');
const { successResponse } = require('../utils/response');
```

---

## 2. 개념

### Controller의 역할

Controller는 **Layered Architecture**에서 Service와 Route 사이의 중간 레이어입니다.

```
Client Request
    ↓
Routes (라우팅 + 미들웨어)
    ↓
Controller (HTTP 요청/응답 처리)
    ↓
Service (비즈니스 로직)
    ↓
Repository (데이터 접근)
    ↓
Database
```

#### Controller가 **해야 할 일**
1. HTTP 요청에서 데이터 추출 (params, query, body, user)
2. Service 함수 호출
3. Service 결과를 HTTP 응답으로 변환
4. 에러를 `next(error)`로 전달

#### Controller가 **하지 말아야 할 일**
1. 비즈니스 로직 수행 (Service의 역할)
2. 데이터베이스 직접 접근 (Repository의 역할)
3. 복잡한 데이터 검증 (Service에서 수행)
4. 직접 에러 처리 (errorHandler 미들웨어가 처리)

---

## 3. 함수 설명

### 3.1 `register(req, res, next)`

**판매사 등록 신청** (인증 필요)

#### HTTP 요청
```
POST /api/v1/tenants
Authorization: Bearer <JWT_TOKEN>
```

#### Request Body
```json
{
  "tenant_name": "홍길동 공방",
  "tenant_detail_description": "전통 도자기 공방입니다",
  "tenant_detail_phone": "010-1234-5678",
  "tenant_detail_email": "hong@example.com",
  "tenant_detail_address": "서울시 종로구 인사동길 12",
  "tenant_detail_commission_rate": 0.15
}
```

#### Response (201 Created)
```json
{
  "success": true,
  "message": "Tenant registration submitted. Waiting for admin approval.",
  "data": {
    "tenant_id": 1,
    "tenant_name": "홍길동 공방",
    "tenant_status": "pending",
    "tenant_detail": { ... }
  }
}
```

#### 주요 로직
1. JWT 토큰에서 `member_id` 추출 (`req.user.member_id`)
2. Request Body에서 판매사 데이터 추출
3. `tenantService.createTenant(memberId, data)` 호출
4. `successResponse` 헬퍼로 201 응답 반환

---

### 3.2 `getMyTenants(req, res, next)`

**내 판매사 목록 조회** (인증 필요)

#### HTTP 요청
```
GET /api/v1/tenants/me
Authorization: Bearer <JWT_TOKEN>
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "tenant_id": 1,
      "tenant_name": "A 공방",
      "tenant_status": "approved",
      "tenant_member": {
        "tenant_member_role": "owner",
        "tenant_member_approval_status": "approved"
      }
    }
  ]
}
```

#### 주요 로직
1. JWT 토큰에서 `member_id` 추출
2. `tenantService.getMyTenants(memberId)` 호출
3. 성공 응답 반환

---

### 3.3 `getTenantById(req, res, next)`

**판매사 상세 조회** (Public)

#### HTTP 요청
```
GET /api/v1/tenants/:id
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "tenant_id": 1,
    "tenant_name": "홍길동 공방",
    "tenant_status": "approved",
    "tenant_detail": {
      "tenant_detail_description": "전통 도자기 공방",
      "tenant_detail_phone": "010-1234-5678",
      "tenant_detail_address": "서울시 종로구..."
    }
  }
}
```

#### 주요 로직
1. URL 파라미터에서 `id` 추출 후 정수 변환
2. `tenantService.getTenantById(tenantId)` 호출
3. 성공 응답 반환

---

### 3.4 `updateTenant(req, res, next)`

**판매사 정보 수정** (Owner만)

#### HTTP 요청
```
PUT /api/v1/tenants/:id
Authorization: Bearer <JWT_TOKEN>
```

#### Request Body
```json
{
  "tenant_name": "홍길동 도예 공방",
  "tenant_detail_description": "새로운 설명입니다",
  "tenant_detail_phone": "010-9999-8888"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Tenant updated successfully",
  "data": { ... }
}
```

#### 주요 로직
1. URL 파라미터에서 `tenantId`, JWT에서 `memberId` 추출
2. Request Body에서 수정 데이터 추출
3. `tenantService.updateTenant(tenantId, memberId, updateData)` 호출
   - Service에서 Owner 권한 검증
4. 성공 응답 반환

---

### 3.5 `approveTenant(req, res, next)`

**판매사 승인** (관리자 전용)

#### HTTP 요청
```
PUT /api/v1/tenants/:id/approve
Authorization: Bearer <JWT_TOKEN> (admin)
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Tenant approved successfully",
  "data": {
    "tenant_id": 1,
    "tenant_status": "approved",
    "tenant_approved_at": "2025-10-13T10:30:00Z"
  }
}
```

#### 주요 로직
1. URL 파라미터에서 `tenantId`, JWT에서 `adminId` 추출
2. `tenantService.approveTenant(tenantId, adminId)` 호출
3. 성공 응답 반환

---

### 3.6 `rejectTenant(req, res, next)`

**판매사 거절** (관리자 전용)

#### HTTP 요청
```
PUT /api/v1/tenants/:id/reject
Authorization: Bearer <JWT_TOKEN> (admin)
```

#### Request Body
```json
{
  "reason": "부적절한 판매사 이름입니다"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Tenant rejected",
  "data": {
    "tenant_id": 1,
    "tenant_status": "rejected"
  }
}
```

#### 주요 로직
1. URL 파라미터에서 `tenantId`, JWT에서 `adminId`, Body에서 `reason` 추출
2. `tenantService.rejectTenant(tenantId, adminId, reason)` 호출
3. 성공 응답 반환

---

### 3.7 `getAllTenants(req, res, next)`

**판매사 목록 조회** (관리자 전용, 페이징/필터링)

#### HTTP 요청
```
GET /api/v1/tenants?status=pending&page=1&limit=10
Authorization: Bearer <JWT_TOKEN> (admin)
```

#### Query Parameters
- `page` (number, default: 1): 페이지 번호
- `limit` (number, default: 10): 페이지당 항목 수
- `status` (string, optional): 상태 필터 (`pending`, `approved`, `rejected`)

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "tenants": [
      {
        "tenant_id": 1,
        "tenant_name": "홍길동 공방",
        "tenant_status": "pending",
        "tenant_applied_at": "2025-10-13T10:00:00Z"
      }
    ],
    "total": 50,
    "page": 1,
    "totalPages": 5
  }
}
```

#### 주요 로직
1. Query Parameters에서 `page`, `limit`, `status` 추출 (기본값 설정)
2. `tenantService.getAllTenants(options)` 호출
3. 페이징 정보 포함 응답 반환

---

## 4. 사용 흐름

### 4.1 판매사 등록 → 승인 프로세스

```
1. [회원] POST /api/v1/tenants (판매사 등록 신청)
   → tenant_status: 'pending'
   → Owner가 자동으로 tenant_member에 추가됨

2. [관리자] GET /api/v1/tenants?status=pending (대기 중인 판매사 조회)
   → 승인 대기 목록 확인

3a. [관리자] PUT /api/v1/tenants/:id/approve (승인)
   → tenant_status: 'approved'
   → tenant_approved_at 기록

3b. [관리자] PUT /api/v1/tenants/:id/reject (거절)
   → tenant_status: 'rejected'

4. [회원] GET /api/v1/tenants/me (내 판매사 목록 조회)
   → 승인된 판매사 확인
```

### 4.2 판매사 정보 수정 프로세스

```
1. [Owner] GET /api/v1/tenants/:id (판매사 정보 조회)

2. [Owner] PUT /api/v1/tenants/:id (정보 수정)
   → Service에서 Owner 권한 검증
   → 수정 가능한 필드만 업데이트
```

---

## 5. 주의사항

### 5.1 Controller 설계 원칙

1. **얇은 Controller 유지**
   - Controller는 최소한의 역할만 수행
   - 비즈니스 로직은 Service로 위임

   ```javascript
   // ❌ 잘못된 예시: Controller에서 비즈니스 로직 수행
   async function register(req, res, next) {
     const tenant = await prisma.tenant.create({ ... }); // Repository 직접 호출
     if (tenant.tenant_status === 'pending') { // 비즈니스 로직
       // ...
     }
   }

   // ✅ 올바른 예시: Service에 위임
   async function register(req, res, next) {
     const memberId = req.user.member_id;
     const data = req.body;
     const tenant = await tenantService.createTenant(memberId, data);
     return successResponse(res, tenant, 'Success', 201);
   }
   ```

2. **에러 처리 위임**
   - `try-catch`로 감싸고 `next(error)` 호출
   - `errorHandler` 미들웨어가 중앙에서 에러 처리

   ```javascript
   async function register(req, res, next) {
     try {
       // ...
     } catch (error) {
       next(error); // errorHandler 미들웨어로 전달
     }
   }
   ```

### 5.2 JWT 토큰 검증

- `req.user`는 `authenticate` 미들웨어가 JWT를 검증한 후 자동으로 설정됨
- Controller에서는 **검증 없이 사용 가능**

```javascript
// Routes에서 미들웨어 적용
router.post('/', authenticate, tenantController.register);

// Controller에서는 바로 사용
async function register(req, res, next) {
  const memberId = req.user.member_id; // JWT 검증 완료
  // ...
}
```

### 5.3 정수 변환 주의

URL 파라미터는 **문자열**이므로 정수 변환 필요:

```javascript
const tenantId = parseInt(req.params.id, 10); // 10진수 변환
```

쿼리 파라미터도 동일:

```javascript
const page = parseInt(req.query.page, 10) || 1; // 기본값 설정
```

### 5.4 응답 형식 통일

모든 성공 응답은 `successResponse` 헬퍼 사용:

```javascript
return successResponse(res, data, message, statusCode);
```

생성: `201 Created`, 조회/수정: `200 OK`, 삭제: `200 OK`

---

## 6. 테스트 시나리오

### 6.1 판매사 등록 테스트

```javascript
// 1. 성공: 정상적인 판매사 등록
POST /api/v1/tenants
Authorization: Bearer <valid_token>
{
  "tenant_name": "테스트 공방",
  "tenant_detail_description": "설명"
}
→ 201 Created

// 2. 실패: 중복된 판매사 이름
POST /api/v1/tenants
{
  "tenant_name": "테스트 공방" // 이미 존재
}
→ 400 Bad Request

// 3. 실패: 인증 토큰 없음
POST /api/v1/tenants (no Authorization header)
→ 401 Unauthorized
```

### 6.2 판매사 승인 테스트

```javascript
// 1. 성공: 관리자가 pending 판매사 승인
PUT /api/v1/tenants/1/approve
Authorization: Bearer <admin_token>
→ 200 OK

// 2. 실패: 이미 승인된 판매사 재승인
PUT /api/v1/tenants/1/approve
→ 400 Bad Request (Cannot approve tenant with status: approved)

// 3. 실패: 관리자가 아닌 사용자가 승인 시도
PUT /api/v1/tenants/1/approve
Authorization: Bearer <user_token>
→ 403 Forbidden
```

### 6.3 판매사 정보 수정 테스트

```javascript
// 1. 성공: Owner가 자신의 판매사 수정
PUT /api/v1/tenants/1
Authorization: Bearer <owner_token>
{
  "tenant_detail_description": "새로운 설명"
}
→ 200 OK

// 2. 실패: Owner가 아닌 사용자가 수정 시도
PUT /api/v1/tenants/1
Authorization: Bearer <other_user_token>
→ 403 Forbidden (Only tenant owner can update)

// 3. 실패: 수정할 필드가 없음
PUT /api/v1/tenants/1
{}
→ 400 Bad Request (No fields to update)
```

### 6.4 페이징 테스트

```javascript
// 1. 기본 페이징 (page=1, limit=10)
GET /api/v1/tenants
→ 200 OK (총 10개 반환)

// 2. 필터링 + 페이징
GET /api/v1/tenants?status=pending&page=2&limit=5
→ 200 OK (pending 상태, 2페이지, 5개)

// 3. 잘못된 페이지 (page=999)
GET /api/v1/tenants?page=999
→ 200 OK (빈 배열, total/totalPages는 정상)
```

---

## 7. Routes 연결 예시 (다음 단계)

```javascript
// src/routes/tenant.routes.js
const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenant.controller');
const { authenticate, authorize } = require('../middlewares/auth');

// 공개 API
router.get('/:id', tenantController.getTenantById);

// 인증 필요
router.post('/', authenticate, tenantController.register);
router.get('/me', authenticate, tenantController.getMyTenants);
router.put('/:id', authenticate, tenantController.updateTenant);

// 관리자 전용
router.get('/', authenticate, authorize('admin'), tenantController.getAllTenants);
router.put('/:id/approve', authenticate, authorize('admin'), tenantController.approveTenant);
router.put('/:id/reject', authenticate, authorize('admin'), tenantController.rejectTenant);

module.exports = router;
```

---

## 8. 다음 단계

1. **Step 2-12**: TenantMember Controller 문서화
2. **Step 2-13**: Category Controller 문서화
3. **Step 2-14**: Product Controller 문서화
4. **Step 2-15**: Tenant Routes 구현
5. **Step 2-16**: TenantMember Routes 구현

