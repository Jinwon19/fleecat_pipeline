const express = require('express');
const router = express.Router();
const adminCategoryController = require('../../controllers/admin/adminCategory.controller');

/**
 * Admin Category Routes
 * 관리자용 카테고리 관리 라우트
 */

// 카테고리 생성
router.post('/', adminCategoryController.createCategory);

// 카테고리 목록 조회 (계층형)
router.get('/', adminCategoryController.getCategoryList);

// 부모 카테고리로 자식 카테고리 조회
router.get('/parent/:parentId', adminCategoryController.getCategoriesByParent);

// 카테고리 상세 조회
router.get('/:id', adminCategoryController.getCategoryById);

// 카테고리 수정
router.patch('/:id', adminCategoryController.updateCategory);

// 카테고리 삭제
router.delete('/:id', adminCategoryController.deleteCategory);

module.exports = router;
