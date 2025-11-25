# Step 5: AdminOrder Repository 생성

> **작성일**: 2025년 10월 7일
> **상태**: ✅ 완료
> **파일**: `src/repositories/admin/adminOrder.repository.js`

---

## 📚 개념 설명

### 🎯 왜 필요한가?

관리자는 플랫폼의 **모든 주문**을 관리하고 모니터링해야 합니다:

- **전체 주문 조회** (일반 사용자는 자신의 주문만 보지만, 관리자는 전체)
- **주문 상태 관리** (대기 → 준비 → 배송 → 완료)
- **결제 정보 확인** (결제 상태, 금액, 수단)
- **환불/취소 처리** (트랜잭션으로 주문+결제 동시 처리)
- **주문 통계** (총 매출, 상태별 분포, 평균 주문 금액)

### 💡 일반 Order vs Admin Order

**기존 `order.repository.js`** (일반 사용자용):
```javascript
// 자신의 주문만 조회
findByMember(memberId)
findById(orderId)  // 기본 정보만
```

**새로운 `admin/adminOrder.repository.js`**:
```javascript
// 관리자 전용 - 모든 주문 관리
findAll({ page, limit, orderStatus, paymentStatus, memberId, tenantId, startDate, endDate, search })
findByIdWithDetails(orderId)           // 주문자, 결제, 상품, 판매사 모두 포함
updateStatus(orderId, status)          // 주문 상태 변경
refundOrder(orderId, refundData)       // 환불 처리 (트랜잭션)
getStatistics()                        // 통계 (매출, 평균 금액)
getOrdersByMember(memberId)            // 회원별 주문
getOrdersByTenant(tenantId)            // 판매사별 주문
getRecentOrders(days)                  // 최근 주문
```

---

## 🔑 핵심 개념

### 1. Order-Payment 관계 (1:1)

**테이블 구조:**
```
order (주문)                    payment (결제)
├── order_id                   ├── payment_id
├── member_id (FK)             ├── order_id (FK, 1:1)
├── order_status               ├── payment_status
├── order_total_amount         ├── payment_amount
├── order_delivery_address     ├── payment_method
├── coupon_id (FK, 선택)       ├── payment_pg_transaction_id
└── order_items (1:N)          ├── payment_approved_at
                               └── payment_refunded_at

관계:
Order → Member (N:1, 주문자)
Order → Payment (1:1, 결제 정보)
Order → OrderItem (1:N, 주문 상품들)
Order → Coupon (N:1, 선택적)
OrderItem → Product (N:1)
```

**1:1 관계의 의미:**
- 한 주문은 하나의 결제만 가짐
- 결제는 반드시 주문과 연결됨
- 주문과 결제는 생명주기를 함께함

---

### 2. 주문 상태(order_status)

| 상태 | 의미 | 설명 |
|------|------|------|
| `pending` | 대기 중 | 결제 대기 또는 주문 접수 중 |
| `preparing` | 준비 중 | 상품 포장, 배송 준비 |
| `shipped` | 배송 중 | 배송 시작됨 |
| `delivered` | 배송 완료 | 고객 수령 완료 |
| `cancelled` | 취소됨 | 주문 취소 (결제 전/후) |
| `refunded` | 환불됨 | 결제 후 환불 처리 |

**상태 전환 흐름:**
```
pending → preparing → shipped → delivered  (정상 흐름)
pending → cancelled                        (결제 전 취소)
preparing → cancelled                      (결제 후 취소)
delivered → refunded                       (환불)
```

---

### 3. 결제 상태(payment_status)

| 상태 | 의미 | 설명 |
|------|------|------|
| `pending` | 대기 중 | 결제 진행 중 |
| `completed` | 완료됨 | 결제 성공 |
| `failed` | 실패 | 결제 실패 |
| `cancelled` | 취소됨 | 결제 취소 |
| `refunded` | 환불됨 | 환불 완료 |

**주문-결제 상태 연동:**
```
order: pending → payment: pending (결제 시작)
order: preparing → payment: completed (결제 완료)
order: cancelled → payment: cancelled (취소)
order: refunded → payment: refunded (환불)
```

