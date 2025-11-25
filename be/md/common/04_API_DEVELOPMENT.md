# Fleecat 백엔드 - API 개발 가이드

> [← 목차로 돌아가기](./00_INDEX.md)

---

## 8. API 개발 표준

### 8.1 계층 구조

```
Client Request
     ↓
Route (라우팅)
     ↓
Middleware (검증, 인증)
     ↓
Controller (요청/응답 처리)
     ↓
Service (비즈니스 로직)
     ↓
Repository (데이터 접근)
     ↓
Database
```

각 계층의 역할:
- **Route**: URL과 HTTP 메서드를 컨트롤러 함수에 매핑
- **Middleware**: 인증, 검증, 로깅 등 전처리
- **Controller**: HTTP 요청/응답 처리, 데이터 변환
- **Service**: 비즈니스 로직, 트랜잭션 관리
- **Repository**: 데이터베이스 쿼리 실행

### 8.2 라우터 작성

```javascript
// routes/product.routes.js
const express = require('express');
const router = express.Router();
const ProductController = require('../controllers/product.controller');
const { authenticate } = require('../middlewares/auth');
const { validateProduct } = require('../middlewares/validation');

// 공개 API
router.get('/', ProductController.getProducts);
router.get('/:id', ProductController.getProductById);

// 인증 필요 API
router.post('/',
  authenticate,
  validateProduct,
  ProductController.createProduct
);

router.put('/:id',
  authenticate,
  validateProduct,
  ProductController.updateProduct
);

router.delete('/:id',
  authenticate,
  ProductController.deleteProduct
);

module.exports = router;
```

### 8.3 컨트롤러 작성

```javascript
// controllers/product.controller.js
const ProductService = require('../services/product.service');
const { successResponse, errorResponse } = require('../utils/response');

class ProductController {
  /**
   * 상품 목록 조회
   */
  async getProducts(req, res, next) {
    try {
      const { categoryId, minPrice, maxPrice, page, limit } = req.query;

      const result = await ProductService.getProducts({
        categoryId: categoryId ? parseInt(categoryId) : undefined,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined
      }, {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20
      });

      return successResponse(res, result, '상품 목록 조회 성공');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 상품 생성
   */
  async createProduct(req, res, next) {
    try {
      const userId = req.user.id; // 인증 미들웨어에서 설정
      const productData = req.body;

      const product = await ProductService.createProduct(userId, productData);

      return successResponse(res, product, '상품 등록 성공', 201);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProductController();
```

### 8.4 서비스 작성

```javascript
// services/product.service.js
const ProductRepository = require('../repositories/product.repository');
const { ValidationError, NotFoundError } = require('../utils/errors');

class ProductService {
  /**
   * 상품 목록 조회
   */
  async getProducts(filters, pagination) {
    const products = await ProductRepository.findMany(filters, pagination);
    const total = await ProductRepository.count(filters);

    return {
      products,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit)
      }
    };
  }

  /**
   * 상품 생성
   */
  async createProduct(userId, productData) {
    // 비즈니스 로직 검증
    if (productData.product_price <= 0) {
      throw new ValidationError('가격은 0보다 커야 합니다');
    }

    // 판매자 권한 확인
    const seller = await this._checkSellerPermission(userId);

    // 상품 생성
    const product = await ProductRepository.create({
      ...productData,
      tenant_member_id: seller.tenant_member_id
    });

    return product;
  }

  /**
   * 판매자 권한 확인 (private)
   */
  async _checkSellerPermission(userId) {
    // 구현...
  }
}

module.exports = new ProductService();
```

### 8.5 Repository 작성

```javascript
// repositories/product.repository.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class ProductRepository {
  /**
   * 상품 목록 조회
   */
  async findMany(filters = {}, pagination = {}) {
    const { categoryId, minPrice, maxPrice } = filters;
    const { page = 1, limit = 20 } = pagination;

    const where = {};

    if (categoryId) where.category_id = parseInt(categoryId);
    if (minPrice) where.product_price = { gte: parseFloat(minPrice) };
    if (maxPrice) {
      where.product_price = {
        ...where.product_price,
        lte: parseFloat(maxPrice)
      };
    }

    return await prisma.product.findMany({
      where,
      include: {
        tenant_member: {
          select: {
            tenant: {
              select: {
                tenant_name: true
              }
            }
          }
        },
        product_images: {
          where: { product_image_sequence: 0 },
          take: 1
        }
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { product_created_at: 'desc' }
    });
  }

  /**
   * 상품 생성
   */
  async create(data) {
    return await prisma.product.create({
      data,
      include: {
        tenant_member: true,
        category: true
      }
    });
  }

  /**
   * 상품 개수 조회
   */
  async count(filters = {}) {
    const { categoryId, minPrice, maxPrice } = filters;
    const where = {};

    if (categoryId) where.category_id = parseInt(categoryId);
    if (minPrice || maxPrice) {
      where.product_price = {};
      if (minPrice) where.product_price.gte = parseFloat(minPrice);
      if (maxPrice) where.product_price.lte = parseFloat(maxPrice);
    }

    return await prisma.product.count({ where });
  }
}

module.exports = new ProductRepository();
```

### 8.6 응답 포맷

```javascript
// utils/response.js

/**
 * 성공 응답
 */
function successResponse(res, data, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
}

/**
 * 에러 응답
 */
function errorResponse(res, message, statusCode = 500, errors = null) {
  const response = {
    success: false,
    message
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
}

module.exports = {
  successResponse,
  errorResponse
};
```

#### 응답 예시

