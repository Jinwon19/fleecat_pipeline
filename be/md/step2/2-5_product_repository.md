# Step 2-5: Product Repository 생성

> **Phase 2: 판매자 기능 구축**
> **작성일**: 2025년 10월 13일
> **상태**: ✅ 완료

---

## 📋 작업 개요

### 목적
product 테이블에 대한 데이터 접근 계층(Repository)을 구현하여 멀티테넌시 환경에서 상품 데이터를 안전하게 관리합니다.

### 작업 내용
- `src/repositories/product.repository.js` 파일 생성
- Prisma를 사용한 상품 CRUD 구현
- 멀티테넌시 로직 (tenant_member_id 기반)
- 필터링, 정렬, 페이징 지원

---

## 🎯 Product Repository의 핵심 개념

### 1. 멀티테넌시와 상품의 관계

```
Member (회원)
  ↓ N:N
TenantMember (판매사 구성원)
  ↓ 1:N
Product (상품)
```

**중요**: 상품은 Tenant(판매사)가 아닌 **TenantMember(판매자)**에 속합니다!

**예시**:
```javascript
// 홍길동은 "A공방"과 "B공방" 모두에 소속
Member: { member_id: 1, member_name: "홍길동" }

TenantMember: [
  { tenant_member_id: 10, tenant_id: 1, member_id: 1 }, // A공방
  { tenant_member_id: 20, tenant_id: 2, member_id: 1 }  // B공방
]

// 상품은 TenantMember에 속함
Product: [
  { product_id: 100, tenant_member_id: 10, product_name: "A공방 도자기" },
  { product_id: 200, tenant_member_id: 20, product_name: "B공방 목공예" }
]
```

**왜 Tenant가 아닌 TenantMember인가?**
- 같은 판매사 내에서도 판매자별로 상품 구분 필요
- 판매 수익 정산을 판매자별로 처리
- 판매자별 상품 관리 권한 분리

---

### 2. 상품 상태 관리

```javascript
product_status: 'active'    // 판매 중
product_status: 'sold_out'  // 품절
product_status: 'inactive'  // 판매 중지 (비공개)
```

**상태별 의미**:
- `active`: 공개되어 구매 가능한 상품
- `sold_out`: 품절 상태 (재고 0)
- `inactive`: 판매자가 임시 중지한 상품 (비공개)

---

### 3. 상품 조회 시 포함되는 정보

```javascript
{
  product_id: 100,
  product_name: "수제 찻잔",
  product_price: 25000,
  product_quantity: 10,
  product_status: "active",
  product_view_count: 150,

  // 판매자 정보
  tenant_member: {
    tenant_member_id: 10,
    tenant: {
      tenant_id: 1,
      tenant_name: "홍길동 공방"
    },
    member: {
      member_id: 1,
      member_name: "홍길동",
      member_nickname: "도자기장인"
    }
  },

  // 카테고리 정보
  category: {
    category_id: 12,
    category_name: "찻잔",
    category_path: "/1/5/12"
  },

  // 상품 이미지
  product_images: [
    { product_img_url: "https://...", product_image_sequence: 1 },
    { product_img_url: "https://...", product_image_sequence: 2 }
  ]
}
```

---

## 📁 파일 위치

```
src/
└── repositories/
    └── product.repository.js  ← 생성한 파일
```

---

## 💻 구현 코드

### 전체 구조

```javascript
const prisma = require('../config/database');

// 13개의 함수 제공:
// - 조회: findById, findByTenantMemberId, findByCategoryId, findAll
// - 생성: create
// - 수정: update, updateStatus
// - 삭제: deleteById
// - 기타: incrementViewCount, existsById, countByTenantMemberId, countByCategoryId
```

---

## 🔧 함수 설명

### 1. 조회 함수 (Read)

#### `findById(productId)`
**역할**: 상품 상세 조회 (판매자, 판매사, 카테고리, 이미지 포함)