---

### 4. 복잡한 필터링 조합

**여러 조건 동시 적용:**

```javascript
const where = {};

// 1. 주문 상태 필터
if (orderStatus) {
  where.order_status = orderStatus;
}

// 2. 결제 상태 필터
if (paymentStatus) {
  where.payment = {
    payment_status: paymentStatus
  };
}

// 3. 회원 필터
if (memberId) {
  where.member_id = BigInt(memberId);
}

// 4. 판매사 필터 (OrderItem을 통해)
if (tenantId) {
  where.order_items = {
    some: {                    // 최소 하나라도 만족
      product: {
        tenant_member: {
          tenant_id: BigInt(tenantId)
        }
      }
    }
  };
}

// 5. 기간 필터
if (startDate && endDate) {
  where.order_created_at = {
    gte: new Date(startDate),
    lte: new Date(endDate)
  };
}

// 6. 검색 (주문자 이름 OR 이메일)
if (search) {
  where.member = {
    OR: [
      { member_name: { contains: search, mode: 'insensitive' } },
      { member_email: { contains: search, mode: 'insensitive' } }
    ]
  };
}
```

**조합 예시:**
```javascript
// 배송 중인 주문
findAll({ orderStatus: 'shipped' })

// 최근 7일간 완료된 주문
findAll({
  orderStatus: 'delivered',
  startDate: '2025-10-01',
  endDate: '2025-10-07'
})

// 특정 회원의 환불 주문
findAll({ memberId: 123, orderStatus: 'refunded' })

// 특정 판매사의 준비 중 주문
findAll({ tenantId: 10, orderStatus: 'preparing' })
```

---

### 5. 복잡한 JOIN 패턴

**목록 조회 시 (간략 정보):**
```javascript
include: {
  member: {
    select: { member_name: true, member_email: true }
  },
  payment: {
    select: { payment_status: true, payment_method: true }
  },
  _count: {
    select: { order_items: true }  // 주문 상품 개수
  }
}
```

**상세 조회 시 (전체 정보):**
```javascript
include: {
  member: true,              // 주문자 전체 정보
  payment: true,             // 결제 전체 정보
  order_items: {
    include: {
      product: {
        include: {
          tenant_member: {   // 판매사, 판매자 정보
            include: {
              tenant: true,
              member: true
            }
          },
          product_images: { take: 1 }
        }
      }
    }
  },
  coupon: true               // 쿠폰 정보
}
```

---

### 6. 환불 처리 - 트랜잭션

**왜 트랜잭션?**
- 주문과 결제 상태를 동시에 변경해야 함
- 하나만 성공하면 데이터 불일치 발생
- 원자성 보장: 전부 성공 or 전부 실패

**환불 처리 로직:**
```javascript
async function refundOrder(orderId, refundData) {
  return await prisma.$transaction(async (tx) => {
    // 1. 주문 상태 → refunded
    const order = await tx.order.update({
      where: { order_id: BigInt(orderId) },
      data: { order_status: 'refunded' }
    });

    // 2. 결제 상태 → refunded
    await tx.payment.update({
      where: { order_id: BigInt(orderId) },
      data: {
        payment_status: 'refunded',
        payment_refunded_at: new Date(),
        payment_refund_reason: refundData.refund_reason
      }
    });

    return order;
  });
}
```

**실패 시나리오:**
- 2번 실패 → 1번도 롤백 (주문은 원래 상태 유지)
- **트랜잭션 없으면**: 주문은 refunded인데 결제는 completed (불일치!)

---

### 7. 통계 - aggregate 사용

**금액 집계:**
```javascript
// 총 매출액
const totalRevenue = await prisma.payment.aggregate({
  where: { payment_status: 'completed' },
  _sum: { payment_amount: true }
});
// → { _sum: { payment_amount: 500000000 } }

// 평균 주문 금액
const avgAmount = await prisma.payment.aggregate({
  where: { payment_status: 'completed' },
  _avg: { payment_amount: true }
});
// → { _avg: { payment_amount: 50000 } }
```

