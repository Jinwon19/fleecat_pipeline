const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const { authenticate, authorize } = require('../middlewares/auth');
const { validateCreateCategory, validateUpdateCategory } = require('../middlewares/validation');

/**
 * Category Routes
 * 계층형 카테고리 관련 API 엔드포인트
 *
 * Public API: 카테고리 조회 (트리, 상세, 자식 목록, 통계)
 * Admin API: 카테고리 생성, 수정, 삭제
 */

/**
 * @route   GET /api/v1/categories/tree
 * @desc    계층형 카테고리 트리 조회 (최대 3단계)
 * @access  Public
 * @query   includeInactive - 비활성 카테고리 포함 여부 (boolean, default: false)
 */
router.get('/tree', categoryController.getCategoryTree);

/**
 * @route   GET /api/v1/categories/:categoryId/children
 * @desc    특정 카테고리의 자식 카테고리 목록 조회
 * @access  Public
 */
router.get('/:categoryId/children', categoryController.getChildCategories);

/**
 * @route   GET /api/v1/categories/:categoryId/stats
 * @desc    카테고리 통계 조회 (하위 카테고리 수, 상품 수)
 * @access  Public
 */
router.get('/:categoryId/stats', categoryController.getCategoryStats);

/**
 * @route   GET /api/v1/categories/:categoryId
 * @desc    카테고리 상세 조회
 * @access  Public
 */
router.get('/:categoryId', categoryController.getCategoryById);

/**
 * @route   POST /api/v1/categories
 * @desc    카테고리 생성 (관리자 전용)
 * @access  Private (Admin)
 */
router.post('/', authenticate, authorize('admin'), validateCreateCategory, categoryController.createCategory);

/**
 * @route   PATCH /api/v1/categories/:categoryId
 * @desc    카테고리 수정 (관리자 전용)
 * @access  Private (Admin)
 */
router.patch('/:categoryId', authenticate, authorize('admin'), validateUpdateCategory, categoryController.updateCategory);

/**
 * @route   DELETE /api/v1/categories/:categoryId
 * @desc    카테고리 삭제 (관리자 전용)
 * @access  Private (Admin)
 */
router.delete('/:categoryId', authenticate, authorize('admin'), categoryController.deleteCategory);

module.exports = router;
