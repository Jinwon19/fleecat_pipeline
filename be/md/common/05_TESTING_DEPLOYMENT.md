# Fleecat 백엔드 - 테스트 & 배포

> [← 목차로 돌아가기](./00_INDEX.md)

---

## 10. 테스트 표준

### 10.1 테스트 구조

```
tests/
├── unit/                     # 단위 테스트
│   ├── services/
│   │   └── product.service.test.js
│   └── utils/
│       └── validator.test.js
├── integration/              # 통합 테스트
│   ├── product.test.js
│   └── order.test.js
└── e2e/                      # E2E 테스트
    └── checkout.test.js
```

### 10.2 단위 테스트 (Unit Test)

```javascript
// tests/unit/services/product.service.test.js
const ProductService = require('../../../src/services/product.service');
const ProductRepository = require('../../../src/repositories/product.repository');

// Mock 설정
jest.mock('../../../src/repositories/product.repository');

describe('ProductService', () => {
  describe('getProducts', () => {
    it('필터 없이 상품 목록을 조회할 수 있다', async () => {
      // Given
      const mockProducts = [
        { product_id: 1, product_name: '테스트 상품' }
      ];
      ProductRepository.findMany.mockResolvedValue(mockProducts);
      ProductRepository.count.mockResolvedValue(1);

      // When
      const result = await ProductService.getProducts({}, { page: 1, limit: 20 });

      // Then
      expect(result.products).toEqual(mockProducts);
      expect(result.pagination.total).toBe(1);
    });

    it('카테고리 필터로 상품을 조회할 수 있다', async () => {
      // Given
      const filters = { categoryId: 10 };
      ProductRepository.findMany.mockResolvedValue([]);

      // When
      await ProductService.getProducts(filters, {});

      // Then
      expect(ProductRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ categoryId: 10 }),
        expect.any(Object)
      );
    });
  });

  describe('createProduct', () => {
    it('유효한 데이터로 상품을 생성할 수 있다', async () => {
      // Given
      const userId = 1;
      const productData = {
        product_name: '새 상품',
        product_price: 10000
      };

      // When & Then
      // 테스트 구현...
    });

    it('가격이 0 이하이면 에러를 반환한다', async () => {
      // Given
      const productData = {
        product_name: '새 상품',
        product_price: -1000
      };

      // When & Then
      await expect(
        ProductService.createProduct(1, productData)
      ).rejects.toThrow('가격은 0보다 커야 합니다');
    });
  });
});
```

### 10.3 통합 테스트 (Integration Test)

```javascript
// tests/integration/product.test.js
const request = require('supertest');
const app = require('../../src/app');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

describe('Product API Integration Tests', () => {
  let authToken;

  beforeAll(async () => {
    // 테스트 데이터베이스 초기화
    await prisma.$executeRaw`TRUNCATE TABLE product CASCADE`;

    // 테스트 사용자 로그인
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });

    authToken = response.body.data.token;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /api/v1/products', () => {
    it('상품 목록을 조회할 수 있다', async () => {
      const response = await request(app)
        .get('/api/v1/products')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.products)).toBe(true);
    });
  });

  describe('POST /api/v1/products', () => {
    it('인증된 사용자는 상품을 생성할 수 있다', async () => {
      const productData = {
        product_name: '테스트 상품',
        product_price: 10000,
        category_id: 1
      };

      const response = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(productData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.product_name).toBe('테스트 상품');
    });

    it('인증 없이는 상품을 생성할 수 없다', async () => {
      await request(app)
        .post('/api/v1/products')
        .send({ product_name: '테스트' })
        .expect(401);
    });
  });
});
```

### 10.4 테스트 실행

```json
// package.json
{
  "scripts": {
    "test": "jest --coverage",
    "test:watch": "jest --watch",
    "test:unit": "jest tests/unit",
    "test:integration": "jest tests/integration",
    "test:e2e": "jest tests/e2e"
  }
}
```

```bash
# 모든 테스트 실행
npm test

# 특정 테스트만 실행
npm run test:unit

# Watch 모드로 실행
npm run test:watch

# 커버리지 리포트
npm test -- --coverage
```

---

## 11. 배포 및 운영

### 11.1 환경 구성

| 환경 | 용도 | URL | 데이터베이스 |
|------|------|-----|--------------|
| Development | 로컬 개발 | localhost:3000 | 로컬 Supabase |
| Staging | 통합 테스트 | staging.fleecat.com | Staging DB |
| Production | 실제 서비스 | api.fleecat.com | Production DB |

### 11.2 배포 체크리스트

