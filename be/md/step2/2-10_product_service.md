# Step 2-10: Product Service 생성

> **Phase 2: 판매자 기능 구축**
> **작성일**: 2025년 10월 13일
> **상태**: ✅ 완료

---

## 📋 작업 개요

### 목적
상품 등록 및 관리 비즈니스 로직을 구현하여 멀티테넌시 환경에서 상품 판매 기능을 제공합니다.

### 작업 내용
- `src/services/product.service.js` 파일 생성
- 상품 CRUD 비즈니스 로직 구현
- TenantMember 권한 확인 (승인된 구성원만 등록)
- 이미지 업로드 및 관리
- 필터링, 정렬, 페이징 지원

---

## 🎯 Product Service란?

### 1. Service의 역할

```
Controller (HTTP 요청/응답)
    ↓
Service (비즈니스 로직) ← 여기!
    ↓
Repository (데이터 접근)
    ↓
Database
```

**Repository와의 차이**:
| 구분 | Repository | Service |
|------|-----------|---------|
| 역할 | 데이터 접근 | 비즈니스 로직 |
| 책임 | CRUD | 권한 확인, 검증 |
| 권한 확인 | ❌ | ✅ (TenantMember 확인) |
| 검증 | 기본 | 복잡한 규칙 |

**Service가 하는 일**:
- TenantMember 권한 확인 (승인된 구성원만 등록)
- 본인 확인 (자신의 상품만 수정/삭제)
- 카테고리 유효성 확인
- 가격, 재고 검증
- 이미지 개수 제한
- BigInt 변환 처리

---

### 2. 멀티테넌시와 상품

```
Member (회원)
  ↓ N:N
TenantMember (판매사 구성원)
  ↓ 1:N
Product (상품)
```

**중요**: 상품은 **Tenant(판매사)**가 아닌 **TenantMember(판매자)**에 속합니다!

**예시**:
```javascript
// 홍길동은 "A공방"과 "B공방" 모두에 소속
Member: { member_id: 1, member_name: "홍길동" }

TenantMember: [
  { tenant_member_id: 10, tenant_id: 1, member_id: 1 }, // A공방
  { tenant_member_id: 20, tenant_id: 2, member_id: 1 }  // B공방
]

// 각 판매사별로 다른 상품 등록
Product: [
  { product_id: 100, tenant_member_id: 10, product_name: "A공방 도자기" },
  { product_id: 200, tenant_member_id: 20, product_name: "B공방 목공예" }
]
```

---

### 3. 상품 등록 권한

**상품을 등록할 수 있는 조건**:
1. ✅ 회원이어야 함
2. ✅ TenantMember로 등록되어 있어야 함
3. ✅ **승인된** TenantMember여야 함 (`tenant_member_approval_status: 'approved'`)

```javascript
// 권한 확인 흐름
1. TenantMember 존재 확인
2. 본인 확인 (tenantMember.member_id === memberId)
3. 승인 상태 확인 (tenant_member_approval_status === 'approved')
```

---

### 4. 상품 상태 관리

```javascript
product_status: 'inactive'  // 비공개 (기본값)
  ↓
product_status: 'active'    // 판매 중
  ↓
product_status: 'sold_out'  // 품절
```

**권장 흐름**:
1. 상품 등록 (inactive 상태)
2. 이미지 업로드
3. 상품 활성화 (active 상태)

---

## 📁 파일 위치

```
src/
└── services/
    ├── member.service.js       (Phase 1 완료)
    ├── admin.service.js        (Phase 1 완료)
    ├── auth.service.js         (Phase 1 완료)
    ├── tenant.service.js       (Step 2-7 완료)
    ├── tenantMember.service.js (Step 2-8 완료)
    ├── category.service.js     (Step 2-9 완료)
    └── product.service.js      ← 생성한 파일
```

---

## 💻 구현 코드

### 전체 구조

```javascript
const productRepository = require('../repositories/product.repository');
const productImgRepository = require('../repositories/productImg.repository');
const categoryRepository = require('../repositories/category.repository');
const tenantMemberRepository = require('../repositories/tenantMember.repository');

// 12개의 함수 제공:
// - 상품 관리: createProduct, getProductById, updateProduct, updateProductStatus, deleteProduct
// - 목록 조회: getMyProducts, getAllProducts, getProductsByCategory
// - 이미지 관리: uploadProductImages, deleteProductImage, reorderProductImages
// - 통계: getProductStats
```