**병렬 쿼리로 최적화:**
```javascript
const [totalOrders, totalRevenue, avgAmount, ...statusCounts] = await Promise.all([
  prisma.order.count(),
  prisma.payment.aggregate({ ... }),
  prisma.payment.aggregate({ ... }),
  prisma.order.count({ where: { order_status: 'pending' } }),
  prisma.order.count({ where: { order_status: 'preparing' } }),
  // ...
]);
```

---

### 8. 판매사별 주문 조회 - some 조건

**복잡한 관계 필터링:**

```javascript
// "홍길동 공방"의 주문만
where: {
  order_items: {
    some: {                      // 최소 하나라도 만족
      product: {
        tenant_member: {
          tenant_id: BigInt(tenantId)
        }
      }
    }
  }
}
```

**주의사항:**
- 한 주문에 여러 판매사 상품 포함 가능
- `some`: 최소 하나의 OrderItem이 조건 만족
- `every`: 모든 OrderItem이 조건 만족
- `none`: 조건 만족하는 OrderItem 없음

**예시:**
```javascript
// 주문 123: [상품A(판매사1), 상품B(판매사2), 상품C(판매사1)]
// 판매사1 필터 → 조회됨 (상품A, C가 판매사1)
// 판매사3 필터 → 조회 안 됨
```

---

### 9. 기간 필터링

**날짜 범위 조회:**
```javascript
where: {
  order_created_at: {
    gte: new Date('2025-10-01'),  // 이상 (>=)
    lte: new Date('2025-10-07')   // 이하 (<=)
  }
}

// 최근 7일
where: {
  order_created_at: {
    gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  }
}
```

---

## 📦 구현 내용

### 파일 위치
```
src/repositories/admin/adminOrder.repository.js
```

### 주요 함수 (8개)

#### 1. findAll(options)
주문 목록 조회 (페이징, 필터링, 검색)

**파라미터:**
```javascript
{
  page: 1,                    // 페이지 번호
  limit: 20,                  // 페이지당 개수
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
      order_id: 1n,
      order_total_amount: 50000,
      order_status: "delivered",
      order_delivery_address: "서울시 강남구...",
      order_created_at: "2025-10-05T...",
      member: {
        member_id: 123n,
        member_name: "홍길동",
        member_email: "user@example.com",
        member_phone: "010-1234-5678"
      },
      payment: {
        payment_id: 1n,
        payment_amount: 50000,
        payment_status: "completed",
        payment_method: "card",
        payment_approved_at: "2025-10-05T..."
      },
      _count: {
        order_items: 3  // 주문 상품 3개
      }
    }
  ],
  total: 1000,
  page: 1,
  totalPages: 50
}
```

**예시:**
```javascript
// 전체 주문 (1페이지)
const all = await findAll({ page: 1, limit: 20 });

// 배송 완료 주문만
const delivered = await findAll({ orderStatus: 'delivered' });

// 최근 7일간 주문
const recent = await findAll({
  startDate: '2025-10-01',
  endDate: '2025-10-07'
});

// 특정 회원의 환불 주문
const refunded = await findAll({
  memberId: 123,
  orderStatus: 'refunded'
});

// 판매사 10의 준비 중 주문
const tenantOrders = await findAll({
  tenantId: 10,
  orderStatus: 'preparing'
});

// 주문자 검색
const searchResults = await findAll({ search: '홍길동' });
```

---

#### 2. findByIdWithDetails(orderId)
주문 상세 조회 (관리자용 - 모든 정보 포함)

**포함 정보:**
- 주문 기본 정보
- 주문자 정보 (member)
- 결제 정보 (payment)
- 주문 상품 목록 (order_items → product → tenant_member → tenant/member)
- 쿠폰 정보 (coupon)

