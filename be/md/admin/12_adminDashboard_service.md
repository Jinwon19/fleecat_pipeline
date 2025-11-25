# Step 12: AdminDashboard Service 생성

> **작성일**: 2025년 10월 9일
> **상태**: ✅ 완료
> **파일**: `src/services/admin/adminDashboard.service.js`

---

## 📚 개념 설명

### 🎯 왜 필요한가?

관리자 대시보드는 플랫폼의 **전체 현황을 한눈에 파악**하는 핵심 화면입니다:

- **핵심 지표 (KPI) 표시** (총 회원, 판매사, 상품, 주문, 매출)
- **시계열 데이터** (일별/월별 매출 추이)
- **Top 순위** (인기 상품, 매출 많은 판매사)
- **실시간 알림** (승인 대기, 준비 중 주문, 결제 실패)
- **최근 활동** (신규 가입, 최근 주문)

### 💡 Repository vs Service

**Repository (adminDashboard.repository.js)**:
- ✅ 이미 구현 완료
- **역할**: 순수한 데이터 접근
- Raw Query 실행, 집계 함수 호출

```javascript
// Repository - 데이터만 가져옴
getOverview()              // 15개 쿼리 병렬 실행, raw 데이터 반환
getDailyRevenue(days)      // SQL 집계, BigInt 반환
getTopProducts(limit)      // groupBy + findMany, 병합
```

**Service (adminDashboard.service.js)**:
- ⭐ **이번 Step에서 구현**
- **역할**: 비즈니스 로직 처리
- BigInt 변환, 퍼센티지 계산, 포맷팅

```javascript
// Service - 비즈니스 로직 추가
getOverview()              // BigInt 변환 + 성장률 계산 + 포맷팅
getDailyRevenue(days)      // days 검증 + Repository 호출 + 차트용 포맷팅
getTopProducts(limit)      // limit 검증 + BigInt 변환 + 순위 추가
```

---

## 🔑 핵심 개념

### 1. 전체 현황 BigInt 변환 및 퍼센티지 계산

**Repository 반환값:**
```javascript
{
  members: {
    total: 10000,
    active: 9500,
    today: 50
  },
  revenue: {
    total: 1000000000n,    // BigInt
    today: 5000000n        // BigInt
  },
  tenants: {
    total: 500,
    pending: 15,
    approved: 450
  }
}
```

**Service 비즈니스 로직:**
```javascript
// 1. 0으로 나누기 방지
const totalMembers = overview.members.total || 1;
const totalTenants = overview.tenants.total || 1;
const totalRevenue = Number(overview.revenue.total) || 1;

// 2. 퍼센티지 계산
const memberActiveRate = (overview.members.active / totalMembers * 100).toFixed(1);
// 9500 / 10000 * 100 = 95.0%

const tenantPendingRate = (overview.tenants.pending / totalTenants * 100).toFixed(1);
// 15 / 500 * 100 = 3.0%

const tenantApprovedRate = (overview.tenants.approved / totalTenants * 100).toFixed(1);
// 450 / 500 * 100 = 90.0%

const todayRevenueRate = (Number(overview.revenue.today) / totalRevenue * 100).toFixed(2);
// 5000000 / 1000000000 * 100 = 0.50%
```

**Service 반환값:**
```javascript
{
  members: {
    total: 10000,
    active: 9500,
    activeRate: 95.0,      // 추가
    today: 50
  },
  revenue: {
    total: 1000000000,     // Number로 변환
    today: 5000000,        // Number로 변환
    todayRate: 0.50        // 추가
  },
  tenants: {
    total: 500,
    pending: 15,
    pendingRate: 3.0,      // 추가
    approved: 450,
    approvedRate: 90.0     // 추가
  },
  products: {
    total: 5000,
    active: 4500
  },
  orders: {
    total: 20000,
    today: 100
  },
  alerts: {
    pendingTenants: 15,
    preparingOrders: 50
  }
}
```

---

### 2. 일별/월별 매출 평균 주문 금액 계산

