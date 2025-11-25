# Step 10: AdminProduct Service 생성

> **작성일**: 2025년 10월 8일
> **상태**: ✅ 완료
> **파일**: `src/services/admin/adminProduct.service.js`

---

## 📚 개념 설명

### 🎯 Service Layer의 역할

Repository는 **데이터 접근만** 담당합니다. Service는 **비즈니스 로직**을 처리합니다:

**Repository (adminProduct.repository.js)**:
```javascript
// 단순 데이터 조회/수정
findAll(options)              // 조건에 맞는 상품 가져오기
updateStatus(id, status)      // DB의 status 필드 업데이트
```

**Service (adminProduct.service.js)**:
```javascript
// 비즈니스 로직 추가
getProductList(filters)       // 필터 검증 + Repository 호출 + BigInt 변환
updateProductStatus(id, status)  // 상태값 검증 + 권한 확인 + Repository 호출
deleteProduct(id)             // 삭제 가능 여부 확인 + CASCADE 처리
```

---

## 🔑 핵심 개념

### 1. 상태 검증 (Validation)

**상품 상태는 3가지만 허용**:
```javascript
const VALID_PRODUCT_STATUSES = ['active', 'sold_out', 'inactive'];

async function updateProductStatus(productId, status) {
  // 비즈니스 규칙: status 검증
  if (!VALID_PRODUCT_STATUSES.includes(status)) {
    throw new ValidationError(
      `유효하지 않은 상태입니다. 가능한 값: ${VALID_PRODUCT_STATUSES.join(', ')}`
    );
  }

  // Repository 호출
  return await productRepo.updateStatus(productId, status);
}
```

**왜 필요?**
- 잘못된 값 방지: `'actve'` (오타), `'deleted'` (존재하지 않는 상태)
- DB 무결성 보장: Prisma schema의 enum과 일치

**에러 메시지**:
```javascript
// 잘못된 상태
throw new ValidationError('유효하지 않은 상태입니다. 가능한 값: active, sold_out, inactive');

// 중복 상태
throw new ValidationError('이미 active 상태입니다');
```

---

### 2. 상품 존재 확인

```javascript
async function getProductById(productId) {
  const product = await productRepo.findByIdWithDetails(productId);

  // 비즈니스 규칙: 존재하지 않으면 에러
  if (!product) {
    throw new NotFoundError(`상품 ID ${productId}를 찾을 수 없습니다`);
  }

  return convertProductBigInt(product);
}
```

**Repository vs Service**:
- **Repository**: `null` 반환 (데이터 없음을 그대로 전달)
- **Service**: `NotFoundError` 발생 (사용자에게 명확한 에러)

**장점**:
- Controller에서 null 체크 불필요
- 일관된 에러 처리
- 명확한 HTTP 상태 코드 (404)

---

### 3. BigInt 변환 (재귀적)

**복잡한 중첩 구조**:
```javascript
{
  product_id: 1n,                  // BigInt
  tenant_member: {
    tenant_member_id: 5n,          // BigInt
    tenant: {
      tenant_id: 10n               // BigInt
    },
    member: {
      member_id: 3n                // BigInt
    }
  },
  category: {
    category_id: 7n                // BigInt
  },
  product_images: [
    { product_img_id: 20n }        // BigInt
  ]
}
```

**변환 함수 (유틸리티)**:
```javascript
function convertProductBigInt(product) {
  if (!product) return null;

  return {
    ...product,
    product_id: product.product_id.toString(),
    category_id: product.category_id?.toString(),
    tenant_member_id: product.tenant_member_id?.toString(),

    // 중첩 객체 변환
    category: product.category ? {
      ...product.category,
      category_id: product.category.category_id.toString(),
      parent_category_id: product.category.parent_category_id?.toString()
    } : null,

    tenant_member: product.tenant_member ? {
      ...product.tenant_member,
      tenant_member_id: product.tenant_member.tenant_member_id.toString(),
      tenant: product.tenant_member.tenant ? {
        ...product.tenant_member.tenant,
        tenant_id: product.tenant_member.tenant.tenant_id.toString()
      } : null,
      member: product.tenant_member.member ? {
        ...product.tenant_member.member,
        member_id: product.tenant_member.member.member_id.toString()
      } : null
    } : null,

    // 배열 변환
    product_images: product.product_images?.map(img => ({
      ...img,
      product_img_id: img.product_img_id.toString(),
      product_id: img.product_id.toString()
    }))
  };
}
```

**중요**: 모든 중첩 객체와 배열을 재귀적으로 변환해야 JSON 직렬화 에러 방지

---

### 4. 상품 삭제 규칙

