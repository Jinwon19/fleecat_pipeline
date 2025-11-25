const prisma = require('../config/database');
const tenantRepository = require('../repositories/tenant.repository');
const tenantDetailRepository = require('../repositories/tenantDetail.repository');
const tenantMemberRepository = require('../repositories/tenantMember.repository');
const { ValidationError, NotFoundError, ForbiddenError } = require('../utils/errors');

/**
 * Tenant Service
 * 판매사 등록 및 관리 비즈니스 로직
 */

/**
 * 판매사 등록 신청
 *
 * @description
 * 회원이 판매사를 등록 신청합니다.
 * - 판매사 이름 중복 확인
 * - Tenant, TenantDetail, TenantMember를 트랜잭션으로 생성
 * - 신청자를 owner로 등록 (pending 상태)
 *
 * @param {number} memberId - 신청 회원 ID
 * @param {Object} data - 판매사 데이터
 * @param {string} data.tenant_name - 판매사 이름
 * @param {string} [data.tenant_detail_description] - 판매사 설명
 * @param {string} [data.tenant_detail_phone] - 연락처
 * @param {string} [data.tenant_detail_email] - 이메일
 * @param {string} [data.tenant_detail_zipcode] - 우편번호
 * @param {string} [data.tenant_detail_address] - 주소
 * @param {string} [data.tenant_detail_address_detail] - 상세 주소
 * @param {string} [data.tenant_detail_business_hours] - 영업시간
 * @param {number} [data.tenant_detail_commission_rate] - 수수료율 (기본: 0.15)
 *
 * @returns {Promise<Object>} 생성된 판매사 정보 (TenantDetail, owner 정보 포함)
 * @throws {ValidationError} 판매사 이름 중복 시
 *
 * @example
 * const tenant = await tenantService.createTenant(123, {
 *   tenant_name: "홍길동 공방",
 *   tenant_detail_description: "전통 도자기 공방입니다",
 *   tenant_detail_phone: "010-1234-5678",
 *   tenant_detail_address: "서울시 종로구..."
 * });
 */
async function createTenant(memberId, data) {
  const { tenant_name, ...tenantDetailData } = data;

  // 1. 판매사 이름 중복 확인
  const nameExists = await tenantRepository.existsByName(tenant_name);
  if (nameExists) {
    throw new ValidationError('Tenant name already exists');
  }

  // 2. 트랜잭션으로 Tenant, TenantDetail, TenantMember 생성
  const result = await prisma.$transaction(async (tx) => {
    // 2-1. Tenant 생성 (pending 상태)
    const tenant = await tx.tenant.create({
      data: {
        tenant_name,
        tenant_status: 'pending',
        tenant_applied_at: new Date()
      }
    });

    // 2-2. TenantDetail 생성
    const tenantDetail = await tx.tenantDetail.create({
      data: {
        tenant_id: tenant.tenant_id,
        tenant_detail_description: tenantDetailData.tenant_detail_description || null,
        tenant_detail_phone: tenantDetailData.tenant_detail_phone || null,
        tenant_detail_email: tenantDetailData.tenant_detail_email || null,
        tenant_detail_zipcode: tenantDetailData.tenant_detail_zipcode || null,
        tenant_detail_address: tenantDetailData.tenant_detail_address || null,
        tenant_detail_address_detail: tenantDetailData.tenant_detail_address_detail || null,
        tenant_detail_business_hours: tenantDetailData.tenant_detail_business_hours || null,
        tenant_detail_commission_rate: tenantDetailData.tenant_detail_commission_rate || 0.15
      }
    });

    // 2-3. 신청자를 owner로 TenantMember 생성 (pending 상태)
    const tenantMember = await tx.tenantMember.create({
      data: {
        tenant_id: tenant.tenant_id,
        member_id: BigInt(memberId),
        tenant_member_role: 'owner',
        tenant_member_approval_status: 'pending',
        tenant_member_applied_at: new Date()
      }
    });

    return { tenant, tenantDetail, tenantMember };
  });

  // 3. 생성된 판매사 조회 (전체 정보 포함)
  const createdTenant = await tenantRepository.findById(result.tenant.tenant_id);

  return createdTenant;
}

/**
 * 내가 속한 판매사 목록 조회
 *
 * @description
 * 회원이 속한 모든 판매사를 조회합니다.
 * - TenantMember 관계를 통해 조회
 * - 역할 정보 포함 (owner/staff)
 *
 * @param {number} memberId - 회원 ID
 * @returns {Promise<Array>} 판매사 목록 (TenantMember 정보 포함)
 *
 * @example
 * const tenants = await tenantService.getMyTenants(123);
 * // 반환: [{ tenant_id, tenant_name, tenant_status, tenant_member: {...} }]
 */
