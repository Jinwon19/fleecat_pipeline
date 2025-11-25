# Step 2-18: Product Routes 구현

## 1. 개요

**Product Routes**는 상품 및 상품 이미지 관련 API 엔드포인트를 정의하는 라우팅 레이어입니다.

### 주요 역할

- Public API: 상품 조회 (목록, 상세, 카테고리별, 통계)
- Private API: 상품 등록, 수정, 삭제, 상태 변경
- Private API: 상품 이미지 업로드, 삭제, 순서 재배치

### 파일 위치

```
src/routes/product.routes.js
```

### 의존성

```javascript
const express = require('express');
const productController = require('../controllers/product.controller');
const { authenticate } = require('../middlewares/auth');
```

---

## 2. 개념

### Public API vs Private API

Product Routes는 **Public API**와 **Private API**로 명확히 구분됩니다.

#### Public API (인증 불필요)
- 전체 상품 목록 조회 (필터링/정렬/페이징)
- 상품 상세 조회 (조회수 자동 증가)
- 카테고리별 상품 목록 조회
- 상품 통계 조회

#### Private API (인증 필요)
- 내 상품 목록 조회 (판매자용)
- 상품 등록 (승인된 TenantMember만)
- 상품 수정 (본인만)
- 상품 삭제 (본인만)
- 상품 상태 변경 (본인만)
- 상품 이미지 업로드/삭제/순서 변경 (본인만)

### 이미지 관리 특징

- 상품당 최대 **10개**의 이미지 등록 가능
- 이미지 순서 (product_img_sequence) 관리
- 첫 번째 이미지 (sequence: 1)가 대표 이미지

---

## 3. API 엔드포인트

### 3.1 내 상품 목록 조회 (판매자용)

```javascript
GET /api/v1/products/me/:tenantMemberId
```

#### 권한
- **Private**
- 미들웨어: `authenticate`

#### Controller
`productController.getMyProducts`

#### URL Parameters
- `tenantMemberId` (number): 판매사 구성원 ID

#### Query Parameters
- `page` (number, default: 1): 페이지 번호
- `limit` (number, default: 10): 페이지당 항목 수
- `status` (string, optional): 상태 필터 (`active`, `sold_out`, `inactive`)

#### 사용 예시
```bash
# 내가 판매하는 상품 목록
GET /api/v1/products/me/10?status=active&page=1&limit=20
Authorization: Bearer <JWT_TOKEN>
```

#### 응답 형식
```json
{
  "success": true,
  "message": "My products retrieved successfully",
  "data": {
    "products": [
      {
        "product_id": 1,
        "product_name": "청자 찻잔",
        "product_price": 45000,
        "product_stock": 15,
        "product_status": "active",
        "product_view_count": 234
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalItems": 28,
      "itemsPerPage": 10
    }
  }
}
```

---

### 3.2 카테고리별 상품 목록 조회

```javascript
GET /api/v1/products/category/:categoryId
```

#### 권한
- **Public**
- 미들웨어: 없음

#### Controller
`productController.getProductsByCategory`

#### URL Parameters
- `categoryId` (number): 카테고리 ID

#### Query Parameters
- `page` (number, default: 1): 페이지 번호
- `limit` (number, default: 10): 페이지당 항목 수

#### 사용 예시
```bash
# "도자기" 카테고리의 상품 목록
GET /api/v1/products/category/1?page=1&limit=20
```

#### 응답 형식
```json
{
  "success": true,
  "message": "Products retrieved successfully",
  "data": {
    "category": {
      "category_id": 1,
      "category_name": "도자기"
    },
    "products": [
      {
        "product_id": 1,
        "product_name": "청자 찻잔",
        "product_price": 45000,
        "product_thumbnail": "https://...",
        "tenant_member": {
          "tenant": {
            "tenant_name": "홍길동 공방"
          }
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 47
    }
  }
}
```

---

### 3.3 상품 이미지 삭제

```javascript
DELETE /api/v1/products/images/:productImgId
```

#### 권한
- **Private** (본인만)
- 미들웨어: `authenticate`

