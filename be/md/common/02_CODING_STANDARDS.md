# Fleecat 백엔드 - 코딩 표준

> [← 목차로 돌아가기](./00_INDEX.md)

---

## 5. 명명 규칙

### 5.1 파일명 규칙

| 유형 | 규칙 | 예시 |
|------|------|------|
| 라우터 | [도메인].routes.js | product.routes.js |
| 컨트롤러 | [도메인].controller.js | product.controller.js |
| 서비스 | [도메인].service.js | product.service.js |
| 미들웨어 | [기능].js | auth.js, validation.js |
| 유틸리티 | [기능].js | logger.js, helpers.js |
| 테스트 | [대상].test.js | product.service.test.js |

### 5.2 변수명 규칙

```javascript
// 상수: UPPER_SNAKE_CASE
const MAX_LOGIN_ATTEMPTS = 5;
const JWT_SECRET = process.env.JWT_SECRET;

// 변수/함수: camelCase
const userId = 123;
const productList = [];
function getUserById(id) { }

// 클래스: PascalCase
class ProductService { }
class OrderController { }

// Private 변수: _camelCase
class UserService {
  _connection = null;
  _cache = {};
}

// 데이터베이스 관련
const prisma = new PrismaClient();
const supabase = createClient(url, key);
```

### 5.3 함수명 규칙

| 유형 | 규칙 | 예시 |
|------|------|------|
| 조회 | get, find, fetch | getUserById, findProducts |
| 생성 | create, add | createOrder, addToCart |
| 수정 | update, modify | updateProduct, modifyStatus |
| 삭제 | delete, remove | deleteProduct, removeFromCart |
| 검증 | validate, check | validateEmail, checkStock |
| 처리 | process, handle | processPayment, handleOrder |

### 5.4 API 엔드포인트 규칙

**기본 형식**: `/api/v1/[리소스]/[하위리소스]`

```bash
# 기본 CRUD
GET     /api/v1/products              # 상품 목록 조회
GET     /api/v1/products/:id          # 상품 상세 조회
POST    /api/v1/products              # 상품 생성
PUT     /api/v1/products/:id          # 상품 수정
DELETE  /api/v1/products/:id          # 상품 삭제

# 하위 리소스
GET     /api/v1/products/:id/images   # 상품 이미지 목록
POST    /api/v1/products/:id/images   # 상품 이미지 추가

# 특수 액션
POST    /api/v1/orders/:id/cancel     # 주문 취소
POST    /api/v1/orders/:id/confirm    # 주문 확정
```

---

## 6. 코딩 표준

### 6.1 JavaScript 코딩 표준

#### Import 순서

```javascript
// 1. Node.js 내장 모듈
const fs = require('fs');
const path = require('path');

// 2. 외부 라이브러리
const express = require('express');
const { PrismaClient } = require('@prisma/client');

// 3. 내부 모듈
const { authenticate } = require('../middlewares/auth');
const ProductService = require('../services/product.service');
```

#### 함수 작성 규칙

```javascript
/**
 * 상품 목록 조회
 * @param {Object} filters - 필터 조건
 * @param {number} filters.categoryId - 카테고리 ID
 * @param {number} filters.minPrice - 최소 가격
 * @param {number} filters.maxPrice - 최대 가격
 * @param {Object} pagination - 페이지네이션
 * @param {number} pagination.page - 페이지 번호
 * @param {number} pagination.limit - 페이지당 개수
 * @returns {Promise<Object>} 상품 목록과 총 개수
 */
async function getProducts(filters = {}, pagination = {}) {
  const { categoryId, minPrice, maxPrice } = filters;
  const { page = 1, limit = 20 } = pagination;

  // 구현...
}
```

#### 에러 처리

```javascript
// 커스텀 에러 클래스
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
  }
}

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

// 사용 예시
if (!product) {
  throw new NotFoundError('상품을 찾을 수 없습니다');
}
```

### 6.2 비동기 처리

```javascript
// ✅ 권장: async/await 사용
async function createOrder(orderData) {
  try {
    const order = await prisma.order.create({
      data: orderData
    });
    return order;
  } catch (error) {
    throw new Error(`주문 생성 실패: ${error.message}`);
  }
}

// ❌ 비권장: 콜백 사용
function createOrder(orderData, callback) {
  // 콜백 헬 발생 가능
}
```

### 6.3 환경변수 관리

