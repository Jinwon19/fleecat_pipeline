const prisma = require('../../config/database');

/**
 * Admin Member Repository
 * 관리자용 회원 관리 데이터 접근 계층
 */

/**
 * 회원 목록 조회 (페이징, 필터링, 검색)
 * @param {Object} options - 조회 옵션
 * @param {number} [options.page=1] - 페이지 번호
 * @param {number} [options.limit=20] - 페이지당 항목 수
 * @param {string} [options.status] - 회원 상태 필터 (active/suspended/inactive)
 * @param {string} [options.role] - 회원 역할 필터 (buyer/seller/admin)
 * @param {string} [options.search] - 검색어 (이메일, 이름, 닉네임)
 * @returns {Promise<Object>} { members, total, page, totalPages }
 */
async function findAll(options = {}) {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      role,
      search
    } = options;

    const skip = (page - 1) * limit;
    const where = {};

    // 상태 필터
    if (status) {
      where.member_status = status;
    }

    // 역할 필터
    if (role) {
      where.member_account_role = role;
    }

    // 검색어 (이메일, 이름, 닉네임)
    if (search) {
      where.OR = [
        { member_email: { contains: search, mode: 'insensitive' } },
        { member_name: { contains: search, mode: 'insensitive' } },
        { member_nickname: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [members, total] = await Promise.all([
      prisma.member.findMany({
        where,
        skip,
        take: limit,
        orderBy: { member_created_at: 'desc' },
        select: {
          member_id: true,
          member_email: true,
          member_name: true,
          member_nickname: true,
          member_phone: true,
          member_account_type: true,
          member_account_role: true,
          member_status: true,
          member_last_login_at: true,
          member_created_at: true,
          company: {
            select: {
              company_id: true,
              company_name: true
            }
          },
          member_permissions: {
            select: {
              can_purchase: true,
              can_sell: true,
              is_account_active: true
            }
          }
        }
      }),
      prisma.member.count({ where })
    ]);

    return {
      members,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  } catch (error) {
    throw new Error(`Failed to find all members: ${error.message}`);
  }
}

/**
 * 회원 상세 조회 (관리자용 - 모든 정보 포함)
 * @param {number} memberId - 회원 ID
 * @returns {Promise<Object|null>} 회원 정보 또는 null
 */
async function findByIdWithDetails(memberId) {
  try {
    return await prisma.member.findUnique({
      where: { member_id: BigInt(memberId) },
      include: {
        company: true,
        member_permissions: true,
        member_addresses: {
          where: { member_address_status: 'active' },
          orderBy: { member_address_is_default: 'desc' }
        },
        tenant_members: {
          include: {
            tenant: {
              select: {
                tenant_id: true,
                tenant_name: true,
                tenant_status: true
              }
            }
          }
        },
        _count: {
          select: {
            orders: true,
            shopping_carts: true
          }
        }
      }
    });
  } catch (error) {
    throw new Error(`Failed to find member by ID: ${error.message}`);
  }
}

/**
 * 회원 상태 변경
 * @param {number} memberId - 회원 ID
 * @param {string} status - 변경할 상태 (active/suspended/inactive)
 * @returns {Promise<Object>} 수정된 회원 정보
 */
async function updateStatus(memberId, status) {
  try {
    return await prisma.member.update({
      where: { member_id: BigInt(memberId) },
      data: { member_status: status },
      select: {
        member_id: true,
        member_email: true,
        member_name: true,
        member_status: true,
        member_updated_at: true
      }
    });
  } catch (error) {
    throw new Error(`Failed to update member status: ${error.message}`);
  }
}

/**
 * 회원 역할 변경
 * @param {number} memberId - 회원 ID
 * @param {string} role - 변경할 역할 (buyer/seller/admin)
 * @returns {Promise<Object>} 수정된 회원 정보
 */
async function updateRole(memberId, role) {
  try {
    // 트랜잭션으로 member와 member_permissions 동시 업데이트
    return await prisma.$transaction(async (tx) => {
      // 1. member_account_role 업데이트
      const member = await tx.member.update({
        where: { member_id: BigInt(memberId) },
        data: { member_account_role: role },
        select: {
          member_id: true,
          member_email: true,
          member_name: true,
          member_account_role: true,
          member_updated_at: true
        }
      });

      // 2. member_permissions 업데이트
      const permissionUpdates = {
        can_purchase: true, // 모든 역할은 기본적으로 구매 가능
        can_sell: role === 'seller' || role === 'admin',
        can_product_manage: role === 'seller' || role === 'admin',
        can_order_manage: role === 'seller' || role === 'admin',
        can_member_manage: role === 'admin',
        can_system_config: role === 'admin',
        can_board_moderate: role === 'admin',
        can_review_manage: role === 'seller' || role === 'admin',
        can_promotion_manage: role === 'admin',
        can_statistics_view: role === 'seller' || role === 'admin'
      };

      // member_permission_role은 Int 타입이므로 변환
      const roleToInt = { buyer: 1, seller: 2, admin: 3 };

      await tx.memberPermission.upsert({
        where: { member_id: BigInt(memberId) },
        update: {
          member_permission_role: roleToInt[role],
          ...permissionUpdates
        },
        create: {
          member_id: BigInt(memberId),
          member_permission_role: roleToInt[role],
          ...permissionUpdates
        }
      });

      return member;
    });
  } catch (error) {
    throw new Error(`Failed to update member role: ${error.message}`);
  }
}

/**
 * 회원 통계 조회
 * @returns {Promise<Object>} 통계 정보
 */
async function getStatistics() {
  try {
    const [
      totalMembers,
      activeMembers,
      suspendedMembers,
      buyerCount,
      sellerCount,
      adminCount,
      recentMembers
    ] = await Promise.all([
      // 전체 회원 수
      prisma.member.count(),

      // 활성 회원 수
      prisma.member.count({
        where: { member_status: 'active' }
      }),

      // 정지된 회원 수
      prisma.member.count({
        where: { member_status: 'suspended' }
      }),

      // 역할별 회원 수
      prisma.member.count({
        where: { member_account_role: 'buyer' }
      }),
      prisma.member.count({
        where: { member_account_role: 'seller' }
      }),
      prisma.member.count({
        where: { member_account_role: 'admin' }
      }),

      // 최근 가입 회원 (7일 이내)
      prisma.member.count({
        where: {
          member_created_at: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    return {
      totalMembers,
      activeMembers,
      suspendedMembers,
      inactiveMembers: totalMembers - activeMembers - suspendedMembers,
      roleDistribution: {
        buyer: buyerCount,
        seller: sellerCount,
        admin: adminCount
      },
      recentMembers
    };
  } catch (error) {
    throw new Error(`Failed to get member statistics: ${error.message}`);
  }
}

/**
 * 회원 검색 (이메일, 이름, 닉네임)
 * @param {string} keyword - 검색 키워드
 * @param {number} [limit=10] - 결과 개수 제한
 * @returns {Promise<Array>} 검색된 회원 목록
 */
async function searchMembers(keyword, limit = 10) {
  try {
    return await prisma.member.findMany({
      where: {
        OR: [
          { member_email: { contains: keyword, mode: 'insensitive' } },
          { member_name: { contains: keyword, mode: 'insensitive' } },
          { member_nickname: { contains: keyword, mode: 'insensitive' } }
        ]
      },
      take: limit,
      select: {
        member_id: true,
        member_email: true,
        member_name: true,
        member_nickname: true,
        member_account_role: true,
        member_status: true
      },
      orderBy: { member_created_at: 'desc' }
    });
  } catch (error) {
    throw new Error(`Failed to search members: ${error.message}`);
  }
}

module.exports = {
  findAll,
  findByIdWithDetails,
  updateStatus,
  updateRole,
  getStatistics,
  searchMembers
};