#### Controller
`productController.deleteProductImage`

#### URL Parameters
- `productImgId` (number): 상품 이미지 ID

#### 사용 예시
```bash
DELETE /api/v1/products/images/52
Authorization: Bearer <JWT_TOKEN>
```

#### 응답 형식
```json
{
  "success": true,
  "message": "Product image deleted successfully",
  "data": {
    "deleted_image": {
      "product_img_id": 52,
      "product_img_url": "https://..."
    }
  }
}
```

---

### 3.4 상품 통계 조회

```javascript
GET /api/v1/products/:productId/stats
```

#### 권한
- **Public**
- 미들웨어: 없음

#### Controller
`productController.getProductStats`

#### URL Parameters
- `productId` (number): 상품 ID

#### 사용 예시
```bash
GET /api/v1/products/1/stats
```

#### 응답 형식
```json
{
  "success": true,
  "message": "Product stats retrieved successfully",
  "data": {
    "product_id": 1,
    "product_name": "청자 찻잔",
    "product_view_count": 1247,
    "product_stock": 15,
    "product_status": "active",
    "total_sales": 87,
    "total_revenue": 3915000
  }
}
```

---

### 3.5 상품 이미지 업로드

```javascript
POST /api/v1/products/:productId/images
```

#### 권한
- **Private** (본인만, 최대 10개)
- 미들웨어: `authenticate`

#### Controller
`productController.uploadProductImages`

#### URL Parameters
- `productId` (number): 상품 ID

#### Request Body
```json
{
  "images": [
    {
      "product_img_url": "https://...",
      "product_img_sequence": 1
    },
    {
      "product_img_url": "https://...",
      "product_img_sequence": 2
    }
  ]
}
```

#### 제약 조건
- 상품당 최대 10개의 이미지
- sequence는 1부터 시작 (1이 대표 이미지)

#### 사용 예시
```bash
POST /api/v1/products/1/images
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "images": [
    {
      "product_img_url": "https://storage.example.com/product1-1.jpg",
      "product_img_sequence": 1
    }
  ]
}
```

#### 응답 형식
```json
{
  "success": true,
  "message": "Product images uploaded successfully",
  "data": {
    "uploaded_images": [
      {
        "product_img_id": 101,
        "product_img_url": "https://...",
        "product_img_sequence": 1
      }
    ]
  }
}
```

---

### 3.6 상품 이미지 순서 재배치

```javascript
PUT /api/v1/products/:productId/images/reorder
```

#### 권한
- **Private** (본인만)
- 미들웨어: `authenticate`

#### Controller
`productController.reorderProductImages`

#### URL Parameters
- `productId` (number): 상품 ID

#### Request Body
```json
{
  "image_orders": [
    { "product_img_id": 101, "product_img_sequence": 2 },
    { "product_img_id": 102, "product_img_sequence": 1 },
    { "product_img_id": 103, "product_img_sequence": 3 }
  ]
}
```

#### 사용 예시
```bash
PUT /api/v1/products/1/images/reorder
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "image_orders": [
    { "product_img_id": 102, "product_img_sequence": 1 },
    { "product_img_id": 101, "product_img_sequence": 2 }
  ]
}
```

#### 응답 형식
```json
{
  "success": true,
  "message": "Product images reordered successfully",
  "data": {
    "updated_count": 2
  }
}
```

---

### 3.7 상품 상태 변경

```javascript
PATCH /api/v1/products/:productId/status
```

#### 권한
- **Private** (본인만)
- 미들웨어: `authenticate`

#### Controller
`productController.updateProductStatus`

#### URL Parameters
- `productId` (number): 상품 ID

#### Request Body
```json
{
  "product_status": "sold_out"
}
```

#### 가능한 상태 값
- `active`: 판매 중
- `sold_out`: 품절
- `inactive`: 판매 중지

#### 사용 예시
```bash
PATCH /api/v1/products/1/status
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "product_status": "sold_out"
}
```