**파라미터**:
- `productId` (number): 상품 ID

**반환값**:
- 상품 정보 객체 (모든 관련 정보 포함)

**사용 예시**:
```javascript
const product = await productRepository.findById(100);

console.log(product.product_name);  // "수제 찻잔"
console.log(product.tenant_member.tenant.tenant_name);  // "홍길동 공방"
console.log(product.category.category_name);  // "찻잔"
console.log(product.product_images.length);  // 3 (이미지 개수)
```

**특징**:
- 판매자 정보 (tenant_member, tenant, member) 포함
- 카테고리 정보 포함
- 상품 이미지 목록 포함 (sequence 순서)

**내부 동작**:
```javascript
return await prisma.product.findUnique({
  where: { product_id: BigInt(productId) },
  include: {
    tenant_member: {
      include: {
        tenant: true,
        member: {
          select: {
            member_id: true,
            member_name: true,
            member_nickname: true,
            member_email: true
          }
        }
      }
    },
    category: true,
    product_images: {
      orderBy: {
        product_image_sequence: 'asc'
      }
    }
  }
});
```

---

#### `findByTenantMemberId(tenantMemberId, options)`
**역할**: 특정 판매자의 상품 목록 조회 (내 상품 관리용)

**파라미터**:
```javascript
tenantMemberId = 10;

options = {
  page: 1,           // 페이지 번호
  limit: 20,         // 페이지당 항목 수
  status: 'active'   // 상태 필터 (선택)
}
```

**반환값**:
```javascript
{
  products: [...],   // 상품 목록
  total: 50,         // 전체 상품 수
  page: 1,           // 현재 페이지
  totalPages: 3      // 전체 페이지 수
}
```

**사용 예시**:
```javascript
// 내가 등록한 활성 상품 조회
const result = await productRepository.findByTenantMemberId(10, {
  status: 'active',
  page: 1,
  limit: 10
});

console.log(`전체 ${result.total}개 중 ${result.products.length}개 조회`);

// 모든 상태의 상품 조회 (관리용)
const allProducts = await productRepository.findByTenantMemberId(10, {
  page: 1,
  limit: 20
});
```

**특징**:
- 판매자별 상품 필터링 (멀티테넌시)
- 페이징 지원
- 상태별 필터링 (선택)
- 최신순 정렬 (product_created_at DESC)

---

#### `findByCategoryId(categoryId, options)`
**역할**: 카테고리별 상품 목록 조회 (공개용)

**파라미터**:
```javascript
categoryId = 12;  // "찻잔" 카테고리

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
const result = await productRepository.findByCategoryId(12, {
  page: 1,
  limit: 20
});

result.products.forEach(product => {
  console.log(product.product_name);
  console.log(product.tenant_member.tenant.tenant_name);  // 판매사명
});
```

**특징**:
- 활성 상품만 조회 (product_status: 'active')
- 판매자, 판매사 정보 포함
- 페이징 지원

---

#### `findAll(options)`
**역할**: 전체 상품 목록 조회 (필터링, 정렬, 페이징 지원)

**파라미터**:
```javascript
options = {
  // 페이징
  page: 1,
  limit: 20,

  // 필터링
  status: 'active',       // 상태 (active/sold_out/inactive)
  categoryId: 5,          // 카테고리
  tenantId: 1,            // 판매사
  minPrice: 10000,        // 최소 가격
  maxPrice: 50000,        // 최대 가격
  search: '도자기',        // 검색어 (상품명, 설명)

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
const result = await productRepository.findAll({
  page: 1,
  limit: 20
});
// 기본적으로 active 상품만 조회됨
```

**예시 2: 카테고리 필터**
```javascript
const result = await productRepository.findAll({
  categoryId: 5,  // "도자기" 카테고리
  page: 1,
  limit: 20
});
```

