const adminTenantService = require('../../services/admin/adminTenant.service');
const { successResponse } = require('../../utils/response');

/**
 * 판매사 목록 조회
 */
async function getTenantList(req, res, next) {
  try {
    const { page, limit, status, search } = req.query;

    const options = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      status,
      search
    };

    const result = await adminTenantService.getTenantList(options);

    return successResponse(res, result, '판매사 목록을 조회했습니다.');
  } catch (error) {
    next(error);
  }
}

/**
 * 판매사 상세 조회
 */
async function getTenantById(req, res, next) {
  try {
    const { id } = req.params;
    const tenant = await adminTenantService.getTenantById(parseInt(id));

    return successResponse(res, tenant, '판매사 정보를 조회했습니다.');
  } catch (error) {
    next(error);
  }
}

/**
 * 판매사 승인
 */
async function approveTenant(req, res, next) {
  try {
    const { id } = req.params;
    const { admin_memo } = req.body;

    const approved = await adminTenantService.approveTenant(parseInt(id), { admin_memo });

    return successResponse(res, approved, '판매사가 승인되었습니다.');
  } catch (error) {
    next(error);
  }
}

/**
 * 판매사 거절
 */
async function rejectTenant(req, res, next) {
  try {
    const { id } = req.params;
    const { reject_reason } = req.body;

    const rejected = await adminTenantService.rejectTenant(parseInt(id), reject_reason);

    return successResponse(res, rejected, '판매사가 거절되었습니다.');
  } catch (error) {
    next(error);
  }
}

/**
 * 판매사 상태 변경
 */
async function updateTenantStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updated = await adminTenantService.updateTenantStatus(parseInt(id), status);

    return successResponse(res, updated, '판매사 상태가 변경되었습니다.');
  } catch (error) {
    next(error);
  }
}

/**
 * 판매사 통계 조회
 */
async function getTenantStatistics(req, res, next) {
  try {
    const stats = await adminTenantService.getTenantStatistics();

    return successResponse(res, stats, '판매사 통계를 조회했습니다.');
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getTenantList,
  getTenantById,
  approveTenant,
  rejectTenant,
  updateTenantStatus,
  getTenantStatistics
};
