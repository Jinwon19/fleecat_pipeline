# Step 6: AdminDashboard Repository 생성

> **작성일**: 2025년 10월 7일
> **상태**: ✅ 완료
> **파일**: `src/repositories/admin/adminDashboard.repository.js`

---

## 📚 개념 설명

### 🎯 왜 필요한가?

관리자 대시보드는 플랫폼의 **전체 현황을 한눈에 파악**하는 핵심 화면입니다:

- **핵심 지표 (KPI) 표시** (총 회원, 판매사, 상품, 주문, 매출)
- **시계열 데이터** (일별/월별 매출 추이)
- **Top 순위** (인기 상품, 매출 많은 판매사)
- **실시간 알림** (승인 대기, 준비 중 주문, 결제 실패)
- **최근 활동** (신규 가입, 최근 주문)

### 💡 개별 통계 vs 대시보드 통합

**개별 Repository 통계:**
```javascript
// adminMember.repository.js
getStatistics() → { totalMembers, activeMembers, roleDistribution, ... }

// adminOrder.repository.js
getStatistics() → { totalOrders, totalRevenue, ordersByStatus, ... }
```

**대시보드 통합:**
```javascript
// adminDashboard.repository.js
getOverview() → {
  members: { total, active, today },
  tenants: { total, pending, approved },
  products: { total, active },
  orders: { total, today },
  revenue: { total, today },
  alerts: { pendingTenants, preparingOrders }
}
```

**차이점:**
- 개별: 특정 도메인의 **상세** 통계
- 대시보드: 모든 도메인의 **핵심 지표만** 요약

---

## 🔑 핵심 개념

### 1. 전체 현황 요약 (getOverview)

**병렬 쿼리로 성능 최적화:**
```javascript
const [
  totalMembers,
  activeMembers,
  todayMembers,
  totalTenants,
  // ... (15개 쿼리)
] = await Promise.all([
  prisma.member.count(),
  prisma.member.count({ where: { member_status: 'active' } }),
  prisma.member.count({ where: { member_created_at: { gte: today } } }),
  prisma.tenant.count(),
  // ...
]);

// 순차 실행: 100ms × 15 = 1500ms
// 병렬 실행: max(100ms) = 100ms
// 15배 빠름!
```

**오늘 00:00:00 계산:**
```javascript
const today = new Date();
today.setHours(0, 0, 0, 0);
// 2025-10-07T00:00:00.000Z

// 오늘 가입 회원
where: {
  member_created_at: { gte: today }
}
```

---

### 2. 시계열 데이터 - Raw Query 사용

**Prisma의 한계:**
- 날짜 함수 (DATE, DATE_TRUNC) 미지원
- groupBy로 날짜별 집계 어려움

**해결책 - Raw Query:**
```javascript
// 일별 매출
const result = await prisma.$queryRaw`
  SELECT
    DATE(payment_approved_at) as date,
    SUM(payment_amount) as revenue,
    COUNT(*) as order_count
  FROM payment
  WHERE payment_status = 'completed'
    AND payment_approved_at >= ${startDate}
  GROUP BY DATE(payment_approved_at)
  ORDER BY date ASC
`;

// 결과:
[
  { date: '2025-10-01', revenue: 5000000, order_count: 100 },
  { date: '2025-10-02', revenue: 3000000, order_count: 60 },
  ...
]
```

**월별 매출:**
```javascript
// MySQL DATE_FORMAT 사용
SELECT
  DATE_FORMAT(payment_approved_at, '%Y-%m-01') as month,
  SUM(payment_amount) as revenue,
  COUNT(*) as order_count
FROM payment
WHERE payment_status = 'completed'
  AND payment_approved_at >= ${startDate}
GROUP BY DATE_FORMAT(payment_approved_at, '%Y-%m-01')
ORDER BY month ASC
```

---

### 3. Top 순위 조회

**인기 상품 Top 10:**
```javascript
// 1. OrderItem 집계
const topProductStats = await prisma.orderItem.groupBy({
  by: ['product_id'],
  _sum: { order_item_quantity: true },      // 총 판매 수량
  _count: { order_item_id: true },          // 주문 횟수
  orderBy: { _sum: { order_item_quantity: 'desc' } },
  take: 10
});

// 2. Product 정보 조회
const productIds = topProductStats.map(p => p.product_id);
const products = await prisma.product.findMany({
  where: { product_id: { in: productIds } },
  include: { tenant_member: { include: { tenant: true } } }
});

// 3. 병합
return topProductStats.map(stat => {
  const product = products.find(p => p.product_id === stat.product_id);
  return {
    product,
    totalQuantity: stat._sum.order_item_quantity,
    orderCount: stat._count.order_item_id
  };
});
```

