const prisma = require('../config/database');

/**
 * 카테고리 생성
 * category_path는 ID 기반으로 자동 생성
 */
async function createCategory(categoryData) {
  const {
    category_name,
    parent_category_id,
    category_description,
    category_order,
    category_depth,
    category_is_active
  } = categoryData;

  // 부모 카테고리 path 조회 (parent_category_id가 있을 때만)
  let parent_path = null;
  if (parent_category_id) {
    const parent = await findCategoryById(parent_category_id);
    if (parent) {
      parent_path = parent.category_path;
    }
  }

  // 1. 먼저 카테고리 생성 (path는 임시로 null)
  const created = await prisma.category.create({
    data: {
      category_name,
      parent_category_id,
      category_description,
      category_order: category_order || 0,
      category_depth: category_depth || 1,
      category_path: null,
      category_is_active: category_is_active !== undefined ? category_is_active : true
    }
  });

  // 2. 생성된 ID를 이용해 path 계산 및 업데이트
  const category_path = parent_path
    ? `${parent_path}/${created.category_id}`
    : `/${created.category_id}`;

  const updated = await prisma.category.update({
    where: { category_id: created.category_id },
    data: { category_path }
  });

  return updated;
}

/**
 * 모든 카테고리 조회
 */
async function findAllCategories() {
  return await prisma.category.findMany({
    orderBy: [
      { category_depth: 'asc' },
      { category_order: 'asc' }
    ]
  });
}

/**
 * ID로 카테고리 조회
 */
async function findCategoryById(categoryId) {
  return await prisma.category.findUnique({
    where: { category_id: categoryId }
  });
}

/**
 * 카테고리 수정
 */
async function updateCategory(categoryId, updateData) {
  return await prisma.category.update({
    where: { category_id: categoryId },
    data: updateData
  });
}

/**
 * 카테고리 삭제
 */
async function deleteCategory(categoryId) {
  return await prisma.category.delete({
    where: { category_id: categoryId }
  });
}

/**
 * 하위 카테고리 조회
 */
async function findChildCategories(parentCategoryId) {
  return await prisma.category.findMany({
    where: { parent_category_id: parentCategoryId }
  });
}

/**
 * 특정 카테고리에 속한 상품 개수 조회
 */
async function countProductsByCategory(categoryId) {
  return await prisma.product.count({
    where: { category_id: categoryId }
  });
}

module.exports = {
  createCategory,
  findAllCategories,
  findCategoryById,
  updateCategory,
  deleteCategory,
  findChildCategories,
  countProductsByCategory
};
