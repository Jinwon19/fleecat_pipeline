const productRepo = require('../../repositories/admin/adminProduct.repository');
const prisma = require('../../config/database');
const { NotFoundError, ValidationError } = require('../../utils/errors');

/**
 * Admin Product Service
 * 관리자용 상품 관리 비즈니스 로직
 */

// 유효한 상품 상태
const VALID_PRODUCT_STATUSES = ['active', 'sold_out', 'inactive'];

/**
 * BigInt 변환 유틸리티 (재귀적 중첩 구조)
 * @param {Object} product - 상품 객체
 * @returns {Object} BigInt가 문자열로 변환된 객체
 */
function convertProductBigInt(product) {
  if (!product) return null;

  return {
    ...product,
    product_id: product.product_id.toString(),
    category_id: product.category_id?.toString(),
    tenant_member_id: product.tenant_member_id?.toString(),

    // 카테고리 변환
    category: product.category ? {
      ...product.category,
      category_id: product.category.category_id.toString(),
      parent_category_id: product.category.parent_category_id?.toString()
    } : null,

    // TenantMember 변환 (중첩: tenant, member)
    tenant_member: product.tenant_member ? {
      ...product.tenant_member,
      tenant_member_id: product.tenant_member.tenant_member_id.toString(),
      member_id: product.tenant_member.member_id?.toString(),
      tenant_id: product.tenant_member.tenant_id?.toString(),

      // Tenant 변환
      tenant: product.tenant_member.tenant ? {
        ...product.tenant_member.tenant,
        tenant_id: product.tenant_member.tenant.tenant_id.toString()
      } : null,

      // Member 변환
      member: product.tenant_member.member ? {
        ...product.tenant_member.member,
        member_id: product.tenant_member.member.member_id.toString(),
        company_id: product.tenant_member.member.company_id?.toString()
      } : null
    } : null,

    // 상품 이미지 배열 변환
    product_images: product.product_images?.map(img => ({
      ...img,
      product_img_id: img.product_img_id.toString(),
      product_id: img.product_id.toString()
    }))
  };
}

/**
 * 상품 목록 조회 (페이징, 필터링)
 * @param {Object} filters - 필터 옵션
 * @param {number} [filters.page=1] - 페이지 번호
 * @param {number} [filters.limit=20] - 페이지당 항목 수
 * @param {string} [filters.status] - 상품 상태
 * @param {number} [filters.categoryId] - 카테고리 ID
 * @param {number} [filters.tenantId] - 판매사 ID
 * @param {string} [filters.search] - 검색어
 * @returns {Promise<Object>} { products, total, page, totalPages }
 */
async function getProductList(filters = {}) {
  const {
    page = 1,
    limit = 20,
    status,
    categoryId,
    tenantId,
    search
  } = filters;

  // 1. 페이지 검증
  if (page < 1) {
    throw new ValidationError('페이지는 1 이상이어야 합니다');
  }

  if (limit < 1 || limit > 100) {
    throw new ValidationError('limit은 1~100 사이여야 합니다');
  }

  // 2. status 검증
  if (status && !VALID_PRODUCT_STATUSES.includes(status)) {
    throw new ValidationError(
      `유효하지 않은 상태입니다. 가능한 값: ${VALID_PRODUCT_STATUSES.join(', ')}`
    );
  }

  // 3. categoryId 검증
  if (categoryId && categoryId < 1) {
    throw new ValidationError('카테고리 ID는 양수여야 합니다');
  }

  // 4. tenantId 검증
  if (tenantId && tenantId < 1) {
    throw new ValidationError('판매사 ID는 양수여야 합니다');
  }

  // 5. Repository 호출
  const result = await productRepo.findAll({
    page: parseInt(page),
    limit: parseInt(limit),
    status,
    categoryId: categoryId ? parseInt(categoryId) : undefined,
    tenantId: tenantId ? parseInt(tenantId) : undefined,
    search
  });

  // 6. BigInt 변환
  return {
    ...result,
    products: result.products.map(convertProductBigInt)
  };
}

/**
 * 상품 상세 조회
 * @param {number} productId - 상품 ID
 * @returns {Promise<Object>} 상품 상세 정보
 */
async function getProductById(productId) {
  // 1. Repository 호출
  const product = await productRepo.findByIdWithDetails(productId);

  // 2. 존재 확인
  if (!product) {
    throw new NotFoundError(`상품 ID ${productId}를 찾을 수 없습니다`);
  }

  // 3. BigInt 변환
  return convertProductBigInt(product);
}

