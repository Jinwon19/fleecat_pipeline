# Step 2-4: Category Repository 생성

> **Phase 2: 판매자 기능 구축**
> **작성일**: 2025년 10월 13일
> **상태**: ✅ 완료

---

## 📋 작업 개요

### 목적
category 테이블에 대한 데이터 접근 계층(Repository)을 구현하여 계층형 카테고리 구조를 효율적으로 관리합니다.

### 작업 내용
- `src/repositories/category.repository.js` 파일 생성
- Prisma를 사용한 계층형 카테고리 CRUD 구현
- 자기 참조(Self-Referencing) 관계 처리
- category_path 자동 생성 로직

---

## 🎯 계층형 카테고리란?

### 1. 자기 참조 구조 (Self-Referencing)

카테고리는 자기 자신을 참조하는 **부모-자식 관계**를 가집니다:

```
대분류 (parent_category_id: NULL)
  ├─ 중분류 (parent_category_id: 대분류 ID)
  │   ├─ 소분류 (parent_category_id: 중분류 ID)
  │   └─ 소분류
  └─ 중분류
```

**예시**:
```
수공예품 (ID: 1, depth: 1)
  ├─ 도자기 (ID: 5, depth: 2, parent: 1)
  │   ├─ 찻잔 (ID: 12, depth: 3, parent: 5)
  │   └─ 접시 (ID: 13, depth: 3, parent: 5)
  └─ 목공예 (ID: 6, depth: 2, parent: 1)
```

### 2. category_path의 역할

**category_path**: 카테고리의 전체 경로를 ID로 표현

```javascript
// 대분류: /1
category_path: "/1"

// 중분류: /1/5
category_path: "/1/5"

// 소분류: /1/5/12
category_path: "/1/5/12"
```

**장점**:
- 조상 카테고리 찾기 쉬움 (LIKE '/1/%')
- 카테고리 이름 변경 시 path 재계산 불필요
- 계층 깊이 빠르게 확인 가능

### 3. 왜 ID 기반 path를 사용하는가?

```javascript
// ❌ 이름 기반 path
category_path: "/수공예품/도자기/찻잔"
// 문제: "도자기" → "도예품"으로 이름 변경 시 모든 하위 카테고리 path 재계산 필요

// ✅ ID 기반 path
category_path: "/1/5/12"
// 장점: 이름 변경해도 path는 그대로 유지
```

---

## 📁 파일 위치

```
src/
└── repositories/
    └── category.repository.js  ← 생성한 파일
```

---

## 💻 구현 코드

### 전체 구조

```javascript
const prisma = require('../config/database');

// 9개의 함수 제공:
// - 조회: findAll, findById, findByParentId
// - 생성: create (path 자동 계산)
// - 수정: update
// - 삭제: deleteById
// - 통계: countChildren, countProducts
```

---

## 🔧 함수 설명

### 1. 조회 함수 (Read)

#### `findAll({ includeInactive = false })`
**역할**: 모든 카테고리를 계층형 구조로 조회

**파라미터**:
```javascript
options = {
  includeInactive: false  // true: 비활성 카테고리 포함
}
```

**반환값**:
- 대분류 카테고리 배열 (중분류, 소분류 포함)

**사용 예시**:
```javascript
// 활성 카테고리만 조회 (기본)
const categories = await categoryRepository.findAll();

// 결과 구조:
[
  {
    category_id: 1,
    category_name: "수공예품",
    category_depth: 1,
    category_path: "/1",
    child_categories: [  // 중분류
      {
        category_id: 5,
        category_name: "도자기",
        category_depth: 2,
        category_path: "/1/5",
        child_categories: [  // 소분류
          {
            category_id: 12,
            category_name: "찻잔",
            category_depth: 3,
            category_path: "/1/5/12"
          }
        ]
      }
    ]
  }
]
```

**특징**:
- 대분류(parent_category_id: null)만 먼저 조회
- Prisma의 `include`로 3단계까지 재귀 조회
- `category_order` 순서로 정렬

**내부 동작**:
```javascript
async function findAll({ includeInactive = false } = {}) {
  const where = {
    parent_category_id: null  // 대분류만
  };

  if (!includeInactive) {
    where.category_is_active = true;  // 활성만
  }

  return await prisma.category.findMany({
    where,
    include: {
      child_categories: {  // 중분류
        include: {
          child_categories: true  // 소분류
        },
        orderBy: { category_order: 'asc' }
      }
    },
    orderBy: { category_order: 'asc' }
  });
}
```

---

