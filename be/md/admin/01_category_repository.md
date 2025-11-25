# Step 1: Category Repository 생성

> **작성일**: 2025년 10월 7일
> **상태**: ✅ 완료
> **파일**: `src/repositories/category.repository.js`

---

## 📚 개념 설명

### 🎯 왜 필요한가?

관리자 페이지에서 **카테고리 관리 기능**을 제공하기 위해:
- 관리자가 "수공예품 > 도자기 > 찻잔" 같은 **계층형 카테고리**를 만들 수 있어야 함
- 판매자가 상품을 등록할 때 카테고리를 선택할 수 있어야 함
- 구매자가 상품을 검색할 때 카테고리별로 필터링할 수 있어야 함

### 💡 계층형 카테고리란?

트리 구조로 된 카테고리 시스템:

```
수공예품 (depth: 1, id: 1)
├─ 도자기 (depth: 2, id: 5, parent_id: 1)
│   ├─ 찻잔 (depth: 3, id: 12, parent_id: 5)
│   └─ 접시 (depth: 3, id: 13, parent_id: 5)
└─ 목공예 (depth: 2, id: 6, parent_id: 1)
    └─ 도마 (depth: 3, id: 14, parent_id: 6)
```

### 🗄️ 데이터베이스 구조

**Category 테이블 주요 필드**:
```javascript
{
  category_id: 12,                    // 고유 ID
  category_name: "찻잔",              // 이름
  parent_category_id: 5,              // 부모 ID (도자기)
  category_depth: 3,                  // 깊이 (1=대분류, 2=중분류, 3=소분류)
  category_path: "1/5/12",            // 경로 (루트부터 자신까지)
  category_order: 0,                  // 정렬 순서
  category_is_active: true            // 활성 상태
}
```

---

## 🔑 핵심 개념

### 1. 자기 참조 (Self-Referencing)
- 같은 테이블 내에서 `parent_category_id`가 자신의 테이블을 참조
- 부모-자식 관계를 무한히 확장 가능

### 2. category_path (경로)
- "1/5/12" 형태로 저장
- 조상 카테고리를 빠르게 찾을 수 있음
- 예: "1/5/12"에서 "1"과 "5"는 조상 카테고리

### 3. category_depth (깊이)
- 1 = 대분류 (최상위)
- 2 = 중분류
- 3 = 소분류
- 자동 계산: 부모 depth + 1

### 4. CASCADE 삭제
- 부모 카테고리 삭제 시 → 모든 자식 카테고리도 자동 삭제
- Prisma 스키마에 `onDelete: Cascade` 설정됨

---

## 📦 구현 내용

### 파일 위치
```
src/repositories/category.repository.js
```

### 주요 함수 (8개)

#### 1. findAll(options)
전체 카테고리 조회 (계층형 구조)

**파라미터**:
- `options.includeInactive` (boolean): 비활성 카테고리 포함 여부

**반환값**: 카테고리 배열

**예시**:
```javascript
const categories = await categoryRepository.findAll();
// 활성 카테고리만 조회

const allCategories = await categoryRepository.findAll({ includeInactive: true });
// 비활성 카테고리 포함
```

---

#### 2. findById(categoryId)
ID로 카테고리 상세 조회

**파라미터**:
- `categoryId` (number): 카테고리 ID

**반환값**: 카테고리 객체 (부모, 자식 포함)

**예시**:
```javascript
const category = await categoryRepository.findById(5);
// {
//   category_id: 5,
//   category_name: "도자기",
//   parent_category: { ... },
//   child_categories: [ ... ]
// }
```

---

#### 3. findByParentId(parentId)
부모 ID로 자식 카테고리 조회

**파라미터**:
- `parentId` (number|null): 부모 카테고리 ID (null이면 최상위)

**반환값**: 자식 카테고리 배열

**예시**:
```javascript
// 최상위 카테고리 조회
const topCategories = await categoryRepository.findByParentId(null);

// 특정 카테고리의 자식 조회
const children = await categoryRepository.findByParentId(5);
```

---

#### 4. create(categoryData)
카테고리 생성

**파라미터**:
- `category_name` (string, 필수): 카테고리 이름
- `parent_category_id` (number, 선택): 부모 카테고리 ID
- `category_description` (string, 선택): 설명
- `category_order` (number, 선택): 정렬 순서

**반환값**: 생성된 카테고리 (depth, path 자동 계산됨)

**예시**:
```javascript
// 최상위 카테고리 생성
const category = await categoryRepository.create({
  category_name: "수공예품"
});
// depth: 1, path: "1"

// 하위 카테고리 생성
const subCategory = await categoryRepository.create({
  category_name: "도자기",
  parent_category_id: 1
});
// depth: 2, path: "1/5"
```

**동작 흐름**:
1. 부모 카테고리 정보 조회
2. depth 계산 (부모 depth + 1)
3. path 계산 (부모 path + 부모 ID)
4. 카테고리 생성
5. path에 자신의 ID 추가

