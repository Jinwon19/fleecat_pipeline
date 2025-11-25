# Step 4: AdminProduct Repository 생성

> **작성일**: 2025년 10월 7일
> **상태**: ✅ 완료
> **파일**: `src/repositories/admin/adminProduct.repository.js`

---

## 📚 개념 설명

### 🎯 왜 필요한가?

관리자는 플랫폼의 **모든 판매사의 모든 상품**을 관리해야 합니다:

- **전체 상품 조회** (일반 사용자는 활성 상품만 보지만, 관리자는 전체)
- **부적절한 상품 제재** (상태 변경, 비활성화)
- **카테고리별/판매사별 필터링** (특정 판매사의 모든 상품, 특정 카테고리의 모든 상품)
- **상품 통계** (전체 상품 수, 상태별 분포, 카테고리별 분포)

### 💡 일반 Product vs Admin Product

**기존 `product.repository.js`** (일반 사용자용):
```javascript
// 활성 상품만 조회
findAll({ where: { product_status: 'active' } })
findById(productId)  // 기본 정보만
```

**새로운 `admin/adminProduct.repository.js`**:
```javascript
// 관리자 전용 - 모든 상품 관리
findAll({ page, limit, status, categoryId, tenantId, search })
findByIdWithDetails(productId)             // 판매자, 통계 포함
updateStatus(productId, status)            // 상태 변경
getStatistics()                            // 통계
getProductsByCategory(categoryId)          // 카테고리별
getProductsByTenant(tenantId)              // 판매사별
searchProducts(keyword)                    // 검색
```

---

## 🔑 핵심 개념

### 1. Product 데이터 구조와 관계

**테이블 관계**:
```
product
├── product_id
├── product_name
├── product_status (active/sold_out/inactive)
├── product_price
├── product_stock_quantity
├── category_id (FK → category)
├── tenant_member_id (FK → tenant_member)
└── product_images (1:N)

관계:
Product → Category (N:1)
Product → TenantMember (N:1) → Tenant (N:1)
Product → TenantMember (N:1) → Member (N:1, 판매자)
Product → ProductImg (1:N)
```

**중요: 상품은 Tenant가 아닌 TenantMember 소유**
```javascript
// ❌ 상품에 tenant_id 없음
where: { tenant_id: BigInt(tenantId) }

// ✅ TenantMember를 통해 접근
where: {
  tenant_member: {
    tenant_id: BigInt(tenantId)
  }
}
```

**왜 TenantMember?**
- 한 판매사에 여러 판매 회원 가능
- 각 회원이 등록한 상품 구분
- 예: "홍길동 공방" → 홍길동(회원1), 김철수(회원2) → 각자 상품 등록

---

### 2. 상품 상태(product_status)

| 상태 | 의미 | 설명 |
|------|------|------|
| `active` | 활성 | 판매 중, 구매 가능 |
| `sold_out` | 품절 | 재고 없음, 구매 불가 |
| `inactive` | 비활성 | 판매 중단, 관리자가 비활성화 |

**상태 전환**:
```
active ↔ sold_out  (재고 관리)
active → inactive  (관리자 제재)
inactive → active  (재활성화)
```

---

### 3. 복잡한 필터링 조합

**여러 조건 동시 적용**:

```javascript
const where = {};

// 1. 상태 필터
if (status) {
  where.product_status = status;
}

// 2. 카테고리 필터
if (categoryId) {
  where.category_id = BigInt(categoryId);
}

// 3. 판매사 필터
if (tenantId) {
  where.tenant_member = {
    tenant_id: BigInt(tenantId)
  };
}

// 4. 검색 (상품명 OR 판매사명)
if (search) {
  where.OR = [
    { product_name: { contains: search, mode: 'insensitive' } },
    {
      tenant_member: {
        tenant: {
          tenant_name: { contains: search, mode: 'insensitive' }
        }
      }
    }
  ];
}
```

**조합 예시**:
```javascript
// 전자제품 카테고리의 품절 상품
findAll({ categoryId: 5, status: 'sold_out' })

// 홍길동 공방의 활성 상품
findAll({ tenantId: 10, status: 'active' })

// "도자기"가 포함된 비활성 상품
findAll({ search: '도자기', status: 'inactive' })
```

---

### 4. JOIN 패턴 - 관계 데이터 포함

**목록 조회 시 (간략 정보)**:
```javascript
include: {
  category: {
    select: { category_name: true }
  },
  tenant_member: {
    select: {
      tenant: { select: { tenant_name: true } },
      member: { select: { member_name: true } }
    }
  },
  product_images: {
    take: 1,  // 첫 번째 이미지만
    orderBy: { product_img_is_primary: 'desc' }
  }
}
```

