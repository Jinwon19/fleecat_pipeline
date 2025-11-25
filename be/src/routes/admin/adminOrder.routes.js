const express = require('express');
const router = express.Router();
const orderController = require('../../controllers/admin/adminOrder.controller');
const { authenticate, authorize } = require('../../middlewares/auth');

/**
 * Admin Order Routes
 * 관리자용 주문 관리 API 엔드포인트
 *
 * Base Path: /api/admin/orders
 * Authentication: Required (JWT)
 * Authorization: Admin only
 */

/**
 * @route   GET /api/admin/orders/statistics
 * @desc    주문 통계 조회
 * @access  Private (Admin)
 */
router.get('/statistics', authenticate, authorize('admin'), orderController.getOrderStatistics);

/**
 * @route   GET /api/admin/orders/recent
 * @desc    최근 주문 조회
 * @access  Private (Admin)
 * @query   {number} [days=7] - 조회 기간 (일)
 * @query   {number} [limit=10] - 결과 개수
 */
router.get('/recent', authenticate, authorize('admin'), orderController.getRecentOrders);

/**
 * @route   GET /api/admin/orders/member/:memberId
 * @desc    회원별 주문 조회
 * @access  Private (Admin)
 * @param   {number} memberId - 회원 ID
 * @query   {number} [page] - 페이지 번호
 * @query   {number} [limit] - 페이지당 항목 수
 */
router.get('/member/:memberId', authenticate, authorize('admin'), orderController.getOrdersByMember);

/**
 * @route   GET /api/admin/orders/tenant/:tenantId
 * @desc    판매사별 주문 조회
 * @access  Private (Admin)
 * @param   {number} tenantId - 판매사 ID
 * @query   {number} [page] - 페이지 번호
 * @query   {number} [limit] - 페이지당 항목 수
 */
router.get('/tenant/:tenantId', authenticate, authorize('admin'), orderController.getOrdersByTenant);

/**
 * @route   GET /api/admin/orders/:orderId
 * @desc    주문 상세 조회
 * @access  Private (Admin)
 * @param   {number} orderId - 주문 ID
 */
router.get('/:orderId', authenticate, authorize('admin'), orderController.getOrderById);

/**
 * @route   GET /api/admin/orders
 * @desc    주문 목록 조회 (페이징, 필터링, 검색)
 * @access  Private (Admin)
 * @query   {number} [page=1] - 페이지 번호
 * @query   {number} [limit=20] - 페이지당 항목 수
 * @query   {string} [orderStatus] - 주문 상태 필터
 * @query   {string} [paymentStatus] - 결제 상태 필터
 * @query   {number} [memberId] - 회원 ID 필터
 * @query   {number} [tenantId] - 판매사 ID 필터
 * @query   {string} [startDate] - 시작 날짜 (YYYY-MM-DD)
 * @query   {string} [endDate] - 종료 날짜 (YYYY-MM-DD)
 * @query   {string} [search] - 검색어 (주문자 이름, 이메일)
 */
router.get('/', authenticate, authorize('admin'), orderController.getOrders);

/**
 * @route   PATCH /api/admin/orders/:orderId/status
 * @desc    주문 상태 변경
 * @access  Private (Admin)
 * @param   {number} orderId - 주문 ID
 * @body    {string} status - 변경할 상태
 */
router.patch('/:orderId/status', authenticate, authorize('admin'), orderController.updateOrderStatus);

/**
 * @route   POST /api/admin/orders/:orderId/refund
 * @desc    주문 환불 처리
 * @access  Private (Admin)
 * @param   {number} orderId - 주문 ID
 * @body    {string} [refund_reason] - 환불 사유
 */
router.post('/:orderId/refund', authenticate, authorize('admin'), orderController.refundOrder);

module.exports = router;