#### 응답 형식
```json
{
  "success": true,
  "message": "Product status updated successfully",
  "data": {
    "product_id": 1,
    "product_status": "sold_out",
    "product_updated_at": "2025-10-13T12:00:00.000Z"
  }
}
```

---

### 3.8 상품 상세 조회

```javascript
GET /api/v1/products/:productId
```

#### 권한
- **Public**
- 미들웨어: 없음

#### Controller
`productController.getProductById`

#### URL Parameters
- `productId` (number): 상품 ID

#### 특징
- 조회수 (`product_view_count`) 자동 증가

#### 사용 예시
```bash
GET /api/v1/products/1
```

#### 응답 형식
```json
{
  "success": true,
  "message": "Product retrieved successfully",
  "data": {
    "product_id": 1,
    "product_name": "청자 찻잔",
    "product_description": "전통 방식으로 제작한 청자 찻잔입니다",
    "product_price": 45000,
    "product_stock": 15,
    "product_status": "active",
    "product_view_count": 235,
    "category": {
      "category_id": 2,
      "category_name": "찻잔"
    },
    "tenant_member": {
      "tenant_member_id": 10,
      "member": {
        "member_name": "홍길동"
      },
      "tenant": {
        "tenant_name": "홍길동 공방"
      }
    },
    "product_images": [
      {
        "product_img_id": 101,
        "product_img_url": "https://...",
        "product_img_sequence": 1
      }
    ]
  }
}
```

---

### 3.9 상품 수정

```javascript
PATCH /api/v1/products/:productId
```

#### 권한
- **Private** (본인만)
- 미들웨어: `authenticate`

#### Controller
`productController.updateProduct`

#### URL Parameters
- `productId` (number): 상품 ID

#### Request Body
```json
{
  "product_name": "청자 찻잔 (대형)",
  "product_price": 55000,
  "product_stock": 10,
  "product_description": "업데이트된 설명"
}
```

#### 수정 가능한 필드
- `product_name`
- `product_description`
- `product_price`
- `product_stock`
- `category_id`

#### 수정 불가능한 필드
- `tenant_member_id` (판매자 변경 불가)
- `product_status` (별도 엔드포인트 사용)
- `product_view_count` (자동 계산)

#### 사용 예시
```bash
PATCH /api/v1/products/1
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "product_price": 55000,
  "product_stock": 10
}
```

---

### 3.10 상품 삭제

```javascript
DELETE /api/v1/products/:productId
```

#### 권한
- **Private** (본인만)
- 미들웨어: `authenticate`

#### Controller
`productController.deleteProduct`

#### URL Parameters
- `productId` (number): 상품 ID

#### 삭제 정책
- **Soft Delete** 방식 사용
- `product_status`를 `inactive`로 변경
- 실제 데이터는 삭제하지 않음

#### 사용 예시
```bash
DELETE /api/v1/products/1
Authorization: Bearer <JWT_TOKEN>
```

#### 응답 형식
```json
{
  "success": true,
  "message": "Product deleted successfully",
  "data": {
    "product_id": 1,
    "product_status": "inactive"
  }
}
```

---

### 3.11 전체 상품 목록 조회

```javascript
GET /api/v1/products
```

#### 권한
- **Public**
- 미들웨어: 없음

#### Controller
`productController.getAllProducts`

#### Query Parameters
- `page` (number, default: 1): 페이지 번호
- `limit` (number, default: 10): 페이지당 항목 수
- `status` (string, optional): 상태 필터
- `categoryId` (number, optional): 카테고리 필터
- `tenantId` (number, optional): 판매사 필터
- `minPrice` (number, optional): 최소 가격
- `maxPrice` (number, optional): 최대 가격
- `search` (string, optional): 검색어 (상품명, 설명)
- `sortBy` (string, default: `created_at`): 정렬 기준
- `sortOrder` (string, default: `desc`): 정렬 순서 (`asc`, `desc`)

#### 정렬 기준 (sortBy)
- `created_at`: 등록일순
- `price`: 가격순
- `view_count`: 조회수순
- `name`: 이름순