**예시 3: 가격 범위 필터**
```javascript
const result = await productRepository.findAll({
  minPrice: 10000,
  maxPrice: 50000,
  sortBy: 'price',
  sortOrder: 'asc'  // 낮은 가격순
});
```

**예시 4: 검색**
```javascript
const result = await productRepository.findAll({
  search: '도자기',  // 상품명 또는 설명에 '도자기' 포함
  page: 1,
  limit: 20
});
```

**예시 5: 판매사별 상품**
```javascript
const result = await productRepository.findAll({
  tenantId: 1,  // "홍길동 공방"의 모든 상품
  page: 1,
  limit: 20
});
```

**예시 6: 인기 상품 (조회수 높은 순)**
```javascript
const result = await productRepository.findAll({
  sortBy: 'view_count',
  sortOrder: 'desc',
  limit: 10  // TOP 10
});
```

**특징**:
- 다양한 필터링 옵션 조합 가능
- 정렬 옵션 지원
- 기본적으로 활성 상품만 조회 (공개용)
- 대소문자 구분 없는 검색 (insensitive)

---

### 2. 생성 함수 (Create)

#### `create(productData)`
**역할**: 새 상품 등록

**파라미터**:
```javascript
productData = {
  tenant_member_id: 10,              // 필수: 판매자 ID
  category_id: 12,                   // 필수: 카테고리 ID
  product_name: "수제 찻잔",          // 필수: 상품명
  product_description: "전통 방식...", // 선택: 상품 설명
  product_price: 25000,              // 필수: 가격
  product_quantity: 10,              // 선택: 재고 (기본값: 0)
  product_status: 'inactive'         // 선택: 상태 (기본값: 'inactive')
}
```

**반환값**:
- 생성된 상품 정보 (판매자, 판매사, 카테고리 포함)

**사용 예시**:
```javascript
// 상품 등록 (비활성 상태로)
const product = await productRepository.create({
  tenant_member_id: 10,
  category_id: 12,
  product_name: "수제 찻잔",
  product_description: "전통 방식으로 제작한 찻잔입니다.",
  product_price: 25000,
  product_quantity: 10,
  product_status: 'inactive'  // 이미지 업로드 후 활성화
});

console.log(`상품 등록 완료: ID ${product.product_id}`);
```

**특징**:
- 기본 상태는 `inactive` (비공개)
- 이미지 업로드 후 `active`로 변경하는 것을 권장
- `product_view_count`는 0으로 자동 설정

---

### 3. 수정 함수 (Update)

#### `update(productId, updateData)`
**역할**: 상품 정보 수정

**파라미터**:
```javascript
productId = 100;

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
const updated = await productRepository.update(100, {
  product_price: 30000,
  product_quantity: 5
});

console.log(updated.product_price);  // 30000
```

**특징**:
- 제공된 필드만 수정 (부분 업데이트)
- `product_updated_at` 자동 갱신

---

#### `updateStatus(productId, status)`
**역할**: 상품 상태 변경 (판매 중지/재개)

**파라미터**:
- `productId` (number): 상품 ID
- `status` (string): 상태 (`active` / `sold_out` / `inactive`)

**반환값**:
- 수정된 상품 정보

**사용 예시**:
```javascript
// 상품 활성화 (판매 시작)
await productRepository.updateStatus(100, 'active');

// 상품 품절 처리
await productRepository.updateStatus(100, 'sold_out');

// 상품 비활성화 (판매 중지)
await productRepository.updateStatus(100, 'inactive');
```

**특징**:
- 상태만 변경하는 전용 함수
- `update()`보다 명시적

---

### 4. 삭제 함수 (Delete)

#### `deleteById(productId)`
**역할**: 상품 삭제 (Hard Delete)

**파라미터**:
- `productId` (number): 상품 ID

**반환값**:
- 삭제된 상품 정보

