const productService = require('../../services/admin/adminProduct.service');
const { successResponse } = require('../../utils/response');

/**
 * Admin Product Controller
 * 관리자용 상품 관리 컨트롤러
 */

/**
 * 상품 목록 조회 (페이징, 필터링, 검색)
 * GET /api/admin/products
 * @query {number} [page=1] - 페이지 번호
 * @query {number} [limit=20] - 페이지당 항목 수
 * @query {string} [status] - 상품 상태 필터
 * @query {number} [categoryId] - 카테고리 ID 필터
 * @query {number} [tenantId] - 판매사 ID 필터
 * @query {number} [minPrice] - 최소 가격
 * @query {number} [maxPrice] - 최대 가격
 * @query {string} [search] - 검색어 (상품명, 설명)
 */
async function getProducts(req, res, next) {
  try {
    const filters = {
      page: req.query.page,
      limit: req.query.limit,
      status: req.query.status,
      categoryId: req.query.categoryId,
      tenantId: req.query.tenantId,
      minPrice: req.query.minPrice,
      maxPrice: req.query.maxPrice,
      search: req.query.search
    };

    const result = await productService.getProductList(filters);

    return successResponse(res, result, '상품 목록을 조회했습니다');
  } catch (error) {
    next(error);
  }
}

/**
 * 상품 상세 조회
 * GET /api/admin/products/:productId
 * @param {number} productId - 상품 ID
 */
async function getProductById(req, res, next) {
  try {
    const productId = parseInt(req.params.productId);
    const product = await productService.getProductById(productId);

    return successResponse(res, product, '상품 상세 정보를 조회했습니다');
  } catch (error) {
    next(error);
  }
}

/**
 * 상품 상태 변경
 * PATCH /api/admin/products/:productId/status
 * @param {number} productId - 상품 ID
 * @body {string} status - 변경할 상태 (active, sold_out, inactive)
 */
async function updateProductStatus(req, res, next) {
  try {
    const productId = parseInt(req.params.productId);
    const { status } = req.body;

    const updatedProduct = await productService.updateProductStatus(productId, status);

    return successResponse(res, updatedProduct, '상품 상태를 변경했습니다');
  } catch (error) {
    next(error);
  }
}

/**
 * 상품 삭제 (소프트 삭제)
 * DELETE /api/admin/products/:productId
 * @param {number} productId - 상품 ID
 */
async function deleteProduct(req, res, next) {
  try {
    const productId = parseInt(req.params.productId);
    const deletedProduct = await productService.deleteProduct(productId);

    return successResponse(res, deletedProduct, '상품을 삭제했습니다');
  } catch (error) {
    next(error);
  }
}

/**
 * 상품 통계 조회
 * GET /api/admin/products/statistics
 */
async function getProductStatistics(req, res, next) {
  try {
    const statistics = await productService.getProductStatistics();

    return successResponse(res, statistics, '상품 통계를 조회했습니다');
  } catch (error) {
    next(error);
  }
}

/**
 * 상품 검색 (전체 텍스트 검색)
 * GET /api/admin/products/search
 * @query {string} query - 검색 키워드
 * @query {number} [page=1] - 페이지 번호
 * @query {number} [limit=20] - 페이지당 항목 수
 */
async function searchProducts(req, res, next) {
  try {
    const { query, page, limit } = req.query;

    const result = await productService.searchProducts(query, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20
    });

    return successResponse(res, result, '상품 검색 결과를 조회했습니다');
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getProducts,
  getProductById,
  updateProductStatus,
  deleteProduct,
  getProductStatistics,
  searchProducts
};
