const prisma = require('../config/database');

/**
 * Product Repository
 * product 테이블에 대한 데이터 접근 계층
 * 멀티테넌시 환경에서 상품 데이터를 안전하게 관리
 */

/**
 * ID로 상품 조회 (상세 정보 포함)
 * @param {number} productId - 상품 ID
 * @returns {Promise<Object|null>} 상품 정보 또는 null
 */
async function findById(productId) {
  try {
    return await prisma.product.findUnique({
      where: { product_id: BigInt(productId) },
      include: {
        tenant_member: {
          include: {
            tenant: true,
            member: {
              select: {
                member_id: true,
                member_name: true,
                member_nickname: true,
                member_email: true
              }
            }
          }
        },
        category: true,
        product_images: {
          orderBy: {
            product_image_sequence: 'asc'
          }
        }
      }
    });
  } catch (error) {
    throw new Error(`Failed to find product by ID: ${error.message}`);
  }
}

/**
 * 특정 판매자(TenantMember)의 상품 목록 조회
 * @param {number} tenantMemberId - 판매자 ID
 * @param {Object} options - 페이징 옵션
 * @param {number} [options.page=1] - 페이지 번호
 * @param {number} [options.limit=20] - 페이지당 항목 수
 * @param {string} [options.status] - 상태 필터 (active/sold_out/inactive)
 * @returns {Promise<Object>} { products, total, page, totalPages }
 */
async function findByTenantMemberId(tenantMemberId, options = {}) {
  try {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where = {
      tenant_member_id: BigInt(tenantMemberId)
    };

    if (options.status) {
      where.product_status = options.status;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { product_created_at: 'desc' },
        include: {
          category: true,
          product_images: {
            orderBy: {
              product_image_sequence: 'asc'
            }
          }
        }
      }),
      prisma.product.count({ where })
    ]);

    return {
      products,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  } catch (error) {
    throw new Error(`Failed to find products by tenant member: ${error.message}`);
  }
}

/**
 * 카테고리별 상품 목록 조회
 * @param {number} categoryId - 카테고리 ID
 * @param {Object} options - 페이징 및 필터 옵션
 * @returns {Promise<Object>} { products, total, page, totalPages }
 */
async function findByCategoryId(categoryId, options = {}) {
  try {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where = {
      category_id: BigInt(categoryId),
      product_status: 'active' // 활성 상품만 (공개용)
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { product_created_at: 'desc' },
        include: {
          tenant_member: {
            include: {
              tenant: true,
              member: {
                select: {
                  member_name: true,
                  member_nickname: true
                }
              }
            }
          },
          category: true,
          product_images: {
            orderBy: {
              product_image_sequence: 'asc'
            }
          }
        }
      }),
      prisma.product.count({ where })
    ]);

    return {
      products,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  } catch (error) {
    throw new Error(`Failed to find products by category: ${error.message}`);
  }
}

/**
 * 전체 상품 목록 조회 (필터링, 정렬, 페이징 지원)
 * @param {Object} options - 조회 옵션
 * @param {number} [options.page=1] - 페이지 번호
 * @param {number} [options.limit=20] - 페이지당 항목 수
 * @param {string} [options.status] - 상태 필터 (active/sold_out/inactive)
 * @param {number} [options.categoryId] - 카테고리 필터
 * @param {number} [options.tenantId] - 판매사 필터
 * @param {number} [options.minPrice] - 최소 가격
 * @param {number} [options.maxPrice] - 최대 가격
 * @param {string} [options.search] - 검색어 (상품명, 설명)
 * @param {string} [options.sortBy='created_at'] - 정렬 기준 (price/created_at/view_count)
 * @param {string} [options.sortOrder='desc'] - 정렬 방향 (asc/desc)
 * @returns {Promise<Object>} { products, total, page, totalPages }
 */
