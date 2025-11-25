# Step 2-14: Product Controller 구현

## 1. 개요

**Product Controller**는 상품 및 상품 이미지 관련 HTTP 요청/응답을 처리하는 컨트롤러입니다.

### 주요 역할

- 상품 등록/수정/삭제 (판매자)
- 상품 목록 조회 (Public, 필터링/정렬/페이징)
- 상품 상세 조회 (Public, 조회수 증가)
- 상품 이미지 관리 (업로드/삭제/순서 변경)
- 상품 통계 조회

### 파일 위치

```
src/controllers/product.controller.js
```

### 의존성

```javascript
const productService = require('../services/product.service');
const { successResponse } = require('../utils/response');
```

---

## 2. 개념

### Product와 Multi-Tenancy

**Product**는 **TenantMember**에 속합니다 (Tenant가 아님!)

```
Tenant (판매사)
  ↓
TenantMember (판매자)
  ↓
Product (상품)
```

#### 중요한 개념

1. **Product는 TenantMember 소유**: 판매사가 아닌 **개별 판매자**가 상품 소유
2. **승인된 TenantMember만 상품 등록 가능**: `tenant_member_approval_status: 'approved'`
3. **상품 상태 관리**: `inactive` (기본) → `active` (판매 중) → `sold_out` (품절)
4. **본인 확인**: 상품 수정/삭제는 등록한 판매자만 가능

#### 상품 등록 권한 체크

```
1. TenantMember 존재 확인
2. 본인 확인 (product.tenant_member.member_id === req.user.member_id)
3. 승인 상태 확인 (tenant_member_approval_status === 'approved')
```

---

## 3. 함수 설명

### 3.1 `createProduct(req, res, next)`

**상품 등록** (승인된 TenantMember만)

#### HTTP 요청
```
POST /api/products
Authorization: Bearer <JWT_TOKEN>
```

#### Request Body
```json
{
  "tenant_member_id": 5,
  "category_id": 3,
  "product_name": "청자 찻잔",
  "product_description": "전통 방식으로 제작한 청자 찻잔입니다",
  "product_price": 50000,
  "product_quantity": 10
}
```

#### Response (201 Created)
```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "product_id": 100,
    "tenant_member_id": 5,
    "category_id": 3,
    "product_name": "청자 찻잔",
    "product_description": "전통 방식으로 제작한 청자 찻잔입니다",
    "product_price": 50000,
    "product_quantity": 10,
    "product_status": "inactive",
    "product_view_count": 0
  }
}
```

#### 주요 로직
1. JWT 토큰에서 `member_id` 추출
2. Request Body에서 상품 데이터 추출
3. `productService.createProduct(memberId, data)` 호출
   - Service에서 TenantMember 권한 확인
   - Service에서 승인 상태 확인
   - 기본 상태: `inactive`
4. `successResponse` 헬퍼로 201 응답 반환

---

### 3.2 `getProductById(req, res, next)`

**상품 상세 조회** (Public, 조회수 증가)

#### HTTP 요청
```
GET /api/products/:productId
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Product retrieved successfully",
  "data": {
    "product_id": 100,
    "product_name": "청자 찻잔",
    "product_description": "...",
    "product_price": 50000,
    "product_quantity": 10,
    "product_status": "active",
    "product_view_count": 125,
    "tenant_member": {
      "tenant_member_id": 5,
      "member": {
        "member_id": 123,
        "member_name": "홍길동"
      },
      "tenant": {
        "tenant_id": 1,
        "tenant_name": "홍길동 공방"
      }
    },
    "category": {
      "category_id": 3,
      "category_name": "청자 찻잔"
    },
    "product_images": [
      {
        "product_img_id": 1,
        "product_img_url": "https://...",
        "product_image_sequence": 0
      }
    ]
  }
}
```

#### 주요 로직
1. URL 파라미터에서 `productId` 추출 후 정수 변환
2. 유효성 검사 (`isNaN` 체크)
3. `productService.getProductById(productId)` 호출
   - Service에서 자동으로 조회수 증가 (`active` 상태인 경우만)
4. 성공 응답 반환

---

### 3.3 `getMyProducts(req, res, next)`

**내 상품 목록 조회** (판매자용)

#### HTTP 요청
```
GET /api/products/me/:tenantMemberId?page=1&limit=20&status=active
Authorization: Bearer <JWT_TOKEN>
```

#### Query Parameters
- `page` (number, default: 1): 페이지 번호
- `limit` (number, default: 20): 페이지당 항목 수
- `status` (string, optional): 상태 필터 (`active`, `sold_out`, `inactive`)

