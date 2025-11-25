const productRepository = require('../repositories/product.repository');
const productImgRepository = require('../repositories/productImg.repository');
const categoryRepository = require('../repositories/category.repository');
const tenantMemberRepository = require('../repositories/tenantMember.repository');
const { ValidationError, NotFoundError, ForbiddenError } = require('../utils/errors');

/**
 * Product Service
 * 상품 등록 및 관리 비즈니스 로직
 */

/**
 * 상품 등록 (승인된 TenantMember만 가능)
 * @param {number} memberId - 회원 ID
 * @param {Object} data - 상품 데이터
 * @returns {Promise<Object>} 생성된 상품 정보
 */
async function createProduct(memberId, data) {
  const { tenant_member_id, category_id, product_name, product_price } = data;

  // 1. 필수 필드 확인
  if (!tenant_member_id) {
    throw new ValidationError('Tenant member ID is required');
  }

  if (!category_id) {
    throw new ValidationError('Category ID is required');
  }

  if (!product_name || product_name.trim() === '') {
    throw new ValidationError('Product name is required');
  }

  if (product_price === undefined || product_price === null) {
    throw new ValidationError('Product price is required');
  }

  if (product_price < 0) {
    throw new ValidationError('Product price must be non-negative');
  }

  // 2. TenantMember 존재 확인
  const tenantMember = await tenantMemberRepository.findById(tenant_member_id);

  if (!tenantMember) {
    throw new NotFoundError('Tenant member not found');
  }

  // 3. 본인 확인
  if (Number(tenantMember.member_id) !== memberId) {
    throw new ForbiddenError('You can only create products for your own tenant membership');
  }

  // 4. TenantMember 승인 상태 확인
  if (tenantMember.tenant_member_approval_status !== 'approved') {
    throw new ForbiddenError('Only approved tenant members can create products');
  }

  // 5. 카테고리 존재 확인
  const category = await categoryRepository.findById(category_id);

  if (!category) {
    throw new NotFoundError('Category not found');
  }

  // 6. 비활성 카테고리 확인
  if (!category.category_is_active) {
    throw new ValidationError('Cannot create product in inactive category');
  }

  // 7. 재고 검증
  const product_quantity = data.product_quantity || 0;
  if (product_quantity < 0) {
    throw new ValidationError('Product quantity must be non-negative');
  }

  // 8. 상품 생성 (기본적으로 inactive 상태)
  const product = await productRepository.create({
    tenant_member_id,
    category_id,
    product_name: product_name.trim(),
    product_description: data.product_description?.trim() || null,
    product_price,
    product_quantity,
    product_status: 'inactive' // 이미지 업로드 후 활성화 권장
  });

  // BigInt 변환
  return convertBigIntToNumber(product);
}

/**
 * 상품 상세 조회 (조회수 증가 포함)
 * @param {number} productId - 상품 ID
 * @param {Object} options - 옵션
 * @param {boolean} [options.incrementView=true] - 조회수 증가 여부
 * @returns {Promise<Object>} 상품 정보
 */
async function getProductById(productId, options = {}) {
  const { incrementView = true } = options;

  const product = await productRepository.findById(productId);

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  // 조회수 증가 (비동기, 에러 무시)
  if (incrementView && product.product_status === 'active') {
    productRepository.incrementViewCount(productId).catch(() => {
      // 조회수 증가 실패해도 상품 조회는 정상 처리
    });
  }

  // BigInt 변환
  return convertBigIntToNumber(product);
}

/**
 * 내 상품 목록 조회 (판매자용)
 * @param {number} memberId - 회원 ID
 * @param {number} tenantMemberId - TenantMember ID
 * @param {Object} options - 조회 옵션
 * @returns {Promise<Object>} { products, total, page, totalPages }
 */
async function getMyProducts(memberId, tenantMemberId, options = {}) {
  // 1. TenantMember 존재 확인
  const tenantMember = await tenantMemberRepository.findById(tenantMemberId);

  if (!tenantMember) {
    throw new NotFoundError('Tenant member not found');
  }

  // 2. 본인 확인
  if (Number(tenantMember.member_id) !== memberId) {
    throw new ForbiddenError('You can only view your own products');
  }

  // 3. 상품 목록 조회
  const result = await productRepository.findByTenantMemberId(tenantMemberId, {
    page: options.page || 1,
    limit: options.limit || 20,
    status: options.status // 모든 상태 or 특정 상태
  });

  // BigInt 변환
  return {
    ...result,
    products: result.products.map(product => convertBigIntToNumber(product))
  };
}

