# Step 1-2: 인증 미들웨어 생성

> **Phase 1: 기초 인프라 구축**
> **작성일**: 2025년 10월 1일
> **상태**: ✅ 완료

---

## 📋 작업 개요

### 목적
JWT 토큰 기반 인증 및 권한 체크 미들웨어를 구현하여 API 보안을 강화합니다.

### 작업 내용
- `src/middlewares/auth.js` 파일 생성
- `authenticate()` 함수 구현 - JWT 토큰 검증 및 사용자 식별
- `authorize(...roles)` 함수 구현 - 역할 기반 접근 제어

---

## 🎯 인증 미들웨어를 사용하는 이유

### 1. 보안 계층 추가
- 로그인하지 않은 사용자의 접근 차단
- 토큰 위조/만료 자동 감지
- 각 요청마다 사용자 신원 확인

### 2. 코드 재사용성
- 토큰 검증 로직을 한 곳에서 관리
- 모든 보호된 API에 간단히 적용
- 컨트롤러는 비즈니스 로직에만 집중

### 3. 역할 기반 접근 제어 (RBAC)
- buyer/seller/admin 역할 구분
- 판매자만 상품 등록, 관리자만 전체 회원 조회 등
- 멀티테넌트 환경에서 데이터 격리

---

## 📁 파일 위치

```
src/
└── middlewares/
    ├── auth.js           ← 생성한 파일
    └── errorHandler.js   (기존)
```

---

## 💻 구현 코드

### 전체 코드

```javascript
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
```

---

## 🔧 함수 설명

### 1. `authenticate(req, res, next)`

**역할**: JWT 토큰을 검증하여 사용자 신원 확인

**처리 과정**:
```
1. Authorization 헤더 확인
   → 없으면: "Authorization header is missing" (401)

2. Bearer 토큰 형식 검증
   → 형식 오류: "Invalid authorization header format" (401)

3. verifyToken() 호출 (Step 1-1에서 구현)
   → 만료: "Token has expired" (401)
   → 위조: "Invalid token" (401)

4. req.user에 사용자 정보 저장
   {
     member_id: 123,
     email: 'user@example.com',
     role: 'buyer',
     iat: 1696147200,
     exp: 1696752000
   }

5. next() 호출 → 다음 미들웨어/컨트롤러로 진행
```

**사용 예시**:
```javascript
// 라우터에서
const { authenticate } = require('../middlewares/auth');

// 로그인한 사용자만 접근 가능
router.get('/members/me', authenticate, memberController.getMe);
router.get('/orders', authenticate, orderController.getMyOrders);
router.put('/members/me', authenticate, memberController.updateMe);
```

**클라이언트 요청 예시**:
```http
GET /api/v1/members/me HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**컨트롤러에서 사용**:
```javascript
// memberController.js
async function getMe(req, res) {
  // req.user는 이미 authenticate에서 설정됨
  const memberId = req.user.member_id;
  const member = await memberService.findById(memberId);

  return successResponse(res, member, 'Member retrieved successfully');
}
```

---

### 2. `authorize(...allowedRoles)`

**역할**: 특정 역할(role)을 가진 사용자만 접근 허용

**파라미터**:
- `allowedRoles` - 허용할 역할 배열 (예: `'buyer'`, `'seller'`, `'admin'`)

**처리 과정**:
```
1. req.user 존재 확인
   → 없으면: authenticate 미들웨어 먼저 실행 필요 (401)

2. req.user.role이 allowedRoles에 포함되는지 확인
   → 포함 안 됨: "Access denied. Required role: seller" (403)

3. 권한 확인 통과 → next() 호출
```

**사용 예시**:

```javascript
const { authenticate, authorize } = require('../middlewares/auth');

// 판매자만 상품 등록 가능
router.post('/products',
  authenticate,
  authorize('seller'),
  productController.create
);

// 관리자만 전체 회원 조회 가능
router.get('/admin/members',
  authenticate,
  authorize('admin'),
  adminController.getMembers
);

// 판매자 또는 관리자 접근 가능
router.get('/dashboard',
  authenticate,
  authorize('seller', 'admin'),
  dashboardController.getDashboard
);

// 모든 역할 접근 가능 (authenticate만 사용)
router.get('/products',
  authenticate,
  productController.getAll
);

