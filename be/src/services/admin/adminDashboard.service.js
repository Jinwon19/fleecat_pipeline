const dashboardRepo = require('../../repositories/admin/adminDashboard.repository');
const { ValidationError } = require('../../utils/errors');

/**
 * Admin Dashboard Service
 * 관리자 대시보드 통합 통계 비즈니스 로직
 */

/**
 * BigInt 변환 유틸리티 - Member
 * @param {Object} member - 회원 객체
 * @returns {Object} BigInt가 문자열로 변환된 객체
 */
function convertMemberBigInt(member) {
  if (!member) return null;

  return {
    ...member,
    member_id: member.member_id.toString(),
    company_id: member.company_id?.toString()
  };
}

/**
 * BigInt 변환 유틸리티 - Order
 * @param {Object} order - 주문 객체
 * @returns {Object} BigInt가 문자열로 변환된 객체
 */
function convertOrderBigInt(order) {
  if (!order) return null;

  return {
    ...order,
    order_id: order.order_id.toString(),
    member_id: order.member_id?.toString(),

    // Member 관계
    member: order.member ? {
      ...order.member,
      member_id: order.member.member_id.toString(),
      company_id: order.member.company_id?.toString()
    } : null,

    // Payment 관계
    payment: order.payment ? {
      ...order.payment,
      payment_id: order.payment.payment_id.toString(),
      order_id: order.payment.order_id.toString()
    } : null
  };
}

/**
 * BigInt 변환 유틸리티 - Product (Top Products용)
 * @param {Object} product - 상품 객체
 * @returns {Object} BigInt가 문자열로 변환된 객체
 */
function convertProductBigInt(product) {
  if (!product) return null;

  return {
    ...product,
    product_id: product.product_id.toString(),
    category_id: product.category_id?.toString(),
    tenant_member_id: product.tenant_member_id?.toString(),

    // TenantMember 관계
    tenant_member: product.tenant_member ? {
      ...product.tenant_member,
      tenant_member_id: product.tenant_member.tenant_member_id.toString(),
      tenant_id: product.tenant_member.tenant_id?.toString(),
      member_id: product.tenant_member.member_id?.toString(),

      // Tenant 관계
      tenant: product.tenant_member.tenant ? {
        ...product.tenant_member.tenant,
        tenant_id: product.tenant_member.tenant.tenant_id.toString()
      } : null
    } : null,

    // ProductImages 배열
    product_images: product.product_images?.map(img => ({
      ...img,
      product_img_id: img.product_img_id.toString(),
      product_id: img.product_id.toString()
    }))
  };
}

/**
 * 전체 현황 요약 조회
 * @returns {Promise<Object>} 대시보드 전체 현황 (퍼센티지 포함)
 */
async function getOverview() {
  // 1. Repository 호출
  const overview = await dashboardRepo.getOverview();

  // 2. 비즈니스 로직: BigInt 변환 및 퍼센티지 계산
  const totalMembers = overview.members.total || 1; // 0으로 나누기 방지
  const totalTenants = overview.tenants.total || 1;
  const totalRevenue = Number(overview.revenue.total) || 1;

  const memberActiveRate = (overview.members.active / totalMembers * 100).toFixed(1);
  const tenantPendingRate = (overview.tenants.pending / totalTenants * 100).toFixed(1);
  const tenantApprovedRate = (overview.tenants.approved / totalTenants * 100).toFixed(1);
  const todayRevenueRate = (Number(overview.revenue.today) / totalRevenue * 100).toFixed(2);

  // 3. 반환
  return {
    members: {
      ...overview.members,
      activeRate: parseFloat(memberActiveRate)
    },
    tenants: {
      ...overview.tenants,
      pendingRate: parseFloat(tenantPendingRate),
      approvedRate: parseFloat(tenantApprovedRate)
    },
    products: overview.products,
    orders: overview.orders,
    revenue: {
      total: Number(overview.revenue.total),
      today: Number(overview.revenue.today),
      todayRate: parseFloat(todayRevenueRate)
    },
    alerts: overview.alerts
  };
}

/**
 * 일별 매출 추이 조회
 * @param {number} [days=30] - 조회 기간 (일)
 * @returns {Promise<Array>} 일별 매출 데이터 (평균 주문 금액 포함)
 */
