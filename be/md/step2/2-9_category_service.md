# Step 2-9: Category Service 생성

> **Phase 2: 판매자 기능 구축**
> **작성일**: 2025년 10월 13일
> **상태**: ✅ 완료

---

## 📋 작업 개요

### 목적
계층형 카테고리 관리 비즈니스 로직을 구현하여 3단계 카테고리 시스템을 제공합니다.

### 작업 내용
- `src/services/category.service.js` 파일 생성
- 카테고리 CRUD 비즈니스 로직 구현
- Depth 제한 검증 (3단계까지)
- 삭제 시 하위 카테고리 및 상품 확인

---

## 🎯 Category Service란?

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
| 책임 | CRUD | 규칙 검증, 권한 확인 |
| Depth 확인 | ❌ | ✅ (3단계 제한) |
| 삭제 확인 | ❌ | ✅ (자식/상품 확인) |

**Service가 하는 일**:
- Depth 제한 검증 (3단계까지만 생성)
- 부모 카테고리 존재 및 상태 확인
- 삭제 시 하위 카테고리 및 상품 존재 확인
- BigInt 변환 처리
- 권한 확인 (관리자 전용)

---

### 2. 계층형 카테고리 구조

```
대분류 (depth: 1)
  ├─ 중분류 (depth: 2)
  │   ├─ 소분류 (depth: 3)
  │   └─ 소분류 (depth: 3)
  └─ 중분류 (depth: 2)
```

**예시**:
```
수공예품 (ID: 1, depth: 1)
  ├─ 도자기 (ID: 5, depth: 2, parent: 1)
  │   ├─ 찻잔 (ID: 12, depth: 3, parent: 5)
  │   └─ 접시 (ID: 13, depth: 3, parent: 5)
  └─ 목공예 (ID: 6, depth: 2, parent: 1)
```

**category_path**:
- 대분류 (ID: 1): `category_path = "/1"`
- 중분류 (ID: 5): `category_path = "/1/5"`
- 소분류 (ID: 12): `category_path = "/1/5/12"`

---

### 3. Depth 제한 (3단계)

**왜 3단계까지만?**
- UI/UX 복잡도 관리
- 사용자 검색 편의성
- 성능 최적화 (JOIN 깊이 제한)

**Service에서 확인**:
```javascript
// 부모의 depth가 3이면 자식 생성 불가
if (parent.category_depth >= 3) {
  throw new ValidationError('Maximum category depth is 3');
}
```

---

### 4. 카테고리 삭제 제약

**삭제 불가 조건**:
1. 하위 카테고리가 있는 경우
2. 상품이 등록되어 있는 경우

**이유**:
- 데이터 무결성 보장
- FK 제약 위반 방지
- 사용자 실수 방지

```javascript
// 하위 카테고리 확인
const childCount = await categoryRepository.countChildren(categoryId);
if (childCount > 0) {
  throw new ValidationError('하위 카테고리를 먼저 삭제하세요');
}

// 상품 확인
const productCount = await categoryRepository.countProducts(categoryId);
if (productCount > 0) {
  throw new ValidationError('상품을 다른 카테고리로 이동하거나 삭제하세요');
}
```

---

## 📁 파일 위치

```
src/
└── services/
    ├── member.service.js      (Phase 1 완료)
    ├── admin.service.js       (Phase 1 완료)
    ├── auth.service.js        (Phase 1 완료)
    ├── tenant.service.js      (Step 2-7 완료)
    ├── tenantMember.service.js (Step 2-8 완료)
    └── category.service.js    ← 생성한 파일
```

---

## 💻 구현 코드

### 전체 구조

```javascript
const categoryRepository = require('../repositories/category.repository');
const { ValidationError, NotFoundError } = require('../utils/errors');

// 7개의 함수 제공:
// - 관리자용: createCategory, updateCategory, deleteCategory
// - Public: getCategoryTree, getCategoryById, getChildCategories
// - 통계: getCategoryStats
```

---

## 🔧 함수 설명

### 1. 카테고리 생성 (관리자 전용)

#### `createCategory(data)`
**역할**: 새 카테고리 생성 (depth 제한 및 부모 상태 확인)

