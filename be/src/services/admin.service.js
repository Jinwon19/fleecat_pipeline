const adminRepository = require('../repositories/admin.repository');
const { ValidationError, NotFoundError } = require('../utils/errors');

/**
 * 카테고리 등록
 */
async function createCategory(categoryData) {
  const {
    category_name,
    category_description,
    category_depth,
    category_order,
    parent_category_id
  } = categoryData;

  // 유효성 검사
  if (!category_name || !category_name.trim()) {
    throw new ValidationError('카테고리 이름은 필수입니다.');
  }

  if (!category_depth || category_depth < 1 || category_depth > 3) {
    throw new ValidationError('카테고리 깊이는 1~3 사이여야 합니다.');
  }

  // 2단계 이상인 경우 상위 카테고리 확인
  if (category_depth > 1) {
    if (!parent_category_id) {
      throw new ValidationError('상위 카테고리를 선택해야 합니다.');
    }

    const parentCategory = await adminRepository.findCategoryById(parent_category_id);
    if (!parentCategory) {
      throw new NotFoundError('상위 카테고리를 찾을 수 없습니다.');
    }

    // 상위 카테고리의 depth가 올바른지 확인
    if (Number(parentCategory.category_depth) !== category_depth - 1) {
      throw new ValidationError(
        `${category_depth}단계 카테고리는 ${category_depth - 1}단계 카테고리의 하위에만 등록할 수 있습니다.`
      );
    }
  }

  // category_path는 repository에서 ID 기반으로 자동 생성됨
  const newCategoryData = {
    category_name: category_name.trim(),
    category_description: category_description?.trim() || null,
    category_depth,
    category_order: category_order || 0,
    parent_category_id: parent_category_id || null,
    category_is_active: true
  };

  return await adminRepository.createCategory(newCategoryData);
}

/**
 * 모든 카테고리 조회 (계층 구조)
 */
async function getAllCategories() {
  const categories = await adminRepository.findAllCategories();

  // 깊이 순, 순서 순으로 정렬
  return categories.sort((a, b) => {
    if (a.category_depth !== b.category_depth) {
      return a.category_depth - b.category_depth;
    }
    return a.category_order - b.category_order;
  });
}

/**
 * 특정 카테고리 조회
 */
async function getCategoryById(categoryId) {
  const category = await adminRepository.findCategoryById(categoryId);

  if (!category) {
    throw new NotFoundError('카테고리를 찾을 수 없습니다.');
  }

  return category;
}

/**
 * 카테고리 수정
 */
async function updateCategory(categoryId, updateData) {
  const category = await adminRepository.findCategoryById(categoryId);

  if (!category) {
    throw new NotFoundError('카테고리를 찾을 수 없습니다.');
  }

  // category_path는 ID 기반이므로 이름 변경 시 path 재계산 불필요
  // (path는 repository에서 ID로 자동 관리됨)

  return await adminRepository.updateCategory(categoryId, updateData);
}

/**
 * 카테고리 삭제
 */
async function deleteCategory(categoryId) {
  const category = await adminRepository.findCategoryById(categoryId);

  if (!category) {
    throw new NotFoundError('카테고리를 찾을 수 없습니다.');
  }

  // 하위 카테고리가 있는지 확인
  const childCategories = await adminRepository.findChildCategories(categoryId);
  if (childCategories.length > 0) {
    throw new ValidationError('하위 카테고리가 있는 카테고리는 삭제할 수 없습니다.');
  }

  // 해당 카테고리에 상품이 있는지 확인
  const productsCount = await adminRepository.countProductsByCategory(categoryId);
  if (productsCount > 0) {
    throw new ValidationError('상품이 등록된 카테고리는 삭제할 수 없습니다.');
  }

  return await adminRepository.deleteCategory(categoryId);
}

module.exports = {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory
};
