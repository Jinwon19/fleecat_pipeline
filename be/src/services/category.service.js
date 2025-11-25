const categoryRepository = require('../repositories/category.repository');
const { ValidationError, NotFoundError } = require('../utils/errors');

/**
 * Category Service
 * 계층형 카테고리 관리 비즈니스 로직
 */

/**
 * 카테고리 생성 (관리자 전용)
 * - depth 제한 확인 (3단계까지)
 * - 부모 카테고리 존재 확인
 * - category_path 자동 계산은 Repository에서 처리
 */
async function createCategory(data) {
  const { category_name, parent_category_id } = data;

  // 필수 필드 확인
  if (!category_name || category_name.trim() === '') {
    throw new ValidationError('Category name is required');
  }

  // 부모 카테고리 확인
  if (parent_category_id) {
    const parent = await categoryRepository.findById(parent_category_id);

    if (!parent) {
      throw new NotFoundError('Parent category not found');
    }

    // Depth 제한 확인 (3단계까지만)
    if (parent.category_depth >= 3) {
      throw new ValidationError('Maximum category depth is 3');
    }

    // 비활성 부모에 자식 생성 방지
    if (!parent.category_is_active) {
      throw new ValidationError('Cannot create child category under inactive parent');
    }
  }

  // 카테고리 생성 (path는 Repository에서 자동 계산)
  const category = await categoryRepository.create({
    category_name: category_name.trim(),
    parent_category_id: parent_category_id || null,
    category_description: data.category_description?.trim() || null,
    category_order: data.category_order ?? 0
  });

  // BigInt 변환
  return convertBigIntToNumber(category);
}

/**
 * 계층형 카테고리 트리 조회 (Public)
 * - 대분류부터 3단계까지 계층 구조로 반환
 */
async function getCategoryTree(options = {}) {
  const { includeInactive = false } = options;

  const categories = await categoryRepository.findAll({ includeInactive });

  // BigInt 변환 (재귀적으로)
  return categories.map(category => convertCategoryTree(category));
}

/**
 * 카테고리 상세 조회 (Public)
 */
async function getCategoryById(categoryId) {
  const category = await categoryRepository.findById(categoryId);

  if (!category) {
    throw new NotFoundError('Category not found');
  }

  // BigInt 변환
  return convertBigIntToNumber(category);
}

/**
 * 특정 카테고리의 자식 카테고리 목록 조회 (Public)
 */
async function getChildCategories(parentId) {
  const parent = await categoryRepository.findById(parentId);

  if (!parent) {
    throw new NotFoundError('Parent category not found');
  }

  const children = await categoryRepository.findByParentId(parentId);

  // BigInt 변환
  return children.map(child => convertBigIntToNumber(child));
}

/**
 * 카테고리 수정 (관리자 전용)
 * - 이름, 설명, 순서, 활성 상태만 수정 가능
 * - parent_category_id, category_path는 수정 불가
 */
async function updateCategory(categoryId, updateData) {
  // 카테고리 존재 확인
  const category = await categoryRepository.findById(categoryId);

  if (!category) {
    throw new NotFoundError('Category not found');
  }

  // 수정 가능한 필드만 추출
  const allowedFields = {
    category_name: updateData.category_name?.trim(),
    category_description: updateData.category_description?.trim(),
    category_order: updateData.category_order,
    category_is_active: updateData.category_is_active
  };

  // undefined 제거
  const data = {};
  Object.keys(allowedFields).forEach(key => {
    if (allowedFields[key] !== undefined) {
      data[key] = allowedFields[key];
    }
  });

  // 수정할 내용이 없으면 에러
  if (Object.keys(data).length === 0) {
    throw new ValidationError('No fields to update');
  }

  // 이름이 빈 문자열인지 확인
  if (data.category_name !== undefined && data.category_name === '') {
    throw new ValidationError('Category name cannot be empty');
  }

  // 카테고리 수정
  const updated = await categoryRepository.update(categoryId, data);

  // BigInt 변환
  return convertBigIntToNumber(updated);
}

/**
 * 카테고리 삭제 (관리자 전용)
 * - 하위 카테고리가 있으면 삭제 불가
 * - 상품이 있으면 삭제 불가
 */
async function deleteCategory(categoryId) {
  // 카테고리 존재 확인
  const category = await categoryRepository.findById(categoryId);

  if (!category) {
    throw new NotFoundError('Category not found');
  }

  // 하위 카테고리 확인
  const childCount = await categoryRepository.countChildren(categoryId);

  if (childCount > 0) {
    throw new ValidationError(
      `Cannot delete category with ${childCount} child categories. Delete child categories first.`
    );
  }

  // 상품 확인
  const productCount = await categoryRepository.countProducts(categoryId);

  if (productCount > 0) {
    throw new ValidationError(
      `Cannot delete category with ${productCount} products. Remove or reassign products first.`
    );
  }

  // 삭제 실행
  await categoryRepository.deleteById(categoryId);

  return {
    message: 'Category deleted successfully',
    deleted_category: {
      category_id: Number(category.category_id),
      category_name: category.category_name
    }
  };
}

/**
 * 카테고리 통계 조회
 */
async function getCategoryStats(categoryId) {
  const category = await categoryRepository.findById(categoryId);

  if (!category) {
    throw new NotFoundError('Category not found');
  }

  const childCount = await categoryRepository.countChildren(categoryId);
  const productCount = await categoryRepository.countProducts(categoryId);

  return {
    category_id: Number(category.category_id),
    category_name: category.category_name,
    category_depth: category.category_depth,
    child_category_count: childCount,
    product_count: productCount,
    is_active: category.category_is_active
  };
}

/**
 * BigInt를 Number로 변환 (단일 카테고리)
 */
function convertBigIntToNumber(category) {
  if (!category) return null;

  const converted = {
    ...category,
    category_id: Number(category.category_id),
    parent_category_id: category.parent_category_id ? Number(category.parent_category_id) : null
  };

  // parent_category 변환
  if (category.parent_category) {
    converted.parent_category = convertBigIntToNumber(category.parent_category);
  }

  // child_categories 변환
  if (category.child_categories && Array.isArray(category.child_categories)) {
    converted.child_categories = category.child_categories.map(child =>
      convertBigIntToNumber(child)
    );
  }

  return converted;
}

/**
 * 카테고리 트리 BigInt 변환 (재귀)
 */
function convertCategoryTree(category) {
  const converted = {
    ...category,
    category_id: Number(category.category_id),
    parent_category_id: category.parent_category_id ? Number(category.parent_category_id) : null
  };

  // 재귀적으로 자식 카테고리 변환
  if (category.child_categories && Array.isArray(category.child_categories)) {
    converted.child_categories = category.child_categories.map(child =>
      convertCategoryTree(child)
    );
  }

  return converted;
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