#### Response (200 OK)
```json
{
  "success": true,
  "message": "My products retrieved successfully",
  "data": {
    "products": [
      {
        "product_id": 100,
        "product_name": "청자 찻잔",
        "product_price": 50000,
        "product_quantity": 10,
        "product_status": "active",
        "product_view_count": 125
      }
    ],
    "total": 50,
    "page": 1,
    "totalPages": 3
  }
}
```

#### 주요 로직
1. JWT 토큰에서 `memberId` 추출
2. URL 파라미터에서 `tenantMemberId` 추출
3. Query Parameters에서 페이징 옵션 추출
4. `productService.getMyProducts(memberId, tenantMemberId, options)` 호출
   - Service에서 본인 확인
5. 성공 응답 반환

---

### 3.4 `getAllProducts(req, res, next)`

**전체 상품 목록 조회** (Public, 필터링/정렬/페이징)

#### HTTP 요청
```
GET /api/products?page=1&limit=20&status=active&categoryId=3&minPrice=10000&maxPrice=100000&search=찻잔&sortBy=price&sortOrder=asc
```

#### Query Parameters
- `page` (number, default: 1): 페이지 번호
- `limit` (number, default: 20): 페이지당 항목 수
- `status` (string, default: 'active'): 상태 필터
- `categoryId` (number, optional): 카테고리 필터
- `tenantId` (number, optional): 판매사 필터
- `minPrice` (number, optional): 최소 가격
- `maxPrice` (number, optional): 최대 가격
- `search` (string, optional): 검색어 (상품명, 설명)
- `sortBy` (string, default: 'created_at'): 정렬 기준 (price, view_count, created_at)
- `sortOrder` (string, default: 'desc'): 정렬 순서 (asc, desc)

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Products retrieved successfully",
  "data": {
    "products": [ ... ],
    "total": 150,
    "page": 1,
    "totalPages": 8
  }
}
```

#### 주요 로직
1. Query Parameters에서 필터링/정렬/페이징 옵션 추출
2. 정수/실수 변환 (`parseInt`, `parseFloat`)
3. `productService.getAllProducts(options)` 호출
4. 성공 응답 반환

---

### 3.5 `getProductsByCategory(req, res, next)`

**카테고리별 상품 목록 조회** (Public)

#### HTTP 요청
```
GET /api/products/category/:categoryId?page=1&limit=20
```

#### Query Parameters
- `page` (number, default: 1): 페이지 번호
- `limit` (number, default: 20): 페이지당 항목 수

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Products retrieved successfully",
  "data": {
    "products": [ ... ],
    "total": 45,
    "page": 1,
    "totalPages": 3
  }
}
```

#### 주요 로직
1. URL 파라미터에서 `categoryId` 추출 후 정수 변환
2. 유효성 검사
3. Query Parameters에서 페이징 옵션 추출
4. `productService.getProductsByCategory(categoryId, options)` 호출
   - Service에서 카테고리 존재 확인
5. 성공 응답 반환

---

### 3.6 `updateProduct(req, res, next)`

**상품 수정** (본인만)

#### HTTP 요청
```
PATCH /api/products/:productId
Authorization: Bearer <JWT_TOKEN>
```

#### Request Body
```json
{
  "product_name": "전통 청자 찻잔",
  "product_description": "새로운 설명",
  "product_price": 55000,
  "product_quantity": 8,
  "category_id": 4
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Product updated successfully",
  "data": { ... }
}
```

#### 주요 로직
1. URL 파라미터에서 `productId`, JWT에서 `memberId` 추출
2. 유효성 검사
3. Request Body에서 수정 데이터 추출
4. `productService.updateProduct(productId, memberId, updateData)` 호출
   - Service에서 본인 확인
   - Service에서 수정 가능한 필드만 처리
5. 성공 응답 반환

#### 수정 가능한 필드
- `product_name`
- `product_description`
- `product_price`
- `product_quantity`
- `category_id`

---

### 3.7 `updateProductStatus(req, res, next)`

**상품 상태 변경** (본인만)

#### HTTP 요청
```
PATCH /api/products/:productId/status
Authorization: Bearer <JWT_TOKEN>
```

#### Request Body
```json
{
  "status": "active"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Product status updated successfully",
  "data": {
    "product_id": 100,
    "product_status": "active"
  }
}
```

