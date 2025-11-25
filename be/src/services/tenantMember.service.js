const prisma = require('../config/database');
const tenantRepository = require('../repositories/tenant.repository');
const tenantMemberRepository = require('../repositories/tenantMember.repository');
const { ValidationError, NotFoundError, ForbiddenError } = require('../utils/errors');

/**
 * TenantMember Service
 * 판매사 구성원 가입 및 관리 비즈니스 로직
 */

/**
 * 판매사 가입 신청
 * @param {number} memberId - 신청 회원 ID
 * @param {number} tenantId - 판매사 ID
 * @param {Object} data - 가입 정보
 * @param {string} [data.tenant_member_role='staff'] - 역할 (staff/manager)
 * @param {string} [data.tenant_member_bank_name] - 은행명
 * @param {string} [data.tenant_member_bank_account] - 계좌번호
 * @param {string} [data.tenant_member_account_holder] - 예금주
 * @param {number} [data.tenant_member_commission_rate] - 수수료율
 * @returns {Promise<Object>} 생성된 구성원 정보
 */
async function applyToTenant(memberId, tenantId, data) {
  // 1. Tenant 존재 확인
  const tenant = await tenantRepository.findById(tenantId);

  if (!tenant) {
    throw new NotFoundError('Tenant not found');
  }

  // 2. 판매사 승인 상태 확인
  if (tenant.tenant_status !== 'approved') {
    throw new ValidationError('Cannot apply to non-approved tenant');
  }

  // 3. 중복 가입 확인
  const exists = await tenantMemberRepository.existsByTenantAndMember(tenantId, memberId);

  if (exists) {
    throw new ValidationError('Already member of this tenant');
  }

  // 4. 구성원 생성 (pending 상태)
  const tenantMember = await tenantMemberRepository.create({
    tenant_id: tenantId,
    member_id: memberId,
    tenant_member_role: data.tenant_member_role || 'staff',
    tenant_member_approval_status: 'pending',
    tenant_member_bank_name: data.tenant_member_bank_name,
    tenant_member_bank_account: data.tenant_member_bank_account,
    tenant_member_account_holder: data.tenant_member_account_holder,
    tenant_member_commission_rate: data.tenant_member_commission_rate
  });

  // 5. 조회하여 tenant 정보 포함
  const createdMember = await tenantMemberRepository.findById(Number(tenantMember.tenant_member_id));

  return {
    ...createdMember,
    tenant_member_id: Number(createdMember.tenant_member_id),
    tenant_id: Number(createdMember.tenant_id),
    member_id: Number(createdMember.member_id)
  };
}

/**
 * 구성원 승인 (Owner만 가능)
 * @param {number} tenantMemberId - 구성원 ID
 * @param {number} approverId - 승인자 회원 ID
 * @returns {Promise<Object>} 승인된 구성원 정보
 */
async function approveMember(tenantMemberId, approverId) {
  // 1. 구성원 조회
  const tenantMember = await tenantMemberRepository.findById(tenantMemberId);

  if (!tenantMember) {
    throw new NotFoundError('TenantMember not found');
  }

  // 2. 승인자가 해당 판매사의 owner인지 확인
  const approver = await tenantMemberRepository.findByTenantIdAndMemberId(
    Number(tenantMember.tenant_id),
    approverId
  );

  if (!approver || approver.tenant_member_role !== 'owner') {
    throw new ForbiddenError('Only tenant owner can approve members');
  }

  // 3. 승인자가 승인된 owner인지 확인
  if (approver.tenant_member_approval_status !== 'approved') {
    throw new ForbiddenError('Only approved owner can approve members');
  }

  // 4. 이미 승인/거절된 경우 확인
  if (tenantMember.tenant_member_approval_status !== 'pending') {
    throw new ValidationError(
      `Cannot approve member with status: ${tenantMember.tenant_member_approval_status}`
    );
  }

  // 5. 승인 처리
  const approved = await tenantMemberRepository.updateApprovalStatus(
    tenantMemberId,
    'approved',
    `Approved by ${approver.member.member_name || approver.member.member_nickname}`
  );

  return {
    ...approved,
    tenant_member_id: Number(approved.tenant_member_id),
    tenant_id: Number(approved.tenant_id),
    member_id: Number(approved.member_id)
  };
}