**성공 응답**:
```json
{
  "success": true,
  "message": "상품 목록 조회 성공",
  "data": {
    "products": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

**에러 응답**:
```json
{
  "success": false,
  "message": "입력값이 올바르지 않습니다",
  "errors": [
    {
      "field": "product_name",
      "message": "상품명은 필수입니다"
    }
  ]
}
```

---

## 9. 인증 및 보안

### 9.1 JWT 인증

```javascript
// middlewares/auth.js
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/constants');
const { errorResponse } = require('../utils/response');

/**
 * JWT 토큰 생성
 */
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '7d'
  });
}

/**
 * JWT 인증 미들웨어
 */
function authenticate(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return errorResponse(res, '인증 토큰이 필요합니다', 401);
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return errorResponse(res, '유효하지 않은 토큰입니다', 401);
  }
}

/**
 * 권한 확인 미들웨어
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, '인증이 필요합니다', 401);
    }

    if (!roles.includes(req.user.role)) {
      return errorResponse(res, '권한이 없습니다', 403);
    }

    next();
  };
}

module.exports = {
  generateToken,
  authenticate,
  authorize
};
```

#### 사용 예시

```javascript
// 인증만 필요한 경우
router.post('/products', authenticate, ProductController.createProduct);

// 특정 권한 필요한 경우
router.delete('/products/:id',
  authenticate,
  authorize('admin', 'seller'),
  ProductController.deleteProduct
);
```

### 9.2 입력 검증

```javascript
// middlewares/validation.js
const { body, validationResult } = require('express-validator');
const { errorResponse } = require('../utils/response');

/**
 * 검증 결과 확인
 */
function validateResult(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(res, '입력값이 올바르지 않습니다', 400, errors.array());
  }
  next();
}

/**
 * 상품 검증
 */
const validateProduct = [
  body('product_name')
    .trim()
    .notEmpty().withMessage('상품명은 필수입니다')
    .isLength({ max: 100 }).withMessage('상품명은 100자 이하여야 합니다'),

  body('product_price')
    .isFloat({ min: 0 }).withMessage('가격은 0 이상이어야 합니다'),

  body('product_quantity')
    .isInt({ min: 0 }).withMessage('재고는 0 이상이어야 합니다'),

  body('category_id')
    .isInt().withMessage('카테고리 ID가 필요합니다'),

  validateResult
];

/**
 * 주문 검증
 */
const validateOrder = [
  body('order_recipient_name')
    .trim()
    .notEmpty().withMessage('수령인 이름은 필수입니다'),

  body('order_recipient_phone')
    .matches(/^010-\d{4}-\d{4}$/).withMessage('휴대폰 형식이 올바르지 않습니다'),

  body('order_recipient_address')
    .trim()
    .notEmpty().withMessage('배송지 주소는 필수입니다'),

  validateResult
];

module.exports = {
  validateProduct,
  validateOrder,
  validateResult
};
```

### 9.3 보안 미들웨어

```javascript
// app.js
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// 보안 헤더
app.use(helmet());

// CORS 설정
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // 최대 100 요청
  message: '너무 많은 요청을 보냈습니다. 잠시 후 다시 시도해주세요.'
});

app.use('/api', limiter);

// API 특정 엔드포인트에 대한 엄격한 제한
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 15분에 5번만 허용
  message: '로그인 시도 횟수를 초과했습니다.'
});

app.use('/api/v1/auth/login', authLimiter);
```

### 9.4 에러 처리 미들웨어

```javascript
// middlewares/errorHandler.js
const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  // 로그 기록
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  // 개발 환경에서는 스택 트레이스 포함
  const isDevelopment = process.env.NODE_ENV === 'development';

  // 커스텀 에러 처리
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: err.message,
      ...(isDevelopment && { stack: err.stack })
    });
  }

  if (err.name === 'NotFoundError') {
    return res.status(404).json({
      success: false,
      message: err.message
    });
  }

  // Prisma 에러 처리
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      message: '이미 존재하는 데이터입니다'
    });
  }

  // 기본 에러 응답
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || '서버 오류가 발생했습니다',
    ...(isDevelopment && { stack: err.stack })
  });
}

module.exports = errorHandler;
```

### 9.5 보안 체크리스트

#### ✅ 필수 보안 조치

- [ ] 환경변수로 민감 정보 관리 (.env 파일, 절대 커밋하지 않기)
- [ ] JWT Secret은 충분히 복잡하게 설정
- [ ] HTTPS 사용 (프로덕션)
- [ ] CORS 설정으로 허용된 도메인만 접근
- [ ] Rate Limiting으로 API 남용 방지
- [ ] Helmet으로 보안 헤더 설정
- [ ] SQL Injection 방지 (Prisma 사용으로 자동 방지)
- [ ] XSS 방지 (입력값 검증 및 이스케이프)
- [ ] 비밀번호는 반드시 암호화 (bcrypt)
- [ ] 에러 메시지에 민감 정보 노출 금지

#### 🔒 데이터 보호

```javascript
// 비밀번호 암호화
const bcrypt = require('bcrypt');

async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

async function comparePassword(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword);
}

// 민감 정보 제외
async function getUserProfile(userId) {
  const user = await prisma.member.findUnique({
    where: { member_id: userId },
    select: {
      member_id: true,
      member_email: true,
      member_name: true,
      // member_password: false (명시적으로 제외)
    }
  });
  return user;
}
```

---

## 다음 단계

- **테스트 작성**: [05. 테스트 & 배포](./05_TESTING_DEPLOYMENT.md)를 참고하세요
- **배포 준비**: [05. 테스트 & 배포](./05_TESTING_DEPLOYMENT.md#11-배포-및-운영)를 참고하세요

---

> [← 목차로 돌아가기](./00_INDEX.md)