---

#### 5. update(categoryId, updateData)
카테고리 수정

**파라미터**:
- `categoryId` (number): 카테고리 ID
- `updateData` (object): 수정할 데이터
  - `category_name`: 이름
  - `category_description`: 설명
  - `category_order`: 정렬 순서
  - `category_is_active`: 활성 상태

**반환값**: 수정된 카테고리

**예시**:
```javascript
const updated = await categoryRepository.update(5, {
  category_name: "도자기 (수정)",
  category_order: 1
});
```

---

#### 6. deleteById(categoryId)
카테고리 삭제 (CASCADE)

**파라미터**:
- `categoryId` (number): 카테고리 ID

**반환값**: 삭제된 카테고리

**주의사항**:
- 하위 카테고리도 모두 자동 삭제됨 (CASCADE)
- 해당 카테고리에 상품이 있으면 삭제 실패 (RESTRICT)

**예시**:
```javascript
await categoryRepository.deleteById(5);
// 카테고리 5와 모든 하위 카테고리 삭제
```

---

#### 7. countChildren(categoryId)
하위 카테고리 개수 조회

**파라미터**:
- `categoryId` (number): 카테고리 ID

**반환값**: 자식 카테고리 개수 (number)

**예시**:
```javascript
const count = await categoryRepository.countChildren(5);
// 2 (찻잔, 접시)
```

---

#### 8. countProducts(categoryId)
카테고리에 속한 상품 개수 조회

**파라미터**:
- `categoryId` (number): 카테고리 ID

**반환값**: 상품 개수 (number)

**예시**:
```javascript
const count = await categoryRepository.countProducts(5);
// 15 (도자기 카테고리의 상품 수)
```

---

## 🔄 동작 흐름 예시

### 카테고리 생성 과정

**시나리오**: "도자기" 카테고리 아래에 "찻잔" 추가

```javascript
// 1. 부모 카테고리 조회
const parent = await findById(5); // 도자기
// {
//   category_id: 5,
//   category_depth: 2,
//   category_path: "1/5"
// }

// 2. depth 계산
depth = parent.category_depth + 1; // 2 + 1 = 3

// 3. path 계산 (부모 path + 부모 ID)
path = `${parent.category_path}/${parent.category_id}`; // "1/5"

// 4. 카테고리 생성
const newCategory = await create({
  category_name: "찻잔",
  parent_category_id: 5
});

// 5. 생성 후 자신의 ID를 path에 추가
// category_path: "1/5/12"
```

---

## 📊 사용 예시

### 1. 전체 카테고리 트리 조회
```javascript
const categories = await categoryRepository.findAll();

// 결과를 계층형 구조로 변환
const tree = buildCategoryTree(categories);
```

### 2. 최상위 카테고리만 조회
```javascript
const topCategories = await categoryRepository.findByParentId(null);
```

### 3. 카테고리 삭제 전 확인
```javascript
const childCount = await categoryRepository.countChildren(categoryId);
const productCount = await categoryRepository.countProducts(categoryId);

if (childCount > 0) {
  console.log(`${childCount}개의 하위 카테고리가 함께 삭제됩니다.`);
}

if (productCount > 0) {
  throw new Error('상품이 있는 카테고리는 삭제할 수 없습니다.');
}

await categoryRepository.deleteById(categoryId);
```

---

## ⚠️ 주의사항

### 1. BigInt 처리
Prisma에서 BIGINT 타입은 `BigInt()`로 변환 필요:
```javascript
category_id: BigInt(categoryId)
```

### 2. CASCADE 삭제
- 카테고리 삭제 시 모든 하위 카테고리도 삭제됨
- 삭제 전 사용자에게 경고 필요

### 3. RESTRICT 정책
- 상품이 속한 카테고리는 삭제 불가
- `countProducts()`로 사전 확인 필요

### 4. path 자동 생성
- 카테고리 생성 시 path가 자동으로 계산됨
- 수동으로 path를 수정하면 안 됨

---

## 🧪 테스트 시나리오

### 1. 카테고리 생성
```javascript
// 최상위 카테고리
const category1 = await create({ category_name: "수공예품" });
// depth: 1, path: "1"

// 하위 카테고리
const category2 = await create({
  category_name: "도자기",
  parent_category_id: 1
});
// depth: 2, path: "1/5"
```

### 2. 카테고리 조회
```javascript
const all = await findAll();
const byId = await findById(5);
const children = await findByParentId(1);
```

### 3. 카테고리 수정
```javascript
await update(5, { category_name: "도자기 공예" });
```

### 4. 카테고리 삭제
```javascript
await deleteById(5);
```

---

## 📝 다음 단계

✅ **Step 1 완료**

**다음**: Step 2 - AdminMember Repository 생성
- 회원 목록 조회 (페이징, 필터링)
- 회원 상태 변경
- 회원 역할 변경
- 회원 통계

---

**작성일**: 2025년 10월 7일
**상태**: ✅ 완료
