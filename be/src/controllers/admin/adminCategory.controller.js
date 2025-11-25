const adminCategoryService = require('../../services/admin/adminCategory.service');
const { successResponse } = require('../../utils/response');

/**
 * 카테고리 목록 조회
 */
async function getCategoryList(req, res, next) {
  try {
    const { includeInactive } = req.query;

    const options = {
      includeInactive: includeInactive === 'true'
    };

    const categories = await adminCategoryService.getCategoryList(options);

    return successResponse(res, categories, '카테고리 목록을 조회했습니다.');
  } catch (error) {
    next(error);
  }
}

/**
 * 카테고리 상세 조회
 */
async function getCategoryById(req, res, next) {
  try {
    const { id } = req.params;
    const category = await adminCategoryService.getCategoryById(parseInt(id));

    return successResponse(res, category, '카테고리를 조회했습니다.');
  } catch (error) {
    next(error);
  }
}

/**
 * 카테고리 생성
 */
async function createCategory(req, res, next) {
  try {
    const categoryData = req.body;
    const newCategory = await adminCategoryService.createCategory(categoryData);

    return successResponse(res, newCategory, '카테고리가 생성되었습니다.', 201);
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
    const updated = await adminCategoryService.updateCategory(parseInt(id), updateData);

    return successResponse(res, updated, '카테고리가 수정되었습니다.');
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
    const deleted = await adminCategoryService.deleteCategory(parseInt(id));

    return successResponse(res, deleted, '카테고리가 삭제되었습니다.');
  } catch (error) {
    next(error);
  }
}

/**
 * 부모 카테고리로 자식 카테고리 조회
 */
async function getCategoriesByParent(req, res, next) {
  try {
    const { parentId } = req.params;
    const parent = parentId === 'null' ? null : parseInt(parentId);

    const categories = await adminCategoryService.getCategoriesByParent(parent);

    return successResponse(res, categories, '하위 카테고리 목록을 조회했습니다.');
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getCategoryList,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoriesByParent
};