/**
 * 상품 상태 변경
 * @param {number} productId - 상품 ID
 * @param {string} status - 변경할 상태 (active/sold_out/inactive)
 * @returns {Promise<Object>} 수정된 상품 정보
 */
async function updateProductStatus(productId, status) {
  // 1. status 검증
  if (!status) {
    throw new ValidationError('상태를 입력해주세요');
  }

  if (!VALID_PRODUCT_STATUSES.includes(status)) {
    throw new ValidationError(
      `유효하지 않은 상태입니다. 가능한 값: ${VALID_PRODUCT_STATUSES.join(', ')}`
    );
  }

  // 2. 상품 존재 확인
  const product = await productRepo.findByIdWithDetails(productId);
  if (!product) {
    throw new NotFoundError(`상품 ID ${productId}를 찾을 수 없습니다`);
  }

  // 3. 현재 상태와 동일한지 확인
  if (product.product_status === status) {
    throw new ValidationError(`이미 ${status} 상태입니다`);
  }

  // 4. Repository 호출
  const updated = await productRepo.updateStatus(productId, status);

  // 5. BigInt 변환
  return {
    ...updated,
    product_id: updated.product_id.toString()
  };
}

/**
 * 상품 삭제 (부적절한 상품)
 * @param {number} productId - 상품 ID
 * @returns {Promise<Object>} 삭제 결과
 */
async function deleteProduct(productId) {
  // 1. 상품 존재 확인 및 상세 조회
  const product = await productRepo.findByIdWithDetails(productId);
  if (!product) {
    throw new NotFoundError(`상품 ID ${productId}를 찾을 수 없습니다`);
  }

  // 2. 비즈니스 규칙: 주문 이력이 있으면 삭제 불가
  if (product._count && product._count.order_items > 0) {
    throw new ValidationError(
      `주문 이력이 ${product._count.order_items}건 있는 상품은 삭제할 수 없습니다. 비활성화 처리를 권장합니다`
    );
  }

  // 3. 삭제 (CASCADE: ProductImg 자동 삭제, ShoppingCart 자동 삭제)
  await prisma.product.delete({
    where: { product_id: BigInt(productId) }
  });

  // 4. 반환
  return {
    product_id: productId.toString(),
    product_name: product.product_name,
    message: '상품이 삭제되었습니다'
  };
}

/**
 * 상품 통계 조회
 * @returns {Promise<Object>} 통계 정보 (퍼센티지 포함)
 */
async function getProductStatistics() {
  // 1. Repository 호출
  const stats = await productRepo.getStatistics();

  // 2. 비즈니스 로직: 퍼센티지 계산
  const total = stats.totalProducts || 1; // 0으로 나누기 방지
  const activeRate = (stats.activeProducts / total * 100).toFixed(1);
  const soldOutRate = (stats.soldOutProducts / total * 100).toFixed(1);
  const inactiveRate = (stats.inactiveProducts / total * 100).toFixed(1);

  // 3. 반환
  return {
    ...stats,
    activeRate: parseFloat(activeRate),
    soldOutRate: parseFloat(soldOutRate),
    inactiveRate: parseFloat(inactiveRate)
  };
}

/**
 * 카테고리별 상품 조회
 * @param {number} categoryId - 카테고리 ID
 * @param {Object} options - 페이징 옵션
 * @returns {Promise<Object>} 상품 목록
 */
async function getProductsByCategory(categoryId, options = {}) {
  return getProductList({
    ...options,
    categoryId
  });
}

/**
 * 판매사별 상품 조회
 * @param {number} tenantId - 판매사 ID
 * @param {Object} options - 페이징 옵션
 * @returns {Promise<Object>} 상품 목록
 */
async function getProductsByTenant(tenantId, options = {}) {
  return getProductList({
    ...options,
    tenantId
  });
}

/**
 * 상품 검색
 * @param {string} keyword - 검색 키워드
 * @param {number} [limit=10] - 결과 개수
 * @returns {Promise<Array>} 검색 결과
 */
async function searchProducts(keyword, limit = 10) {
  // 1. 키워드 검증
  if (!keyword || keyword.trim().length === 0) {
    throw new ValidationError('검색어를 입력해주세요');
  }

  if (keyword.length < 2) {
    throw new ValidationError('검색어는 2자 이상 입력해주세요');
  }

  // 2. Repository 호출
  const results = await productRepo.searchProducts(keyword.trim(), limit);

  // 3. BigInt 변환
  return results.map(convertProductBigInt);
}

module.exports = {
  getProductList,
  getProductById,
  updateProductStatus,
  deleteProduct,
  getProductStatistics,
  getProductsByCategory,
  getProductsByTenant,
  searchProducts
};