#### 사용 예시
```bash
# 1. 기본 조회
GET /api/v1/products?page=1&limit=20

# 2. 카테고리 필터링
GET /api/v1/products?categoryId=1

# 3. 가격 범위 필터링
GET /api/v1/products?minPrice=10000&maxPrice=50000

# 4. 검색 + 정렬
GET /api/v1/products?search=찻잔&sortBy=price&sortOrder=asc

# 5. 복합 필터링
GET /api/v1/products?categoryId=1&status=active&minPrice=20000&sortBy=view_count&sortOrder=desc
```

#### 응답 형식
```json
{
  "success": true,
  "message": "Products retrieved successfully",
  "data": {
    "products": [
      {
        "product_id": 1,
        "product_name": "청자 찻잔",
        "product_price": 45000,
        "product_thumbnail": "https://...",
        "product_status": "active",
        "product_view_count": 235,
        "category": {
          "category_name": "찻잔"
        },
        "tenant_member": {
          "tenant": {
            "tenant_name": "홍길동 공방"
          }
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 10,
      "totalItems": 97,
      "itemsPerPage": 10
    }
  }
}
```

---

### 3.12 상품 등록

```javascript
POST /api/v1/products
```

#### 권한
- **Private** (승인된 TenantMember만)
- 미들웨어: `authenticate`

#### Controller
`productController.createProduct`

#### Request Body
```json
{
  "tenant_member_id": 10,
  "category_id": 2,
  "product_name": "청자 찻잔",
  "product_description": "전통 방식으로 제작한 청자 찻잔입니다",
  "product_price": 45000,
  "product_stock": 15
}
```

#### 필수 필드
- `tenant_member_id`: 판매사 구성원 ID
- `category_id`: 카테고리 ID
- `product_name`: 상품명
- `product_price`: 가격
- `product_stock`: 재고

#### 선택 필드
- `product_description`: 상품 설명

#### 제약 조건
1. 승인된 TenantMember만 등록 가능 (`tenant_member_approval_status === 'approved'`)
2. 가격은 0보다 커야 함
3. 재고는 0 이상이어야 함

#### 사용 예시
```bash
POST /api/v1/products
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "tenant_member_id": 10,
  "category_id": 2,
  "product_name": "청자 찻잔",
  "product_description": "전통 방식으로 제작한 청자 찻잔입니다",
  "product_price": 45000,
  "product_stock": 15
}
```

#### 응답 형식
```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "product_id": 1,
    "product_name": "청자 찻잔",
    "product_price": 45000,
    "product_stock": 15,
    "product_status": "active",
    "product_created_at": "2025-10-13T12:00:00.000Z"
  }
}
```

---

## 4. 라우트 순서

### 라우트 순서가 매우 중요!

Express는 정의된 순서대로 라우트를 매칭하므로, **구체적인 경로를 먼저**, **동적 파라미터는 나중에** 정의해야 합니다.

```javascript
// ✅ 올바른 순서
router.get('/me/:tenantMemberId', ...);           // 구체적 경로 먼저
router.get('/category/:categoryId', ...);         // 구체적 경로 먼저
router.delete('/images/:productImgId', ...);      // 구체적 경로 먼저
router.get('/:productId/stats', ...);             // 동적 + 구체적
router.post('/:productId/images', ...);           // 동적 + 구체적
router.get('/:productId', ...);                   // 동적 파라미터
router.get('/', ...);                             // 루트는 마지막

// ❌ 잘못된 순서
router.get('/:productId', ...);                   // '/me'도 여기서 매칭!
router.get('/me/:tenantMemberId', ...);           // 실행 안 됨
```

### Product Routes의 순서