**사용 예시**:
```javascript
// 삭제 전 확인
const product = await productRepository.findById(100);

if (product.shopping_carts.length > 0) {
  throw new Error('장바구니에 담긴 상품은 삭제할 수 없습니다');
}

// 삭제 실행
await productRepository.deleteById(100);
```

**주의사항**:
- Hard Delete (실제 삭제)
- 주문에 포함된 상품은 삭제 불가 (FK 제약)
- 장바구니에 담긴 상품 확인 필요
- Service 레이어에서 사전 확인 권장

---

### 5. 기타 함수

#### `incrementViewCount(productId)`
**역할**: 상품 조회수 증가

**파라미터**:
- `productId` (number): 상품 ID

**반환값**:
- 수정된 상품 정보

**사용 예시**:
```javascript
// 상품 상세 조회 시 조회수 증가
const product = await productRepository.findById(100);
await productRepository.incrementViewCount(100);

console.log(product.product_view_count);  // 150 → 151
```

**특징**:
- 원자적 연산 (Atomic operation)
- 동시성 문제 없음

---

#### `existsById(productId)`
**역할**: 상품 존재 확인

**파라미터**:
- `productId` (number): 상품 ID

**반환값**:
- `true`: 상품 존재
- `false`: 상품 없음

**사용 예시**:
```javascript
if (!await productRepository.existsById(100)) {
  throw new NotFoundError('Product not found');
}
```

---

#### `countByTenantMemberId(tenantMemberId, status)`
**역할**: 판매자의 상품 개수 조회

**파라미터**:
- `tenantMemberId` (number): 판매자 ID
- `status` (string, 선택): 상태 필터

**반환값**:
- 상품 개수 (number)

**사용 예시**:
```javascript
// 판매자의 전체 상품 개수
const total = await productRepository.countByTenantMemberId(10);
console.log(`전체 상품: ${total}개`);

// 판매 중인 상품 개수
const active = await productRepository.countByTenantMemberId(10, 'active');
console.log(`판매 중: ${active}개`);
```

---

#### `countByCategoryId(categoryId, status)`
**역할**: 카테고리별 상품 개수 조회

**파라미터**:
- `categoryId` (number): 카테고리 ID
- `status` (string, 기본값: 'active'): 상태 필터

**반환값**:
- 상품 개수 (number)

**사용 예시**:
```javascript
// "찻잔" 카테고리의 활성 상품 개수
const count = await productRepository.countByCategoryId(12);
console.log(`활성 상품: ${count}개`);
```

---

## 🔄 실제 사용 흐름

### 상품 등록 시나리오 (productService.js)

```javascript
async function createProduct(memberId, data) {
  // 1. 판매자 확인 (TenantMember)
  const tenantMember = await tenantMemberRepository.findById(data.tenant_member_id);

  if (!tenantMember) {
    throw new NotFoundError('Tenant member not found');
  }

  // 2. 본인 확인
  if (tenantMember.member_id !== BigInt(memberId)) {
    throw new ForbiddenError('Not your tenant membership');
  }

  // 3. 승인 상태 확인
  if (tenantMember.tenant_member_approval_status !== 'approved') {
    throw new ForbiddenError('Tenant member not approved');
  }

  // 4. 카테고리 존재 확인
  const category = await categoryRepository.findById(data.category_id);

  if (!category) {
    throw new NotFoundError('Category not found');
  }

  // 5. 상품 생성 (비활성 상태)
  const product = await productRepository.create({
    tenant_member_id: data.tenant_member_id,
    category_id: data.category_id,
    product_name: data.product_name,
    product_description: data.product_description,
    product_price: data.product_price,
    product_quantity: data.product_quantity || 0,
    product_status: 'inactive'  // 이미지 업로드 후 활성화
  });

  return product;
}
```

---

### 상품 목록 조회 시나리오 (프론트엔드)

