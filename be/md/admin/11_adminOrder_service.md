# Step 11: AdminOrder Service 생성

> **작성일**: 2025년 10월 9일
> **상태**: ✅ 완료
> **파일**: `src/services/admin/adminOrder.service.js`

---

## 📚 개념 설명

### 🎯 왜 필요한가?

관리자는 플랫폼의 **모든 주문**을 관리하고 통제해야 합니다:

- **전체 주문 조회** (일반 사용자는 자신의 주문만 보지만, 관리자는 전체)
- **주문 상태 강제 변경** (배송 지연, 분쟁 해결)
- **환불 처리** (고객 요청, 부적절한 상품)
- **주문 통계 분석** (총 매출, 상태별 분포, 평균 주문 금액)
- **회원/판매사별 주문 조회** (특정 회원/판매사의 주문 이력 확인)

### 💡 Repository vs Service

**Repository (adminOrder.repository.js)**:
- ✅ 이미 구현 완료
- **역할**: 순수한 데이터 접근
- 단순히 DB에서 데이터 조회/수정

```javascript
// Repository - 데이터만 가져옴
findAll(options)              // 조건에 맞는 주문 조회
updateStatus(id, status)      // DB의 order_status 업데이트
refundOrder(orderId, data)    // 트랜잭션 실행
```

**Service (adminOrder.service.js)**:
- ⭐ **이번 Step에서 구현**
- **역할**: 비즈니스 로직 처리
- 검증, 권한 확인, 데이터 변환

```javascript
// Service - 비즈니스 로직 추가
getOrderList(filters)         // 필터 검증 + Repository 호출 + BigInt 변환
updateOrderStatus(id, status) // 상태값 검증 + 전환 규칙 확인 + Repository 호출
processRefund(id, data)       // 환불 가능 여부 확인 + 사유 검증 + Repository 호출
```

---

## 🔑 핵심 개념

### 1. 주문 상태 전환 규칙

**유효한 상태:**
```javascript
const VALID_ORDER_STATUSES = [
  'pending',     // 대기 중
  'preparing',   // 준비 중
  'shipped',     // 배송 중
  'delivered',   // 배송 완료
  'cancelled',   // 취소됨
  'refunded'     // 환불됨
];
```

**정상적인 흐름:**
```
pending → preparing → shipped → delivered
```

**취소/환불 흐름:**
```
pending → cancelled       (결제 전 취소)
preparing → cancelled     (결제 후 취소)
delivered → refunded      (환불)
```

**금지된 전환:**
```
❌ delivered → pending    (배송 완료를 대기로 되돌릴 수 없음)
❌ cancelled → preparing  (취소된 주문 재개 불가)
❌ shipped → pending      (배송 중인 주문을 대기로 되돌릴 수 없음)
```

**Service의 역할:**
- 현재 상태 확인
- 중복 상태 변경 방지
- 유효하지 않은 상태값 차단

**예시:**
```javascript
// ✅ 허용
await updateOrderStatus(1, 'shipped');    // pending → shipped

// ❌ 차단 (현재 상태와 동일)
await updateOrderStatus(1, 'shipped');    // ValidationError: 이미 shipped 상태입니다

// ❌ 차단 (잘못된 상태값)
await updateOrderStatus(1, 'shippd');     // ValidationError: 유효하지 않은 주문 상태입니다
```

---

### 2. 환불 처리 규칙

**환불 가능 조건:**
1. ✅ 주문이 존재해야 함
2. ✅ 배송 완료(`delivered`) 상태여야 함 (일반적으로)
3. ✅ 결제 상태가 `completed`여야 함
4. ✅ 이미 환불되지 않았어야 함

**환불 불가 조건:**
```javascript
// ❌ 이미 환불됨
if (order.order_status === 'refunded') {
  throw new ValidationError('이미 환불 처리된 주문입니다');
}

// ❌ 취소된 주문
if (order.order_status === 'cancelled') {
  throw new ValidationError('취소된 주문은 환불할 수 없습니다');
}

// ❌ 결제 미완료
if (payment.payment_status !== 'completed') {
  throw new ValidationError('결제가 완료된 주문만 환불 가능합니다');
}
```