**파라미터**:
```javascript
data = {
  category_name: "도자기",                // 필수: 카테고리 이름
  parent_category_id: 1,                 // 선택: 부모 카테고리 ID (null이면 대분류)
  category_description: "도자기 공예품",  // 선택: 설명
  category_order: 1                      // 선택: 정렬 순서 (기본: 0)
}
```

**반환값**:
- 생성된 카테고리 정보

**사용 예시**:
```javascript
// 대분류 생성
const rootCategory = await categoryService.createCategory({
  category_name: "수공예품",
  category_description: "수작업으로 만든 공예품"
});
// 결과: { category_id: 1, category_depth: 1, category_path: "/1" }

// 중분류 생성
const subCategory = await categoryService.createCategory({
  category_name: "도자기",
  parent_category_id: 1
});
// 결과: { category_id: 5, category_depth: 2, category_path: "/1/5" }

// 소분류 생성
const leafCategory = await categoryService.createCategory({
  category_name: "찻잔",
  parent_category_id: 5
});
// 결과: { category_id: 12, category_depth: 3, category_path: "/1/5/12" }
```

**내부 동작**:
```javascript
// 1. 필수 필드 확인
if (!category_name || category_name.trim() === '') {
  throw new ValidationError('Category name is required');
}

// 2. 부모 카테고리 확인
if (parent_category_id) {
  const parent = await categoryRepository.findById(parent_category_id);

  if (!parent) {
    throw new NotFoundError('Parent category not found');
  }

  // 3. Depth 제한 확인
  if (parent.category_depth >= 3) {
    throw new ValidationError('Maximum category depth is 3');
  }

  // 4. 비활성 부모에 자식 생성 방지
  if (!parent.category_is_active) {
    throw new ValidationError('Cannot create child under inactive parent');
  }
}

// 5. 카테고리 생성
const category = await categoryRepository.create({
  category_name: category_name.trim(),
  parent_category_id,
  category_description,
  category_order: category_order ?? 0
});
```

**특징**:
- **Depth 제한**: 3단계까지만 생성 가능
- **부모 확인**: 부모가 존재하고 활성 상태여야 함
- **자동 계산**: depth와 path는 Repository에서 자동 계산
- **Trim 처리**: 이름 앞뒤 공백 제거

**에러 처리**:
```javascript
try {
  const category = await categoryService.createCategory(data);
} catch (error) {
  if (error instanceof NotFoundError) {
    // 부모 카테고리가 존재하지 않음
  } else if (error instanceof ValidationError) {
    // Depth 제한 초과 또는 이름 누락
  }
}
```

---

### 2. 카테고리 트리 조회 (Public)

#### `getCategoryTree(options)`
**역할**: 계층형 카테고리 트리 구조 조회

**파라미터**:
```javascript
options = {
  includeInactive: false  // true: 비활성 카테고리 포함
}
```

**반환값**:
- 대분류 배열 (중분류, 소분류 포함)

**사용 예시**:
```javascript
// 활성 카테고리만 조회
const categories = await categoryService.getCategoryTree();

// 결과:
[
  {
    category_id: 1,
    category_name: "수공예품",
    category_depth: 1,
    category_path: "/1",
    category_order: 0,
    category_is_active: true,
    child_categories: [
      {
        category_id: 5,
        category_name: "도자기",
        category_depth: 2,
        category_path: "/1/5",
        child_categories: [
          {
            category_id: 12,
            category_name: "찻잔",
            category_depth: 3,
            category_path: "/1/5/12",
            child_categories: []
          },
          {
            category_id: 13,
            category_name: "접시",
            category_depth: 3,
            category_path: "/1/5/13",
            child_categories: []
          }
        ]
      },
      {
        category_id: 6,
        category_name: "목공예",
        category_depth: 2,
        category_path: "/1/6",
        child_categories: []
      }
    ]
  }
]

// 비활성 카테고리 포함 조회
const allCategories = await categoryService.getCategoryTree({
  includeInactive: true
});
```

**특징**:
- 누구나 조회 가능 (Public API)
- 3단계까지 재귀적으로 포함
- category_order 순서로 정렬
- BigInt 자동 변환

