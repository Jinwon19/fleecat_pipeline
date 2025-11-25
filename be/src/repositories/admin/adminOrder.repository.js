const prisma = require('../../config/database');

/**
 * Admin Order Repository
 * 관리자용 주문 관리 데이터 접근 계층
 */

/**
 * 주문 목록 조회 (페이징, 필터링, 검색)
 * @param {Object} options - 조회 옵션
 * @param {number} [options.page=1] - 페이지 번호
 * @param {number} [options.limit=20] - 페이지당 항목 수
 * @param {string} [options.orderStatus] - 주문 상태 필터 (pending/preparing/shipped/delivered/cancelled/refunded)
 * @param {string} [options.paymentStatus] - 결제 상태 필터 (pending/completed/failed/cancelled/refunded)
 * @param {number} [options.memberId] - 회원 ID 필터
 * @param {number} [options.tenantId] - 판매사 ID 필터
 * @param {string} [options.startDate] - 시작 날짜 (YYYY-MM-DD)
 * @param {string} [options.endDate] - 종료 날짜 (YYYY-MM-DD)
 * @param {string} [options.search] - 검색어 (주문자 이름, 이메일)
 * @returns {Promise<Object>} { orders, total, page, totalPages }
 */
async function findAll(options = {}) {
  try {
    const {
      page = 1,
      limit = 20,
      orderStatus,
      paymentStatus,
      memberId,
      tenantId,
      startDate,
      endDate,
      search
    } = options;

    const skip = (page - 1) * limit;
    const where = {};

    // 주문 상태 필터
    if (orderStatus) {
      where.order_status = orderStatus;
    }

    // 결제 상태 필터
    if (paymentStatus) {
      where.payment = {
        payment_status: paymentStatus
      };
    }

    // 회원 필터
    if (memberId) {
      where.member_id = BigInt(memberId);
    }

    // 판매사 필터 - OrderItem 모델이 없어서 현재 미지원
    // TODO: OrderItem 모델 추가 후 구현
    if (tenantId) {
      // 현재는 필터링하지 않음 (OrderItem 테이블 없음)
      console.warn('tenantId 필터는 현재 지원되지 않습니다 (OrderItem 모델 필요)');
    }

    // 기간 필터
    if (startDate && endDate) {
      where.order_created_at = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    // 검색어 (주문자 이름 OR 이메일)
    if (search) {
      where.member = {
        OR: [
          { member_name: { contains: search, mode: 'insensitive' } },
          { member_email: { contains: search, mode: 'insensitive' } }
        ]
      };
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { order_created_at: 'desc' },
        select: {
          order_id: true,
          order_total_amount: true,
          order_status: true,
          order_recipient_address: true,
          order_created_at: true,
          member: {
            select: {
              member_id: true,
              member_name: true,
              member_email: true,
              member_phone: true
            }
          },
          payment: {
            select: {
              payment_id: true,
              payment_amount: true,
              payment_status: true,
              payment_method: true,
              payment_approved_at: true
            }
          }
        }
      }),
      prisma.order.count({ where })
    ]);

    return {
      orders,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  } catch (error) {
    throw new Error(`Failed to find all orders: ${error.message}`);
  }
}

/**
 * 주문 상세 조회 (관리자용 - 모든 정보 포함)
 * @param {number} orderId - 주문 ID
 * @returns {Promise<Object|null>} 주문 정보 또는 null
 */
async function findByIdWithDetails(orderId) {
  try {
    return await prisma.order.findUnique({
      where: { order_id: BigInt(orderId) },
      include: {
        member: {
          select: {
            member_id: true,
            member_email: true,
            member_name: true,
            member_phone: true,
            member_status: true
          }
        },
        payment: true,
        // TODO: order_items 추가 (현재 OrderItem 모델 없음)
        coupon: {
          select: {
            coupon_id: true,
            coupon_name: true,
            coupon_discount_amount: true,
            coupon_discount_rate: true
          }
        }
      }
    });
  } catch (error) {
    throw new Error(`Failed to find order by ID: ${error.message}`);
  }
}

/**
 * 주문 상태 변경
 * @param {number} orderId - 주문 ID
 * @param {string} status - 변경할 상태 (pending/preparing/shipped/delivered/cancelled/refunded)
 * @returns {Promise<Object>} 수정된 주문 정보
 */
async function updateStatus(orderId, status) {
  try {
    return await prisma.order.update({
      where: { order_id: BigInt(orderId) },
      data: { order_status: status },
      select: {
        order_id: true,
        order_status: true,
        order_updated_at: true
      }
    });
  } catch (error) {
    throw new Error(`Failed to update order status: ${error.message}`);
  }
}