async function getMyTenants(memberId) {
  // TenantMember 조회
  const tenantMembers = await tenantMemberRepository.findByMemberId(memberId);

  // Tenant 정보 조회
  const tenants = await Promise.all(
    tenantMembers.map(async (tm) => {
      const tenant = await tenantRepository.findById(tm.tenant_id);
      return {
        ...tenant,
        tenant_id: Number(tenant.tenant_id),
        tenant_member: {
          tenant_member_id: Number(tm.tenant_member_id),
          tenant_member_role: tm.tenant_member_role,
          tenant_member_approval_status: tm.tenant_member_approval_status,
          tenant_member_applied_at: tm.tenant_member_applied_at,
          tenant_member_approved_at: tm.tenant_member_approved_at
        }
      };
    })
  );

  return tenants;
}

/**
 * 판매사 상세 조회
 *
 * @description
 * 판매사 ID로 상세 정보를 조회합니다.
 * - TenantDetail 포함
 * - Public API (누구나 조회 가능)
 *
 * @param {number} tenantId - 판매사 ID
 * @returns {Promise<Object>} 판매사 정보 (TenantDetail 포함)
 * @throws {NotFoundError} 판매사를 찾을 수 없을 때
 *
 * @example
 * const tenant = await tenantService.getTenantById(1);
 */
async function getTenantById(tenantId) {
  const tenant = await tenantRepository.findById(tenantId);

  if (!tenant) {
    throw new NotFoundError('Tenant not found');
  }

  return {
    ...tenant,
    tenant_id: Number(tenant.tenant_id)
  };
}

/**
 * 판매사 정보 수정
 *
 * @description
 * 판매사 정보를 수정합니다.
 * - owner만 수정 가능
 * - TenantDetail 정보 수정 포함
 *
 * @param {number} tenantId - 판매사 ID
 * @param {number} memberId - 수정 요청 회원 ID
 * @param {Object} updateData - 수정할 데이터
 * @param {string} [updateData.tenant_name] - 판매사 이름
 * @param {string} [updateData.tenant_detail_description] - 판매사 설명
 * @param {string} [updateData.tenant_detail_phone] - 연락처
 * @param {string} [updateData.tenant_detail_email] - 이메일
 * @param {string} [updateData.tenant_detail_zipcode] - 우편번호
 * @param {string} [updateData.tenant_detail_address] - 주소
 * @param {string} [updateData.tenant_detail_address_detail] - 상세 주소
 * @param {string} [updateData.tenant_detail_business_hours] - 영업시간
 *
 * @returns {Promise<Object>} 수정된 판매사 정보
 * @throws {NotFoundError} 판매사를 찾을 수 없을 때
 * @throws {ForbiddenError} owner가 아닐 때
 * @throws {ValidationError} 이름 중복 시
 *
 * @example
 * const updated = await tenantService.updateTenant(1, 123, {
 *   tenant_detail_description: "새로운 설명",
 *   tenant_detail_phone: "010-9999-8888"
 * });
 */
async function updateTenant(tenantId, memberId, updateData) {
  // 1. 판매사 존재 확인
  const tenant = await tenantRepository.findById(tenantId);

  if (!tenant) {
    throw new NotFoundError('Tenant not found');
  }

  // 2. owner 권한 확인
  const tenantMember = await tenantMemberRepository.findByTenantIdAndMemberId(tenantId, memberId);

  if (!tenantMember || tenantMember.tenant_member_role !== 'owner') {
    throw new ForbiddenError('Only tenant owner can update tenant information');
  }

  // 3. 승인된 owner만 수정 가능
  if (tenantMember.tenant_member_approval_status !== 'approved') {
    throw new ForbiddenError('Only approved owner can update tenant information');
  }

  // 4. 이름 변경 시 중복 확인
  if (updateData.tenant_name && updateData.tenant_name !== tenant.tenant_name) {
    const nameExists = await tenantRepository.existsByName(updateData.tenant_name);
    if (nameExists) {
      throw new ValidationError('Tenant name already exists');
    }
  }

  // 5. 트랜잭션으로 Tenant, TenantDetail 수정
  const result = await prisma.$transaction(async (tx) => {
    // 5-1. Tenant 수정
    let updatedTenant = tenant;
    if (updateData.tenant_name) {
      updatedTenant = await tx.tenant.update({
        where: { tenant_id: BigInt(tenantId) },
        data: { tenant_name: updateData.tenant_name }
      });
    }

    // 5-2. TenantDetail 수정
    const tenantDetailUpdateData = {};

    if (updateData.tenant_detail_description !== undefined) {
      tenantDetailUpdateData.tenant_detail_description = updateData.tenant_detail_description;
    }
    if (updateData.tenant_detail_phone !== undefined) {
      tenantDetailUpdateData.tenant_detail_phone = updateData.tenant_detail_phone;
    }
    if (updateData.tenant_detail_email !== undefined) {
      tenantDetailUpdateData.tenant_detail_email = updateData.tenant_detail_email;
    }
    if (updateData.tenant_detail_zipcode !== undefined) {
      tenantDetailUpdateData.tenant_detail_zipcode = updateData.tenant_detail_zipcode;
    }
    if (updateData.tenant_detail_address !== undefined) {
      tenantDetailUpdateData.tenant_detail_address = updateData.tenant_detail_address;
    }
    if (updateData.tenant_detail_address_detail !== undefined) {
      tenantDetailUpdateData.tenant_detail_address_detail = updateData.tenant_detail_address_detail;
    }
    if (updateData.tenant_detail_business_hours !== undefined) {
      tenantDetailUpdateData.tenant_detail_business_hours = updateData.tenant_detail_business_hours;
    }

    let updatedTenantDetail = null;
    if (Object.keys(tenantDetailUpdateData).length > 0) {
      updatedTenantDetail = await tx.tenantDetail.update({
        where: { tenant_id: BigInt(tenantId) },
        data: tenantDetailUpdateData
      });
    }

    return { updatedTenant, updatedTenantDetail };
  });

  // 6. 수정된 판매사 조회
  return await tenantRepository.findById(tenantId);
}