---

#### `getCategoryById(categoryId)`
**역할**: 카테고리 상세 조회

**파라미터**:
- `categoryId` (number): 카테고리 ID

**반환값**:
- 카테고리 정보 (parent_category, child_categories 포함)

**사용 예시**:
```javascript
const category = await categoryService.getCategoryById(5);

console.log(category.category_name);  // "도자기"
console.log(category.category_depth);  // 2
console.log(category.category_path);  // "/1/5"
console.log(category.parent_category.category_name);  // "수공예품"
console.log(category.child_categories);  // [{ category_name: "찻잔" }, ...]
```

**특징**:
- 부모 카테고리 정보 포함
- 자식 카테고리 목록 포함
- 404 NotFoundError 처리

---

#### `getChildCategories(parentId)`
**역할**: 특정 카테고리의 자식 카테고리만 조회

**파라미터**:
- `parentId` (number): 부모 카테고리 ID

**반환값**:
- 자식 카테고리 배열

**사용 예시**:
```javascript
// "수공예품"(ID: 1)의 중분류 조회
const children = await categoryService.getChildCategories(1);

// 결과:
[
  { category_id: 5, category_name: "도자기", category_depth: 2 },
  { category_id: 6, category_name: "목공예", category_depth: 2 }
]
```

**특징**:
- 활성 카테고리만 조회
- category_order 순서로 정렬

---

### 3. 카테고리 수정 (관리자 전용)

#### `updateCategory(categoryId, updateData)`
**역할**: 카테고리 정보 수정

**파라미터**:
```javascript
categoryId = 5;

updateData = {
  category_name: "도예품",              // 선택: 카테고리 이름
  category_description: "새로운 설명",  // 선택: 설명
  category_order: 2,                   // 선택: 정렬 순서
  category_is_active: false            // 선택: 활성 상태
}
```

**반환값**:
- 수정된 카테고리 정보

**사용 예시**:
```javascript
// 카테고리 이름 변경
const updated = await categoryService.updateCategory(5, {
  category_name: "도예품"
});
// 참고: category_path는 변경되지 않음 (ID 기반이므로)

// 카테고리 비활성화
const deactivated = await categoryService.updateCategory(5, {
  category_is_active: false
});

// 정렬 순서 변경
const reordered = await categoryService.updateCategory(5, {
  category_order: 10
});
```

**수정 가능한 필드**:
- ✅ `category_name` - 이름
- ✅ `category_description` - 설명
- ✅ `category_order` - 정렬 순서
- ✅ `category_is_active` - 활성 상태

**수정 불가 필드**:
- ❌ `parent_category_id` - 부모 변경 불가
- ❌ `category_path` - 경로 자동 계산
- ❌ `category_depth` - 깊이 자동 계산

**특징**:
- 부분 업데이트 지원
- 이름 빈 문자열 검증
- 수정할 필드가 없으면 에러

---

### 4. 카테고리 삭제 (관리자 전용)

#### `deleteCategory(categoryId)`
**역할**: 카테고리 삭제 (하위 카테고리 및 상품 확인)

**파라미터**:
- `categoryId` (number): 카테고리 ID

**반환값**:
```javascript
{
  message: "Category deleted successfully",
  deleted_category: {
    category_id: 5,
    category_name: "도자기"
  }
}
```

**사용 예시**:
```javascript
// 삭제 실행
const result = await categoryService.deleteCategory(5);

console.log(result.message);  // "Category deleted successfully"
console.log(result.deleted_category.category_name);  // "도자기"
```

**내부 동작**:
```javascript
// 1. 카테고리 존재 확인
const category = await categoryRepository.findById(categoryId);
if (!category) {
  throw new NotFoundError('Category not found');
}

// 2. 하위 카테고리 확인
const childCount = await categoryRepository.countChildren(categoryId);
if (childCount > 0) {
  throw new ValidationError(
    `Cannot delete category with ${childCount} child categories`
  );
}

// 3. 상품 확인
const productCount = await categoryRepository.countProducts(categoryId);
if (productCount > 0) {
  throw new ValidationError(
    `Cannot delete category with ${productCount} products`
  );
}

// 4. 삭제 실행
await categoryRepository.deleteById(categoryId);
```