---

## 🔧 함수 설명

### 1. 상품 등록 (승인된 TenantMember만)

#### `createProduct(memberId, data)`
**역할**: 새 상품 등록 (권한 확인 후 생성)

**파라미터**:
```javascript
memberId = 123;  // 요청 회원 ID

data = {
  tenant_member_id: 10,              // 필수: 판매자 ID
  category_id: 12,                   // 필수: 카테고리 ID
  product_name: "수제 찻잔",          // 필수: 상품명
  product_description: "전통 방식...", // 선택: 상품 설명
  product_price: 25000,              // 필수: 가격 (0 이상)
  product_quantity: 10               // 선택: 재고 (기본값: 0)
}
```

**반환값**:
- 생성된 상품 정보 (inactive 상태)

**사용 예시**:
```javascript
// 상품 등록
const product = await productService.createProduct(123, {
  tenant_member_id: 10,
  category_id: 12,
  product_name: "수제 찻잔",
  product_description: "전통 방식으로 제작한 찻잔입니다.",
  product_price: 25000,
  product_quantity: 10
});

console.log(product.product_status);  // "inactive"
console.log(product.product_id);  // 100
```

**내부 동작**:
```javascript
// 1. 필수 필드 확인
if (!tenant_member_id || !category_id || !product_name || product_price === undefined) {
  throw new ValidationError('Required fields missing');
}

// 2. TenantMember 존재 확인
const tenantMember = await tenantMemberRepository.findById(tenant_member_id);
if (!tenantMember) {
  throw new NotFoundError('Tenant member not found');
}

// 3. 본인 확인
if (Number(tenantMember.member_id) !== memberId) {
  throw new ForbiddenError('You can only create products for your own membership');
}

// 4. 승인 상태 확인
if (tenantMember.tenant_member_approval_status !== 'approved') {
  throw new ForbiddenError('Only approved tenant members can create products');
}

// 5. 카테고리 확인
const category = await categoryRepository.findById(category_id);
if (!category || !category.category_is_active) {
  throw new ValidationError('Invalid or inactive category');
}

// 6. 가격/재고 검증
if (product_price < 0 || product_quantity < 0) {
  throw new ValidationError('Price and quantity must be non-negative');
}

// 7. 상품 생성 (inactive 상태)
const product = await productRepository.create({
  ...data,
  product_status: 'inactive'  // 이미지 업로드 후 활성화
});
```

**특징**:
- **권한 확인**: 승인된 TenantMember만 등록 가능
- **본인 확인**: 자신의 TenantMember ID로만 등록
- **기본 상태**: inactive (이미지 업로드 후 활성화 권장)
- **카테고리 검증**: 존재하고 활성 상태인 카테고리만
- **음수 방지**: 가격과 재고는 0 이상

**에러 처리**:
```javascript
try {
  const product = await productService.createProduct(memberId, data);
} catch (error) {
  if (error instanceof ForbiddenError) {
    // 권한 없음 (미승인 TenantMember 또는 타인의 TenantMember)
  } else if (error instanceof ValidationError) {
    // 필수 필드 누락 또는 유효하지 않은 값
  } else if (error instanceof NotFoundError) {
    // TenantMember 또는 카테고리가 존재하지 않음
  }
}
```

---

### 2. 상품 조회

#### `getProductById(productId, options)`
**역할**: 상품 상세 조회 (조회수 증가 포함)

**파라미터**:
```javascript
productId = 100;

options = {
  incrementView: true  // 조회수 증가 여부 (기본값: true)
}
```

**반환값**:
- 상품 정보 (판매자, 판매사, 카테고리, 이미지 포함)

**사용 예시**:
```javascript
// 상품 상세 조회 (조회수 증가)
const product = await productService.getProductById(100);

console.log(product.product_name);  // "수제 찻잔"
console.log(product.tenant_member.tenant.tenant_name);  // "홍길동 공방"
console.log(product.category.category_name);  // "찻잔"
console.log(product.product_images.length);  // 3

// 조회수 증가 없이 조회 (관리자용)
const productForEdit = await productService.getProductById(100, {
  incrementView: false
});
```

