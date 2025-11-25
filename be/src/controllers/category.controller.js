const categoryService = require('../services/category.service');
const { successResponse } = require('../utils/response');

/**
 * Category Controller
 * 카테고리 관련 HTTP 요청 처리
 */

/**
 * 카테고리 생성 (관리자 전용)
 * POST /api/categories
 */
async function createCategory(req, res, next) {
  try {
    const data = req.body;

    const category = await categoryService.createCategory(data);

    return successResponse(
      res,
      category,
      'Category created successfully',
      201
    );
  } catch (error) {
    next(error);
  }
}

/**
 * 계층형 카테고리 트리 조회 (Public)
 * GET /api/categories/tree
 * Query: includeInactive (boolean)
 */
async function getCategoryTree(req, res, next) {
  try {
    const includeInactive = req.query.includeInactive === 'true';

    const tree = await categoryService.getCategoryTree({ includeInactive });

    return successResponse(
      res,
      tree,
      'Category tree retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * 카테고리 상세 조회 (Public)
 * GET /api/categories/:categoryId
 */
async function getCategoryById(req, res, next) {
  try {
    const categoryId = parseInt(req.params.categoryId, 10);

    if (isNaN(categoryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID'
      });
    }

    const category = await categoryService.getCategoryById(categoryId);

    return successResponse(
      res,
      category,
      'Category retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * 특정 카테고리의 자식 카테고리 목록 조회 (Public)
 * GET /api/categories/:categoryId/children
 */
async function getChildCategories(req, res, next) {
  try {
    const categoryId = parseInt(req.params.categoryId, 10);

    if (isNaN(categoryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID'
      });
    }

    const children = await categoryService.getChildCategories(categoryId);

    return successResponse(
      res,
      children,
      'Child categories retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * 카테고리 수정 (관리자 전용)
 * PATCH /api/categories/:categoryId
 */
async function updateCategory(req, res, next) {
  try {
    const categoryId = parseInt(req.params.categoryId, 10);

    if (isNaN(categoryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID'
      });
    }

    const updateData = req.body;

    const updated = await categoryService.updateCategory(categoryId, updateData);

    return successResponse(
      res,
      updated,
      'Category updated successfully'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * 카테고리 삭제 (관리자 전용)
 * DELETE /api/categories/:categoryId
 */
async function deleteCategory(req, res, next) {
  try {
    const categoryId = parseInt(req.params.categoryId, 10);

    if (isNaN(categoryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID'
      });
    }

    const result = await categoryService.deleteCategory(categoryId);

    return successResponse(
      res,
      result,
      'Category deleted successfully'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * 카테고리 통계 조회 (관리자용)
 * GET /api/categories/:categoryId/stats
 */
async function getCategoryStats(req, res, next) {
  try {
    const categoryId = parseInt(req.params.categoryId, 10);

    if (isNaN(categoryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID'
      });
    }

    const stats = await categoryService.getCategoryStats(categoryId);

    return successResponse(
      res,
      stats,
      'Category stats retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createCategory,
  getCategoryTree,
  getCategoryById,
  getChildCategories,
  updateCategory,
  deleteCategory,
  getCategoryStats
};