**상세 조회 시 (전체 정보)**:
```javascript
include: {
  category: true,              // 전체 카테고리 정보
  tenant_member: {
    include: {
      tenant: true,            // 전체 판매사 정보
      member: true             // 전체 판매자 정보
    }
  },
  product_images: true,        // 모든 이미지
  _count: {
    select: {
      shopping_carts: true,    // 장바구니 담긴 횟수
      order_items: true        // 주문된 횟수
    }
  }
}
```

---

### 5. 통계 - groupBy 사용

**카테고리별 상품 수 집계**:

```javascript
const categoryStats = await prisma.product.groupBy({
  by: ['category_id'],               // 카테고리별로 그룹화
  _count: { product_id: true },      // 상품 개수 카운트
  orderBy: { _count: { product_id: 'desc' } },  // 많은 순 정렬
  take: 10                           // 상위 10개만
});

// 결과:
[
  { category_id: 5n, _count: { product_id: 150 } },  // 카테고리 5: 150개
  { category_id: 3n, _count: { product_id: 120 } },  // 카테고리 3: 120개
  ...
]

// 객체로 변환
const distribution = {};
for (const stat of categoryStats) {
  distribution[stat.category_id.toString()] = stat._count.product_id;
}
// { "5": 150, "3": 120, ... }
```

---

### 6. 페이징 최적화

**병렬 쿼리로 성능 향상**:

```javascript
// ✅ 병렬 실행 (빠름)
const [products, total] = await Promise.all([
  prisma.product.findMany({ where, skip, take }),  // 상품 조회
  prisma.product.count({ where })                  // 개수 조회
]);

// ❌ 순차 실행 (느림)
const products = await prisma.product.findMany({ where, skip, take });
const total = await prisma.product.count({ where });
```

---

### 7. 이미지 로딩 최적화

**목록에서는 대표 이미지 1개만**:
```javascript
product_images: {
  take: 1,                                  // 1개만
  orderBy: { product_img_is_primary: 'desc' },  // 대표 이미지 우선
  select: {
    product_img_url: true,
    product_img_is_primary: true
  }
}
```

**상세에서는 전체 이미지**:
```javascript
product_images: {
  orderBy: { product_img_is_primary: 'desc' }  // 대표 이미지 먼저
}
```

---

## 📦 구현 내용

### 파일 위치
```
src/repositories/admin/adminProduct.repository.js
```

### 주요 함수 (7개)

#### 1. findAll(options)
상품 목록 조회 (페이징, 필터링, 검색)

**파라미터**:
```javascript
{
  page: 1,              // 페이지 번호
  limit: 20,            // 페이지당 개수
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
      product_id: 1n,
      product_name: "수제 도자기 컵",
      product_price: 25000,
      product_status: "active",
      product_stock_quantity: 50,
      category: {
        category_id: 5n,
        category_name: "주방용품"
      },
      tenant_member: {
        tenant: {
          tenant_id: 10n,
          tenant_name: "홍길동 공방",
          tenant_status: "approved"
        },
        member: {
          member_id: 1n,
          member_name: "홍길동",
          member_email: "seller@example.com"
        }
      },
      product_images: [
        {
          product_img_url: "https://...",
          product_img_is_primary: true
        }
      ]
    }
  ],
  total: 500,
  page: 1,
  totalPages: 25
}
```

**예시**:
```javascript
// 전체 상품 (1페이지)
const all = await findAll({ page: 1, limit: 20 });

// 품절 상품만
const soldOut = await findAll({ status: 'sold_out' });

// 카테고리 5의 활성 상품
const categoryProducts = await findAll({
  categoryId: 5,
  status: 'active'
});

// 판매사 10의 모든 상품
const tenantProducts = await findAll({ tenantId: 10 });

// "도자기" 검색
const results = await findAll({ search: '도자기' });
```

---

#### 2. findByIdWithDetails(productId)
상품 상세 조회 (관리자용 - 모든 정보 포함)

**포함 정보**:
- 상품 기본 정보
- 카테고리 전체 정보
- 판매사 정보 (tenant)
- 판매자 정보 (member)
- 모든 상품 이미지
- 장바구니/주문 통계

