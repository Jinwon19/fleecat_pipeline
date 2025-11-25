const prisma = require('../config/database');

/**
 * Category Repository
 * 카테고리 데이터 접근 계층
 */

/**
 * 모든 카테고리 조회 (계층형 구조)
 * 대분류만 반환하고, 각 대분류에 중분류와 소분류가 재귀적으로 포함됨
 */
async function findAll({ includeInactive = false } = {}) {
  const where = {
    parent_category_id: null  // 대분류만 조회 (depth: 1)
  };

  if (!includeInactive) {
    where.category_is_active = true;
  }

  return await prisma.category.findMany({
    where,
    include: {
      child_categories: {
        include: {
          child_categories: true  // 소분류까지 포함 (3단계까지)
        },
        orderBy: {
          category_order: 'asc'
        }
      }
    },
    orderBy: {
      category_order: 'asc'
    }
  });
}

/**
 * ID로 카테고리 조회
 */
async function findById(categoryId) {
  return await prisma.category.findUnique({
    where: { category_id: categoryId },
    include: {
      parent_category: true,
      child_categories: true
    }
  });
}

/**
 * 부모 ID로 카테고리 조회
 */
async function findByParentId(parentId) {
  return await prisma.category.findMany({
    where: {
      parent_category_id: parentId,
      category_is_active: true
    },
    orderBy: {
      category_order: 'asc'
    }
  });
}

/**
 * 카테고리 생성
 */
async function create(categoryData) {
  const {
    category_name,
    parent_category_id,
    category_description,
    category_order
  } = categoryData;

  // depth 계산
  let category_depth = 1;
  let parent_path = null;

  if (parent_category_id) {
    const parent = await findById(parent_category_id);
    if (parent) {
      category_depth = parent.category_depth + 1;
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
      category_depth,
      category_path: null,
      category_is_active: true
    }
  });

  // 2. 생성된 ID를 이용해 path 계산 및 업데이트
  const category_path = parent_path
    ? `${parent_path}/${created.category_id}`
    : `/${created.category_id}`;

  const updated = await prisma.category.update({
    where: { category_id: created.category_id },
    data: { category_path },
    include: {
      parent_category: true
    }
  });

  return updated;
}

/**
 * 카테고리 수정
 * 참고: category_path는 ID 기반이므로 이름이 변경되어도 path는 변경되지 않음
 */
async function update(categoryId, updateData) {
  const {
    category_name,
    category_description,
    category_order,
    category_is_active
  } = updateData;

  const data = {};

  if (category_name !== undefined) {
    data.category_name = category_name;
    // ID 기반 path이므로 이름 변경 시 path 재계산 불필요
  }

  if (category_description !== undefined) {
    data.category_description = category_description;
  }

  if (category_order !== undefined) {
    data.category_order = category_order;
  }

  if (category_is_active !== undefined) {
    data.category_is_active = category_is_active;
  }

  return await prisma.category.update({
    where: { category_id: categoryId },
    data,
    include: {
      parent_category: true,
      child_categories: true
    }
  });
}

/**
 * 카테고리 삭제
 */
async function deleteById(categoryId) {
  return await prisma.category.delete({
    where: { category_id: categoryId }
  });
}

/**
 * 하위 카테고리 개수 조회
 */
async function countChildren(categoryId) {
  return await prisma.category.count({
    where: {
      parent_category_id: categoryId
    }
  });
}

/**
 * 카테고리에 속한 상품 개수 조회
 */
async function countProducts(categoryId) {
  return await prisma.product.count({
    where: {
      category_id: categoryId
    }
  });
}

module.exports = {
  findAll,
  findById,
  findByParentId,
  create,
  update,
  deleteById,
  countChildren,
  countProducts
};