**삭제 불가 조건**:
1. **하위 카테고리 존재**: "하위 카테고리를 먼저 삭제하세요"
2. **상품 존재**: "상품을 다른 카테고리로 이동하거나 삭제하세요"

**특징**:
- Hard Delete (물리적 삭제)
- 데이터 무결성 보장
- 명확한 에러 메시지

**에러 처리**:
```javascript
try {
  await categoryService.deleteCategory(5);
} catch (error) {
  if (error instanceof ValidationError) {
    if (error.message.includes('child categories')) {
      console.error('하위 카테고리를 먼저 삭제하세요');
    } else if (error.message.includes('products')) {
      console.error('상품을 다른 카테고리로 이동하세요');
    }
  }
}
```

---

### 5. 카테고리 통계 조회

#### `getCategoryStats(categoryId)`
**역할**: 카테고리 통계 정보 조회

**파라미터**:
- `categoryId` (number): 카테고리 ID

**반환값**:
```javascript
{
  category_id: 5,
  category_name: "도자기",
  category_depth: 2,
  child_category_count: 2,    // 하위 카테고리 개수
  product_count: 15,          // 등록된 상품 개수
  is_active: true
}
```

**사용 예시**:
```javascript
const stats = await categoryService.getCategoryStats(5);

console.log(`${stats.category_name}: 하위 ${stats.child_category_count}개, 상품 ${stats.product_count}개`);
// 출력: "도자기: 하위 2개, 상품 15개"
```

**특징**:
- 삭제 가능 여부 판단에 활용
- 카테고리 관리 UI에 유용

---

## 🔄 실제 사용 흐름

### 시나리오 1: 카테고리 생성 (관리자)

```javascript
// Controller (관리자 전용)
async function createCategory(req, res, next) {
  try {
    // 관리자 권한 확인 (middleware에서 처리)
    // req.user.role === 'admin'

    const data = req.body;

    // Service 호출
    const category = await categoryService.createCategory(data);

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category
    });
  } catch (error) {
    next(error);
  }
}

// Service
async function createCategory(data) {
  // 1. 필수 필드 확인
  // 2. 부모 카테고리 존재 확인
  // 3. Depth 제한 확인 (3단계)
  // 4. 비활성 부모 확인
  // 5. Repository 호출 (path 자동 계산)
  // 6. BigInt 변환 및 반환
}
```

---

### 시나리오 2: 계층형 트리 조회 (Public)

```javascript
// Controller (Public API)
async function getCategories(req, res, next) {
  try {
    const includeInactive = req.query.includeInactive === 'true';

    // Service 호출
    const categories = await categoryService.getCategoryTree({
      includeInactive
    });

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    next(error);
  }
}

// Service
async function getCategoryTree(options) {
  // 1. Repository에서 대분류 조회 (자식 포함)
  // 2. BigInt 재귀 변환
  // 3. 결과 반환
}
```

---

### 시나리오 3: 카테고리 삭제 (관리자)

```javascript
// Controller (관리자 전용)
async function deleteCategory(req, res, next) {
  try {
    const categoryId = parseInt(req.params.id);

    // Service 호출
    const result = await categoryService.deleteCategory(categoryId);

    res.json({
      success: true,
      message: result.message,
      data: result.deleted_category
    });
  } catch (error) {
    next(error);
  }
}

// Service
async function deleteCategory(categoryId) {
  // 1. 카테고리 존재 확인
  // 2. 하위 카테고리 확인 (있으면 에러)
  // 3. 상품 확인 (있으면 에러)
  // 4. 삭제 실행
  // 5. 결과 반환
}
```

---

### 시나리오 4: 카테고리 수정 (관리자)

```javascript
// Controller (관리자 전용)
async function updateCategory(req, res, next) {
  try {
    const categoryId = parseInt(req.params.id);
    const updateData = req.body;

    // Service 호출
    const updated = await categoryService.updateCategory(categoryId, updateData);

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: updated
    });
  } catch (error) {
    next(error);
  }
}

// Service
async function updateCategory(categoryId, updateData) {
  // 1. 카테고리 존재 확인
  // 2. 수정 가능한 필드만 추출
  // 3. 이름 빈 문자열 검증
  // 4. Repository 호출
  // 5. BigInt 변환 및 반환
}
```

