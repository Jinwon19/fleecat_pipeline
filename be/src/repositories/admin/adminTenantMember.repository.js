const prisma = require('../../config/database');

/**
 * Admin TenantMember Repository
 * 관리자용 판매사 구성원 관리 데이터 접근 계층
 */

/**
 * 판매사 구성원 목록 조회 (전체)
 * @param {Object} options - 조회 옵션
 * @returns {Promise<Array>} 판매사 구성원 목록
 */
async function findAll(options = {}) {
  const { tenant_id, status, role } = options;

  const where = {};

  if (tenant_id) {
    where.tenant_id = BigInt(tenant_id);
  }

  if (status) {
    where.tenant_member_approval_status = status;
  }

  if (role) {
    where.tenant_member_role = role;
  }

  return await prisma.tenantMember.findMany({
    where,
    include: {
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
          member_email: true,
          member_name: true,
          member_nickname: true,
          member_phone: true,
          member_status: true
        }
      }
    },
    orderBy: {
      tenant_member_applied_at: 'desc'
    }
  });
}

/**
 * 판매사 구성원 상세 조회
 * @param {number} tenantMemberId - 판매사 구성원 ID
 * @returns {Promise<Object|null>} 판매사 구성원 상세 정보
 */
async function findByIdWithDetails(tenantMemberId) {
  return await prisma.tenantMember.findUnique({
    where: {
      tenant_member_id: BigInt(tenantMemberId)
    },
    include: {
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
          member_email: true,
          member_name: true,
          member_nickname: true,
          member_phone: true,
          member_status: true,
          company_id: true
        }
      }
    }
  });
}

/**
 * 판매사 구성원 승인
 * @param {number} tenantMemberId - 판매사 구성원 ID
 * @returns {Promise<Object>} 승인된 판매사 구성원 정보
 */
async function approve(tenantMemberId) {
  return await prisma.tenantMember.update({
    where: {
      tenant_member_id: BigInt(tenantMemberId)
    },
    data: {
      tenant_member_approval_status: 'approved',
      tenant_member_approved_at: new Date(),
      tenant_member_activated_at: new Date()
    }
  });
}

/**
 * 판매사 구성원 거절
 * @param {number} tenantMemberId - 판매사 구성원 ID
 * @param {string} reason - 거절 사유 (선택)
 * @returns {Promise<Object>} 거절된 판매사 구성원 정보
 */
async function reject(tenantMemberId, reason) {
  return await prisma.tenantMember.update({
    where: {
      tenant_member_id: BigInt(tenantMemberId)
    },
    data: {
      tenant_member_approval_status: 'rejected',
      tenant_member_suspended_reason: reason || null
    }
  });
}

module.exports = {
  findAll,
  findByIdWithDetails,
  approve,
  reject
};
