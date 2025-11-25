const memberRepo = require('../../repositories/admin/adminMember.repository');
const { NotFoundError, ValidationError } = require('../../utils/errors');

/**
 * Admin Member Service
 * 관리자용 회원 관리 비즈니스 로직
 */

/**
 * 회원 목록 조회
 * @param {Object} options - 조회 옵션
 * @returns {Promise<Object>} 회원 목록 및 페이징 정보
 */
async function getMemberList(options = {}) {
  const { page = 1, limit = 20, status, role, search } = options;

  // 1. 입력값 검증
  if (page < 1) {
    throw new ValidationError('페이지 번호는 1 이상이어야 합니다');
  }

  if (limit < 1 || limit > 100) {
    throw new ValidationError('limit은 1~100 사이여야 합니다');
  }

  // 2. status 검증
  const validStatuses = ['active', 'suspended', 'inactive'];
  if (status && !validStatuses.includes(status)) {
    throw new ValidationError(`유효하지 않은 상태: ${status}`);
  }

  // 3. role 검증
  const validRoles = ['buyer', 'seller', 'admin'];
  if (role && !validRoles.includes(role)) {
    throw new ValidationError(`유효하지 않은 역할: ${role}`);
  }

  // 4. Repository 호출
  const result = await memberRepo.findAll(options);

  // 5. BigInt 변환 및 응답 형식 표준화
  return {
    data: result.members.map(member => ({
      ...member,
      member_id: member.member_id.toString(),
      company_id: member.company?.company_id?.toString()
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
 * 회원 상세 조회
 * @param {number} memberId - 회원 ID
 * @returns {Promise<Object>} 회원 상세 정보
 */
async function getMemberById(memberId) {
  // 1. Repository 호출
  const member = await memberRepo.findByIdWithDetails(memberId);

  // 2. 존재 확인
  if (!member) {
    throw new NotFoundError(`회원 ID ${memberId}를 찾을 수 없습니다`);
  }

  // 3. BigInt 변환
  return {
    ...member,
    member_id: member.member_id.toString(),
    company_id: member.company?.company_id?.toString()
  };
}

/**
 * 회원 상태 변경
 * @param {number} memberId - 회원 ID
 * @param {string} status - 변경할 상태
 * @returns {Promise<Object>} 변경된 회원 정보
 */
async function updateMemberStatus(memberId, status) {
  // 1. status 검증
  const validStatuses = ['active', 'suspended', 'inactive'];
  if (!validStatuses.includes(status)) {
    throw new ValidationError(`유효하지 않은 상태: ${status}`);
  }

  // 2. 회원 조회
  const member = await memberRepo.findByIdWithDetails(memberId);
  if (!member) {
    throw new NotFoundError(`회원 ID ${memberId}를 찾을 수 없습니다`);
  }

  // 3. 비즈니스 규칙: admin은 정지할 수 없음
  if (member.member_account_role === 'admin' && status === 'suspended') {
    throw new ValidationError('관리자는 정지할 수 없습니다');
  }

  // 4. 비즈니스 규칙: 이미 같은 상태면 에러
  if (member.member_status === status) {
    throw new ValidationError(`이미 ${status} 상태입니다`);
  }

  // 5. 상태 변경
  const updated = await memberRepo.updateStatus(memberId, status);

  // 6. BigInt 변환
  return {
    ...updated,
    member_id: updated.member_id.toString()
  };
}

/**
 * 회원 역할 변경
 * @param {number} memberId - 회원 ID
 * @param {string} role - 변경할 역할
 * @param {number} currentAdminId - 현재 관리자 ID
 * @returns {Promise<Object>} 변경된 회원 정보
 */
async function updateMemberRole(memberId, role, currentAdminId) {
  // 1. role 검증
  const validRoles = ['buyer', 'seller', 'admin'];
  if (!validRoles.includes(role)) {
    throw new ValidationError(`유효하지 않은 역할: ${role}`);
  }

  // 2. 회원 조회
  const member = await memberRepo.findByIdWithDetails(memberId);
  if (!member) {
    throw new NotFoundError(`회원 ID ${memberId}를 찾을 수 없습니다`);
  }

  // 3. 비즈니스 규칙: 자기 자신의 역할 변경 불가
  if (Number(memberId) === Number(currentAdminId)) {
    throw new ValidationError('자신의 역할은 변경할 수 없습니다');
  }

  // 4. 비즈니스 규칙: admin 권한 관련
  if (member.member_account_role === 'admin') {
    throw new ValidationError('관리자 권한은 해제할 수 없습니다');
  }

  if (role === 'admin') {
    throw new ValidationError('관리자 권한은 시스템에서 직접 부여합니다');
  }

  // 5. 비즈니스 규칙: 이미 같은 역할이면 에러
  if (member.member_account_role === role) {
    throw new ValidationError(`이미 ${role} 역할입니다`);
  }

  // 6. 역할 변경
  const updated = await memberRepo.updateRole(memberId, role);

  // 7. BigInt 변환
  return {
    ...updated,
    member_id: updated.member_id.toString()
  };
}

/**
 * 회원 통계 조회
 * @returns {Promise<Object>} 회원 통계 및 가공된 데이터
 */
async function getMemberStatistics() {
  // 1. Repository 호출
  const stats = await memberRepo.getStatistics();

  // 2. 추가 계산
  const activeRate = stats.totalMembers > 0
    ? (stats.activeMembers / stats.totalMembers * 100).toFixed(1)
    : 0;

  const suspendedRate = stats.totalMembers > 0
    ? (stats.suspendedMembers / stats.totalMembers * 100).toFixed(1)
    : 0;

  const inactiveRate = stats.totalMembers > 0
    ? (stats.inactiveMembers / stats.totalMembers * 100).toFixed(1)
    : 0;

  // 3. 역할별 비율 계산
  const roleRates = {
    buyer: stats.totalMembers > 0
      ? (stats.roleDistribution.buyer / stats.totalMembers * 100).toFixed(1)
      : 0,
    seller: stats.totalMembers > 0
      ? (stats.roleDistribution.seller / stats.totalMembers * 100).toFixed(1)
      : 0,
    admin: stats.totalMembers > 0
      ? (stats.roleDistribution.admin / stats.totalMembers * 100).toFixed(1)
      : 0
  };

  // 4. 가공된 데이터 반환
  return {
    ...stats,
    activeRate: parseFloat(activeRate),
    suspendedRate: parseFloat(suspendedRate),
    inactiveRate: parseFloat(inactiveRate),
    roleRates: {
      buyer: parseFloat(roleRates.buyer),
      seller: parseFloat(roleRates.seller),
      admin: parseFloat(roleRates.admin)
    }
  };
}

/**
 * 회원 검색
 * @param {string} keyword - 검색 키워드
 * @param {Object} options - 검색 옵션
 * @returns {Promise<Array>} 검색된 회원 목록
 */
async function searchMembers(keyword, options = {}) {
  // 1. 검색어 검증
  if (!keyword || keyword.trim().length === 0) {
    throw new ValidationError('검색어를 입력해주세요');
  }

  if (keyword.trim().length < 2) {
    throw new ValidationError('검색어는 2자 이상 입력해주세요');
  }

  // 2. 검색어 정제
  const cleanKeyword = keyword.trim();

  // 3. limit 검증
  const limit = options.limit || 10;
  if (limit < 1 || limit > 50) {
    throw new ValidationError('limit은 1~50 사이여야 합니다');
  }

  // 4. Repository 호출
  const members = await memberRepo.searchMembers(cleanKeyword, limit);

  // 5. BigInt 변환
  return members.map(member => ({
    ...member,
    member_id: member.member_id.toString()
  }));
}

module.exports = {
  getMemberList,
  getMemberById,
  updateMemberStatus,
  updateMemberRole,
  getMemberStatistics,
  searchMembers
};