#### `findById(categoryId)`
**역할**: ID로 카테고리 조회 (부모/자식 정보 포함)

**파라미터**:
- `categoryId` (number): 카테고리 ID

**반환값**:
- 카테고리 정보 객체 (parent_category, child_categories 포함)

**사용 예시**:
```javascript
const category = await categoryRepository.findById(5);

console.log(category.category_name);  // "도자기"
console.log(category.parent_category.category_name);  // "수공예품"
console.log(category.child_categories);  // [{ category_name: "찻잔" }, ...]
```

**특징**:
- 부모 카테고리 정보 포함 (parent_category)
- 자식 카테고리 목록 포함 (child_categories)

---

#### `findByParentId(parentId)`
**역할**: 특정 카테고리의 자식 카테고리 목록 조회

**파라미터**:
- `parentId` (number): 부모 카테고리 ID

**반환값**:
- 자식 카테고리 배열 (활성만)

**사용 예시**:
```javascript
// "수공예품"(ID: 1)의 중분류 조회
const subCategories = await categoryRepository.findByParentId(1);

// 결과:
[
  { category_id: 5, category_name: "도자기", category_depth: 2 },
  { category_id: 6, category_name: "목공예", category_depth: 2 }
]
```

**특징**:
- 활성 카테고리만 조회 (category_is_active: true)
- category_order 순서로 정렬

---

### 2. 생성 함수 (Create)

#### `create(categoryData)`
**역할**: 새 카테고리 생성 (path 자동 계산)

**파라미터**:
```javascript
categoryData = {
  category_name: "찻잔",              // 필수
  parent_category_id: 5,             // 선택 (null이면 대분류)
  category_description: "찻잔 설명",  // 선택
  category_order: 1                  // 선택 (기본값: 0)
}
```

**반환값**:
- 생성된 카테고리 정보 (parent_category 포함)

**사용 예시**:
```javascript
// 대분류 생성
const category1 = await categoryRepository.create({
  category_name: "수공예품",
  category_description: "수작업으로 만든 공예품"
});
// 결과: { category_id: 1, category_depth: 1, category_path: "/1" }

// 중분류 생성
const category2 = await categoryRepository.create({
  category_name: "도자기",
  parent_category_id: 1
});
// 결과: { category_id: 5, category_depth: 2, category_path: "/1/5" }

// 소분류 생성
const category3 = await categoryRepository.create({
  category_name: "찻잔",
  parent_category_id: 5
});
// 결과: { category_id: 12, category_depth: 3, category_path: "/1/5/12" }
```

**내부 동작**:
```javascript
async function create(categoryData) {
  // 1. depth와 parent_path 계산
  let category_depth = 1;
  let parent_path = null;

  if (parent_category_id) {
    const parent = await findById(parent_category_id);
    if (parent) {
      category_depth = parent.category_depth + 1;
      parent_path = parent.category_path;
    }
  }

  // 2. 카테고리 생성 (path는 임시로 null)
  const created = await prisma.category.create({
    data: {
      category_name,
      parent_category_id,
      category_depth,
      category_path: null,  // 임시
      category_is_active: true
    }
  });

  // 3. 생성된 ID로 path 계산 및 업데이트
  const category_path = parent_path
    ? `${parent_path}/${created.category_id}`
    : `/${created.category_id}`;

  const updated = await prisma.category.update({
    where: { category_id: created.category_id },
    data: { category_path }
  });

  return updated;
}
```

**왜 2단계로 생성하는가?**
- path에 카테고리 ID가 포함되어야 함
- ID는 생성 후에만 알 수 있음
- 따라서 1) 생성 후 → 2) path 업데이트

---

### 3. 수정 함수 (Update)

#### `update(categoryId, updateData)`
**역할**: 카테고리 정보 수정

**파라미터**:
```javascript
categoryId = 5;

updateData = {
  category_name: "도예품",           // 선택
  category_description: "새 설명",   // 선택
  category_order: 2,                // 선택
  category_is_active: false         // 선택
}
```

**반환값**:
- 수정된 카테고리 정보 (parent_category, child_categories 포함)

**사용 예시**:
```javascript
// 카테고리 이름 변경
const updated = await categoryRepository.update(5, {
  category_name: "도예품"
});
// category_path는 변경되지 않음 (ID 기반이므로)

// 카테고리 비활성화
const deactivated = await categoryRepository.update(5, {
  category_is_active: false
});
```

**특징**:
- category_path는 수정하지 않음 (ID 기반이므로)
- 이름 변경해도 하위 카테고리 path 재계산 불필요