async function getDailyRevenue(days = 30) {
  // 1. days 검증
  if (days < 1 || days > 365) {
    throw new ValidationError('조회 기간은 1~365일 사이여야 합니다');
  }

  // 2. Repository 호출
  const result = await dashboardRepo.getDailyRevenue(days);

  // 3. 비즈니스 로직: 평균 주문 금액 계산
  return result.map(row => ({
    date: row.date,
    revenue: row.revenue,
    orderCount: row.orderCount,
    averageOrder: row.orderCount > 0
      ? Math.round(row.revenue / row.orderCount)
      : 0
  }));
}

/**
 * 월별 매출 추이 조회
 * @param {number} [months=12] - 조회 기간 (월)
 * @returns {Promise<Array>} 월별 매출 데이터 (평균 주문 금액 포함)
 */
async function getMonthlyRevenue(months = 12) {
  // 1. months 검증
  if (months < 1 || months > 24) {
    throw new ValidationError('조회 기간은 1~24개월 사이여야 합니다');
  }

  // 2. Repository 호출
  const result = await dashboardRepo.getMonthlyRevenue(months);

  // 3. 비즈니스 로직: 평균 주문 금액 계산
  return result.map(row => ({
    month: row.month,
    revenue: row.revenue,
    orderCount: row.orderCount,
    averageOrder: row.orderCount > 0
      ? Math.round(row.revenue / row.orderCount)
      : 0
  }));
}

/**
 * 인기 상품 Top N 조회
 * @param {number} [limit=10] - 조회 개수
 * @returns {Promise<Array>} 인기 상품 목록 (순위, 평균 구매 수량 포함)
 */
async function getTopProducts(limit = 10) {
  // 1. limit 검증
  if (limit < 1 || limit > 100) {
    throw new ValidationError('limit은 1~100 사이여야 합니다');
  }

  // 2. Repository 호출
  const result = await dashboardRepo.getTopProducts(limit);

  // 3. 비즈니스 로직: BigInt 변환 + 순위 추가 + 평균 구매 수량
  return result.map((item, index) => ({
    rank: index + 1,
    product: convertProductBigInt(item.product),
    totalQuantity: item.totalQuantity,
    orderCount: item.orderCount,
    averagePurchase: item.orderCount > 0
      ? parseFloat((item.totalQuantity / item.orderCount).toFixed(1))
      : 0
  }));
}

/**
 * 매출 많은 판매사 Top N 조회
 * @param {number} [limit=10] - 조회 개수
 * @returns {Promise<Array>} 판매사별 매출 순위 (순위, 평균 주문 금액 포함)
 */
async function getTopTenants(limit = 10) {
  // 1. limit 검증
  if (limit < 1 || limit > 100) {
    throw new ValidationError('limit은 1~100 사이여야 합니다');
  }

  // 2. Repository 호출
  const result = await dashboardRepo.getTopTenants(limit);

  // 3. 비즈니스 로직: BigInt 변환 + 순위 추가 + 평균 주문 금액
  return result.map((item, index) => ({
    rank: index + 1,
    tenant: {
      tenant_id: item.tenant.tenant_id.toString(),
      tenant_name: item.tenant.tenant_name
    },
    totalRevenue: item.totalRevenue,
    orderCount: item.orderCount,
    averageOrder: item.orderCount > 0
      ? Math.round(item.totalRevenue / item.orderCount)
      : 0
  }));
}

/**
 * 최근 활동 조회 (가입, 주문)
 * @param {number} [limit=10] - 각 항목별 조회 개수
 * @returns {Promise<Object>} 최근 가입 회원 및 최근 주문
 */
async function getRecentActivities(limit = 10) {
  // 1. limit 검증
  if (limit < 1 || limit > 100) {
    throw new ValidationError('limit은 1~100 사이여야 합니다');
  }

  // 2. Repository 호출
  const result = await dashboardRepo.getRecentActivities(limit);

  // 3. 비즈니스 로직: BigInt 변환
  return {
    recentMembers: result.recentMembers.map(convertMemberBigInt),
    recentOrders: result.recentOrders.map(convertOrderBigInt)
  };
}

/**
 * 실시간 알림/알람 조회
 * @returns {Promise<Object>} 알림 정보
 */
async function getAlerts() {
  // Repository 호출 (변환 불필요, 모두 Number)
  return await dashboardRepo.getAlerts();
}

module.exports = {
  getOverview,
  getDailyRevenue,
  getMonthlyRevenue,
  getTopProducts,
  getTopTenants,
  getRecentActivities,
  getAlerts
};
