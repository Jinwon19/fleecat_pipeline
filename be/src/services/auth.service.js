const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const memberRepository = require('../repositories/member.repository');
const memberPermissionRepository = require('../repositories/memberPermission.repository');
const { generateToken } = require('../utils/jwt');
const { ValidationError, UnauthorizedError, NotFoundError } = require('../utils/errors');
const { supabaseClient, supabaseAdmin } = require('../config/supabase');

/**
 * Auth Service
 * 회원가입, 로그인, 비밀번호 변경 등 인증 관련 비즈니스 로직
 */

/**
 * 회원가입
 *
 * @description
 * 새로운 회원을 생성하고 기본 권한(buyer)을 부여합니다.
 * - 이메일 중복 확인
 * - 닉네임 중복 확인
 * - 비밀번호 해싱
 * - 회원 생성
 * - 권한 부여
 * - JWT 토큰 발급
 *
 * @param {Object} data - 회원가입 데이터
 * @param {string} data.email - 이메일
 * @param {string} data.password - 비밀번호 (평문)
 * @param {string} data.name - 이름
 * @param {string} data.nickname - 닉네임
 * @param {string} [data.phone] - 전화번호 (선택)
 *
 * @returns {Promise<Object>} { member, token }
 * @throws {ValidationError} 이메일 또는 닉네임 중복 시
 *
 * @example
 * const result = await authService.register({
 *   email: 'user@example.com',
 *   password: 'secure123!',
 *   name: '홍길동',
 *   nickname: '길동이',
 *   phone: '010-1234-5678'
 * });
 * // 반환: { member: {...}, token: "eyJhbGci..." }
 */
async function register(data) {
  const { email, password, name, nickname, phone } = data;

  // 1. 이메일 중복 확인
  const emailExists = await memberRepository.existsByEmail(email);
  if (emailExists) {
    throw new ValidationError('Email already exists');
  }

  // 2. 닉네임 중복 확인
  const nicknameExists = await memberRepository.existsByNickname(nickname);
  if (nicknameExists) {
    throw new ValidationError('Nickname already exists');
  }

  // 3. 비밀번호 해싱 (salt rounds: 10)
  const hashedPassword = await bcrypt.hash(password, 10);

  // 4. 회원 생성
  const member = await memberRepository.create({
    member_email: email,
    member_password: hashedPassword,
    member_name: name,
    member_nickname: nickname,
    member_phone: phone || null,
    member_status: 'active'
  });

  // 5. 기본 권한(buyer) 부여
  await memberPermissionRepository.create({
    member_id: Number(member.member_id),
    permission_role: 'buyer'
  });

  // 6. JWT 토큰 생성
  const token = generateToken({
    member_id: Number(member.member_id),
    email: member.member_email,
    role: 'buyer'
  });

  // 7. 비밀번호 제외하고 반환
  const { member_password, ...memberData } = member;

  return {
    member: {
      ...memberData,
      member_id: Number(memberData.member_id),
      company_id: memberData.company_id ? Number(memberData.company_id) : null,
      role: 'buyer',
      roles: ['buyer']
    },
    token
  };
}

/**
 * 로그인
 *
 * @description
 * 이메일과 비밀번호로 로그인합니다.
 * - 이메일로 회원 조회
 * - 회원 상태 확인 (active만 로그인 가능)
 * - 비밀번호 검증
 * - 권한 조회
 * - JWT 토큰 발급
 *
 * @param {string} email - 이메일
 * @param {string} password - 비밀번호 (평문)
 *
 * @returns {Promise<Object>} { member, token }
 * @throws {UnauthorizedError} 이메일/비밀번호 오류, 계정 정지/삭제 시
 *
 * @example
 * const result = await authService.login('user@example.com', 'secure123!');
 * // 반환: { member: {...}, token: "eyJhbGci..." }
 */
async function login(email, password) {
  // 1. 이메일로 회원 조회
  const member = await memberRepository.findByEmail(email);

  if (!member) {
    throw new UnauthorizedError('Invalid credentials');
  }

  // 2. 회원 상태 확인
  if (member.member_status !== 'active') {
    throw new UnauthorizedError('Account is suspended or deleted');
  }

  // 3. 비밀번호 검증
  const isPasswordValid = await bcrypt.compare(password, member.member_password);

  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid credentials');
  }

  // 4. 권한 조회 (member_account_role 사용)
  const primaryRole = member.member_account_role || 'buyer';
  const allRoles = [primaryRole];

  // 5. JWT 토큰 생성
  const token = generateToken({
    member_id: Number(member.member_id),
    email: member.member_email,
    role: primaryRole,
    roles: allRoles
  });

  // 6. 비밀번호 및 관계 데이터 제외하고 반환
  const { member_password, member_permissions, company, ...memberData } = member;

  return {
    member: {
      ...memberData,
      member_id: Number(memberData.member_id),
      company_id: memberData.company_id ? Number(memberData.company_id) : null,
      role: primaryRole,
      roles: allRoles
    },
    token
  };
}