**Repository 반환값 (Raw Query 결과):**
```javascript
[
  {
    date: '2025-10-01',
    revenue: 5000000,      // Number (Repository에서 이미 변환)
    orderCount: 100        // Number
  },
  {
    date: '2025-10-02',
    revenue: 3000000,
    orderCount: 60
  }
]
```

**Service 비즈니스 로직:**
```javascript
return result.map(row => ({
  date: row.date,
  revenue: row.revenue,
  orderCount: row.orderCount,
  averageOrder: row.orderCount > 0
    ? Math.round(row.revenue / row.orderCount)
    : 0
}));
```

**Service 반환값:**
```javascript
[
  {
    date: '2025-10-01',
    revenue: 5000000,
    orderCount: 100,
    averageOrder: 50000    // 추가: 5000000 / 100
  },
  {
    date: '2025-10-02',
    revenue: 3000000,
    orderCount: 60,
    averageOrder: 50000    // 추가: 3000000 / 60
  }
]
```

---

### 3. 인기 상품 BigInt 변환 및 순위 추가

**Repository 반환값:**
```javascript
[
  {
    product: {
      product_id: 1n,               // BigInt
      product_name: "수제 도자기 컵",
      product_price: 25000,
      tenant_member_id: 5n,         // BigInt
      tenant_member: {
        tenant_member_id: 5n,       // BigInt
        tenant_id: 10n,             // BigInt
        tenant: {
          tenant_id: 10n,           // BigInt
          tenant_name: "홍길동 공방"
        }
      },
      product_images: [
        {
          product_img_id: 20n,      // BigInt
          product_id: 1n            // BigInt
        }
      ]
    },
    totalQuantity: 1500,            // 총 판매 수량
    orderCount: 300                 // 주문 횟수
  }
]
```

**Service 비즈니스 로직:**
```javascript
return result.map((item, index) => ({
  rank: index + 1,                  // 순위 추가
  product: convertProductBigInt(item.product),  // BigInt 변환
  totalQuantity: item.totalQuantity,
  orderCount: item.orderCount,
  averagePurchase: item.orderCount > 0
    ? parseFloat((item.totalQuantity / item.orderCount).toFixed(1))
    : 0                             // 평균 구매 수량 추가
}));
```

**Service 반환값:**
```javascript
[
  {
    rank: 1,                        // 추가
    product: {
      product_id: "1",              // String
      product_name: "수제 도자기 컵",
      product_price: 25000,
      tenant_member_id: "5",        // String
      tenant_member: {
        tenant_member_id: "5",      // String
        tenant_id: "10",            // String
        tenant: {
          tenant_id: "10",          // String
          tenant_name: "홍길동 공방"
        }
      },
      product_images: [
        {
          product_img_id: "20",     // String
          product_id: "1"           // String
        }
      ]
    },
    totalQuantity: 1500,
    orderCount: 300,
    averagePurchase: 5.0            // 추가: 1500 / 300 = 5.0개/주문
  }
]
```

---

### 4. 매출 많은 판매사 BigInt 변환 및 순위 추가

**Repository 반환값 (Raw Query):**
```javascript
[
  {
    tenant: {
      tenant_id: 10n,        // BigInt
      tenant_name: "홍길동 공방"
    },
    totalRevenue: 50000000,  // Number (Repository에서 이미 변환)
    orderCount: 1000         // Number
  }
]
```

**Service 비즈니스 로직:**
```javascript
return result.map((item, index) => ({
  rank: index + 1,                  // 순위 추가
  tenant: {
    tenant_id: item.tenant.tenant_id.toString(),  // BigInt 변환
    tenant_name: item.tenant.tenant_name
  },
  totalRevenue: item.totalRevenue,
  orderCount: item.orderCount,
  averageOrder: item.orderCount > 0
    ? Math.round(item.totalRevenue / item.orderCount)
    : 0                             // 평균 주문 금액 추가
}));
```

**Service 반환값:**
```javascript
[
  {
    rank: 1,                 // 추가
    tenant: {
      tenant_id: "10",       // String
      tenant_name: "홍길동 공방"
    },
    totalRevenue: 50000000,
    orderCount: 1000,
    averageOrder: 50000      // 추가: 50000000 / 1000
  }
]
```

