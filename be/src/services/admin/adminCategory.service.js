const categoryRepo = require('../../repositories/category.repository');
const { NotFoundError, ValidationError } = require('../../utils/errors');

/**
 * Admin Category Service
 * 관리자용 카테고리 관리 비즈니스 로직
 */

/**
 * BigInt를 문자열로 변환 (재귀적)
 */
function convertBigIntToString(category) {
  if (!category) return null;

  const converted = {
    ...category,
    category_id: category.category_id.toString(),
    parent_category_id: category.parent_category_id?.toString()
  };

  // parent_category 변환
  if (category.parent_category) {
    converted.parent_category = convertBigIntToString(category.parent_category);
  }

  // child_categories 재귀 변환
  if (category.child_categories && category.child_categories.length > 0) {
    converted.child_categories = category.child_categories.map(child =>
      convertBigIntToString(child)
    );
  }

  return converted;
}

/**
 * 카테고리 목록 조회
 * @param {Object} options - 조회 옵션
 * @returns {Promise<Array>} 카테고리 목록 (계층형)
 */
async function getCategoryList(options = {}) {
  const { includeInactive = false } = options;

  // Repository 호출 (대분류만 반환, 중/소분류는 child_categories에 포함)
  const categories = await categoryRepo.findAll({ includeInactive });

  // BigInt 변환 (재귀적)
  return categories.map(category => convertBigIntToString(category));
}

/**
 * 카테고리 상세 조회
 * @param {number} categoryId - 카테고리 ID
 * @returns {Promise<Object>} 카테고리 상세 정보
 */
async function getCategoryById(categoryId) {
  // Repository 호출
  const category = await categoryRepo.findById(categoryId);

  // 존재 확인
  if (!category) {
    throw new NotFoundError(`카테고리 ID ${categoryId}를 찾을 수 없습니다`);
  }

  // BigInt 변환
  return {
    ...category,
    category_id: category.category_id.toString(),
    parent_category_id: category.parent_category_id?.toString(),
    parent_category: category.parent_category ? {
      ...category.parent_category,
      category_id: category.parent_category.category_id.toString(),
      parent_category_id: category.parent_category.parent_category_id?.toString()
    } : null,
    child_categories: category.child_categories?.map(child => ({
      ...child,
      category_id: child.category_id.toString(),
      parent_category_id: child.parent_category_id?.toString()
    }))
  };
}

/**
 * 카테고리 생성
 * @param {Object} categoryData - 카테고리 데이터
 * @returns {Promise<Object>} 생성된 카테고리
 */
async function createCategory(categoryData) {
  const {
    category_name,
    parent_category_id,
    category_description,
    category_order = 0
  } = categoryData;

  // 1. 카테고리명 검증
  if (!category_name || category_name.trim().length === 0) {
    throw new ValidationError('카테고리명을 입력해주세요');
  }

  if (category_name.length > 50) {
    throw new ValidationError('카테고리명은 50자 이하로 입력해주세요');
  }

  // 2. 부모 카테고리 검증
  if (parent_category_id) {
    const parent = await categoryRepo.findById(parent_category_id);
    if (!parent) {
      throw new NotFoundError(`부모 카테고리 ID ${parent_category_id}를 찾을 수 없습니다`);
    }

    // 비즈니스 규칙: 최대 depth 3 (depth 4 이상 불가)
    if (parent.category_depth >= 3) {
      throw new ValidationError('카테고리는 최대 3단계까지만 생성할 수 있습니다');
    }

    // 비즈니스 규칙: 비활성 카테고리 하위에는 생성 불가
    if (!parent.category_is_active) {
      throw new ValidationError('비활성 카테고리 하위에는 카테고리를 생성할 수 없습니다');
    }
  }

  // 3. category_order 검증
  if (category_order < 0) {
    throw new ValidationError('정렬 순서는 0 이상이어야 합니다');
  }

  // 4. description 검증
  if (category_description && category_description.length > 500) {
    throw new ValidationError('설명은 500자 이하로 입력해주세요');
  }

  // 5. Repository 호출
  const created = await categoryRepo.create({
    category_name: category_name.trim(),
    parent_category_id: parent_category_id ? parseInt(parent_category_id) : null,
    category_description: category_description?.trim(),
    category_order
  });

  // 6. BigInt 변환
  return {
    ...created,
    category_id: created.category_id.toString(),
    parent_category_id: created.parent_category_id?.toString(),
    parent_category: created.parent_category ? {
      ...created.parent_category,
      category_id: created.parent_category.category_id.toString(),
      parent_category_id: created.parent_category.parent_category_id?.toString()
    } : null
  };
}

/**
 * 카테고리 수정
 * @param {number} categoryId - 카테고리 ID
 * @param {Object} updateData - 수정할 데이터
 * @returns {Promise<Object>} 수정된 카테고리
 */
