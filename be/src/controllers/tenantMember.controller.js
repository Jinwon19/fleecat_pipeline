const tenantMemberService = require('../services/tenantMember.service');
const { successResponse } = require('../utils/response');

/**
 * TenantMember Controller
 * 판매사 구성원 관련 HTTP 요청/응답 처리
 */

/**
 * 판매사 가입 신청
 *
 * @description
 * POST /api/v1/tenants/:id/members
 * 판매사에 구성원 가입 신청을 합니다. (승인 대기 상태로)
 *
 * @route POST /api/v1/tenants/:id/members
 * @access Private (authenticate 미들웨어 필요)
 *
 * @param {Object} req.params - URL 파라미터
 * @param {string} req.params.id - 판매사 ID
 * @param {Object} req.user - JWT 토큰에서 추출한 사용자 정보
 * @param {number} req.user.member_id - 회원 ID
 * @param {Object} req.body - 구성원 데이터
 * @param {string} [req.body.tenant_member_role='staff'] - 역할 (staff/manager)
 * @param {string} [req.body.tenant_member_bank_name] - 은행명
 * @param {string} [req.body.tenant_member_bank_account] - 계좌번호
 * @param {string} [req.body.tenant_member_account_holder] - 예금주
 * @param {number} [req.body.tenant_member_commission_rate=0.05] - 수수료율
 *
 * @returns {Object} 201 - { success: true, message: '...', data: tenantMember }
 * @returns {Object} 400 - { success: false, message: 'Already member of this tenant' }
 * @returns {Object} 404 - { success: false, message: 'Tenant not found' }
 *
 * @example
 * // Request
 * POST /api/v1/tenants/1/members
 * Authorization: Bearer eyJhbGci...
 * {
 *   "tenant_member_role": "staff",
 *   "tenant_member_bank_name": "국민은행",
 *   "tenant_member_bank_account": "123-456-789",
 *   "tenant_member_account_holder": "홍길동"
 * }
 *
 * // Response (201 Created)
 * {
 *   "success": true,
 *   "message": "Application submitted. Waiting for tenant owner approval.",
 *   "data": {
 *     "tenant_member_id": 10,
 *     "tenant_member_role": "staff",
 *     "tenant_member_approval_status": "pending",
 *     "tenant": {
 *       "tenant_id": 1,
 *       "tenant_name": "홍길동 공방"
 *     }
 *   }
 * }
 */
async function applyToTenant(req, res, next) {
  try {
    // 1. URL 파라미터와 JWT 토큰에서 데이터 추출
    const tenantId = parseInt(req.params.id);
    const memberId = req.user.member_id;

    // 2. 요청 데이터 추출
    const data = req.body;

    // 3. TenantMember Service 호출
    const tenantMember = await tenantMemberService.applyToTenant(memberId, tenantId, data);

    // 4. 성공 응답 반환 (201 Created)
    return successResponse(
      res,
      tenantMember,
      'Application submitted. Waiting for tenant owner approval.',
      201
    );
  } catch (error) {
    // 5. 에러를 errorHandler 미들웨어로 전달
    next(error);
  }
}

/**
 * 판매사 구성원 목록 조회
 *
 * @description
 * GET /api/v1/tenants/:id/members
 * 특정 판매사의 구성원 목록을 조회합니다. (공개 API)
 *
 * @route GET /api/v1/tenants/:id/members
 * @access Public
 *
 * @param {Object} req.params - URL 파라미터
 * @param {string} req.params.id - 판매사 ID
 * @param {Object} req.query - 쿼리 파라미터
 * @param {string} [req.query.status] - 상태 필터 (pending/approved/rejected)
 *
 * @returns {Object} 200 - { success: true, data: tenantMembers }
 *
 * @example
 * // Request
 * GET /api/v1/tenants/1/members?status=approved
 *
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "message": "Success",
 *   "data": [
 *     {
 *       "tenant_member_id": 10,
 *       "tenant_member_role": "owner",
 *       "tenant_member_approval_status": "approved",
 *       "member": {
 *         "member_id": 123,
 *         "member_name": "홍길동",
 *         "member_nickname": "도자기장인"
 *       }
 *     },
 *     ...
 *   ]
 * }
 */
async function getTenantMembers(req, res, next) {
  try {
    // 1. URL 파라미터와 쿼리 파라미터 추출
    const tenantId = parseInt(req.params.id);
    const options = {
      status: req.query.status
    };

    // 2. TenantMember Service 호출
    const tenantMembers = await tenantMemberService.getTenantMembers(tenantId, options);

    // 3. 성공 응답 반환 (200 OK)
    return successResponse(res, tenantMembers);
  } catch (error) {
    // 4. 에러를 errorHandler 미들웨어로 전달
    next(error);
  }
}