// 인증 없이 접근 가능 (미들웨어 없음)
router.get('/public/categories',
  categoryController.getAll
);
```

**에러 응답 예시**:

```json
// 구매자가 상품 등록 시도 시
{
  "success": false,
  "message": "Access denied. Required role: seller"
}
```

---

## 🔄 전체 요청 흐름

### 성공 케이스

```
📱 클라이언트 요청
   POST /api/v1/products
   Authorization: Bearer {seller의 토큰}
   Body: { product_name: "도자기 화병", ... }
       ↓
🛡️  authenticate 미들웨어
   1. 헤더에서 토큰 추출: Bearer {token}
   2. verifyToken() 호출
   3. req.user = { member_id: 456, role: 'seller', tenant_id: 10, ... }
   4. next() 호출
       ↓
🔐 authorize('seller') 미들웨어
   1. req.user.role 확인: 'seller'
   2. allowedRoles에 'seller' 포함됨
   3. next() 호출
       ↓
🎯 productController.create
   1. req.user.member_id로 판매자 확인
   2. req.user.tenant_id로 어느 공방의 상품인지 확인
   3. 상품 생성 로직 수행
       ↓
✅ 클라이언트 응답
   { success: true, data: { product_id: 789, ... } }
```

### 실패 케이스 1: 토큰 없음

```
📱 클라이언트 요청
   GET /api/v1/members/me
   (Authorization 헤더 없음)
       ↓
🛡️  authenticate 미들웨어
   1. authHeader = undefined
   2. UnauthorizedError 발생
       ↓
❌ errorHandler 미들웨어
   → 401 Unauthorized
   { success: false, message: "Authorization header is missing" }
```

### 실패 케이스 2: 권한 없음

```
📱 클라이언트 요청
   POST /api/v1/products
   Authorization: Bearer {buyer의 토큰}
       ↓
🛡️  authenticate 미들웨어
   - req.user = { member_id: 123, role: 'buyer' }
   - next() 호출
       ↓
🔐 authorize('seller') 미들웨어
   1. req.user.role = 'buyer'
   2. 'buyer'는 allowedRoles에 없음
   3. ForbiddenError 발생
       ↓
❌ errorHandler 미들웨어
   → 403 Forbidden
   { success: false, message: "Access denied. Required role: seller" }
```

---

## 🔐 역할(Role) 종류

Fleecat 플랫폼의 역할 정의:

### 1. `buyer` (구매자)
**권한**:
- 상품 조회
- 장바구니 추가/수정/삭제
- 주문 생성
- 본인 주문 내역 조회
- 본인 정보 조회/수정

**제한**:
- 상품 등록/수정/삭제 불가
- 다른 사용자 정보 조회 불가
- 관리자 기능 접근 불가

### 2. `seller` (판매자)
**권한**:
- buyer의 모든 권한
- 본인 공방의 상품 등록/수정/삭제
- 본인 공방의 주문 관리
- 본인 공방의 쿠폰 생성

**제한**:
- 다른 공방의 상품 수정 불가
- 다른 공방의 주문 조회 불가
- 관리자 기능 접근 불가

### 3. `admin` (관리자)
**권한**:
- 모든 회원 조회/관리
- 모든 공방 관리
- 모든 상품 관리
- 플랫폼 통계 조회
- 시스템 설정

---

## 🧪 테스트 방법

### 방법 1: Node.js REPL로 테스트

```bash
node
```

```javascript
require('dotenv').config();
const { generateToken } = require('./src/utils/jwt');

// 구매자 토큰 생성
const buyerToken = generateToken({
  member_id: 1,
  email: 'buyer@example.com',
  role: 'buyer'
});
console.log('Buyer Token:', buyerToken);

// 판매자 토큰 생성
const sellerToken = generateToken({
  member_id: 2,
  email: 'seller@example.com',
  role: 'seller',
  tenant_id: 10,
  tenant_member_id: 20
});
console.log('Seller Token:', sellerToken);
```

### 방법 2: 간단한 테스트 라우트 추가

`src/routes/test.routes.js` 생성:
```javascript
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth');

// 인증만 필요
router.get('/auth-test', authenticate, (req, res) => {
  res.json({
    success: true,
    message: 'Authentication successful',
    user: req.user
  });
});

// 판매자만 접근 가능
router.get('/seller-only', authenticate, authorize('seller'), (req, res) => {
  res.json({
    success: true,
    message: 'Seller access granted',
    user: req.user
  });
});

