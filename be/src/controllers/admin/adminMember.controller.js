const adminMemberService = require('../../services/admin/adminMember.service');
const { successResponse } = require('../../utils/response');

/**
 * 회원 목록 조회
 */
async function getMemberList(req, res, next) {
  try {
    const { page, limit, status, role, search } = req.query;

    const options = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      status,
      role,
      search
    };

    const result = await adminMemberService.getMemberList(options);

    return successResponse(res, result, '회원 목록을 조회했습니다.');
  } catch (error) {
    next(error);
  }
}

/**
 * 회원 상세 조회
 */
async function getMemberById(req, res, next) {
  try {
    const { id } = req.params;
    const member = await adminMemberService.getMemberById(parseInt(id));

    return successResponse(res, member, '회원 정보를 조회했습니다.');
  } catch (error) {
    next(error);
  }
}

/**
 * 회원 상태 변경
 */
async function updateMemberStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updated = await adminMemberService.updateMemberStatus(parseInt(id), status);

    return successResponse(res, updated, '회원 상태가 변경되었습니다.');
  } catch (error) {
    next(error);
  }
}

/**
 * 회원 역할 변경
 */
async function updateMemberRole(req, res, next) {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const currentAdminId = req.user?.id; // 인증 미들웨어에서 설정한 사용자 ID

    const updated = await adminMemberService.updateMemberRole(
      parseInt(id),
      role,
      currentAdminId
    );

    return successResponse(res, updated, '회원 역할이 변경되었습니다.');
  } catch (error) {
    next(error);
  }
}

/**
 * 회원 통계 조회
 */
async function getMemberStatistics(req, res, next) {
  try {
    const stats = await adminMemberService.getMemberStatistics();

    return successResponse(res, stats, '회원 통계를 조회했습니다.');
  } catch (error) {
    next(error);
  }
}

/**
 * 회원 검색
 */
async function searchMembers(req, res, next) {
  try {
    const { keyword, limit } = req.query;

    const options = {
      limit: limit ? parseInt(limit) : 10
    };

    const members = await adminMemberService.searchMembers(keyword, options);

    return successResponse(res, members, '회원 검색 결과입니다.');
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getMemberList,
  getMemberById,
  updateMemberStatus,
  updateMemberRole,
  getMemberStatistics,
  searchMembers
};