/**
 * 전체 상품 목록 조회 (Public, 필터링/정렬/페이징 지원)
 * @param {Object} options - 조회 옵션
 * @returns {Promise<Object>} { products, total, page, totalPages }
 */
async function getAllProducts(options = {}) {
  const result = await productRepository.findAll({
    page: options.page || 1,
    limit: options.limit || 20,
    status: options.status || 'active', // 기본: 활성 상품만
    categoryId: options.categoryId,
    tenantId: options.tenantId,
    minPrice: options.minPrice,
    maxPrice: options.maxPrice,
    search: options.search,
    sortBy: options.sortBy || 'created_at',
    sortOrder: options.sortOrder || 'desc'
  });

  // BigInt 변환
  return {
    ...result,
    products: result.products.map(product => convertBigIntToNumber(product))
  };
}

/**
 * 카테고리별 상품 목록 조회 (Public)
 * @param {number} categoryId - 카테고리 ID
 * @param {Object} options - 조회 옵션
 * @returns {Promise<Object>} { products, total, page, totalPages }
 */
async function getProductsByCategory(categoryId, options = {}) {
  // 카테고리 존재 확인
  const category = await categoryRepository.findById(categoryId);

  if (!category) {
    throw new NotFoundError('Category not found');
  }

  const result = await productRepository.findByCategoryId(categoryId, {
    page: options.page || 1,
    limit: options.limit || 20
  });

  // BigInt 변환
  return {
    ...result,
    products: result.products.map(product => convertBigIntToNumber(product))
  };
}

/**
 * 상품 수정 (본인만 가능)
 * @param {number} productId - 상품 ID
 * @param {number} memberId - 회원 ID
 * @param {Object} updateData - 수정할 데이터
 * @returns {Promise<Object>} 수정된 상품 정보
 */
async function updateProduct(productId, memberId, updateData) {
  // 1. 상품 존재 확인
  const product = await productRepository.findById(productId);

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  // 2. 본인 확인 (상품의 판매자 == 요청자)
  const tenantMember = product.tenant_member;

  if (Number(tenantMember.member_id) !== memberId) {
    throw new ForbiddenError('You can only update your own products');
  }

  // 3. 수정 가능한 필드만 추출
  const allowedFields = {
    product_name: updateData.product_name?.trim(),
    product_description: updateData.product_description?.trim(),
    product_price: updateData.product_price,
    product_quantity: updateData.product_quantity,
    category_id: updateData.category_id
  };

  // undefined 제거
  const data = {};
  Object.keys(allowedFields).forEach(key => {
    if (allowedFields[key] !== undefined) {
      data[key] = allowedFields[key];
    }
  });

  // 4. 수정할 내용이 없으면 에러
  if (Object.keys(data).length === 0) {
    throw new ValidationError('No fields to update');
  }

  // 5. 필드별 검증
  if (data.product_name !== undefined && data.product_name === '') {
    throw new ValidationError('Product name cannot be empty');
  }

  if (data.product_price !== undefined && data.product_price < 0) {
    throw new ValidationError('Product price must be non-negative');
  }

  if (data.product_quantity !== undefined && data.product_quantity < 0) {
    throw new ValidationError('Product quantity must be non-negative');
  }

  // 6. 카테고리 변경 시 유효성 확인
  if (data.category_id) {
    const category = await categoryRepository.findById(data.category_id);

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    if (!category.category_is_active) {
      throw new ValidationError('Cannot move product to inactive category');
    }
  }

  // 7. 상품 수정
  const updated = await productRepository.update(productId, data);

  // BigInt 변환
  return convertBigIntToNumber(updated);
}

/**
 * 상품 상태 변경 (본인만 가능)
 * @param {number} productId - 상품 ID
 * @param {number} memberId - 회원 ID
 * @param {string} status - 상태 (active/sold_out/inactive)
 * @returns {Promise<Object>} 수정된 상품 정보
 */