/**
 * 구성원 거절 (Owner만 가능)
 * @param {number} tenantMemberId - 구성원 ID
 * @param {number} approverId - 거절 처리자 회원 ID
 * @param {string} [reason] - 거절 사유
 * @returns {Promise<Object>} 거절된 구성원 정보
 */
async function rejectMember(tenantMemberId, approverId, reason) {
  // 1. 구성원 조회
  const tenantMember = await tenantMemberRepository.findById(tenantMemberId);

  if (!tenantMember) {
    throw new NotFoundError('TenantMember not found');
  }

  // 2. 거절 처리자가 해당 판매사의 owner인지 확인
  const approver = await tenantMemberRepository.findByTenantIdAndMemberId(
    Number(tenantMember.tenant_id),
    approverId
  );

  if (!approver || approver.tenant_member_role !== 'owner') {
    throw new ForbiddenError('Only tenant owner can reject members');
  }

  // 3. 승인자가 승인된 owner인지 확인
  if (approver.tenant_member_approval_status !== 'approved') {
    throw new ForbiddenError('Only approved owner can reject members');
  }

  // 4. 이미 승인/거절된 경우 확인
  if (tenantMember.tenant_member_approval_status !== 'pending') {
    throw new ValidationError(
      `Cannot reject member with status: ${tenantMember.tenant_member_approval_status}`
    );
  }

  // 5. 거절 처리
  const rejected = await tenantMemberRepository.updateApprovalStatus(
    tenantMemberId,
    'rejected',
    reason || `Rejected by ${approver.member.member_name || approver.member.member_nickname}`
  );

  return {
    ...rejected,
    tenant_member_id: Number(rejected.tenant_member_id),
    tenant_id: Number(rejected.tenant_id),
    member_id: Number(rejected.member_id)
  };
}

/**
 * 판매사 구성원 목록 조회
 * @param {number} tenantId - 판매사 ID
 * @param {Object} [options] - 조회 옵션
 * @param {string} [options.status] - 승인 상태 필터 (pending/approved/rejected)
 * @returns {Promise<Array>} 구성원 목록
 */
async function getTenantMembers(tenantId, options = {}) {
  // 1. Tenant 존재 확인
  const tenant = await tenantRepository.findById(tenantId);

  if (!tenant) {
    throw new NotFoundError('Tenant not found');
  }

  // 2. 구성원 목록 조회
  let members = await tenantMemberRepository.findByTenantId(tenantId);

  // 3. 상태 필터링 (옵션)
  if (options.status) {
    members = members.filter(m => m.tenant_member_approval_status === options.status);
  }

  // 4. BigInt 변환
  return members.map(member => ({
    ...member,
    tenant_member_id: Number(member.tenant_member_id),
    tenant_id: Number(member.tenant_id),
    member_id: Number(member.member_id),
    tenant_member_total_sales_amount: Number(member.tenant_member_total_sales_amount || 0)
  }));
}

/**
 * 내 소속 판매사 목록 조회
 * @param {number} memberId - 회원 ID
 * @param {Object} [options] - 조회 옵션
 * @param {string} [options.status] - 승인 상태 필터 (pending/approved/rejected)
 * @returns {Promise<Array>} 소속 판매사 목록
 */
async function getMyTenantMemberships(memberId, options = {}) {
  // 1. 내 TenantMember 조회
  let tenantMembers = await tenantMemberRepository.findByMemberId(memberId);

  // 2. 상태 필터링 (옵션)
  if (options.status) {
    tenantMembers = tenantMembers.filter(tm => tm.tenant_member_approval_status === options.status);
  }

  // 3. BigInt 변환 및 응답 형식 정리
  return tenantMembers.map(tm => ({
    tenant_member_id: Number(tm.tenant_member_id),
    tenant_id: Number(tm.tenant_id),
    tenant_name: tm.tenant.tenant_name,
    tenant_status: tm.tenant.tenant_status,
    tenant_member_role: tm.tenant_member_role,
    tenant_member_approval_status: tm.tenant_member_approval_status,
    tenant_member_applied_at: tm.tenant_member_applied_at,
    tenant_member_approved_at: tm.tenant_member_approved_at,
    tenant_member_activated_at: tm.tenant_member_activated_at,
    tenant_member_total_sales_amount: Number(tm.tenant_member_total_sales_amount || 0),
    tenant_member_total_sales_count: tm.tenant_member_total_sales_count || 0,
    tenant_member_commission_rate: Number(tm.tenant_member_commission_rate)
  }));
}

