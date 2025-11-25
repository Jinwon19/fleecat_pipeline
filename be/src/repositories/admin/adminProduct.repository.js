const prisma = require('../../config/database');

/**
 * Admin Product Repository
 * 관리자용 상품 관리 데이터 접근 계층
 */

/**
 * 상품 목록 조회 (페이징, 필터링, 검색)
 * @param {Object} options - 조회 옵션
 * @param {number} [options.page=1] - 페이지 번호
 * @param {number} [options.limit=20] - 페이지당 항목 수
 * @param {string} [options.status] - 상품 상태 필터 (active/sold_out/inactive)
 * @param {number} [options.categoryId] - 카테고리 ID 필터
 * @param {number} [options.tenantId] - 판매사 ID 필터
 * @param {string} [options.search] - 검색어 (상품명, 판매사명)
 * @returns {Promise<Object>} { products, total, page, totalPages }
 */
async function findAll(options = {}) {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      categoryId,
      tenantId,
      search
    } = options;

    const skip = (page - 1) * limit;
    const where = {};

    // 상태 필터
    if (status) {
      where.product_status = status;
    }

    // 카테고리 필터
    if (categoryId) {
      where.category_id = BigInt(categoryId);
    }

    // 판매사 필터
    if (tenantId) {
      where.tenant_member = {
        tenant_id: BigInt(tenantId)
      };
    }

    // 검색어 (상품명 OR 판매사명)
    if (search) {
      where.OR = [
        { product_name: { contains: search, mode: 'insensitive' } },
        {
          tenant_member: {
            tenant: {
              tenant_name: { contains: search, mode: 'insensitive' }
            }
          }
        }
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { product_created_at: 'desc' },
        select: {
          product_id: true,
          product_name: true,
          product_price: true,
          product_status: true,
          product_quantity: true,
          product_created_at: true,
          category: {
            select: {
              category_id: true,
              category_name: true
            }
          },
          tenant_member: {
            select: {
              tenant_member_id: true,
              tenant: {
                select: {
                  tenant_id: true,
                  tenant_name: true,
                  tenant_status: true
                }
              },
              member: {
                select: {
                  member_id: true,
                  member_name: true,
                  member_email: true
                }
              }
            }
          },
          product_images: {
            take: 1,
            select: {
              product_img_id: true,
              product_id: true,
              product_img_url: true,
              product_image_sequence: true
            },
            orderBy: { product_image_sequence: 'asc' }
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
 * 상품 상세 조회 (관리자용 - 모든 정보 포함)
 * @param {number} productId - 상품 ID
 * @returns {Promise<Object|null>} 상품 정보 또는 null
 */
async function findByIdWithDetails(productId) {
  try {
    return await prisma.product.findUnique({
      where: { product_id: BigInt(productId) },
      include: {
        category: true,
        tenant_member: {
          include: {
            tenant: true,
            member: {
              select: {
                member_id: true,
                member_email: true,
                member_name: true,
                member_phone: true,
                member_status: true
              }
            }
          }
        },
        product_images: {
          orderBy: { product_image_sequence: 'asc' }
        },
        _count: {
          select: {
            shopping_carts: true
          }
        }
      }
    });
  } catch (error) {
    throw new Error(`Failed to find product by ID: ${error.message}`);
  }
}

/**
 * 상품 상태 변경
 * @param {number} productId - 상품 ID
 * @param {string} status - 변경할 상태 (active/sold_out/inactive)
 * @returns {Promise<Object>} 수정된 상품 정보
 */
async function updateStatus(productId, status) {
  try {
    return await prisma.product.update({
      where: { product_id: BigInt(productId) },
      data: { product_status: status },
      select: {
        product_id: true,
        product_name: true,
        product_status: true,
        product_updated_at: true
      }
    });
  } catch (error) {
    throw new Error(`Failed to update product status: ${error.message}`);
  }
}

/**
 * 상품 통계 조회
 * @returns {Promise<Object>} 통계 정보
 */
async function getStatistics() {
  try {
    const [
      totalProducts,
      activeProducts,
      soldOutProducts,
      inactiveProducts,
      categoryStats,
      recentProducts
    ] = await Promise.all([
      // 전체 상품 수
      prisma.product.count(),

      // 활성 상품 수
      prisma.product.count({
        where: { product_status: 'active' }
      }),

      // 품절 상품 수
      prisma.product.count({
        where: { product_status: 'sold_out' }
      }),

      // 비활성 상품 수
      prisma.product.count({
        where: { product_status: 'inactive' }
      }),

      // 카테고리별 상품 수 (상위 10개)
      prisma.product.groupBy({
        by: ['category_id'],
        _count: { product_id: true },
        orderBy: { _count: { product_id: 'desc' } },
        take: 10
      }),

      // 최근 등록 상품 (7일 이내)
      prisma.product.count({
        where: {
          product_created_at: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    // 카테고리 통계를 객체로 변환
    const categoryDistribution = {};
    for (const stat of categoryStats) {
      categoryDistribution[stat.category_id.toString()] = stat._count.product_id;
    }

    return {
      totalProducts,
      activeProducts,
      soldOutProducts,
      inactiveProducts,
      categoryDistribution,
      recentProducts
    };
  } catch (error) {
    throw new Error(`Failed to get product statistics: ${error.message}`);
  }
}

/**
 * 카테고리별 상품 조회
 * @param {number} categoryId - 카테고리 ID
 * @param {Object} options - 조회 옵션
 * @param {number} [options.page=1] - 페이지 번호
 * @param {number} [options.limit=20] - 페이지당 항목 수
 * @returns {Promise<Object>} { products, total, page, totalPages }
 */
async function getProductsByCategory(categoryId, options = {}) {
  return findAll({
    ...options,
    categoryId
  });
}

/**
 * 판매사별 상품 조회
 * @param {number} tenantId - 판매사 ID
 * @param {Object} options - 조회 옵션
 * @param {number} [options.page=1] - 페이지 번호
 * @param {number} [options.limit=20] - 페이지당 항목 수
 * @returns {Promise<Object>} { products, total, page, totalPages }
 */
async function getProductsByTenant(tenantId, options = {}) {
  return findAll({
    ...options,
    tenantId
  });
}

/**
 * 상품 검색
 * @param {string} keyword - 검색 키워드
 * @param {number} [limit=10] - 결과 개수 제한
 * @returns {Promise<Array>} 검색된 상품 목록
 */
async function searchProducts(keyword, limit = 10) {
  try {
    return await prisma.product.findMany({
      where: {
        OR: [
          { product_name: { contains: keyword, mode: 'insensitive' } },
          { product_description: { contains: keyword, mode: 'insensitive' } },
          {
            tenant_member: {
              tenant: {
                tenant_name: { contains: keyword, mode: 'insensitive' }
              }
            }
          }
        ]
      },
      take: limit,
      select: {
        product_id: true,
        product_name: true,
        product_price: true,
        product_status: true,
        tenant_member: {
          select: {
            tenant: {
              select: {
                tenant_name: true
              }
            }
          }
        }
      },
      orderBy: { product_created_at: 'desc' }
    });
  } catch (error) {
    throw new Error(`Failed to search products: ${error.message}`);
  }
}

module.exports = {
  findAll,
  findByIdWithDetails,
  updateStatus,
  getStatistics,
  getProductsByCategory,
  getProductsByTenant,
  searchProducts
};
