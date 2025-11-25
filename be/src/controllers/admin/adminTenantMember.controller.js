const adminTenantMemberService = require('../../services/admin/adminTenantMember.service');
const { successResponse } = require('../../utils/response');

/**
 * 판매사 구성원 목록 조회 (전체)
 */
async function getTenantMemberList(req, res, next) {
  try {
    const { tenant_id, status, role } = req.query;

    const options = {
      tenant_id: tenant_id ? parseInt(tenant_id) : undefined,
      status,
      role
    };

    const result = await adminTenantMemberService.getTenantMemberList(options);

    return successResponse(res, result, '판매사 구성원 목록을 조회했습니다.');
  } catch (error) {
    next(error);
  }
}

/**
 * 판매사 구성원 상세 조회
 */
async function getTenantMemberById(req, res, next) {
  try {
    const { id } = req.params;
    const tenantMember = await adminTenantMemberService.getTenantMemberById(parseInt(id));

    return successResponse(res, tenantMember, '판매사 구성원 정보를 조회했습니다.');
  } catch (error) {
    next(error);
  }
}

/**
 * 판매사 구성원 승인
 */
async function approveTenantMember(req, res, next) {
  try {
    const { id } = req.params;

    const approved = await adminTenantMemberService.approveTenantMember(parseInt(id));

    return successResponse(res, approved, '판매사 구성원이 승인되었습니다.');
  } catch (error) {
    next(error);
  }
}

/**
 * 판매사 구성원 거절
 */
async function rejectTenantMember(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const rejected = await adminTenantMemberService.rejectTenantMember(parseInt(id), reason);

    return successResponse(res, rejected, '판매사 구성원이 거절되었습니다.');
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getTenantMemberList,
  getTenantMemberById,
  approveTenantMember,
  rejectTenantMember
};
