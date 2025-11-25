const orderRepo = require('../../repositories/admin/adminOrder.repository');
const { NotFoundError, ValidationError } = require('../../utils/errors');

/**
 * Admin Order Service
 * 관리자용 주문 관리 비즈니스 로직
 */

// 유효한 주문 상태
const VALID_ORDER_STATUSES = ['pending', 'preparing', 'shipped', 'delivered', 'cancelled', 'refunded'];

// 유효한 결제 상태
const VALID_PAYMENT_STATUSES = ['pending', 'completed', 'failed', 'cancelled', 'refunded'];

/**
 * BigInt 변환 유틸리티 (재귀적 중첩 구조)
 * @param {Object} order - 주문 객체
 * @returns {Object} BigInt가 문자열로 변환된 객체
 */
function convertOrderBigInt(order) {
  if (!order) return null;

  return {
    ...order,
    // 주문 기본 필드
    order_id: order.order_id.toString(),
    member_id: order.member_id.toString(),
    coupon_id: order.coupon_id?.toString(),
    shopping_cart_id: order.shopping_cart_id?.toString(),

    // Member 관계 (1:1)
    member: order.member ? {
      ...order.member,
      member_id: order.member.member_id.toString(),
      company_id: order.member.company_id?.toString()
    } : null,

    // Payment 관계 (1:1)
    payment: order.payment ? {
      ...order.payment,
      payment_id: order.payment.payment_id.toString(),
      order_id: order.payment.order_id.toString()
    } : null,

    // Coupon 관계 (1:1, nullable)
    coupon: order.coupon ? {
      ...order.coupon,
      coupon_id: order.coupon.coupon_id.toString()
    } : null,

    // OrderItems 관계 (1:N)
    order_items: order.order_items?.map(item => ({
      ...item,
      order_item_id: item.order_item_id.toString(),
      order_id: item.order_id.toString(),
      product_id: item.product_id.toString(),

      // Product 관계 (N:1)
      product: item.product ? {
        ...item.product,
        product_id: item.product.product_id.toString(),
        category_id: item.product.category_id?.toString(),
        tenant_member_id: item.product.tenant_member_id?.toString(),

        // Category 관계 (N:1)
        category: item.product.category ? {
          ...item.product.category,
          category_id: item.product.category.category_id.toString(),
          parent_category_id: item.product.category.parent_category_id?.toString()
        } : null,

        // TenantMember 관계 (N:1)
        tenant_member: item.product.tenant_member ? {
          ...item.product.tenant_member,
          tenant_member_id: item.product.tenant_member.tenant_member_id.toString(),
          tenant_id: item.product.tenant_member.tenant_id?.toString(),
          member_id: item.product.tenant_member.member_id?.toString(),

          // Tenant 관계 (N:1)
          tenant: item.product.tenant_member.tenant ? {
            ...item.product.tenant_member.tenant,
            tenant_id: item.product.tenant_member.tenant.tenant_id.toString()
          } : null,

          // Member 관계 (N:1, 판매자 정보)
          member: item.product.tenant_member.member ? {
            ...item.product.tenant_member.member,
            member_id: item.product.tenant_member.member.member_id.toString(),
            company_id: item.product.tenant_member.member.company_id?.toString()
          } : null
        } : null,

        // ProductImages 관계 (1:N)
        product_images: item.product.product_images?.map(img => ({
          ...img,
          product_img_id: img.product_img_id.toString(),
          product_id: img.product_id.toString()
        }))
      } : null
    })),

    // _count 처리 (있는 경우)
    _count: order._count
  };
}

/**
 * 날짜 형식 검증 (YYYY-MM-DD)
 * @param {string} dateString - 날짜 문자열
 * @returns {boolean} 유효 여부
 */