---

## 📊 데이터 흐름도

```
Controller
    ↓ (HTTP 요청)
Service ← Step 2-9 (여기!)
    ↓ (Repository 호출)
Repository (Category)
    ↓ (Prisma 쿼리)
Database
```

### 예시: POST /categories (카테고리 생성)

```
1. categoryController.createCategory
   - req.body (category_name, parent_category_id 등) 추출
   - 관리자 권한 확인 (middleware)
   - categoryService.createCategory() 호출
       ↓
2. categoryService.createCategory
   - 필수 필드 검증
   - 부모 카테고리 조회 (Repository)
   - Depth 제한 확인 (3단계)
   - 비활성 부모 확인
   - categoryRepository.create() 호출
       ↓
3. categoryRepository.create
   - 부모 depth, path 조회
   - prisma.category.create() 실행
   - category_path 계산 및 업데이트
       ↓
4. Database
   - category 테이블에 레코드 추가
   - category_path 업데이트
```

---

## ⚠️ 주의사항

### 1. Depth 제한 (3단계)

```javascript
// ✅ 허용 (depth: 1, 2, 3)
대분류 (depth: 1)
└─ 중분류 (depth: 2)
    └─ 소분류 (depth: 3)

// ❌ 불가 (depth: 4)
대분류 (depth: 1)
└─ 중분류 (depth: 2)
    └─ 소분류 (depth: 3)
        └─ 4단계 (depth: 4) ← 생성 불가

// Service에서 확인
if (parent.category_depth >= 3) {
  throw new ValidationError('Maximum category depth is 3');
}
```

### 2. 비활성 부모에 자식 생성 방지

```javascript
// ❌ 비활성 부모에 자식 생성 시도
const parent = await categoryRepository.findById(1);
// parent.category_is_active === false

await categoryService.createCategory({
  category_name: "도자기",
  parent_category_id: 1
});
// Error: Cannot create child category under inactive parent

// ✅ 부모 활성 상태 확인
if (!parent.category_is_active) {
  throw new ValidationError('Cannot create child under inactive parent');
}
```

### 3. 삭제 시 순서

```javascript
// ❌ 부모를 먼저 삭제하려고 시도
await categoryService.deleteCategory(1);  // "수공예품" (부모)
// Error: Cannot delete category with 2 child categories

// ✅ 자식부터 삭제
await categoryService.deleteCategory(12);  // "찻잔" (소분류)
await categoryService.deleteCategory(13);  // "접시" (소분류)
await categoryService.deleteCategory(5);   // "도자기" (중분류)
await categoryService.deleteCategory(1);   // "수공예품" (대분류)
```

### 4. 상품이 있는 카테고리 삭제 불가

```javascript
// ❌ 상품이 등록된 카테고리 삭제 시도
const productCount = await categoryRepository.countProducts(5);
// productCount === 15

await categoryService.deleteCategory(5);
// Error: Cannot delete category with 15 products

// ✅ 상품을 먼저 이동하거나 삭제
// 1. 상품을 다른 카테고리로 이동
await productService.bulkUpdateCategory(oldCategoryId, newCategoryId);

// 2. 또는 상품 삭제
await productService.deleteByCategory(categoryId);

// 3. 그 다음 카테고리 삭제
await categoryService.deleteCategory(categoryId);
```

### 5. category_path는 수정 불가

```javascript
// ❌ category_path를 직접 수정하지 마세요
await categoryService.updateCategory(5, {
  category_path: "/1/999"  // 무시됨
});

// ✅ category_path는 create 시에만 자동 생성
// 이름 변경해도 path는 변경되지 않음 (ID 기반)
await categoryService.updateCategory(5, {
  category_name: "도예품"  // path는 "/1/5" 그대로
});
```

### 6. BigInt 변환