---

### 5. 최근 활동 BigInt 변환

**Repository 반환값:**
```javascript
{
  recentMembers: [
    {
      member_id: 123n,              // BigInt
      company_id: 5n,               // BigInt (nullable)
      member_email: "user@example.com",
      member_name: "홍길동",
      member_account_role: "buyer",
      member_created_at: "2025-10-09T..."
    }
  ],
  recentOrders: [
    {
      order_id: 456n,               // BigInt
      member_id: 123n,              // BigInt (nullable)
      order_total_amount: 50000,
      order_status: "delivered",
      order_created_at: "2025-10-09T...",
      member: {
        member_id: 123n,            // BigInt
        company_id: 5n,             // BigInt (nullable)
        member_name: "김철수",
        member_email: "user2@example.com"
      },
      payment: {
        payment_id: 789n,           // BigInt
        order_id: 456n,             // BigInt
        payment_status: "completed",
        payment_method: "card"
      }
    }
  ]
}
```

**Service 비즈니스 로직:**
```javascript
// Member 변환 함수
function convertMemberBigInt(member) {
  if (!member) return null;
  return {
    ...member,
    member_id: member.member_id.toString(),
    company_id: member.company_id?.toString()
  };
}

// Order 변환 함수
function convertOrderBigInt(order) {
  if (!order) return null;
  return {
    ...order,
    order_id: order.order_id.toString(),
    member_id: order.member_id?.toString(),
    member: order.member ? {
      ...order.member,
      member_id: order.member.member_id.toString(),
      company_id: order.member.company_id?.toString()
    } : null,
    payment: order.payment ? {
      ...order.payment,
      payment_id: order.payment.payment_id.toString(),
      order_id: order.payment.order_id.toString()
    } : null
  };
}

// 변환 적용
return {
  recentMembers: result.recentMembers.map(convertMemberBigInt),
  recentOrders: result.recentOrders.map(convertOrderBigInt)
};
```

**Service 반환값:**
```javascript
{
  recentMembers: [
    {
      member_id: "123",             // String
      company_id: "5",              // String
      member_email: "user@example.com",
      member_name: "홍길동",
      member_account_role: "buyer",
      member_created_at: "2025-10-09T..."
    }
  ],
  recentOrders: [
    {
      order_id: "456",              // String
      member_id: "123",             // String
      order_total_amount: 50000,
      order_status: "delivered",
      order_created_at: "2025-10-09T...",
      member: {
        member_id: "123",           // String
        company_id: "5",            // String
        member_name: "김철수",
        member_email: "user2@example.com"
      },
      payment: {
        payment_id: "789",          // String
        order_id: "456",            // String
        payment_status: "completed",
        payment_method: "card"
      }
    }
  ]
}
```

---

### 6. 파라미터 검증

**일별 매출 검증:**
```javascript
async function getDailyRevenue(days = 30) {
  // days 검증 (1~365)
  if (days < 1 || days > 365) {
    throw new ValidationError('조회 기간은 1~365일 사이여야 합니다');
  }

  // Repository 호출 + 포맷팅
}
```

**월별 매출 검증:**
```javascript
async function getMonthlyRevenue(months = 12) {
  // months 검증 (1~24)
  if (months < 1 || months > 24) {
    throw new ValidationError('조회 기간은 1~24개월 사이여야 합니다');
  }

  // Repository 호출 + 포맷팅
}
```

**Top 순위 검증:**
```javascript
async function getTopProducts(limit = 10) {
  // limit 검증 (1~100)
  if (limit < 1 || limit > 100) {
    throw new ValidationError('limit은 1~100 사이여야 합니다');
  }

  // Repository 호출 + BigInt 변환 + 순위 추가
}
```

**최근 활동 검증:**
```javascript
async function getRecentActivities(limit = 10) {
  // limit 검증 (1~100)
  if (limit < 1 || limit > 100) {
    throw new ValidationError('limit은 1~100 사이여야 합니다');
  }

  // Repository 호출 + BigInt 변환
}
```

---

## 📦 구현 내용

