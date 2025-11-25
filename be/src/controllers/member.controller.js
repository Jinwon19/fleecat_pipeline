const memberService = require('../services/member.service');
const { successResponse } = require('../utils/response');

/**
 * Member Controller
 * 회원 정보 조회 및 수정 관련 HTTP 요청/응답 처리
 */

/**
 * 내 정보 조회
 *
 * @description
 * GET /api/v1/members/me
 * 로그인한 사용자 본인의 정보를 조회합니다.
 *
 * @route GET /api/v1/members/me
 * @access Private (authenticate 미들웨어 필요)
 *
 * @param {Object} req.user - JWT 토큰에서 추출한 사용자 정보 (authenticate 미들웨어가 설정)
 * @param {number} req.user.member_id - 회원 ID
 *
 * @returns {Object} 200 - { success: true, message: '...', data: { member } }
 * @returns {Object} 404 - { success: false, message: 'Member not found or inactive' }
 *
 * @example
 * // Request
 * GET /api/v1/members/me
 * Authorization: Bearer eyJhbGci...
 *
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "message": "Profile retrieved successfully",
 *   "data": {
 *     "member_id": 123,
 *     "member_email": "user@example.com",
 *     "member_nickname": "홍길동",
 *     "member_phone": "010-1234-5678",
 *     "role": "seller",
 *     "roles": ["buyer", "seller"]
 *   }
 * }
 */
async function getMe(req, res, next) {
  try {
    // 1. JWT 토큰에서 회원 ID 추출 (authenticate 미들웨어가 req.user 설정)
    const memberId = req.user.member_id;

    // 2. Member Service 호출
    const member = await memberService.getMyProfile(memberId);

    // 3. 성공 응답 반환 (200 OK)
    return successResponse(res, member, 'Profile retrieved successfully');
  } catch (error) {
    // 4. 에러를 errorHandler 미들웨어로 전달
    next(error);
  }
}

/**
 * 내 정보 수정
 *
 * @description
 * PUT /api/v1/members/me
 * 로그인한 사용자 본인의 정보를 수정합니다.
 *
 * @route PUT /api/v1/members/me
 * @access Private (authenticate 미들웨어 필요)
 *
 * @param {Object} req.user - JWT 토큰에서 추출한 사용자 정보 (authenticate 미들웨어가 설정)
 * @param {number} req.user.member_id - 회원 ID
 * @param {Object} req.body - 수정할 데이터
 * @param {string} [req.body.nickname] - 닉네임
 * @param {string} [req.body.phone] - 전화번호
 *
 * @returns {Object} 200 - { success: true, message: '...', data: { member } }
 * @returns {Object} 400 - { success: false, message: 'Nickname already exists' }
 * @returns {Object} 404 - { success: false, message: 'Member not found' }
 *
 * @example
 * // Request
 * PUT /api/v1/members/me
 * Authorization: Bearer eyJhbGci...
 * {
 *   "nickname": "새닉네임",
 *   "phone": "010-9999-8888"
 * }
 *
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "message": "Profile updated successfully",
 *   "data": {
 *     "member": {
 *       "member_id": 123,
 *       "member_email": "user@example.com",
 *       "member_nickname": "새닉네임",
 *       "member_phone": "010-9999-8888"
 *     }
 *   }
 * }
 */
async function updateMe(req, res, next) {
  try {
    // 1. JWT 토큰에서 회원 ID 추출 (authenticate 미들웨어가 req.user 설정)
    const memberId = req.user.member_id;

    // 2. 요청 데이터 추출
    const { nickname, phone } = req.body;

    // 3. Member Service 호출
    const result = await memberService.updateProfile(memberId, {
      nickname,
      phone
    });

    // 4. 성공 응답 반환 (200 OK)
    return successResponse(res, result, 'Profile updated successfully');
  } catch (error) {
    // 5. 에러를 errorHandler 미들웨어로 전달
    next(error);
  }
}

module.exports = {
  getMe,
  updateMe
};