**반환값:**
```javascript
{
  order_id: 1n,
  order_total_amount: 50000,
  order_status: "delivered",
  order_delivery_address: "서울시 강남구...",

  // 주문자
  member: {
    member_id: 123n,
    member_name: "홍길동",
    member_email: "user@example.com",
    member_phone: "010-1234-5678",
    member_status: "active"
  },

  // 결제 정보
  payment: {
    payment_id: 1n,
    payment_amount: 50000,
    payment_status: "completed",
    payment_method: "card",
    payment_pg_transaction_id: "pg_123456789",
    payment_approved_at: "2025-10-05T...",
    payment_refunded_at: null,
    payment_refund_reason: null
  },

  // 주문 상품들
  order_items: [
    {
      order_item_id: 1n,
      order_item_quantity: 2,
      order_item_price: 25000,
      product: {
        product_id: 1n,
        product_name: "수제 도자기 컵",
        product_price: 25000,
        tenant_member: {
          tenant: {
            tenant_id: 10n,
            tenant_name: "홍길동 공방",
            tenant_status: "approved"
          },
          member: {
            member_id: 456n,
            member_name: "홍길동(판매자)",
            member_email: "seller@example.com"
          }
        },
        product_images: [
          { product_img_url: "https://..." }
        ]
      }
    }
  ],

  // 쿠폰
  coupon: {
    coupon_id: 1n,
    coupon_name: "신규 회원 10% 할인",
    coupon_discount_amount: null,
    coupon_discount_rate: 10
  }
}
```

**예시:**
```javascript
const order = await findByIdWithDetails(1);

console.log(`주문 ID: ${order.order_id}`);
console.log(`주문자: ${order.member.member_name}`);
console.log(`총 금액: ${order.order_total_amount}원`);
console.log(`결제 수단: ${order.payment.payment_method}`);
console.log(`주문 상품: ${order.order_items.length}개`);

// 판매사 확인
order.order_items.forEach(item => {
  console.log(`- ${item.product.product_name} (${item.product.tenant_member.tenant.tenant_name})`);
});
```

---

#### 3. updateStatus(orderId, status)
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
  order_id: 1n,
  order_status: "shipped",
  order_updated_at: "2025-10-07T..."
}
```

**예시:**
```javascript
// 배송 시작
await updateStatus(1, 'shipped');

// 배송 완료
await updateStatus(1, 'delivered');

// 주문 취소
await updateStatus(1, 'cancelled');
```

---

#### 4. refundOrder(orderId, refundData)
주문 환불 처리 (트랜잭션)

**파라미터:**
- `orderId` (number): 주문 ID
- `refundData` (object, 선택):
  - `refund_reason` (string): 환불 사유

**동작:**
1. `order_status` → `refunded`
2. `payment_status` → `refunded`
3. `payment_refunded_at` 현재 시각 기록
4. `payment_refund_reason` 저장
5. 트랜잭션으로 원자성 보장

**반환값:**
```javascript
{
  order_id: 1n,
  order_status: "refunded",
  order_total_amount: 50000,
  order_updated_at: "2025-10-07T..."
}
```

**예시:**
```javascript
// 환불 처리
await refundOrder(1, {
  refund_reason: "상품 불량으로 인한 환불"
});

// 환불 사유 없이
await refundOrder(1);
```

---

#### 5. getStatistics()
주문 통계 조회

**반환값:**
```javascript
{
  totalOrders: 10000,              // 전체 주문 수
  totalRevenue: 500000000,         // 총 매출액 (완료된 결제만)
  averageOrderAmount: 50000,       // 평균 주문 금액
  ordersByStatus: {                // 상태별 주문 수
    pending: 50,
    preparing: 200,
    shipped: 300,
    delivered: 9000,
    cancelled: 300,
    refunded: 150
  },
  recentOrders: 500                // 최근 7일 주문
}
```

**예시:**
```javascript
const stats = await getStatistics();

console.log(`전체 주문: ${stats.totalOrders}건`);
console.log(`총 매출: ${stats.totalRevenue.toLocaleString()}원`);
console.log(`평균 주문 금액: ${stats.averageOrderAmount.toLocaleString()}원`);
console.log(`배송 중: ${stats.ordersByStatus.shipped}건`);