/**
 * 내 소속 판매사 목록 조회
 *
 * @description
 * GET /api/v1/members/me/tenants
 * 로그인한 회원의 소속 판매사 목록을 조회합니다.
 *
 * @route GET /api/v1/members/me/tenants
 * @access Private (authenticate 미들웨어 필요)
 *
 * @param {Object} req.user - JWT 토큰에서 추출한 사용자 정보
 * @param {number} req.user.member_id - 회원 ID
 * @param {Object} req.query - 쿼리 파라미터
 * @param {string} [req.query.status] - 상태 필터 (pending/approved/rejected)
 *
 * @returns {Object} 200 - { success: true, data: tenantMemberships }
 *
 * @example
 * // Request
 * GET /api/v1/members/me/tenants?status=approved
 * Authorization: Bearer eyJhbGci...
 *
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "message": "Success",
 *   "data": [
 *     {
 *       "tenant_id": 1,
 *       "tenant_name": "A 공방",
 *       "tenant_member_id": 10,
 *       "tenant_member_role": "owner",
 *       "tenant_member_approval_status": "approved",
 *       "tenant_member_total_sales_amount": 1000000,
 *       "tenant_member_total_sales_count": 50
 *     },
 *     ...
 *   ]
 * }
 */
async function getMyTenantMemberships(req, res, next) {
  try {
    // 1. JWT 토큰에서 회원 ID 추출
    const memberId = req.user.member_id;

    // 2. 쿼리 파라미터 추출
    const options = {
      status: req.query.status
    };

    // 3. TenantMember Service 호출
    const tenantMemberships = await tenantMemberService.getMyTenantMemberships(memberId, options);

    // 4. 성공 응답 반환 (200 OK)
    return successResponse(res, tenantMemberships);
  } catch (error) {
    // 5. 에러를 errorHandler 미들웨어로 전달
    next(error);
  }
}

/**
 * 구성원 승인 (Owner)
 *
 * @description
 * PUT /api/v1/tenant-members/:id/approve
 * 구성원 가입 신청을 승인합니다. (Owner만 가능)
 *
 * @route PUT /api/v1/tenant-members/:id/approve
 * @access Private (authenticate 미들웨어 필요, Owner만)
 *
 * @param {Object} req.params - URL 파라미터
 * @param {string} req.params.id - TenantMember ID
 * @param {Object} req.user - JWT 토큰에서 추출한 사용자 정보
 * @param {number} req.user.member_id - 회원 ID (Owner)
 *
 * @returns {Object} 200 - { success: true, message: '...', data: tenantMember }
 * @returns {Object} 403 - { success: false, message: 'Only tenant owner can approve members' }
 * @returns {Object} 400 - { success: false, message: 'Cannot approve member with status: ...' }
 *
 * @example
 * // Request
 * PUT /api/v1/tenant-members/10/approve
 * Authorization: Bearer eyJhbGci... (owner)
 *
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "message": "Member approved successfully",
 *   "data": {
 *     "tenant_member_id": 10,
 *     "tenant_member_role": "staff",
 *     "tenant_member_approval_status": "approved",
 *     "tenant_member_approved_at": "2025-10-13T10:30:00Z"
 *   }
 * }
 */
async function approveMember(req, res, next) {
  try {
    // 1. URL 파라미터와 JWT 토큰에서 데이터 추출
    const tenantMemberId = parseInt(req.params.id);
    const approverId = req.user.member_id;

    // 2. TenantMember Service 호출 (권한 확인 포함)
    const approved = await tenantMemberService.approveMember(tenantMemberId, approverId);

    // 3. 성공 응답 반환 (200 OK)
    return successResponse(res, approved, 'Member approved successfully');
  } catch (error) {
    // 4. 에러를 errorHandler 미들웨어로 전달
    next(error);
  }
}

/**
 * 구성원 거절 (Owner)
 *
 * @description
 * PUT /api/v1/tenant-members/:id/reject
 * 구성원 가입 신청을 거절합니다. (Owner만 가능)
 *
 * @route PUT /api/v1/tenant-members/:id/reject
 * @access Private (authenticate 미들웨어 필요, Owner만)
 *
 * @param {Object} req.params - URL 파라미터
 * @param {string} req.params.id - TenantMember ID
 * @param {Object} req.user - JWT 토큰에서 추출한 사용자 정보
 * @param {number} req.user.member_id - 회원 ID (Owner)
 * @param {Object} req.body - 거절 사유
 * @param {string} [req.body.reason] - 거절 사유 (선택)
 *
 * @returns {Object} 200 - { success: true, message: '...', data: tenantMember }
 * @returns {Object} 403 - { success: false, message: 'Only tenant owner can reject members' }
 *
 * @example
 * // Request
 * PUT /api/v1/tenant-members/10/reject
 * Authorization: Bearer eyJhbGci... (owner)
 * {
 *   "reason": "현재 구성원을 모집하지 않습니다"
 * }
 *
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "message": "Member rejected",
 *   "data": {
 *     "tenant_member_id": 10,
 *     "tenant_member_approval_status": "rejected"
 *   }
 * }
 */
