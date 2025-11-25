# Admin Step 13: Admin Controllers (관리자 컨트롤러)

## 📋 목차
1. [개념 설명](#개념-설명)
2. [구현 내용](#구현-내용)
3. [사용 예시](#사용-예시)
4. [주요 특징](#주요-특징)

---

## 개념 설명

### Controller Layer란?

Controller는 **HTTP 요청/응답을 처리하는 계층**으로, MVC 패턴의 핵심 구성 요소입니다.

#### 🎯 Controller의 역할

```
HTTP Request → Controller → Service → Repository → Database
                  ↓
            HTTP Response
```

1. **HTTP 요청 처리**
   - `req.body`: 요청 본문 데이터 추출
   - `req.params`: URL 파라미터 추출
   - `req.query`: 쿼리스트링 추출
   - `req.user`: JWT 인증 정보 추출 (미들웨어에서 설정)

2. **Service 호출**
   - 비즈니스 로직은 Service에 위임
   - Controller는 단순히 데이터를 전달하고 결과를 받음

3. **HTTP 응답 반환**
   - `successResponse()`: 성공 응답 (200, 201 등)
   - `next(error)`: 에러 발생 시 에러 미들웨어로 전달

4. **검증 제외**
   - 입력 검증은 Service Layer에서 수행
   - Controller는 타입 변환만 수행 (`parseInt()` 등)

#### ❌ Controller가 하지 말아야 할 것

```javascript
// ❌ 나쁜 예: Controller에서 비즈니스 로직 처리
async function updateOrderStatus(req, res, next) {
  try {
    const orderId = parseInt(req.params.orderId);
    const { status } = req.body;

    // ❌ Controller에서 검증 수행 (Service에서 해야 함)
    if (!VALID_STATUSES.includes(status)) {
      throw new ValidationError('Invalid status');
    }

    // ❌ Controller에서 직접 Repository 호출
    const order = await orderRepo.updateStatus(orderId, status);

    return successResponse(res, order, 'Status updated');
  } catch (error) {
    next(error);
  }
}
```

```javascript
// ✅ 좋은 예: Controller는 단순히 요청/응답만 처리
async function updateOrderStatus(req, res, next) {
  try {
    const orderId = parseInt(req.params.orderId);
    const { status } = req.body;

    // ✅ Service에 모든 비즈니스 로직 위임
    const updatedOrder = await orderService.updateOrderStatus(orderId, status);

    return successResponse(res, updatedOrder, '주문 상태를 변경했습니다');
  } catch (error) {
    next(error);
  }
}
```

---

## 구현 내용

### 1. AdminOrder Controller

**파일**: `src/controllers/admin/adminOrder.controller.js`

관리자용 주문 관리 컨트롤러 (8개 함수)

#### 📌 주요 함수

| 함수명 | HTTP Method | 경로 | 설명 |
|--------|-------------|------|------|
| `getOrders` | GET | `/api/admin/orders` | 주문 목록 조회 (페이징, 필터링) |
| `getOrderById` | GET | `/api/admin/orders/:orderId` | 주문 상세 조회 |
| `updateOrderStatus` | PATCH | `/api/admin/orders/:orderId/status` | 주문 상태 변경 |
| `refundOrder` | POST | `/api/admin/orders/:orderId/refund` | 주문 환불 처리 |
| `getOrderStatistics` | GET | `/api/admin/orders/statistics` | 주문 통계 조회 |
| `getOrdersByMember` | GET | `/api/admin/orders/member/:memberId` | 회원별 주문 조회 |
| `getOrdersByTenant` | GET | `/api/admin/orders/tenant/:tenantId` | 판매사별 주문 조회 |
| `getRecentOrders` | GET | `/api/admin/orders/recent` | 최근 주문 조회 |

#### 🔍 구현 예시: `getOrders()`

```javascript
/**
 * 주문 목록 조회 (페이징, 필터링, 검색)
 * GET /api/admin/orders
 */
async function getOrders(req, res, next) {
  try {
    // 1. 쿼리 파라미터에서 필터 추출
    const filters = {
      page: req.query.page,
      limit: req.query.limit,
      orderStatus: req.query.orderStatus,
      paymentStatus: req.query.paymentStatus,
      memberId: req.query.memberId,
      tenantId: req.query.tenantId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      search: req.query.search
    };

    // 2. Service 호출 (검증 + 비즈니스 로직은 Service에서 처리)
    const result = await orderService.getOrderList(filters);

    // 3. 성공 응답 반환
    return successResponse(res, result, '주문 목록을 조회했습니다');
  } catch (error) {
    // 4. 에러 처리 (미들웨어로 전달)
    next(error);
  }
}
```

**핵심 포인트**:
- ✅ 쿼리 파라미터 추출만 수행
- ✅ Service에 모든 로직 위임
- ✅ `successResponse()` 사용
- ✅ 에러는 `next(error)`로 전달

#### 🔍 구현 예시: `refundOrder()`

```javascript
/**
 * 주문 환불 처리
 * POST /api/admin/orders/:orderId/refund
 */
async function refundOrder(req, res, next) {
  try {
    // 1. URL 파라미터에서 orderId 추출 및 타입 변환
    const orderId = parseInt(req.params.orderId);

    // 2. 요청 본문에서 환불 데이터 추출
    const refundData = {
      refund_reason: req.body.refund_reason
    };

    // 3. Service 호출 (트랜잭션 처리는 Service/Repository에서)
    const refundedOrder = await orderService.processRefund(orderId, refundData);

    // 4. 성공 응답 반환
    return successResponse(res, refundedOrder, '주문 환불을 처리했습니다');
  } catch (error) {
    next(error);
  }
}
```

---

### 2. AdminProduct Controller

**파일**: `src/controllers/admin/adminProduct.controller.js`

관리자용 상품 관리 컨트롤러 (6개 함수)

#### 📌 주요 함수

| 함수명 | HTTP Method | 경로 | 설명 |
|--------|-------------|------|------|
| `getProducts` | GET | `/api/admin/products` | 상품 목록 조회 (페이징, 필터링) |
| `getProductById` | GET | `/api/admin/products/:productId` | 상품 상세 조회 |
| `updateProductStatus` | PATCH | `/api/admin/products/:productId/status` | 상품 상태 변경 |
| `deleteProduct` | DELETE | `/api/admin/products/:productId` | 상품 삭제 (소프트 삭제) |
| `getProductStatistics` | GET | `/api/admin/products/statistics` | 상품 통계 조회 |
| `searchProducts` | GET | `/api/admin/products/search` | 상품 검색 |

#### 🔍 구현 예시: `updateProductStatus()`

```javascript
/**
 * 상품 상태 변경
 * PATCH /api/admin/products/:productId/status
 */
async function updateProductStatus(req, res, next) {
  try {
    // 1. URL 파라미터에서 productId 추출
    const productId = parseInt(req.params.productId);

    // 2. 요청 본문에서 status 추출
    const { status } = req.body;

    // 3. Service 호출 (상태 검증은 Service에서)
    const updatedProduct = await productService.updateProductStatus(productId, status);

    // 4. 성공 응답 반환
    return successResponse(res, updatedProduct, '상품 상태를 변경했습니다');
  } catch (error) {
    next(error);
  }
}
```

#### 🔍 구현 예시: `searchProducts()`

```javascript
/**
 * 상품 검색 (전체 텍스트 검색)
 * GET /api/admin/products/search
 */
async function searchProducts(req, res, next) {
  try {
    // 1. 쿼리 파라미터 추출
    const { query, page, limit } = req.query;

    // 2. Service 호출 (기본값 설정 포함)
    const result = await productService.searchProducts(query, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20
    });

    // 3. 성공 응답 반환
    return successResponse(res, result, '상품 검색 결과를 조회했습니다');
  } catch (error) {
    next(error);
  }
}
```

**핵심 포인트**:
- ✅ 기본값 설정 (`page`, `limit`)
- ✅ `parseInt()` 타입 변환
- ✅ 검색어 검증은 Service에서 처리

---

### 3. AdminDashboard Controller

**파일**: `src/controllers/admin/adminDashboard.controller.js`

관리자 대시보드 컨트롤러 (7개 함수)

#### 📌 주요 함수

| 함수명 | HTTP Method | 경로 | 설명 |
|--------|-------------|------|------|
| `getOverview` | GET | `/api/admin/dashboard/overview` | 전체 현황 요약 조회 |
| `getDailyRevenue` | GET | `/api/admin/dashboard/revenue/daily` | 일별 매출 추이 |
| `getMonthlyRevenue` | GET | `/api/admin/dashboard/revenue/monthly` | 월별 매출 추이 |
| `getTopProducts` | GET | `/api/admin/dashboard/top-products` | 인기 상품 Top N |
| `getTopTenants` | GET | `/api/admin/dashboard/top-tenants` | 매출 많은 판매사 Top N |
| `getRecentActivities` | GET | `/api/admin/dashboard/recent-activities` | 최근 활동 (가입, 주문) |
| `getAlerts` | GET | `/api/admin/dashboard/alerts` | 실시간 알림/알람 |

#### 🔍 구현 예시: `getOverview()`

```javascript
/**
 * 전체 현황 요약 조회
 * GET /api/admin/dashboard/overview
 */
async function getOverview(req, res, next) {
  try {
    // 1. Service 호출 (파라미터 없음)
    const overview = await dashboardService.getOverview();

    // 2. 성공 응답 반환
    return successResponse(res, overview, '대시보드 전체 현황을 조회했습니다');
  } catch (error) {
    next(error);
  }
}
```

**핵심 포인트**:
- ✅ 파라미터가 없는 경우 단순 Service 호출
- ✅ 통계 계산은 모두 Service에서 처리

#### 🔍 구현 예시: `getTopProducts()`

```javascript
/**
 * 인기 상품 Top N 조회
 * GET /api/admin/dashboard/top-products
 */
async function getTopProducts(req, res, next) {
  try {
    // 1. 쿼리 파라미터 추출 (기본값 10)
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;

    // 2. Service 호출
    const topProducts = await dashboardService.getTopProducts(limit);

    // 3. 성공 응답 반환
    return successResponse(res, topProducts, '인기 상품 Top 목록을 조회했습니다');
  } catch (error) {
    next(error);
  }
}
```

---

## 사용 예시

### 1️⃣ 주문 목록 조회 (필터링 포함)

**Request**:
```http
GET /api/admin/orders?page=1&limit=20&orderStatus=delivered&startDate=2024-01-01&endDate=2024-12-31
```

**Controller 처리**:
```javascript
async function getOrders(req, res, next) {
  try {
    const filters = {
      page: req.query.page,           // "1"
      limit: req.query.limit,         // "20"
      orderStatus: req.query.orderStatus, // "delivered"
      startDate: req.query.startDate, // "2024-01-01"
      endDate: req.query.endDate      // "2024-12-31"
    };

    const result = await orderService.getOrderList(filters);
    return successResponse(res, result, '주문 목록을 조회했습니다');
  } catch (error) {
    next(error);
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "주문 목록을 조회했습니다",
  "data": {
    "orders": [...],
    "total": 150,
    "page": 1,
    "totalPages": 8
  }
}
```

---

### 2️⃣ 주문 환불 처리

**Request**:
```http
POST /api/admin/orders/123/refund
Content-Type: application/json

{
  "refund_reason": "상품 불량으로 인한 환불"
}
```

**Controller 처리**:
```javascript
async function refundOrder(req, res, next) {
  try {
    const orderId = parseInt(req.params.orderId); // 123
    const refundData = {
      refund_reason: req.body.refund_reason
    };

    const refundedOrder = await orderService.processRefund(orderId, refundData);
    return successResponse(res, refundedOrder, '주문 환불을 처리했습니다');
  } catch (error) {
    next(error);
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "주문 환불을 처리했습니다",
  "data": {
    "order_id": "123",
    "order_status": "refunded"
  }
}
```

---

### 3️⃣ 상품 상태 변경

**Request**:
```http
PATCH /api/admin/products/456/status
Content-Type: application/json

{
  "status": "sold_out"
}
```

**Controller 처리**:
```javascript
async function updateProductStatus(req, res, next) {
  try {
    const productId = parseInt(req.params.productId); // 456
    const { status } = req.body; // "sold_out"

    const updatedProduct = await productService.updateProductStatus(productId, status);
    return successResponse(res, updatedProduct, '상품 상태를 변경했습니다');
  } catch (error) {
    next(error);
  }
}
```

---

### 4️⃣ 대시보드 일별 매출 조회

**Request**:
```http
GET /api/admin/dashboard/revenue/daily?days=7
```

**Controller 처리**:
```javascript
async function getDailyRevenue(req, res, next) {
  try {
    const days = req.query.days ? parseInt(req.query.days) : 30; // 7

    const revenue = await dashboardService.getDailyRevenue(days);
    return successResponse(res, revenue, '일별 매출 추이를 조회했습니다');
  } catch (error) {
    next(error);
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "일별 매출 추이를 조회했습니다",
  "data": [
    {
      "date": "2024-01-01",
      "revenue": 1500000,
      "orderCount": 25,
      "averageOrder": 60000
    },
    ...
  ]
}
```

---

## 주요 특징

### ✅ 1. 단순성 (Simplicity)

Controller는 **최대한 단순**하게 유지합니다:

```javascript
// ✅ 좋은 예: 단순한 Controller
async function getOrderById(req, res, next) {
  try {
    const orderId = parseInt(req.params.orderId);
    const order = await orderService.getOrderById(orderId);
    return successResponse(res, order, '주문 상세 정보를 조회했습니다');
  } catch (error) {
    next(error);
  }
}
```

- 파라미터 추출
- Service 호출
- 응답 반환
- 에러 처리

**이 4가지 외에는 아무것도 하지 않습니다.**

---

### ✅ 2. 책임 분리 (Separation of Concerns)

각 계층의 역할이 명확합니다:

| 계층 | 역할 | 예시 |
|------|------|------|
| **Controller** | HTTP 요청/응답 처리 | `req.params` 추출, `successResponse()` 호출 |
| **Service** | 비즈니스 로직, 검증 | 상태 검증, 퍼센티지 계산, BigInt 변환 |
| **Repository** | 데이터 접근 | Prisma 쿼리, 트랜잭션 처리 |

```javascript
// Controller: HTTP 처리만
async function updateOrderStatus(req, res, next) {
  try {
    const orderId = parseInt(req.params.orderId);
    const { status } = req.body;
    const updatedOrder = await orderService.updateOrderStatus(orderId, status);
    return successResponse(res, updatedOrder, '주문 상태를 변경했습니다');
  } catch (error) {
    next(error);
  }
}
```

```javascript
// Service: 비즈니스 로직 (검증 + 변환)
async function updateOrderStatus(orderId, status) {
  // 1. 검증
  if (!VALID_ORDER_STATUSES.includes(status)) {
    throw new ValidationError('유효하지 않은 주문 상태입니다');
  }

  // 2. 존재 확인
  const order = await orderRepo.findByIdWithDetails(orderId);
  if (!order) {
    throw new NotFoundError(`주문 ID ${orderId}를 찾을 수 없습니다`);
  }

  // 3. Repository 호출
  const updated = await orderRepo.updateStatus(orderId, status);

  // 4. BigInt 변환
  return {
    ...updated,
    order_id: updated.order_id.toString()
  };
}
```

---

### ✅ 3. 일관된 응답 형식

모든 Controller는 `successResponse()` 헬퍼를 사용합니다:

```javascript
// src/utils/response.js
function successResponse(res, data, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
}
```

**사용 예시**:
```javascript
// 1. 기본 사용
return successResponse(res, orders, '주문 목록을 조회했습니다');

// 2. 상태 코드 지정 (201 Created)
return successResponse(res, newOrder, '주문을 생성했습니다', 201);

// 3. 데이터 없이 메시지만
return successResponse(res, null, '주문을 삭제했습니다');
```

---

### ✅ 4. 에러 처리

모든 에러는 **에러 미들웨어**로 전달됩니다:

```javascript
async function getOrderById(req, res, next) {
  try {
    const orderId = parseInt(req.params.orderId);
    const order = await orderService.getOrderById(orderId);
    return successResponse(res, order, '주문 상세 정보를 조회했습니다');
  } catch (error) {
    // ✅ 에러를 next()로 전달
    next(error);
  }
}
```

**에러 미들웨어** (`src/middlewares/errorHandler.js`)에서 처리:

```javascript
function errorHandler(err, req, res, next) {
  if (err instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  if (err instanceof NotFoundError) {
    return res.status(404).json({
      success: false,
      message: err.message
    });
  }

  // 기타 에러
  return res.status(500).json({
    success: false,
    message: 'Internal Server Error'
  });
}
```

---

### ✅ 5. 타입 변환

URL 파라미터와 쿼리 파라미터는 **문자열**이므로 필요 시 변환합니다:

```javascript
async function getOrderById(req, res, next) {
  try {
    // req.params.orderId는 "123" (문자열)
    const orderId = parseInt(req.params.orderId); // 123 (숫자)

    const order = await orderService.getOrderById(orderId);
    return successResponse(res, order, '주문 상세 정보를 조회했습니다');
  } catch (error) {
    next(error);
  }
}
```

**변환이 필요한 경우**:
- `parseInt()`: ID, 숫자형 필터
- `parseFloat()`: 가격, 금액
- `Boolean()`: true/false 플래그

---

### ✅ 6. RESTful 설계

HTTP 메서드를 적절히 사용합니다:

| 메서드 | 용도 | 예시 |
|--------|------|------|
| `GET` | 조회 | `GET /api/admin/orders` |
| `POST` | 생성, 액션 | `POST /api/admin/orders/:id/refund` |
| `PATCH` | 부분 수정 | `PATCH /api/admin/orders/:id/status` |
| `PUT` | 전체 수정 | `PUT /api/admin/products/:id` |
| `DELETE` | 삭제 | `DELETE /api/admin/products/:id` |

---

## 다음 단계

Controller 구현이 완료되었습니다!

**다음 작업**:
1. **Routes 생성**: Controller를 라우트에 연결
2. **Middleware 적용**: 인증/권한 검증 (`authenticate`, `authorize('admin')`)
3. **API 테스트**: Postman/Thunder Client로 엔드포인트 테스트

---

## 요약

### Controller Layer의 핵심 원칙

1. ✅ **HTTP 요청/응답만 처리**
2. ✅ **Service에 모든 로직 위임**
3. ✅ **검증은 Service에서**
4. ✅ **일관된 응답 형식** (`successResponse()`)
5. ✅ **에러는 미들웨어로** (`next(error)`)
6. ✅ **타입 변환만 수행** (`parseInt()`, `parseFloat()`)

### 구현 완료 목록

| Controller | 함수 개수 | 파일 경로 |
|-----------|----------|-----------|
| AdminOrder | 8개 | `src/controllers/admin/adminOrder.controller.js` |
| AdminProduct | 6개 | `src/controllers/admin/adminProduct.controller.js` |
| AdminDashboard | 7개 | `src/controllers/admin/adminDashboard.controller.js` |

**총 21개 함수 구현 완료!** 🎉
