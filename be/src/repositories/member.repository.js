const prisma = require('../config/database');

/**
 * Member Repository
 * member 테이블에 대한 데이터 접근 계층
 */

/**
 * ID로 회원 조회
 * @param {number} memberId - 회원 ID
 * @returns {Promise<Object|null>} 회원 정보 또는 null
 */
async function findById(memberId) {
  try {
    return await prisma.member.findUnique({
      where: { member_id: BigInt(memberId) },
      include: {
        member_permissions: true,
        company: true
      }
    });
  } catch (error) {
    throw new Error(`Failed to find member by ID: ${error.message}`);
  }
}

/**
 * 이메일로 회원 조회
 * @param {string} email - 이메일
 * @returns {Promise<Object|null>} 회원 정보 또는 null
 */
async function findByEmail(email) {
  try {
    return await prisma.member.findUnique({
      where: { member_email: email },
      include: {
        member_permissions: true,
        company: true
      }
    });
  } catch (error) {
    throw new Error(`Failed to find member by email: ${error.message}`);
  }
}

/**
 * 닉네임으로 회원 조회
 * @param {string} nickname - 닉네임
 * @returns {Promise<Object|null>} 회원 정보 또는 null
 */
async function findByNickname(nickname) {
  try {
    return await prisma.member.findUnique({
      where: { member_nickname: nickname }
    });
  } catch (error) {
    throw new Error(`Failed to find member by nickname: ${error.message}`);
  }
}

/**
 * Auth ID로 회원 조회 (소셜 로그인용)
 * @param {string} authId - Supabase auth.users.id (UUID)
 * @returns {Promise<Object|null>} 회원 정보 또는 null
 */
async function findByAuthId(authId) {
  try {
    return await prisma.member.findUnique({
      where: { member_auth_id: authId },
      include: {
        member_permissions: true,
        company: true
      }
    });
  } catch (error) {
    throw new Error(`Failed to find member by auth ID: ${error.message}`);
  }
}

/**
 * 이메일 존재 여부 확인
 * @param {string} email - 이메일
 * @returns {Promise<boolean>} 존재 여부
 */
async function existsByEmail(email) {
  try {
    const count = await prisma.member.count({
      where: { member_email: email }
    });
    return count > 0;
  } catch (error) {
    throw new Error(`Failed to check email existence: ${error.message}`);
  }
}

/**
 * 닉네임 존재 여부 확인
 * @param {string} nickname - 닉네임
 * @returns {Promise<boolean>} 존재 여부
 */
async function existsByNickname(nickname) {
  try {
    const count = await prisma.member.count({
      where: { member_nickname: nickname }
    });
    return count > 0;
  } catch (error) {
    throw new Error(`Failed to check nickname existence: ${error.message}`);
  }
}

/**
 * 회원 생성
 * @param {Object} memberData - 회원 데이터
 * @param {string} memberData.member_email - 이메일
 * @param {string} [memberData.member_password] - 해싱된 비밀번호 (소셜 로그인 시 null)
 * @param {string} memberData.member_name - 이름
 * @param {string} memberData.member_nickname - 닉네임
 * @param {string} [memberData.member_phone] - 전화번호
 * @param {string} [memberData.member_status='active'] - 상태
 * @param {number} [memberData.company_id] - 회사 ID
 * @param {string} [memberData.member_auth_id] - Supabase Auth ID (소셜 로그인용)
 * @param {string} [memberData.member_auth_provider] - 인증 제공자 ('email', 'google', 'kakao')
 * @returns {Promise<Object>} 생성된 회원 정보
 */
async function create(memberData) {
  try {
    return await prisma.member.create({
      data: {
        member_email: memberData.member_email,
        member_password: memberData.member_password || null,
        member_name: memberData.member_name,
        member_nickname: memberData.member_nickname,
        member_phone: memberData.member_phone || null,
        member_status: memberData.member_status || 'active',
        company_id: memberData.company_id ? BigInt(memberData.company_id) : null,
        member_auth_id: memberData.member_auth_id || null,
        member_auth_provider: memberData.member_auth_provider || null
      }
    });
  } catch (error) {
    throw new Error(`Failed to create member: ${error.message}`);
  }
}

