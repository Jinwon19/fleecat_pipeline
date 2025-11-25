const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { authenticate } = require('../middlewares/auth');
const {
  validateCreateProduct,
  validateUpdateProduct,
  validateUpdateProductStatus,
  validateUploadProductImages,
  validateReorderProductImages
} = require('../middlewares/validation');

/**
 * Product Routes
 * 상품 및 상품 이미지 관련 API 엔드포인트
 *
 * Public API: 상품 조회 (목록, 상세, 카테고리별, 통계)
 * Private API: 상품 등록, 수정, 삭제, 이미지 관리
 *
 * 주의: 라우트 순서가 중요합니다!
 * - 구체적인 경로 (/me, /category, /images)가 먼저
 * - 동적 파라미터 (/:productId)는 나중에
 */

/**
 * @route   GET /api/v1/products/me/:tenantMemberId
 * @desc    내 상품 목록 조회 (판매자용)
 * @access  Private
 * @query   page, limit, status
 */
router.get('/me/:tenantMemberId', authenticate, productController.getMyProducts);

/**
 * @route   GET /api/v1/products/category/:categoryId
 * @desc    카테고리별 상품 목록 조회
 * @access  Public
 * @query   page, limit
 */
router.get('/category/:categoryId', productController.getProductsByCategory);

/**
 * @route   DELETE /api/v1/products/images/:productImgId
 * @desc    상품 이미지 삭제 (본인만)
 * @access  Private
 */
router.delete('/images/:productImgId', authenticate, productController.deleteProductImage);

/**
 * @route   GET /api/v1/products/:productId/stats
 * @desc    상품 통계 조회
 * @access  Public
 */
router.get('/:productId/stats', productController.getProductStats);

/**
 * @route   POST /api/v1/products/:productId/images
 * @desc    상품 이미지 업로드 (본인만, 최대 10개)
 * @access  Private
 */
router.post('/:productId/images', authenticate, validateUploadProductImages, productController.uploadProductImages);

/**
 * @route   PUT /api/v1/products/:productId/images/reorder
 * @desc    상품 이미지 순서 재배치 (본인만)
 * @access  Private
 */
router.put('/:productId/images/reorder', authenticate, validateReorderProductImages, productController.reorderProductImages);

/**
 * @route   PATCH /api/v1/products/:productId/status
 * @desc    상품 상태 변경 (본인만)
 * @access  Private
 */
router.patch('/:productId/status', authenticate, validateUpdateProductStatus, productController.updateProductStatus);

/**
 * @route   GET /api/v1/products/:productId
 * @desc    상품 상세 조회 (조회수 자동 증가)
 * @access  Public
 */
router.get('/:productId', productController.getProductById);

/**
 * @route   PATCH /api/v1/products/:productId
 * @desc    상품 수정 (본인만)
 * @access  Private
 */
router.patch('/:productId', authenticate, validateUpdateProduct, productController.updateProduct);

/**
 * @route   DELETE /api/v1/products/:productId
 * @desc    상품 삭제 (본인만)
 * @access  Private
 */
router.delete('/:productId', authenticate, productController.deleteProduct);

/**
 * @route   GET /api/v1/products
 * @desc    전체 상품 목록 조회 (필터링/정렬/페이징)
 * @access  Public
 * @query   page, limit, status, categoryId, tenantId, minPrice, maxPrice, search, sortBy, sortOrder
 */
router.get('/', productController.getAllProducts);

/**
 * @route   POST /api/v1/products
 * @desc    상품 등록 (승인된 TenantMember만)
 * @access  Private
 */
router.post('/', authenticate, validateCreateProduct, productController.createProduct);

module.exports = router;