### 파일 위치
```
src/services/admin/adminDashboard.service.js
```

### 유틸리티 함수 (3개)

#### 1. convertMemberBigInt(member)
회원 객체 BigInt 변환

**변환 대상:**
- `member_id`
- `company_id` (nullable)

#### 2. convertOrderBigInt(order)
주문 객체 BigInt 변환 (중첩 구조)

**변환 대상:**
- `order_id`, `member_id`
- `member.member_id`, `member.company_id`
- `payment.payment_id`, `payment.order_id`

#### 3. convertProductBigInt(product)
상품 객체 BigInt 변환 (복잡한 중첩)

**변환 대상:**
- `product_id`, `category_id`, `tenant_member_id`
- `tenant_member.tenant_member_id`, `tenant_id`, `member_id`
- `tenant_member.tenant.tenant_id`
- `product_images[].product_img_id`, `product_id`

---

### 주요 함수 (7개)

#### 1. getOverview()
전체 현황 요약 조회

**반환값:**
```javascript
{
  members: {
    total: 10000,
    active: 9500,
    activeRate: 95.0,      // 추가
    today: 50
  },
  tenants: {
    total: 500,
    pending: 15,
    pendingRate: 3.0,      // 추가
    approved: 450,
    approvedRate: 90.0     // 추가
  },
  products: {
    total: 5000,
    active: 4500
  },
  orders: {
    total: 20000,
    today: 100
  },
  revenue: {
    total: 1000000000,     // Number
    today: 5000000,        // Number
    todayRate: 0.50        // 추가
  },
  alerts: {
    pendingTenants: 15,
    preparingOrders: 50
  }
}
```

**비즈니스 로직:**
1. Repository 호출
2. BigInt → Number 변환
3. 퍼센티지 계산 (회원 활성률, 판매사 승인율, 오늘 매출 비율)
4. 0으로 나누기 방지

**예시:**
```javascript
const overview = await getOverview();

console.log(`총 회원: ${overview.members.total}명`);
console.log(`활성 회원: ${overview.members.active}명 (${overview.members.activeRate}%)`);
console.log(`오늘 가입: ${overview.members.today}명`);
console.log(`총 매출: ${overview.revenue.total.toLocaleString()}원`);
console.log(`오늘 매출: ${overview.revenue.today.toLocaleString()}원 (${overview.revenue.todayRate}%)`);
console.log(`⚠️ 승인 대기 판매사: ${overview.alerts.pendingTenants}개`);
```

---

#### 2. getDailyRevenue(days)
일별 매출 추이 조회

**파라미터:**
- `days` (number, 선택): 조회 기간 (기본 30일, 1~365)

**반환값:**
```javascript
[
  {
    date: '2025-10-01',
    revenue: 5000000,
    orderCount: 100,
    averageOrder: 50000    // 추가
  },
  {
    date: '2025-10-02',
    revenue: 3000000,
    orderCount: 60,
    averageOrder: 50000    // 추가
  }
]
```

**비즈니스 로직:**
1. days 검증 (1~365)
2. Repository 호출
3. 평균 주문 금액 계산

**예시:**
```javascript
// 최근 30일 매출
const daily30 = await getDailyRevenue(30);

// 최근 7일 매출
const daily7 = await getDailyRevenue(7);

// 차트 표시
daily30.forEach(data => {
  console.log(`${data.date}: ${data.revenue.toLocaleString()}원 (${data.orderCount}건)`);
  console.log(`  평균 주문: ${data.averageOrder.toLocaleString()}원`);
});

// ❌ 에러: 범위 초과
await getDailyRevenue(400);  // ValidationError
```

---

#### 3. getMonthlyRevenue(months)
월별 매출 추이 조회

**파라미터:**
- `months` (number, 선택): 조회 기간 (기본 12개월, 1~24)

**반환값:**
```javascript
[
  {
    month: '2024-11-01',
    revenue: 50000000,
    orderCount: 1000,
    averageOrder: 50000    // 추가
  },
  {
    month: '2024-12-01',
    revenue: 60000000,
    orderCount: 1200,
    averageOrder: 50000    // 추가
  }
]
```