/**
 * 회원 정보 수정
 * @param {number} memberId - 회원 ID
 * @param {Object} updateData - 수정할 데이터
 * @param {string} [updateData.member_nickname] - 닉네임
 * @param {string} [updateData.member_phone] - 전화번호
 * @param {string} [updateData.member_status] - 상태
 * @returns {Promise<Object>} 수정된 회원 정보
 */
async function update(memberId, updateData) {
  try {
    return await prisma.member.update({
      where: { member_id: BigInt(memberId) },
      data: updateData
    });
  } catch (error) {
    throw new Error(`Failed to update member: ${error.message}`);
  }
}

/**
 * 비밀번호 변경
 * @param {number} memberId - 회원 ID
 * @param {string} hashedPassword - 해싱된 새 비밀번호
 * @returns {Promise<Object>} 수정된 회원 정보
 */
async function updatePassword(memberId, hashedPassword) {
  try {
    return await prisma.member.update({
      where: { member_id: BigInt(memberId) },
      data: { member_password: hashedPassword }
    });
  } catch (error) {
    throw new Error(`Failed to update password: ${error.message}`);
  }
}

/**
 * 로그인 시간 업데이트
 * @param {number} memberId - 회원 ID
 * @returns {Promise<Object>} 수정된 회원 정보
 */
async function updateLoginTime(memberId) {
  try {
    return await prisma.member.update({
      where: { member_id: BigInt(memberId) },
      data: { member_last_login_at: new Date() }
    });
  } catch (error) {
    throw new Error(`Failed to update login time: ${error.message}`);
  }
}

/**
 * 회원 삭제 (Soft Delete - 상태를 'inactive'로 변경)
 * @param {number} memberId - 회원 ID
 * @returns {Promise<Object>} 수정된 회원 정보
 */
async function deleteById(memberId) {
  try {
    return await prisma.member.update({
      where: { member_id: BigInt(memberId) },
      data: { member_status: 'inactive' }
    });
  } catch (error) {
    throw new Error(`Failed to delete member: ${error.message}`);
  }
}

/**
 * 활성 회원만 조회 (member_status가 'active'인 회원)
 * @param {number} memberId - 회원 ID
 * @returns {Promise<Object|null>} 회원 정보 또는 null
 */
async function findActiveById(memberId) {
  try {
    return await prisma.member.findFirst({
      where: {
        member_id: BigInt(memberId),
        member_status: 'active'
      },
      include: {
        member_permissions: true,
        company: true
      }
    });
  } catch (error) {
    throw new Error(`Failed to find active member by ID: ${error.message}`);
  }
}

/**
 * 모든 회원 조회 (관리자용, 페이지네이션 지원)
 * @param {Object} options - 조회 옵션
 * @param {number} [options.page=1] - 페이지 번호
 * @param {number} [options.limit=10] - 페이지당 항목 수
 * @param {string} [options.status] - 상태 필터
 * @returns {Promise<Object>} { members, total, page, totalPages }
 */
async function findAll(options = {}) {
  try {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;

    const where = {};
    if (options.status) {
      where.member_status = options.status;
    }

    const [members, total] = await Promise.all([
      prisma.member.findMany({
        where,
        skip,
        take: limit,
        orderBy: { member_created_at: 'desc' },
        include: {
          member_permissions: true,
          company: true
        }
      }),
      prisma.member.count({ where })
    ]);

    return {
      members,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  } catch (error) {
    throw new Error(`Failed to find all members: ${error.message}`);
  }
}

module.exports = {
  findById,
  findByEmail,
  findByNickname,
  findByAuthId,
  existsByEmail,
  existsByNickname,
  create,
  update,
  updatePassword,
  updateLoginTime,
  deleteById,
  findActiveById,
  findAll
};
