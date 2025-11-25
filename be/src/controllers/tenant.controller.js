const tenantService = require('../services/tenant.service');
const { successResponse } = require('../utils/response');

/**
 * Tenant Controller
 * 판매사 관련 HTTP 요청/응답 처리
 */

/**
 * 판매사 등록 신청
 *
 * @description
 * POST /api/v1/tenants
 * 새로운 판매사를 등록합니다. (승인 대기 상태로)
 *
 * @route POST /api/v1/tenants
 * @access Private (authenticate 미들웨어 필요)
 *
 * @param {Object} req.user - JWT 토큰에서 추출한 사용자 정보
 * @param {number} req.user.member_id - 회원 ID
 * @param {Object} req.body - 판매사 데이터
 * @param {string} req.body.tenant_name - 판매사 이름
 * @param {string} [req.body.tenant_detail_description] - 판매사 설명
 * @param {string} [req.body.tenant_detail_phone] - 연락처
 * @param {string} [req.body.tenant_detail_email] - 이메일
 * @param {string} [req.body.tenant_detail_zipcode] - 우편번호
 * @param {string} [req.body.tenant_detail_address] - 주소
 * @param {string} [req.body.tenant_detail_address_detail] - 상세 주소
 * @param {string} [req.body.tenant_detail_business_hours] - 영업시간
 * @param {number} [req.body.tenant_detail_commission_rate] - 수수료율 (기본: 0.15)
 *
 * @returns {Object} 201 - { success: true, message: '...', data: tenant }
 * @returns {Object} 400 - { success: false, message: 'Tenant name already exists' }
 *
 * @example
 * // Request
 * POST /api/v1/tenants
 * Authorization: Bearer eyJhbGci...
 * {
 *   "tenant_name": "홍길동 공방",
 *   "tenant_detail_description": "전통 도자기 공방입니다",
 *   "tenant_detail_phone": "010-1234-5678",
 *   "tenant_detail_address": "서울시 종로구 인사동길 12"
 * }
 *
 * // Response (201 Created)
 * {
 *   "success": true,
 *   "message": "Tenant registration submitted. Waiting for admin approval.",
 *   "data": {
 *     "tenant_id": 1,
 *     "tenant_name": "홍길동 공방",
 *     "tenant_status": "pending",
 *     "tenant_detail": { ... }
 *   }
 * }
 */
async function register(req, res, next) {
  try {
    // 1. JWT 토큰에서 회원 ID 추출
    const memberId = req.user.member_id;

    // 2. 요청 데이터 추출
    const data = req.body;

    // 3. Tenant Service 호출
    const tenant = await tenantService.createTenant(memberId, data);

    // 4. 성공 응답 반환 (201 Created)
    return successResponse(
      res,
      tenant,
      'Tenant registration submitted. Waiting for admin approval.',
      201
    );
  } catch (error) {
    // 5. 에러를 errorHandler 미들웨어로 전달
    next(error);
  }
}

/**
 * 내 판매사 목록 조회
 *
 * @description
 * GET /api/v1/tenants/me
 * 로그인한 회원이 소속된 모든 판매사 목록을 조회합니다.
 *
 * @route GET /api/v1/tenants/me
 * @access Private (authenticate 미들웨어 필요)
 *
 * @param {Object} req.user - JWT 토큰에서 추출한 사용자 정보
 * @param {number} req.user.member_id - 회원 ID
 *
 * @returns {Object} 200 - { success: true, data: tenants }
 *
 * @example
 * // Request
 * GET /api/v1/tenants/me
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
 *       "tenant_status": "approved",
 *       "tenant_member": {
 *         "tenant_member_role": "owner",
 *         "tenant_member_approval_status": "approved"
 *       }
 *     },
 *     {
 *       "tenant_id": 2,
 *       "tenant_name": "B 공방",
 *       "tenant_status": "pending",
 *       "tenant_member": {
 *         "tenant_member_role": "owner",
 *         "tenant_member_approval_status": "pending"
 *       }
 *     }
 *   ]
 * }
 */
async function getMyTenants(req, res, next) {
  try {
    // 1. JWT 토큰에서 회원 ID 추출
    const memberId = req.user.member_id;

    // 2. Tenant Service 호출
    const tenants = await tenantService.getMyTenants(memberId);

    // 3. 성공 응답 반환 (200 OK)
    return successResponse(res, tenants);
  } catch (error) {
    // 4. 에러를 errorHandler 미들웨어로 전달
    next(error);
  }
}