**환불 시 동작 (트랜잭션):**
```javascript
// Repository에서 처리 (원자성 보장)
await prisma.$transaction(async (tx) => {
  // 1. order_status: delivered → refunded
  await tx.order.update({
    where: { order_id: BigInt(orderId) },
    data: { order_status: 'refunded' }
  });

  // 2. payment_status: completed → refunded
  await tx.payment.update({
    where: { order_id: BigInt(orderId) },
    data: {
      payment_status: 'refunded',
      payment_refunded_at: new Date(),
      payment_refund_reason: refundData.refund_reason || null
    }
  });
});
```

**Service의 역할:**
- 환불 가능 여부 확인
- 환불 사유 검증 (최대 500자)
- Repository 호출 (트랜잭션 처리는 Repository가 담당)

---

### 3. BigInt 변환 (복잡한 중첩 구조)

**Order의 관계 구조:**
```
Order (주문)
├── member (1:1) - 주문자
├── payment (1:1) - 결제 정보
├── coupon (1:1, nullable) - 쿠폰
└── order_items (1:N) - 주문 상품들
    └── product (N:1)
        ├── category (N:1)
        ├── tenant_member (N:1)
        │   ├── tenant (N:1)
        │   └── member (N:1) - 판매자
        └── product_images (1:N)
```

**변환해야 할 BigInt 필드 (깊이별):**

**1단계 (Order 자체):**
- `order_id`
- `member_id`
- `coupon_id` (nullable)
- `shopping_cart_id` (nullable)

**2단계 (직접 관계):**
- `member.member_id`, `member.company_id`
- `payment.payment_id`, `payment.order_id`
- `coupon.coupon_id`

**3단계 (OrderItem):**
- `order_items[].order_item_id`
- `order_items[].order_id`
- `order_items[].product_id`

**4단계 (Product):**
- `order_items[].product.product_id`
- `order_items[].product.category_id`
- `order_items[].product.tenant_member_id`

**5단계 (Category, TenantMember):**
- `order_items[].product.category.category_id`
- `order_items[].product.category.parent_category_id`
- `order_items[].product.tenant_member.tenant_member_id`
- `order_items[].product.tenant_member.tenant_id`
- `order_items[].product.tenant_member.member_id`

**6단계 (Tenant, Member, ProductImages):**
- `order_items[].product.tenant_member.tenant.tenant_id`
- `order_items[].product.tenant_member.member.member_id`
- `order_items[].product.tenant_member.member.company_id`
- `order_items[].product.product_images[].product_img_id`
- `order_items[].product.product_images[].product_id`

**변환 함수 구현:**
```javascript
function convertOrderBigInt(order) {
  if (!order) return null;

  return {
    ...order,
    // 1단계: 주문 기본 필드
    order_id: order.order_id.toString(),
    member_id: order.member_id.toString(),
    coupon_id: order.coupon_id?.toString(),
    shopping_cart_id: order.shopping_cart_id?.toString(),

    // 2단계: Member 관계
    member: order.member ? {
      ...order.member,
      member_id: order.member.member_id.toString(),
      company_id: order.member.company_id?.toString()
    } : null,

    // 2단계: Payment 관계
    payment: order.payment ? {
      ...order.payment,
      payment_id: order.payment.payment_id.toString(),
      order_id: order.payment.order_id.toString()
    } : null,

    // 2단계: Coupon 관계
    coupon: order.coupon ? {
      ...order.coupon,
      coupon_id: order.coupon.coupon_id.toString()
    } : null,

    // 3단계 이상: OrderItems (배열 + 중첩)
    order_items: order.order_items?.map(item => ({
      ...item,
      order_item_id: item.order_item_id.toString(),
      order_id: item.order_id.toString(),
      product_id: item.product_id.toString(),

      product: item.product ? {
        ...item.product,
        product_id: item.product.product_id.toString(),
        category_id: item.product.category_id?.toString(),
        tenant_member_id: item.product.tenant_member_id?.toString(),

        // Category
        category: item.product.category ? {
          ...item.product.category,
          category_id: item.product.category.category_id.toString(),
          parent_category_id: item.product.category.parent_category_id?.toString()
        } : null,

        // TenantMember (더 깊은 중첩)
        tenant_member: item.product.tenant_member ? {
          ...item.product.tenant_member,
          tenant_member_id: item.product.tenant_member.tenant_member_id.toString(),
          tenant_id: item.product.tenant_member.tenant_id?.toString(),
          member_id: item.product.tenant_member.member_id?.toString(),

          // Tenant
          tenant: item.product.tenant_member.tenant ? {
            ...item.product.tenant_member.tenant,
            tenant_id: item.product.tenant_member.tenant.tenant_id.toString()
          } : null,

          // Member (판매자)
          member: item.product.tenant_member.member ? {
            ...item.product.tenant_member.member,
            member_id: item.product.tenant_member.member.member_id.toString(),
            company_id: item.product.tenant_member.member.company_id?.toString()
          } : null
        } : null,

        // ProductImages (배열)
        product_images: item.product.product_images?.map(img => ({
          ...img,
          product_img_id: img.product_img_id.toString(),
          product_id: img.product_id.toString()
        }))
      } : null
    })),

    _count: order._count
  };
}
```