**비즈니스 로직:**
1. months 검증 (1~24)
2. Repository 호출
3. 평균 주문 금액 계산

**예시:**
```javascript
// 최근 12개월 매출
const monthly = await getMonthlyRevenue(12);

// 최근 6개월 매출
const monthly6 = await getMonthlyRevenue(6);

// 성장률 계산
const lastMonth = monthly[monthly.length - 2].revenue;
const thisMonth = monthly[monthly.length - 1].revenue;
const growthRate = ((thisMonth - lastMonth) / lastMonth * 100).toFixed(1);
console.log(`전월 대비 ${growthRate}% 성장`);

// ❌ 에러: 범위 초과
await getMonthlyRevenue(25);  // ValidationError
```

---

#### 4. getTopProducts(limit)
인기 상품 Top N 조회

**파라미터:**
- `limit` (number, 선택): 조회 개수 (기본 10, 1~100)

**반환값:**
```javascript
[
  {
    rank: 1,                        // 추가
    product: {
      product_id: "1",              // String
      product_name: "수제 도자기 컵",
      product_price: 25000,
      tenant_member: {
        tenant_member_id: "5",      // String
        tenant: {
          tenant_id: "10",          // String
          tenant_name: "홍길동 공방"
        }
      },
      product_images: [...]
    },
    totalQuantity: 1500,
    orderCount: 300,
    averagePurchase: 5.0            // 추가
  }
]
```

**비즈니스 로직:**
1. limit 검증 (1~100)
2. Repository 호출
3. BigInt 변환
4. 순위 추가 (1부터 시작)
5. 평균 구매 수량 계산

**예시:**
```javascript
// Top 10 인기 상품
const top10 = await getTopProducts(10);

console.log('=== 인기 상품 Top 10 ===');
top10.forEach(item => {
  console.log(`${item.rank}. ${item.product.product_name}`);
  console.log(`   판매량: ${item.totalQuantity}개`);
  console.log(`   주문: ${item.orderCount}건`);
  console.log(`   평균 구매: ${item.averagePurchase}개/주문`);
  console.log(`   판매사: ${item.product.tenant_member.tenant.tenant_name}`);
});

// ❌ 에러: 범위 초과
await getTopProducts(200);  // ValidationError
```

---

#### 5. getTopTenants(limit)
매출 많은 판매사 Top N 조회

**파라미터:**
- `limit` (number, 선택): 조회 개수 (기본 10, 1~100)

**반환값:**
```javascript
[
  {
    rank: 1,                 // 추가
    tenant: {
      tenant_id: "10",       // String
      tenant_name: "홍길동 공방"
    },
    totalRevenue: 50000000,
    orderCount: 1000,
    averageOrder: 50000      // 추가
  }
]
```

**비즈니스 로직:**
1. limit 검증 (1~100)
2. Repository 호출
3. BigInt 변환
4. 순위 추가
5. 평균 주문 금액 계산

**예시:**
```javascript
// Top 10 매출 판매사
const topTenants = await getTopTenants(10);

console.log('=== 매출 Top 10 판매사 ===');
topTenants.forEach(item => {
  console.log(`${item.rank}. ${item.tenant.tenant_name}`);
  console.log(`   매출: ${item.totalRevenue.toLocaleString()}원`);
  console.log(`   주문: ${item.orderCount}건`);
  console.log(`   평균 주문: ${item.averageOrder.toLocaleString()}원`);
});
```

---

#### 6. getRecentActivities(limit)
최근 활동 조회

**파라미터:**
- `limit` (number, 선택): 각 항목별 조회 개수 (기본 10, 1~100)

**반환값:**
```javascript
{
  recentMembers: [
    {
      member_id: "123",             // String
      company_id: "5",              // String
      member_email: "user@example.com",
      member_name: "홍길동",
      member_account_role: "buyer",
      member_created_at: "2025-10-09T..."
    }
  ],
  recentOrders: [
    {
      order_id: "456",              // String
      order_total_amount: 50000,
      order_status: "delivered",
      order_created_at: "2025-10-09T...",
      member: {
        member_id: "123",           // String
        member_name: "김철수",
        member_email: "user2@example.com"
      },
      payment: {
        payment_id: "789",          // String
        payment_status: "completed",
        payment_method: "card"
      }
    }
  ]
}
```