```javascript
// 1. 구체적인 경로 먼저 (Static Routes)
router.get('/me/:tenantMemberId', ...);           // GET /products/me/:tenantMemberId
router.get('/category/:categoryId', ...);         // GET /products/category/:categoryId
router.delete('/images/:productImgId', ...);      // DELETE /products/images/:productImgId

// 2. 동적 파라미터 + 구체적 경로 (Semi-Dynamic Routes)
router.get('/:productId/stats', ...);             // GET /products/:productId/stats
router.post('/:productId/images', ...);           // POST /products/:productId/images
router.put('/:productId/images/reorder', ...);    // PUT /products/:productId/images/reorder
router.patch('/:productId/status', ...);          // PATCH /products/:productId/status

// 3. 동적 파라미터 (Dynamic Routes)
router.get('/:productId', ...);                   // GET /products/:productId
router.patch('/:productId', ...);                 // PATCH /products/:productId
router.delete('/:productId', ...);                // DELETE /products/:productId

// 4. 루트 경로 (Root Routes) - 마지막
router.get('/', ...);                             // GET /products
router.post('/', ...);                            // POST /products
```

---

## 5. 미들웨어 체이닝

### 인증 미들웨어 (`authenticate`)

JWT 토큰을 검증하고 `req.user`에 사용자 정보를 설정합니다.

```javascript
router.post('/', authenticate, productController.createProduct);
//                ^^^^^^^^^^^^
//                JWT 검증
```

#### 동작 방식
1. `Authorization: Bearer <token>` 헤더에서 토큰 추출
2. JWT 검증 (유효기간, 서명)
3. 토큰 payload를 `req.user`에 설정
4. 검증 실패 시 `401 Unauthorized` 응답

### Owner 권한은 Service에서 검증

상품 수정/삭제는 본인만 가능하므로, **Service Layer**에서 권한을 확인합니다:

```javascript
// Routes: authenticate만
router.patch('/:productId', authenticate, productController.updateProduct);

// Service: Owner 권한 확인
async function updateProduct(productId, memberId, updateData) {
  const product = await productRepository.findById(productId);

  // Owner 확인 로직
  if (Number(product.tenant_member.member_id) !== memberId) {
    throw new ForbiddenError('Only product owner can update');
  }
}
```

---

## 6. 사용 흐름

### 6.1 판매자가 상품 등록

```bash
# Step 1: 상품 등록
POST /api/v1/products
Authorization: Bearer <JWT_TOKEN>
{
  "tenant_member_id": 10,
  "category_id": 2,
  "product_name": "청자 찻잔",
  "product_price": 45000,
  "product_stock": 15
}
→ 201 Created (product_id: 1)

# Step 2: 상품 이미지 업로드
POST /api/v1/products/1/images
Authorization: Bearer <JWT_TOKEN>
{
  "images": [
    { "product_img_url": "https://...", "product_img_sequence": 1 },
    { "product_img_url": "https://...", "product_img_sequence": 2 }
  ]
}
→ 201 Created (2개 이미지 업로드)

# Step 3: 내 상품 목록 확인
GET /api/v1/products/me/10
Authorization: Bearer <JWT_TOKEN>
→ 200 OK (등록한 상품 목록)
```

### 6.2 고객이 상품 조회

```bash
# Step 1: 전체 상품 목록 조회
GET /api/v1/products?page=1&limit=20
→ 200 OK (20개 상품 목록)

# Step 2: 카테고리별 필터링
GET /api/v1/products/category/2?page=1
→ 200 OK ("찻잔" 카테고리 상품 목록)

# Step 3: 가격 범위 필터링
GET /api/v1/products?minPrice=30000&maxPrice=50000
→ 200 OK (30,000원 ~ 50,000원 상품)

# Step 4: 상품 상세 조회 (조회수 자동 증가)
GET /api/v1/products/1
→ 200 OK (상품 상세 + 이미지 + 판매자 정보)

# Step 5: 상품 통계 조회
GET /api/v1/products/1/stats
→ 200 OK (조회수, 판매량, 매출 등)
```

### 6.3 판매자가 상품 관리

