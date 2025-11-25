/**
 * FleaMarket Controller
 * HTTP 요청/응답 처리
 */

const fleaMarketService = require('../services/fleaMarket.service');
const { successResponse, errorResponse } = require('../utils/response');

class FleaMarketController {
  /**
   * GET /api/v1/flea-markets
   * 플리마켓 목록 조회
   * Query: ?start_date=2025-01-01&end_date=2025-01-31
   */
  async getFleaMarkets(req, res, next) {
    try {
      const { start_date, end_date } = req.query;

      const markets = await fleaMarketService.getFleaMarkets({
        startDate: start_date,
        endDate: end_date,
      });

      return successResponse(res, markets, '플리마켓 목록 조회 성공');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/flea-markets/visualization
   * 프론트엔드 지도 시각화용 데이터
   * Excel 형식과 동일한 구조로 반환
   */
  async getFleaMarketsForVisualization(req, res, next) {
    try {
      const { start_date, end_date } = req.query;

      const markets = await fleaMarketService.getFleaMarkets({
        startDate: start_date,
        endDate: end_date,
      });

      // Excel 형식으로 변환
      const visualData = fleaMarketService.transformForVisualization(markets);

      return successResponse(res, visualData, '시각화 데이터 조회 성공');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/flea-markets/with-location
   * 위치 정보가 있는 플리마켓만 조회
   */
  async getFleaMarketsWithLocation(req, res, next) {
    try {
      const markets = await fleaMarketService.getFleaMarketsWithLocation();

      return successResponse(res, markets, '위치 정보 플리마켓 조회 성공');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/flea-markets/upcoming
   * 다가오는 플리마켓 조회
   */
  async getUpcomingFleaMarkets(req, res, next) {
    try {
      const limit = parseInt(req.query.limit) || 50;

      const markets = await fleaMarketService.getUpcomingFleaMarkets(limit);

      return successResponse(res, markets, '다가오는 플리마켓 조회 성공');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/flea-markets/:id
   * 플리마켓 상세 조회
   */
  async getFleaMarketById(req, res, next) {
    try {
      const { id } = req.params;

      const market = await fleaMarketService.getFleaMarketById(id);

      return successResponse(res, market, '플리마켓 상세 조회 성공');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new FleaMarketController();
