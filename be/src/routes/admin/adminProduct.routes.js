const express = require('express');
const router = express.Router();
const productController = require('../../controllers/admin/adminProduct.controller');
const { authenticate, authorize } = require('../../middlewares/auth');

/**
 * Admin Product Routes
 * 관리자용 상품 관리 API 엔드포인트
 *
 * Base Path: /api/admin/products
 * Authentication: Required (JWT)
 * Authorization: Admin only
 */

/**
 * @route   GET /api/admin/products/statistics
 * @desc    상품 통계 조회
 * @access  Private (Admin)
 */
router.get('/statistics', authenticate, authorize('admin'), productController.getProductStatistics);

/**
 * @route   GET /api/admin/products/search
 * @desc    상품 검색 (전체 텍스트 검색)
 * @access  Private (Admin)
 * @query   {string} query - 검색 키워드
 * @query   {number} [page=1] - 페이지 번호
 * @query   {number} [limit=20] - 페이지당 항목 수
 */
router.get('/search', authenticate, authorize('admin'), productController.searchProducts);

/**
 * @route   GET /api/admin/products/:productId
 * @desc    상품 상세 조회
 * @access  Private (Admin)
 * @param   {number} productId - 상품 ID
 */
router.get('/:productId', authenticate, authorize('admin'), productController.getProductById);

/**
 * @route   GET /api/admin/products
 * @desc    상품 목록 조회 (페이징, 필터링, 검색)
 * @access  Private (Admin)
 * @query   {number} [page=1] - 페이지 번호
 * @query   {number} [limit=20] - 페이지당 항목 수
 * @query   {string} [status] - 상품 상태 필터
 * @query   {number} [categoryId] - 카테고리 ID 필터
 * @query   {number} [tenantId] - 판매사 ID 필터
 * @query   {number} [minPrice] - 최소 가격
 * @query   {number} [maxPrice] - 최대 가격
 * @query   {string} [search] - 검색어 (상품명, 설명)
 */
router.get('/', authenticate, authorize('admin'), productController.getProducts);

/**
 * @route   PATCH /api/admin/products/:productId/status
 * @desc    상품 상태 변경
 * @access  Private (Admin)
 * @param   {number} productId - 상품 ID
 * @body    {string} status - 변경할 상태 (active, sold_out, inactive)
 */
router.patch('/:productId/status', authenticate, authorize('admin'), productController.updateProductStatus);

/**
 * @route   DELETE /api/admin/products/:productId
 * @desc    상품 삭제 (소프트 삭제)
 * @access  Private (Admin)
 * @param   {number} productId - 상품 ID
 */
router.delete('/:productId', authenticate, authorize('admin'), productController.deleteProduct);

module.exports = router;