function isValidDate(dateString) {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;

  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

/**
 * 주문 목록 조회 (페이징, 필터링, 검색)
 * @param {Object} filters - 필터 옵션
 * @param {number} [filters.page=1] - 페이지 번호
 * @param {number} [filters.limit=20] - 페이지당 항목 수
 * @param {string} [filters.orderStatus] - 주문 상태 필터
 * @param {string} [filters.paymentStatus] - 결제 상태 필터
 * @param {number} [filters.memberId] - 회원 ID 필터
 * @param {number} [filters.tenantId] - 판매사 ID 필터
 * @param {string} [filters.startDate] - 시작 날짜 (YYYY-MM-DD)
 * @param {string} [filters.endDate] - 종료 날짜 (YYYY-MM-DD)
 * @param {string} [filters.search] - 검색어 (주문자 이름, 이메일)
 * @returns {Promise<Object>} { orders, total, page, totalPages }
 */
async function getOrderList(filters = {}) {
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
  } = filters;

  // 1. 페이지 검증
  if (page < 1) {
    throw new ValidationError('페이지는 1 이상이어야 합니다');
  }

  if (limit < 1 || limit > 100) {
    throw new ValidationError('limit은 1~100 사이여야 합니다');
  }

  // 2. 주문 상태 검증
  if (orderStatus && !VALID_ORDER_STATUSES.includes(orderStatus)) {
    throw new ValidationError(
      `유효하지 않은 주문 상태입니다. 가능한 값: ${VALID_ORDER_STATUSES.join(', ')}`
    );
  }

  // 3. 결제 상태 검증
  if (paymentStatus && !VALID_PAYMENT_STATUSES.includes(paymentStatus)) {
    throw new ValidationError(
      `유효하지 않은 결제 상태입니다. 가능한 값: ${VALID_PAYMENT_STATUSES.join(', ')}`
    );
  }

  // 4. memberId 검증
  if (memberId && memberId < 1) {
    throw new ValidationError('회원 ID는 양수여야 합니다');
  }

  // 5. tenantId 검증
  if (tenantId && tenantId < 1) {
    throw new ValidationError('판매사 ID는 양수여야 합니다');
  }

  // 6. 날짜 검증
  if ((startDate && !endDate) || (!startDate && endDate)) {
    throw new ValidationError('시작 날짜와 종료 날짜를 모두 입력해주세요');
  }

  if (startDate && !isValidDate(startDate)) {
    throw new ValidationError('시작 날짜 형식이 잘못되었습니다 (YYYY-MM-DD)');
  }

  if (endDate && !isValidDate(endDate)) {
    throw new ValidationError('종료 날짜 형식이 잘못되었습니다 (YYYY-MM-DD)');
  }

  // 7. Repository 호출
  const result = await orderRepo.findAll({
    page: parseInt(page),
    limit: parseInt(limit),
    orderStatus,
    paymentStatus,
    memberId: memberId ? parseInt(memberId) : undefined,
    tenantId: tenantId ? parseInt(tenantId) : undefined,
    startDate,
    endDate,
    search
  });

  // 8. BigInt 변환
  return {
    ...result,
    orders: result.orders.map(convertOrderBigInt)
  };
}

/**
 * 주문 상세 조회
 * @param {number} orderId - 주문 ID
 * @returns {Promise<Object>} 주문 상세 정보
 */
async function getOrderById(orderId) {
  // 1. Repository 호출
  const order = await orderRepo.findByIdWithDetails(orderId);

  // 2. 존재 확인
  if (!order) {
    throw new NotFoundError(`주문 ID ${orderId}를 찾을 수 없습니다`);
  }

  // 3. BigInt 변환
  return convertOrderBigInt(order);
}

/**
 * 주문 상태 변경
 * @param {number} orderId - 주문 ID
 * @param {string} status - 변경할 상태
 * @returns {Promise<Object>} 수정된 주문 정보
 */
async function updateOrderStatus(orderId, status) {
  // 1. status 필수 검증
  if (!status) {
    throw new ValidationError('상태를 입력해주세요');
  }

  // 2. status 검증
  if (!VALID_ORDER_STATUSES.includes(status)) {
    throw new ValidationError(
      `유효하지 않은 주문 상태입니다. 가능한 값: ${VALID_ORDER_STATUSES.join(', ')}`
    );
  }

  // 3. 주문 존재 확인
  const order = await orderRepo.findByIdWithDetails(orderId);
  if (!order) {
    throw new NotFoundError(`주문 ID ${orderId}를 찾을 수 없습니다`);
  }

  // 4. 현재 상태와 동일한지 확인
  if (order.order_status === status) {
    throw new ValidationError(`이미 ${status} 상태입니다`);
  }

  // 5. Repository 호출
  const updated = await orderRepo.updateStatus(orderId, status);

  // 6. BigInt 변환
  return {
    ...updated,
    order_id: updated.order_id.toString()
  };
}

/**
 * 주문 환불 처리
 * @param {number} orderId - 주문 ID
 * @param {Object} refundData - 환불 데이터
 * @param {string} [refundData.refund_reason] - 환불 사유
 * @returns {Promise<Object>} 환불 처리된 주문 정보
 */
