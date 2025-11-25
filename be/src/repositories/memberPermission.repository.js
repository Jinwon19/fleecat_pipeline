const prisma = require('../config/database');

/**
 * MemberPermission Repository
 * member_permission 테이블에 대한 데이터 접근 계층
 */

/**
 * 특정 회원의 모든 권한 조회
 * @param {number} memberId - 회원 ID
 * @returns {Promise<Array>} 권한 목록
 */
async function findByMemberId(memberId) {
  try {
    return await prisma.memberPermission.findMany({
      where: { member_id: BigInt(memberId) },
      orderBy: { member_permission_created_at: 'asc' }
    });
  } catch (error) {
    throw new Error(`Failed to find permissions by member ID: ${error.message}`);
  }
}

/**
 * 권한 ID로 조회
 * @param {number} permissionId - 권한 ID
 * @returns {Promise<Object|null>} 권한 정보 또는 null
 */
async function findById(permissionId) {
  try {
    return await prisma.memberPermission.findUnique({
      where: { member_permission_id: BigInt(permissionId) },
      include: {
        member: {
          select: {
            member_id: true,
            member_email: true,
            member_nickname: true
          }
        }
      }
    });
  } catch (error) {
    throw new Error(`Failed to find permission by ID: ${error.message}`);
  }
}

/**
 * 특정 회원이 특정 역할을 가지고 있는지 확인
 * @param {number} memberId - 회원 ID
 * @param {string} role - 역할 ('buyer', 'seller', 'admin')
 * @returns {Promise<boolean>} 역할 보유 여부
 */
async function hasRole(memberId, role) {
  try {
    const count = await prisma.memberPermission.count({
      where: {
        member_id: BigInt(memberId),
        permission_role: role
      }
    });
    return count > 0;
  } catch (error) {
    throw new Error(`Failed to check role: ${error.message}`);
  }
}

/**
 * 특정 회원의 주 역할(Primary Role) 조회
 * 우선순위: seller > admin > buyer
 * @param {number} memberId - 회원 ID
 * @returns {Promise<string>} 주 역할 ('buyer', 'seller', 'admin')
 */
async function getPrimaryRole(memberId) {
  try {
    const permissions = await findByMemberId(memberId);

    if (permissions.length === 0) {
      return 'buyer'; // 기본값
    }

    // Int → String 변환: 1=buyer, 2=seller, 3=admin
    const roleMap = { 1: 'buyer', 2: 'seller', 3: 'admin' };
    const roles = permissions.map(p => roleMap[p.member_permission_role] || 'buyer');

    // 우선순위: seller > admin > buyer
    if (roles.includes('seller')) return 'seller';
    if (roles.includes('admin')) return 'admin';
    return 'buyer';
  } catch (error) {
    throw new Error(`Failed to get primary role: ${error.message}`);
  }
}

/**
 * 모든 역할 목록 조회
 * @param {number} memberId - 회원 ID
 * @returns {Promise<Array<string>>} 역할 문자열 배열 ['buyer', 'seller']
 */
async function getRoles(memberId) {
  try {
    const permissions = await findByMemberId(memberId);
    // Int → String 변환: 1=buyer, 2=seller, 3=admin
    const roleMap = { 1: 'buyer', 2: 'seller', 3: 'admin' };
    return permissions.map(p => roleMap[p.member_permission_role] || 'buyer');
  } catch (error) {
    throw new Error(`Failed to get roles: ${error.message}`);
  }
}

/**
 * 새 권한 생성
 * @param {Object} permissionData - 권한 데이터
 * @param {number} permissionData.member_id - 회원 ID
 * @param {string} permissionData.permission_role - 역할 ('buyer', 'seller', 'admin')
 * @returns {Promise<Object>} 생성된 권한 정보
 */
async function create(permissionData) {
  try {
    // role을 숫자로 변환: buyer=1, seller=2, admin=3
    const roleMap = { 'buyer': 1, 'seller': 2, 'admin': 3 };
    const roleValue = roleMap[permissionData.permission_role] || 1;

    return await prisma.memberPermission.create({
      data: {
        member_id: BigInt(permissionData.member_id),
        member_permission_role: roleValue
      }
    });
  } catch (error) {
    // 중복 권한 시도 시 (unique constraint 위반)
    if (error.code === 'P2002') {
      throw new Error('Permission already exists for this member');
    }
    throw new Error(`Failed to create permission: ${error.message}`);
  }
}

/**
 * 특정 회원의 특정 역할 제거
 * @param {number} memberId - 회원 ID
 * @param {string} role - 역할 ('buyer', 'seller', 'admin')
 * @returns {Promise<Object>} 삭제된 권한 정보
 */
async function deleteByMemberIdAndRole(memberId, role) {
  try {
    // unique constraint [member_id, permission_role]을 이용한 삭제
    const permission = await prisma.memberPermission.findFirst({
      where: {
        member_id: BigInt(memberId),
        permission_role: role
      }
    });

    if (!permission) {
      throw new Error('Permission not found');
    }

    return await prisma.memberPermission.delete({
      where: {
        permission_id: permission.permission_id
      }
    });
  } catch (error) {
    throw new Error(`Failed to delete permission: ${error.message}`);
  }
}

/**
 * 특정 회원의 모든 권한 삭제
 * @param {number} memberId - 회원 ID
 * @returns {Promise<Object>} 삭제 결과 { count: 삭제된 권한 수 }
 */
async function deleteAllByMemberId(memberId) {
  try {
    return await prisma.memberPermission.deleteMany({
      where: { member_id: BigInt(memberId) }
    });
  } catch (error) {
    throw new Error(`Failed to delete all permissions: ${error.message}`);
  }
}

/**
 * 특정 역할을 가진 모든 회원 수 조회 (통계용)
 * @param {string} role - 역할 ('buyer', 'seller', 'admin')
 * @returns {Promise<number>} 회원 수
 */
async function countByRole(role) {
  try {
    return await prisma.memberPermission.count({
      where: { permission_role: role }
    });
  } catch (error) {
    throw new Error(`Failed to count by role: ${error.message}`);
  }
}

/**
 * 특정 역할을 가진 모든 회원 조회 (관리자용)
 * @param {string} role - 역할 ('buyer', 'seller', 'admin')
 * @param {Object} options - 조회 옵션
 * @param {number} [options.page=1] - 페이지 번호
 * @param {number} [options.limit=10] - 페이지당 항목 수
 * @returns {Promise<Object>} { permissions, total, page, totalPages }
 */
async function findByRole(role, options = {}) {
  try {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;

    const [permissions, total] = await Promise.all([
      prisma.memberPermission.findMany({
        where: { permission_role: role },
        skip,
        take: limit,
        include: {
          member: {
            select: {
              member_id: true,
              member_email: true,
              member_nickname: true,
              member_status: true
            }
          }
        },
        orderBy: { permission_created_at: 'desc' }
      }),
      prisma.memberPermission.count({
        where: { permission_role: role }
      })
    ]);

    return {
      permissions,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  } catch (error) {
    throw new Error(`Failed to find by role: ${error.message}`);
  }
}

module.exports = {
  findByMemberId,
  findById,
  hasRole,
  getPrimaryRole,
  getRoles,
  create,
  deleteByMemberIdAndRole,
  deleteAllByMemberId,
  countByRole,
  findByRole
};