---

### 4. 삭제 함수 (Delete)

#### `deleteById(categoryId)`
**역할**: 카테고리 삭제 (Hard Delete)

**파라미터**:
- `categoryId` (number): 카테고리 ID

**반환값**:
- 삭제된 카테고리 정보

**사용 예시**:
```javascript
// 삭제 전 확인
const hasChildren = await categoryRepository.countChildren(5);
const hasProducts = await categoryRepository.countProducts(5);

if (hasChildren > 0) {
  throw new Error('Cannot delete category with children');
}

if (hasProducts > 0) {
  throw new Error('Cannot delete category with products');
}

// 삭제 실행
await categoryRepository.deleteById(5);
```

**주의사항**:
- 하위 카테고리가 있으면 삭제 불가 (FK 제약)
- 상품이 있으면 삭제 불가 (FK 제약)
- Service 레이어에서 사전 확인 필요

---

### 5. 통계 함수

#### `countChildren(categoryId)`
**역할**: 하위 카테고리 개수 조회

**파라미터**:
- `categoryId` (number): 카테고리 ID

**반환값**:
- 하위 카테고리 개수 (number)

**사용 예시**:
```javascript
const count = await categoryRepository.countChildren(1);
console.log(`하위 카테고리: ${count}개`);
```

---

#### `countProducts(categoryId)`
**역할**: 카테고리에 속한 상품 개수 조회

**파라미터**:
- `categoryId` (number): 카테고리 ID

**반환값**:
- 상품 개수 (number)

**사용 예시**:
```javascript
const count = await categoryRepository.countProducts(5);
console.log(`등록된 상품: ${count}개`);
```

---

## 🔄 실제 사용 흐름

### 카테고리 생성 시나리오 (categoryService.js)

```javascript
async function createCategory(data) {
  const { category_name, parent_category_id } = data;

  // 1. 부모 카테고리 존재 확인
  if (parent_category_id) {
    const parent = await categoryRepository.findById(parent_category_id);

    if (!parent) {
      throw new NotFoundError('Parent category not found');
    }

    // 2. Depth 제한 확인 (3단계까지)
    if (parent.category_depth >= 3) {
      throw new ValidationError('Maximum category depth is 3');
    }
  }

  // 3. 카테고리 생성 (path 자동 계산)
  const category = await categoryRepository.create({
    category_name,
    parent_category_id,
    category_description: data.category_description,
    category_order: data.category_order || 0
  });

  return category;
}
```

---

### 카테고리 삭제 시나리오 (categoryService.js)

```javascript
async function deleteCategory(categoryId) {
  // 1. 카테고리 존재 확인
  const category = await categoryRepository.findById(categoryId);

  if (!category) {
    throw new NotFoundError('Category not found');
  }

  // 2. 하위 카테고리 확인
  const childCount = await categoryRepository.countChildren(categoryId);

  if (childCount > 0) {
    throw new ValidationError('Cannot delete category with children');
  }

  // 3. 상품 확인
  const productCount = await categoryRepository.countProducts(categoryId);

  if (productCount > 0) {
    throw new ValidationError('Cannot delete category with products');
  }

  // 4. 삭제 실행
  await categoryRepository.deleteById(categoryId);

  return { message: 'Category deleted successfully' };
}
```

---

### 계층형 카테고리 조회 시나리오

```javascript
// 프론트엔드에서 카테고리 트리 표시
async function getCategoryTree() {
  const categories = await categoryRepository.findAll();

  // 결과:
  // [
  //   {
  //     category_name: "수공예품",
  //     child_categories: [
  //       {
  //         category_name: "도자기",
  //         child_categories: [
  //           { category_name: "찻잔" },
  //           { category_name: "접시" }
  //         ]
  //       }
  //     ]
  //   }
  // ]

  return categories;
}
```

---

## 📊 데이터 흐름도

```
Controller
    ↓ (HTTP 요청)
Service
    ↓ (비즈니스 로직)
Repository ← Step 2-4 (여기!)
    ↓ (Prisma 쿼리)
Database
```

### 예시: POST /categories

```
1. categoryController.create
   - req.body에서 데이터 추출
   - categoryService.createCategory() 호출
       ↓
2. categoryService.createCategory
   - 부모 카테고리 존재 확인
   - depth 제한 확인 (3단계)
   - categoryRepository.create() 호출
       ↓
3. categoryRepository.create
   - 부모 path 조회
   - category_depth 계산
   - prisma.category.create() 실행
   - category_path 계산 및 업데이트
       ↓
4. Database
   - category 테이블에 레코드 추가
   - category_path 업데이트
```