#### 코드 품질
- [ ] ESLint 검사 통과
- [ ] 모든 테스트 통과
- [ ] 코드 리뷰 완료

#### 환경 설정
- [ ] 환경변수 설정 확인
- [ ] Prisma 마이그레이션 적용
- [ ] 데이터베이스 백업 완료

#### 보안
- [ ] API 키 및 시크릿 환경변수 확인
- [ ] CORS 설정 확인
- [ ] Rate Limiting 설정 확인

#### 성능
- [ ] 데이터베이스 인덱스 확인
- [ ] 쿼리 최적화 확인
- [ ] 로그 레벨 설정

#### 문서
- [ ] API 문서 업데이트
- [ ] CHANGELOG 작성
- [ ] README 업데이트

### 11.3 배포 스크립트

```bash
#!/bin/bash
# scripts/deploy.sh

echo "🚀 Fleecat 배포 시작..."

# 1. 환경 확인
if [ -z "$NODE_ENV" ]; then
  echo "❌ NODE_ENV가 설정되지 않았습니다"
  exit 1
fi

echo "📦 환경: $NODE_ENV"

# 2. 의존성 설치
echo "📥 패키지 설치 중..."
npm ci

# 3. Prisma 마이그레이션
echo "🗄 데이터베이스 마이그레이션..."
npx prisma migrate deploy

# 4. Prisma Client 생성
echo "⚙ Prisma Client 생성..."
npx prisma generate

# 5. 테스트 실행
echo "🧪 테스트 실행..."
npm test

# 6. 빌드 (필요시)
# npm run build

# 7. 서버 재시작
echo "🔄 서버 재시작..."
pm2 restart fleecat-api

echo "✅ 배포 완료!"
```

### 11.4 로깅 전략

```javascript
// utils/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // 에러 로그 파일
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),
    // 전체 로그 파일
    new winston.transports.File({
      filename: 'logs/combined.log'
    })
  ]
});

// 개발 환경에서는 콘솔 출력
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

module.exports = logger;
```

#### 로깅 사용 예시

```javascript
const logger = require('../utils/logger');

// 정보 로그
logger.info('사용자 로그인', { userId: 123 });

// 경고 로그
logger.warn('재고 부족', { productId: 456, stock: 5 });

// 에러 로그
logger.error('결제 실패', {
  orderId: 789,
  error: error.message,
  stack: error.stack
});
```

### 11.5 모니터링

#### 주요 모니터링 지표

**1. API 성능**
- 응답 시간
- 에러율
- 요청 처리량 (RPS)

**2. 데이터베이스**
- 쿼리 실행 시간
- 커넥션 풀 사용률
- 슬로우 쿼리

**3. 시스템**
- CPU 사용률
- 메모리 사용률
- 디스크 사용률

**4. 비즈니스 지표**
- 주문 생성 수
- 결제 성공률
- 사용자 활동

---

## 부록 B. 환경변수 예시

```bash
# .env.example

# Server
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/fleecat

# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_KEY=xxxxx

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# File Upload
MAX_FILE_SIZE=5242880

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

---

## 부록 C. 유용한 NPM 스크립트

```json
{
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js",
    "test": "jest --coverage",
    "test:watch": "jest --watch",
    "lint": "eslint src/**/*.js",
    "lint:fix": "eslint src/**/*.js --fix",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio",
    "prisma:seed": "node prisma/seed.js"
  }
}
```

### 스크립트 설명

| 스크립트 | 설명 |
|----------|------|
| `npm run dev` | 개발 서버 실행 (nodemon으로 자동 재시작) |
| `npm start` | 프로덕션 서버 실행 |
| `npm test` | 모든 테스트 실행 및 커버리지 확인 |
| `npm run test:watch` | Watch 모드로 테스트 실행 |
| `npm run lint` | ESLint로 코드 검사 |
| `npm run lint:fix` | ESLint로 자동 수정 |
| `npm run prisma:generate` | Prisma Client 생성 |
| `npm run prisma:migrate` | 마이그레이션 생성 및 적용 |
| `npm run prisma:studio` | Prisma Studio 실행 (DB GUI) |
| `npm run prisma:seed` | 초기 데이터 생성 |

---

## 다음 단계

- **협업 규칙**: [06. 협업 가이드](./06_COLLABORATION.md)를 참고하세요
- **Git 워크플로우**: [06. 협업 가이드](./06_COLLABORATION.md#12-git-브랜치-전략)를 참고하세요

---

> [← 목차로 돌아가기](./00_INDEX.md)
