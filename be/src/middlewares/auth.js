const { verifyToken } = require('../utils/jwt');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');

/**
 * JWT 인증 미들웨어
 * Authorization 헤더에서 토큰을 추출하여 검증하고, req.user에 사용자 정보를 저장합니다.
 */
function authenticate(req, res, next) {
  try {
    // 1. Authorization 헤더 확인
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedError('Authorization header is missing');
    }

    // 2. Bearer 토큰 추출
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedError('Invalid authorization header format. Use: Bearer <token>');
    }

    const token = parts[1];

    // 3. 토큰 검증
    const decoded = verifyToken(token);

    // 4. req.user에 사용자 정보 저장
    req.user = decoded;

    // 5. 다음 미들웨어로 진행
    next();
  } catch (error) {
    // verifyToken에서 발생한 에러 처리
    if (error.message === 'Token has expired' || error.message === 'Invalid token') {
      next(new UnauthorizedError(error.message));
    } else if (error instanceof UnauthorizedError) {
      next(error);
    } else {
      next(new UnauthorizedError('Authentication failed'));
    }
  }
}

/**
 * 권한(Role) 체크 미들웨어
 * 지정된 역할을 가진 사용자만 접근을 허용합니다.
 *
 * @param {...string} allowedRoles - 허용할 역할 목록 (예: 'buyer', 'seller', 'admin')
 * @returns {Function} Express 미들웨어 함수
 *
 * @example
 * // 판매자만 접근 가능
 * router.post('/products', authenticate, authorize('seller'), productController.create);
 *
 * // 판매자 또는 관리자 접근 가능
 * router.get('/dashboard', authenticate, authorize('seller', 'admin'), dashboardController.get);
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    // authenticate 미들웨어가 먼저 실행되어야 함
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required. Use authenticate middleware first.'));
    }

    // 사용자의 role이 허용된 역할 목록에 있는지 확인
    const userRole = req.user.role;
    if (!allowedRoles.includes(userRole)) {
      return next(new ForbiddenError(`Access denied. Required role: ${allowedRoles.join(' or ')}`));
    }

    // 권한 확인 통과
    next();
  };
}

module.exports = {
  authenticate,
  authorize
};