**반환값**:
```javascript
{
  product_id: 1n,
  product_name: "수제 도자기 컵",
  product_price: 25000,
  product_status: "active",
  product_stock_quantity: 50,
  product_description: "전통 방식으로 제작한...",

  category: {
    category_id: 5n,
    category_name: "주방용품",
    category_path: "1/3/5",
    category_depth: 3
  },

  tenant_member: {
    tenant: {
      tenant_id: 10n,
      tenant_name: "홍길동 공방",
      tenant_status: "approved"
    },
    member: {
      member_id: 1n,
      member_name: "홍길동",
      member_email: "seller@example.com",
      member_phone: "010-1234-5678",
      member_status: "active"
    }
  },

  product_images: [
    {
      product_img_id: 1n,
      product_img_url: "https://...",
      product_img_is_primary: true
    },
    {
      product_img_id: 2n,
      product_img_url: "https://...",
      product_img_is_primary: false
    }
  ],

  _count: {
    shopping_carts: 15,    // 장바구니 담긴 횟수
    order_items: 30        // 주문된 횟수
  }
}
```

**예시**:
```javascript
const product = await findByIdWithDetails(1);

console.log(`상품: ${product.product_name}`);
console.log(`판매사: ${product.tenant_member.tenant.tenant_name}`);
console.log(`판매자: ${product.tenant_member.member.member_name}`);
console.log(`카테고리: ${product.category.category_name}`);
console.log(`장바구니: ${product._count.shopping_carts}회`);
console.log(`주문: ${product._count.order_items}회`);
```

---

#### 3. updateStatus(productId, status)
상품 상태 변경

**파라미터**:
- `productId` (number): 상품 ID
- `status` (string): 변경할 상태
  - `'active'`: 활성
  - `'sold_out'`: 품절
  - `'inactive'`: 비활성

**반환값**:
```javascript
{
  product_id: 1n,
  product_name: "수제 도자기 컵",
  product_status: "inactive",
  product_updated_at: "2025-10-07T..."
}
```

**예시**:
```javascript
// 부적절한 상품 비활성화
await updateStatus(1, 'inactive');

// 재활성화
await updateStatus(1, 'active');

// 품절 처리
await updateStatus(1, 'sold_out');
```

---

#### 4. getStatistics()
상품 통계 조회

**반환값**:
```javascript
{
  totalProducts: 5000,              // 전체 상품
  activeProducts: 4200,             // 활성 상품
  soldOutProducts: 500,             // 품절 상품
  inactiveProducts: 300,            // 비활성 상품
  categoryDistribution: {           // 카테고리별 분포 (상위 10개)
    "5": 150,                       // 카테고리 5: 150개
    "3": 120,                       // 카테고리 3: 120개
    "8": 100
  },
  recentProducts: 250               // 최근 7일 등록
}
```

**예시**:
```javascript
const stats = await getStatistics();

console.log(`전체 상품: ${stats.totalProducts}개`);
console.log(`활성: ${stats.activeProducts}개`);
console.log(`품절: ${stats.soldOutProducts}개`);

// 활성률 계산
const activeRate = (stats.activeProducts / stats.totalProducts * 100).toFixed(1);
console.log(`활성률: ${activeRate}%`);

// 카테고리별 분포
Object.entries(stats.categoryDistribution).forEach(([catId, count]) => {
  console.log(`카테고리 ${catId}: ${count}개`);
});
```

---

#### 5. getProductsByCategory(categoryId, options)
카테고리별 상품 조회

**파라미터**:
- `categoryId` (number): 카테고리 ID
- `options` (object): 페이징 옵션 (page, limit)

**반환값**: `findAll()`과 동일 구조

**예시**:
```javascript
// 카테고리 5의 상품 (1페이지, 20개)
const products = await getProductsByCategory(5, { page: 1, limit: 20 });

// 카테고리 5의 2페이지
const page2 = await getProductsByCategory(5, { page: 2, limit: 20 });

console.log(`카테고리 5 총 상품: ${products.total}개`);
```

**내부 동작**:
```javascript
// 내부적으로 findAll() 호출
return findAll({
  ...options,
  categoryId
});
```

---

#### 6. getProductsByTenant(tenantId, options)
판매사별 상품 조회

**파라미터**:
- `tenantId` (number): 판매사 ID
- `options` (object): 페이징 옵션 (page, limit)

**반환값**: `findAll()`과 동일 구조

**예시**:
```javascript
// 판매사 10의 모든 상품
const products = await getProductsByTenant(10, { page: 1, limit: 20 });

console.log(`${products.products[0].tenant_member.tenant.tenant_name}: ${products.total}개 상품`);
```

---

#### 7. searchProducts(keyword, limit)
상품 검색

**파라미터**:
- `keyword` (string): 검색 키워드
- `limit` (number, 선택): 결과 개수 (기본 10)

**검색 대상**:
- 상품명 (product_name)
- 상품 설명 (product_description)
- 판매사명 (tenant_name)

**반환값**:
```javascript
[
  {
    product_id: 1n,
    product_name: "수제 도자기 컵",
    product_price: 25000,
    product_status: "active",
    tenant_member: {
      tenant: {
        tenant_name: "홍길동 공방"
      }
    }
  },
  ...
]
```

