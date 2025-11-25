# Step 9: AdminCategory Service 생성

> **작성일**: 2025년 10월 7일
> **상태**: ✅ 완료
> **파일**: `src/services/admin/adminCategory.service.js`

---

## 📚 개념 설명

### 🎯 AdminCategory Service의 역할

카테고리 관리 Service는 **계층형 구조 관리**를 중심으로 비즈니스 로직을 처리합니다:

- **계층 구조 검증** (최대 depth 3)
- **삭제/비활성화 규칙** (하위 카테고리, 상품 존재 여부)
- **데이터 검증** (카테고리명, 설명 길이)
- **BigInt 변환** (재귀적 중첩 구조)
- **부모-자식 관계 확인**

---

## 🔑 핵심 개념

### 1. 계층 구조 검증

**최대 depth 3 제한:**
```javascript
async function createCategory(categoryData) {
  if (parent_category_id) {
    const parent = await categoryRepo.findById(parent_category_id);

    // 비즈니스 규칙: depth 4 이상 불가
    if (parent.category_depth >= 3) {
      throw new ValidationError('카테고리는 최대 3단계까지만 생성할 수 있습니다');
    }
  }

  // 생성 가능
  return await categoryRepo.create(categoryData);
}
```

**depth 구조:**
```
depth 1: 전자제품 (최상위)
  depth 2: 컴퓨터
    depth 3: 노트북
      depth 4: ❌ 불가능 (3단계 초과)
```

---

### 2. 삭제 규칙

**하위 카테고리 및 상품 확인:**
```javascript
async function deleteCategory(categoryId) {
  const category = await categoryRepo.findById(categoryId);

  // 규칙 1: 하위 카테고리가 있으면 삭제 불가
  const childCount = await categoryRepo.countChildren(categoryId);
  if (childCount > 0) {
    throw new ValidationError('하위 카테고리가 있는 카테고리는 삭제할 수 없습니다. 먼저 하위 카테고리를 삭제해주세요');
  }

  // 규칙 2: 상품이 있으면 삭제 불가
  const productCount = await categoryRepo.countProducts(categoryId);
  if (productCount > 0) {
    throw new ValidationError(`${productCount}개의 상품이 등록된 카테고리는 삭제할 수 없습니다`);
  }

  // 삭제 가능
  return await categoryRepo.deleteById(categoryId);
}
```

**삭제 순서:**
```
1. 최하위 카테고리부터 삭제 (leaf node)
2. 상품 확인 (0개여야 삭제 가능)
3. 부모 카테고리 삭제 (자식 모두 삭제된 후)
```

---

### 3. 비활성화 규칙

**하위 카테고리 및 상품 확인:**
```javascript
async function updateCategory(categoryId, updateData) {
  if (updateData.category_is_active === false) {
    // 규칙 1: 하위 카테고리가 있으면 비활성화 불가
    const childCount = await categoryRepo.countChildren(categoryId);
    if (childCount > 0) {
      throw new ValidationError('하위 카테고리가 있는 카테고리는 비활성화할 수 없습니다');
    }

    // 규칙 2: 상품이 있으면 비활성화 불가
    const productCount = await categoryRepo.countProducts(categoryId);
    if (productCount > 0) {
      throw new ValidationError('상품이 등록된 카테고리는 비활성화할 수 없습니다');
    }
  }

  return await categoryRepo.update(categoryId, { category_is_active: false });
}
```

**비활성화 조건:**
- 하위 카테고리 없음
- 등록된 상품 없음

---

### 4. 부모 카테고리 검증

**비활성 카테고리 하위 생성 불가:**
```javascript
async function createCategory(categoryData) {
  if (parent_category_id) {
    const parent = await categoryRepo.findById(parent_category_id);

    // 규칙: 비활성 카테고리 하위에는 생성 불가
    if (!parent.category_is_active) {
      throw new ValidationError('비활성 카테고리 하위에는 카테고리를 생성할 수 없습니다');
    }
  }

  return await categoryRepo.create(categoryData);
}
```

---

### 5. 재귀적 BigInt 변환

**복잡한 중첩 구조:**
```javascript
async function getCategoryById(categoryId) {
  const category = await categoryRepo.findById(categoryId);

  return {
    ...category,
    category_id: category.category_id.toString(),
    parent_category_id: category.parent_category_id?.toString(),

    // parent_category 변환
    parent_category: category.parent_category ? {
      ...category.parent_category,
      category_id: category.parent_category.category_id.toString(),
      parent_category_id: category.parent_category.parent_category_id?.toString()
    } : null,

    // child_categories 배열 변환
    child_categories: category.child_categories?.map(child => ({
      ...child,
      category_id: child.category_id.toString(),
      parent_category_id: child.parent_category_id?.toString()
    }))
  };
}
```