**주의사항:**
- `?.toString()`: nullable 필드는 옵셔널 체이닝 사용
- 객체가 `null`이면 전체를 `null`로 반환
- 배열은 `?.map()` 사용 (undefined 방지)

---

### 4. 필터 검증

**페이징 검증:**
```javascript
// page는 1 이상
if (page < 1) {
  throw new ValidationError('페이지는 1 이상이어야 합니다');
}

// limit은 1~100 (성능 보호)
if (limit < 1 || limit > 100) {
  throw new ValidationError('limit은 1~100 사이여야 합니다');
}
```

**상태 검증:**
```javascript
// orderStatus는 enum 값만
if (orderStatus && !VALID_ORDER_STATUSES.includes(orderStatus)) {
  throw new ValidationError('유효하지 않은 주문 상태입니다');
}

// paymentStatus는 유효한 값만
const VALID_PAYMENT_STATUSES = ['pending', 'completed', 'failed', 'cancelled', 'refunded'];
if (paymentStatus && !VALID_PAYMENT_STATUSES.includes(paymentStatus)) {
  throw new ValidationError('유효하지 않은 결제 상태입니다');
}
```

**날짜 검증:**
```javascript
// startDate와 endDate는 함께 제공
if ((startDate && !endDate) || (!startDate && endDate)) {
  throw new ValidationError('시작 날짜와 종료 날짜를 모두 입력해주세요');
}

// 날짜 형식 검증 (YYYY-MM-DD)
function isValidDate(dateString) {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;

  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

if (startDate && !isValidDate(startDate)) {
  throw new ValidationError('시작 날짜 형식이 잘못되었습니다 (YYYY-MM-DD)');
}
```

**ID 검증:**
```javascript
// memberId, tenantId는 양수
if (memberId && memberId < 1) {
  throw new ValidationError('회원 ID는 양수여야 합니다');
}

if (tenantId && tenantId < 1) {
  throw new ValidationError('판매사 ID는 양수여야 합니다');
}
```

---

### 5. 통계 데이터 포맷팅

**Repository는 raw 데이터 반환:**
```javascript
{
  totalOrders: 10000,
  totalRevenue: 500000000n,        // BigInt
  averageOrderAmount: 50000n,      // BigInt
  ordersByStatus: {
    pending: 50,
    preparing: 200,
    shipped: 300,
    delivered: 9000,
    cancelled: 300,
    refunded: 150
  },
  recentOrders: 500
}
```

**Service는 비즈니스 로직 추가 (퍼센티지 계산):**
```javascript
async function getOrderStatistics() {
  const stats = await orderRepo.getStatistics();

  // 비즈니스 로직: 퍼센티지 계산
  const total = stats.totalOrders || 1; // 0으로 나누기 방지
  const deliveredRate = (stats.ordersByStatus.delivered / total * 100).toFixed(1);
  const cancelledRate = (stats.ordersByStatus.cancelled / total * 100).toFixed(1);
  const refundedRate = (stats.ordersByStatus.refunded / total * 100).toFixed(1);

  return {
    ...stats,
    totalRevenue: Number(stats.totalRevenue),           // BigInt → Number
    averageOrderAmount: Number(stats.averageOrderAmount), // BigInt → Number
    deliveredRate: parseFloat(deliveredRate),           // 90.0%
    cancelledRate: parseFloat(cancelledRate),           // 3.0%
    refundedRate: parseFloat(refundedRate)              // 1.5%
  };
}
```

