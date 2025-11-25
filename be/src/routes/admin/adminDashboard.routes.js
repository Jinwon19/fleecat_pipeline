const express = require('express');
const router = express.Router();
const dashboardController = require('../../controllers/admin/adminDashboard.controller');
const { authenticate, authorize } = require('../../middlewares/auth');

/**
 * Admin Dashboard Routes
 * 관리자 대시보드 API 엔드포인트
 *
 * Base Path: /api/admin/dashboard
 * Authentication: Required (JWT)
 * Authorization: Admin only
 */

/**
 * @route   GET /api/admin/dashboard/overview
 * @desc    전체 현황 요약 조회
 * @access  Private (Admin)
 */
router.get('/overview', authenticate, authorize('admin'), dashboardController.getOverview);

/**
 * @route   GET /api/admin/dashboard/revenue/daily
 * @desc    일별 매출 추이 조회
 * @access  Private (Admin)
 * @query   {number} [days=30] - 조회 기간 (일)
 */
router.get('/revenue/daily', authenticate, authorize('admin'), dashboardController.getDailyRevenue);

/**
 * @route   GET /api/admin/dashboard/revenue/monthly
 * @desc    월별 매출 추이 조회
 * @access  Private (Admin)
 * @query   {number} [months=12] - 조회 기간 (월)
 */
router.get('/revenue/monthly', authenticate, authorize('admin'), dashboardController.getMonthlyRevenue);

/**
 * @route   GET /api/admin/dashboard/top-products
 * @desc    인기 상품 Top N 조회
 * @access  Private (Admin)
 * @query   {number} [limit=10] - 조회 개수
 */
router.get('/top-products', authenticate, authorize('admin'), dashboardController.getTopProducts);

/**
 * @route   GET /api/admin/dashboard/top-tenants
 * @desc    매출 많은 판매사 Top N 조회
 * @access  Private (Admin)
 * @query   {number} [limit=10] - 조회 개수
 */
router.get('/top-tenants', authenticate, authorize('admin'), dashboardController.getTopTenants);

/**
 * @route   GET /api/admin/dashboard/recent-activities
 * @desc    최근 활동 조회 (가입, 주문)
 * @access  Private (Admin)
 * @query   {number} [limit=10] - 각 항목별 조회 개수
 */
router.get('/recent-activities', authenticate, authorize('admin'), dashboardController.getRecentActivities);

/**
 * @route   GET /api/admin/dashboard/alerts
 * @desc    실시간 알림/알람 조회
 * @access  Private (Admin)
 */
router.get('/alerts', authenticate, authorize('admin'), dashboardController.getAlerts);

module.exports = router;