---

## ⚠️ 주의사항

### 1. Depth 제한

```javascript
// 3단계까지만 허용
// 대분류 (depth: 1)
// └─ 중분류 (depth: 2)
//     └─ 소분류 (depth: 3)
//         └─ ❌ 4단계는 불가

// Service에서 확인
if (parent.category_depth >= 3) {
  throw new ValidationError('Maximum category depth is 3');
}
```

### 2. category_path는 수정 금지

```javascript
// ❌ category_path를 직접 수정하지 마세요
await categoryRepository.update(5, {
  category_path: "/1/999"  // 위험!
});

// ✅ category_path는 create 시에만 자동 생성
// 이름 변경 시에도 path는 변경되지 않음
```

### 3. 삭제 시 주의

```javascript
// ❌ 하위 카테고리가 있는데 삭제 시도
await categoryRepository.deleteById(1);
// Error: Foreign key constraint failed

// ✅ 삭제 전 확인
const hasChildren = await categoryRepository.countChildren(1);
if (hasChildren > 0) {
  throw new Error('하위 카테고리를 먼저 삭제하세요');
}
```

### 4. Prisma include의 제한

```javascript
// Prisma의 include는 3단계까지만 지원
include: {
  child_categories: {
    include: {
      child_categories: true  // 3단계
      // 4단계부터는 별도 쿼리 필요
    }
  }
}
```

### 5. 비활성 카테고리 처리

```javascript
// 부모 카테고리 비활성화 시
await categoryRepository.update(1, {
  category_is_active: false
});

// 문제: 하위 카테고리는 여전히 활성 상태
// 해결: Service 레이어에서 재귀적으로 비활성화
```

---

## 🧪 테스트 시나리오

### 1. 카테고리 생성 테스트

```javascript
describe('Category Repository - create', () => {
  it('should create a root category', async () => {
    // Given
    const data = {
      category_name: "수공예품"
    };

    // When
    const category = await categoryRepository.create(data);

    // Then
    expect(category.category_depth).toBe(1);
    expect(category.category_path).toBe(`/${category.category_id}`);
    expect(category.parent_category_id).toBeNull();
  });

  it('should create a child category', async () => {
    // Given
    const parent = await categoryRepository.create({
      category_name: "수공예품"
    });

    const data = {
      category_name: "도자기",
      parent_category_id: parent.category_id
    };

    // When
    const child = await categoryRepository.create(data);

    // Then
    expect(child.category_depth).toBe(2);
    expect(child.category_path).toBe(`/${parent.category_id}/${child.category_id}`);
  });
});
```

---

## 📈 성능 최적화 팁

### 1. 인덱스 활용

```prisma
model category {
  parent_category_id Int?
  category_path      String?
  category_is_active Boolean

  @@index([parent_category_id])
  @@index([category_path])
  @@index([category_is_active])
}
```

### 2. 재귀 쿼리 최적화

```javascript
// ❌ N+1 문제
const categories = await prisma.category.findMany();
for (const category of categories) {
  category.children = await prisma.category.findMany({
    where: { parent_category_id: category.category_id }
  });
}

// ✅ include로 한 번에 조회
const categories = await prisma.category.findMany({
  include: {
    child_categories: true
  }
});
```

---

## 🔗 다음 단계

### Step 2-5: Product Repository
다음 단계에서는 product 테이블의 Repository를 만들 예정입니다:

- `src/repositories/product.repository.js`
- 상품 CRUD 및 필터링
- 멀티테넌시 로직 (tenant_member_id)
- 카테고리 관계 처리

---

## 📚 참고 자료

### Prisma 공식 문서
- [Prisma Self-Relations](https://www.prisma.io/docs/concepts/components/prisma-schema/relations/self-relations)
- [Prisma Nested Queries](https://www.prisma.io/docs/concepts/components/prisma-client/relation-queries#nested-reads)

### 관련 가이드
- [03. 데이터베이스 가이드](../common/03_DATABASE_GUIDE.md)
- [db_03_RELATIONSHIPS.md](../common/db_03_RELATIONSHIPS.md)

### 이전 단계
- [Step 2-1: Tenant Repository](./2-1_tenant_repository.md)
- [Step 2-2: TenantDetail Repository](./2-2_tenantDetail_repository.md)
- [Step 2-3: TenantMember Repository](./2-3_tenantMember_repository.md)

---

**작성일**: 2025년 10월 13일
**작성자**: Backend Team
**상태**: ✅ 완료