/**
 * 주문 환불 처리 (트랜잭션)
 * @param {number} orderId - 주문 ID
 * @param {Object} refundData - 환불 데이터
 * @param {string} [refundData.refund_reason] - 환불 사유
 * @returns {Promise<Object>} 환불 처리된 주문 정보
 */
async function refundOrder(orderId, refundData = {}) {
  try {
    return await prisma.$transaction(async (tx) => {
      // 1. 주문 상태 → refunded
      const order = await tx.order.update({
        where: { order_id: BigInt(orderId) },
        data: { order_status: 'refunded' },
        select: {
          order_id: true,
          order_status: true,
          order_total_amount: true,
          order_updated_at: true
        }
      });

      // 2. 결제 상태 → refunded
      await tx.payment.update({
        where: { order_id: BigInt(orderId) },
        data: {
          payment_status: 'refunded',
          payment_refunded_at: new Date(),
          payment_refund_reason: refundData.refund_reason || null
        }
      });

      return order;
    });
  } catch (error) {
    throw new Error(`Failed to refund order: ${error.message}`);
  }
}

/**
 * 주문 통계 조회
 * @returns {Promise<Object>} 통계 정보
 */
async function getStatistics() {
  try {
    const [
      totalOrders,
      totalRevenue,
      averageOrderAmount,
      pendingOrders,
      preparingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      refundedOrders,
      recentOrders
    ] = await Promise.all([
      // 전체 주문 수
      prisma.order.count(),

      // 총 매출액 (완료된 결제만)
      prisma.payment.aggregate({
        where: { payment_status: 'completed' },
        _sum: { payment_amount: true }
      }),

      // 평균 주문 금액
      prisma.payment.aggregate({
        where: { payment_status: 'completed' },
        _avg: { payment_amount: true }
      }),

      // 상태별 주문 수
      prisma.order.count({ where: { order_status: 'pending' } }),
      prisma.order.count({ where: { order_status: 'preparing' } }),
      prisma.order.count({ where: { order_status: 'shipped' } }),
      prisma.order.count({ where: { order_status: 'delivered' } }),
      prisma.order.count({ where: { order_status: 'cancelled' } }),
      prisma.order.count({ where: { order_status: 'refunded' } }),

      // 최근 주문 (7일 이내)
      prisma.order.count({
        where: {
          order_created_at: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    return {
      totalOrders,
      totalRevenue: totalRevenue._sum.payment_amount || 0,
      averageOrderAmount: Math.round(averageOrderAmount._avg.payment_amount || 0),
      ordersByStatus: {
        pending: pendingOrders,
        preparing: preparingOrders,
        shipped: shippedOrders,
        delivered: deliveredOrders,
        cancelled: cancelledOrders,
        refunded: refundedOrders
      },
      recentOrders
    };
  } catch (error) {
    throw new Error(`Failed to get order statistics: ${error.message}`);
  }
}

/**
 * 회원별 주문 조회
 * @param {number} memberId - 회원 ID
 * @param {Object} options - 조회 옵션
 * @param {number} [options.page=1] - 페이지 번호
 * @param {number} [options.limit=20] - 페이지당 항목 수
 * @returns {Promise<Object>} { orders, total, page, totalPages }
 */
async function getOrdersByMember(memberId, options = {}) {
  return findAll({
    ...options,
    memberId
  });
}

/**
 * 판매사별 주문 조회
 * @param {number} tenantId - 판매사 ID
 * @param {Object} options - 조회 옵션
 * @param {number} [options.page=1] - 페이지 번호
 * @param {number} [options.limit=20] - 페이지당 항목 수
 * @returns {Promise<Object>} { orders, total, page, totalPages }
 */
async function getOrdersByTenant(tenantId, options = {}) {
  return findAll({
    ...options,
    tenantId
  });
}

/**
 * 최근 주문 조회
 * @param {number} [days=7] - 조회 기간 (일)
 * @param {number} [limit=10] - 결과 개수 제한
 * @returns {Promise<Array>} 최근 주문 목록
 */
async function getRecentOrders(days = 7, limit = 10) {
  try {
    return await prisma.order.findMany({
      where: {
        order_created_at: {
          gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        }
      },
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
    });
  } catch (error) {
    throw new Error(`Failed to get recent orders: ${error.message}`);
  }
}

module.exports = {
  findAll,
  findByIdWithDetails,
  updateStatus,
  refundOrder,
  getStatistics,
  getOrdersByMember,
  getOrdersByTenant,
  getRecentOrders
};