**매출 많은 판매사 Top 10:**
```javascript
// Raw Query로 JOIN 집계
SELECT
  t.tenant_id,
  t.tenant_name,
  SUM(p.payment_amount) as total_revenue,
  COUNT(DISTINCT o.order_id) as order_count
FROM tenant t
INNER JOIN tenant_member tm ON t.tenant_id = tm.tenant_id
INNER JOIN product pr ON tm.tenant_member_id = pr.tenant_member_id
INNER JOIN order_item oi ON pr.product_id = oi.product_id
INNER JOIN `order` o ON oi.order_id = o.order_id
INNER JOIN payment p ON o.order_id = p.order_id
WHERE p.payment_status = 'completed'
GROUP BY t.tenant_id, t.tenant_name
ORDER BY total_revenue DESC
LIMIT 10
```

---

### 4. 실시간 알림/알람

**즉시 처리 필요한 항목:**
```javascript
{
  // ⚠️ 승인 대기 중인 판매사 (즉시 검토 필요)
  pendingTenants: await prisma.tenant.count({
    where: { tenant_status: 'pending' }
  }),

  // ⚠️ 준비 중인 주문 (배송 처리 필요)
  preparingOrders: await prisma.order.count({
    where: { order_status: 'preparing' }
  }),

  // ⚠️ 결제 실패 주문 (고객 확인 필요)
  failedPayments: await prisma.payment.count({
    where: { payment_status: 'failed' }
  }),

  // ⚠️ 재고 부족 상품 (발주 필요)
  lowStockProducts: await prisma.product.count({
    where: {
      product_stock_quantity: { lt: 10 },
      product_status: 'active'
    }
  })
}
```

---

### 5. 최근 활동

**최근 가입 회원 + 최근 주문:**
```javascript
const [recentMembers, recentOrders] = await Promise.all([
  prisma.member.findMany({
    take: 10,
    orderBy: { member_created_at: 'desc' },
    select: { member_id: true, member_name: true, ... }
  }),

  prisma.order.findMany({
    take: 10,
    orderBy: { order_created_at: 'desc' },
    include: { member: true, payment: true }
  })
]);
```

---

### 6. Raw Query 사용 시 주의사항

**SQL Injection 방지:**
```javascript
// ❌ 위험 - 직접 문자열 삽입
const keyword = userInput;
await prisma.$queryRaw`SELECT * WHERE name = ${keyword}`;

// ✅ 안전 - Prisma가 자동 이스케이프
await prisma.$queryRaw`SELECT * WHERE name = ${keyword}`;
// Prisma는 자동으로 파라미터 바인딩 처리
```

**타입 변환:**
```javascript
const result = await prisma.$queryRaw`SELECT SUM(amount) as total ...`;

// result[0].total은 BigInt일 수 있음
const total = Number(result[0].total);  // Number로 변환
```

**MySQL 예약어 이스케이프:**
```javascript
// 'order'는 MySQL 예약어
FROM `order` o  // ✅ 백틱 사용
FROM order o    // ❌ 에러 발생
```

---

### 7. 성능 최적화

**병렬 쿼리:**
```javascript
// ✅ 병렬 실행
const [data1, data2, data3] = await Promise.all([
  query1(),
  query2(),
  query3()
]);

// ❌ 순차 실행 (느림)
const data1 = await query1();
const data2 = await query2();
const data3 = await query3();
```

**필요한 필드만 select:**
```javascript
// ✅ 필요한 필드만
select: {
  member_id: true,
  member_name: true,
  member_email: true
}

// ❌ 전체 필드 (불필요한 데이터 전송)
// select 없이 조회
```

---

### 8. 캐싱 전략 (추후 고려)

**현재:**
- 매 요청마다 DB 조회
- 대시보드 로딩 시 다수의 쿼리 실행

