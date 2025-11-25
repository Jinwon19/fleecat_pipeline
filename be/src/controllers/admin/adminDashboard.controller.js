const dashboardService = require('../../services/admin/adminDashboard.service');
const { successResponse } = require('../../utils/response');

/**
 * Admin Dashboard Controller
 * 관리자 대시보드 컨트롤러
 */

/**
 * 전체 현황 요약 조회
 * GET /api/admin/dashboard/overview
 */
async function getOverview(req, res, next) {
  try {
    const overview = await dashboardService.getOverview();

    return successResponse(res, overview, '대시보드 전체 현황을 조회했습니다');
  } catch (error) {
    next(error);
  }
}

/**
 * 일별 매출 추이 조회
 * GET /api/admin/dashboard/revenue/daily
 * @query {number} [days=30] - 조회 기간 (일)
 */
async function getDailyRevenue(req, res, next) {
  try {
    const days = req.query.days ? parseInt(req.query.days) : 30;
    const revenue = await dashboardService.getDailyRevenue(days);

    return successResponse(res, revenue, '일별 매출 추이를 조회했습니다');
  } catch (error) {
    next(error);
  }
}

/**
 * 월별 매출 추이 조회
 * GET /api/admin/dashboard/revenue/monthly
 * @query {number} [months=12] - 조회 기간 (월)
 */
async function getMonthlyRevenue(req, res, next) {
  try {
    const months = req.query.months ? parseInt(req.query.months) : 12;
    const revenue = await dashboardService.getMonthlyRevenue(months);

    return successResponse(res, revenue, '월별 매출 추이를 조회했습니다');
  } catch (error) {
    next(error);
  }
}

/**
 * 인기 상품 Top N 조회
 * GET /api/admin/dashboard/top-products
 * @query {number} [limit=10] - 조회 개수
 */
async function getTopProducts(req, res, next) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const topProducts = await dashboardService.getTopProducts(limit);

    return successResponse(res, topProducts, '인기 상품 Top 목록을 조회했습니다');
  } catch (error) {
    next(error);
  }
}

/**
 * 매출 많은 판매사 Top N 조회
 * GET /api/admin/dashboard/top-tenants
 * @query {number} [limit=10] - 조회 개수
 */
async function getTopTenants(req, res, next) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const topTenants = await dashboardService.getTopTenants(limit);

    return successResponse(res, topTenants, '판매사별 매출 Top 목록을 조회했습니다');
  } catch (error) {
    next(error);
  }
}

/**
 * 최근 활동 조회 (가입, 주문)
 * GET /api/admin/dashboard/recent-activities
 * @query {number} [limit=10] - 각 항목별 조회 개수
 */
async function getRecentActivities(req, res, next) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const activities = await dashboardService.getRecentActivities(limit);

    return successResponse(res, activities, '최근 활동 목록을 조회했습니다');
  } catch (error) {
    next(error);
  }
}

/**
 * 실시간 알림/알람 조회
 * GET /api/admin/dashboard/alerts
 */
async function getAlerts(req, res, next) {
  try {
    const alerts = await dashboardService.getAlerts();

    return successResponse(res, alerts, '실시간 알림을 조회했습니다');
  } catch (error) {
    next(error);
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