async function processRefund(orderId, refundData = {}) {
  // 1. 주문 존재 확인 및 상세 조회
  const order = await orderRepo.findByIdWithDetails(orderId);
  if (!order) {
    throw new NotFoundError(`주문 ID ${orderId}를 찾을 수 없습니다`);
  }

  // 2. 비즈니스 규칙: 이미 환불된 주문
  if (order.order_status === 'refunded') {
    throw new ValidationError('이미 환불 처리된 주문입니다');
  }

  // 3. 비즈니스 규칙: 취소된 주문
  if (order.order_status === 'cancelled') {
    throw new ValidationError('취소된 주문은 환불할 수 없습니다');
  }

  // 4. 비즈니스 규칙: 결제 완료된 주문만 환불 가능
  if (!order.payment || order.payment.payment_status !== 'completed') {
    throw new ValidationError('결제가 완료된 주문만 환불 가능합니다');
  }

  // 5. 환불 사유 검증 (선택적, 최대 길이 체크)
  if (refundData.refund_reason && refundData.refund_reason.length > 500) {
    throw new ValidationError('환불 사유는 500자를 초과할 수 없습니다');
  }

  // 6. Repository 호출 (트랜잭션 처리됨)
  const result = await orderRepo.refundOrder(orderId, refundData);

  // 7. BigInt 변환
  return {
    ...result,
    order_id: result.order_id.toString()
  };
}

/**
 * 주문 통계 조회
 * @returns {Promise<Object>} 통계 정보 (퍼센티지 포함)
 */
async function getOrderStatistics() {
  // 1. Repository 호출
  const stats = await orderRepo.getStatistics();

  // 2. 비즈니스 로직: 퍼센티지 계산
  const total = stats.totalOrders || 1; // 0으로 나누기 방지

  const deliveredRate = (stats.ordersByStatus.delivered / total * 100).toFixed(1);
  const cancelledRate = (stats.ordersByStatus.cancelled / total * 100).toFixed(1);
  const refundedRate = (stats.ordersByStatus.refunded / total * 100).toFixed(1);

  // 3. 반환
  return {
    ...stats,
    totalRevenue: Number(stats.totalRevenue), // BigInt를 Number로 변환
    averageOrderAmount: Number(stats.averageOrderAmount),
    deliveredRate: parseFloat(deliveredRate),
    cancelledRate: parseFloat(cancelledRate),
    refundedRate: parseFloat(refundedRate)
  };
}

/**
 * 회원별 주문 조회
 * @param {number} memberId - 회원 ID
 * @param {Object} options - 페이징 옵션
 * @returns {Promise<Object>} 주문 목록
 */
async function getOrdersByMember(memberId, options = {}) {
  // 1. memberId 검증
  if (!memberId || memberId < 1) {
    throw new ValidationError('유효한 회원 ID를 입력해주세요');
  }

  // 2. getOrderList 재사용
  return getOrderList({
    ...options,
    memberId
  });
}

/**
 * 판매사별 주문 조회
 * @param {number} tenantId - 판매사 ID
 * @param {Object} options - 페이징 옵션
 * @returns {Promise<Object>} 주문 목록
 */
async function getOrdersByTenant(tenantId, options = {}) {
  // 1. tenantId 검증
  if (!tenantId || tenantId < 1) {
    throw new ValidationError('유효한 판매사 ID를 입력해주세요');
  }

  // 2. getOrderList 재사용
  return getOrderList({
    ...options,
    tenantId
  });
}

/**
 * 최근 주문 조회
 * @param {number} [days=7] - 조회 기간 (일)
 * @param {number} [limit=10] - 결과 개수
 * @returns {Promise<Array>} 최근 주문 목록
 */
async function getRecentOrders(days = 7, limit = 10) {
  // 1. days 검증
  if (days < 1 || days > 365) {
    throw new ValidationError('조회 기간은 1~365일 사이여야 합니다');
  }

  // 2. limit 검증
  if (limit < 1 || limit > 100) {
    throw new ValidationError('limit은 1~100 사이여야 합니다');
  }

  // 3. Repository 호출
  const orders = await orderRepo.getRecentOrders(days, limit);

  // 4. BigInt 변환
  return orders.map(convertOrderBigInt);
}

module.exports = {
  getOrderList,
  getOrderById,
  updateOrderStatus,
  processRefund,
  getOrderStatistics,
  getOrdersByMember,
  getOrdersByTenant,
  getRecentOrders
};