**추후 개선안 (Redis):**
```javascript
async function getOverview() {
  // 1. 캐시 확인
  const cached = await redis.get('dashboard:overview');
  if (cached) return JSON.parse(cached);

  // 2. DB 조회
  const data = await calculateOverview();

  // 3. 캐시 저장 (1분 TTL)
  await redis.set('dashboard:overview', JSON.stringify(data), 'EX', 60);

  return data;
}
```

---

## 📦 구현 내용

### 파일 위치
```
src/repositories/admin/adminDashboard.repository.js
```

### 주요 함수 (7개)

#### 1. getOverview()
전체 현황 요약 (핵심 지표)

**반환값:**
```javascript
{
  members: {
    total: 10000,        // 전체 회원
    active: 9500,        // 활성 회원
    today: 50            // 오늘 가입
  },
  tenants: {
    total: 500,          // 전체 판매사
    pending: 15,         // 승인 대기
    approved: 450        // 승인됨
  },
  products: {
    total: 5000,         // 전체 상품
    active: 4500         // 활성 상품
  },
  orders: {
    total: 20000,        // 전체 주문
    today: 100           // 오늘 주문
  },
  revenue: {
    total: 1000000000,   // 총 매출 (10억)
    today: 5000000       // 오늘 매출 (500만)
  },
  alerts: {
    pendingTenants: 15,      // ⚠️ 승인 대기 판매사
    preparingOrders: 50      // ⚠️ 준비 중 주문
  }
}
```

**예시:**
```javascript
const overview = await getOverview();

console.log(`총 회원: ${overview.members.total}명`);
console.log(`오늘 가입: ${overview.members.today}명`);
console.log(`총 매출: ${overview.revenue.total.toLocaleString()}원`);
console.log(`⚠️ 승인 대기 판매사: ${overview.alerts.pendingTenants}개`);
```

---

#### 2. getDailyRevenue(days)
일별 매출 추이

**파라미터:**
- `days` (number, 선택): 조회 기간 (기본 30일)

**반환값:**
```javascript
[
  { date: '2025-10-01', revenue: 5000000, orderCount: 100 },
  { date: '2025-10-02', revenue: 3000000, orderCount: 60 },
  { date: '2025-10-03', revenue: 7000000, orderCount: 140 },
  ...
]
```

**예시:**
```javascript
// 최근 30일 매출
const daily30 = await getDailyRevenue(30);

// 최근 7일 매출
const daily7 = await getDailyRevenue(7);

// 차트 표시
daily30.forEach(data => {
  console.log(`${data.date}: ${data.revenue.toLocaleString()}원 (${data.orderCount}건)`);
});
```

---

#### 3. getMonthlyRevenue(months)
월별 매출 추이

**파라미터:**
- `months` (number, 선택): 조회 기간 (기본 12개월)

**반환값:**
```javascript
[
  { month: '2024-11-01', revenue: 50000000, orderCount: 1000 },
  { month: '2024-12-01', revenue: 60000000, orderCount: 1200 },
  { month: '2025-01-01', revenue: 70000000, orderCount: 1400 },
  ...
]
```

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
```

---

#### 4. getTopProducts(limit)
인기 상품 Top N

**파라미터:**
- `limit` (number, 선택): 조회 개수 (기본 10)

**반환값:**
```javascript
[
  {
    product: {
      product_id: 1n,
      product_name: "수제 도자기 컵",
      product_price: 25000,
      tenant_member: {
        tenant: {
          tenant_id: 10n,
          tenant_name: "홍길동 공방"
        }
      },
      product_images: [...]
    },
    totalQuantity: 1500,    // 총 판매 수량
    orderCount: 300         // 주문 횟수
  },
  ...
]
```

**예시:**
```javascript
// Top 10 인기 상품
const top10 = await getTopProducts(10);

console.log('=== 인기 상품 Top 10 ===');
top10.forEach((item, index) => {
  console.log(`${index + 1}. ${item.product.product_name}`);
  console.log(`   판매량: ${item.totalQuantity}개`);
  console.log(`   주문: ${item.orderCount}건`);
  console.log(`   판매사: ${item.product.tenant_member.tenant.tenant_name}`);
});
```

---

#### 5. getTopTenants(limit)
매출 많은 판매사 Top N

**파라미터:**
- `limit` (number, 선택): 조회 개수 (기본 10)

**반환값:**
```javascript
[
  {
    tenant: {
      tenant_id: 10n,
      tenant_name: "홍길동 공방"
    },
    totalRevenue: 50000000,   // 총 매출
    orderCount: 1000          // 주문 건수
  },
  ...
]
```

**예시:**
```javascript
// Top 10 매출 판매사
const topTenants = await getTopTenants(10);

