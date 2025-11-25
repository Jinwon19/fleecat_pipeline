const tenantMemberRepo = require('../../repositories/admin/adminTenantMember.repository');
const { NotFoundError, ValidationError } = require('../../utils/errors');

/**
 * Admin TenantMember Service
 * 관리자용 판매사 구성원 관리 비즈니스 로직
 */

/**
 * 판매사 구성원 목록 조회 (전체)
 * @param {Object} options - 조회 옵션
 * @returns {Promise<Array>} 판매사 구성원 목록
 */
async function getTenantMemberList(options = {}) {
  const { tenant_id, status, role } = options;

  // status 검증
  if (status) {
    const validStatuses = ['pending', 'approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      throw new ValidationError(`유효하지 않은 상태: ${status}`);
    }
  }

  // role 검증
  if (role) {
    const validRoles = ['owner', 'member'];
    if (!validRoles.includes(role)) {
      throw new ValidationError(`유효하지 않은 역할: ${role}`);
    }
  }

  // Repository 호출
  const tenantMembers = await tenantMemberRepo.findAll({ tenant_id, status, role });

  // BigInt 변환
  return tenantMembers.map(tm => ({
    ...tm,
    tenant_member_id: tm.tenant_member_id.toString(),
    tenant_id: tm.tenant_id.toString(),
    member_id: tm.member_id.toString(),
    tenant: tm.tenant ? {
      ...tm.tenant,
      tenant_id: tm.tenant.tenant_id.toString()
    } : null,
    member: tm.member ? {
      ...tm.member,
      member_id: tm.member.member_id.toString(),
      company_id: tm.member.company_id ? tm.member.company_id.toString() : null
    } : null
  }));
}

/**
 * 판매사 구성원 상세 조회
 * @param {number} tenantMemberId - 판매사 구성원 ID
 * @returns {Promise<Object>} 판매사 구성원 상세 정보
 */
async function getTenantMemberById(tenantMemberId) {
  const tenantMember = await tenantMemberRepo.findByIdWithDetails(tenantMemberId);

  if (!tenantMember) {
    throw new NotFoundError(`판매사 구성원 ID ${tenantMemberId}를 찾을 수 없습니다`);
  }

  // BigInt 변환
  return {
    ...tenantMember,
    tenant_member_id: tenantMember.tenant_member_id.toString(),
    tenant_id: tenantMember.tenant_id.toString(),
    member_id: tenantMember.member_id.toString(),
    tenant: tenantMember.tenant ? {
      ...tenantMember.tenant,
      tenant_id: tenantMember.tenant.tenant_id.toString()
    } : null,
    member: tenantMember.member ? {
      ...tenantMember.member,
      member_id: tenantMember.member.member_id.toString(),
      company_id: tenantMember.member.company_id ? tenantMember.member.company_id.toString() : null
    } : null
  };
}

/**
 * 판매사 구성원 승인
 * @param {number} tenantMemberId - 판매사 구성원 ID
 * @returns {Promise<Object>} 승인된 판매사 구성원 정보
 */
async function approveTenantMember(tenantMemberId) {
  // 1. 구성원 조회
  const tenantMember = await tenantMemberRepo.findByIdWithDetails(tenantMemberId);
  if (!tenantMember) {
    throw new NotFoundError(`판매사 구성원 ID ${tenantMemberId}를 찾을 수 없습니다`);
  }

  // 2. 비즈니스 규칙: pending 상태만 승인 가능
  if (tenantMember.tenant_member_approval_status !== 'pending') {
    throw new ValidationError(`${tenantMember.tenant_member_approval_status} 상태의 구성원은 승인할 수 없습니다`);
  }

  // 3. 승인 처리
  const approved = await tenantMemberRepo.approve(tenantMemberId);

  // 4. BigInt 변환
  return {
    ...approved,
    tenant_member_id: approved.tenant_member_id.toString(),
    tenant_id: approved.tenant_id.toString(),
    member_id: approved.member_id.toString()
  };
}

/**
 * 판매사 구성원 거절
 * @param {number} tenantMemberId - 판매사 구성원 ID
 * @param {string} reason - 거절 사유 (선택)
 * @returns {Promise<Object>} 거절된 판매사 구성원 정보
 */
async function rejectTenantMember(tenantMemberId, reason) {
  // 1. 구성원 조회
  const tenantMember = await tenantMemberRepo.findByIdWithDetails(tenantMemberId);
  if (!tenantMember) {
    throw new NotFoundError(`판매사 구성원 ID ${tenantMemberId}를 찾을 수 없습니다`);
  }

  // 2. 비즈니스 규칙: pending 상태만 거절 가능
  if (tenantMember.tenant_member_approval_status !== 'pending') {
    throw new ValidationError(`${tenantMember.tenant_member_approval_status} 상태의 구성원은 거절할 수 없습니다`);
  }

  // 3. 거절 처리
  const rejected = await tenantMemberRepo.reject(tenantMemberId, reason);

  // 4. BigInt 변환
  return {
    ...rejected,
    tenant_member_id: rejected.tenant_member_id.toString(),
    tenant_id: rejected.tenant_id.toString(),
    member_id: rejected.member_id.toString()
  };
}

module.exports = {
  getTenantMemberList,
  getTenantMemberById,
  approveTenantMember,
  rejectTenantMember
};