---

### 6. 데이터 검증

**카테고리명:**
```javascript
// 필수 검증
if (!category_name || category_name.trim().length === 0) {
  throw new ValidationError('카테고리명을 입력해주세요');
}

// 길이 검증
if (category_name.length > 50) {
  throw new ValidationError('카테고리명은 50자 이하로 입력해주세요');
}

// trim 적용
data.category_name = category_name.trim();
```

**설명:**
```javascript
if (category_description && category_description.length > 500) {
  throw new ValidationError('설명은 500자 이하로 입력해주세요');
}
```

**정렬 순서:**
```javascript
if (category_order < 0) {
  throw new ValidationError('정렬 순서는 0 이상이어야 합니다');
}
```

---

## 📦 구현 내용

### 파일 위치
```
src/services/admin/adminCategory.service.js
```

### 주요 함수 (6개)

#### 1. getCategoryList(options)
카테고리 목록 조회 (계층형)

**파라미터:**
```javascript
{
  includeInactive: false  // 비활성 카테고리 포함 여부
}
```

**반환값:**
```javascript
[
  {
    category_id: "1",
    category_name: "전자제품",
    category_depth: 1,
    category_path: "1",
    parent_category_id: null,
    parent_category: null,
    child_categories: [
      {
        category_id: "2",
        category_name: "컴퓨터",
        parent_category_id: "1"
      }
    ]
  }
]
```

**비즈니스 로직:**
- includeInactive 옵션 처리
- 재귀적 BigInt 변환

---

#### 2. getCategoryById(categoryId)
카테고리 상세 조회

**반환값:**
```javascript
{
  category_id: "1",
  category_name: "전자제품",
  category_depth: 1,
  category_path: "1",
  category_order: 0,
  category_is_active: true,
  parent_category: null,
  child_categories: [...]
}
```

**비즈니스 로직:**
- 존재 확인 (NotFoundError)
- 재귀적 BigInt 변환 (parent, children)

---

#### 3. createCategory(categoryData)
카테고리 생성

**파라미터:**
```javascript
{
  category_name: "노트북",
  parent_category_id: 2,
  category_description: "노트북 카테고리",
  category_order: 0
}
```

**비즈니스 로직:**
1. **카테고리명 필수 검증**
2. **카테고리명 길이 검증 (50자 이하)**
3. **부모 카테고리 존재 확인**
4. **최대 depth 3 검증**
5. **비활성 카테고리 하위 생성 불가**
6. **정렬 순서 검증 (0 이상)**
7. **설명 길이 검증 (500자 이하)**
8. trim 적용
9. BigInt 변환

---

#### 4. updateCategory(categoryId, updateData)
카테고리 수정

**파라미터:**
```javascript
{
  category_name: "전자기기",
  category_description: "전자기기 카테고리",
  category_order: 1,
  category_is_active: false
}
```

**비즈니스 로직:**
1. 카테고리 존재 확인
2. **category_name 검증** (필수, 길이)
3. **category_description 검증** (길이)
4. **category_order 검증** (0 이상)
5. **category_is_active 검증:**
   - **하위 카테고리 있으면 비활성화 불가**
   - **상품 있으면 비활성화 불가**
6. trim 적용
7. BigInt 변환

---

#### 5. deleteCategory(categoryId)
카테고리 삭제

**비즈니스 로직:**
1. 카테고리 존재 확인
2. **하위 카테고리 확인** (있으면 삭제 불가)
3. **상품 확인** (있으면 삭제 불가)
4. Repository 호출
5. BigInt 변환

**에러 메시지:**
```javascript
// 하위 카테고리 있음
throw new ValidationError('하위 카테고리가 있는 카테고리는 삭제할 수 없습니다. 먼저 하위 카테고리를 삭제해주세요');

// 상품 있음
throw new ValidationError(`${productCount}개의 상품이 등록된 카테고리는 삭제할 수 없습니다`);
```

---

#### 6. getCategoriesByParent(parentId)
부모 카테고리로 자식 카테고리 조회

**파라미터:**
- `parentId` (number|null): 부모 카테고리 ID (null이면 최상위)

**반환값:**
```javascript
[
  {
    category_id: "2",
    category_name: "컴퓨터",
    parent_category_id: "1",
    category_depth: 2
  },
  {
    category_id: "3",
    category_name: "스마트폰",
    parent_category_id: "1",
    category_depth: 2
  }
]
```

**비즈니스 로직:**
- parentId가 null이 아니면 부모 존재 확인
- Repository 호출
- BigInt 변환

---

## 🔄 사용 예시

### 예시 1: 카테고리 생성