#### 주요 로직
1. URL 파라미터에서 `productId`, JWT에서 `memberId`, Body에서 `status` 추출
2. 유효성 검사 (status 필수)
3. `productService.updateProductStatus(productId, memberId, status)` 호출
   - Service에서 본인 확인
   - Service에서 상태 값 검증 (`active`, `sold_out`, `inactive`)
4. 성공 응답 반환

---

### 3.8 `deleteProduct(req, res, next)`

**상품 삭제** (본인만)

#### HTTP 요청
```
DELETE /api/products/:productId
Authorization: Bearer <JWT_TOKEN>
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Product deleted successfully",
  "data": {
    "message": "Product deleted successfully",
    "deleted_product": {
      "product_id": 100,
      "product_name": "청자 찻잔"
    }
  }
}
```

#### 주요 로직
1. URL 파라미터에서 `productId`, JWT에서 `memberId` 추출
2. 유효성 검사
3. `productService.deleteProduct(productId, memberId)` 호출
   - Service에서 본인 확인
   - Service에서 상품 이미지 CASCADE 삭제
4. 성공 응답 반환

---

### 3.9 `uploadProductImages(req, res, next)`

**상품 이미지 업로드** (본인만)

#### HTTP 요청
```
POST /api/products/:productId/images
Authorization: Bearer <JWT_TOKEN>
```

#### Request Body
```json
{
  "images": [
    {
      "url": "https://example.com/image1.jpg",
      "sequence": 0
    },
    {
      "url": "https://example.com/image2.jpg",
      "sequence": 1
    }
  ]
}
```

#### Response (201 Created)
```json
{
  "success": true,
  "message": "Product images uploaded successfully",
  "data": {
    "message": "2 images uploaded successfully",
    "images": [
      {
        "product_img_id": 1,
        "product_id": 100,
        "product_img_url": "https://...",
        "product_image_sequence": 0
      }
    ]
  }
}
```

#### 주요 로직
1. URL 파라미터에서 `productId`, JWT에서 `memberId`, Body에서 `images` 추출
2. 유효성 검사 (`images` 배열 필수)
3. `productService.uploadProductImages(productId, memberId, images)` 호출
   - Service에서 본인 확인
   - Service에서 이미지 개수 제한 (최대 10개)
4. `successResponse` 헬퍼로 201 응답 반환

---

### 3.10 `deleteProductImage(req, res, next)`

**상품 이미지 삭제** (본인만)

#### HTTP 요청
```
DELETE /api/products/images/:productImgId
Authorization: Bearer <JWT_TOKEN>
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Product image deleted successfully",
  "data": {
    "message": "Product image deleted successfully",
    "deleted_image": {
      "product_img_id": 1,
      "product_img_url": "https://..."
    }
  }
}
```

#### 주요 로직
1. URL 파라미터에서 `productImgId`, JWT에서 `memberId` 추출
2. 유효성 검사
3. `productService.deleteProductImage(productImgId, memberId)` 호출
   - Service에서 본인 확인
4. 성공 응답 반환

---

### 3.11 `reorderProductImages(req, res, next)`

**상품 이미지 순서 재배치** (본인만)

#### HTTP 요청
```
PUT /api/products/:productId/images/reorder
Authorization: Bearer <JWT_TOKEN>
```

#### Request Body
```json
{
  "updates": [
    { "imageId": 1, "sequence": 2 },
    { "imageId": 2, "sequence": 0 },
    { "imageId": 3, "sequence": 1 }
  ]
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Product images reordered successfully",
  "data": {
    "message": "3 images reordered successfully",
    "updated_count": 3
  }
}
```

#### 주요 로직
1. URL 파라미터에서 `productId`, JWT에서 `memberId`, Body에서 `updates` 추출
2. 유효성 검사 (`updates` 배열 필수)
3. `productService.reorderProductImages(productId, memberId, updates)` 호출
   - Service에서 본인 확인
4. 성공 응답 반환

---

### 3.12 `getProductStats(req, res, next)`

**상품 통계 조회**

#### HTTP 요청
```
GET /api/products/:productId/stats
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Product stats retrieved successfully",
  "data": {
    "product_id": 100,
    "product_name": "청자 찻잔",
    "product_status": "active",
    "product_view_count": 125,
    "product_quantity": 10,
    "image_count": 5,
    "order_count": 0,
    "tenant": {
      "tenant_id": 1,
      "tenant_name": "홍길동 공방"
    },
    "seller": {
      "member_id": 123,
      "member_name": "홍길동"
    }
  }
}
```