// 완료율 계산
const completionRate = (stats.ordersByStatus.delivered / stats.totalOrders * 100).toFixed(1);
console.log(`완료율: ${completionRate}%`);

// 환불율 계산
const refundRate = (stats.ordersByStatus.refunded / stats.totalOrders * 100).toFixed(1);
console.log(`환불율: ${refundRate}%`);
```

---

#### 6. getOrdersByMember(memberId, options)
회원별 주문 조회

**파라미터:**
- `memberId` (number): 회원 ID
- `options` (object): 페이징 옵션 (page, limit)

**반환값:** `findAll()`과 동일 구조

**예시:**
```javascript
// 회원 123의 모든 주문
const memberOrders = await getOrdersByMember(123, { page: 1, limit: 20 });

console.log(`${memberOrders.orders[0].member.member_name}님의 주문: ${memberOrders.total}건`);
```

---

#### 7. getOrdersByTenant(tenantId, options)
판매사별 주문 조회

**파라미터:**
- `tenantId` (number): 판매사 ID
- `options` (object): 페이징 옵션 (page, limit)

**반환값:** `findAll()`과 동일 구조

**예시:**
```javascript
// 판매사 10의 모든 주문
const tenantOrders = await getOrdersByTenant(10, { page: 1, limit: 20 });

console.log(`판매사 주문: ${tenantOrders.total}건`);