```javascript
// Controller
async function createCategory(req, res, next) {
  try {
    const { category_name, parent_category_id, category_description, category_order } = req.body;

    const created = await categoryService.createCategory({
      category_name,
      parent_category_id: parent_category_id ? parseInt(parent_category_id) : null,
      category_description,
      category_order: category_order || 0
    });

    res.json({
      success: true,
      message: '카테고리가 생성되었습니다',
      data: created
    });
  } catch (error) {
    next(error);
  }
}
```

---

### 예시 2: 카테고리 수정

```javascript
async function updateCategory(req, res, next) {
  try {
    const { categoryId } = req.params;
    const { category_name, category_description, category_order, category_is_active } = req.body;

    const updated = await categoryService.updateCategory(
      parseInt(categoryId),
      { category_name, category_description, category_order, category_is_active }
    );

    res.json({
      success: true,
      message: '카테고리가 수정되었습니다',
      data: updated
    });
  } catch (error) {
    next(error);
  }
}
```

---

### 예시 3: 카테고리 삭제

```javascript
async function deleteCategory(req, res, next) {
  try {
    const { categoryId } = req.params;

    const deleted = await categoryService.deleteCategory(parseInt(categoryId));

    res.json({
      success: true,
      message: '카테고리가 삭제되었습니다',
      data: deleted
    });
  } catch (error) {
    next(error);
  }
}
```

---

### 예시 4: 계층형 카테고리 트리

```javascript
async function getCategoryTree(req, res, next) {
  try {
    // 전체 카테고리 조회
    const categories = await categoryService.getCategoryList({ includeInactive: false });

    // 최상위 카테고리만 필터링
    const topLevel = categories.filter(cat => cat.parent_category_id === null);

    res.json({
      success: true,
      data: topLevel
    });
  } catch (error) {
    next(error);
  }
}
```

---

## ⚠️ 주의사항

### 1. 최대 depth 3 제한
```javascript
// ✅ 올바른 검증
if (parent.category_depth >= 3) {
  throw new ValidationError('카테고리는 최대 3단계까지만 생성할 수 있습니다');
}

// ❌ 잘못된 검증
if (parent.category_depth > 3) {  // depth 4까지 허용됨
  throw new ValidationError('...');
}
```

### 2. 삭제 순서
```javascript
// ✅ 올바른 순서
// 1. 최하위 카테고리 삭제 (노트북)
await categoryService.deleteCategory(3);

// 2. 중간 카테고리 삭제 (컴퓨터)
await categoryService.deleteCategory(2);

// 3. 최상위 카테고리 삭제 (전자제품)
await categoryService.deleteCategory(1);

// ❌ 잘못된 순서
await categoryService.deleteCategory(1);  // 에러: 하위 카테고리 있음
```

### 3. 비활성화 vs 삭제
```javascript
// 비활성화: 하위/상품 있으면 불가
category_is_active: false  // ValidationError

// 삭제: 하위/상품 있으면 불가
deleteCategory(categoryId)  // ValidationError

// 동일한 조건
```

### 4. BigInt 변환 (재귀적)
```javascript
// ✅ 재귀적 변환
parent_category: category.parent_category ? {
  ...category.parent_category,
  category_id: category.parent_category.category_id.toString()
} : null

// ❌ null 체크 없이 변환
parent_category: {
  category_id: category.parent_category.category_id.toString()  // null이면 에러
}
```

### 5. trim 적용
```javascript
// ✅ trim 적용
category_name: category_name.trim()
category_description: category_description?.trim() || null

// ❌ trim 없이 저장
category_name: category_name  // 공백 포함
```

---

## 📝 비즈니스 규칙 요약

### 생성 규칙
- ✅ 카테고리명 필수, 50자 이하
- ✅ 최대 depth 3
- ✅ 비활성 카테고리 하위 생성 불가
- ✅ 정렬 순서 0 이상
- ✅ 설명 500자 이하

### 수정 규칙
- ✅ 카테고리명 50자 이하
- ✅ 설명 500자 이하
- ✅ 정렬 순서 0 이상
- ✅ 비활성화: 하위 카테고리 없고, 상품 없어야 함

### 삭제 규칙
- ✅ 하위 카테고리 없어야 함
- ✅ 등록된 상품 없어야 함
- ✅ 최하위부터 순차 삭제

---

## 📝 다음 단계

✅ **Step 9 완료**

**Repository & Service Layer 완료!**

**다음**: Step 13 - Controllers 생성
- adminMember.controller.js
- adminTenant.controller.js
- adminCategory.controller.js
- HTTP 요청/응답 처리
- 에러 핸들링

---

**작성일**: 2025년 10월 7일
**상태**: ✅ 완료