**예시**:
```javascript
// "도자기" 검색
const results = await searchProducts('도자기');

// 상위 5개만
const top5 = await searchProducts('도자기', 5);

// 판매사명으로 검색
const byTenant = await searchProducts('홍길동 공방');
```

---

## 🔄 동작 흐름 예시

### 시나리오 1: 부적절한 상품 비활성화

```javascript
// 1. 신고 접수: "상품 ID 123 부적절한 내용"
// 2. 상세 조회
const product = await findByIdWithDetails(123);

// 3. 내용 검토
console.log(product.product_name);
console.log(product.product_description);
console.log(product.product_images);

// 4. 판매자 확인
console.log(`판매자: ${product.tenant_member.member.member_name}`);
console.log(`판매사: ${product.tenant_member.tenant.tenant_name}`);

// 5. 비활성화 처리
await updateStatus(123, 'inactive');

// 6. 판매자에게 통지 (Service 레이어에서 처리)
```

---

### 시나리오 2: 카테고리별 상품 관리

```javascript
// 1. 전자제품 카테고리(5) 클릭
const electronics = await getProductsByCategory(5, { page: 1, limit: 20 });

console.log(`전자제품: ${electronics.total}개`);

// 2. 잘못 분류된 상품 발견
electronics.products.forEach(p => {
  if (p.product_name.includes('도자기')) {
    console.log(`잘못된 분류: ${p.product_name}`);
    // 카테고리 변경 (Service 레이어)
  }
});
```

---

### 시나리오 3: 판매사별 상품 조회

```javascript
// 1. 판매사 10의 모든 상품
const products = await getProductsByTenant(10);

// 2. 비활성 상품 확인
const inactive = products.products.filter(p => p.product_status === 'inactive');
console.log(`비활성 상품: ${inactive.length}개`);

// 3. 판매사 통계
console.log(`총 상품: ${products.total}개`);
```

---

### 시나리오 4: 통계 대시보드

```javascript
const stats = await getStatistics();

console.log(`
  === 상품 통계 ===
  전체: ${stats.totalProducts}
  활성: ${stats.activeProducts}
  품절: ${stats.soldOutProducts}
  비활성: ${stats.inactiveProducts}
  최근 7일 등록: ${stats.recentProducts}

  === 카테고리별 상위 3개 ===
`);

Object.entries(stats.categoryDistribution)
  .slice(0, 3)
  .forEach(([catId, count]) => {
    console.log(`  카테고리 ${catId}: ${count}개`);
  });
```

---

## ⚠️ 주의사항

### 1. TenantMember 관계
```javascript
// ✅ 올바른 판매사 필터링
where: {
  tenant_member: {
    tenant_id: BigInt(tenantId)
  }
}

// ❌ product에는 tenant_id 없음
where: {
  tenant_id: BigInt(tenantId)
}
```

### 2. BigInt 처리
```javascript
product_id: BigInt(productId)
category_id: BigInt(categoryId)
tenant_member_id: BigInt(tenantMemberId)
```

### 3. 이미지 로딩
- 목록: 대표 이미지 1개만 (`take: 1`)
- 상세: 전체 이미지

### 4. 검색 성능
```javascript
{ contains: keyword, mode: 'insensitive' }
```
→ 상품 수가 많으면 느림
→ 필요시 Elasticsearch 고려

### 5. groupBy 결과
```javascript
// groupBy는 BigInt 반환
categoryStats[0].category_id  // 5n (BigInt)

// 객체 키로 사용 시 문자열 변환
distribution[stat.category_id.toString()] = count;
```

---

## 🧪 테스트 시나리오

### 1. 목록 조회
```javascript
const all = await findAll({ page: 1, limit: 20 });
```

### 2. 상태 필터링
```javascript
const active = await findAll({ status: 'active' });
const soldOut = await findAll({ status: 'sold_out' });
```

### 3. 카테고리 필터링
```javascript
const categoryProducts = await findAll({ categoryId: 5 });
```

### 4. 판매사 필터링
```javascript
const tenantProducts = await findAll({ tenantId: 10 });
```

### 5. 검색
```javascript
const results = await searchProducts('도자기');
```

### 6. 상태 변경
```javascript
await updateStatus(1, 'inactive');
```

### 7. 통계
```javascript
const stats = await getStatistics();
```

---

## 📝 다음 단계

✅ **Step 4 완료**

**다음**: Step 5 - AdminOrder Repository 생성
- 주문 목록 조회 (회원별, 상태별)
- 주문 상태 변경
- 주문 통계

---

**작성일**: 2025년 10월 7일
**상태**: ✅ 완료
