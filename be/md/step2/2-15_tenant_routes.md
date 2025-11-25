# Step 2-15: Tenant Routes 구현

## 1. 개요

**Tenant Routes**는 판매사(Tenant) 관련 API 엔드포인트를 정의하고 미들웨어를 연결하는 라우팅 레이어입니다.

### 주요 역할

- **API 엔드포인트 정의**: URL 경로와 HTTP 메서드 매핑
- **미들웨어 연결**: 인증(`authenticate`), 권한(`authorize`) 미들웨어 적용
- **Controller 연결**: 각 엔드포인트를 적절한 Controller 함수와 연결

### 파일 위치

```
src/routes/tenant.routes.js
```

### 의존성

```javascript
const express = require('express');
const tenantController = require('../controllers/tenant.controller');
const { authenticate, authorize } = require('../middlewares/auth');
```

---

## 2. 개념

### Routes의 역할

Routes는 **Layered Architecture**에서 가장 바깥쪽 레이어입니다.

```
Client Request
    ↓
Routes (라우팅 + 미들웨어)
    ↓
Controller (HTTP 요청/응답)
    ↓
Service (비즈니스 로직)
    ↓
Repository (데이터 접근)
```

#### Routes가 **해야 할 일**
1. API 엔드포인트 정의 (URL + HTTP 메서드)
2. 미들웨어 체이닝 (인증, 권한, 검증)
3. Controller 함수 연결

#### Routes가 **하지 말아야 할 일**
1. 비즈니스 로직 수행
2. 직접 HTTP 요청/응답 처리
3. 데이터베이스 접근

---

## 3. API 엔드포인트

### 3.1 판매사 목록 조회 (관리자 전용)

```javascript
GET /api/v1/tenants
```

#### 권한
- **Private** (Admin)
- 미들웨어: `authenticate`, `authorize('admin')`

#### Controller
`tenantController.getAllTenants`

#### Query Parameters
- `page` (number, default: 1): 페이지 번호
- `limit` (number, default: 10): 페이지당 항목 수
- `status` (string, optional): 상태 필터 (`pending`, `approved`, `rejected`)

#### 사용 예시
```bash
GET /api/v1/tenants?status=pending&page=1&limit=10
Authorization: Bearer <ADMIN_TOKEN>
```

---

### 3.2 내 판매사 목록 조회

```javascript
GET /api/v1/tenants/me
```

#### 권한
- **Private**
- 미들웨어: `authenticate`

#### Controller
`tenantController.getMyTenants`

#### 사용 예시
```bash
GET /api/v1/tenants/me
Authorization: Bearer <JWT_TOKEN>
```

---

### 3.3 판매사 상세 조회

```javascript
GET /api/v1/tenants/:id
```

#### 권한
- **Public**
- 미들웨어: 없음

#### Controller
`tenantController.getTenantById`

#### URL Parameters
- `id` (number): 판매사 ID

#### 사용 예시
```bash
GET /api/v1/tenants/1
```

---

### 3.4 판매사 등록 신청

```javascript
POST /api/v1/tenants
```

#### 권한
- **Private**
- 미들웨어: `authenticate`

#### Controller
`tenantController.register`

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

#### 사용 예시
```bash
POST /api/v1/tenants
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "tenant_name": "홍길동 공방",
  ...
}
```

---

### 3.5 판매사 정보 수정

```javascript
PUT /api/v1/tenants/:id
```

#### 권한
- **Private** (Owner만)
- 미들웨어: `authenticate`
- 권한 검증: Service Layer에서 수행

#### Controller
`tenantController.updateTenant`

#### URL Parameters
- `id` (number): 판매사 ID

#### Request Body
```json
{
  "tenant_name": "홍길동 도예 공방",
  "tenant_detail_description": "새로운 설명",
  "tenant_detail_phone": "010-9999-8888"
}
```

#### 사용 예시
```bash
PUT /api/v1/tenants/1
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "tenant_detail_description": "새로운 설명"
}
```

---

### 3.6 판매사 승인

```javascript
PUT /api/v1/tenants/:id/approve
```

