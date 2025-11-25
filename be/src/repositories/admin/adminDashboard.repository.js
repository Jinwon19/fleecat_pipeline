const prisma = require('../../config/database');

/**
 * Admin Dashboard Repository
 * 관리자 대시보드 통합 통계 데이터 접근 계층
 */

/**
 * 전체 현황 요약 (핵심 지표)
 * @returns {Promise<Object>} 대시보드 전체 현황
 */
async function getOverview() {
  try {
    const [
      // 회원 통계
      totalMembers,
      activeMembers,
      todayMembers,

      // 판매사 통계
      totalTenants,
      pendingTenants,
      approvedTenants,

      // 상품 통계
      totalProducts,
      activeProducts,

      // 주문 통계
      totalOrders,
      todayOrders,
      totalRevenue,
      todayRevenue,

      // 알림
      preparingOrders
    ] = await Promise.all([
      // 회원
      prisma.member.count(),
      prisma.member.count({ where: { member_status: 'active' } }),
      prisma.member.count({
        where: {
          member_created_at: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),

      // 판매사
      prisma.tenant.count(),
      prisma.tenant.count({ where: { tenant_status: 'pending' } }),
      prisma.tenant.count({ where: { tenant_status: 'approved' } }),

      // 상품
      prisma.product.count(),
      prisma.product.count({ where: { product_status: 'active' } }),

      // 주문
      prisma.order.count(),
      prisma.order.count({
        where: {
          order_created_at: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),

      // 매출
      prisma.payment.aggregate({
        where: { payment_status: 'completed' },
        _sum: { payment_amount: true }
      }),
      prisma.payment.aggregate({
        where: {
          payment_status: 'completed',
          payment_approved_at: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        },
        _sum: { payment_amount: true }
      }),

      // 알림
      prisma.order.count({ where: { order_status: 'preparing' } })
    ]);

    return {
      members: {
        total: totalMembers,
        active: activeMembers,
        today: todayMembers
      },
      tenants: {
        total: totalTenants,
        pending: pendingTenants,
        approved: approvedTenants
      },
      products: {
        total: totalProducts,
        active: activeProducts
      },
      orders: {
        total: totalOrders,
        today: todayOrders
      },
      revenue: {
        total: totalRevenue._sum.payment_amount || 0,
        today: todayRevenue._sum.payment_amount || 0
      },
      alerts: {
        pendingTenants,
        preparingOrders
      }
    };
  } catch (error) {
    throw new Error(`Failed to get dashboard overview: ${error.message}`);
  }
}

/**
 * 일별 매출 추이
 * @param {number} [days=30] - 조회 기간 (일)
 * @returns {Promise<Array>} 일별 매출 데이터
 */
async function getDailyRevenue(days = 30) {
  try {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

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

    return result.map(row => ({
      date: row.date,
      revenue: Number(row.revenue),
      orderCount: Number(row.order_count)
    }));
  } catch (error) {
    throw new Error(`Failed to get daily revenue: ${error.message}`);
  }
}

/**
 * 월별 매출 추이
 * @param {number} [months=12] - 조회 기간 (월)
 * @returns {Promise<Array>} 월별 매출 데이터
 */
async function getMonthlyRevenue(months = 12) {
  try {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const result = await prisma.$queryRaw`
      SELECT
        DATE_FORMAT(payment_approved_at, '%Y-%m-01') as month,
        SUM(payment_amount) as revenue,
        COUNT(*) as order_count
      FROM payment
      WHERE payment_status = 'completed'
        AND payment_approved_at >= ${startDate}
      GROUP BY DATE_FORMAT(payment_approved_at, '%Y-%m-01')
      ORDER BY month ASC
    `;

    return result.map(row => ({
      month: row.month,
      revenue: Number(row.revenue),
      orderCount: Number(row.order_count)
    }));
  } catch (error) {
    throw new Error(`Failed to get monthly revenue: ${error.message}`);
  }
}

/**
 * 인기 상품 Top N
 * @param {number} [limit=10] - 조회 개수
 * @returns {Promise<Array>} 인기 상품 목록
 */
async function getTopProducts(limit = 10) {
  try {
    // OrderItem 기준으로 Product 집계
    const topProductStats = await prisma.orderItem.groupBy({
      by: ['product_id'],
      _sum: { order_item_quantity: true },
      _count: { order_item_id: true },
      orderBy: { _sum: { order_item_quantity: 'desc' } },
      take: limit
    });

    // Product 정보 가져오기
    const productIds = topProductStats.map(p => p.product_id);
    const products = await prisma.product.findMany({
      where: { product_id: { in: productIds } },
      include: {
        tenant_member: {
          include: {
            tenant: {
              select: {
                tenant_id: true,
                tenant_name: true
              }
            }
          }
        },
        product_images: {
          take: 1,
          orderBy: { product_img_is_primary: 'desc' }
        }
      }
    });

    // 병합 및 정렬 유지
    return topProductStats.map(stat => {
      const product = products.find(p => p.product_id === stat.product_id);
      return {
        product,
        totalQuantity: stat._sum.order_item_quantity,
        orderCount: stat._count.order_item_id
      };
    });
  } catch (error) {
    throw new Error(`Failed to get top products: ${error.message}`);
  }
}

/**
 * 매출 많은 판매사 Top N
 * @param {number} [limit=10] - 조회 개수
 * @returns {Promise<Array>} 판매사별 매출 순위
 */
async function getTopTenants(limit = 10) {
  try {
    // Raw Query로 판매사별 매출 집계
    const result = await prisma.$queryRaw`
      SELECT
        t.tenant_id,
        t.tenant_name,
        SUM(p.payment_amount) as total_revenue,
        COUNT(DISTINCT o.order_id) as order_count
      FROM tenant t
      INNER JOIN tenant_member tm ON t.tenant_id = tm.tenant_id
      INNER JOIN product pr ON tm.tenant_member_id = pr.tenant_member_id
      INNER JOIN order_item oi ON pr.product_id = oi.product_id
      INNER JOIN \`order\` o ON oi.order_id = o.order_id
      INNER JOIN payment p ON o.order_id = p.order_id
      WHERE p.payment_status = 'completed'
      GROUP BY t.tenant_id, t.tenant_name
      ORDER BY total_revenue DESC
      LIMIT ${limit}
    `;

    return result.map(row => ({
      tenant: {
        tenant_id: row.tenant_id,
        tenant_name: row.tenant_name
      },
      totalRevenue: Number(row.total_revenue),
      orderCount: Number(row.order_count)
    }));
  } catch (error) {
    throw new Error(`Failed to get top tenants: ${error.message}`);
  }
}

/**
 * 최근 활동 (가입, 주문)
 * @param {number} [limit=10] - 조회 개수
 * @returns {Promise<Object>} 최근 가입 회원 및 최근 주문
 */
async function getRecentActivities(limit = 10) {
  try {
    const [recentMembers, recentOrders] = await Promise.all([
      // 최근 가입 회원
      prisma.member.findMany({
        take: limit,
        orderBy: { member_created_at: 'desc' },
        select: {
          member_id: true,
          member_email: true,
          member_name: true,
          member_account_role: true,
          member_created_at: true
        }
      }),

      // 최근 주문
      prisma.order.findMany({
        take: limit,
        orderBy: { order_created_at: 'desc' },
        select: {
          order_id: true,
          order_total_amount: true,
          order_status: true,
          order_created_at: true,
          member: {
            select: {
              member_name: true,
              member_email: true
            }
          },
          payment: {
            select: {
              payment_status: true,
              payment_method: true
            }
          }
        }
      })
    ]);

    return {
      recentMembers,
      recentOrders
    };
  } catch (error) {
    throw new Error(`Failed to get recent activities: ${error.message}`);
  }
}

/**
 * 실시간 알림/알람
 * @returns {Promise<Object>} 알림 정보
 */
async function getAlerts() {
  try {
    const [
      pendingTenants,
      preparingOrders,
      failedPayments,
      lowStockProducts
    ] = await Promise.all([
      // 승인 대기 중인 판매사
      prisma.tenant.count({
        where: { tenant_status: 'pending' }
      }),

      // 준비 중인 주문
      prisma.order.count({
        where: { order_status: 'preparing' }
      }),

      // 결제 실패 주문
      prisma.payment.count({
        where: { payment_status: 'failed' }
      }),

      // 재고 부족 상품 (10개 미만)
      prisma.product.count({
        where: {
          product_stock_quantity: { lt: 10 },
          product_status: 'active'
        }
      })
    ]);

    return {
      pendingTenants,
      preparingOrders,
      failedPayments,
      lowStockProducts
    };
  } catch (error) {
    throw new Error(`Failed to get alerts: ${error.message}`);
  }
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