```javascript
// 카테고리별 상품 목록 (가격 낮은 순)
async function getProductsByCategory(categoryId, page = 1) {
  const result = await productRepository.findAll({
    categoryId,
    status: 'active',
    sortBy: 'price',
    sortOrder: 'asc',
    page,
    limit: 20
  });

  return result;
}

// 검색 결과
async function searchProducts(keyword, page = 1) {
  const result = await productRepository.findAll({
    search: keyword,
    status: 'active',
    page,
    limit: 20
  });

  return result;
}

// 인기 상품 (조회수 높은 순)
async function getPopularProducts() {
  const result = await productRepository.findAll({
    sortBy: 'view_count',
    sortOrder: 'desc',
    limit: 10
  });

  return result;
}
```

---

### 상품 상세 조회 시나리오

```javascript
async function getProductDetail(productId) {
  // 1. 상품 조회
  const product = await productRepository.findById(productId);

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  // 2. 조회수 증가 (비동기, 에러 무시)
  productRepository.incrementViewCount(productId).catch(() => {
    // 조회수 증가 실패해도 상품은 조회 가능
  });

  // 3. 상품 정보 반환
  return product;
}
```

---

### 내 상품 관리 시나리오 (판매자)

```javascript
async function getMyProducts(memberId, tenantMemberId, options) {
  // 1. TenantMember 확인
  const tenantMember = await tenantMemberRepository.findById(tenantMemberId);

  if (!tenantMember || tenantMember.member_id !== BigInt(memberId)) {
    throw new ForbiddenError('Not your tenant membership');
  }

  // 2. 내 상품 목록 조회
  const result = await productRepository.findByTenantMemberId(tenantMemberId, {
    page: options.page || 1,
    limit: options.limit || 10,
    status: options.status  // 모든 상태 or 특정 상태
  });

  return result;
}
```

---

## 📊 데이터 흐름도

```
Controller
    ↓ (HTTP 요청)
Service
    ↓ (비즈니스 로직)
Repository ← Step 2-5 (여기!)
    ↓ (Prisma 쿼리)
Database
```

### 예시: POST /products

```
1. productController.create
   - req.body에서 데이터 추출
   - req.user.member_id로 회원 식별
   - productService.createProduct() 호출
       ↓
2. productService.createProduct
   - TenantMember 확인 및 권한 체크
   - 카테고리 존재 확인
   - productRepository.create() 호출
       ↓
3. productRepository.create
   - prisma.product.create() 실행
   - DB에 INSERT
       ↓
4. Database
   - product 테이블에 레코드 추가
   - product_id 자동 생성 (AUTO_INCREMENT)
```

---

## ⚠️ 주의사항

### 1. 멀티테넌시 필터링

```javascript
// ✅ 올바른 사용 (tenant_member_id로 필터링)
const products = await productRepository.findByTenantMemberId(10);

// ❌ 잘못된 사용 (tenant_id로 직접 필터링 불가)
// Product는 TenantMember에 속하므로 tenant_id로 직접 필터링 불가
```

### 2. 상품 상태 관리

```javascript
// 권장 흐름:
// 1. 상품 등록 (inactive)
const product = await productRepository.create({
  ...data,
  product_status: 'inactive'
});

// 2. 이미지 업로드
await productImgRepository.create({
  product_id: product.product_id,
  product_img_url: imageUrl,
  product_image_sequence: 1
});

// 3. 상품 활성화
await productRepository.updateStatus(product.product_id, 'active');
```

### 3. 상품 삭제 시 주의

```javascript
// ❌ 바로 삭제 시도
await productRepository.deleteById(productId);
// Error: 장바구니나 주문에 포함되어 있으면 삭제 불가

// ✅ 삭제 전 확인
const product = await productRepository.findById(productId);

if (product.shopping_carts.length > 0) {
  throw new Error('장바구니에 담긴 상품은 삭제할 수 없습니다');
}

// 주문 확인은 별도로 필요 (Order 테이블에서)
```

### 4. BigInt 처리