```bash
# Step 1: 상품 정보 수정
PATCH /api/v1/products/1
Authorization: Bearer <JWT_TOKEN>
{
  "product_price": 55000,
  "product_stock": 10
}
→ 200 OK

# Step 2: 상품 상태 변경 (품절)
PATCH /api/v1/products/1/status
Authorization: Bearer <JWT_TOKEN>
{
  "product_status": "sold_out"
}
→ 200 OK

# Step 3: 이미지 순서 재배치
PUT /api/v1/products/1/images/reorder
Authorization: Bearer <JWT_TOKEN>
{
  "image_orders": [
    { "product_img_id": 102, "product_img_sequence": 1 },
    { "product_img_id": 101, "product_img_sequence": 2 }
  ]
}
→ 200 OK

# Step 4: 이미지 삭제
DELETE /api/v1/products/images/102
Authorization: Bearer <JWT_TOKEN>
→ 200 OK

# Step 5: 상품 삭제 (Soft Delete)
DELETE /api/v1/products/1
Authorization: Bearer <JWT_TOKEN>
→ 200 OK (status: inactive)
```

---

## 7. 주의사항

### 7.1 라우트 순서 매우 중요

구체적인 경로(`/me`, `/category`, `/images`)가 먼저, 동적 파라미터(`/:id`)는 나중에:

```javascript
// ✅ 올바른 순서
router.get('/me/:tenantMemberId', ...);    // 먼저
router.get('/:productId', ...);            // 나중

// ❌ 잘못된 순서 (/:productId가 /me를 가로챔)
router.get('/:productId', ...);            // '/me'도 여기서 매칭!
router.get('/me/:tenantMemberId', ...);    // 실행 안 됨
```

### 7.2 Public API는 미들웨어 없음

모든 조회 API는 Public이므로 인증 미들웨어를 적용하지 않습니다:

```javascript
// ✅ Public API
router.get('/', productController.getAllProducts);
router.get('/:productId', productController.getProductById);

// ❌ Public API인데 인증 필요 (불필요)
router.get('/', authenticate, productController.getAllProducts);
```

### 7.3 Owner 권한은 Service에서 검증

Owner 권한은 `authenticate` 미들웨어가 아닌 **Service Layer**에서 검증합니다:

```javascript
// Routes: authenticate만
router.patch('/:productId', authenticate, productController.updateProduct);

// Service: Owner 권한 확인
async function updateProduct(productId, memberId, updateData) {
  // Owner 확인 로직
  if (Number(product.tenant_member.member_id) !== memberId) {
    throw new ForbiddenError('Only product owner can update');
  }
}
```

### 7.4 PATCH vs PUT

상품 수정은 **PATCH** 메서드를 사용합니다:

- **PATCH**: 일부 필드만 수정 (부분 업데이트)
- **PUT**: 전체 리소스 교체 (전체 업데이트)

```javascript
// ✅ PATCH 사용 (일부 필드만 수정)
router.patch('/:productId', authenticate, productController.updateProduct);

// ✅ PUT 사용 (이미지 순서 전체 재배치)
router.put('/:productId/images/reorder', authenticate, productController.reorderProductImages);
```

### 7.5 이미지 최대 개수 제한

상품당 최대 **10개**의 이미지만 등록 가능:

```javascript
// Service에서 검증
async function uploadProductImages(productId, images) {
  const existingImages = await productImgRepository.findByProductId(productId);

  if (existingImages.length + images.length > 10) {
    throw new ValidationError('Maximum 10 images allowed per product');
  }
}
```

### 7.6 조회수 자동 증가

상품 상세 조회 시 `product_view_count`가 자동으로 증가:

```javascript
// Service에서 자동 증가
async function getProductById(productId) {
  // 조회수 증가
  await productRepository.incrementViewCount(productId);

  // 상품 조회
  const product = await productRepository.findById(productId);
  return product;
}
```

### 7.7 Soft Delete 방식

상품 삭제는 **Soft Delete** 방식 사용:

- 실제 데이터는 삭제하지 않음
- `product_status`를 `inactive`로 변경
- 주문 이력 보존을 위함

```javascript
// ✅ Soft Delete
async function deleteProduct(productId) {
  await productRepository.updateStatus(productId, 'inactive');
}

// ❌ Hard Delete (사용하지 않음)
async function deleteProduct(productId) {
  await productRepository.deleteById(productId); // 절대 사용 금지!
}
```

---

## 8. 테스트 시나리오