```javascript
// Service에서 Number로 변환하여 반환
return {
  ...category,
  category_id: Number(category.category_id),
  parent_category_id: category.parent_category_id
    ? Number(category.parent_category_id)
    : null
};

// Controller에서 그대로 JSON 응답 가능
res.json({
  data: category  // 이미 Number로 변환됨
});
```

---

## 🧪 테스트 시나리오

### 1. 카테고리 생성 테스트

```javascript
describe('Category Service - createCategory', () => {
  it('should create root category', async () => {
    // Given
    const data = {
      category_name: "수공예품",
      category_description: "수작업 공예품"
    };

    // When
    const category = await categoryService.createCategory(data);

    // Then
    expect(category.category_name).toBe("수공예품");
    expect(category.category_depth).toBe(1);
    expect(category.parent_category_id).toBeNull();
    expect(category.category_path).toBe(`/${category.category_id}`);
  });

  it('should create child category', async () => {
    // Given: 부모 카테고리 생성
    const parent = await categoryService.createCategory({
      category_name: "수공예품"
    });

    const data = {
      category_name: "도자기",
      parent_category_id: parent.category_id
    };

    // When
    const child = await categoryService.createCategory(data);

    // Then
    expect(child.category_depth).toBe(2);
    expect(child.parent_category_id).toBe(parent.category_id);
  });

  it('should throw error if depth exceeds 3', async () => {
    // Given: 3단계 카테고리 생성
    const depth1 = await categoryService.createCategory({ category_name: "대분류" });
    const depth2 = await categoryService.createCategory({
      category_name: "중분류",
      parent_category_id: depth1.category_id
    });
    const depth3 = await categoryService.createCategory({
      category_name: "소분류",
      parent_category_id: depth2.category_id
    });

    // When & Then: 4단계 생성 시도
    await expect(
      categoryService.createCategory({
        category_name: "4단계",
        parent_category_id: depth3.category_id
      })
    ).rejects.toThrow('Maximum category depth is 3');
  });

  it('should throw error if parent not found', async () => {
    // When & Then
    await expect(
      categoryService.createCategory({
        category_name: "도자기",
        parent_category_id: 999
      })
    ).rejects.toThrow('Parent category not found');
  });

  it('should throw error if parent is inactive', async () => {
    // Given: 비활성 부모 카테고리
    const parent = await categoryService.createCategory({
      category_name: "수공예품"
    });
    await categoryService.updateCategory(parent.category_id, {
      category_is_active: false
    });

    // When & Then
    await expect(
      categoryService.createCategory({
        category_name: "도자기",
        parent_category_id: parent.category_id
      })
    ).rejects.toThrow('Cannot create child under inactive parent');
  });
});
```

### 2. 카테고리 삭제 테스트

```javascript
describe('Category Service - deleteCategory', () => {
  it('should delete category without children and products', async () => {
    // Given: 자식/상품 없는 카테고리
    const category = await categoryService.createCategory({
      category_name: "수공예품"
    });

    // When
    const result = await categoryService.deleteCategory(category.category_id);

    // Then
    expect(result.message).toBe('Category deleted successfully');
    expect(result.deleted_category.category_name).toBe("수공예품");
  });

  it('should throw error if category has children', async () => {
    // Given: 자식이 있는 카테고리
    const parent = await categoryService.createCategory({
      category_name: "수공예품"
    });
    const child = await categoryService.createCategory({
      category_name: "도자기",
      parent_category_id: parent.category_id
    });

    // When & Then
    await expect(
      categoryService.deleteCategory(parent.category_id)
    ).rejects.toThrow('Cannot delete category with');
  });

  it('should throw error if category has products', async () => {
    // Given: 상품이 있는 카테고리
    const category = await categoryService.createCategory({
      category_name: "도자기"
    });

    // 상품 등록 (가정)
    // await productService.createProduct({ category_id: category.category_id, ... });

    // When & Then
    await expect(
      categoryService.deleteCategory(category.category_id)
    ).rejects.toThrow('Cannot delete category with');
  });
});
```

### 3. 카테고리 수정 테스트