console.log('=== 매출 Top 10 판매사 ===');
topTenants.forEach((item, index) => {
  console.log(`${index + 1}. ${item.tenant.tenant_name}`);
  console.log(`   매출: ${item.totalRevenue.toLocaleString()}원`);
  console.log(`   주문: ${item.orderCount}건`);
});
```

---

#### 6. getRecentActivities(limit)
최근 활동 (가입, 주문)

**파라미터:**
- `limit` (number, 선택): 각 항목별 조회 개수 (기본 10)

**반환값:**
```javascript
{
  recentMembers: [
    {
      member_id: 123n,
      member_email: "user@example.com",
      member_name: "홍길동",
      member_account_role: "buyer",
      member_created_at: "2025-10-07T10:30:00Z"
    },
    ...
  ],
  recentOrders: [
    {
      order_id: 456n,
      order_total_amount: 50000,
      order_status: "delivered",
      order_created_at: "2025-10-07T09:15:00Z",
      member: {
        member_name: "김철수",
        member_email: "user2@example.com"
      },
      payment: {
        payment_status: "completed",
        payment_method: "card"
      }
    },
    ...
  ]
}
```

**예시:**
```javascript
const activities = await getRecentActivities(5);

console.log('=== 최근 가입 회원 ===');
activities.recentMembers.forEach(member => {
  console.log(`${member.member_name} (${member.member_email})`);
});

console.log('\n=== 최근 주문 ===');
activities.recentOrders.forEach(order => {
  console.log(`주문 #${order.order_id}: ${order.member.member_name} - ${order.order_total_amount}원`);
});
```

---

#### 7. getAlerts()
실시간 알림/알람

**반환값:**
```javascript
{
  pendingTenants: 15,       // ⚠️ 승인 대기 판매사
  preparingOrders: 50,      // ⚠️ 준비 중인 주문
  failedPayments: 3,        // ⚠️ 결제 실패 주문
  lowStockProducts: 20      // ⚠️ 재고 부족 상품 (10개 미만)
}
```

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

## 🔄 동작 흐름 예시

### 시나리오 1: 대시보드 첫 로딩

```javascript
// 1. 전체 현황 조회
const overview = await getOverview();

// 2. 핵심 지표 표시
console.log(`
  === 전체 현황 ===
  회원: ${overview.members.total}명 (오늘 +${overview.members.today})
  판매사: ${overview.tenants.total}개 (승인 대기 ${overview.alerts.pendingTenants})
  상품: ${overview.products.total}개
  주문: ${overview.orders.total}건 (오늘 ${overview.orders.today})
  매출: ${overview.revenue.total.toLocaleString()}원
`);

// 3. 알림 표시
if (overview.alerts.pendingTenants > 0) {
  console.log(`⚠️ 승인 대기 판매사 ${overview.alerts.pendingTenants}개`);
}

// 4. 일별 매출 차트
const daily = await getDailyRevenue(30);
// 차트 라이브러리로 표시

// 5. 최근 활동
const activities = await getRecentActivities(5);
// 최근 가입, 최근 주문 표시
```

---

### 시나리오 2: 매출 분석

```javascript
// 1. 일별 매출 추이
const daily = await getDailyRevenue(30);

// 2. 최고/최저 매출일 찾기
const maxDay = daily.reduce((max, day) =>
  day.revenue > max.revenue ? day : max
);
const minDay = daily.reduce((min, day) =>
  day.revenue < min.revenue ? day : min
);

console.log(`최고 매출: ${maxDay.date} - ${maxDay.revenue.toLocaleString()}원`);
console.log(`최저 매출: ${minDay.date} - ${minDay.revenue.toLocaleString()}원`);

// 3. 평균 매출 계산
const avgRevenue = daily.reduce((sum, day) => sum + day.revenue, 0) / daily.length;
console.log(`평균 매출: ${avgRevenue.toLocaleString()}원/일`);

// 4. 월별 추이
const monthly = await getMonthlyRevenue(12);
// 그래프로 표시
```

---

### 시나리오 3: 인기 상품 및 판매사 분석

```javascript
// 1. 인기 상품 Top 10
const topProducts = await getTopProducts(10);