**특징**:
- 활성 상품일 때만 조회수 증가
- 조회수 증가 실패해도 상품 조회는 정상 처리
- 모든 관련 정보 포함 (판매자, 판매사, 카테고리, 이미지)

---

#### `getMyProducts(memberId, tenantMemberId, options)`
**역할**: 내 상품 목록 조회 (판매자용)

**파라미터**:
```javascript
memberId = 123;
tenantMemberId = 10;

options = {
  page: 1,
  limit: 20,
  status: 'active'  // 선택: 상태 필터
}
```

**반환값**:
```javascript
{
  products: [...],
  total: 50,
  page: 1,
  totalPages: 3
}
```

**사용 예시**:
```javascript
// 내 전체 상품 조회
const result = await productService.getMyProducts(123, 10, {
  page: 1,
  limit: 20
});

console.log(`전체 ${result.total}개 상품`);

// 판매 중인 상품만 조회
const activeResult = await productService.getMyProducts(123, 10, {
  status: 'active',
  page: 1,
  limit: 20
});
```

**권한 확인**:
```javascript
// 1. TenantMember 존재 확인
const tenantMember = await tenantMemberRepository.findById(tenantMemberId);

// 2. 본인 확인
if (Number(tenantMember.member_id) !== memberId) {
  throw new ForbiddenError('You can only view your own products');
}
```

**특징**:
- 본인의 상품만 조회 가능
- 모든 상태의 상품 조회 (active, sold_out, inactive)
- 페이징 지원
- 최신순 정렬

---

#### `getAllProducts(options)`
**역할**: 전체 상품 목록 조회 (Public, 필터링/정렬/페이징)

**파라미터**:
```javascript
options = {
  // 페이징
  page: 1,
  limit: 20,

  // 필터링
  status: 'active',       // 상태 (기본값: active)
  categoryId: 12,         // 카테고리
  tenantId: 1,            // 판매사
  minPrice: 10000,        // 최소 가격
  maxPrice: 50000,        // 최대 가격
  search: '도자기',        // 검색어

  // 정렬
  sortBy: 'price',        // 정렬 기준 (price/created_at/view_count)
  sortOrder: 'asc'        // 정렬 방향 (asc/desc)
}
```

**반환값**:
```javascript
{
  products: [...],
  total: 150,
  page: 1,
  totalPages: 8
}
```

**사용 예시**:

**예시 1: 기본 조회 (활성 상품만)**
```javascript
const result = await productService.getAllProducts({
  page: 1,
  limit: 20
});
// 기본적으로 active 상품만 조회
```

**예시 2: 카테고리 필터**
```javascript
const result = await productService.getAllProducts({
  categoryId: 12,  // "찻잔" 카테고리
  page: 1,
  limit: 20
});
```

**예시 3: 가격 범위 필터**
```javascript
const result = await productService.getAllProducts({
  minPrice: 10000,
  maxPrice: 50000,
  sortBy: 'price',
  sortOrder: 'asc'  // 낮은 가격순
});
```

**예시 4: 검색**
```javascript
const result = await productService.getAllProducts({
  search: '도자기',  // 상품명 또는 설명에 포함
  page: 1,
  limit: 20
});
```

**예시 5: 인기 상품 (조회수 높은 순)**
```javascript
const result = await productService.getAllProducts({
  sortBy: 'view_count',
  sortOrder: 'desc',
  limit: 10
});
```

**특징**:
- 누구나 조회 가능 (Public API)
- 기본적으로 활성 상품만
- 다양한 필터링 및 정렬 옵션
- 페이징 지원

---

#### `getProductsByCategory(categoryId, options)`
**역할**: 카테고리별 상품 목록 조회 (Public)

**파라미터**:
```javascript
categoryId = 12;

options = {
  page: 1,
  limit: 20
}
```

**반환값**:
```javascript
{
  products: [...],
  total: 30,
  page: 1,
  totalPages: 2
}
```

**사용 예시**:
```javascript
// "찻잔" 카테고리의 상품 조회
const result = await productService.getProductsByCategory(12, {
  page: 1,
  limit: 20
});

result.products.forEach(product => {
  console.log(product.product_name);
  console.log(product.tenant_member.tenant.tenant_name);
});
```

**특징**:
- 카테고리 존재 확인
- 활성 상품만 조회
- 판매자, 판매사 정보 포함