/**
 * 비밀번호 변경
 *
 * @description
 * 현재 비밀번호를 확인하고 새 비밀번호로 변경합니다.
 * - 회원 조회
 * - 현재 비밀번호 확인
 * - 새 비밀번호와 현재 비밀번호 다른지 확인
 * - 새 비밀번호 해싱 및 저장
 *
 * @param {number} memberId - 회원 ID
 * @param {string} currentPassword - 현재 비밀번호 (평문)
 * @param {string} newPassword - 새 비밀번호 (평문)
 *
 * @returns {Promise<Object>} { message }
 * @throws {UnauthorizedError} 현재 비밀번호 오류 시
 * @throws {ValidationError} 새 비밀번호가 현재 비밀번호와 같을 시
 * @throws {NotFoundError} 회원을 찾을 수 없을 시
 *
 * @example
 * await authService.changePassword(123, 'oldpass123!', 'newpass456!');
 * // 반환: { message: 'Password changed successfully' }
 */
async function changePassword(memberId, currentPassword, newPassword) {
  // 1. 회원 조회
  const member = await memberRepository.findById(memberId);

  if (!member) {
    throw new NotFoundError('Member not found');
  }

  // 2. 현재 비밀번호 확인
  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, member.member_password);

  if (!isCurrentPasswordValid) {
    throw new UnauthorizedError('Current password is incorrect');
  }

  // 3. 새 비밀번호가 현재 비밀번호와 같은지 확인
  const isSameAsCurrentPassword = await bcrypt.compare(newPassword, member.member_password);

  if (isSameAsCurrentPassword) {
    throw new ValidationError('New password must be different from current password');
  }

  // 4. 새 비밀번호 해싱
  const hashedNewPassword = await bcrypt.hash(newPassword, 10);

  // 5. 비밀번호 업데이트
  await memberRepository.updatePassword(memberId, hashedNewPassword);

  return {
    message: 'Password changed successfully'
  };
}

/**
 * 소셜 로그인 URL 생성
 *
 * @description
 * Supabase Auth OAuth URL을 생성합니다.
 * 프론트엔드는 이 URL로 사용자를 리다이렉트합니다.
 *
 * @param {string} provider - 소셜 로그인 제공자 ('google', 'kakao')
 * @returns {Promise<Object>} { url, provider }
 * @throws {ValidationError} 지원하지 않는 provider
 *
 * @example
 * const result = await authService.getSocialLoginUrl('google');
 * // 반환: { url: "https://...", provider: "google" }
 */
async function getSocialLoginUrl(provider) {
  // 지원하는 provider 확인
  const supportedProviders = ['google', 'kakao'];
  if (!supportedProviders.includes(provider)) {
    throw new ValidationError(`Unsupported provider: ${provider}. Supported: ${supportedProviders.join(', ')}`);
  }

  // Supabase OAuth URL 생성
  const { data, error } = await supabaseClient.auth.signInWithOAuth({
    provider: provider,
    options: {
      redirectTo: `${process.env.FRONTEND_URL}/auth/callback`
    }
  });

  if (error) {
    throw new Error(`Failed to generate ${provider} login URL: ${error.message}`);
  }

  return {
    url: data.url,
    provider: provider
  };
}

/**
 * 소셜 로그인 콜백 처리
 *
 * @description
 * OAuth 콜백에서 받은 code로 Supabase 세션을 생성하고,
 * 사용자 정보를 Member 테이블에 동기화합니다.
 *
 * @param {string} code - OAuth authorization code
 * @param {string} provider - 소셜 로그인 제공자
 * @returns {Promise<Object>} { member, token }
 * @throws {UnauthorizedError} 인증 실패 시
 *
 * @example
 * const result = await authService.handleSocialCallback(code, 'google');
 * // 반환: { member: {...}, token: "eyJhbGci..." }
 */
async function handleSocialCallback(code, provider) {
  // 1. Supabase에서 세션 생성
  const { data: sessionData, error: sessionError } = await supabaseClient.auth.exchangeCodeForSession(code);

  if (sessionError || !sessionData.session) {
    throw new UnauthorizedError(`Failed to authenticate with ${provider}: ${sessionError?.message || 'No session'}`);
  }

  const supabaseUser = sessionData.user;

  // 2. Member 테이블에 동기화 (없으면 생성)
  const member = await findOrCreateMemberFromSocial(supabaseUser, provider);

  // 3. JWT 토큰 생성 (자체 토큰)
  const token = generateToken({
    member_id: Number(member.member_id),
    email: member.member_email,
    role: member.member_account_role || 'buyer'
  });

  // 4. 비밀번호 제외하고 반환
  const { member_password, ...memberData } = member;

  return {
    member: {
      ...memberData,
      member_id: Number(memberData.member_id),
      company_id: memberData.company_id ? Number(memberData.company_id) : null,
      role: memberData.member_account_role || 'buyer',
      roles: [memberData.member_account_role || 'buyer']
    },
    token,
    supabaseSession: sessionData.session // Supabase 세션 정보
  };
}