**반환값:**
```javascript
{
  totalOrders: 10000,
  totalRevenue: 500000000,         // Number
  averageOrderAmount: 50000,       // Number
  deliveredRate: 90.0,             // 추가
  cancelledRate: 3.0,              // 추가
  refundedRate: 1.5,               // 추가
  ordersByStatus: { ... },
  recentOrders: 500
}
```

---

## 📦 구현 내용

### 파일 위치
```
src/services/admin/adminOrder.service.js
```

### 주요 함수 (9개)

#### 1. convertOrderBigInt(order)
BigInt 재귀 변환 유틸리티

**파라미터:**
- `order` (Object): 주문 객체

**반환값:** BigInt가 문자열로 변환된 객체

**변환 대상:**
- 주문 기본 필드 (order_id, member_id, coupon_id, shopping_cart_id)
- Member 관계 (member_id, company_id)
- Payment 관계 (payment_id, order_id)
- Coupon 관계 (coupon_id)
- OrderItems 배열 (order_item_id, order_id, product_id)
- Product 중첩 (product_id, category_id, tenant_member_id)
- Category 중첩 (category_id, parent_category_id)
- TenantMember 중첩 (tenant_member_id, tenant_id, member_id)
- Tenant 중첩 (tenant_id)
- Member 중첩 (member_id, company_id)
- ProductImages 배열 (product_img_id, product_id)

---

#### 2. isValidDate(dateString)
날짜 형식 검증 (YYYY-MM-DD)

**파라미터:**
- `dateString` (string): 날짜 문자열

**반환값:** boolean (유효 여부)

**검증 로직:**
```javascript
const regex = /^\d{4}-\d{2}-\d{2}$/;
if (!regex.test(dateString)) return false;

const date = new Date(dateString);
return date instanceof Date && !isNaN(date);
```

**예시:**
```javascript
isValidDate('2025-10-09');     // true
isValidDate('2025-1-9');       // false (0 패딩 없음)
isValidDate('2025/10/09');     // false (슬래시 사용)
isValidDate('2025-13-01');     // false (13월은 없음)
```

---

#### 3. getOrderList(filters)
주문 목록 조회 (페이징, 필터링, 검색)

**파라미터:**
```javascript
{
  page: 1,                    // 페이지 번호
  limit: 20,                  // 페이지당 개수 (1~100)
  orderStatus: 'delivered',   // 주문 상태 필터 (선택)
  paymentStatus: 'completed', // 결제 상태 필터 (선택)
  memberId: 123,              // 회원 필터 (선택)
  tenantId: 10,               // 판매사 필터 (선택)
  startDate: '2025-10-01',    // 시작 날짜 (선택)
  endDate: '2025-10-07',      // 종료 날짜 (선택)
  search: '홍길동'            // 검색어 (선택)
}
```

**반환값:**
```javascript
{
  orders: [
    {
      order_id: "1",
      order_total_amount: 50000,
      order_status: "delivered",
      member: {
        member_id: "123",
        member_name: "홍길동",
        member_email: "user@example.com"
      },
      payment: {
        payment_id: "1",
        payment_status: "completed",
        payment_method: "card"
      },
      _count: {
        order_items: 3
      }
    }
  ],
  total: 1000,
  page: 1,
  totalPages: 50
}
```

**비즈니스 로직:**
1. 페이지 검증 (page ≥ 1)
2. limit 검증 (1~100)
3. orderStatus 검증 (enum 값)
4. paymentStatus 검증 (enum 값)
5. memberId, tenantId 검증 (양수)
6. 날짜 검증 (형식, 쌍으로 제공)
7. Repository 호출
8. BigInt 변환

**예시:**
```javascript
// 전체 주문 (1페이지)
const all = await getOrderList({ page: 1, limit: 20 });

// 배송 완료 주문만
const delivered = await getOrderList({ orderStatus: 'delivered' });

// 최근 7일간 주문
const recent = await getOrderList({
  startDate: '2025-10-01',
  endDate: '2025-10-07'
});

// 특정 회원의 환불 주문
const refunded = await getOrderList({
  memberId: 123,
  orderStatus: 'refunded'
});

// 판매사 10의 준비 중 주문
const tenantOrders = await getOrderList({
  tenantId: 10,
  orderStatus: 'preparing'
});
```