#### 주요 로직
1. URL 파라미터에서 `productId` 추출 후 정수 변환
2. 유효성 검사
3. `productService.getProductStats(productId)` 호출
4. 성공 응답 반환

---

## 4. 사용 흐름

### 4.1 상품 등록 → 이미지 업로드 → 활성화

```
1. [판매자] POST /api/products (상품 등록)
   {
     "tenant_member_id": 5,
     "category_id": 3,
     "product_name": "청자 찻잔",
     "product_price": 50000,
     "product_quantity": 10
   }
   → product_id: 100, product_status: 'inactive'

2. [판매자] POST /api/products/100/images (이미지 업로드)
   {
     "images": [
       { "url": "https://...", "sequence": 0 },
       { "url": "https://...", "sequence": 1 }
     ]
   }
   → 2개 이미지 업로드 완료

3. [판매자] PATCH /api/products/100/status (상태 활성화)
   {
     "status": "active"
   }
   → product_status: 'active' (이제 Public에 노출)

4. [Public] GET /api/products/100 (상품 조회)
   → 조회수 자동 증가
```

### 4.2 상품 검색 및 필터링

```
1. [Public] GET /api/products?status=active&categoryId=3&minPrice=30000&maxPrice=100000&sortBy=price&sortOrder=asc
   → "청자 찻잔" 카테고리, 30,000 ~ 100,000원, 가격 오름차순

2. [Public] GET /api/products?search=찻잔&sortBy=view_count&sortOrder=desc
   → "찻잔" 검색, 조회수 내림차순

3. [Public] GET /api/products/category/3?page=1&limit=20
   → 카테고리 3번의 상품 목록
```

---

## 5. 주의사항

### 5.1 Query Parameters 정수/실수 변환

Query Parameters는 항상 문자열:

```javascript
const options = {
  page: parseInt(req.query.page, 10) || 1,
  limit: parseInt(req.query.limit, 10) || 20,
  categoryId: req.query.categoryId ? parseInt(req.query.categoryId, 10) : undefined,
  minPrice: req.query.minPrice ? parseFloat(req.query.minPrice) : undefined
};
```

### 5.2 권한 검증은 Service에서

Controller는 **데이터 추출만** 수행:

```javascript
// ❌ 잘못된 예시: Controller에서 권한 검증
async function updateProduct(req, res, next) {
  const product = await prisma.product.findUnique(...);
  if (product.tenant_member.member_id !== req.user.member_id) {
    throw new ForbiddenError('...');
  }
  // ...
}

// ✅ 올바른 예시: Service에 위임
async function updateProduct(req, res, next) {
  const productId = parseInt(req.params.productId, 10);
  const memberId = req.user.member_id;
  const updateData = req.body;
  const updated = await productService.updateProduct(productId, memberId, updateData);
  return successResponse(res, updated, '...', 200);
}
```

### 5.3 이미지 개수 제한

- **최대 10개**: Service에서 자동 검증
- 현재 이미지 개수 + 새로 업로드할 개수 ≤ 10

### 5.4 상품 상태 관리

- **inactive** (기본): 이미지 업로드 전, 비공개 상태
- **active**: 판매 중 (Public에 노출)
- **sold_out**: 품절 (Public에 노출되지만 구매 불가)

### 5.5 조회수 자동 증가

`getProductById` 호출 시 **active 상태인 경우만** 조회수 증가:

```javascript
// Service에서 자동 처리
if (incrementView && product.product_status === 'active') {
  productRepository.incrementViewCount(productId).catch(() => {
    // 조회수 증가 실패해도 상품 조회는 정상 처리
  });
}
```

---

## 6. 테스트 시나리오

### 6.1 상품 등록 테스트

```javascript
// 1. 성공: 정상적인 상품 등록
POST /api/products
Authorization: Bearer <valid_token>
{
  "tenant_member_id": 5,
  "category_id": 3,
  "product_name": "청자 찻잔",
  "product_price": 50000,
  "product_quantity": 10
}
→ 201 Created

// 2. 실패: 승인되지 않은 TenantMember
POST /api/products
{
  "tenant_member_id": 10, // approval_status: 'pending'
  ...
}
→ 403 Forbidden (Only approved tenant members can create products)

// 3. 실패: 다른 사람의 TenantMember로 등록
POST /api/products
{
  "tenant_member_id": 20, // 다른 사람의 ID
  ...
}
→ 403 Forbidden (You can only create products for your own tenant membership)

// 4. 실패: 비활성 카테고리
POST /api/products
{
  "category_id": 99, // category_is_active: false
  ...
}
→ 400 Bad Request (Cannot create product in inactive category)
```