---

### 3. 상품 수정 (본인만 가능)

#### `updateProduct(productId, memberId, updateData)`
**역할**: 상품 정보 수정 (본인만 가능)

**파라미터**:
```javascript
productId = 100;
memberId = 123;

updateData = {
  product_name: "수제 찻잔 (대)",        // 선택
  product_description: "새로운 설명",    // 선택
  product_price: 30000,                // 선택
  product_quantity: 5,                 // 선택
  category_id: 13                      // 선택
}
```

**반환값**:
- 수정된 상품 정보

**사용 예시**:
```javascript
// 가격과 재고 수정
const updated = await productService.updateProduct(100, 123, {
  product_price: 30000,
  product_quantity: 5
});

// 카테고리 변경
const updated = await productService.updateProduct(100, 123, {
  category_id: 13
});
```

**권한 확인**:
```javascript
// 1. 상품 존재 확인
const product = await productRepository.findById(productId);

// 2. 본인 확인 (상품의 판매자 == 요청자)
const tenantMember = product.tenant_member;
if (Number(tenantMember.member_id) !== memberId) {
  throw new ForbiddenError('You can only update your own products');
}

// 3. 카테고리 변경 시 유효성 확인
if (updateData.category_id) {
  const category = await categoryRepository.findById(updateData.category_id);
  if (!category || !category.category_is_active) {
    throw new ValidationError('Invalid or inactive category');
  }
}
```

**특징**:
- 본인만 수정 가능
- 부분 업데이트 지원
- 가격/재고 음수 방지
- 카테고리 변경 시 유효성 확인

---

#### `updateProductStatus(productId, memberId, status)`
**역할**: 상품 상태 변경 (본인만 가능)

**파라미터**:
```javascript
productId = 100;
memberId = 123;
status = 'active';  // 'active' / 'sold_out' / 'inactive'
```

**반환값**:
- 수정된 상품 정보

**사용 예시**:
```javascript
// 상품 활성화 (판매 시작)
await productService.updateProductStatus(100, 123, 'active');

// 상품 품절 처리
await productService.updateProductStatus(100, 123, 'sold_out');

// 상품 비활성화 (판매 중지)
await productService.updateProductStatus(100, 123, 'inactive');
```

**상태 값 검증**:
```javascript
const validStatuses = ['active', 'sold_out', 'inactive'];
if (!validStatuses.includes(status)) {
  throw new ValidationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
}
```

**특징**:
- 본인만 변경 가능
- 유효한 상태 값만 허용
- `updateProduct()`보다 명시적

---

### 4. 상품 삭제 (본인만 가능)

#### `deleteProduct(productId, memberId)`
**역할**: 상품 삭제 (본인만 가능)

**파라미터**:
```javascript
productId = 100;
memberId = 123;
```

**반환값**:
```javascript
{
  message: "Product deleted successfully",
  deleted_product: {
    product_id: 100,
    product_name: "수제 찻잔"
  }
}
```

**사용 예시**:
```javascript
const result = await productService.deleteProduct(100, 123);

console.log(result.message);  // "Product deleted successfully"
console.log(result.deleted_product.product_name);  // "수제 찻잔"
```

**내부 동작**:
```javascript
// 1. 상품 존재 확인
const product = await productRepository.findById(productId);

// 2. 본인 확인
const tenantMember = product.tenant_member;
if (Number(tenantMember.member_id) !== memberId) {
  throw new ForbiddenError('You can only delete your own products');
}

// 3. 주문 내역 확인 (TODO: Order Repository 구현 후)
// if (orderCount > 0) {
//   throw new ValidationError('Cannot delete product with existing orders');
// }

// 4. 상품 이미지 삭제 (CASCADE)
await productImgRepository.deleteByProductId(productId);

// 5. 상품 삭제
await productRepository.deleteById(productId);
```

**특징**:
- 본인만 삭제 가능
- 상품 이미지 자동 삭제
- 주문 내역이 있으면 삭제 불가 (추후 구현)

---

### 5. 이미지 관리

#### `uploadProductImages(productId, memberId, images)`
**역할**: 상품 이미지 업로드

**파라미터**:
```javascript
productId = 100;
memberId = 123;

images = [
  { url: "https://cdn.example.com/image1.jpg", sequence: 1 },
  { url: "https://cdn.example.com/image2.jpg", sequence: 2 },
  { url: "https://cdn.example.com/image3.jpg" }  // sequence 생략 가능
]
```