async function findAll(options = {}) {
  try {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    // Where 조건 구성
    const where = {};

    // 상태 필터
    if (options.status) {
      where.product_status = options.status;
    } else {
      // 기본적으로 활성 상품만 (공개용)
      where.product_status = 'active';
    }

    // 카테고리 필터
    if (options.categoryId) {
      where.category_id = BigInt(options.categoryId);
    }

    // 판매사 필터
    if (options.tenantId) {
      where.tenant_member = {
        tenant_id: BigInt(options.tenantId)
      };
    }

    // 가격 범위 필터
    if (options.minPrice !== undefined || options.maxPrice !== undefined) {
      where.product_price = {};
      if (options.minPrice !== undefined) {
        where.product_price.gte = options.minPrice;
      }
      if (options.maxPrice !== undefined) {
        where.product_price.lte = options.maxPrice;
      }
    }

    // 검색어 필터 (상품명, 설명)
    if (options.search) {
      where.OR = [
        { product_name: { contains: options.search, mode: 'insensitive' } },
        { product_description: { contains: options.search, mode: 'insensitive' } }
      ];
    }

    // 정렬 설정
    const sortBy = options.sortBy || 'created_at';
    const sortOrder = options.sortOrder || 'desc';

    const orderBy = {};
    switch (sortBy) {
      case 'price':
        orderBy.product_price = sortOrder;
        break;
      case 'view_count':
        orderBy.product_view_count = sortOrder;
        break;
      case 'created_at':
      default:
        orderBy.product_created_at = sortOrder;
        break;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          tenant_member: {
            include: {
              tenant: true,
              member: {
                select: {
                  member_name: true,
                  member_nickname: true
                }
              }
            }
          },
          category: true,
          product_images: {
            orderBy: {
              product_image_sequence: 'asc'
            }
          }
        }
      }),
      prisma.product.count({ where })
    ]);

    return {
      products,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  } catch (error) {
    throw new Error(`Failed to find all products: ${error.message}`);
  }
}

/**
 * 상품 생성
 * @param {Object} productData - 상품 데이터
 * @param {number} productData.tenant_member_id - 판매자 ID
 * @param {number} productData.category_id - 카테고리 ID
 * @param {string} productData.product_name - 상품명
 * @param {string} [productData.product_description] - 상품 설명
 * @param {number} productData.product_price - 가격
 * @param {number} [productData.product_quantity=0] - 재고 수량
 * @param {string} [productData.product_status='inactive'] - 상태
 * @returns {Promise<Object>} 생성된 상품 정보
 */
async function create(productData) {
  try {
    return await prisma.product.create({
      data: {
        tenant_member_id: BigInt(productData.tenant_member_id),
        category_id: BigInt(productData.category_id),
        product_name: productData.product_name,
        product_description: productData.product_description || null,
        product_price: productData.product_price,
        product_quantity: productData.product_quantity || 0,
        product_status: productData.product_status || 'inactive',
        product_view_count: 0
      },
      include: {
        tenant_member: {
          include: {
            tenant: true,
            member: {
              select: {
                member_name: true,
                member_nickname: true
              }
            }
          }
        },
        category: true
      }
    });
  } catch (error) {
    throw new Error(`Failed to create product: ${error.message}`);
  }
}

/**
 * 상품 정보 수정
 * @param {number} productId - 상품 ID
 * @param {Object} updateData - 수정할 데이터
 * @param {string} [updateData.product_name] - 상품명
 * @param {string} [updateData.product_description] - 상품 설명
 * @param {number} [updateData.product_price] - 가격
 * @param {number} [updateData.product_quantity] - 재고 수량
 * @param {number} [updateData.category_id] - 카테고리 ID
 * @returns {Promise<Object>} 수정된 상품 정보
 */