```javascript
describe('Category Service - updateCategory', () => {
  it('should update category name', async () => {
    // Given
    const category = await categoryService.createCategory({
      category_name: "도자기"
    });

    // When
    const updated = await categoryService.updateCategory(category.category_id, {
      category_name: "도예품"
    });

    // Then
    expect(updated.category_name).toBe("도예품");
    // category_path는 변경되지 않음 (ID 기반)
    expect(updated.category_path).toBe(category.category_path);
  });

  it('should deactivate category', async () => {
    // Given
    const category = await categoryService.createCategory({
      category_name: "도자기"
    });

    // When
    const updated = await categoryService.updateCategory(category.category_id, {
      category_is_active: false
    });

    // Then
    expect(updated.category_is_active).toBe(false);
  });

  it('should throw error if name is empty', async () => {
    // Given
    const category = await categoryService.createCategory({
      category_name: "도자기"
    });

    // When & Then
    await expect(
      categoryService.updateCategory(category.category_id, {
        category_name: ""
      })
    ).rejects.toThrow('Category name cannot be empty');
  });
});
```

### 4. 카테고리 트리 조회 테스트

```javascript
describe('Category Service - getCategoryTree', () => {
  it('should return hierarchical category tree', async () => {
    // Given: 계층형 카테고리 생성
    const root = await categoryService.createCategory({
      category_name: "수공예품"
    });
    const sub1 = await categoryService.createCategory({
      category_name: "도자기",
      parent_category_id: root.category_id
    });
    const sub2 = await categoryService.createCategory({
      category_name: "목공예",
      parent_category_id: root.category_id
    });
    const leaf = await categoryService.createCategory({
      category_name: "찻잔",
      parent_category_id: sub1.category_id
    });

    // When
    const tree = await categoryService.getCategoryTree();

    // Then
    expect(tree).toHaveLength(1);  // 대분류 1개
    expect(tree[0].category_name).toBe("수공예품");
    expect(tree[0].child_categories).toHaveLength(2);  // 중분류 2개
    expect(tree[0].child_categories[0].child_categories).toHaveLength(1);  // 소분류 1개
  });

  it('should return only active categories by default', async () => {
    // Given: 활성/비활성 카테고리
    const active = await categoryService.createCategory({
      category_name: "활성 카테고리"
    });
    const inactive = await categoryService.createCategory({
      category_name: "비활성 카테고리"
    });
    await categoryService.updateCategory(inactive.category_id, {
      category_is_active: false
    });

    // When: 기본 조회
    const tree = await categoryService.getCategoryTree();

    // Then: 활성만 조회됨
    expect(tree).toHaveLength(1);
    expect(tree[0].category_name).toBe("활성 카테고리");
  });

  it('should include inactive categories when option is true', async () => {
    // Given
    const active = await categoryService.createCategory({
      category_name: "활성 카테고리"
    });
    const inactive = await categoryService.createCategory({
      category_name: "비활성 카테고리"
    });
    await categoryService.updateCategory(inactive.category_id, {
      category_is_active: false
    });

    // When
    const tree = await categoryService.getCategoryTree({
      includeInactive: true
    });

    // Then
    expect(tree).toHaveLength(2);
  });
});
```

---

## 🔗 다음 단계

### Step 2-10: Product Service
다음 단계에서는 Product Service를 만들 예정입니다:

- `src/services/product.service.js`
- 상품 등록 및 관리 비즈니스 로직
- TenantMember 권한 확인 (승인된 구성원만 등록)
- 이미지 업로드 처리
- 필터링, 정렬, 페이징

---

## 📚 참고 자료

### Prisma 공식 문서
- [Prisma Self-Relations](https://www.prisma.io/docs/concepts/components/prisma-schema/relations/self-relations)
- [Prisma Nested Queries](https://www.prisma.io/docs/concepts/components/prisma-client/relation-queries)

### 관련 가이드
- [04. API 개발 가이드](../common/04_API_DEVELOPMENT.md)
- [02. 코딩 표준](../common/02_CODING_STANDARDS.md)

### 이전 단계
- [Step 2-8: TenantMember Service](./2-8_tenantMember_service.md)
- [Step 2-4: Category Repository](./2-4_category_repository.md)

---

**작성일**: 2025년 10월 13일
**작성자**: Backend Team
**상태**: ✅ 완료