**반환값**:
```javascript
{
  message: "3 images uploaded successfully",
  images: [
    { product_img_id: 10, product_img_url: "...", product_image_sequence: 1 },
    { product_img_id: 11, product_img_url: "...", product_image_sequence: 2 },
    { product_img_id: 12, product_img_url: "...", product_image_sequence: 3 }
  ]
}
```

**사용 예시**:
```javascript
// 이미지 업로드
const result = await productService.uploadProductImages(100, 123, [
  { url: "https://cdn.example.com/image1.jpg", sequence: 1 },
  { url: "https://cdn.example.com/image2.jpg", sequence: 2 }
]);

console.log(result.message);  // "2 images uploaded successfully"
console.log(result.images.length);  // 2
```

**제약 조건**:
```javascript
// 1. 이미지 개수 제한 (최대 10개)
const currentImageCount = await productImgRepository.countByProductId(productId);
const newImageCount = images.length;

if (currentImageCount + newImageCount > 10) {
  throw new ValidationError('Maximum 10 images per product');
}

// 2. URL 필수
if (!image.url || image.url.trim() === '') {
  throw new ValidationError('Image URL is required');
}
```

**특징**:
- 본인만 업로드 가능
- 최대 10개까지 제한
- sequence 자동 계산 (생략 시)
- 배치 업로드 지원

---

#### `deleteProductImage(productImgId, memberId)`
**역할**: 상품 이미지 삭제

**파라미터**:
```javascript
productImgId = 10;
memberId = 123;
```

**반환값**:
```javascript
{
  message: "Product image deleted successfully",
  deleted_image: {
    product_img_id: 10,
    product_img_url: "https://..."
  }
}
```

**사용 예시**:
```javascript
const result = await productService.deleteProductImage(10, 123);

console.log(result.message);
```

**특징**:
- 본인의 상품 이미지만 삭제 가능
- 이미지 존재 확인

---

#### `reorderProductImages(productId, memberId, updates)`
**역할**: 상품 이미지 순서 재배치

**파라미터**:
```javascript
productId = 100;
memberId = 123;

updates = [
  { imageId: 10, sequence: 3 },
  { imageId: 11, sequence: 1 },
  { imageId: 12, sequence: 2 }
]
```

**반환값**:
```javascript
{
  message: "3 images reordered successfully",
  updated_count: 3
}
```

**사용 예시**:
```javascript
// 이미지 순서 변경 (드래그 앤 드롭)
const result = await productService.reorderProductImages(100, 123, [
  { imageId: 10, sequence: 3 },
  { imageId: 11, sequence: 1 },
  { imageId: 12, sequence: 2 }
]);
```

**특징**:
- 본인의 상품만 재배치 가능
- 트랜잭션으로 처리
- 배치 업데이트 지원

---

### 6. 상품 통계

#### `getProductStats(productId)`
**역할**: 상품 통계 조회

**파라미터**:
```javascript
productId = 100;
```

**반환값**:
```javascript
{
  product_id: 100,
  product_name: "수제 찻잔",
  product_status: "active",
  product_view_count: 150,
  product_quantity: 10,
  image_count: 3,
  order_count: 5,
  tenant: {
    tenant_id: 1,
    tenant_name: "홍길동 공방"
  },
  seller: {
    member_id: 123,
    member_name: "홍길동"
  }
}
```

**사용 예시**:
```javascript
const stats = await productService.getProductStats(100);

console.log(`${stats.product_name}: 조회수 ${stats.product_view_count}, 주문 ${stats.order_count}건`);
```

**특징**:
- 상품 기본 정보
- 이미지 개수
- 주문 개수 (추후 구현)
- 판매사 및 판매자 정보

---

## 🔄 실제 사용 흐름

### 시나리오 1: 상품 등록 (판매자)

```javascript
// Controller
async function createProduct(req, res, next) {
  try {
    const memberId = req.user.member_id;
    const data = req.body;

    // Service 호출
    const product = await productService.createProduct(memberId, data);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    next(error);
  }
}

// Service
async function createProduct(memberId, data) {
  // 1. 필수 필드 확인
  // 2. TenantMember 존재 및 본인 확인
  // 3. 승인 상태 확인
  // 4. 카테고리 유효성 확인
  // 5. 가격/재고 검증
  // 6. 상품 생성 (inactive)
  // 7. BigInt 변환 및 반환
}
```