**비즈니스 로직:**
1. limit 검증 (1~100)
2. Repository 호출
3. BigInt 변환 (회원, 주문)

**예시:**
```javascript
const activities = await getRecentActivities(5);

console.log('=== 최근 가입 회원 ===');
activities.recentMembers.forEach(member => {
  console.log(`${member.member_name} (${member.member_email})`);
  console.log(`  역할: ${member.member_account_role}`);
  console.log(`  가입일: ${member.member_created_at}`);
});

console.log('\n=== 최근 주문 ===');
activities.recentOrders.forEach(order => {
  console.log(`주문 #${order.order_id}: ${order.member.member_name}`);
  console.log(`  금액: ${order.order_total_amount.toLocaleString()}원`);
  console.log(`  상태: ${order.order_status}`);
});
```

---

#### 7. getAlerts()
실시간 알림 조회

**반환값:**
```javascript
{
  pendingTenants: 15,       // ⚠️ 승인 대기 판매사
  preparingOrders: 50,      // ⚠️ 준비 중인 주문
  failedPayments: 3,        // ⚠️ 결제 실패 주문
  lowStockProducts: 20      // ⚠️ 재고 부족 상품 (10개 미만)
}
```

**비즈니스 로직:**
- Repository 호출만 (변환 불필요, 모두 Number)

**예시:**
```javascript
const alerts = await getAlerts();

if (alerts.pendingTenants > 0) {
  console.log(`⚠️ 승인 대기 중인 판매사 ${alerts.pendingTenants}개`);
}

if (alerts.preparingOrders > 0) {
  console.log(`⚠️ 준비 중인 주문 ${alerts.preparingOrders}건`);
}

if (alerts.failedPayments > 0) {
  console.log(`⚠️ 결제 실패 ${alerts.failedPayments}건`);
}

if (alerts.lowStockProducts > 0) {
  console.log(`⚠️ 재고 부족 상품 ${alerts.lowStockProducts}개`);
}
```

---

## 🔄 사용 예시

### 예시 1: 대시보드 첫 로딩

```javascript
// Controller
async function getDashboard(req, res, next) {
  try {
    // 1. 전체 현황
    const overview = await dashboardService.getOverview();

    // 2. 일별 매출 (최근 30일)
    const dailyRevenue = await dashboardService.getDailyRevenue(30);

    // 3. 최근 활동
    const activities = await dashboardService.getRecentActivities(5);

    // 4. 알림
    const alerts = await dashboardService.getAlerts();

    res.json({
      success: true,
      data: {
        overview,
        dailyRevenue,
        activities,
        alerts
      }
    });
  } catch (error) {
    next(error);
  }
}
```

**요청 예시:**
```
GET /api/v1/admin/dashboard
```

---

### 예시 2: 매출 분석

```javascript
async function getRevenueAnalysis(req, res, next) {
  try {
    const { period = 'daily', range = 30 } = req.query;

    let revenueData;
    if (period === 'daily') {
      revenueData = await dashboardService.getDailyRevenue(parseInt(range));
    } else if (period === 'monthly') {
      revenueData = await dashboardService.getMonthlyRevenue(parseInt(range));
    }

    res.json({
      success: true,
      data: revenueData
    });
  } catch (error) {
    next(error);
  }
}
```

**요청 예시:**
```
GET /api/v1/admin/dashboard/revenue?period=daily&range=30
GET /api/v1/admin/dashboard/revenue?period=monthly&range=12
```

---

### 예시 3: Top 순위 조회

```javascript
async function getTopRankings(req, res, next) {
  try {
    const { limit = 10 } = req.query;

    const [topProducts, topTenants] = await Promise.all([
      dashboardService.getTopProducts(parseInt(limit)),
      dashboardService.getTopTenants(parseInt(limit))
    ]);

    res.json({
      success: true,
      data: {
        topProducts,
        topTenants
      }
    });
  } catch (error) {
    next(error);
  }
}
```

**요청 예시:**
```
GET /api/v1/admin/dashboard/rankings?limit=10
```

---

### 예시 4: 알림 조회

```javascript
async function getNotifications(req, res, next) {
  try {
    const alerts = await dashboardService.getAlerts();

    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    next(error);
  }
}
```

**요청 예시:**
```
GET /api/v1/admin/dashboard/alerts
```

---

## ⚠️ 주의사항

### 1. BigInt 변환

```javascript
// ✅ Number로 변환
total: Number(overview.revenue.total)