### 8.1 Public API 테스트

```bash
# 1. 전체 상품 목록 조회 (인증 없음)
GET /api/v1/products
→ 200 OK

# 2. 상품 상세 조회
GET /api/v1/products/1
→ 200 OK

# 3. 존재하지 않는 상품
GET /api/v1/products/999
→ 404 Not Found (Product not found)

# 4. 카테고리별 필터링
GET /api/v1/products/category/1
→ 200 OK

# 5. 가격 범위 필터링
GET /api/v1/products?minPrice=10000&maxPrice=50000
→ 200 OK

# 6. 검색 + 정렬
GET /api/v1/products?search=찻잔&sortBy=price&sortOrder=asc
→ 200 OK
```

### 8.2 Private API - 인증 테스트

```bash
# 1. 성공: 유효한 토큰
POST /api/v1/products
Authorization: Bearer <valid_token>
→ 201 Created

# 2. 실패: 토큰 없음
POST /api/v1/products
→ 401 Unauthorized (No token provided)

# 3. 실패: 유효하지 않은 토큰
POST /api/v1/products
Authorization: Bearer invalid_token
→ 401 Unauthorized (Invalid token)
```

### 8.3 상품 등록 테스트

```bash
# 1. 성공: 승인된 TenantMember
POST /api/v1/products
Authorization: Bearer <approved_tenant_member_token>
{
  "tenant_member_id": 10,
  "category_id": 2,
  "product_name": "청자 찻잔",
  "product_price": 45000,
  "product_stock": 15
}
→ 201 Created

# 2. 실패: 승인되지 않은 TenantMember
POST /api/v1/products
Authorization: Bearer <pending_tenant_member_token>
→ 403 Forbidden (Only approved tenant members can create products)

# 3. 실패: 필수 필드 누락
POST /api/v1/products
{
  "product_name": "청자 찻잔"
}
→ 400 Bad Request (Missing required fields)

# 4. 실패: 유효하지 않은 가격
POST /api/v1/products
{
  "product_price": -1000
}
→ 400 Bad Request (Price must be greater than 0)
```

### 8.4 상품 수정/삭제 테스트

```bash
# 1. 성공: 본인 상품 수정
PATCH /api/v1/products/1
Authorization: Bearer <owner_token>
{
  "product_price": 55000
}
→ 200 OK

# 2. 실패: 타인 상품 수정
PATCH /api/v1/products/1
Authorization: Bearer <other_user_token>
→ 403 Forbidden (Only product owner can update)

# 3. 성공: 본인 상품 삭제
DELETE /api/v1/products/1
Authorization: Bearer <owner_token>
→ 200 OK (Soft Delete)

# 4. 실패: 타인 상품 삭제
DELETE /api/v1/products/1
Authorization: Bearer <other_user_token>
→ 403 Forbidden (Only product owner can delete)
```

### 8.5 이미지 관리 테스트

```bash
# 1. 성공: 이미지 업로드
POST /api/v1/products/1/images
Authorization: Bearer <owner_token>
{
  "images": [
    { "product_img_url": "https://...", "product_img_sequence": 1 }
  ]
}
→ 201 Created

# 2. 실패: 최대 개수 초과
POST /api/v1/products/1/images
{
  "images": [...11개...]
}
→ 400 Bad Request (Maximum 10 images allowed per product)

# 3. 성공: 이미지 순서 재배치
PUT /api/v1/products/1/images/reorder
Authorization: Bearer <owner_token>
{
  "image_orders": [...]
}
→ 200 OK

# 4. 성공: 이미지 삭제
DELETE /api/v1/products/images/101
Authorization: Bearer <owner_token>
→ 200 OK

# 5. 실패: 타인 이미지 삭제
DELETE /api/v1/products/images/101
Authorization: Bearer <other_user_token>
→ 403 Forbidden
```

### 8.6 라우트 순서 테스트