---

### 시나리오 2: 상품 목록 조회 (Public)

```javascript
// Controller
async function getProducts(req, res, next) {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      categoryId: req.query.categoryId,
      minPrice: req.query.minPrice,
      maxPrice: req.query.maxPrice,
      search: req.query.search,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder
    };

    // Service 호출
    const result = await productService.getAllProducts(options);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

// Service
async function getAllProducts(options) {
  // 1. Repository 호출 (필터링, 정렬, 페이징)
  // 2. BigInt 변환
  // 3. 결과 반환
}
```

---

### 시나리오 3: 상품 수정 (본인)

```javascript
// Controller
async function updateProduct(req, res, next) {
  try {
    const productId = parseInt(req.params.id);
    const memberId = req.user.member_id;
    const updateData = req.body;

    // Service 호출
    const updated = await productService.updateProduct(productId, memberId, updateData);

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: updated
    });
  } catch (error) {
    next(error);
  }
}

// Service
async function updateProduct(productId, memberId, updateData) {
  // 1. 상품 존재 확인
  // 2. 본인 확인
  // 3. 수정 가능한 필드 추출
  // 4. 필드별 검증
  // 5. 카테고리 변경 시 유효성 확인
  // 6. 상품 수정
  // 7. BigInt 변환 및 반환
}
```

---

### 시나리오 4: 이미지 업로드 후 상품 활성화

```javascript
// 1. 상품 등록 (inactive)
const product = await productService.createProduct(memberId, {
  tenant_member_id: 10,
  category_id: 12,
  product_name: "수제 찻잔",
  product_price: 25000,
  product_quantity: 10
});
// product_status: 'inactive'

// 2. 이미지 업로드
await productService.uploadProductImages(product.product_id, memberId, [
  { url: "https://cdn.example.com/image1.jpg", sequence: 1 },
  { url: "https://cdn.example.com/image2.jpg", sequence: 2 }
]);

// 3. 상품 활성화 (판매 시작)
await productService.updateProductStatus(product.product_id, memberId, 'active');
// product_status: 'active'
```

---

## 📊 데이터 흐름도

```
Controller
    ↓ (HTTP 요청)
Service ← Step 2-10 (여기!)
    ↓ (Repository 조합)
Repository (Product, ProductImg, Category, TenantMember)
    ↓ (Prisma 쿼리)
Database
```

### 예시: POST /products (상품 등록)

```
1. productController.create
   - req.body에서 데이터 추출
   - req.user.member_id로 회원 식별
   - productService.createProduct() 호출
       ↓
2. productService.createProduct
   - 필수 필드 검증
   - tenantMemberRepository.findById() - TenantMember 확인
   - 본인 및 승인 상태 확인
   - categoryRepository.findById() - 카테고리 확인
   - productRepository.create() 호출
       ↓
3. productRepository.create
   - prisma.product.create() 실행
       ↓
4. Database
   - product 테이블에 레코드 추가
   - product_status: 'inactive'
```

---

## ⚠️ 주의사항

### 1. TenantMember 권한 확인 순서

```javascript
// 권한 확인 순서:
// 1. 존재 확인 → 2. 본인 확인 → 3. 승인 상태 확인 → 4. 로직 실행

// ✅ 올바른 순서
const tenantMember = await tenantMemberRepository.findById(tenant_member_id);
if (!tenantMember) {
  throw new NotFoundError('Tenant member not found');
}

if (Number(tenantMember.member_id) !== memberId) {
  throw new ForbiddenError('Not your tenant membership');
}

if (tenantMember.tenant_member_approval_status !== 'approved') {
  throw new ForbiddenError('Only approved members can create products');
}

// 로직 실행
```

### 2. 상품 등록 흐름

```javascript
// ✅ 권장 흐름
// 1. 상품 등록 (inactive)
const product = await productService.createProduct(memberId, {
  ...data,
  // product_status는 자동으로 'inactive'
});

// 2. 이미지 업로드
await productService.uploadProductImages(product.product_id, memberId, images);

// 3. 상품 활성화
await productService.updateProductStatus(product.product_id, memberId, 'active');

// ❌ 잘못된 흐름
// 바로 active 상태로 등록 (이미지 없는 상품이 공개됨)
```