#### 권한
- **Private** (Admin)
- 미들웨어: `authenticate`, `authorize('admin')`

#### Controller
`tenantController.approveTenant`

#### URL Parameters
- `id` (number): 판매사 ID

#### 사용 예시
```bash
PUT /api/v1/tenants/1/approve
Authorization: Bearer <ADMIN_TOKEN>
```

---

### 3.7 판매사 거절

```javascript
PUT /api/v1/tenants/:id/reject
```

#### 권한
- **Private** (Admin)
- 미들웨어: `authenticate`, `authorize('admin')`

#### Controller
`tenantController.rejectTenant`

#### URL Parameters
- `id` (number): 판매사 ID

#### Request Body
```json
{
  "reason": "부적절한 판매사 이름입니다"
}
```

#### 사용 예시
```bash
PUT /api/v1/tenants/1/reject
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "reason": "부적절한 판매사 이름입니다"
}
```

---

## 4. 라우트 순서

### 라우트 정의 순서의 중요성

Express는 **정의된 순서대로** 라우트를 매칭합니다.

```javascript
// ✅ 올바른 순서: 구체적인 경로가 먼저
router.get('/', authenticate, authorize('admin'), tenantController.getAllTenants);
router.get('/me', authenticate, tenantController.getMyTenants);
router.get('/:id', tenantController.getTenantById);

// ❌ 잘못된 순서: 동적 파라미터가 먼저
router.get('/:id', tenantController.getTenantById); // '/me'도 여기서 매칭됨!
router.get('/me', authenticate, tenantController.getMyTenants); // 실행되지 않음
```

### Tenant Routes의 순서

```javascript
router.get('/', ...);           // GET /tenants (관리자용)
router.get('/me', ...);         // GET /tenants/me (구체적 경로)
router.get('/:id', ...);        // GET /tenants/:id (동적 파라미터)
router.post('/', ...);          // POST /tenants
router.put('/:id', ...);        // PUT /tenants/:id
router.put('/:id/approve', ...); // PUT /tenants/:id/approve
router.put('/:id/reject', ...);  // PUT /tenants/:id/reject
```

---

## 5. 미들웨어 체이닝

### 인증 미들웨어 (`authenticate`)

JWT 토큰을 검증하고 `req.user`에 사용자 정보를 설정합니다.

```javascript
router.post('/', authenticate, tenantController.register);
//                ^^^^^^^^^^^^
//                JWT 검증
```

#### 동작 방식
1. `Authorization: Bearer <token>` 헤더에서 토큰 추출
2. JWT 검증 (유효기간, 서명)
3. 토큰 payload를 `req.user`에 설정
4. 검증 실패 시 `401 Unauthorized` 응답

### 권한 미들웨어 (`authorize('admin')`)

사용자 역할을 확인합니다.

```javascript
router.get('/', authenticate, authorize('admin'), tenantController.getAllTenants);
//                ^^^^^^^^^^^^  ^^^^^^^^^^^^^^^^^
//                1. JWT 검증    2. 관리자 권한 확인
```

#### 동작 방식
1. `req.user.member_role`을 확인
2. 요구되는 역할과 일치하는지 검증
3. 권한 없으면 `403 Forbidden` 응답

### 미들웨어 실행 순서

```
Client Request
    ↓
authenticate (JWT 검증)
    ↓
authorize('admin') (권한 확인)
    ↓
tenantController.getAllTenants (비즈니스 로직)
    ↓
Response
```

---

## 6. 주의사항

### 6.1 라우트 순서

**구체적인 경로를 먼저, 동적 파라미터는 나중에:**

```javascript
// ✅ 올바른 순서
router.get('/me', ...);        // 먼저
router.get('/:id', ...);       // 나중

// ❌ 잘못된 순서
router.get('/:id', ...);       // '/me'도 여기서 매칭!
router.get('/me', ...);        // 실행 안 됨
```

### 6.2 미들웨어 순서

**authenticate → authorize 순서 유지:**

```javascript
// ✅ 올바른 순서
router.get('/', authenticate, authorize('admin'), controller);

// ❌ 잘못된 순서 (authorize가 req.user를 참조하므로)
router.get('/', authorize('admin'), authenticate, controller);
```

