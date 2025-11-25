const tenantRepo = require('../../repositories/admin/adminTenant.repository');
const { NotFoundError, ValidationError } = require('../../utils/errors');

/**
 * Admin Tenant Service
 * 관리자용 판매사 관리 비즈니스 로직
 */

/**
 * 판매사 목록 조회
 * @param {Object} options - 조회 옵션
 * @returns {Promise<Object>} 판매사 목록 및 페이징 정보
 */
async function getTenantList(options = {}) {
  const { page = 1, limit = 20, status, search } = options;

  // 1. 입력값 검증
  if (page < 1) {
    throw new ValidationError('페이지 번호는 1 이상이어야 합니다');
  }

  if (limit < 1 || limit > 100) {
    throw new ValidationError('limit은 1~100 사이여야 합니다');
  }

  // 2. status 검증
  const validStatuses = ['pending', 'approved', 'rejected', 'suspended'];
  if (status && !validStatuses.includes(status)) {
    throw new ValidationError(`유효하지 않은 상태: ${status}`);
  }

  // 3. Repository 호출
  const result = await tenantRepo.findAll(options);

  // 4. BigInt 변환 및 응답 형식 표준화
  return {
    data: result.tenants.map(tenant => ({
      ...tenant,
      tenant_id: tenant.tenant_id.toString(),
      tenant_detail: tenant.tenant_detail ? {
        ...tenant.tenant_detail,
        tenant_id: tenant.tenant_detail.tenant_id?.toString()
      } : null
    })),
    pagination: {
      currentPage: result.page,
      totalPages: result.totalPages,
      totalItems: result.total,
      itemsPerPage: limit,
      hasNextPage: result.page < result.totalPages,
      hasPreviousPage: result.page > 1
    }
  };
}

/**
 * 판매사 상세 조회
 * @param {number} tenantId - 판매사 ID
 * @returns {Promise<Object>} 판매사 상세 정보
 */
async function getTenantById(tenantId) {
  // 1. Repository 호출
  const tenant = await tenantRepo.findByIdWithDetails(tenantId);

  // 2. 존재 확인
  if (!tenant) {
    throw new NotFoundError(`판매사 ID ${tenantId}를 찾을 수 없습니다`);
  }

  // 3. BigInt 변환
  return {
    ...tenant,
    tenant_id: tenant.tenant_id.toString(),
    tenant_detail: tenant.tenant_detail ? {
      ...tenant.tenant_detail,
      tenant_id: tenant.tenant_detail.tenant_id?.toString()
    } : null,
    tenant_members: tenant.tenant_members?.map(tm => ({
      ...tm,
      tenant_member_id: tm.tenant_member_id?.toString(),
      tenant_id: tm.tenant_id?.toString(),
      member_id: tm.member_id?.toString(),
      member: tm.member ? {
        ...tm.member,
        member_id: tm.member.member_id?.toString()
      } : null
    }))
  };
}

/**
 * 판매사 승인
 * @param {number} tenantId - 판매사 ID
 * @param {Object} approvalData - 승인 데이터
 * @returns {Promise<Object>} 승인된 판매사 정보
 */
async function approveTenant(tenantId, approvalData = {}) {
  // 1. 판매사 조회
  const tenant = await tenantRepo.findByIdWithDetails(tenantId);
  if (!tenant) {
    throw new NotFoundError(`판매사 ID ${tenantId}를 찾을 수 없습니다`);
  }

  // 2. 비즈니스 규칙: pending 상태만 승인 가능
  if (tenant.tenant_status !== 'pending') {
    throw new ValidationError(`${tenant.tenant_status} 상태의 판매사는 승인할 수 없습니다`);
  }

  // 3. admin_memo 검증 (선택적)
  if (approvalData.admin_memo && approvalData.admin_memo.length > 500) {
    throw new ValidationError('관리자 메모는 500자 이하로 입력해주세요');
  }

  // 4. 승인 처리
  const approved = await tenantRepo.approve(tenantId, approvalData);

  // 5. BigInt 변환
  return {
    ...approved,
    tenant_id: approved.tenant_id.toString()
  };
}