---

#### 4. getOrderById(orderId)
주문 상세 조회

**파라미터:**
- `orderId` (number): 주문 ID

**반환값:**
```javascript
{
  order_id: "1",
  member_id: "123",
  order_total_amount: 50000,
  order_status: "delivered",
  order_delivery_address: "서울시 강남구...",

  member: {
    member_id: "123",
    member_name: "홍길동",
    member_email: "user@example.com",
    member_phone: "010-1234-5678",
    member_status: "active"
  },

  payment: {
    payment_id: "1",
    payment_amount: 50000,
    payment_status: "completed",
    payment_method: "card",
    payment_pg_transaction_id: "pg_123456789",
    payment_approved_at: "2025-10-05T...",
    payment_refunded_at: null
  },

  order_items: [
    {
      order_item_id: "1",
      order_item_quantity: 2,
      order_item_price: 25000,
      product: {
        product_id: "10",
        product_name: "수제 도자기 컵",
        tenant_member: {
          tenant: {
            tenant_id: "3",
            tenant_name: "홍길동 공방"
          },
          member: {
            member_id: "20",
            member_name: "홍길동(판매자)"
          }
        },
        product_images: [
          { product_img_url: "https://..." }
        ]
      }
    }
  ],

  coupon: {
    coupon_id: "2",
    coupon_name: "신규 회원 10% 할인",
    coupon_discount_rate: 10
  }
}
```

**비즈니스 로직:**
1. Repository 호출
2. 존재 확인 (NotFoundError)
3. BigInt 변환

**예시:**
```javascript
const order = await getOrderById(1);

console.log(`주문자: ${order.member.member_name}`);
console.log(`총 금액: ${order.order_total_amount}원`);
console.log(`결제 수단: ${order.payment.payment_method}`);
console.log(`주문 상품: ${order.order_items.length}개`);
```

---

#### 5. updateOrderStatus(orderId, status)
주문 상태 변경

**파라미터:**
- `orderId` (number): 주문 ID
- `status` (string): 변경할 상태
  - `'pending'`: 대기 중
  - `'preparing'`: 준비 중
  - `'shipped'`: 배송 중
  - `'delivered'`: 배송 완료
  - `'cancelled'`: 취소됨
  - `'refunded'`: 환불됨

**반환값:**
```javascript
{
  order_id: "1",
  order_status: "shipped",
  order_updated_at: "2025-10-09T..."
}
```

**비즈니스 로직:**
1. status 필수 검증
2. status enum 검증
3. 주문 존재 확인
4. 현재 상태와 동일한지 확인
5. Repository 호출
6. BigInt 변환

**예시:**
```javascript
// 배송 시작
await updateOrderStatus(1, 'shipped');

// 배송 완료
await updateOrderStatus(1, 'delivered');

// 주문 취소
await updateOrderStatus(1, 'cancelled');

// ❌ 에러: 현재 상태와 동일
await updateOrderStatus(1, 'delivered');  // 이미 delivered 상태입니다

// ❌ 에러: 잘못된 상태
await updateOrderStatus(1, 'shippd');     // 유효하지 않은 주문 상태입니다
```

---

#### 6. processRefund(orderId, refundData)
주문 환불 처리

**파라미터:**
- `orderId` (number): 주문 ID
- `refundData` (object, 선택):
  - `refund_reason` (string): 환불 사유 (최대 500자)

**반환값:**
```javascript
{
  order_id: "1",
  order_status: "refunded",
  order_total_amount: 50000,
  order_updated_at: "2025-10-09T..."
}
```

**비즈니스 로직:**
1. 주문 존재 확인 및 상세 조회
2. 이미 환불된 주문인지 확인
3. 취소된 주문인지 확인
4. 결제 완료 여부 확인
5. 환불 사유 길이 검증 (최대 500자)
6. Repository 호출 (트랜잭션 처리)
7. BigInt 변환

**동작:**
- `order_status`: `delivered` → `refunded`
- `payment_status`: `completed` → `refunded`
- `payment_refunded_at`: 현재 시각 기록
- `payment_refund_reason`: 환불 사유 저장