async function rejectMember(req, res, next) {
  try {
    // 1. URL 파라미터와 JWT 토큰에서 데이터 추출
    const tenantMemberId = parseInt(req.params.id);
    const approverId = req.user.member_id;

    // 2. 요청 데이터 추출 (거절 사유)
    const { reason } = req.body;

    // 3. TenantMember Service 호출 (권한 확인 포함)
    const rejected = await tenantMemberService.rejectMember(tenantMemberId, approverId, reason);

    // 4. 성공 응답 반환 (200 OK)
    return successResponse(res, rejected, 'Member rejected');
  } catch (error) {
    // 5. 에러를 errorHandler 미들웨어로 전달
    next(error);
  }
}

/**
 * 구성원 정보 수정 (Owner)
 *
 * @description
 * PUT /api/v1/tenant-members/:id
 * 구성원 정보를 수정합니다. (Owner만 가능)
 *
 * @route PUT /api/v1/tenant-members/:id
 * @access Private (authenticate 미들웨어 필요, Owner만)
 *
 * @param {Object} req.params - URL 파라미터
 * @param {string} req.params.id - TenantMember ID
 * @param {Object} req.user - JWT 토큰에서 추출한 사용자 정보
 * @param {number} req.user.member_id - 회원 ID (Owner)
 * @param {Object} req.body - 수정할 데이터
 * @param {string} [req.body.tenant_member_role] - 역할 (staff/manager)
 * @param {string} [req.body.tenant_member_bank_name] - 은행명
 * @param {string} [req.body.tenant_member_bank_account] - 계좌번호
 * @param {number} [req.body.tenant_member_commission_rate] - 수수료율
 *
 * @returns {Object} 200 - { success: true, message: '...', data: tenantMember }
 * @returns {Object} 403 - { success: false, message: 'Only tenant owner can update...' }
 * @returns {Object} 400 - { success: false, message: 'Cannot change your own role' }
 *
 * @example
 * // Request
 * PUT /api/v1/tenant-members/10
 * Authorization: Bearer eyJhbGci... (owner)
 * {
 *   "tenant_member_role": "manager",
 *   "tenant_member_commission_rate": 0.03
 * }
 *
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "message": "Member updated successfully",
 *   "data": {
 *     "tenant_member_id": 10,
 *     "tenant_member_role": "manager",
 *     "tenant_member_commission_rate": 0.03
 *   }
 * }
 */
async function updateMember(req, res, next) {
  try {
    // 1. URL 파라미터와 JWT 토큰에서 데이터 추출
    const tenantMemberId = parseInt(req.params.id);
    const requesterId = req.user.member_id;

    // 2. 요청 데이터 추출
    const updateData = req.body;

    // 3. TenantMember Service 호출 (권한 확인 포함)
    const updated = await tenantMemberService.updateMember(
      tenantMemberId,
      requesterId,
      updateData
    );

    // 4. 성공 응답 반환 (200 OK)
    return successResponse(res, updated, 'Member updated successfully');
  } catch (error) {
    // 5. 에러를 errorHandler 미들웨어로 전달
    next(error);
  }
}

/**
 * 구성원 상세 조회
 *
 * @description
 * GET /api/v1/tenant-members/:id
 * 구성원 상세 정보를 조회합니다. (본인 또는 같은 판매사 구성원만)
 *
 * @route GET /api/v1/tenant-members/:id
 * @access Private (authenticate 미들웨어 필요)
 *
 * @param {Object} req.params - URL 파라미터
 * @param {string} req.params.id - TenantMember ID
 * @param {Object} req.user - JWT 토큰에서 추출한 사용자 정보
 * @param {number} req.user.member_id - 회원 ID
 *
 * @returns {Object} 200 - { success: true, data: tenantMember }
 * @returns {Object} 403 - { success: false, message: 'Cannot view this tenant member...' }
 * @returns {Object} 404 - { success: false, message: 'Tenant member not found' }
 *
 * @example
 * // Request
 * GET /api/v1/tenant-members/10
 * Authorization: Bearer eyJhbGci...
 *
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "message": "Success",
 *   "data": {
 *     "tenant_member_id": 10,
 *     "tenant_member_role": "owner",
 *     "tenant_member_approval_status": "approved",
 *     "tenant": {
 *       "tenant_id": 1,
 *       "tenant_name": "홍길동 공방"
 *     },
 *     "member": {
 *       "member_id": 123,
 *       "member_name": "홍길동"
 *     }
 *   }
 * }
 */
async function getTenantMemberById(req, res, next) {
  try {
    // 1. URL 파라미터와 JWT 토큰에서 데이터 추출
    const tenantMemberId = parseInt(req.params.id);
    const requesterId = req.user.member_id;

    // 2. TenantMember Service 호출 (권한 확인 포함)
    const tenantMember = await tenantMemberService.getTenantMemberById(
      tenantMemberId,
      requesterId
    );

    // 3. 성공 응답 반환 (200 OK)
    return successResponse(res, tenantMember);
  } catch (error) {
    // 4. 에러를 errorHandler 미들웨어로 전달
    next(error);
  }
}

module.exports = {
  applyToTenant,
  getTenantMembers,
  getMyTenantMemberships,
  approveMember,
  rejectMember,
  updateMember,
  getTenantMemberById
};