```javascript
// config/constants.js
require('dotenv').config();

module.exports = {
  // 서버 설정
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // 데이터베이스
  DATABASE_URL: process.env.DATABASE_URL,

  // Supabase
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_KEY,

  // JWT
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // 기타
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS?.split(',') || []
};
```

### 6.4 조건문 작성

```javascript
// ✅ 권장: Early return
function validateUser(user) {
  if (!user) {
    throw new ValidationError('사용자 정보가 없습니다');
  }

  if (!user.email) {
    throw new ValidationError('이메일이 필요합니다');
  }

  if (!user.password) {
    throw new ValidationError('비밀번호가 필요합니다');
  }

  // 정상 로직
  return true;
}

// ❌ 비권장: 중첩된 if문
function validateUser(user) {
  if (user) {
    if (user.email) {
      if (user.password) {
        return true;
      } else {
        throw new Error('비밀번호가 필요합니다');
      }
    } else {
      throw new Error('이메일이 필요합니다');
    }
  } else {
    throw new Error('사용자 정보가 없습니다');
  }
}
```

### 6.5 객체 및 배열 처리

```javascript
// ✅ 권장: 구조 분해 할당
const { productId, productName, productPrice } = product;
const [first, second, ...rest] = array;

// ✅ 권장: Spread 연산자
const newProduct = { ...product, status: 'active' };
const newArray = [...oldArray, newItem];

// ✅ 권장: Optional chaining
const tenantName = product?.tenant_member?.tenant?.tenant_name;

// ✅ 권장: Nullish coalescing
const price = product.price ?? 0;
```

### 6.6 배열 메서드 활용

```javascript
// ✅ 권장: 함수형 프로그래밍 스타일
const activeProducts = products.filter(p => p.status === 'active');
const productNames = products.map(p => p.name);
const totalPrice = products.reduce((sum, p) => sum + p.price, 0);

// 체이닝
const result = products
  .filter(p => p.status === 'active')
  .map(p => ({ id: p.id, name: p.name }))
  .slice(0, 10);

// ❌ 비권장: for 루프 (단순 변환 시)
const activeProducts = [];
for (let i = 0; i < products.length; i++) {
  if (products[i].status === 'active') {
    activeProducts.push(products[i]);
  }
}
```

### 6.7 문자열 처리

```javascript
// ✅ 권장: Template literal
const message = `${user.name}님, 환영합니다!`;
const query = `
  SELECT * FROM products
  WHERE category_id = ${categoryId}
  AND status = 'active'
`;

// ❌ 비권장: 문자열 연결
const message = user.name + '님, 환영합니다!';
```

### 6.8 주석 작성 규칙

```javascript
/**
 * JSDoc 형식으로 함수 문서화
 * 함수의 목적, 파라미터, 반환값을 명확히 기술
 */

// 단일 라인 주석: 코드 의도 설명
// TODO: 추후 구현 필요한 기능
// FIXME: 수정이 필요한 코드
// HACK: 임시 해결 방법

/*
 * 여러 줄 주석:
 * 복잡한 로직 설명
 */
```

### 6.9 코드 포맷팅

```javascript
// ESLint + Prettier 사용 권장

// .eslintrc.js
module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 12
  },
  rules: {
    'no-console': 'warn',
    'no-unused-vars': 'warn',
    'prefer-const': 'error'
  }
};

// .prettierrc
{
  "semi": true,
  "trailingComma": "none",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

---

## 모범 사례

### ✅ DO (권장)

- 명확하고 의미 있는 변수명 사용
- 함수는 하나의 책임만 가지도록 작성 (단일 책임 원칙)
- async/await으로 비동기 코드 작성
- Early return으로 중첩 최소화
- JSDoc으로 함수 문서화
- 에러는 명확한 메시지와 함께 throw

### ❌ DON'T (비권장)

- 의미 없는 변수명 (a, b, temp, data 등)
- 100줄 이상의 긴 함수
- 콜백 헬
- 깊은 중첩 (3단계 이상)
- 주석 없는 복잡한 로직
- 에러 무시 (빈 catch 블록)

---

## 다음 단계

- **데이터베이스 작업 시**: [03. 데이터베이스 가이드](./03_DATABASE_GUIDE.md)를 참고하세요
- **API 개발 시**: [04. API 개발 가이드](./04_API_DEVELOPMENT.md)를 참고하세요

---

> [← 목차로 돌아가기](./00_INDEX.md)