**예시:**
```javascript
// 환불 처리 (사유 포함)
await processRefund(1, {
  refund_reason: "상품 불량으로 인한 환불 요청"
});

// 환불 처리 (사유 없이)
await processRefund(1);

// ❌ 에러: 이미 환불됨
await processRefund(1, { ... });  // 이미 환불 처리된 주문입니다

// ❌ 에러: 취소된 주문
await processRefund(2, { ... });  // 취소된 주문은 환불할 수 없습니다

// ❌ 에러: 결제 미완료
await processRefund(3, { ... });  // 결제가 완료된 주문만 환불 가능합니다
```

---

#### 7. getOrderStatistics()
주문 통계 조회 (퍼센티지 포함)

**반환값:**
```javascript
{
  totalOrders: 10000,              // 전체 주문 수
  totalRevenue: 500000000,         // 총 매출액 (Number)
  averageOrderAmount: 50000,       // 평균 주문 금액 (Number)
  ordersByStatus: {                // 상태별 주문 수
    pending: 50,
    preparing: 200,
    shipped: 300,
    delivered: 9000,
    cancelled: 300,
    refunded: 150
  },
  recentOrders: 500,               // 최근 7일 주문
  deliveredRate: 90.0,             // 완료율 (추가)
  cancelledRate: 3.0,              // 취소율 (추가)
  refundedRate: 1.5                // 환불율 (추가)
}
```

**비즈니스 로직:**
1. Repository 호출
2. 퍼센티지 계산 (소수점 1자리)
3. BigInt → Number 변환
4. 0으로 나누기 방지

**예시:**
```javascript
const stats = await getOrderStatistics();

console.log(`전체 주문: ${stats.totalOrders}건`);
console.log(`총 매출: ${stats.totalRevenue.toLocaleString()}원`);
console.log(`평균 주문 금액: ${stats.averageOrderAmount.toLocaleString()}원`);
console.log(`완료율: ${stats.deliveredRate}%`);
console.log(`취소율: ${stats.cancelledRate}%`);
console.log(`환불율: ${stats.refundedRate}%`);
```

---

#### 8. getOrdersByMember(memberId, options)
회원별 주문 조회

**파라미터:**
- `memberId` (number): 회원 ID
- `options` (object): 페이징 옵션 (page, limit)

**반환값:** `getOrderList()`와 동일 구조

**비즈니스 로직:**
1. memberId 검증 (양수)
2. getOrderList() 재사용

**예시:**
```javascript
// 회원 123의 모든 주문
const memberOrders = await getOrdersByMember(123, { page: 1, limit: 20 });

console.log(`${memberOrders.orders[0].member.member_name}님의 주문: ${memberOrders.total}건`);

// ❌ 에러: 잘못된 ID
await getOrdersByMember(0);       // 유효한 회원 ID를 입력해주세요
await getOrdersByMember(-1);      // 유효한 회원 ID를 입력해주세요
```

---

#### 9. getOrdersByTenant(tenantId, options)
판매사별 주문 조회

**파라미터:**
- `tenantId` (number): 판매사 ID
- `options` (object): 페이징 옵션 (page, limit)

**반환값:** `getOrderList()`와 동일 구조

**비즈니스 로직:**
1. tenantId 검증 (양수)
2. getOrderList() 재사용

**예시:**
```javascript
// 판매사 10의 모든 주문
const tenantOrders = await getOrdersByTenant(10, { page: 1, limit: 20 });

console.log(`판매사 주문: ${tenantOrders.total}건`);

// ❌ 에러: 잘못된 ID
await getOrdersByTenant(0);       // 유효한 판매사 ID를 입력해주세요
```

---

#### 10. getRecentOrders(days, limit)
최근 주문 조회

**파라미터:**
- `days` (number, 선택): 조회 기간 (기본 7일, 1~365)
- `limit` (number, 선택): 결과 개수 (기본 10, 1~100)

**반환값:**
```javascript
[
  {
    order_id: "1",
    order_total_amount: 50000,
    order_status: "delivered",
    order_created_at: "2025-10-09T...",
    member: {
      member_name: "홍길동",
      member_email: "user@example.com"
    },
    payment: {
      payment_status: "completed",
      payment_method: "card"
    }
  },
  ...
]
```

**비즈니스 로직:**
1. days 검증 (1~365)
2. limit 검증 (1~100)
3. Repository 호출
4. BigInt 변환

