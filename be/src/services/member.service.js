const memberRepository = require('../repositories/member.repository');
const memberPermissionRepository = require('../repositories/memberPermission.repository');
const { ValidationError, NotFoundError } = require('../utils/errors');

/**
 * Member Service
 * 회원 정보 조회 및 수정 관련 비즈니스 로직
 */

/**
 * 내 정보 조회 (로그인한 사용자 본인)
 *
 * @description
 * 로그인한 사용자 자신의 정보를 조회합니다.
 * - 활성 회원만 조회 (member_status: 'active')
 * - 권한 정보 포함
 * - 비밀번호 제외
 *
 * @param {number} memberId - 회원 ID (JWT 토큰에서 추출)
 *
 * @returns {Promise<Object>} 회원 정보 + 권한 정보
 * @throws {NotFoundError} 회원을 찾을 수 없거나 비활성 계정일 때
 *
 * @example
 * const profile = await memberService.getMyProfile(123);
 * // 반환: { member_id: 123, member_email: '...', role: 'seller', roles: [...] }
 */
async function getMyProfile(memberId) {
  // 1. 활성 회원만 조회
  const member = await memberRepository.findActiveById(memberId);

  if (!member) {
    throw new NotFoundError('Member not found or inactive');
  }

  // 2. 권한 조회
  const primaryRole = await memberPermissionRepository.getPrimaryRole(Number(member.member_id));
  const allRoles = await memberPermissionRepository.getRoles(Number(member.member_id));

  // 3. 비밀번호 및 관계 데이터 제외하고 반환
  const { member_password, member_permissions, company, ...memberData } = member;

  return {
    ...memberData,
    member_id: Number(memberData.member_id),
    company_id: memberData.company_id ? Number(memberData.company_id) : null,
    role: primaryRole,
    roles: allRoles
  };
}

/**
 * 내 정보 수정 (로그인한 사용자 본인)
 *
 * @description
 * 로그인한 사용자가 자신의 정보를 수정합니다.
 * - 닉네임 중복 확인 (자기 자신 제외)
 * - member_nickname, member_phone 수정 가능
 * - member_email, member_password는 별도 API 사용
 *
 * @param {number} memberId - 회원 ID (JWT 토큰에서 추출)
 * @param {Object} updateData - 수정할 데이터
 * @param {string} [updateData.nickname] - 닉네임
 * @param {string} [updateData.phone] - 전화번호
 *
 * @returns {Promise<Object>} { member, message }
 * @throws {ValidationError} 닉네임 중복 시
 * @throws {NotFoundError} 회원을 찾을 수 없을 때
 *
 * @example
 * const result = await memberService.updateProfile(123, {
 *   nickname: '새닉네임',
 *   phone: '010-9999-8888'
 * });
 * // 반환: { member: {...}, message: 'Profile updated successfully' }
 */
async function updateProfile(memberId, updateData) {
  // 1. 회원 존재 확인
  const existingMember = await memberRepository.findById(memberId);

  if (!existingMember) {
    throw new NotFoundError('Member not found');
  }

  // 2. 닉네임 변경 시 중복 확인 (자기 자신 제외)
  if (updateData.nickname) {
    const nicknameExists = await memberRepository.findByNickname(updateData.nickname);

    if (nicknameExists && nicknameExists.member_id !== BigInt(memberId)) {
      throw new ValidationError('Nickname already exists');
    }
  }

  // 3. 업데이트할 데이터 준비
  const dataToUpdate = {};

  if (updateData.nickname) {
    dataToUpdate.member_nickname = updateData.nickname;
  }

  if (updateData.phone !== undefined) {
    dataToUpdate.member_phone = updateData.phone || null;
  }

  // 4. 회원 정보 업데이트
  const updatedMember = await memberRepository.update(memberId, dataToUpdate);

  // 5. 비밀번호 제외하고 반환
  const { member_password, ...memberData } = updatedMember;

  return {
    member: {
      ...memberData,
      member_id: Number(memberData.member_id),
      company_id: memberData.company_id ? Number(memberData.company_id) : null
    },
    message: 'Profile updated successfully'
  };
}

/**
 * 회원 조회 (관리자 전용)
 *
 * @description
 * 관리자가 특정 회원의 정보를 조회합니다.
 * - 모든 상태의 회원 조회 가능 (active, inactive, suspended)
 * - 권한 정보 포함
 * - 비밀번호 제외
 *
 * @param {number} memberId - 조회할 회원 ID
 *
 * @returns {Promise<Object>} 회원 정보 + 권한 정보
 * @throws {NotFoundError} 회원을 찾을 수 없을 때
 *
 * @example
 * const member = await memberService.getMemberById(123);
 * // 반환: { member_id: 123, member_status: 'suspended', ... }
 */
async function getMemberById(memberId) {
  // 1. 회원 조회 (모든 상태)
  const member = await memberRepository.findById(memberId);

  if (!member) {
    throw new NotFoundError('Member not found');
  }

  // 2. 권한 조회
  const primaryRole = await memberPermissionRepository.getPrimaryRole(Number(member.member_id));
  const allRoles = await memberPermissionRepository.getRoles(Number(member.member_id));

  // 3. 비밀번호 및 관계 데이터 제외하고 반환
  const { member_password, member_permissions, company, ...memberData } = member;

  return {
    ...memberData,
    member_id: Number(memberData.member_id),
    company_id: memberData.company_id ? Number(memberData.company_id) : null,
    role: primaryRole,
    roles: allRoles
  };
}

module.exports = {
  getMyProfile,
  updateProfile,
  getMemberById
};