**비즈니스 규칙**:
1. ✅ 주문 이력 없는 상품만 삭제 가능
2. ✅ 장바구니에 담긴 상품은 삭제 가능 (CASCADE)
3. ✅ ProductImg는 자동 CASCADE 삭제

```javascript
async function deleteProduct(productId) {
  // 1. 존재 확인
  const product = await productRepo.findByIdWithDetails(productId);
  if (!product) {
    throw new NotFoundError(`상품 ID ${productId}를 찾을 수 없습니다`);
  }

  // 2. 주문 이력 확인
  if (product._count.order_items > 0) {
    throw new ValidationError(
      `주문 이력이 ${product._count.order_items}건 있는 상품은 삭제할 수 없습니다. 비활성화 처리를 권장합니다`
    );
  }

  // 3. 삭제 (장바구니는 CASCADE, 이미지도 CASCADE)
  await prisma.product.delete({
    where: { product_id: BigInt(productId) }
  });

  return {
    product_id: productId.toString(),
    product_name: product.product_name,
    message: '상품이 삭제되었습니다'
  };
}
```

**CASCADE 관계**:
```
Product 삭제 시:
├── ProductImg (CASCADE 자동 삭제) ✅
├── ShoppingCart (CASCADE 자동 삭제) ✅
└── OrderItem (RESTRICT 삭제 불가) ❌
```

**왜 주문 이력 있으면 삭제 불가?**
- 법적 요구사항 (전자상거래법)
- 세금 신고용 이력 보존
- 분쟁 발생 시 증거 자료

**대안**:
- 비활성화 처리: `updateProductStatus(productId, 'inactive')`
- 고객에게는 보이지 않지만 이력은 유지

---

### 5. 필터 검증

**Service에서 필터 검증**:
```javascript
async function getProductList(filters) {
  const {
    page = 1,
    limit = 20,
    status,
    categoryId,
    tenantId,
    search
  } = filters;

  // 1. 페이지 검증
  if (page < 1) {
    throw new ValidationError('페이지는 1 이상이어야 합니다');
  }

  if (limit < 1 || limit > 100) {
    throw new ValidationError('limit은 1~100 사이여야 합니다');
  }

  // 2. status 검증
  if (status && !VALID_PRODUCT_STATUSES.includes(status)) {
    throw new ValidationError('유효하지 않은 상태입니다');
  }

  // 3. categoryId 검증 (양수)
  if (categoryId && categoryId < 1) {
    throw new ValidationError('카테고리 ID는 양수여야 합니다');
  }

  // 4. tenantId 검증 (양수)
  if (tenantId && tenantId < 1) {
    throw new ValidationError('판매사 ID는 양수여야 합니다');
  }

  // 5. Repository 호출
  const result = await productRepo.findAll({
    page: parseInt(page),
    limit: parseInt(limit),
    status,
    categoryId: categoryId ? parseInt(categoryId) : undefined,
    tenantId: tenantId ? parseInt(tenantId) : undefined,
    search
  });

  // 6. BigInt 변환
  return {
    ...result,
    products: result.products.map(convertProductBigInt)
  };
}
```

**검증 항목**:
- ✅ page ≥ 1
- ✅ 1 ≤ limit ≤ 100 (성능 보호)
- ✅ status는 enum 값만
- ✅ categoryId, tenantId는 양수

---

### 6. 통계 데이터 포맷팅

**Repository는 raw 데이터 반환**:
```javascript
// Repository
{
  totalProducts: 5000,
  activeProducts: 4200,
  soldOutProducts: 500,
  inactiveProducts: 300,
  categoryDistribution: {
    "5": 150,
    "3": 120
  }
}
```

**Service는 비즈니스 로직 추가 (퍼센티지 계산)**:
```javascript
async function getProductStatistics() {
  const stats = await productRepo.getStatistics();

  // 비즈니스 로직: 퍼센티지 계산
  const total = stats.totalProducts || 1; // 0으로 나누기 방지
  const activeRate = (stats.activeProducts / total * 100).toFixed(1);
  const soldOutRate = (stats.soldOutProducts / total * 100).toFixed(1);
  const inactiveRate = (stats.inactiveProducts / total * 100).toFixed(1);

  return {
    ...stats,
    activeRate: parseFloat(activeRate),      // 84.0
    soldOutRate: parseFloat(soldOutRate),    // 10.0
    inactiveRate: parseFloat(inactiveRate)   // 6.0
  };
}
```

