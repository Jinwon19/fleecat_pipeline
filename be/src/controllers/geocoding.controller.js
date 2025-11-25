/**
 * Geocoding Controller
 * 주소 → 좌표 변환 API
 */

const geocodingService = require('../services/geocoding.service');
const { successResponse, errorResponse } = require('../utils/response');

class GeocodingController {
  /**
   * POST /api/v1/geocoding
   * 단일 주소 → 좌표 변환
   * Body: { location: "서울특별시 마포구 홍대입구역", marketName: "플리마켓 이름" (선택사항) }
   */
  async geocodeLocation(req, res, next) {
    try {
      const { location, marketName } = req.body;

      if (!location) {
        return errorResponse(res, 'location 필드가 필요합니다', 400);
      }

      const result = await geocodingService.geocode(location, marketName);

      if (!result) {
        return errorResponse(
          res,
          `"${location}"에 대한 좌표를 찾을 수 없습니다. 주소가 정확한지 확인하세요.`,
          404
        );
      }

      return successResponse(res, result, 'Geocoding 성공');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/geocoding/batch
   * 여러 주소 → 좌표 변환 (배치 처리)
   * Body: { locations: ["주소1", "주소2", ...] }
   */
  async geocodeBatch(req, res, next) {
    try {
      const { locations } = req.body;

      if (!locations || !Array.isArray(locations)) {
        return errorResponse(res, 'locations 배열이 필요합니다', 400);
      }

      const results = [];

      for (const location of locations) {
        const result = await geocodingService.geocode(location);
        results.push({
          location,
          coords: result,
          success: result !== null,
        });
      }

      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      return successResponse(
        res,
        {
          total: locations.length,
          success: successCount,
          failed: failCount,
          results,
        },
        `Geocoding 배치 처리 완료 (성공: ${successCount}, 실패: ${failCount})`
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/geocoding/cache
   * Geocoding 캐시 초기화
   */
  async clearCache(req, res, next) {
    try {
      geocodingService.clearCache();
      return successResponse(res, null, 'Geocoding 캐시 초기화 완료');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new GeocodingController();
