const prisma = require('../config/database');

/**
 * TenantMember Repository
 * tenant_member 테이블에 대한 데이터 접근 계층
 */

/**
 * ID로 구성원 조회
 * @param {number} tenantMemberId - 구성원 ID
 * @returns {Promise<Object|null>} 구성원 정보 또는 null
 */
async function findById(tenantMemberId) {
  try {
    return await prisma.tenantMember.findUnique({
      where: { tenant_member_id: BigInt(tenantMemberId) },
      include: {
        tenant: {
          include: {
            tenant_detail: true
          }
        },
        member: true
      }
    });
  } catch (error) {
    throw new Error(`Failed to find tenant member by ID: ${error.message}`);
  }
}

/**
 * 판매사별 구성원 목록 조회
 * @param {number} tenantId - 판매사 ID
 * @returns {Promise<Array>} 구성원 목록
 */
async function findByTenantId(tenantId) {
  try {
    return await prisma.tenantMember.findMany({
      where: { tenant_id: BigInt(tenantId) },
      include: {
        member: true
      },
      orderBy: { tenant_member_applied_at: 'desc' }
    });
  } catch (error) {
    throw new Error(`Failed to find tenant members by tenant ID: ${error.message}`);
  }
}

/**
 * 회원의 소속 판매사 목록 조회
 * @param {number} memberId - 회원 ID
 * @returns {Promise<Array>} 소속 판매사 목록
 */
async function findByMemberId(memberId) {
  try {
    return await prisma.tenantMember.findMany({
      where: { member_id: BigInt(memberId) },
      include: {
        tenant: {
          include: {
            tenant_detail: true
          }
        }
      },
      orderBy: { tenant_member_applied_at: 'desc' }
    });
  } catch (error) {
    throw new Error(`Failed to find tenant members by member ID: ${error.message}`);
  }
}

/**
 * 특정 판매사의 특정 구성원 조회
 * @param {number} tenantId - 판매사 ID
 * @param {number} memberId - 회원 ID
 * @returns {Promise<Object|null>} 구성원 정보 또는 null
 */
async function findByTenantIdAndMemberId(tenantId, memberId) {
  try {
    return await prisma.tenantMember.findFirst({
      where: {
        tenant_id: BigInt(tenantId),
        member_id: BigInt(memberId)
      },
      include: {
        tenant: {
          include: {
            tenant_detail: true
          }
        },
        member: true
      }
    });
  } catch (error) {
    throw new Error(`Failed to find tenant member by tenant and member ID: ${error.message}`);
  }
}

/**
 * 중복 가입 확인
 * @param {number} tenantId - 판매사 ID
 * @param {number} memberId - 회원 ID
 * @returns {Promise<boolean>} 존재 여부
 */
async function existsByTenantAndMember(tenantId, memberId) {
  try {
    const count = await prisma.tenantMember.count({
      where: {
        tenant_id: BigInt(tenantId),
        member_id: BigInt(memberId)
      }
    });
    return count > 0;
  } catch (error) {
    throw new Error(`Failed to check tenant member existence: ${error.message}`);
  }
}

/**
 * 구성원 생성
 * @param {Object} tenantMemberData - 구성원 데이터
 * @param {number} tenantMemberData.tenant_id - 판매사 ID (필수)
 * @param {number} tenantMemberData.member_id - 회원 ID (필수)
 * @param {string} tenantMemberData.tenant_member_role - 역할 (owner/manager/staff)
 * @param {string} [tenantMemberData.tenant_member_approval_status='pending'] - 승인 상태
 * @param {string} [tenantMemberData.tenant_member_bank_name] - 은행명
 * @param {string} [tenantMemberData.tenant_member_bank_account] - 계좌번호
 * @param {string} [tenantMemberData.tenant_member_account_holder] - 예금주
 * @param {number} [tenantMemberData.tenant_member_commission_rate=0.0500] - 수수료율
 * @returns {Promise<Object>} 생성된 구성원 정보
 */
async function create(tenantMemberData) {
  try {
    const data = {
      tenant_id: BigInt(tenantMemberData.tenant_id),
      member_id: BigInt(tenantMemberData.member_id),
      tenant_member_role: tenantMemberData.tenant_member_role,
      tenant_member_approval_status: tenantMemberData.tenant_member_approval_status || 'pending',
      tenant_member_bank_name: tenantMemberData.tenant_member_bank_name || null,
      tenant_member_bank_account: tenantMemberData.tenant_member_bank_account || null,
      tenant_member_account_holder: tenantMemberData.tenant_member_account_holder || null,
      tenant_member_commission_rate: tenantMemberData.tenant_member_commission_rate || 0.0500,
      tenant_member_applied_at: new Date()
    };

    // 승인된 상태로 생성하는 경우 (owner 자동 승인)
    if (tenantMemberData.tenant_member_approval_status === 'approved') {
      data.tenant_member_approved_at = new Date();
      data.tenant_member_activated_at = new Date();
    }

    return await prisma.tenantMember.create({ data });
  } catch (error) {
    throw new Error(`Failed to create tenant member: ${error.message}`);
  }
}

/**
 * 승인 상태 변경 (승인/거절)
 * @param {number} tenantMemberId - 구성원 ID
 * @param {string} status - 상태 (approved/rejected)
 * @param {string} [approverNote] - 승인자 메모
 * @returns {Promise<Object>} 수정된 구성원 정보
 */
async function updateApprovalStatus(tenantMemberId, status, approverNote = null) {
  try {
    const updateData = {
      tenant_member_approval_status: status
    };

    // 승인 시 approved_at, activated_at 설정
    if (status === 'approved') {
      updateData.tenant_member_approved_at = new Date();
      updateData.tenant_member_activated_at = new Date();
    }

    return await prisma.tenantMember.update({
      where: { tenant_member_id: BigInt(tenantMemberId) },
      data: updateData
    });
  } catch (error) {
    throw new Error(`Failed to update tenant member approval status: ${error.message}`);
  }
}

/**
 * 구성원 정보 수정
 * @param {number} tenantMemberId - 구성원 ID
 * @param {Object} updateData - 수정할 데이터
 * @param {string} [updateData.tenant_member_role] - 역할
 * @param {string} [updateData.tenant_member_bank_name] - 은행명
 * @param {string} [updateData.tenant_member_bank_account] - 계좌번호
 * @param {string} [updateData.tenant_member_account_holder] - 예금주
 * @param {number} [updateData.tenant_member_commission_rate] - 수수료율
 * @param {string} [updateData.tenant_member_suspended_by] - 정지 처리자
 * @param {string} [updateData.tenant_member_suspended_reason] - 정지 사유
 * @returns {Promise<Object>} 수정된 구성원 정보
 */
async function update(tenantMemberId, updateData) {
  try {
    return await prisma.tenantMember.update({
      where: { tenant_member_id: BigInt(tenantMemberId) },
      data: updateData
    });
  } catch (error) {
    throw new Error(`Failed to update tenant member: ${error.message}`);
  }
}

module.exports = {
  findById,
  findByTenantId,
  findByMemberId,
  findByTenantIdAndMemberId,
  existsByTenantAndMember,
  create,
  updateApprovalStatus,
  update
};