### 6.3 Public API는 미들웨어 없음

Public API에는 인증 미들웨어를 적용하지 않습니다:

```javascript
// ✅ Public API
router.get('/:id', tenantController.getTenantById);

// ❌ Public API인데 인증 필요 (불필요)
router.get('/:id', authenticate, tenantController.getTenantById);
```

### 6.4 Owner 권한은 Service에서 검증

Owner 권한은 `authorize` 미들웨어가 아닌 **Service Layer**에서 검증합니다:

```javascript
// Routes: authenticate만
router.put('/:id', authenticate, tenantController.updateTenant);

// Service: Owner 권한 확인
async function updateTenant(tenantId, memberId, updateData) {
  // Owner 확인 로직
  if (Number(tenant.owner_id) !== memberId) {
    throw new ForbiddenError('Only tenant owner can update');
  }
}
```

---

## 7. 테스트 시나리오

### 7.1 인증 테스트

```bash
# 1. 성공: 유효한 토큰
POST /api/v1/tenants
Authorization: Bearer <valid_token>
→ 201 Created

# 2. 실패: 토큰 없음
POST /api/v1/tenants
→ 401 Unauthorized (No token provided)

# 3. 실패: 유효하지 않은 토큰
POST /api/v1/tenants
Authorization: Bearer invalid_token
→ 401 Unauthorized (Invalid token)

# 4. 실패: 만료된 토큰
POST /api/v1/tenants
Authorization: Bearer expired_token
→ 401 Unauthorized (Token expired)
```

### 7.2 권한 테스트

```bash
# 1. 성공: 관리자 권한
GET /api/v1/tenants
Authorization: Bearer <admin_token>
→ 200 OK

# 2. 실패: 일반 사용자
GET /api/v1/tenants
Authorization: Bearer <user_token>
→ 403 Forbidden (Insufficient permissions)
```

### 7.3 라우트 순서 테스트

```bash
# 1. '/me' 엔드포인트 정상 동작
GET /api/v1/tenants/me
Authorization: Bearer <valid_token>
→ 200 OK (내 판매사 목록)

# 2. '/:id' 엔드포인트와 혼동되지 않음
GET /api/v1/tenants/1
→ 200 OK (판매사 1번 상세)
```

### 7.4 Public API 테스트

```bash
# 1. 인증 없이 조회 가능
GET /api/v1/tenants/1
→ 200 OK (판매사 상세)

# 2. 인증 없이 Private API 호출
POST /api/v1/tenants
→ 401 Unauthorized
```

---

## 8. index.js 등록

Routes를 메인 index에 등록해야 사용 가능합니다.

```javascript
// src/routes/index.js
const tenantRoutes = require('./tenant.routes');

router.use('/tenants', tenantRoutes);
```

이제 다음 경로로 접근 가능:
- `http://localhost:3000/api/v1/tenants`
- `http://localhost:3000/api/v1/tenants/me`
- `http://localhost:3000/api/v1/tenants/:id`

---

## 9. 전체 코드

```javascript
const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenant.controller');
const { authenticate, authorize } = require('../middlewares/auth');

/**
 * Tenant Routes
 * 판매사(Tenant) 관련 API 엔드포인트
 */

// 관리자 전용
router.get('/', authenticate, authorize('admin'), tenantController.getAllTenants);

// 인증 필요
router.get('/me', authenticate, tenantController.getMyTenants);
router.post('/', authenticate, tenantController.register);
router.put('/:id', authenticate, tenantController.updateTenant);
router.put('/:id/approve', authenticate, authorize('admin'), tenantController.approveTenant);
router.put('/:id/reject', authenticate, authorize('admin'), tenantController.rejectTenant);

// 공개 API
router.get('/:id', tenantController.getTenantById);

module.exports = router;
```

---

## 10. 다음 단계

1. **Step 2-16**: TenantMember Routes 문서화
2. **Step 2-17**: Category Routes 문서화
3. **Step 2-18**: Product Routes 문서화
4. **Step 2-19**: Validation Middleware 추가
5. **Step 2-20**: 00_INDEX.md 업데이트