/**
 * 판매사 승인 (관리자)
 *
 * @description
 * 관리자가 판매사 등록을 승인합니다.
 * - tenant_status를 'approved'로 변경
 * - tenant_approved_at 설정
 * - owner의 tenant_member_approval_status도 'approved'로 변경
 *
 * @param {number} tenantId - 판매사 ID
 * @param {number} adminId - 승인 관리자 ID
 * @returns {Promise<Object>} 승인된 판매사 정보
 * @throws {NotFoundError} 판매사를 찾을 수 없을 때
 * @throws {ValidationError} 이미 승인/거절된 판매사
 *
 * @example
 * const approved = await tenantService.approveTenant(1, 999);
 */
async function approveTenant(tenantId, adminId) {
  // 1. 판매사 존재 확인
  const tenant = await tenantRepository.findById(tenantId);

  if (!tenant) {
    throw new NotFoundError('Tenant not found');
  }

  // 2. pending 상태 확인
  if (tenant.tenant_status !== 'pending') {
    throw new ValidationError(`Cannot approve tenant with status: ${tenant.tenant_status}`);
  }

  // 3. 트랜잭션으로 Tenant와 TenantMember(owner) 승인
  await prisma.$transaction(async (tx) => {
    // 3-1. Tenant 승인
    await tx.tenant.update({
      where: { tenant_id: BigInt(tenantId) },
      data: {
        tenant_status: 'approved',
        tenant_approved_at: new Date()
      }
    });

    // 3-2. owner의 TenantMember 승인
    await tx.tenantMember.updateMany({
      where: {
        tenant_id: BigInt(tenantId),
        tenant_member_role: 'owner'
      },
      data: {
        tenant_member_approval_status: 'approved',
        tenant_member_approved_at: new Date(),
        tenant_member_activated_at: new Date()
      }
    });
  });

  // 4. 승인된 판매사 조회
  return await tenantRepository.findById(tenantId);
}

/**
 * 판매사 거절 (관리자)
 *
 * @description
 * 관리자가 판매사 등록을 거절합니다.
 * - tenant_status를 'rejected'로 변경
 * - 거절 사유 저장 (선택)
 *
 * @param {number} tenantId - 판매사 ID
 * @param {number} adminId - 거절 관리자 ID
 * @param {string} [reason] - 거절 사유
 * @returns {Promise<Object>} 거절된 판매사 정보
 * @throws {NotFoundError} 판매사를 찾을 수 없을 때
 * @throws {ValidationError} 이미 승인/거절된 판매사
 *
 * @example
 * const rejected = await tenantService.rejectTenant(1, 999, "부적절한 판매사명");
 */
async function rejectTenant(tenantId, adminId, reason = null) {
  // 1. 판매사 존재 확인
  const tenant = await tenantRepository.findById(tenantId);

  if (!tenant) {
    throw new NotFoundError('Tenant not found');
  }

  // 2. pending 상태 확인
  if (tenant.tenant_status !== 'pending') {
    throw new ValidationError(`Cannot reject tenant with status: ${tenant.tenant_status}`);
  }

  // 3. Tenant 거절
  const rejectedTenant = await tenantRepository.updateStatus(tenantId, 'rejected', reason);

  return rejectedTenant;
}

/**
 * 판매사 목록 조회 (관리자)
 *
 * @description
 * 모든 판매사 목록을 조회합니다 (관리자용).
 * - 페이징 지원
 * - 상태별 필터링 (pending/approved/rejected)
 *
 * @param {Object} options - 조회 옵션
 * @param {number} [options.page=1] - 페이지 번호
 * @param {number} [options.limit=10] - 페이지당 항목 수
 * @param {string} [options.status] - 상태 필터 (pending/approved/rejected)
 * @returns {Promise<Object>} { tenants, total, page, totalPages }
 *
 * @example
 * const result = await tenantService.getAllTenants({ status: 'pending', page: 1, limit: 10 });
 */
async function getAllTenants(options = {}) {
  const result = await tenantRepository.findAll(options);

  // BigInt를 Number로 변환
  return {
    ...result,
    tenants: result.tenants.map(tenant => ({
      ...tenant,
      tenant_id: Number(tenant.tenant_id)
    }))
  };
}

module.exports = {
  createTenant,
  getMyTenants,
  getTenantById,
  updateTenant,
  approveTenant,
  rejectTenant,
  getAllTenants
};
