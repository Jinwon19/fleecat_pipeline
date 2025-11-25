const orderService = require('../../services/admin/adminOrder.service');
const { successResponse } = require('../../utils/response');

/**
 * Admin Order Controller
 * 관리자용 주문 관리 컨트롤러
 */

/**
 * 주문 목록 조회 (페이징, 필터링, 검색)
 * GET /api/admin/orders
 * @query {number} [page=1] - 페이지 번호
 * @query {number} [limit=20] - 페이지당 항목 수
 * @query {string} [orderStatus] - 주문 상태 필터
 * @query {string} [paymentStatus] - 결제 상태 필터
 * @query {number} [memberId] - 회원 ID 필터
 * @query {number} [tenantId] - 판매사 ID 필터
 * @query {string} [startDate] - 시작 날짜 (YYYY-MM-DD)
 * @query {string} [endDate] - 종료 날짜 (YYYY-MM-DD)
 * @query {string} [search] - 검색어 (주문자 이름, 이메일)
 */
async function getOrders(req, res, next) {
  try {
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

    const result = await orderService.getOrderList(filters);

    return successResponse(res, result, '주문 목록을 조회했습니다');
  } catch (error) {
    next(error);
  }
}

/**
 * 주문 상세 조회
 * GET /api/admin/orders/:orderId
 * @param {number} orderId - 주문 ID
 */
async function getOrderById(req, res, next) {
  try {
    const orderId = parseInt(req.params.orderId);
    const order = await orderService.getOrderById(orderId);

    return successResponse(res, order, '주문 상세 정보를 조회했습니다');
  } catch (error) {
    next(error);
  }
}

/**
 * 주문 상태 변경
 * PATCH /api/admin/orders/:orderId/status
 * @param {number} orderId - 주문 ID
 * @body {string} status - 변경할 상태
 */
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

/**
 * 주문 환불 처리
 * POST /api/admin/orders/:orderId/refund
 * @param {number} orderId - 주문 ID
 * @body {string} [refund_reason] - 환불 사유
 */
async function refundOrder(req, res, next) {
  try {
    const orderId = parseInt(req.params.orderId);
    const refundData = {
      refund_reason: req.body.refund_reason
    };

    const refundedOrder = await orderService.processRefund(orderId, refundData);

    return successResponse(res, refundedOrder, '주문 환불을 처리했습니다');
  } catch (error) {
    next(error);
  }
}

/**
 * 주문 통계 조회
 * GET /api/admin/orders/statistics
 */
async function getOrderStatistics(req, res, next) {
  try {
    const statistics = await orderService.getOrderStatistics();

    return successResponse(res, statistics, '주문 통계를 조회했습니다');
  } catch (error) {
    next(error);
  }
}

/**
 * 회원별 주문 조회
 * GET /api/admin/orders/member/:memberId
 * @param {number} memberId - 회원 ID
 * @query {number} [page] - 페이지 번호
 * @query {number} [limit] - 페이지당 항목 수
 */
async function getOrdersByMember(req, res, next) {
  try {
    const memberId = parseInt(req.params.memberId);
    const options = {
      page: req.query.page,
      limit: req.query.limit
    };

    const result = await orderService.getOrdersByMember(memberId, options);

    return successResponse(res, result, '회원별 주문 목록을 조회했습니다');
  } catch (error) {
    next(error);
  }
}

/**
 * 판매사별 주문 조회
 * GET /api/admin/orders/tenant/:tenantId
 * @param {number} tenantId - 판매사 ID
 * @query {number} [page] - 페이지 번호
 * @query {number} [limit] - 페이지당 항목 수
 */
async function getOrdersByTenant(req, res, next) {
  try {
    const tenantId = parseInt(req.params.tenantId);
    const options = {
      page: req.query.page,
      limit: req.query.limit
    };

    const result = await orderService.getOrdersByTenant(tenantId, options);

    return successResponse(res, result, '판매사별 주문 목록을 조회했습니다');
  } catch (error) {
    next(error);
  }
}

/**
 * 최근 주문 조회
 * GET /api/admin/orders/recent
 * @query {number} [days=7] - 조회 기간 (일)
 * @query {number} [limit=10] - 결과 개수
 */
async function getRecentOrders(req, res, next) {
  try {
    const days = req.query.days ? parseInt(req.query.days) : 7;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;

    const orders = await orderService.getRecentOrders(days, limit);

    return successResponse(res, orders, '최근 주문 목록을 조회했습니다');
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getOrders,
  getOrderById,
  updateOrderStatus,
  refundOrder,
  getOrderStatistics,
  getOrdersByMember,
  getOrdersByTenant,
  getRecentOrders
};