async function updateCategory(categoryId, updateData) {
  const {
    category_name,
    category_description,
    category_order,
    category_is_active
  } = updateData;

  // 1. 카테고리 존재 확인
  const category = await categoryRepo.findById(categoryId);
  if (!category) {
    throw new NotFoundError(`카테고리 ID ${categoryId}를 찾을 수 없습니다`);
  }

  // 2. 수정할 데이터 검증
  const data = {};

  if (category_name !== undefined) {
    if (!category_name || category_name.trim().length === 0) {
      throw new ValidationError('카테고리명을 입력해주세요');
    }
    if (category_name.length > 50) {
      throw new ValidationError('카테고리명은 50자 이하로 입력해주세요');
    }
    data.category_name = category_name.trim();
  }

  if (category_description !== undefined) {
    if (category_description && category_description.length > 500) {
      throw new ValidationError('설명은 500자 이하로 입력해주세요');
    }
    data.category_description = category_description?.trim() || null;
  }

  if (category_order !== undefined) {
    if (category_order < 0) {
      throw new ValidationError('정렬 순서는 0 이상이어야 합니다');
    }
    data.category_order = category_order;
  }

  if (category_is_active !== undefined) {
    // 비즈니스 규칙: 하위 카테고리가 있으면 비활성화 불가
    if (category_is_active === false) {
      const childCount = await categoryRepo.countChildren(categoryId);
      if (childCount > 0) {
        throw new ValidationError('하위 카테고리가 있는 카테고리는 비활성화할 수 없습니다');
      }

      // 비즈니스 규칙: 상품이 있으면 비활성화 불가
      const productCount = await categoryRepo.countProducts(categoryId);
      if (productCount > 0) {
        throw new ValidationError('상품이 등록된 카테고리는 비활성화할 수 없습니다');
      }
    }
    data.category_is_active = category_is_active;
  }

  // 3. Repository 호출
  const updated = await categoryRepo.update(categoryId, data);

  // 4. BigInt 변환
  return {
    ...updated,
    category_id: updated.category_id.toString(),
    parent_category_id: updated.parent_category_id?.toString(),
    parent_category: updated.parent_category ? {
      ...updated.parent_category,
      category_id: updated.parent_category.category_id.toString(),
      parent_category_id: updated.parent_category.parent_category_id?.toString()
    } : null,
    child_categories: updated.child_categories?.map(child => ({
      ...child,
      category_id: child.category_id.toString(),
      parent_category_id: child.parent_category_id?.toString()
    }))
  };
}

/**
 * 카테고리 삭제
 * @param {number} categoryId - 카테고리 ID
 * @returns {Promise<Object>} 삭제된 카테고리
 */
async function deleteCategory(categoryId) {
  // 1. 카테고리 존재 확인
  const category = await categoryRepo.findById(categoryId);
  if (!category) {
    throw new NotFoundError(`카테고리 ID ${categoryId}를 찾을 수 없습니다`);
  }

  // 2. 비즈니스 규칙: 하위 카테고리가 있으면 삭제 불가
  const childCount = await categoryRepo.countChildren(categoryId);
  if (childCount > 0) {
    throw new ValidationError('하위 카테고리가 있는 카테고리는 삭제할 수 없습니다. 먼저 하위 카테고리를 삭제해주세요');
  }

  // 3. 비즈니스 규칙: 상품이 있으면 삭제 불가
  const productCount = await categoryRepo.countProducts(categoryId);
  if (productCount > 0) {
    throw new ValidationError(`${productCount}개의 상품이 등록된 카테고리는 삭제할 수 없습니다`);
  }

  // 4. Repository 호출
  const deleted = await categoryRepo.deleteById(categoryId);

  // 5. BigInt 변환
  return {
    ...deleted,
    category_id: deleted.category_id.toString(),
    parent_category_id: deleted.parent_category_id?.toString()
  };
}

/**
 * 부모 카테고리로 자식 카테고리 조회
 * @param {number|null} parentId - 부모 카테고리 ID (null이면 최상위)
 * @returns {Promise<Array>} 자식 카테고리 목록
 */
async function getCategoriesByParent(parentId) {
  // 1. 부모 카테고리 존재 확인 (parentId가 null이 아닐 때만)
  if (parentId !== null && parentId !== undefined) {
    const parent = await categoryRepo.findById(parentId);
    if (!parent) {
      throw new NotFoundError(`부모 카테고리 ID ${parentId}를 찾을 수 없습니다`);
    }
  }

  // 2. Repository 호출
  const categories = await categoryRepo.findByParentId(parentId);

  // 3. BigInt 변환
  return categories.map(category => ({
    ...category,
    category_id: category.category_id.toString(),
    parent_category_id: category.parent_category_id?.toString()
  }));
}

module.exports = {
  getCategoryList,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoriesByParent
};