/**
 * 구성원 정보 수정 (Owner만 가능)
 * @param {number} tenantMemberId - 구성원 ID
 * @param {number} requesterId - 요청자 회원 ID
 * @param {Object} updateData - 수정 데이터
 * @param {string} [updateData.tenant_member_role] - 역할 (staff/manager)
 * @param {string} [updateData.tenant_member_bank_name] - 은행명
 * @param {string} [updateData.tenant_member_bank_account] - 계좌번호
 * @param {string} [updateData.tenant_member_account_holder] - 예금주
 * @param {number} [updateData.tenant_member_commission_rate] - 수수료율
 * @returns {Promise<Object>} 수정된 구성원 정보
 */
async function updateMember(tenantMemberId, requesterId, updateData) {
  // 1. 구성원 조회
  const tenantMember = await tenantMemberRepository.findById(tenantMemberId);

  if (!tenantMember) {
    throw new NotFoundError('TenantMember not found');
  }

  // 2. 요청자가 해당 판매사의 owner인지 확인
  const requester = await tenantMemberRepository.findByTenantIdAndMemberId(
    Number(tenantMember.tenant_id),
    requesterId
  );

  if (!requester || requester.tenant_member_role !== 'owner') {
    throw new ForbiddenError('Only tenant owner can update member information');
  }

  // 3. 승인된 owner인지 확인
  if (requester.tenant_member_approval_status !== 'approved') {
    throw new ForbiddenError('Only approved owner can update member information');
  }

  // 4. Owner 자신의 역할 변경 방지
  if (Number(tenantMember.member_id) === requesterId && updateData.tenant_member_role) {
    throw new ValidationError('Cannot change your own role');
  }

  // 5. 구성원 정보 수정
  const updated = await tenantMemberRepository.update(tenantMemberId, updateData);

  return {
    ...updated,
    tenant_member_id: Number(updated.tenant_member_id),
    tenant_id: Number(updated.tenant_id),
    member_id: Number(updated.member_id)
  };
}

/**
 * 구성원 상세 조회 (본인 또는 같은 판매사 구성원만)
 * @param {number} tenantMemberId - 구성원 ID
 * @param {number} requesterId - 요청자 회원 ID
 * @returns {Promise<Object>} 구성원 상세 정보
 */
async function getTenantMemberById(tenantMemberId, requesterId) {
  // 1. 구성원 조회
  const tenantMember = await tenantMemberRepository.findById(tenantMemberId);

  if (!tenantMember) {
    throw new NotFoundError('TenantMember not found');
  }

  // 2. 요청자 권한 확인
  // 2-1. 본인이거나
  const isSelf = Number(tenantMember.member_id) === requesterId;

  // 2-2. 같은 판매사의 구성원인지 확인
  const requester = await tenantMemberRepository.findByTenantIdAndMemberId(
    Number(tenantMember.tenant_id),
    requesterId
  );

  const isSameTenant = requester !== null;

  if (!isSelf && !isSameTenant) {
    throw new ForbiddenError('Cannot view this tenant member information');
  }

  // 3. BigInt 변환
  return {
    ...tenantMember,
    tenant_member_id: Number(tenantMember.tenant_member_id),
    tenant_id: Number(tenantMember.tenant_id),
    member_id: Number(tenantMember.member_id),
    tenant_member_total_sales_amount: Number(tenantMember.tenant_member_total_sales_amount || 0)
  };
}

module.exports = {
  applyToTenant,
  approveMember,
  rejectMember,
  getTenantMembers,
  getMyTenantMemberships,
  updateMember,
  getTenantMemberById
};