**반환값**:
```javascript
{
  totalProducts: 5000,
  activeProducts: 4200,
  soldOutProducts: 500,
  inactiveProducts: 300,
  activeRate: 84.0,        // 추가
  soldOutRate: 10.0,       // 추가
  inactiveRate: 6.0,       // 추가
  categoryDistribution: { "5": 150, "3": 120 },
  recentProducts: 250
}
```

---

### 7. 검색어 검증

**최소 길이 제한**:
```javascript
async function searchProducts(keyword, limit = 10) {
  // 1. 키워드 검증
  if (!keyword || keyword.trim().length === 0) {
    throw new ValidationError('검색어를 입력해주세요');
  }

  if (keyword.length < 2) {
    throw new ValidationError('검색어는 2자 이상 입력해주세요');
  }

  // 2. Repository 호출 (trim 적용)
  const results = await productRepo.searchProducts(keyword.trim(), limit);

  // 3. BigInt 변환
  return results.map(convertProductBigInt);
}
```

**왜 2자 이상?**
- 성능: 1자 검색은 너무 많은 결과 반환
- 정확도: 짧은 검색어는 부정확한 결과 초래
- DB 부하 방지: `LIKE '%a%'` 같은 쿼리는 Full Table Scan

---

## 📦 구현 내용

### 파일 위치
```
src/services/admin/adminProduct.service.js
```

### 주요 함수 (8개)

#### 1. convertProductBigInt(product)
BigInt 재귀 변환 유틸리티

**파라미터**:
- `product` (Object): 상품 객체

**반환값**: BigInt가 문자열로 변환된 객체

**변환 대상**:
- `product_id`, `category_id`, `tenant_member_id`
- `category.category_id`, `category.parent_category_id`
- `tenant_member.tenant_member_id`, `tenant_member.tenant.tenant_id`
- `tenant_member.member.member_id`, `tenant_member.member.company_id`
- `product_images[].product_img_id`, `product_images[].product_id`

---

#### 2. getProductList(filters)
전체 상품 목록 조회 (페이징, 필터링)

**파라미터**:
```javascript
{
  page: 1,              // 페이지 번호
  limit: 20,            // 페이지당 개수 (1~100)
  status: 'active',     // 상태 필터 (선택)
  categoryId: 5,        // 카테고리 필터 (선택)
  tenantId: 10,         // 판매사 필터 (선택)
  search: '도자기'      // 검색어 (선택)
}
```

**반환값**:
```javascript
{
  products: [
    {
      product_id: "1",
      product_name: "수제 도자기 컵",
      product_price: 25000,
      product_status: "active",
      category: {
        category_id: "5",
        category_name: "주방용품"
      },
      tenant_member: {
        tenant: {
          tenant_id: "10",
          tenant_name: "홍길동 공방"
        }
      }
    }
  ],
  total: 500,
  page: 1,
  totalPages: 25
}
```

**비즈니스 로직**:
1. 페이지 검증 (page ≥ 1)
2. limit 검증 (1~100)
3. status 검증 (enum 값)
4. categoryId, tenantId 검증 (양수)
5. Repository 호출
6. BigInt 변환

---

#### 3. getProductById(productId)
상품 상세 조회

**파라미터**:
- `productId` (number): 상품 ID

**반환값**:
```javascript
{
  product_id: "1",
  product_name: "수제 도자기 컵",
  product_price: 25000,
  product_status: "active",
  product_stock_quantity: 50,
  product_description: "전통 방식으로 제작한...",

  category: {
    category_id: "5",
    category_name: "주방용품"
  },

  tenant_member: {
    tenant_member_id: "5",
    tenant: {
      tenant_id: "10",
      tenant_name: "홍길동 공방"
    },
    member: {
      member_id: "3",
      member_name: "홍길동",
      member_email: "seller@example.com"
    }
  },

  product_images: [
    {
      product_img_id: "20",
      product_img_url: "https://...",
      product_img_is_primary: true
    }
  ],

  _count: {
    shopping_carts: 15,
    order_items: 30
  }
}
```

**비즈니스 로직**:
1. Repository 호출
2. 존재 확인 (NotFoundError)
3. BigInt 변환

---

#### 4. updateProductStatus(productId, status)
상품 상태 변경

**파라미터**:
- `productId` (number): 상품 ID
- `status` (string): 변경할 상태 (`active`, `sold_out`, `inactive`)

**반환값**:
```javascript
{
  product_id: "1",
  product_name: "수제 도자기 컵",
  product_status: "inactive",
  product_updated_at: "2025-10-08T..."
}
```

**비즈니스 로직**:
1. status 필수 검증
2. status enum 검증
3. 상품 존재 확인
4. 현재 상태와 동일한지 확인
5. Repository 호출
6. BigInt 변환