// 관리자만 접근 가능
router.get('/admin-only', authenticate, authorize('admin'), (req, res) => {
  res.json({
    success: true,
    message: 'Admin access granted',
    user: req.user
  });
});

module.exports = router;
```

`app.js` 또는 `server.js`에 추가:
```javascript
const testRoutes = require('./routes/test.routes');
app.use('/api/v1/test', testRoutes);
```

### 방법 3: curl 명령어로 테스트

```bash
# 1. 토큰 없이 요청 (401 에러 예상)
curl -X GET http://localhost:3000/api/v1/test/auth-test

# 2. 토큰과 함께 요청 (성공 예상)
curl -X GET http://localhost:3000/api/v1/test/auth-test \
  -H "Authorization: Bearer {위에서 생성한 토큰}"

# 3. 구매자 토큰으로 판매자 전용 API 접근 (403 에러 예상)
curl -X GET http://localhost:3000/api/v1/test/seller-only \
  -H "Authorization: Bearer {구매자 토큰}"

# 4. 판매자 토큰으로 판매자 전용 API 접근 (성공 예상)
curl -X GET http://localhost:3000/api/v1/test/seller-only \
  -H "Authorization: Bearer {판매자 토큰}"
```

---

## ⚠️ 주의사항

### 1. 미들웨어 순서
```javascript
// ✅ 올바른 순서
router.post('/products', authenticate, authorize('seller'), productController.create);

// ❌ 잘못된 순서 (authorize가 먼저 실행되면 req.user가 없음)
router.post('/products', authorize('seller'), authenticate, productController.create);
```

### 2. authorize는 항상 authenticate 다음에
`authorize`는 `req.user`가 있어야 작동하므로, 반드시 `authenticate` 뒤에 배치해야 합니다.

### 3. 토큰 형식
```javascript
// ✅ 올바른 형식
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// ❌ 잘못된 형식
Authorization: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Authorization: Token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. 멀티테넌트 데이터 접근
판매자가 상품을 등록/수정할 때는 반드시 `req.user.tenant_id`를 확인하여 본인 공방의 데이터만 접근하도록 해야 합니다:

```javascript
// productService.js
async function createProduct(productData, userId, tenantId) {
  // 판매자가 속한 tenant_member 확인
  const tenantMember = await prisma.tenantMember.findFirst({
    where: {
      member_id: userId,
      tenant_id: tenantId,
      tenant_member_status: 'active'
    }
  });

  if (!tenantMember) {
    throw new ForbiddenError('You are not a member of this tenant');
  }

  // 상품 생성
  return await prisma.product.create({
    data: {
      ...productData,
      tenant_member_id: tenantMember.tenant_member_id
    }
  });
}
```

---

## 📊 Step 1-1과의 연계

### Step 1-1: JWT 유틸리티
```javascript
// src/utils/jwt.js
generateToken(payload)  // 토큰 생성 (로그인 시 사용)
verifyToken(token)      // 토큰 검증 (미들웨어에서 사용)
```

### Step 1-2: 인증 미들웨어 (현재 단계)
```javascript
// src/middlewares/auth.js
authenticate            // verifyToken()을 사용하여 인증
authorize(...roles)     // 권한 체크
```

### 관계
- `authenticate`는 내부적으로 `verifyToken()`을 호출
- Step 1-1 없이는 Step 1-2를 구현할 수 없음
- Step 1-2는 Step 1-1의 실제 활용 사례

---

## 🔄 다음 단계

### Step 1-3: 입력 검증 미들웨어
다음 단계에서는 회원가입/로그인 시 입력 데이터를 검증하는 미들웨어를 만들 예정입니다:

- `src/middlewares/validation.js`
- 이메일 형식 검증
- 비밀번호 강도 검증
- 필수 필드 확인

---

## 📚 참고 자료

### 관련 코딩 표준
- [02. 코딩 표준](../02_CODING_STANDARDS.md)
- [04. API 개발 가이드](../04_API_DEVELOPMENT.md)

### 이전 단계
- [Step 1-1: JWT 유틸리티](./1-1_jwt_util.md)

### Express 미들웨어 공식 문서
- [Express Middleware Guide](https://expressjs.com/en/guide/using-middleware.html)
- [Express Error Handling](https://expressjs.com/en/guide/error-handling.html)

---

**작성일**: 2025년 10월 1일
**작성자**: Backend Team
**상태**: ✅ 완료