**예시:**
```javascript
// 최근 7일 주문 (최대 10건)
const recent = await getRecentOrders();

// 최근 30일 주문 (최대 50건)
const monthly = await getRecentOrders(30, 50);

// 오늘 주문 (최대 100건)
const today = await getRecentOrders(1, 100);

// ❌ 에러: 범위 초과
await getRecentOrders(400);       // 조회 기간은 1~365일 사이여야 합니다
await getRecentOrders(7, 200);    // limit은 1~100 사이여야 합니다
```

---

## 🔄 사용 예시

### 예시 1: 주문 목록 조회 (필터링)

```javascript
// Controller
async function getOrders(req, res, next) {
  try {
    const { page, limit, orderStatus, paymentStatus, memberId, tenantId, startDate, endDate, search } = req.query;

    const result = await orderService.getOrderList({
      page,
      limit,
      orderStatus,
      paymentStatus,
      memberId,
      tenantId,
      startDate,
      endDate,
      search
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}
```

**요청 예시:**
```
GET /api/v1/admin/orders?page=1&limit=20
GET /api/v1/admin/orders?orderStatus=delivered
GET /api/v1/admin/orders?paymentStatus=completed
GET /api/v1/admin/orders?memberId=123
GET /api/v1/admin/orders?tenantId=10
GET /api/v1/admin/orders?startDate=2025-10-01&endDate=2025-10-07
GET /api/v1/admin/orders?search=홍길동
```

---

### 예시 2: 주문 상세 조회

```javascript
async function getOrderDetail(req, res, next) {
  try {
    const { orderId } = req.params;

    const order = await orderService.getOrderById(parseInt(orderId));

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
}
```

**요청 예시:**
```
GET /api/v1/admin/orders/123
```

---

### 예시 3: 주문 상태 변경

```javascript
async function updateStatus(req, res, next) {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const updated = await orderService.updateOrderStatus(
      parseInt(orderId),
      status
    );

    res.json({
      success: true,
      message: '주문 상태가 변경되었습니다',
      data: updated
    });
  } catch (error) {
    next(error);
  }
}
```

**요청 예시:**
```json
PUT /api/v1/admin/orders/123/status
{
  "status": "shipped"
}
```

---

### 예시 4: 환불 처리

```javascript
async function refundOrder(req, res, next) {
  try {
    const { orderId } = req.params;
    const { refund_reason } = req.body;

    const result = await orderService.processRefund(
      parseInt(orderId),
      { refund_reason }
    );

    res.json({
      success: true,
      message: '환불 처리가 완료되었습니다',
      data: result
    });
  } catch (error) {
    next(error);
  }
}
```

**요청 예시:**
```json
POST /api/v1/admin/orders/123/refund
{
  "refund_reason": "상품 불량으로 인한 환불 요청"
}
```

---

### 예시 5: 통계 조회

```javascript
async function getStatistics(req, res, next) {
  try {
    const stats = await orderService.getOrderStatistics();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
}
```

**요청 예시:**
```
GET /api/v1/admin/orders/statistics
```

---

## ⚠️ 주의사항

### 1. 상태 검증

```javascript
// ✅ 올바른 검증
if (!VALID_ORDER_STATUSES.includes(status)) {
  throw new ValidationError('...');
}

// ❌ 오타 허용
await updateStatus(1, 'shippd');  // 에러 발생하지 않음
```

### 2. 중복 상태 방지

```javascript
// ✅ 현재 상태 확인
if (order.order_status === status) {
  throw new ValidationError(`이미 ${status} 상태입니다`);
}

// ❌ 확인하지 않으면
// 불필요한 DB 업데이트 + updated_at 변경
```

### 3. 환불 조건 확인

```javascript
// ✅ 환불 전 확인
if (order.order_status === 'refunded') {
  throw new ValidationError('이미 환불 처리된 주문입니다');
}

if (payment.payment_status !== 'completed') {
  throw new ValidationError('결제가 완료된 주문만 환불 가능합니다');
}

// ❌ 확인하지 않으면
// 중복 환불, 미결제 환불 등 문제 발생
```

### 4. BigInt 변환

```javascript
// ✅ null 체크 후 변환
coupon_id: order.coupon_id?.toString()

// ❌ null 체크 없이 변환
coupon_id: order.coupon_id.toString()  // null이면 에러
```