```javascript
// ✅ Repository에서 자동 변환
const product = await productRepository.findById(100);

// ⚠️ 반환된 ID는 BigInt
console.log(typeof product.product_id);  // 'bigint'

// JSON 응답 시 Number로 변환 필요 (Controller에서 처리)
res.json({
  product_id: Number(product.product_id)
});
```

### 5. 검색 성능

```javascript
// ⚠️ 검색은 LIKE 쿼리로 느릴 수 있음
const result = await productRepository.findAll({
  search: '도자기'
});

// 개선 방안:
// - 전문 검색 엔진 사용 (Elasticsearch)
// - Full-Text Search 인덱스 생성
// - 검색 결과 캐싱
```

---

## 🧪 테스트 시나리오

### 1. 상품 생성 테스트

```javascript
describe('Product Repository - create', () => {
  it('should create a new product', async () => {
    // Given
    const data = {
      tenant_member_id: 10,
      category_id: 12,
      product_name: "수제 찻잔",
      product_price: 25000,
      product_quantity: 10
    };

    // When
    const product = await productRepository.create(data);

    // Then
    expect(product.product_name).toBe("수제 찻잔");
    expect(product.product_status).toBe('inactive');  // 기본값
    expect(product.product_view_count).toBe(0);
  });
});
```

### 2. 필터링 테스트

```javascript
describe('Product Repository - findAll', () => {
  it('should filter by category', async () => {
    // When
    const result = await productRepository.findAll({
      categoryId: 12,
      page: 1,
      limit: 10
    });

    // Then
    expect(result.products.every(p => p.category_id === 12n)).toBe(true);
  });

  it('should filter by price range', async () => {
    // When
    const result = await productRepository.findAll({
      minPrice: 10000,
      maxPrice: 50000
    });

    // Then
    result.products.forEach(product => {
      expect(Number(product.product_price)).toBeGreaterThanOrEqual(10000);
      expect(Number(product.product_price)).toBeLessThanOrEqual(50000);
    });
  });
});
```

---

## 📈 성능 최적화 팁

### 1. 인덱스 활용

```prisma
model Product {
  @@index([tenant_member_id])
  @@index([category_id])
  @@index([product_status])
  @@index([product_status, product_created_at])
  @@index([product_name])
  @@index([product_price])
  @@index([product_view_count])
}
```

### 2. N+1 문제 방지

```javascript
// ❌ N+1 문제
const products = await prisma.product.findMany();
for (const product of products) {
  product.tenant_member = await prisma.tenantMember.findUnique({
    where: { tenant_member_id: product.tenant_member_id }
  });
}

// ✅ include로 한 번에 조회
const products = await prisma.product.findMany({
  include: {
    tenant_member: true
  }
});
```

### 3. 페이징 필수

```javascript
// ❌ 전체 조회 (메모리 부족 위험)
const products = await prisma.product.findMany();

// ✅ 페이징
const products = await productRepository.findAll({
  page: 1,
  limit: 20
});
```

---

## 🔗 다음 단계

### Step 2-6: ProductImg Repository
다음 단계에서는 product_img 테이블의 Repository를 만들 예정입니다:

- `src/repositories/productImg.repository.js`
- 상품 이미지 CRUD
- 이미지 순서 관리 (sequence)

---

## 📚 참고 자료

### Prisma 공식 문서
- [Prisma Relations](https://www.prisma.io/docs/concepts/components/prisma-client/relation-queries)
- [Prisma Filtering](https://www.prisma.io/docs/concepts/components/prisma-client/filtering-and-sorting)

### 관련 가이드
- [03. 데이터베이스 가이드](../common/03_DATABASE_GUIDE.md)
- [db_03_RELATIONSHIPS.md](../common/db_03_RELATIONSHIPS.md)

### 이전 단계
- [Step 2-4: Category Repository](./2-4_category_repository.md)

---

**작성일**: 2025년 10월 13일
**작성자**: Backend Team
**상태**: ✅ 완료