/**
 * 소셜 로그인 토큰 처리 (Implicit Flow)
 *
 * @description
 * Supabase에서 받은 access_token으로 사용자 정보를 조회하고,
 * Member 테이블에 동기화한 후 JWT 토큰을 발급합니다.
 *
 * @param {string} accessToken - Supabase access token
 * @param {string} provider - 소셜 로그인 제공자
 * @returns {Promise<Object>} { member, token }
 * @throws {UnauthorizedError} 인증 실패 시
 *
 * @example
 * const result = await authService.handleSocialToken(accessToken, 'google');
 * // 반환: { member: {...}, token: "eyJhbGci..." }
 */
async function handleSocialToken(accessToken, provider, refreshToken) {
  // 1. JWT 서명 검증 및 디코드 (표준 방식)
  let decoded;
  try {
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('SUPABASE_JWT_SECRET is not configured');
    }

    // JWT 검증 (서명 확인 + 만료 시간 확인)
    decoded = jwt.verify(accessToken, jwtSecret, {
      algorithms: ['HS256']
    });

    if (!decoded || !decoded.sub || !decoded.email) {
      throw new Error('Invalid token payload');
    }
  } catch (error) {
    throw new UnauthorizedError(`Failed to verify ${provider} token: ${error.message}`);
  }

  // 2. JWT에서 사용자 정보 추출
  const supabaseUser = {
    id: decoded.sub,
    email: decoded.email,
    user_metadata: decoded.user_metadata || {}
  };

  // 3. Member 테이블에 동기화 (없으면 생성)
  const member = await findOrCreateMemberFromSocial(supabaseUser, provider);

  // 4. JWT 토큰 생성 (자체 토큰)
  const token = generateToken({
    member_id: Number(member.member_id),
    email: member.member_email,
    role: member.member_account_role || 'buyer'
  });

  // 5. 비밀번호 제외하고 반환
  const { member_password, ...memberData } = member;

  return {
    member: {
      ...memberData,
      member_id: Number(memberData.member_id),
      company_id: memberData.company_id ? Number(memberData.company_id) : null,
      role: memberData.member_account_role || 'buyer',
      roles: [memberData.member_account_role || 'buyer']
    },
    token
  };
}

/**
 * 소셜 로그인 사용자 찾기/생성
 *
 * @description
 * Supabase 사용자 정보로 Member 테이블에서 회원을 찾거나 새로 생성합니다.
 * - member_auth_id로 검색 (우선)
 * - 없으면 email로 검색 (계정 연결)
 * - 둘 다 없으면 신규 회원 생성
 *
 * @param {Object} supabaseUser - Supabase auth.users 객체
 * @param {string} provider - 소셜 로그인 제공자
 * @returns {Promise<Object>} Member 객체
 *
 * @example
 * const member = await findOrCreateMemberFromSocial(supabaseUser, 'google');
 */
async function findOrCreateMemberFromSocial(supabaseUser, provider) {
  const authId = supabaseUser.id;
  const email = supabaseUser.email;
  const name = supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || email.split('@')[0];

  // 1. member_auth_id로 검색 (이미 소셜 로그인한 사용자)
  let member = await memberRepository.findByAuthId(authId);

  if (member) {
    // 로그인 시간 업데이트
    await memberRepository.updateLoginTime(member.member_id);
    return member;
  }

  // 2. email로 검색 (기존 회원 - 계정 연결)
  member = await memberRepository.findByEmail(email);

  if (member) {
    // 기존 회원에 소셜 계정 연결
    await memberRepository.update(member.member_id, {
      member_auth_id: authId,
      member_auth_provider: provider
    });

    // 업데이트된 정보 다시 조회
    member = await memberRepository.findById(member.member_id);
    await memberRepository.updateLoginTime(member.member_id);
    return member;
  }

  // 3. 신규 회원 생성
  const nickname = `${provider}_${email.split('@')[0]}_${Date.now().toString().slice(-4)}`;

  member = await memberRepository.create({
    member_email: email,
    member_password: null, // 소셜 로그인은 비밀번호 없음
    member_name: name,
    member_nickname: nickname,
    member_phone: null,
    member_status: 'active',
    member_auth_id: authId,
    member_auth_provider: provider
  });

  // 4. 기본 권한(buyer) 부여
  await memberPermissionRepository.create({
    member_id: Number(member.member_id),
    permission_role: 'buyer'
  });

  return member;
}

module.exports = {
  register,
  login,
  changePassword,
  getSocialLoginUrl,
  handleSocialCallback,
  handleSocialToken
};