### 6.2 상품 조회 테스트

```javascript
// 1. 상품 상세 조회 (조회수 증가)
GET /api/products/100
→ 200 OK (product_view_count: 126)

// 2. 내 상품 목록 조회
GET /api/products/me/5?status=active
Authorization: Bearer <valid_token>
→ 200 OK (나의 활성 상품 목록)

// 3. 전체 상품 목록 (필터링)
GET /api/products?categoryId=3&minPrice=30000&maxPrice=100000
→ 200 OK (카테고리 3번, 30,000~100,000원)

// 4. 검색
GET /api/products?search=찻잔
→ 200 OK (상품명 또는 설명에 "찻잔" 포함)
```

### 6.3 상품 수정/삭제 테스트

```javascript
// 1. 성공: 본인 상품 수정
PATCH /api/products/100
Authorization: Bearer <owner_token>
{
  "product_price": 55000
}
→ 200 OK

// 2. 실패: 다른 사람의 상품 수정
PATCH /api/products/100
Authorization: Bearer <other_user_token>
→ 403 Forbidden (You can only update your own products)

// 3. 성공: 상품 상태 변경
PATCH /api/products/100/status
{
  "status": "sold_out"
}
→ 200 OK

// 4. 실패: 잘못된 상태 값
PATCH /api/products/100/status
{
  "status": "invalid_status"
}
→ 400 Bad Request (Invalid status. Must be one of: active, sold_out, inactive)

// 5. 성공: 상품 삭제
DELETE /api/products/100
→ 200 OK
```

### 6.4 이미지 관리 테스트

```javascript
// 1. 성공: 이미지 업로드
POST /api/products/100/images
{
  "images": [
    { "url": "https://...", "sequence": 0 },
    { "url": "https://...", "sequence": 1 }
  ]
}
→ 201 Created

// 2. 실패: 이미지 개수 초과
POST /api/products/100/images (이미 8개)
{
  "images": [ {}, {}, {} ] // 3개 추가
}
→ 400 Bad Request (Maximum 10 images per product)

// 3. 성공: 이미지 삭제
DELETE /api/products/images/5
→ 200 OK

// 4. 성공: 이미지 순서 변경
PUT /api/products/100/images/reorder
{
  "updates": [
    { "imageId": 1, "sequence": 2 },
    { "imageId": 2, "sequence": 0 }
  ]
}
→ 200 OK
```

### 6.5 페이징 및 정렬 테스트

```javascript
// 1. 기본 페이징 (page=1, limit=20)
GET /api/products
→ 200 OK (총 20개)

// 2. 가격 오름차순 정렬
GET /api/products?sortBy=price&sortOrder=asc
→ 200 OK (낮은 가격부터)

// 3. 조회수 내림차순 정렬
GET /api/products?sortBy=view_count&sortOrder=desc
→ 200 OK (인기순)

// 4. 페이지 2 조회
GET /api/products?page=2&limit=20
→ 200 OK (21~40번째 상품)
```

---

## 7. Routes 연결 예시 (다음 단계)

```javascript
// src/routes/product.routes.js
const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { authenticate } = require('../middlewares/auth');

// 공개 API
router.get('/', productController.getAllProducts);
router.get('/category/:categoryId', productController.getProductsByCategory);
router.get('/:productId', productController.getProductById);
router.get('/:productId/stats', productController.getProductStats);

// 인증 필요
router.post('/', authenticate, productController.createProduct);
router.get('/me/:tenantMemberId', authenticate, productController.getMyProducts);
router.patch('/:productId', authenticate, productController.updateProduct);
router.patch('/:productId/status', authenticate, productController.updateProductStatus);
router.delete('/:productId', authenticate, productController.deleteProduct);

// 이미지 관리
router.post('/:productId/images', authenticate, productController.uploadProductImages);
router.delete('/images/:productImgId', authenticate, productController.deleteProductImage);
router.put('/:productId/images/reorder', authenticate, productController.reorderProductImages);

module.exports = router;
```

---

## 8. 다음 단계

1. **Step 2-15**: Tenant Routes 구현
2. **Step 2-16**: TenantMember Routes 구현
3. **Step 2-17**: Category Routes 구현
4. **Step 2-18**: Product Routes 구현
5. **Step 2-19**: Validation Middleware 추가
6. **Step 2-20**: 00_INDEX.md 업데이트

