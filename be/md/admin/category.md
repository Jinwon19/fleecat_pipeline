# 카테고리 관리 어드민 페이지 완전 가이드

> **작성일**: 2025년 10월 10일
> **상태**: ✅ 완료
> **페이지**: `/public/admin/categories.html`

---

## 📚 목차

1. [개념 설명](#1-개념-설명)
2. [데이터베이스 구조](#2-데이터베이스-구조)
3. [백엔드 아키텍처](#3-백엔드-아키텍처)
4. [계층형 데이터 구조](#4-계층형-데이터-구조)
5. [API 엔드포인트](#5-api-엔드포인트)
6. [프론트엔드 구현](#6-프론트엔드-구현)
7. [주요 함수 설명](#7-주요-함수-설명)
8. [사용 시나리오](#8-사용-시나리오)

---

## 1. 개념 설명

### 1.1 카테고리 관리란?

카테고리 관리는 **전자상거래 플랫폼에서 상품을 체계적으로 분류**하기 위한 핵심 기능입니다.

**목적**:
- 🛍️ **상품 분류**: 수천 개의 상품을 체계적으로 정리
- 🔍 **검색 최적화**: 사용자가 원하는 상품을 빠르게 찾도록 지원
- 📊 **데이터 분석**: 카테고리별 판매 통계 및 트렌드 분석

### 1.2 계층형 카테고리 구조

Fleecat은 **3단계 계층형 카테고리 시스템**을 사용합니다:

```
대분류 (Depth 1)
├─ 중분류 (Depth 2)
│   ├─ 소분류 (Depth 3)
│   └─ 소분류 (Depth 3)
└─ 중분류 (Depth 2)
    └─ 소분류 (Depth 3)
```

**예시**:
```
수제공예 (대분류)
├─ 도자기 (중분류)
│   ├─ 찻잔/컵 (소분류)
│   └─ 접시/그릇 (소분류)
└─ 가죽제품 (중분류)
    └─ 지갑 (소분류)
```

### 1.3 핵심 특징

#### ✅ ID 기반 경로 (category_path)

카테고리 경로는 **ID를 슬래시로 연결**하여 자동 생성됩니다:

- 대분류 (ID: 4): `/4`
- 중분류 (ID: 10, 부모: 4): `/4/10`
- 소분류 (ID: 100, 부모: 10): `/4/10/100`

**장점**:
- 🚀 **성능**: 조상 카테고리 조회가 빠름 (path 파싱만으로 가능)
- 🔒 **안정성**: 카테고리 이름이 변경되어도 path는 변하지 않음
- 🔍 **쿼리 최적화**: `category_path LIKE '/4/%'`로 모든 하위 카테고리 검색 가능

#### ✅ 자기 참조 (Self-Referencing)

Category 테이블은 `parent_category_id`를 통해 **자기 자신을 참조**합니다:

```prisma
model Category {
  category_id        BigInt
  parent_category_id BigInt?

  parent_category  Category?  @relation("CategoryHierarchy", fields: [parent_category_id], references: [category_id])
  child_categories Category[] @relation("CategoryHierarchy")
}
```

#### ✅ CASCADE 삭제 정책

부모 카테고리 삭제 시 **모든 하위 카테고리도 자동 삭제**됩니다:

```prisma
parent_category Category? @relation(onDelete: Cascade)
```

**안전 장치**:
- 하위 카테고리가 있으면 삭제 전 경고
- 상품이 등록된 카테고리는 삭제 불가 (비즈니스 로직에서 차단)

---

## 2. 데이터베이스 구조

### 2.1 Category 테이블 스키마

| 컬럼명 | 타입 | 설명 | 예시 |
|--------|------|------|------|
| `category_id` | BIGINT | 기본키 (자동 증가) | `4` |
| `parent_category_id` | BIGINT | 부모 카테고리 ID (NULL이면 대분류) | `NULL` (대분류), `4` (중분류) |
| `category_name` | VARCHAR(50) | 카테고리 이름 | `수제공예` |
| `category_description` | TEXT | 설명 (선택) | `핸드메이드 공예품` |
| `category_depth` | INT | 깊이 (1~3) | `1` (대분류), `2` (중분류), `3` (소분류) |
| `category_order` | INT | 정렬 순서 | `0`, `1`, `2` |
| `category_path` | VARCHAR(255) | ID 기반 경로 | `/4`, `/4/10`, `/4/10/100` |
| `category_is_active` | BOOLEAN | 활성 상태 | `true`, `false` |
| `category_created_at` | TIMESTAMP | 생성 일시 | `2025-10-10 10:30:00` |
| `category_updated_at` | TIMESTAMP | 수정 일시 | `2025-10-10 10:30:00` |

### 2.2 인덱스 설정

성능 최적화를 위한 인덱스:

```prisma
@@index([parent_category_id])           // 하위 카테고리 조회
@@index([category_depth])                // Depth별 조회
@@index([category_path])                 // Path 기반 조회
@@index([parent_category_id, category_order])  // 정렬된 하위 카테고리 조회
@@index([category_is_active])            // 활성 카테고리 필터링
```

### 2.3 비즈니스 규칙

| 규칙 | 설명 | 구현 위치 |
|------|------|-----------|
| **최대 깊이 3단계** | depth 4 이상 생성 불가 | Service Layer |
| **path 자동 생성** | 카테고리 생성 시 자동 계산 | Repository Layer |
| **하위 카테고리 있으면 삭제 불가** | 먼저 하위 카테고리 삭제 필요 | Service Layer |
| **상품 있으면 삭제/비활성화 불가** | 상품 이동 후 삭제 | Service Layer |
| **비활성 카테고리 하위에 생성 불가** | 부모가 active여야 함 | Service Layer |

---

## 3. 백엔드 아키텍처

### 3.1 파일 구조

```
src/
├── repositories/
│   ├── category.repository.js       # 범용 카테고리 Repository
│   └── admin.repository.js           # 어드민용 Repository (레거시)
├── services/
│   ├── admin/
│   │   └── adminCategory.service.js  # 어드민 카테고리 Service
│   └── admin.service.js              # 레거시 Service
├── controllers/
│   └── admin/
│       └── adminCategory.controller.js
└── routes/
    └── admin/
        └── adminCategory.routes.js
```

### 3.2 레이어별 역할

#### 📦 Repository Layer (`category.repository.js`)

**역할**: 데이터베이스 직접 접근 (Prisma 사용)

**주요 함수**:
- `findAll()`: 대분류만 조회, child_categories에 중/소분류 포함
- `findById()`: ID로 단일 카테고리 조회
- `findByParentId()`: 부모 ID로 자식 카테고리 조회
- `create()`: 카테고리 생성 및 path 자동 계산
- `update()`: 카테고리 수정
- `deleteById()`: 카테고리 삭제
- `countChildren()`: 하위 카테고리 개수
- `countProducts()`: 카테고리 내 상품 개수

#### 🧠 Service Layer (`adminCategory.service.js`)

**역할**: 비즈니스 로직 처리 및 유효성 검증

**주요 기능**:
- 유효성 검증 (이름 길이, depth 제한 등)
- 비즈니스 규칙 적용 (삭제 제한, 비활성화 제한)
- BigInt → String 변환 (JSON 직렬화 문제 해결)
- 재귀적 데이터 변환 (`convertBigIntToString`)

#### 🎮 Controller Layer (`adminCategory.controller.js`)

**역할**: HTTP 요청/응답 처리

**주요 함수**:
- `getCategoryList()`: GET /api/v1/admin/categories
- `getCategoryById()`: GET /api/v1/admin/categories/:id
- `createCategory()`: POST /api/v1/admin/categories
- `updateCategory()`: PATCH /api/v1/admin/categories/:id
- `deleteCategory()`: DELETE /api/v1/admin/categories/:id
- `getCategoriesByParent()`: GET /api/v1/admin/categories/parent/:parentId

#### 🛣️ Route Layer (`adminCategory.routes.js`)

**역할**: URL 라우팅 및 미들웨어 연결

```javascript
router.post('/', adminCategoryController.createCategory);
router.get('/', adminCategoryController.getCategoryList);
router.get('/:id', adminCategoryController.getCategoryById);
router.patch('/:id', adminCategoryController.updateCategory);
router.delete('/:id', adminCategoryController.deleteCategory);
```

---

## 4. 계층형 데이터 구조

### 4.1 API 응답 구조

**GET /api/v1/admin/categories**

```json
{
  "success": true,
  "message": "카테고리 목록을 조회했습니다.",
  "data": [
    {
      "category_id": "4",
      "category_name": "수제공예",
      "category_depth": 1,
      "category_path": "/4",
      "child_categories": [
        {
          "category_id": "10",
          "category_name": "도자기",
          "category_depth": 2,
          "category_path": "/4/10",
          "child_categories": [
            {
              "category_id": "100",
              "category_name": "찻잔/컵",
              "category_depth": 3,
              "category_path": "/4/10/100"
            }
          ]
        }
      ]
    }
  ]
}
```

### 4.2 계층형 구조의 특징

#### ✅ 장점

1. **메모리 효율**: 중복 데이터 없음 (플랫 구조 대비 50% 절감)
2. **관계 명확**: 부모-자식 관계가 구조에 바로 표현됨
3. **쿼리 최적화**: 1번의 쿼리로 전체 트리 로드 가능

#### ⚠️ 단점

1. **렌더링 복잡도**: 재귀적 렌더링 필요
2. **검색 어려움**: 특정 depth의 카테고리를 바로 찾기 어려움

### 4.3 플랫 구조 변환

프론트엔드에서 **재귀적으로 플랫하게 변환**:

**입력** (계층형):
```json
[
  {
    "category_id": "4",
    "child_categories": [
      {
        "category_id": "10",
        "child_categories": [
          { "category_id": "100" }
        ]
      }
    ]
  }
]
```

**출력** (플랫):
```json
[
  { "category_id": "4", "category_depth": 1 },
  { "category_id": "10", "category_depth": 2 },
  { "category_id": "100", "category_depth": 3 }
]
```

---

## 5. API 엔드포인트

### 5.1 전체 카테고리 조회

**Request**:
```http
GET /api/v1/admin/categories?includeInactive=false
```

**Query Parameters**:
- `includeInactive`: (boolean) 비활성 카테고리 포함 여부

**Response**:
```json
{
  "success": true,
  "message": "카테고리 목록을 조회했습니다.",
  "data": [
    {
      "category_id": "1",
      "parent_category_id": null,
      "category_name": "수제공예",
      "category_depth": 1,
      "category_path": "/1",
      "category_is_active": true,
      "child_categories": [...]
    }
  ]
}
```

### 5.2 카테고리 생성

**Request**:
```http
POST /api/v1/admin/categories
Content-Type: application/json

{
  "category_name": "도자기",
  "parent_category_id": 4,
  "category_description": "전통 도자기 및 현대 도예품",
  "category_order": 0
}
```

**Response**:
```json
{
  "success": true,
  "message": "카테고리가 생성되었습니다.",
  "data": {
    "category_id": "10",
    "category_name": "도자기",
    "category_depth": 2,
    "category_path": "/4/10",
    "parent_category": {
      "category_id": "4",
      "category_name": "수제공예"
    }
  }
}
```

### 5.3 카테고리 수정

**Request**:
```http
PATCH /api/v1/admin/categories/10
Content-Type: application/json

{
  "category_name": "도자기 공예",
  "category_description": "핸드메이드 도자기",
  "category_order": 1
}
```

### 5.4 카테고리 삭제

**Request**:
```http
DELETE /api/v1/admin/categories/10
```

**Response** (성공):
```json
{
  "success": true,
  "message": "카테고리가 삭제되었습니다."
}
```

**Response** (실패 - 하위 카테고리 있음):
```json
{
  "success": false,
  "message": "하위 카테고리가 있는 카테고리는 삭제할 수 없습니다. 먼저 하위 카테고리를 삭제해주세요"
}
```

### 5.5 부모 ID로 자식 카테고리 조회

**Request**:
```http
GET /api/v1/admin/categories/parent/4
```

**Response**:
```json
{
  "success": true,
  "message": "하위 카테고리 목록을 조회했습니다.",
  "data": [
    {
      "category_id": "10",
      "category_name": "도자기",
      "parent_category_id": "4"
    },
    {
      "category_id": "11",
      "category_name": "가죽제품",
      "parent_category_id": "4"
    }
  ]
}
```

---

## 6. 프론트엔드 구현

### 6.1 페이지 구조

**파일 위치**: `/public/admin/categories.html`

**주요 섹션**:

1. **대분류 등록 (Section 1)**
   - 카테고리 이름 입력
   - 설명 입력 (선택)
   - 등록 버튼

2. **중분류 등록 (Section 2)**
   - 대분류 선택 (드롭다운)
   - 카테고리 이름 입력
   - 설명 입력 (선택)
   - 등록 버튼

3. **소분류 등록 (Section 3)**
   - 대분류 선택 → 중분류 선택 (계단식)
   - 카테고리 이름 입력
   - 설명 입력 (선택)
   - 등록 버튼

4. **전체 카테고리 목록 (Section 4)**
   - 계층형 시각화 (들여쓰기)
   - 활성화/비활성화 토글 버튼
   - 새로고침 버튼

### 6.2 UI/UX 특징

#### 🎨 시각적 구분

**Depth별 색상 구분**:
- 대분류: 파란색 (`#007bff`)
- 중분류: 녹색 (`#28a745`)
- 소분류: 노란색 (`#ffc107`)

**들여쓰기**:
```css
.category-item.depth-2 {
    margin-left: 30px;  /* 중분류 */
}

.category-item.depth-3 {
    margin-left: 60px;  /* 소분류 */
}
```

#### 🔄 계단식 선택 (Cascade Selection)

소분류 등록 시:
1. 대분류 선택 → 해당 대분류의 중분류 로드
2. 중분류 선택 → 소분류 등록 가능

```javascript
// 대분류 변경 시 중분류 로드
document.getElementById('category1SelectFor3').addEventListener('change', loadCategory2For3);
```

---

## 7. 주요 함수 설명

### 7.1 백엔드 함수

#### 📦 Repository: `create(categoryData)`

**위치**: `src/repositories/category.repository.js:62-109`

**역할**: 카테고리 생성 및 ID 기반 path 자동 계산

**동작 흐름**:
```javascript
async function create(categoryData) {
  // 1. 부모 카테고리 조회 (parent_category_id가 있을 때)
  let parent_path = null;
  if (parent_category_id) {
    const parent = await findById(parent_category_id);
    parent_path = parent.category_path;  // 예: "/4"
  }

  // 2. 카테고리 생성 (path는 임시로 null)
  const created = await prisma.category.create({
    data: {
      category_name,
      category_depth: parent ? parent.category_depth + 1 : 1,
      category_path: null  // 임시
    }
  });

  // 3. 생성된 ID로 path 계산
  const category_path = parent_path
    ? `${parent_path}/${created.category_id}`  // "/4/10"
    : `/${created.category_id}`;               // "/4"

  // 4. path 업데이트
  const updated = await prisma.category.update({
    where: { category_id: created.category_id },
    data: { category_path }
  });

  return updated;
}
```

**왜 2단계로 나눴는가?**
- 생성 전에는 자신의 ID를 알 수 없음
- 생성 후 ID를 path에 포함시켜야 함

#### 📦 Repository: `findAll({ includeInactive })`

**위치**: `src/repositories/category.repository.js:12-37`

**역할**: 대분류만 조회, 중/소분류는 `child_categories`에 포함

**쿼리**:
```javascript
await prisma.category.findMany({
  where: {
    parent_category_id: null,  // 대분류만
    category_is_active: !includeInactive ? true : undefined
  },
  include: {
    child_categories: {
      include: {
        child_categories: true  // 소분류까지 3단계
      },
      orderBy: { category_order: 'asc' }
    }
  },
  orderBy: { category_order: 'asc' }
});
```

**결과 구조**:
```json
[
  {
    "category_id": 4,
    "category_depth": 1,
    "child_categories": [
      {
        "category_id": 10,
        "category_depth": 2,
        "child_categories": [
          { "category_id": 100, "category_depth": 3 }
        ]
      }
    ]
  }
]
```

#### 🧠 Service: `convertBigIntToString(category)`

**위치**: `src/services/admin/adminCategory.service.js:12-34`

**역할**: BigInt를 문자열로 재귀 변환

**문제**:
- PostgreSQL BIGINT는 JavaScript에서 `BigInt` 타입
- JSON.stringify() 시 에러 발생

**해결**:
```javascript
function convertBigIntToString(category) {
  if (!category) return null;

  const converted = {
    ...category,
    category_id: category.category_id.toString(),
    parent_category_id: category.parent_category_id?.toString()
  };

  // 재귀: child_categories도 변환
  if (category.child_categories && category.child_categories.length > 0) {
    converted.child_categories = category.child_categories.map(child =>
      convertBigIntToString(child)  // 재귀 호출
    );
  }

  return converted;
}
```

#### 🧠 Service: `deleteCategory(categoryId)`

**위치**: `src/services/admin/adminCategory.service.js:231-259`

**역할**: 삭제 전 안전성 검사

**비즈니스 로직**:
```javascript
async function deleteCategory(categoryId) {
  // 1. 존재 확인
  const category = await categoryRepo.findById(categoryId);
  if (!category) {
    throw new NotFoundError(`카테고리를 찾을 수 없습니다`);
  }

  // 2. 하위 카테고리 확인
  const childCount = await categoryRepo.countChildren(categoryId);
  if (childCount > 0) {
    throw new ValidationError('하위 카테고리가 있는 카테고리는 삭제할 수 없습니다');
  }

  // 3. 상품 확인
  const productCount = await categoryRepo.countProducts(categoryId);
  if (productCount > 0) {
    throw new ValidationError(`${productCount}개의 상품이 등록된 카테고리는 삭제할 수 없습니다`);
  }

  // 4. 삭제 실행
  return await categoryRepo.deleteById(categoryId);
}
```

### 7.2 프론트엔드 함수

#### 🎨 Frontend: `flattenCategories(categories)`

**위치**: `/public/admin/categories.html:430-444`

**역할**: 계층형 구조를 플랫한 배열로 변환

**입력** (계층형):
```javascript
[
  {
    category_id: "4",
    category_name: "수제공예",
    child_categories: [
      {
        category_id: "10",
        category_name: "도자기",
        child_categories: [
          { category_id: "100", category_name: "찻잔" }
        ]
      }
    ]
  }
]
```

**출력** (플랫):
```javascript
[
  { category_id: "4", category_name: "수제공예", category_depth: 1 },
  { category_id: "10", category_name: "도자기", category_depth: 2 },
  { category_id: "100", category_name: "찻잔", category_depth: 3 }
]
```

**구현**:
```javascript
function flattenCategories(categories) {
  const result = [];

  function traverse(cats) {
    cats.forEach(cat => {
      result.push(cat);
      // 재귀: child_categories가 있으면 탐색
      if (cat.child_categories && cat.child_categories.length > 0) {
        traverse(cat.child_categories);
      }
    });
  }

  traverse(categories);
  return result;
}
```

**왜 필요한가?**
- 렌더링 시 모든 카테고리를 순회하기 위해
- depth별 들여쓰기를 적용하기 위해

#### 🎨 Frontend: `renderCategoryList(categories)`

**위치**: `/public/admin/categories.html:447-488`

**역할**: 카테고리 목록을 HTML로 렌더링

**동작 흐름**:
```javascript
function renderCategoryList(categories) {
  // 1. 계층형 → 플랫 변환
  const flatCategories = flattenCategories(categories);

  // 2. path 순으로 정렬
  const sorted = flatCategories.sort((a, b) =>
    (a.category_path || '').localeCompare(b.category_path || '')
  );

  // 3. HTML 생성
  let html = '';
  sorted.forEach(cat => {
    const depthClass = `depth-${cat.category_depth}`;  // CSS 클래스
    const badgeClass = `badge-depth${cat.category_depth}`;

    html += `
      <div class="category-item ${depthClass}">
        <span class="category-badge ${badgeClass}">
          ${cat.category_depth === 1 ? '대분류' :
            cat.category_depth === 2 ? '중분류' : '소분류'}
        </span>
        <strong>${cat.category_name}</strong>
        <span>(${cat.category_path})</span>
      </div>
    `;
  });

  container.innerHTML = html;
}
```

#### 🎨 Frontend: `loadCategory2For3()`

**위치**: `/public/admin/categories.html:369-396`

**역할**: 대분류 선택 시 해당 중분류 로드 (계단식 선택)

**동작 흐름**:
```javascript
async function loadCategory2For3() {
  const parentId = document.getElementById('category1SelectFor3').value;

  if (!parentId) {
    // 대분류 선택 안 함
    return;
  }

  // API 호출 (계층형 구조)
  const response = await apiCall('GET', '/api/v1/admin/categories');

  // 선택된 대분류 찾기
  const parent = response.data.find(cat => cat.category_id === parentId);

  // 해당 대분류의 child_categories 추출
  if (parent && parent.child_categories && parent.child_categories.length > 0) {
    const categories2 = parent.child_categories;

    // 드롭다운 업데이트
    select.innerHTML = '<option value="">중분류를 선택하세요</option>' +
      categories2.map(cat =>
        `<option value="${cat.category_id}">${cat.category_name}</option>`
      ).join('');
  }
}
```

**왜 계층형에서 찾는가?**
- API는 대분류만 반환 (중분류는 `child_categories`에)
- 플랫한 배열을 filter하는 것보다 효율적

---

## 8. 사용 시나리오

### 8.1 대분류 등록

**시나리오**: "수제공예" 대분류 등록

1. 사용자: "수제공예" 입력 → 등록 버튼 클릭
2. Frontend: `registerCategory1()` 호출
3. API: `POST /api/v1/admin/categories`
   ```json
   {
     "category_name": "수제공예",
     "parent_category_id": null
   }
   ```
4. Service: 유효성 검증 (이름 50자 이하 확인)
5. Repository: 카테고리 생성
   - depth = 1 (부모 없음)
   - path = "/4" (생성된 ID 포함)
6. 응답 반환 → 목록 새로고침

**결과**:
```
📋 전체 카테고리 목록
- 수제공예 (대분류) (/4)
```

### 8.2 중분류 등록

**시나리오**: "수제공예" 아래 "도자기" 중분류 등록

1. 사용자: 대분류 드롭다운에서 "수제공예" 선택
2. 사용자: "도자기" 입력 → 등록 버튼 클릭
3. API: `POST /api/v1/admin/categories`
   ```json
   {
     "category_name": "도자기",
     "parent_category_id": 4
   }
   ```
4. Service: 부모 카테고리 검증 (존재 확인, depth 확인)
5. Repository:
   - 부모 조회 → depth = 2 (부모 depth + 1)
   - 부모 path = "/4" → 새 path = "/4/10"
6. 응답 반환 → 목록 새로고침

**결과**:
```
📋 전체 카테고리 목록
- 수제공예 (대분류) (/4)
  - 도자기 (중분류) (/4/10)
```

### 8.3 소분류 등록 (계단식)

**시나리오**: "도자기" 아래 "찻잔/컵" 소분류 등록

1. 사용자: 대분류 "수제공예" 선택
2. Frontend: `loadCategory2For3()` 호출
   - 계층형 구조에서 "수제공예" 찾기
   - `child_categories` 추출 → "도자기" 표시
3. 사용자: 중분류 "도자기" 선택
4. 사용자: "찻잔/컵" 입력 → 등록 버튼 클릭
5. API: `POST /api/v1/admin/categories`
   ```json
   {
     "category_name": "찻잔/컵",
     "parent_category_id": 10
   }
   ```
6. Repository:
   - 부모 조회 → depth = 3
   - 부모 path = "/4/10" → 새 path = "/4/10/100"

**결과**:
```
📋 전체 카테고리 목록
- 수제공예 (대분류) (/4)
  - 도자기 (중분류) (/4/10)
    - 찻잔/컵 (소분류) (/4/10/100)
```

### 8.4 삭제 시도 (실패)

**시나리오**: 하위 카테고리가 있는 "도자기" 삭제 시도

1. 사용자: "도자기" 카테고리의 삭제 버튼 클릭
2. API: `DELETE /api/v1/admin/categories/10`
3. Service: `deleteCategory(10)` 호출
4. 하위 카테고리 확인:
   ```javascript
   const childCount = await categoryRepo.countChildren(10);
   // childCount = 1 (찻잔/컵)
   ```
5. ValidationError 발생:
   ```
   "하위 카테고리가 있는 카테고리는 삭제할 수 없습니다. 먼저 하위 카테고리를 삭제해주세요"
   ```
6. 사용자에게 에러 메시지 표시

**해결 방법**: 먼저 "찻잔/컵" 삭제 → 그 다음 "도자기" 삭제

### 8.5 카테고리 비활성화

**시나리오**: "도자기" 카테고리 비활성화

1. 사용자: "비활성화" 버튼 클릭
2. API: `PATCH /api/v1/admin/categories/10`
   ```json
   {
     "category_is_active": false
   }
   ```
3. Service: 비활성화 가능 여부 확인
   - 하위 카테고리 있는지 확인
   - 상품 있는지 확인
4. Repository: 업데이트 실행
5. 응답 반환 → 목록 새로고침

**결과**: "도자기" 카테고리가 비활성 상태로 변경 (상품 등록 불가)

---

## 9. 트러블슈팅

### 9.1 문제: 중분류/소분류가 목록에 표시 안 됨

**원인**: 프론트엔드가 플랫한 배열을 기대하지만, API는 계층형 구조 반환

**증상**:
```
📋 전체 카테고리 목록
- 수제공예 (대분류)
- 식품 (대분류)
```
→ 중분류/소분류가 보이지 않음

**해결**:
```javascript
// Before (잘못된 방식)
sorted.forEach(cat => {
  // categories 배열에 대분류만 있음
});

// After (올바른 방식)
const flatCategories = flattenCategories(categories);  // 재귀 변환
sorted.forEach(cat => {
  // 모든 depth의 카테고리 표시
});
```

### 9.2 문제: BigInt JSON 직렬화 에러

**원인**: PostgreSQL BIGINT가 JavaScript BigInt로 변환되어 JSON.stringify() 실패

**에러 메시지**:
```
TypeError: Do not know how to serialize a BigInt
```

**해결**: Service Layer에서 String 변환
```javascript
return {
  ...category,
  category_id: category.category_id.toString(),
  parent_category_id: category.parent_category_id?.toString()
};
```

### 9.3 문제: category_path에 슬래시 누락

**원인**: 최상위 카테고리 생성 시 path가 ID만 저장됨

**Before**:
```javascript
const category_path = parent_path
  ? `${parent_path}/${created.category_id}`
  : `${created.category_id}`;  // ❌ "4"
```

**After**:
```javascript
const category_path = parent_path
  ? `${parent_path}/${created.category_id}`
  : `/${created.category_id}`;  // ✅ "/4"
```

### 9.4 문제: 중분류 선택 드롭다운이 비어있음

**원인**: 계층형 구조에서 `filter`로 depth=2 검색 불가

**Before** (잘못된 방식):
```javascript
const categories2 = response.data.filter(cat =>
  cat.category_depth === 2  // ❌ data는 대분류만 있음
);
```

**After** (올바른 방식):
```javascript
const parent = response.data.find(cat => cat.category_id === parentId);
const categories2 = parent.child_categories;  // ✅ 직접 접근
```

---

## 10. 성능 최적화

### 10.1 인덱스 활용

**조회 성능 향상**:

```sql
-- 1. 하위 카테고리 조회
SELECT * FROM category WHERE parent_category_id = 4;
-- 인덱스: (parent_category_id)

-- 2. 경로 기반 조회 (모든 하위 카테고리)
SELECT * FROM category WHERE category_path LIKE '/4/%';
-- 인덱스: (category_path)

-- 3. Depth별 조회
SELECT * FROM category WHERE category_depth = 2;
-- 인덱스: (category_depth)
```

### 10.2 쿼리 최적화

**1회 쿼리로 전체 트리 로드**:

```javascript
// ❌ N+1 문제 (나쁜 예)
const categories1 = await prisma.category.findMany({ where: { depth: 1 } });
for (const cat of categories1) {
  cat.children = await prisma.category.findMany({
    where: { parent_category_id: cat.category_id }
  });
}

// ✅ 1회 쿼리 (좋은 예)
const categories = await prisma.category.findMany({
  where: { parent_category_id: null },
  include: {
    child_categories: {
      include: { child_categories: true }
    }
  }
});
```

### 10.3 캐싱 전략

**카테고리는 변경이 드문 데이터** → 캐싱 효과적

```javascript
// Redis 캐싱 예시
const CACHE_KEY = 'categories:all';
const CACHE_TTL = 3600; // 1시간

async function getCategoryList() {
  // 1. 캐시 확인
  const cached = await redis.get(CACHE_KEY);
  if (cached) return JSON.parse(cached);

  // 2. DB 조회
  const categories = await categoryRepo.findAll();

  // 3. 캐시 저장
  await redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(categories));

  return categories;
}
```

---

## 11. 보안 고려사항

### 11.1 인증/인가

**현재 상태**: 인증 미들웨어 주석 처리 (개발 중)

```javascript
// TODO: 프로덕션 환경에서는 인증 미들웨어 활성화 필요
// router.use(authenticate);
// router.use(authorize('admin'));
```

**프로덕션 배포 전 필수**:
```javascript
router.use(authenticate);         // JWT 토큰 검증
router.use(authorize('admin'));   // 관리자 권한 확인
```

### 11.2 입력 검증

**XSS 방지**:
```javascript
// Service Layer에서 검증
if (category_name.length > 50) {
  throw new ValidationError('카테고리명은 50자 이하로 입력해주세요');
}

// HTML 이스케이프 (프론트엔드)
const escapedName = category_name
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');
```

### 11.3 SQL Injection 방지

**Prisma 사용으로 자동 방어**:
```javascript
// ✅ Prisma (안전)
await prisma.category.findUnique({
  where: { category_id: categoryId }  // 자동 이스케이프
});

// ❌ Raw SQL (위험)
await prisma.$queryRaw`
  SELECT * FROM category WHERE category_id = ${categoryId}
`;
```

---

## 12. 확장 가능성

### 12.1 다국어 지원

**카테고리 번역 테이블 추가**:

```prisma
model CategoryTranslation {
  id                BigInt   @id @default(autoincrement())
  category_id       BigInt
  language_code     String   @db.VarChar(5)  // 'ko', 'en', 'ja'
  translated_name   String   @db.VarChar(100)

  category Category @relation(fields: [category_id], references: [category_id])

  @@unique([category_id, language_code])
}
```

**API 확장**:
```javascript
GET /api/v1/admin/categories?lang=en
```

### 12.2 카테고리 이미지

**이미지 URL 컬럼 추가**:

```prisma
model Category {
  // ... 기존 컬럼
  category_image_url String? @db.VarChar(500)
}
```

### 12.3 카테고리 속성 (Attributes)

**카테고리별 커스텀 속성**:

```prisma
model CategoryAttribute {
  id              BigInt  @id @default(autoincrement())
  category_id     BigInt
  attribute_key   String  @db.VarChar(50)   // 'color', 'size', 'material'
  attribute_type  String  @db.VarChar(20)   // 'select', 'text', 'number'
  is_required     Boolean @default(false)

  category Category @relation(...)
}
```

**활용 예**:
- 의류: 색상, 사이즈 필수 입력
- 전자기기: 제조사, 모델명 필수 입력

---

## 13. 테스트 가이드

### 13.1 수동 테스트 체크리스트

**대분류 등록**:
- [ ] 이름 입력 → 정상 등록
- [ ] 이름 없이 등록 → 에러 메시지
- [ ] 51자 이름 입력 → 에러 메시지

**중분류 등록**:
- [ ] 대분류 선택 + 이름 입력 → 정상 등록
- [ ] 대분류 미선택 → 에러 메시지
- [ ] depth 3 카테고리 하위에 등록 시도 → 에러

**소분류 등록**:
- [ ] 대분류 선택 → 중분류 로드 확인
- [ ] 중분류 선택 + 이름 입력 → 정상 등록
- [ ] 중분류 없는 대분류 선택 → "중분류가 없습니다" 표시

**삭제**:
- [ ] 하위 카테고리 없는 카테고리 삭제 → 성공
- [ ] 하위 카테고리 있는 카테고리 삭제 → 에러 메시지
- [ ] 상품 있는 카테고리 삭제 → 에러 메시지

**비활성화**:
- [ ] 하위 카테고리 없는 카테고리 비활성화 → 성공
- [ ] 하위 카테고리 있는 카테고리 비활성화 → 에러

**계층 시각화**:
- [ ] 모든 depth의 카테고리 표시 확인
- [ ] 들여쓰기 정상 표시 확인
- [ ] category_path가 슬래시로 시작하는지 확인

### 13.2 API 테스트 예시

**카테고리 생성 테스트**:
```bash
# 대분류 생성
curl -X POST http://localhost:3000/api/v1/admin/categories \
  -H "Content-Type: application/json" \
  -d '{
    "category_name": "테스트 대분류",
    "category_description": "테스트용 카테고리"
  }'

# 중분류 생성 (대분류 ID: 4)
curl -X POST http://localhost:3000/api/v1/admin/categories \
  -H "Content-Type: application/json" \
  -d '{
    "category_name": "테스트 중분류",
    "parent_category_id": 4
  }'
```

**전체 목록 조회**:
```bash
curl http://localhost:3000/api/v1/admin/categories?includeInactive=false
```

**삭제 테스트**:
```bash
curl -X DELETE http://localhost:3000/api/v1/admin/categories/10
```

---

## 14. 참고 자료

### 14.1 관련 문서

- [프로젝트 개요](../01_README.md)
- [코딩 표준](../02_CODING_STANDARDS.md)
- [API 개발 가이드](../04_API_DEVELOPMENT.md)
- [데이터베이스 관계도](../db_03_RELATIONSHIPS.md)
- [카테고리 Repository 가이드](./01_category_repository.md)

### 14.2 기술 스택

- **Backend**: Node.js, Express.js
- **ORM**: Prisma
- **Database**: PostgreSQL (Supabase)
- **Frontend**: Vanilla JavaScript, HTML5, CSS3

### 14.3 외부 참고

- [Prisma Self Relations](https://www.prisma.io/docs/concepts/components/prisma-schema/relations/self-relations)
- [Hierarchical Data in SQL](https://www.slideshare.net/billkarwin/models-for-hierarchical-data)

---

## 15. 요약

### 15.1 핵심 포인트

✅ **ID 기반 경로 시스템**
- category_path는 `/4/10/100` 형식으로 자동 생성
- 이름 변경해도 경로는 불변
- 조상 카테고리 조회가 O(1)

✅ **계층형 API 응답**
- 대분류만 배열에 반환
- 중/소분류는 `child_categories`에 재귀적으로 포함
- 메모리 효율적 (중복 데이터 없음)

✅ **프론트엔드 플랫 변환**
- `flattenCategories()` 함수로 재귀 변환
- depth별 들여쓰기로 시각화
- 계단식 선택 UI 구현

✅ **안전한 삭제/비활성화**
- 하위 카테고리 있으면 삭제 불가
- 상품 있으면 삭제/비활성화 불가
- 비즈니스 로직에서 검증

### 15.2 개발 체크리스트

**백엔드 개발 시**:
- [ ] Repository에서 path 자동 생성 로직 확인
- [ ] Service에서 BigInt → String 변환
- [ ] 삭제/비활성화 전 검증 로직 구현
- [ ] 인증/인가 미들웨어 활성화 (프로덕션)

**프론트엔드 개발 시**:
- [ ] 계층형 구조 → 플랫 변환 함수 구현
- [ ] child_categories에서 중분류 추출
- [ ] depth별 스타일 적용 (색상, 들여쓰기)
- [ ] 에러 처리 및 사용자 피드백

---

**최종 업데이트**: 2025년 10월 10일
**작성자**: Backend Team
**상태**: ✅ **완료**