async function updateProductStatus(productId, memberId, status) {
  // 1. 상태 값 검증
  const validStatuses = ['active', 'sold_out', 'inactive'];
  if (!validStatuses.includes(status)) {
    throw new ValidationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  // 2. 상품 존재 확인
  const product = await productRepository.findById(productId);

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  // 3. 본인 확인
  const tenantMember = product.tenant_member;

  if (Number(tenantMember.member_id) !== memberId) {
    throw new ForbiddenError('You can only update status of your own products');
  }

  // 4. 상태 변경
  const updated = await productRepository.updateStatus(productId, status);

  // BigInt 변환
  return convertBigIntToNumber(updated);
}

/**
 * 상품 삭제 (본인만 가능)
 * @param {number} productId - 상품 ID
 * @param {number} memberId - 회원 ID
 * @returns {Promise<Object>} 삭제 결과
 */
async function deleteProduct(productId, memberId) {
  // 1. 상품 존재 확인
  const product = await productRepository.findById(productId);

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  // 2. 본인 확인
  const tenantMember = product.tenant_member;

  if (Number(tenantMember.member_id) !== memberId) {
    throw new ForbiddenError('You can only delete your own products');
  }

  // 3. 주문 내역 확인 (주문이 있으면 삭제 불가)
  // TODO: Order Repository 구현 후 추가
  // const orderCount = await orderRepository.countByProductId(productId);
  // if (orderCount > 0) {
  //   throw new ValidationError('Cannot delete product with existing orders');
  // }

  // 4. 상품 이미지 삭제 (CASCADE)
  await productImgRepository.deleteByProductId(productId);

  // 5. 상품 삭제
  await productRepository.deleteById(productId);

  return {
    message: 'Product deleted successfully',
    deleted_product: {
      product_id: Number(product.product_id),
      product_name: product.product_name
    }
  };
}

/**
 * 상품 이미지 업로드
 * @param {number} productId - 상품 ID
 * @param {number} memberId - 회원 ID
 * @param {Array<Object>} images - 이미지 목록 [{ url, sequence }, ...]
 * @returns {Promise<Object>} 업로드된 이미지 목록
 */
async function uploadProductImages(productId, memberId, images) {
  // 1. 상품 존재 확인
  const product = await productRepository.findById(productId);

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  // 2. 본인 확인
  const tenantMember = product.tenant_member;

  if (Number(tenantMember.member_id) !== memberId) {
    throw new ForbiddenError('You can only upload images to your own products');
  }

  // 3. 이미지 배열 검증
  if (!Array.isArray(images) || images.length === 0) {
    throw new ValidationError('Images array is required and must not be empty');
  }

  // 4. 이미지 개수 제한 (최대 10개)
  const currentImageCount = await productImgRepository.countByProductId(productId);
  const newImageCount = images.length;

  if (currentImageCount + newImageCount > 10) {
    throw new ValidationError('Maximum 10 images per product');
  }

  // 5. 각 이미지 업로드
  const uploadedImages = [];

  for (const image of images) {
    if (!image.url || image.url.trim() === '') {
      throw new ValidationError('Image URL is required');
    }

    const uploaded = await productImgRepository.create({
      product_id: productId,
      product_img_url: image.url.trim(),
      product_image_sequence: image.sequence // undefined면 자동 계산됨
    });

    uploadedImages.push(convertBigIntToNumber(uploaded));
  }

  return {
    message: `${uploadedImages.length} images uploaded successfully`,
    images: uploadedImages
  };
}

/**
 * 상품 이미지 삭제
 * @param {number} productImgId - 이미지 ID
 * @param {number} memberId - 회원 ID
 * @returns {Promise<Object>} 삭제 결과
 */
async function deleteProductImage(productImgId, memberId) {
  // 1. 이미지 존재 확인
  const image = await productImgRepository.findById(productImgId);

  if (!image) {
    throw new NotFoundError('Product image not found');
  }

  // 2. 상품 조회
  const product = await productRepository.findById(Number(image.product.product_id));

  // 3. 본인 확인
  if (Number(product.tenant_member.member_id) !== memberId) {
    throw new ForbiddenError('You can only delete images from your own products');
  }

  // 4. 이미지 삭제
  await productImgRepository.deleteById(productImgId);

  return {
    message: 'Product image deleted successfully',
    deleted_image: {
      product_img_id: Number(image.product_img_id),
      product_img_url: image.product_img_url
    }
  };
}

/**
 * 상품 이미지 순서 재배치
 * @param {number} productId - 상품 ID
 * @param {number} memberId - 회원 ID
 * @param {Array<Object>} updates - 순서 업데이트 목록 [{ imageId, sequence }, ...]
 * @returns {Promise<Object>} 업데이트 결과
 */
async function reorderProductImages(productId, memberId, updates) {
  // 1. 상품 존재 확인
  const product = await productRepository.findById(productId);

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  // 2. 본인 확인
  const tenantMember = product.tenant_member;

  if (Number(tenantMember.member_id) !== memberId) {
    throw new ForbiddenError('You can only reorder images of your own products');
  }

  // 3. 업데이트 배열 검증
  if (!Array.isArray(updates) || updates.length === 0) {
    throw new ValidationError('Updates array is required and must not be empty');
  }

  // 4. 순서 재배치
  const count = await productImgRepository.reorderSequences(productId, updates);

  return {
    message: `${count} images reordered successfully`,
    updated_count: count
  };
}

/**
 * 상품 통계 조회
 * @param {number} productId - 상품 ID
 * @returns {Promise<Object>} 상품 통계
 */
async function getProductStats(productId) {
  const product = await productRepository.findById(productId);

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  const imageCount = await productImgRepository.countByProductId(productId);

  // TODO: Order Repository 구현 후 추가
  // const orderCount = await orderRepository.countByProductId(productId);
  const orderCount = 0;

  return {
    product_id: Number(product.product_id),
    product_name: product.product_name,
    product_status: product.product_status,
    product_view_count: Number(product.product_view_count),
    product_quantity: Number(product.product_quantity),
    image_count: imageCount,
    order_count: orderCount,
    tenant: {
      tenant_id: Number(product.tenant_member.tenant.tenant_id),
      tenant_name: product.tenant_member.tenant.tenant_name
    },
    seller: {
      member_id: Number(product.tenant_member.member.member_id),
      member_name: product.tenant_member.member.member_name
    }
  };
}

/**
 * BigInt를 Number로 변환
 */
function convertBigIntToNumber(obj) {
  if (!obj) return null;

  const converted = { ...obj };

  // 기본 ID 변환
  if (converted.product_id !== undefined) {
    converted.product_id = Number(converted.product_id);
  }

  if (converted.tenant_member_id !== undefined) {
    converted.tenant_member_id = Number(converted.tenant_member_id);
  }

  if (converted.category_id !== undefined) {
    converted.category_id = Number(converted.category_id);
  }

  if (converted.product_img_id !== undefined) {
    converted.product_img_id = Number(converted.product_img_id);
  }

  // tenant_member 변환
  if (converted.tenant_member) {
    converted.tenant_member = {
      ...converted.tenant_member,
      tenant_member_id: Number(converted.tenant_member.tenant_member_id),
      tenant_id: Number(converted.tenant_member.tenant_id),
      member_id: Number(converted.tenant_member.member_id)
    };

    // tenant 변환
    if (converted.tenant_member.tenant) {
      converted.tenant_member.tenant = {
        ...converted.tenant_member.tenant,
        tenant_id: Number(converted.tenant_member.tenant.tenant_id)
      };
    }

    // member 변환
    if (converted.tenant_member.member) {
      converted.tenant_member.member = {
        ...converted.tenant_member.member,
        member_id: Number(converted.tenant_member.member.member_id)
      };
    }
  }

  // category 변환
  if (converted.category) {
    converted.category = {
      ...converted.category,
      category_id: Number(converted.category.category_id),
      parent_category_id: converted.category.parent_category_id
        ? Number(converted.category.parent_category_id)
        : null
    };
  }

  // product_images 변환
  if (converted.product_images && Array.isArray(converted.product_images)) {
    converted.product_images = converted.product_images.map(img => ({
      ...img,
      product_img_id: Number(img.product_img_id),
      product_id: Number(img.product_id)
    }));
  }

  // product (for image) 변환
  if (converted.product) {
    converted.product = {
      ...converted.product,
      product_id: Number(converted.product.product_id),
      tenant_member_id: Number(converted.product.tenant_member_id)
    };
  }

  return converted;
}

module.exports = {
  createProduct,
  getProductById,
  getMyProducts,
  getAllProducts,
  getProductsByCategory,
  updateProduct,
  updateProductStatus,
  deleteProduct,
  uploadProductImages,
  deleteProductImage,
  reorderProductImages,
  getProductStats
};