### 3. 본인 확인

```javascript
// ❌ 타인의 상품 수정 시도
const product = await productRepository.findById(100);
// product.tenant_member.member_id === 123 (홍길동)

await productService.updateProduct(100, 456, { ... });  // 김철수가 시도
// Error: You can only update your own products

// ✅ 본인 확인
if (Number(product.tenant_member.member_id) !== memberId) {
  throw new ForbiddenError('You can only update your own products');
}
```

### 4. 이미지 개수 제한

```javascript
// ❌ 10개 초과 업로드 시도
const currentImageCount = await productImgRepository.countByProductId(productId);
// currentImageCount === 8

await productService.uploadProductImages(productId, memberId, [
  { url: "..." },
  { url: "..." },
  { url: "..." }  // 8 + 3 = 11개
]);
// Error: Maximum 10 images per product

// ✅ 개수 확인
if (currentImageCount + newImageCount > 10) {
  throw new ValidationError('Maximum 10 images per product');
}
```

### 5. 비활성 카테고리

```javascript
// ❌ 비활성 카테고리에 상품 등록 시도
const category = await categoryRepository.findById(categoryId);
// category.category_is_active === false

await productService.createProduct(memberId, {
  category_id: categoryId,
  ...
});
// Error: Cannot create product in inactive category

// ✅ 카테고리 활성 상태 확인
if (!category.category_is_active) {
  throw new ValidationError('Cannot create product in inactive category');
}
```

### 6. BigInt 변환

```javascript
// Service에서 Number로 변환하여 반환
return {
  ...product,
  product_id: Number(product.product_id),
  tenant_member_id: Number(product.tenant_member_id),
  category_id: Number(product.category_id)
};

// Controller에서 그대로 JSON 응답 가능
res.json({
  data: product  // 이미 Number로 변환됨
});
```

---

## 🧪 테스트 시나리오

### 1. 상품 등록 테스트

```javascript
describe('Product Service - createProduct', () => {
  it('should create product as approved tenant member', async () => {
    // Given: 승인된 TenantMember
    const memberId = 123;
    const data = {
      tenant_member_id: 10,
      category_id: 12,
      product_name: "수제 찻잔",
      product_price: 25000,
      product_quantity: 10
    };

    // When
    const product = await productService.createProduct(memberId, data);

    // Then
    expect(product.product_name).toBe("수제 찻잔");
    expect(product.product_status).toBe('inactive');
    expect(product.product_view_count).toBe(0);
  });

  it('should throw error if tenant member not approved', async () => {
    // Given: 미승인 TenantMember
    const memberId = 123;
    const data = {
      tenant_member_id: 20,  // tenant_member_approval_status: 'pending'
      category_id: 12,
      product_name: "수제 찻잔",
      product_price: 25000
    };

    // When & Then
    await expect(
      productService.createProduct(memberId, data)
    ).rejects.toThrow('Only approved tenant members can create products');
  });

  it('should throw error if not own tenant membership', async () => {
    // Given: 타인의 TenantMember ID
    const memberId = 456;  // 김철수
    const data = {
      tenant_member_id: 10,  // 홍길동의 TenantMember
      category_id: 12,
      product_name: "수제 찻잔",
      product_price: 25000
    };

    // When & Then
    await expect(
      productService.createProduct(memberId, data)
    ).rejects.toThrow('You can only create products for your own membership');
  });

  it('should throw error if category is inactive', async () => {
    // Given: 비활성 카테고리
    const memberId = 123;
    const data = {
      tenant_member_id: 10,
      category_id: 99,  // category_is_active: false
      product_name: "수제 찻잔",
      product_price: 25000
    };

    // When & Then
    await expect(
      productService.createProduct(memberId, data)
    ).rejects.toThrow('Cannot create product in inactive category');
  });

  it('should throw error if price is negative', async () => {
    // Given
    const memberId = 123;
    const data = {
      tenant_member_id: 10,
      category_id: 12,
      product_name: "수제 찻잔",
      product_price: -1000  // 음수
    };

    // When & Then
    await expect(
      productService.createProduct(memberId, data)
    ).rejects.toThrow('Product price must be non-negative');
  });
});
```