/**
 * 판매사 상세 조회
 *
 * @description
 * GET /api/v1/tenants/:id
 * 특정 판매사의 상세 정보를 조회합니다. (공개 API)
 *
 * @route GET /api/v1/tenants/:id
 * @access Public
 *
 * @param {Object} req.params - URL 파라미터
 * @param {string} req.params.id - 판매사 ID
 *
 * @returns {Object} 200 - { success: true, data: tenant }
 * @returns {Object} 404 - { success: false, message: 'Tenant not found' }
 *
 * @example
 * // Request
 * GET /api/v1/tenants/1
 *
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "message": "Success",
 *   "data": {
 *     "tenant_id": 1,
 *     "tenant_name": "홍길동 공방",
 *     "tenant_status": "approved",
 *     "tenant_detail": {
 *       "tenant_detail_description": "전통 도자기 공방",
 *       "tenant_detail_phone": "010-1234-5678",
 *       "tenant_detail_address": "서울시 종로구..."
 *     }
 *   }
 * }
 */
async function getTenantById(req, res, next) {
  try {
    // 1. URL 파라미터에서 판매사 ID 추출
    const tenantId = parseInt(req.params.id);

    // 2. Tenant Service 호출
    const tenant = await tenantService.getTenantById(tenantId);

    // 3. 성공 응답 반환 (200 OK)
    return successResponse(res, tenant);
  } catch (error) {
    // 4. 에러를 errorHandler 미들웨어로 전달
    next(error);
  }
}

/**
 * 판매사 정보 수정
 *
 * @description
 * PUT /api/v1/tenants/:id
 * 판매사 정보를 수정합니다. (Owner만 가능)
 *
 * @route PUT /api/v1/tenants/:id
 * @access Private (authenticate 미들웨어 필요, Owner만)
 *
 * @param {Object} req.params - URL 파라미터
 * @param {string} req.params.id - 판매사 ID
 * @param {Object} req.user - JWT 토큰에서 추출한 사용자 정보
 * @param {number} req.user.member_id - 회원 ID
 * @param {Object} req.body - 수정할 데이터
 * @param {string} [req.body.tenant_name] - 판매사 이름
 * @param {string} [req.body.tenant_detail_description] - 판매사 설명
 * @param {string} [req.body.tenant_detail_phone] - 연락처
 * @param {string} [req.body.tenant_detail_address] - 주소
 *
 * @returns {Object} 200 - { success: true, message: '...', data: tenant }
 * @returns {Object} 403 - { success: false, message: 'Only tenant owner can update' }
 * @returns {Object} 404 - { success: false, message: 'Tenant not found' }
 *
 * @example
 * // Request
 * PUT /api/v1/tenants/1
 * Authorization: Bearer eyJhbGci...
 * {
 *   "tenant_detail_description": "새로운 설명입니다",
 *   "tenant_detail_phone": "010-9999-8888"
 * }
 *
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "message": "Tenant updated successfully",
 *   "data": {
 *     "tenant_id": 1,
 *     "tenant_name": "홍길동 공방",
 *     "tenant_detail": { ... }
 *   }
 * }
 */
async function updateTenant(req, res, next) {
  try {
    // 1. URL 파라미터와 JWT 토큰에서 데이터 추출
    const tenantId = parseInt(req.params.id);
    const memberId = req.user.member_id;

    // 2. 요청 데이터 추출
    const updateData = req.body;

    // 3. Tenant Service 호출 (권한 확인 포함)
    const updated = await tenantService.updateTenant(tenantId, memberId, updateData);

    // 4. 성공 응답 반환 (200 OK)
    return successResponse(res, updated, 'Tenant updated successfully');
  } catch (error) {
    // 5. 에러를 errorHandler 미들웨어로 전달
    next(error);
  }
}

/**
 * 판매사 승인 (관리자)
 *
 * @description
 * PUT /api/v1/tenants/:id/approve
 * 판매사 등록 신청을 승인합니다. (관리자만 가능)
 *
 * @route PUT /api/v1/tenants/:id/approve
 * @access Private (authenticate + authorize('admin') 미들웨어 필요)
 *
 * @param {Object} req.params - URL 파라미터
 * @param {string} req.params.id - 판매사 ID
 * @param {Object} req.user - JWT 토큰에서 추출한 사용자 정보
 * @param {number} req.user.member_id - 관리자 ID
 *
 * @returns {Object} 200 - { success: true, message: '...', data: tenant }
 * @returns {Object} 400 - { success: false, message: 'Cannot approve tenant with status: ...' }
 * @returns {Object} 404 - { success: false, message: 'Tenant not found' }
 *
 * @example
 * // Request
 * PUT /api/v1/tenants/1/approve
 * Authorization: Bearer eyJhbGci... (admin)
 *
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "message": "Tenant approved successfully",
 *   "data": {
 *     "tenant_id": 1,
 *     "tenant_name": "홍길동 공방",
 *     "tenant_status": "approved",
 *     "tenant_approved_at": "2025-10-13T10:30:00Z"
 *   }
 * }
 */