### 5. 날짜 검증

```javascript
// ✅ 날짜 쌍으로 제공
if ((startDate && !endDate) || (!startDate && endDate)) {
  throw new ValidationError('시작 날짜와 종료 날짜를 모두 입력해주세요');
}

// ✅ 형식 검증
if (startDate && !isValidDate(startDate)) {
  throw new ValidationError('날짜 형식이 잘못되었습니다');
}
```

### 6. 페이징 제한

```javascript
// ✅ limit 제한
if (limit < 1 || limit > 100) {
  throw new ValidationError('limit은 1~100 사이여야 합니다');
}

// ❌ 제한 없으면
// limit=999999 → 메모리 초과, 서버 다운
```

---

## 📝 비즈니스 규칙 요약

### 주문 상태 변경
- ✅ 유효한 상태: `pending`, `preparing`, `shipped`, `delivered`, `cancelled`, `refunded`
- ✅ 주문이 존재해야 함
- ✅ 현재 상태와 다른 상태로만 변경 가능
- ❌ 잘못된 상태값 불가

### 환불 처리
- ✅ 결제 완료된 주문만 환불 가능
- ✅ 이미 환불되지 않았어야 함
- ✅ 취소된 주문 환불 불가
- ✅ 환불 사유 최대 500자
- ✅ 트랜잭션으로 order + payment 동시 처리

### 목록 조회
- ✅ 페이지는 1 이상
- ✅ limit은 1~100 (성능 보호)
- ✅ orderStatus는 enum 값만
- ✅ paymentStatus는 enum 값만
- ✅ memberId, tenantId는 양수
- ✅ 날짜는 YYYY-MM-DD 형식, 쌍으로 제공
- ✅ BigInt 필드는 문자열 변환

### 통계
- ✅ 퍼센티지 소수점 1자리
- ✅ 0으로 나누기 방지
- ✅ BigInt → Number 변환

### 최근 주문 조회
- ✅ days는 1~365
- ✅ limit은 1~100

---

## 🧪 테스트 시나리오

### 1. 목록 조회 (페이징)
```javascript
const page1 = await getOrderList({ page: 1, limit: 20 });
const page2 = await getOrderList({ page: 2, limit: 20 });
```

### 2. 상태 필터링
```javascript
const delivered = await getOrderList({ orderStatus: 'delivered' });
const pending = await getOrderList({ orderStatus: 'pending' });
```

### 3. 기간 필터링
```javascript
const recent = await getOrderList({
  startDate: '2025-10-01',
  endDate: '2025-10-07'
});
```

### 4. 회원별 조회
```javascript
const memberOrders = await getOrdersByMember(123, { page: 1, limit: 20 });
```

### 5. 판매사별 조회
```javascript
const tenantOrders = await getOrdersByTenant(10, { page: 1, limit: 20 });
```

### 6. 상태 변경
```javascript
await updateOrderStatus(1, 'shipped');
await updateOrderStatus(1, 'delivered');
```

### 7. 환불 처리
```javascript
// 성공 케이스
await processRefund(1, { refund_reason: "상품 불량" });

// 실패 케이스 (이미 환불됨)
await processRefund(1, { ... });  // ValidationError

// 실패 케이스 (취소된 주문)
await processRefund(2, { ... });  // ValidationError
```

### 8. 통계
```javascript
const stats = await getOrderStatistics();
console.log(`완료율: ${stats.deliveredRate}%`);
console.log(`환불율: ${stats.refundedRate}%`);
```

### 9. 최근 주문
```javascript
const recent = await getRecentOrders(7, 10);
const monthly = await getRecentOrders(30, 50);
```

---

## 📝 다음 단계

✅ **Step 11 완료**

**다음**: Step 12 - AdminDashboard Service 생성
- 대시보드 전체 통계 집계
- 일별/월별 매출 추이
- 실시간 데이터 조회
- 통계 데이터 시각화용 포맷팅

또는

**다음**: Step 13 - Admin Controllers 생성
- AdminOrder Controller
- AdminProduct Controller
- AdminDashboard Controller
- HTTP 요청/응답 처리
- 에러 핸들링

---

**작성일**: 2025년 10월 9일
**상태**: ✅ 완료