### 2. 상품 수정 테스트

```javascript
describe('Product Service - updateProduct', () => {
  it('should update product as owner', async () => {
    // Given: 본인의 상품
    const productId = 100;
    const memberId = 123;
    const updateData = {
      product_price: 30000,
      product_quantity: 5
    };

    // When
    const updated = await productService.updateProduct(productId, memberId, updateData);

    // Then
    expect(updated.product_price).toBe(30000);
    expect(updated.product_quantity).toBe(5);
  });

  it('should reject update by non-owner', async () => {
    // Given: 타인의 상품
    const productId = 100;  // 홍길동의 상품
    const memberId = 456;   // 김철수가 시도

    // When & Then
    await expect(
      productService.updateProduct(productId, memberId, { product_price: 30000 })
    ).rejects.toThrow('You can only update your own products');
  });

  it('should throw error if no fields to update', async () => {
    // Given
    const productId = 100;
    const memberId = 123;
    const updateData = {};  // 수정할 필드 없음

    // When & Then
    await expect(
      productService.updateProduct(productId, memberId, updateData)
    ).rejects.toThrow('No fields to update');
  });
});
```

### 3. 이미지 업로드 테스트

```javascript
describe('Product Service - uploadProductImages', () => {
  it('should upload images successfully', async () => {
    // Given
    const productId = 100;
    const memberId = 123;
    const images = [
      { url: "https://cdn.example.com/image1.jpg", sequence: 1 },
      { url: "https://cdn.example.com/image2.jpg", sequence: 2 }
    ];

    // When
    const result = await productService.uploadProductImages(productId, memberId, images);

    // Then
    expect(result.message).toBe("2 images uploaded successfully");
    expect(result.images).toHaveLength(2);
  });

  it('should throw error if exceeds maximum images', async () => {
    // Given: 이미 10개의 이미지가 있음
    const productId = 100;
    const memberId = 123;
    const images = [{ url: "https://cdn.example.com/image11.jpg" }];

    // When & Then
    await expect(
      productService.uploadProductImages(productId, memberId, images)
    ).rejects.toThrow('Maximum 10 images per product');
  });

  it('should reject upload by non-owner', async () => {
    // Given: 타인의 상품
    const productId = 100;
    const memberId = 456;
    const images = [{ url: "https://cdn.example.com/image.jpg" }];

    // When & Then
    await expect(
      productService.uploadProductImages(productId, memberId, images)
    ).rejects.toThrow('You can only upload images to your own products');
  });
});
```

### 4. 상품 삭제 테스트

```javascript
describe('Product Service - deleteProduct', () => {
  it('should delete product as owner', async () => {
    // Given: 본인의 상품
    const productId = 100;
    const memberId = 123;

    // When
    const result = await productService.deleteProduct(productId, memberId);

    // Then
    expect(result.message).toBe('Product deleted successfully');
    expect(result.deleted_product.product_id).toBe(100);
  });

  it('should reject delete by non-owner', async () => {
    // Given: 타인의 상품
    const productId = 100;
    const memberId = 456;

    // When & Then
    await expect(
      productService.deleteProduct(productId, memberId)
    ).rejects.toThrow('You can only delete your own products');
  });
});
```

---

## 🔗 다음 단계

### Step 2-11: Tenant Controller
다음 단계에서는 Controller 레이어를 구현합니다:

- `src/controllers/tenant.controller.js`
- HTTP 요청/응답 처리
- 미들웨어 연동
- 에러 처리

---

## 📚 참고 자료

### Prisma 공식 문서
- [Prisma Relations](https://www.prisma.io/docs/concepts/components/prisma-client/relation-queries)
- [Prisma Transactions](https://www.prisma.io/docs/concepts/components/prisma-client/transactions)

### 관련 가이드
- [04. API 개발 가이드](../common/04_API_DEVELOPMENT.md)
- [02. 코딩 표준](../common/02_CODING_STANDARDS.md)

### 이전 단계
- [Step 2-9: Category Service](./2-9_category_service.md)
- [Step 2-5: Product Repository](./2-5_product_repository.md)
- [Step 2-6: ProductImg Repository](./2-6_productImg_repository.md)

---

**작성일**: 2025년 10월 13일
**작성자**: Backend Team
**상태**: ✅ 완료