async function approveTenant(req, res, next) {
  try {
    // 1. URL 파라미터와 JWT 토큰에서 데이터 추출
    const tenantId = parseInt(req.params.id);
    const adminId = req.user.member_id;

    // 2. Tenant Service 호출
    const approved = await tenantService.approveTenant(tenantId, adminId);

    // 3. 성공 응답 반환 (200 OK)
    return successResponse(res, approved, 'Tenant approved successfully');
  } catch (error) {
    // 4. 에러를 errorHandler 미들웨어로 전달
    next(error);
  }
}

/**
 * 판매사 거절 (관리자)
 *
 * @description
 * PUT /api/v1/tenants/:id/reject
 * 판매사 등록 신청을 거절합니다. (관리자만 가능)
 *
 * @route PUT /api/v1/tenants/:id/reject
 * @access Private (authenticate + authorize('admin') 미들웨어 필요)
 *
 * @param {Object} req.params - URL 파라미터
 * @param {string} req.params.id - 판매사 ID
 * @param {Object} req.user - JWT 토큰에서 추출한 사용자 정보
 * @param {number} req.user.member_id - 관리자 ID
 * @param {Object} req.body - 거절 사유
 * @param {string} [req.body.reason] - 거절 사유 (선택)
 *
 * @returns {Object} 200 - { success: true, message: '...', data: tenant }
 * @returns {Object} 400 - { success: false, message: 'Cannot reject tenant with status: ...' }
 * @returns {Object} 404 - { success: false, message: 'Tenant not found' }
 *
 * @example
 * // Request
 * PUT /api/v1/tenants/1/reject
 * Authorization: Bearer eyJhbGci... (admin)
 * {
 *   "reason": "부적절한 판매사 이름입니다"
 * }
 *
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "message": "Tenant rejected",
 *   "data": {
 *     "tenant_id": 1,
 *     "tenant_name": "홍길동 공방",
 *     "tenant_status": "rejected"
 *   }
 * }
 */
async function rejectTenant(req, res, next) {
  try {
    // 1. URL 파라미터와 JWT 토큰에서 데이터 추출
    const tenantId = parseInt(req.params.id);
    const adminId = req.user.member_id;

    // 2. 요청 데이터 추출 (거절 사유)
    const { reason } = req.body;

    // 3. Tenant Service 호출
    const rejected = await tenantService.rejectTenant(tenantId, adminId, reason);

    // 4. 성공 응답 반환 (200 OK)
    return successResponse(res, rejected, 'Tenant rejected');
  } catch (error) {
    // 5. 에러를 errorHandler 미들웨어로 전달
    next(error);
  }
}

/**
 * 판매사 목록 조회 (관리자)
 *
 * @description
 * GET /api/v1/tenants
 * 모든 판매사 목록을 조회합니다. (관리자만 가능, 페이징 및 필터링 지원)
 *
 * @route GET /api/v1/tenants
 * @access Private (authenticate + authorize('admin') 미들웨어 필요)
 *
 * @param {Object} req.query - 쿼리 파라미터
 * @param {number} [req.query.page=1] - 페이지 번호
 * @param {number} [req.query.limit=10] - 페이지당 항목 수
 * @param {string} [req.query.status] - 상태 필터 (pending/approved/rejected)
 *
 * @returns {Object} 200 - { success: true, data: { tenants, total, page, totalPages } }
 *
 * @example
 * // Request
 * GET /api/v1/tenants?status=pending&page=1&limit=10
 * Authorization: Bearer eyJhbGci... (admin)
 *
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "message": "Success",
 *   "data": {
 *     "tenants": [
 *       {
 *         "tenant_id": 1,
 *         "tenant_name": "홍길동 공방",
 *         "tenant_status": "pending",
 *         "tenant_applied_at": "2025-10-13T10:00:00Z"
 *       },
 *       ...
 *     ],
 *     "total": 50,
 *     "page": 1,
 *     "totalPages": 5
 *   }
 * }
 */
async function getAllTenants(req, res, next) {
  try {
    // 1. 쿼리 파라미터 추출
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      status: req.query.status
    };

    // 2. Tenant Service 호출
    const result = await tenantService.getAllTenants(options);

    // 3. 성공 응답 반환 (200 OK)
    return successResponse(res, result);
  } catch (error) {
    // 4. 에러를 errorHandler 미들웨어로 전달
    next(error);
  }
}

module.exports = {
  register,
  getMyTenants,
  getTenantById,
  updateTenant,
  approveTenant,
  rejectTenant,
  getAllTenants
};
