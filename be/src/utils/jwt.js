const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/constants');

/**
 * JWT 토큰 생성
 *
 * @description
 * 사용자 정보를 받아서 JWT 토큰을 생성합니다.
 * 로그인 성공 시 이 함수로 토큰을 발급합니다.
 *
 * @param {Object} payload - 토큰에 포함할 사용자 정보
 * @param {number} payload.member_id - 회원 ID
 * @param {string} payload.email - 이메일
 * @param {string} payload.role - 역할 (buyer/seller/admin)
 * @param {number} [payload.tenant_id] - 판매사 ID (선택, 판매자인 경우)
 * @param {number} [payload.tenant_member_id] - 판매사 구성원 ID (선택, 판매자인 경우)
 *
 * @returns {string} JWT 토큰
 *
 * @example
 * const token = generateToken({
 *   member_id: 123,
 *   email: 'user@example.com',
 *   role: 'buyer'
 * });
 * // 반환: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 */
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN || '7d'
  });
}

/**
 * JWT 토큰 검증
 *
 * @description
 * 클라이언트가 보낸 JWT 토큰이 유효한지 검증합니다.
 * 인증 미들웨어(authenticate)에서 사용됩니다.
 *
 * @param {string} token - 검증할 JWT 토큰
 * @returns {Object} 디코딩된 페이로드 (member_id, email, role 등)
 * @throws {Error} 토큰이 유효하지 않거나 만료된 경우
 *
 * @example
 * try {
 *   const decoded = verifyToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
 *   console.log(decoded.member_id); // 123
 *   console.log(decoded.email);     // 'user@example.com'
 * } catch (error) {
 *   console.error('Invalid token');
 * }
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw new Error('Token verification failed');
  }
}

module.exports = {
  generateToken,
  verifyToken
};