async function update(productId, updateData) {
  try {
    const data = {};

    if (updateData.product_name !== undefined) {
      data.product_name = updateData.product_name;
    }

    if (updateData.product_description !== undefined) {
      data.product_description = updateData.product_description;
    }

    if (updateData.product_price !== undefined) {
      data.product_price = updateData.product_price;
    }

    if (updateData.product_quantity !== undefined) {
      data.product_quantity = updateData.product_quantity;
    }

    if (updateData.category_id !== undefined) {
      data.category_id = BigInt(updateData.category_id);
    }

    return await prisma.product.update({
      where: { product_id: BigInt(productId) },
      data,
      include: {
        tenant_member: {
          include: {
            tenant: true
          }
        },
        category: true,
        product_images: {
          orderBy: {
            product_image_sequence: 'asc'
          }
        }
      }
    });
  } catch (error) {
    throw new Error(`Failed to update product: ${error.message}`);
  }
}

/**
 * 상품 상태 변경
 * @param {number} productId - 상품 ID
 * @param {string} status - 상태 (active/sold_out/inactive)
 * @returns {Promise<Object>} 수정된 상품 정보
 */
async function updateStatus(productId, status) {
  try {
    return await prisma.product.update({
      where: { product_id: BigInt(productId) },
      data: { product_status: status },
      include: {
        category: true,
        product_images: {
          orderBy: {
            product_image_sequence: 'asc'
          }
        }
      }
    });
  } catch (error) {
    throw new Error(`Failed to update product status: ${error.message}`);
  }
}

/**
 * 상품 삭제 (Hard Delete)
 * @param {number} productId - 상품 ID
 * @returns {Promise<Object>} 삭제된 상품 정보
 */
async function deleteById(productId) {
  try {
    return await prisma.product.delete({
      where: { product_id: BigInt(productId) }
    });
  } catch (error) {
    throw new Error(`Failed to delete product: ${error.message}`);
  }
}

/**
 * 상품 조회수 증가
 * @param {number} productId - 상품 ID
 * @returns {Promise<Object>} 수정된 상품 정보
 */
async function incrementViewCount(productId) {
  try {
    return await prisma.product.update({
      where: { product_id: BigInt(productId) },
      data: {
        product_view_count: {
          increment: 1
        }
      }
    });
  } catch (error) {
    throw new Error(`Failed to increment product view count: ${error.message}`);
  }
}

/**
 * 상품 존재 여부 확인
 * @param {number} productId - 상품 ID
 * @returns {Promise<boolean>} 존재 여부
 */
async function existsById(productId) {
  try {
    const count = await prisma.product.count({
      where: { product_id: BigInt(productId) }
    });
    return count > 0;
  } catch (error) {
    throw new Error(`Failed to check product existence: ${error.message}`);
  }
}

/**
 * 판매자의 상품 개수 조회
 * @param {number} tenantMemberId - 판매자 ID
 * @param {string} [status] - 상태 필터 (선택)
 * @returns {Promise<number>} 상품 개수
 */
async function countByTenantMemberId(tenantMemberId, status = null) {
  try {
    const where = {
      tenant_member_id: BigInt(tenantMemberId)
    };

    if (status) {
      where.product_status = status;
    }

    return await prisma.product.count({ where });
  } catch (error) {
    throw new Error(`Failed to count products by tenant member: ${error.message}`);
  }
}

/**
 * 카테고리별 상품 개수 조회
 * @param {number} categoryId - 카테고리 ID
 * @param {string} [status='active'] - 상태 필터
 * @returns {Promise<number>} 상품 개수
 */
async function countByCategoryId(categoryId, status = 'active') {
  try {
    const where = {
      category_id: BigInt(categoryId),
      product_status: status
    };

    return await prisma.product.count({ where });
  } catch (error) {
    throw new Error(`Failed to count products by category: ${error.message}`);
  }
}

module.exports = {
  findById,
  findByTenantMemberId,
  findByCategoryId,
  findAll,
  create,
  update,
  updateStatus,
  deleteById,
  incrementViewCount,
  existsById,
  countByTenantMemberId,
  countByCategoryId
};