```bash
# 1. '/me' 엔드포인트 정상 동작
GET /api/v1/products/me/10
Authorization: Bearer <valid_token>
→ 200 OK (내 상품 목록)

# 2. '/:productId' 엔드포인트와 혼동되지 않음
GET /api/v1/products/1
→ 200 OK (상품 1번 상세)

# 3. '/category/:categoryId' 정상 동작
GET /api/v1/products/category/1
→ 200 OK (카테고리 1번의 상품 목록)

# 4. '/images/:productImgId' 정상 동작
DELETE /api/v1/products/images/101
Authorization: Bearer <owner_token>
→ 200 OK
```

---

## 9. 전체 코드

```javascript
const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { authenticate } = require('../middlewares/auth');

/**
 * Product Routes
 * 상품 및 상품 이미지 관련 API 엔드포인트
 *
 * Public API: 상품 조회 (목록, 상세, 카테고리별, 통계)
 * Private API: 상품 등록, 수정, 삭제, 이미지 관리
 *
 * 주의: 라우트 순서가 중요합니다!
 * - 구체적인 경로 (/me, /category, /images)가 먼저
 * - 동적 파라미터 (/:productId)는 나중에
 */

/**
 * @route   GET /api/v1/products/me/:tenantMemberId
 * @desc    내 상품 목록 조회 (판매자용)
 * @access  Private
 * @query   page, limit, status
 */
router.get('/me/:tenantMemberId', authenticate, productController.getMyProducts);

/**
 * @route   GET /api/v1/products/category/:categoryId
 * @desc    카테고리별 상품 목록 조회
 * @access  Public
 * @query   page, limit
 */
router.get('/category/:categoryId', productController.getProductsByCategory);

/**
 * @route   DELETE /api/v1/products/images/:productImgId
 * @desc    상품 이미지 삭제 (본인만)
 * @access  Private
 */
router.delete('/images/:productImgId', authenticate, productController.deleteProductImage);

/**
 * @route   GET /api/v1/products/:productId/stats
 * @desc    상품 통계 조회
 * @access  Public
 */
router.get('/:productId/stats', productController.getProductStats);

/**
 * @route   POST /api/v1/products/:productId/images
 * @desc    상품 이미지 업로드 (본인만, 최대 10개)
 * @access  Private
 */
router.post('/:productId/images', authenticate, productController.uploadProductImages);

/**
 * @route   PUT /api/v1/products/:productId/images/reorder
 * @desc    상품 이미지 순서 재배치 (본인만)
 * @access  Private
 */
router.put('/:productId/images/reorder', authenticate, productController.reorderProductImages);

/**
 * @route   PATCH /api/v1/products/:productId/status
 * @desc    상품 상태 변경 (본인만)
 * @access  Private
 */
router.patch('/:productId/status', authenticate, productController.updateProductStatus);

/**
 * @route   GET /api/v1/products/:productId
 * @desc    상품 상세 조회 (조회수 자동 증가)
 * @access  Public
 */
router.get('/:productId', productController.getProductById);

/**
 * @route   PATCH /api/v1/products/:productId
 * @desc    상품 수정 (본인만)
 * @access  Private
 */
router.patch('/:productId', authenticate, productController.updateProduct);

/**
 * @route   DELETE /api/v1/products/:productId
 * @desc    상품 삭제 (본인만)
 * @access  Private
 */
router.delete('/:productId', authenticate, productController.deleteProduct);

/**
 * @route   GET /api/v1/products
 * @desc    전체 상품 목록 조회 (필터링/정렬/페이징)
 * @access  Public
 * @query   page, limit, status, categoryId, tenantId, minPrice, maxPrice, search, sortBy, sortOrder
 */
router.get('/', productController.getAllProducts);

/**
 * @route   POST /api/v1/products
 * @desc    상품 등록 (승인된 TenantMember만)
 * @access  Private
 */
router.post('/', authenticate, productController.createProduct);

module.exports = router;
```

---

## 10. 다음 단계

1. **Step 2-19**: Validation Middleware 추가 (상품 등록/수정 검증)
2. **Step 2-20**: 00_INDEX.md 업데이트 (Phase 2 완료 상태 반영)
3. **Phase 3**: 장바구니 및 주문 기능 구현

