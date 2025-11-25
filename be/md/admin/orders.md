# 주문관리 어드민 페이지 완전 가이드

> **작성일**: 2025년 10월 10일
> **상태**: ✅ 완료
> **페이지**: `/public/admin/orders.html`

---

## 📚 목차

1. [개념 설명](#1-개념-설명)
2. [데이터베이스 구조](#2-데이터베이스-구조)
3. [백엔드 아키텍처](#3-백엔드-아키텍처)
4. [API 엔드포인트](#4-api-엔드포인트)
5. [프론트엔드 구현](#5-프론트엔드-구현)
6. [주문 생명주기](#6-주문-생명주기)
7. [사용 시나리오](#7-사용-시나리오)
8. [트러블슈팅](#8-트러블슈팅)

---

## 1. 개념 설명

### 1.1 주문관리란?

주문관리는 **플랫폼 내 모든 주문을 관리하고 모니터링**하는 기능입니다.

**목적**:
- 📦 **주문 추적**: 전체 주문 현황 및 상태 파악
- 💳 **결제 관리**: 결제 상태 확인 및 환불 처리
- 🚚 **배송 관리**: 배송 상태 변경 및 추적
- 📊 **통계 분석**: 주문 추이, 매출 분석
- ⚠️ **분쟁 처리**: 환불, 취소 요청 관리

### 1.2 주문 상태 (Order Status)

```
pending (주문 대기)
  ↓
preparing (상품 준비 중)
  ↓
shipped (배송 중)
  ↓
delivered (배송 완료)

↓ (문제 발생 시)
cancelled (취소)
refunded (환불 완료)
```

| 상태 | 설명 | 변경 가능 대상 |
|------|------|----------------|
| **pending** | 결제 대기 또는 확인 중 | 구매자, 관리자 |
| **preparing** | 상품 준비 중 (포장 등) | 판매자, 관리자 |
| **shipped** | 배송 시작 | 판매자, 관리자 |
| **delivered** | 배송 완료 | 관리자 |
| **cancelled** | 주문 취소 | 구매자, 관리자 |
| **refunded** | 환불 완료 | 관리자 |

### 1.3 결제 상태 (Payment Status)

| 상태 | 설명 |
|------|------|
| **pending** | 결제 대기 |
| **completed** | 결제 완료 |
| **failed** | 결제 실패 |
| **cancelled** | 결제 취소 |
| **refunded** | 환불 완료 |

### 1.4 주요 특징

#### ✅ Order ↔ Payment 1:1 관계

**하나의 주문에 하나의 결제**:
```prisma
model Order {
  order_id  BigInt
  payment   Payment?  @relation(...)  // 1:1
}

model Payment {
  payment_id  BigInt
  order_id    BigInt  @unique  // 1:1
}
```

#### ✅ 쿠폰 적용 (선택)

**주문 시 쿠폰 사용 가능**:
```
상품 가격: 50,000원
쿠폰 할인: -5,000원
배송비: +3,000원
-----------------------
최종 결제 금액: 48,000원
```

---

## 2. 데이터베이스 구조

### 2.1 Order 테이블 스키마

| 컬럼명 | 타입 | 설명 | 예시 |
|--------|------|------|------|
| `order_id` | BIGINT | 기본키 | `10001` |
| `member_id` | BIGINT | 구매자 ID (FK) | `1234` |
| `product_id` | BIGINT | 상품 ID (FK) | `500` |
| `shopping_cart_id` | BIGINT | 장바구니 ID (NULL 가능) | `800` |
| `coupon_id` | BIGINT | 쿠폰 ID (NULL 가능) | `50` |
| `order_quantity` | INT | 주문 수량 | `2` |
| `order_price_per_item` | INT | 단가 (원) | `25000` |
| `order_total_price` | INT | 총 금액 (원) | `50000` |
| `order_discount_amount` | INT | 할인 금액 (원) | `5000` |
| `order_final_price` | INT | 최종 결제 금액 (원) | `48000` |
| `order_delivery_fee` | INT | 배송비 (원) | `3000` |
| `order_status` | VARCHAR(20) | 주문 상태 | `delivered` |
| `order_created_at` | TIMESTAMP | 주문일 | `2025-10-01` |

### 2.2 Payment 테이블 스키마

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `payment_id` | BIGINT | 기본키 |
| `order_id` | BIGINT | 주문 ID (FK, UNIQUE) |
| `payment_method` | VARCHAR(50) | 결제 수단 (`card`, `transfer`, `kakao_pay`) |
| `payment_amount` | INT | 결제 금액 (원) |
| `payment_status` | VARCHAR(20) | 결제 상태 |
| `payment_transaction_id` | VARCHAR(100) | 결제 트랜잭션 ID (PG사) |
| `payment_approved_at` | TIMESTAMP | 결제 승인 시각 |
| `payment_created_at` | TIMESTAMP | 생성 시각 |

### 2.3 관계형 구조

```
Order (N) → (1) Member (구매자)
Order (N) → (1) Product
Order (N) → (1) Coupon (선택)
Order (1) → (1) Payment
```

### 2.4 비즈니스 규칙

| 규칙 | 설명 | 구현 위치 |
|------|------|-----------|
| **삭제 불가 (RESTRICT)** | 주문은 절대 삭제 불가 (법적 기록) | Database Constraint |
| **상태 변경 순서** | pending → preparing → shipped → delivered | Service Layer |
| **환불 조건** | 결제 완료 후 환불 가능 | Service Layer |
| **취소 가능 시점** | preparing 전까지만 취소 가능 | Service Layer |

---

## 3. 백엔드 아키텍처

### 3.1 파일 구조

```
src/
├── repositories/
│   └── admin/
│       └── adminOrder.repository.js
├── services/
│   └── admin/
│       └── adminOrder.service.js
├── controllers/
│   └── admin/
│       └── adminOrder.controller.js
└── routes/
    └── admin/
        └── adminOrder.routes.js
```

### 3.2 주요 함수

#### 📦 Repository Layer
- `findAll(options)`: 주문 목록 조회 (상품, 구매자 정보 포함)
- `findByIdWithDetails(orderId)`: 주문 상세 조회 (결제, 쿠폰 정보)
- `updateOrderStatus(orderId, status)`: 주문 상태 변경
- `cancelOrder(orderId)`: 주문 취소 처리
- `refundOrder(orderId)`: 환불 처리
- `getStatistics()`: 주문 통계 조회

#### 🧠 Service Layer
- `getOrderList(options)`: 비즈니스 로직 적용 목록 조회
- `updateStatus(orderId, status)`: 상태 변경 검증
- `processRefund(orderId, reason)`: 환불 프로세스

---

## 4. API 엔드포인트

### 4.1 주문 목록 조회

**Request**:
```http
GET /api/v1/admin/orders?page=1&limit=20&status=pending&search=홍길동
```

**Query Parameters**:
- `page` (number): 페이지 번호
- `limit` (number): 페이지당 항목 수
- `status` (string): 주문 상태 필터
- `paymentStatus` (string): 결제 상태 필터
- `search` (string): 검색어 (구매자명, 이메일)

**Response**:
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "order_id": "10001",
        "order_quantity": 2,
        "order_final_price": 48000,
        "order_status": "shipped",
        "order_created_at": "2025-10-01T10:00:00.000Z",
        "member": {
          "member_id": "1234",
          "member_name": "홍길동",
          "member_email": "hong@example.com"
        },
        "product": {
          "product_id": "500",
          "product_name": "핸드메이드 도자기 찻잔",
          "product_price": 25000
        },
        "payment": {
          "payment_id": "5001",
          "payment_status": "completed",
          "payment_method": "card"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 50,
      "totalItems": 1000
    }
  }
}
```

### 4.2 주문 상세 조회

**Request**:
```http
GET /api/v1/admin/orders/10001
```

**Response**:
```json
{
  "success": true,
  "data": {
    "order_id": "10001",
    "order_quantity": 2,
    "order_price_per_item": 25000,
    "order_total_price": 50000,
    "order_discount_amount": 5000,
    "order_delivery_fee": 3000,
    "order_final_price": 48000,
    "order_status": "shipped",
    "member": { ... },
    "product": { ... },
    "coupon": {
      "coupon_id": "50",
      "coupon_name": "신규회원 5000원 할인",
      "coupon_discount_amount": 5000
    },
    "payment": {
      "payment_id": "5001",
      "payment_method": "card",
      "payment_amount": 48000,
      "payment_status": "completed",
      "payment_transaction_id": "PG20251001123456",
      "payment_approved_at": "2025-10-01T10:05:00.000Z"
    }
  }
}
```

### 4.3 주문 상태 변경

**Request**:
```http
PATCH /api/v1/admin/orders/10001/status
Content-Type: application/json

{
  "status": "shipped"
}
```

**Response**:
```json
{
  "success": true,
  "message": "주문 상태가 변경되었습니다.",
  "data": {
    "order_id": "10001",
    "order_status": "shipped"
  }
}
```

**에러 (잘못된 상태 변경)**:
```json
{
  "success": false,
  "message": "pending → delivered 직접 변경 불가. preparing → shipped를 거쳐야 합니다."
}
```

### 4.4 주문 취소

**Request**:
```http
PATCH /api/v1/admin/orders/10001/cancel
Content-Type: application/json

{
  "reason": "구매자 요청으로 인한 취소"
}
```

**Response**:
```json
{
  "success": true,
  "message": "주문이 취소되었습니다.",
  "data": {
    "order_id": "10001",
    "order_status": "cancelled"
  }
}
```

**에러 (취소 불가 상태)**:
```json
{
  "success": false,
  "message": "배송 중인 주문은 취소할 수 없습니다. 환불 처리해주세요."
}
```

### 4.5 환불 처리

**Request**:
```http
POST /api/v1/admin/orders/10001/refund
Content-Type: application/json

{
  "reason": "상품 불량",
  "refundAmount": 48000
}
```

**Response**:
```json
{
  "success": true,
  "message": "환불이 완료되었습니다.",
  "data": {
    "order_id": "10001",
    "order_status": "refunded",
    "payment": {
      "payment_status": "refunded",
      "refund_amount": 48000
    }
  }
}
```

### 4.6 주문 통계 조회

**Request**:
```http
GET /api/v1/admin/orders/statistics
```

**Response**:
```json
{
  "success": true,
  "data": {
    "totalOrders": 10000,
    "statusDistribution": {
      "pending": 150,
      "preparing": 300,
      "shipped": 500,
      "delivered": 8500,
      "cancelled": 350,
      "refunded": 200
    },
    "totalRevenue": 500000000,
    "averageOrderValue": 50000,
    "todayOrders": 45,
    "monthlyOrders": 1200,
    "refundRate": 2.0
  }
}
```

---

## 5. 프론트엔드 구현

### 5.1 페이지 구조

1. **통계 대시보드**
   - 총 주문 수
   - 오늘 주문 수
   - 이번 달 주문 수
   - 총 매출

2. **필터 및 검색**
   - 주문 상태 필터 (드롭다운)
   - 결제 상태 필터 (드롭다운)
   - 날짜 범위 필터 (datepicker)
   - 검색 (주문번호, 구매자명)

3. **주문 목록 테이블**
   - 주문 정보 (ID, 상품, 수량, 금액, 상태)
   - 구매자 정보 (이름, 이메일)
   - 결제 정보 (결제 수단, 결제 상태)
   - 액션 버튼 (상세보기, 상태 변경, 환불)

### 5.2 UI/UX 특징

**상태별 색상**:
```css
.badge-pending { background-color: #ffc107; }    /* 노란색 */
.badge-preparing { background-color: #17a2b8; }  /* 청록색 */
.badge-shipped { background-color: #007bff; }    /* 파란색 */
.badge-delivered { background-color: #28a745; }  /* 녹색 */
.badge-cancelled { background-color: #6c757d; }  /* 회색 */
.badge-refunded { background-color: #dc3545; }   /* 빨간색 */
```

**주문 상태 타임라인**:
```html
<div class="order-timeline">
  <div class="timeline-item active">주문 접수</div>
  <div class="timeline-item active">상품 준비</div>
  <div class="timeline-item active">배송 시작</div>
  <div class="timeline-item">배송 완료</div>
</div>
```

---

## 6. 주문 생명주기

### 6.1 정상 흐름

```
1. pending (주문 접수)
   - 구매자가 주문 생성
   - 결제 대기 또는 확인 중

2. preparing (상품 준비)
   - 판매자가 상품 포장 시작
   - 배송 준비 중

3. shipped (배송 시작)
   - 택배사에 인계
   - 송장번호 등록

4. delivered (배송 완료)
   - 구매자 수령 완료
   - 구매 확정 대기
```

### 6.2 취소 흐름

```
pending → cancelled
  ↓
결제 취소 (payment_status: cancelled)
재고 복구
```

**조건**:
- `order_status = 'pending'` 또는 `'preparing'` 일 때만
- `shipped` 이후는 환불 처리

### 6.3 환불 흐름

```
shipped/delivered → refunded
  ↓
결제 환불 (payment_status: refunded)
재고 복구 (선택)
```

**조건**:
- `payment_status = 'completed'` 일 때만
- PG사 환불 API 호출 필요

---

## 7. 사용 시나리오

### 7.1 주문 상태 변경 (정상 흐름)

1. 관리자가 "상품 준비 중" 주문 확인
2. 상품 포장 완료 후 "배송 시작" 버튼 클릭
3. `PATCH /api/v1/admin/orders/10001/status { "status": "shipped" }`
4. Service Layer:
   - 현재 상태 확인 (`preparing` → `shipped` 가능)
   - 상태 업데이트
5. 송장번호 입력 모달 표시 (선택)
6. 구매자에게 배송 시작 알림 발송

**결과**: 주문 상태가 `shipped`로 변경

### 7.2 주문 취소 처리

1. 구매자가 취소 요청 (pending 또는 preparing 상태)
2. 관리자가 취소 요청 확인
3. "취소 승인" 버튼 클릭
4. `PATCH /api/v1/admin/orders/10001/cancel { "reason": "구매자 요청" }`
5. Service Layer:
   - 취소 가능 상태 확인
   - 주문 상태 → `cancelled`
   - 결제 상태 → `cancelled`
6. PG사 결제 취소 API 호출
7. 재고 복구:
   ```javascript
   await prisma.product.update({
     where: { product_id },
     data: { product_quantity: { increment: orderQuantity } }
   });
   ```

**결과**: 주문 취소 완료, 결제 취소, 재고 복구

### 7.3 환불 처리

1. 구매자가 환불 요청 (상품 불량 등)
2. 관리자가 환불 요청 검토
3. "환불 승인" 버튼 클릭
4. `POST /api/v1/admin/orders/10001/refund { "reason": "상품 불량" }`
5. Service Layer:
   - 결제 완료 상태 확인
   - 주문 상태 → `refunded`
   - 결제 상태 → `refunded`
6. PG사 환불 API 호출
7. 재고 복구 (판매자 정책에 따라)

**결과**: 환불 완료, 결제 금액 반환

---

## 8. 트러블슈팅

### 8.1 문제: 주문 상태 변경 실패 (잘못된 순서)

**원인**: 상태 변경 순서를 건너뜀 (`pending` → `delivered` 직접 변경)

**증상**: ValidationError 발생

**해결**:
```javascript
// Service Layer에서 상태 변경 검증
const validTransitions = {
  pending: ['preparing', 'cancelled'],
  preparing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: ['refunded']
};

if (!validTransitions[currentStatus]?.includes(newStatus)) {
  throw new ValidationError('잘못된 상태 변경입니다');
}
```

### 8.2 문제: 재고 차감 중복

**원인**: 주문 생성 시 재고 차감, 결제 완료 후 다시 차감

**증상**: 재고가 실제보다 적게 표시됨

**해결**: 트랜잭션 사용 + 멱등성 보장
```javascript
await prisma.$transaction(async (tx) => {
  // 1. 주문 생성
  const order = await tx.order.create({ ... });

  // 2. 재고 차감 (한 번만)
  await tx.product.update({
    where: { product_id },
    data: { product_quantity: { decrement: quantity } }
  });
});
```

### 8.3 문제: 환불 후 주문이 삭제됨

**원인**: CASCADE DELETE 설정 오류

**증상**: 환불 처리 후 주문 이력이 사라짐

**해결**: 주문은 **절대 삭제하지 않음** (RESTRICT)
```prisma
model Order {
  // FK에 onDelete: Restrict 설정
  member  Member  @relation(fields: [member_id], references: [member_id], onDelete: Restrict)
}
```

---

**최종 업데이트**: 2025년 10월 10일
**작성자**: Backend Team
**상태**: ✅ **완료**