**예시**:
```javascript
// 부적절한 상품 비활성화
await updateProductStatus(1, 'inactive');

// 재활성화
await updateProductStatus(1, 'active');

// 품절 처리
await updateProductStatus(1, 'sold_out');
```

---

#### 5. deleteProduct(productId)
상품 삭제 (부적절한 상품)

**파라미터**:
- `productId` (number): 상품 ID

**반환값**:
```javascript
{
  product_id: "1",
  product_name: "수제 도자기 컵",
  message: "상품이 삭제되었습니다"
}
```

**비즈니스 로직**:
1. 상품 존재 확인 및 상세 조회
2. 주문 이력 확인 (있으면 삭제 불가)
3. Prisma delete 호출 (CASCADE: ProductImg, ShoppingCart)
4. 반환

**에러 케이스**:
```javascript
// 주문 이력 있음
throw new ValidationError('주문 이력이 30건 있는 상품은 삭제할 수 없습니다. 비활성화 처리를 권장합니다');
```

---

#### 6. getProductStatistics()
상품 통계 조회 (퍼센티지 포함)

**반환값**:
```javascript
{
  totalProducts: 5000,
  activeProducts: 4200,
  soldOutProducts: 500,
  inactiveProducts: 300,
  activeRate: 84.0,
  soldOutRate: 10.0,
  inactiveRate: 6.0,
  categoryDistribution: {
    "5": 150,
    "3": 120
  },
  recentProducts: 250
}
```

**비즈니스 로직**:
1. Repository 호출
2. 퍼센티지 계산 (소수점 1자리)
3. 0으로 나누기 방지
4. 반환

---

#### 7. getProductsByCategory(categoryId, options)
카테고리별 상품 조회

**파라미터**:
- `categoryId` (number): 카테고리 ID
- `options` (object): 페이징 옵션 (page, limit)

**반환값**: `getProductList()`와 동일

**내부 동작**:
```javascript
return getProductList({
  ...options,
  categoryId
});
```

---

#### 8. getProductsByTenant(tenantId, options)
판매사별 상품 조회

**파라미터**:
- `tenantId` (number): 판매사 ID
- `options` (object): 페이징 옵션 (page, limit)

**반환값**: `getProductList()`와 동일

**내부 동작**:
```javascript
return getProductList({
  ...options,
  tenantId
});
```

---

#### 9. searchProducts(keyword, limit)
상품 검색

**파라미터**:
- `keyword` (string): 검색 키워드
- `limit` (number, 선택): 결과 개수 (기본 10)

**반환값**:
```javascript
[
  {
    product_id: "1",
    product_name: "수제 도자기 컵",
    product_price: 25000,
    product_status: "active",
    tenant_member: {
      tenant: {
        tenant_name: "홍길동 공방"
      }
    }
  }
]
```

**비즈니스 로직**:
1. 키워드 필수 검증
2. 최소 2자 이상 검증
3. trim 적용
4. Repository 호출
5. BigInt 변환

---

## 🔄 사용 예시

### 예시 1: 상품 목록 조회 (필터링)

```javascript
// Controller
async function getProducts(req, res, next) {
  try {
    const { page, limit, status, categoryId, tenantId, search } = req.query;

    const result = await productService.getProductList({
      page,
      limit,
      status,
      categoryId,
      tenantId,
      search
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}
```

**요청 예시**:
```
GET /api/v1/admin/products?page=1&limit=20&status=active
GET /api/v1/admin/products?categoryId=5
GET /api/v1/admin/products?tenantId=10&status=sold_out
GET /api/v1/admin/products?search=도자기
```

---

### 예시 2: 상품 상세 조회

```javascript
async function getProductDetail(req, res, next) {
  try {
    const { productId } = req.params;

    const product = await productService.getProductById(parseInt(productId));

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
}
```

---

### 예시 3: 상품 상태 변경

```javascript
async function updateStatus(req, res, next) {
  try {
    const { productId } = req.params;
    const { status } = req.body;

    const updated = await productService.updateProductStatus(
      parseInt(productId),
      status
    );

    res.json({
      success: true,
      message: '상품 상태가 변경되었습니다',
      data: updated
    });
  } catch (error) {
    next(error);
  }
}
```

**요청 예시**:
```json
PUT /api/v1/admin/products/123/status
{
  "status": "inactive"
}
```

---

### 예시 4: 부적절한 상품 삭제

```javascript
async function deleteProduct(req, res, next) {
  try {
    const { productId } = req.params;

    const result = await productService.deleteProduct(parseInt(productId));

    res.json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error) {
    next(error);
  }
}
```