/**
 * 판매사 거절
 * @param {number} tenantId - 판매사 ID
 * @param {string} rejectReason - 거절 사유
 * @returns {Promise<Object>} 거절된 판매사 정보
 */
async function rejectTenant(tenantId, rejectReason) {
  // 1. 거절 사유 검증
  if (!rejectReason || rejectReason.trim().length === 0) {
    throw new ValidationError('거절 사유를 입력해주세요');
  }

  if (rejectReason.length > 500) {
    throw new ValidationError('거절 사유는 500자 이하로 입력해주세요');
  }

  // 2. 판매사 조회
  const tenant = await tenantRepo.findByIdWithDetails(tenantId);
  if (!tenant) {
    throw new NotFoundError(`판매사 ID ${tenantId}를 찾을 수 없습니다`);
  }

  // 3. 비즈니스 규칙: pending 상태만 거절 가능
  if (tenant.tenant_status !== 'pending') {
    throw new ValidationError(`${tenant.tenant_status} 상태의 판매사는 거절할 수 없습니다`);
  }

  // 4. 거절 처리
  const rejected = await tenantRepo.reject(tenantId, rejectReason.trim());

  // 5. BigInt 변환
  return {
    ...rejected,
    tenant_id: rejected.tenant_id.toString()
  };
}

/**
 * 판매사 상태 변경
 * @param {number} tenantId - 판매사 ID
 * @param {string} status - 변경할 상태
 * @returns {Promise<Object>} 변경된 판매사 정보
 */
async function updateTenantStatus(tenantId, status) {
  // 1. status 검증
  const validStatuses = ['pending', 'approved', 'rejected', 'suspended'];
  if (!validStatuses.includes(status)) {
    throw new ValidationError(`유효하지 않은 상태: ${status}`);
  }

  // 2. 판매사 조회
  const tenant = await tenantRepo.findByIdWithDetails(tenantId);
  if (!tenant) {
    throw new NotFoundError(`판매사 ID ${tenantId}를 찾을 수 없습니다`);
  }

  // 3. 비즈니스 규칙: 이미 같은 상태면 에러
  if (tenant.tenant_status === status) {
    throw new ValidationError(`이미 ${status} 상태입니다`);
  }

  // 4. 비즈니스 규칙: approved ↔ suspended만 가능
  if (tenant.tenant_status === 'approved' && status === 'pending') {
    throw new ValidationError('승인된 판매사를 대기 상태로 변경할 수 없습니다');
  }

  if (tenant.tenant_status === 'rejected' && status === 'suspended') {
    throw new ValidationError('거절된 판매사를 정지할 수 없습니다');
  }

  // 5. 상태 변경
  const updated = await tenantRepo.updateStatus(tenantId, status);

  // 6. BigInt 변환
  return {
    ...updated,
    tenant_id: updated.tenant_id.toString()
  };
}

/**
 * 판매사 통계 조회
 * @returns {Promise<Object>} 판매사 통계 및 가공된 데이터
 */
async function getTenantStatistics() {
  // 1. Repository 호출
  const stats = await tenantRepo.getStatistics();

  // 2. 비율 계산
  const approvalRate = stats.totalTenants > 0
    ? (stats.approvedTenants / stats.totalTenants * 100).toFixed(1)
    : 0;

  const rejectionRate = stats.totalTenants > 0
    ? (stats.rejectedTenants / stats.totalTenants * 100).toFixed(1)
    : 0;

  const suspensionRate = stats.totalTenants > 0
    ? (stats.suspendedTenants / stats.totalTenants * 100).toFixed(1)
    : 0;

  // 3. 가공된 데이터 반환
  return {
    ...stats,
    approvalRate: parseFloat(approvalRate),
    rejectionRate: parseFloat(rejectionRate),
    suspensionRate: parseFloat(suspensionRate)
  };
}

module.exports = {
  getTenantList,
  getTenantById,
  approveTenant,
  rejectTenant,
  updateTenantStatus,
  getTenantStatistics
};