// 준비 중인 주문만
const preparing = await getOrdersByTenant(10, {
  page: 1,
  limit: 20,
  orderStatus: 'preparing'
});
```

---

#### 8. getRecentOrders(days, limit)
최근 주문 조회

**파라미터:**
- `days` (number, 선택): 조회 기간 (기본 7일)
- `limit` (number, 선택): 결과 개수 (기본 10)

**반환값:**
```javascript
[
  {
    order_id: 1n,
    order_total_amount: 50000,
    order_status: "delivered",
    order_created_at: "2025-10-07T...",
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

**예시:**
```javascript
// 최근 7일 주문 (최대 10건)
const recent = await getRecentOrders();

// 최근 30일 주문 (최대 50건)
const monthly = await getRecentOrders(30, 50);

// 오늘 주문 (최대 100건)
const today = await getRecentOrders(1, 100);
```

---

## 🔄 동작 흐름 예시

### 시나리오 1: 환불 요청 처리

```javascript
// 1. 고객 환불 요청 (주문 ID 123)
// 2. 상세 조회
const order = await findByIdWithDetails(123);

// 3. 주문 내역 확인
console.log(`주문자: ${order.member.member_name}`);
console.log(`주문 금액: ${order.order_total_amount}원`);
console.log(`결제 상태: ${order.payment.payment_status}`);
console.log(`주문 상태: ${order.order_status}`);

// 4. 주문 상품 확인
order.order_items.forEach(item => {
  console.log(`- ${item.product.product_name} x ${item.order_item_quantity}`);
});

// 5. 환불 승인
await refundOrder(123, {
  refund_reason: "상품 불량으로 인한 환불 요청"
});

// 6. 통지 발송 (Service 레이어)
```

---

### 시나리오 2: 배송 상태 일괄 변경

```javascript
// 1. 준비 중 주문 조회
const preparing = await findAll({ orderStatus: 'preparing' });

console.log(`준비 중인 주문: ${preparing.total}건`);

// 2. 배송 처리
for (const order of preparing.orders) {
  await updateStatus(order.order_id, 'shipped');
  console.log(`주문 ${order.order_id} 배송 시작`);
  // 배송 추적 번호 등록 (Service 레이어)
}
```

---

### 시나리오 3: 회원별 주문 분석

```javascript
// 1. 회원 123의 주문 조회
const memberOrders = await getOrdersByMember(123);

// 2. 총 주문 금액 계산
const totalSpent = memberOrders.orders.reduce((sum, order) => {
  return sum + Number(order.order_total_amount);
}, 0);

console.log(`${memberOrders.orders[0].member.member_name}님`);
console.log(`총 주문: ${memberOrders.total}건`);
console.log(`총 결제: ${totalSpent.toLocaleString()}원`);

// 3. 환불 이력 확인
const refunds = memberOrders.orders.filter(o => o.order_status === 'refunded');
console.log(`환불: ${refunds.length}건`);
```

---

### 시나리오 4: 통계 대시보드

```javascript
const stats = await getStatistics();

console.log(`
  === 주문 통계 ===
  전체 주문: ${stats.totalOrders}건
  총 매출: ${stats.totalRevenue.toLocaleString()}원
  평균 주문 금액: ${stats.averageOrderAmount.toLocaleString()}원

  === 상태별 분포 ===
  대기: ${stats.ordersByStatus.pending}건
  준비 중: ${stats.ordersByStatus.preparing}건
  배송 중: ${stats.ordersByStatus.shipped}건
  완료: ${stats.ordersByStatus.delivered}건
  취소: ${stats.ordersByStatus.cancelled}건
  환불: ${stats.ordersByStatus.refunded}건

  최근 7일 주문: ${stats.recentOrders}건
`);

// 최근 주문 확인
const recent = await getRecentOrders(7, 5);
console.log('\n=== 최근 주문 5건 ===');
recent.forEach(order => {
  console.log(`${order.order_id}: ${order.member.member_name} - ${order.order_total_amount}원`);
});
```

---

## ⚠️ 주의사항

### 1. Order-Payment 1:1 관계
```javascript
// ✅ Payment는 order_id로 조회
await prisma.payment.findUnique({
  where: { order_id: BigInt(orderId) }
});

// ✅ Order에서 Payment 필터링
where: {
  payment: {
    payment_status: 'completed'
  }
}
```

### 2. OrderItem을 통한 판매사 필터링
```javascript
// ✅ some 사용 (최소 하나라도 만족)
where: {
  order_items: {
    some: {
      product: {
        tenant_member: {
          tenant_id: BigInt(tenantId)
        }
      }
    }
  }
}

// ❌ every 사용하면 모든 상품이 해당 판매사여야 함
```

### 3. 트랜잭션 필수
환불, 취소 등 상태 변경 시:
```javascript
// ✅ 트랜잭션
await prisma.$transaction(async (tx) => {
  await tx.order.update({ ... });
  await tx.payment.update({ ... });
});

// ❌ 개별 쿼리 (데이터 불일치 위험)
await prisma.order.update({ ... });
await prisma.payment.update({ ... });
```

### 4. aggregate 결과 처리
```javascript
const result = await prisma.payment.aggregate({
  _sum: { payment_amount: true }
});

// null 체크 필수
const total = result._sum.payment_amount || 0;
```

### 5. RESTRICT 정책
- order, payment는 CASCADE 삭제 안 됨
- 거래 기록 보존 (법적 요구사항)
- 삭제 대신 상태 변경 사용

---

## 🧪 테스트 시나리오

### 1. 목록 조회
```javascript
const all = await findAll({ page: 1, limit: 20 });
```

### 2. 상태 필터링
```javascript
const delivered = await findAll({ orderStatus: 'delivered' });
const pending = await findAll({ orderStatus: 'pending' });
```

### 3. 기간 필터링
```javascript
const recent = await findAll({
  startDate: '2025-10-01',
  endDate: '2025-10-07'
});
```

### 4. 회원별 조회
```javascript
const memberOrders = await getOrdersByMember(123);
```

### 5. 판매사별 조회
```javascript
const tenantOrders = await getOrdersByTenant(10);
```

### 6. 상태 변경
```javascript
await updateStatus(1, 'shipped');
```

### 7. 환불 처리
```javascript
await refundOrder(1, { refund_reason: "상품 불량" });
```

### 8. 통계
```javascript
const stats = await getStatistics();
```

---

## 📝 다음 단계

✅ **Step 5 완료**

**다음**: Step 6 - AdminDashboard Repository 생성
- 대시보드 전체 통계
- 일별/월별 매출 추이
- 실시간 데이터

---

**작성일**: 2025년 10월 7일
**상태**: ✅ 완료