**요청 예시**:
```
DELETE /api/v1/admin/products/123
```

---

### 예시 5: 통계 조회

```javascript
async function getStatistics(req, res, next) {
  try {
    const stats = await productService.getProductStatistics();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
}
```

---

## ⚠️ 주의사항

### 1. 상태 검증
```javascript
// ✅ 올바른 검증
if (!VALID_PRODUCT_STATUSES.includes(status)) {
  throw new ValidationError('...');
}

// ❌ 오타 허용
await updateStatus(1, 'actve');  // 에러 발생하지 않음
```

### 2. 중복 상태 방지
```javascript
// ✅ 현재 상태 확인
if (product.product_status === status) {
  throw new ValidationError(`이미 ${status} 상태입니다`);
}

// ❌ 확인하지 않으면
// 불필요한 DB 업데이트 + updated_at 변경
```

### 3. 주문 이력 확인
```javascript
// ✅ 삭제 전 확인
if (product._count.order_items > 0) {
  throw new ValidationError('주문 이력이 있는 상품은 삭제할 수 없습니다');
}

// ❌ 확인하지 않으면
// 법적 문제 + 세금 신고 불가
```

### 4. BigInt 변환
```javascript
// ✅ null 체크 후 변환
category_id: product.category_id?.toString()

// ❌ null 체크 없이 변환
category_id: product.category_id.toString()  // null이면 에러
```

### 5. 페이징 제한
```javascript
// ✅ limit 제한
if (limit < 1 || limit > 100) {
  throw new ValidationError('limit은 1~100 사이여야 합니다');
}

// ❌ 제한 없으면
// limit=999999 → 메모리 초과, 서버 다운
```

### 6. 검색어 길이
```javascript
// ✅ 최소 길이 제한
if (keyword.length < 2) {
  throw new ValidationError('검색어는 2자 이상 입력해주세요');
}

// ❌ 1자 검색 허용
// 'a' 검색 → 수천 개 결과 → 성능 저하
```

---

## 📝 비즈니스 규칙 요약

### 상품 상태 변경
- ✅ 유효한 상태: `active`, `sold_out`, `inactive`
- ✅ 상품이 존재해야 함
- ✅ 현재 상태와 다른 상태로만 변경 가능
- ❌ 잘못된 상태값 불가

### 상품 삭제
- ✅ 주문 이력 없는 상품만 삭제 가능
- ✅ 장바구니 항목은 자동 CASCADE 삭제
- ✅ 상품 이미지는 자동 CASCADE 삭제
- ❌ 주문 이력 있으면 삭제 불가 (비활성화 권장)

### 목록 조회
- ✅ 페이지는 1 이상
- ✅ limit은 1~100 (성능 보호)
- ✅ status는 enum 값만
- ✅ categoryId, tenantId는 양수
- ✅ BigInt 필드는 문자열 변환

### 검색
- ✅ 검색어 필수
- ✅ 최소 2자 이상
- ✅ trim 적용

### 통계
- ✅ 퍼센티지 소수점 1자리
- ✅ 0으로 나누기 방지

---

## 🧪 테스트 시나리오

### 1. 목록 조회 (페이징)
```javascript
const page1 = await getProductList({ page: 1, limit: 20 });
const page2 = await getProductList({ page: 2, limit: 20 });
```

### 2. 상태 필터링
```javascript
const active = await getProductList({ status: 'active' });
const soldOut = await getProductList({ status: 'sold_out' });
```

### 3. 카테고리 필터링
```javascript
const products = await getProductsByCategory(5, { page: 1, limit: 20 });
```

### 4. 판매사 필터링
```javascript
const products = await getProductsByTenant(10, { page: 1, limit: 20 });
```

### 5. 검색
```javascript
const results = await searchProducts('도자기', 10);
```

### 6. 상태 변경
```javascript
await updateProductStatus(1, 'inactive');
await updateProductStatus(1, 'active');
```

### 7. 삭제
```javascript
// 성공 케이스 (주문 이력 없음)
await deleteProduct(1);

// 실패 케이스 (주문 이력 있음)
await deleteProduct(2);  // ValidationError
```

### 8. 통계
```javascript
const stats = await getProductStatistics();
console.log(`활성률: ${stats.activeRate}%`);
```

---

## 📝 다음 단계

✅ **Step 10 완료**

**다음**: Step 11 - AdminOrder Service 생성
- 주문 목록 조회 (회원별, 상태별, 기간별)
- 주문 상태 강제 변경
- 환불 처리 (트랜잭션: Order + Payment)
- 주문 통계

---

**작성일**: 2025년 10월 8일
**상태**: ✅ 완료