// ❌ BigInt 그대로 반환
total: overview.revenue.total  // JSON 직렬화 에러
```

### 2. 0으로 나누기 방지

```javascript
// ✅ 0일 때 1로 대체
const total = overview.members.total || 1;
const activeRate = (overview.members.active / total * 100).toFixed(1);

// ❌ 0으로 나누기
const activeRate = (overview.members.active / 0 * 100);  // Infinity
```

### 3. nullable 필드 처리

```javascript
// ✅ 옵셔널 체이닝
company_id: member.company_id?.toString()

// ❌ null 체크 없이
company_id: member.company_id.toString()  // TypeError if null
```

### 4. 파라미터 검증

```javascript
// ✅ 범위 검증
if (days < 1 || days > 365) {
  throw new ValidationError('...');
}

// ❌ 검증 없이
const result = await getDailyRevenue(9999);  // 성능 문제
```

### 5. 평균 계산 시 0 체크

```javascript
// ✅ 0으로 나누기 방지
averageOrder: row.orderCount > 0
  ? Math.round(row.revenue / row.orderCount)
  : 0

// ❌ 0 체크 없이
averageOrder: Math.round(row.revenue / row.orderCount)  // NaN if 0
```

---

## 📝 비즈니스 규칙 요약

### 전체 현황
- ✅ BigInt → Number 변환
- ✅ 퍼센티지 소수점 1~2자리
- ✅ 0으로 나누기 방지

### 일별/월별 매출
- ✅ days: 1~365
- ✅ months: 1~24
- ✅ 평균 주문 금액 계산
- ✅ orderCount가 0이면 평균 0

### Top 순위
- ✅ limit: 1~100
- ✅ BigInt 변환
- ✅ 순위 추가 (1부터)
- ✅ 평균 계산 (0으로 나누기 방지)

### 최근 활동
- ✅ limit: 1~100
- ✅ BigInt 변환 (회원, 주문, 결제)

### 알림
- ✅ Repository 호출만
- ✅ 변환 불필요 (모두 Number)

---

## 🧪 테스트 시나리오

### 1. 전체 현황
```javascript
const overview = await getOverview();
console.log(overview);
```

### 2. 일별 매출
```javascript
const daily30 = await getDailyRevenue(30);
const daily7 = await getDailyRevenue(7);
```

### 3. 월별 매출
```javascript
const monthly12 = await getMonthlyRevenue(12);
const monthly6 = await getMonthlyRevenue(6);
```

### 4. 인기 상품
```javascript
const top10 = await getTopProducts(10);
const top20 = await getTopProducts(20);
```

### 5. 우수 판매사
```javascript
const topTenants = await getTopTenants(10);
```

### 6. 최근 활동
```javascript
const activities = await getRecentActivities(5);
```

### 7. 알림
```javascript
const alerts = await getAlerts();
```

### 8. 에러 케이스
```javascript
// ❌ 범위 초과
await getDailyRevenue(400);      // ValidationError
await getMonthlyRevenue(30);     // ValidationError
await getTopProducts(200);       // ValidationError
await getRecentActivities(200);  // ValidationError
```

---

## 📝 다음 단계

✅ **Step 12 완료**

**Service Layer 완료!** 이제 Controller Layer로 이동합니다.

**다음**: Step 13 - Admin Controllers 생성
- AdminOrder Controller
- AdminProduct Controller
- AdminDashboard Controller
- HTTP 요청/응답 처리
- 에러 핸들링

---

**작성일**: 2025년 10월 9일
**상태**: ✅ 완료
