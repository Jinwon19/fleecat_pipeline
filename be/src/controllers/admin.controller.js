const adminService = require('../services/admin.service');
const { successResponse } = require('../utils/response');

/**
 * 카테고리 등록
 */
async function createCategory(req, res, next) {
  try {
    const categoryData = req.body;
    const newCategory = await adminService.createCategory(categoryData);

    return successResponse(res, newCategory, '카테고리가 등록되었습니다.', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * 모든 카테고리 조회 (계층 구조)
 */
async function getCategories(req, res, next) {
  try {
    const categories = await adminService.getAllCategories();

    return successResponse(res, categories, '카테고리 목록을 조회했습니다.');
  } catch (error) {
    next(error);
  }
}

/**
 * 특정 카테고리 조회
 */
async function getCategoryById(req, res, next) {
  try {
    const { id } = req.params;
    const category = await adminService.getCategoryById(parseInt(id));

    return successResponse(res, category, '카테고리를 조회했습니다.');
  } catch (error) {
    next(error);
  }
}

/**
 * 카테고리 수정
 */
async function updateCategory(req, res, next) {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const updatedCategory = await adminService.updateCategory(parseInt(id), updateData);

    return successResponse(res, updatedCategory, '카테고리가 수정되었습니다.');
  } catch (error) {
    next(error);
  }
}

/**
 * 카테고리 삭제
 */
async function deleteCategory(req, res, next) {
  try {
    const { id } = req.params;
    await adminService.deleteCategory(parseInt(id));

    return successResponse(res, null, '카테고리가 삭제되었습니다.');
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory
};