console.log('=== 베스트셀러 ===');
topProducts.forEach((item, i) => {
  console.log(`${i + 1}. ${item.product.product_name}`);
  console.log(`   ${item.totalQuantity}개 판매 (${item.orderCount}건 주문)`);
});

// 2. 매출 많은 판매사 Top 10
const topTenants = await getTopTenants(10);

console.log('\n=== 우수 판매사 ===');
topTenants.forEach((item, i) => {
  console.log(`${i + 1}. ${item.tenant.tenant_name}`);
  console.log(`   매출: ${item.totalRevenue.toLocaleString()}원`);
});

// 3. 상위 10개 판매사의 매출 비중
const totalTopRevenue = topTenants.reduce((sum, t) => sum + t.totalRevenue, 0);
const overview = await getOverview();
const topShare = (totalTopRevenue / overview.revenue.total * 100).toFixed(1);
console.log(`\n상위 10개 판매사가 전체 매출의 ${topShare}% 차지`);
```

---

### 시나리오 4: 알림 처리

```javascript
// 1. 알림 조회
const alerts = await getAlerts();

// 2. 알림별 처리
if (alerts.pendingTenants > 0) {
  console.log(`\n⚠️ 승인 대기 판매사 ${alerts.pendingTenants}개`);
  // 승인 대기 목록 페이지로 이동 링크 제공
}

if (alerts.preparingOrders > 0) {
  console.log(`\n⚠️ 준비 중인 주문 ${alerts.preparingOrders}건`);
  // 주문 관리 페이지로 이동
}

if (alerts.failedPayments > 0) {
  console.log(`\n⚠️ 결제 실패 ${alerts.failedPayments}건`);
  // 결제 실패 주문 목록 확인
}

if (alerts.lowStockProducts > 0) {
  console.log(`\n⚠️ 재고 부족 상품 ${alerts.lowStockProducts}개`);
  // 재고 관리 필요
}
```

---

## ⚠️ 주의사항

### 1. Raw Query 사용 시
```javascript
// ✅ Prisma $queryRaw (자동 파라미터 바인딩)
const result = await prisma.$queryRaw`
  SELECT * FROM payment WHERE payment_approved_at >= ${startDate}
`;

// ⚠️ 타입 변환 필수
const revenue = Number(result[0].revenue);  // BigInt → Number
```

### 2. MySQL 예약어
```javascript
// ✅ 백틱 사용
FROM `order` o

// ❌ 에러
FROM order o
```

### 3. 날짜 처리
```javascript
// JavaScript Date는 로컬 시간
const today = new Date();  // 브라우저/서버 시간대

// DB는 UTC 저장
// 한국 시간 09:00 = UTC 00:00
```

### 4. NULL 처리
```javascript
// aggregate 결과는 null 가능
const result = await prisma.payment.aggregate({
  _sum: { payment_amount: true }
});

const total = result._sum.payment_amount || 0;  // null 체크
```

### 5. 성능 최적화
```javascript
// ✅ 병렬 실행
const [data1, data2] = await Promise.all([
  query1(),
  query2()
]);

// ❌ 순차 실행 (느림)
const data1 = await query1();
const data2 = await query2();
```

---

## 🧪 테스트 시나리오

### 1. 전체 현황
```javascript
const overview = await getOverview();
console.log(overview);
```

### 2. 일별 매출
```javascript
const daily = await getDailyRevenue(30);
console.log(daily);
```

### 3. 월별 매출
```javascript
const monthly = await getMonthlyRevenue(12);
console.log(monthly);
```

### 4. 인기 상품
```javascript
const topProducts = await getTopProducts(10);
console.log(topProducts);
```

### 5. 우수 판매사
```javascript
const topTenants = await getTopTenants(10);
console.log(topTenants);
```

### 6. 최근 활동
```javascript
const activities = await getRecentActivities(10);
console.log(activities);
```

### 7. 알림
```javascript
const alerts = await getAlerts();
console.log(alerts);
```

---

## 📝 다음 단계

✅ **Step 6 완료**

**Repository Layer 완료!** 이제 Service Layer로 이동합니다.

**다음**: Step 7 - AdminMember Service 생성
- Repository 함수 호출
- 비즈니스 로직 추가
- 에러 핸들링

---

**작성일**: 2025년 10월 7일
**상태**: ✅ 완료
