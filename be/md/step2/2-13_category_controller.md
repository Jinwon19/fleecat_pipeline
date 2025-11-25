# Step 2-13: Category Controller 구현

## 1. 개요

**Category Controller**는 계층형 카테고리 관련 HTTP 요청/응답을 처리하는 컨트롤러입니다.

### 주요 역할

- 카테고리 생성/수정/삭제 (관리자 전용)
- 계층형 카테고리 트리 조회 (Public)
- 카테고리 상세 조회 (Public)
- 자식 카테고리 목록 조회 (Public)
- 카테고리 통계 조회

### 파일 위치

```
src/controllers/category.controller.js
```

### 의존성

```javascript
const categoryService = require('../services/category.service');
const { successResponse } = require('../utils/response');
```

---

## 2. 개념

### 계층형 카테고리 구조

**Category**는 자기 참조(self-referencing) 구조로 최대 3단계까지 지원합니다.

```
대분류 (depth: 1, parent_category_id: NULL)
  ├─ 중분류 (depth: 2, parent_category_id: 대분류ID)
  │   ├─ 소분류 (depth: 3, parent_category_id: 중분류ID)
  │   └─ 소분류 (depth: 3)
  └─ 중분류 (depth: 2)
      └─ 소분류 (depth: 3)
```

#### 주요 특징

1. **계층 구조**: 최대 3단계 (대분류 → 중분류 → 소분류)
2. **ID 기반 경로**: `category_path` (예: `"1/5/12"`)
   - 이름 변경 시에도 경로가 변경되지 않음
3. **활성 상태**: `category_is_active` (비활성 카테고리에는 상품 등록 불가)
4. **순서 관리**: `category_order` (같은 depth 내 정렬)

#### Public vs Admin API

- **Public API**: 카테고리 조회 (트리, 상세, 자식 목록)
- **Admin API**: 카테고리 생성/수정/삭제

---

## 3. 함수 설명

### 3.1 `createCategory(req, res, next)`

**카테고리 생성** (관리자 전용)

#### HTTP 요청
```
POST /api/categories
Authorization: Bearer <ADMIN_TOKEN>
```

#### Request Body
```json
{
  "category_name": "도자기",
  "parent_category_id": null,
  "category_description": "전통 도자기 카테고리",
  "category_order": 1
}
```

#### Response (201 Created)
```json
{
  "success": true,
  "message": "Category created successfully",
  "data": {
    "category_id": 1,
    "category_name": "도자기",
    "category_depth": 1,
    "category_path": "1",
    "category_is_active": true,
    "category_order": 1,
    "parent_category_id": null
  }
}
```

#### 주요 로직
1. Request Body에서 카테고리 데이터 추출
2. `categoryService.createCategory(data)` 호출
   - Service에서 depth 제한 (3단계) 검증
   - 부모 카테고리 존재 확인
   - category_path 자동 계산
3. `successResponse` 헬퍼로 201 응답 반환

---

### 3.2 `getCategoryTree(req, res, next)`

**계층형 카테고리 트리 조회** (Public)

#### HTTP 요청
```
GET /api/categories/tree?includeInactive=false
```

#### Query Parameters
- `includeInactive` (boolean, default: false): 비활성 카테고리 포함 여부

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Category tree retrieved successfully",
  "data": [
    {
      "category_id": 1,
      "category_name": "도자기",
      "category_depth": 1,
      "category_is_active": true,
      "child_categories": [
        {
          "category_id": 2,
          "category_name": "찻잔",
          "category_depth": 2,
          "child_categories": [
            {
              "category_id": 3,
              "category_name": "청자 찻잔",
              "category_depth": 3,
              "child_categories": []
            }
          ]
        }
      ]
    }
  ]
}
```

#### 주요 로직
1. Query Parameters에서 `includeInactive` 추출 (문자열 → boolean 변환)
2. `categoryService.getCategoryTree({ includeInactive })` 호출
3. 계층 구조 그대로 응답 반환

---

### 3.3 `getCategoryById(req, res, next)`

**카테고리 상세 조회** (Public)

#### HTTP 요청
```
GET /api/categories/:categoryId
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Category retrieved successfully",
  "data": {
    "category_id": 2,
    "category_name": "찻잔",
    "category_depth": 2,
    "category_path": "1/2",
    "category_description": "다양한 종류의 찻잔",
    "category_is_active": true,
    "parent_category_id": 1,
    "parent_category": {
      "category_id": 1,
      "category_name": "도자기"
    }
  }
}
```

#### 주요 로직
1. URL 파라미터에서 `categoryId` 추출 후 정수 변환
2. 유효성 검사 (`isNaN` 체크)
3. `categoryService.getCategoryById(categoryId)` 호출
4. 성공 응답 반환

#### 유효성 검사 예시
```javascript
if (isNaN(categoryId)) {
  return res.status(400).json({
    success: false,
    message: 'Invalid category ID'
  });
}
```

---

### 3.4 `getChildCategories(req, res, next)`

**자식 카테고리 목록 조회** (Public)

#### HTTP 요청
```
GET /api/categories/:categoryId/children
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Child categories retrieved successfully",
  "data": [
    {
      "category_id": 2,
      "category_name": "찻잔",
      "category_depth": 2,
      "category_is_active": true
    },
    {
      "category_id": 3,
      "category_name": "접시",
      "category_depth": 2,
      "category_is_active": true
    }
  ]
}
```

#### 주요 로직
1. URL 파라미터에서 `categoryId` 추출 후 정수 변환
2. 유효성 검사
3. `categoryService.getChildCategories(categoryId)` 호출
4. 성공 응답 반환

---

### 3.5 `updateCategory(req, res, next)`

**카테고리 수정** (관리자 전용)

#### HTTP 요청
```
PATCH /api/categories/:categoryId
Authorization: Bearer <ADMIN_TOKEN>
```

#### Request Body
```json
{
  "category_name": "전통 도자기",
  "category_description": "한국 전통 도자기",
  "category_order": 2,
  "category_is_active": false
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Category updated successfully",
  "data": {
    "category_id": 1,
    "category_name": "전통 도자기",
    "category_description": "한국 전통 도자기",
    "category_order": 2,
    "category_is_active": false
  }
}
```

#### 주요 로직
1. URL 파라미터에서 `categoryId` 추출 후 정수 변환
2. 유효성 검사
3. Request Body에서 수정 데이터 추출
4. `categoryService.updateCategory(categoryId, updateData)` 호출
   - Service에서 수정 가능한 필드만 처리
   - `parent_category_id`, `category_path`는 수정 불가
5. 성공 응답 반환

#### 수정 가능한 필드
- `category_name`
- `category_description`
- `category_order`
- `category_is_active`

---

### 3.6 `deleteCategory(req, res, next)`

**카테고리 삭제** (관리자 전용)

#### HTTP 요청
```
DELETE /api/categories/:categoryId
Authorization: Bearer <ADMIN_TOKEN>
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Category deleted successfully",
  "data": {
    "message": "Category deleted successfully",
    "deleted_category": {
      "category_id": 1,
      "category_name": "도자기"
    }
  }
}
```

#### 주요 로직
1. URL 파라미터에서 `categoryId` 추출 후 정수 변환
2. 유효성 검사
3. `categoryService.deleteCategory(categoryId)` 호출
   - Service에서 하위 카테고리 확인 (있으면 삭제 불가)
   - Service에서 상품 확인 (있으면 삭제 불가)
4. 성공 응답 반환

#### 삭제 제약 조건
- 하위 카테고리가 있으면 삭제 불가
- 해당 카테고리에 상품이 있으면 삭제 불가

---

### 3.7 `getCategoryStats(req, res, next)`

**카테고리 통계 조회**

#### HTTP 요청
```
GET /api/categories/:categoryId/stats
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Category stats retrieved successfully",
  "data": {
    "category_id": 1,
    "category_name": "도자기",
    "category_depth": 1,
    "child_category_count": 5,
    "product_count": 23,
    "is_active": true
  }
}
```

#### 주요 로직
1. URL 파라미터에서 `categoryId` 추출 후 정수 변환
2. 유효성 검사
3. `categoryService.getCategoryStats(categoryId)` 호출
4. 성공 응답 반환

---

## 4. 사용 흐름

### 4.1 카테고리 생성 프로세스

```
1. [관리자] POST /api/categories (대분류 생성)
   {
     "category_name": "도자기",
     "parent_category_id": null
   }
   → category_id: 1, category_depth: 1, category_path: "1"

2. [관리자] POST /api/categories (중분류 생성)
   {
     "category_name": "찻잔",
     "parent_category_id": 1
   }
   → category_id: 2, category_depth: 2, category_path: "1/2"

3. [관리자] POST /api/categories (소분류 생성)
   {
     "category_name": "청자 찻잔",
     "parent_category_id": 2
   }
   → category_id: 3, category_depth: 3, category_path: "1/2/3"
```

### 4.2 Public 사용자 카테고리 조회

```
1. [Public] GET /api/categories/tree
   → 전체 계층 구조 조회 (활성 카테고리만)

2. [Public] GET /api/categories/1
   → "도자기" 카테고리 상세 조회

3. [Public] GET /api/categories/1/children
   → "도자기"의 자식 카테고리 목록 (찻잔, 접시, ...)

4. [Public] GET /api/products?categoryId=2
   → "찻잔" 카테고리의 상품 목록 조회
```

---

## 5. 주의사항

### 5.1 Query Parameter Boolean 변환

Query Parameters는 항상 **문자열**이므로 boolean 변환 필요:

```javascript
const includeInactive = req.query.includeInactive === 'true';
```

❌ 잘못된 방법:
```javascript
const includeInactive = req.query.includeInactive; // "false" → truthy 값!
```

### 5.2 정수 변환 필수

URL 파라미터는 항상 문자열:

```javascript
const categoryId = parseInt(req.params.categoryId, 10);

if (isNaN(categoryId)) {
  return res.status(400).json({
    success: false,
    message: 'Invalid category ID'
  });
}
```

### 5.3 삭제 제약 조건

카테고리 삭제 시 **2가지 제약 조건** 확인:

1. 하위 카테고리가 있는지 확인
2. 해당 카테고리에 상품이 있는지 확인

→ Service Layer에서 자동으로 검증되므로 Controller는 신경 쓰지 않아도 됨

### 5.4 계층 구조 제한

- **최대 3단계**: 대분류 → 중분류 → 소분류
- 4단계 이상 생성 시도 → `ValidationError: Maximum category depth is 3`

### 5.5 비활성 카테고리 처리

- 비활성 카테고리 (`category_is_active: false`)에는 **상품 등록 불가**
- 카테고리를 비활성화해도 기존 상품은 유지됨

---

## 6. 테스트 시나리오

### 6.1 카테고리 생성 테스트

```javascript
// 1. 성공: 대분류 생성
POST /api/categories
{
  "category_name": "도자기"
}
→ 201 Created

// 2. 성공: 중분류 생성
POST /api/categories
{
  "category_name": "찻잔",
  "parent_category_id": 1
}
→ 201 Created

// 3. 실패: 존재하지 않는 부모
POST /api/categories
{
  "category_name": "소분류",
  "parent_category_id": 999
}
→ 404 Not Found (Parent category not found)

// 4. 실패: 4단계 카테고리 생성
POST /api/categories
{
  "category_name": "4단계",
  "parent_category_id": 3 // depth가 이미 3
}
→ 400 Bad Request (Maximum category depth is 3)

// 5. 실패: 비활성 부모에 자식 생성
POST /api/categories
{
  "category_name": "자식",
  "parent_category_id": 5 // category_is_active: false
}
→ 400 Bad Request (Cannot create child category under inactive parent)
```

### 6.2 카테고리 조회 테스트

```javascript
// 1. 계층형 트리 조회 (활성만)
GET /api/categories/tree
→ 200 OK (활성 카테고리 계층 구조)

// 2. 계층형 트리 조회 (비활성 포함)
GET /api/categories/tree?includeInactive=true
→ 200 OK (모든 카테고리 계층 구조)

// 3. 카테고리 상세 조회
GET /api/categories/1
→ 200 OK

// 4. 존재하지 않는 카테고리
GET /api/categories/999
→ 404 Not Found (Category not found)

// 5. 잘못된 ID 형식
GET /api/categories/abc
→ 400 Bad Request (Invalid category ID)
```

### 6.3 카테고리 수정 테스트

```javascript
// 1. 성공: 이름 변경
PATCH /api/categories/1
{
  "category_name": "전통 도자기"
}
→ 200 OK

// 2. 성공: 비활성화
PATCH /api/categories/1
{
  "category_is_active": false
}
→ 200 OK

// 3. 실패: 빈 이름
PATCH /api/categories/1
{
  "category_name": ""
}
→ 400 Bad Request (Category name cannot be empty)

// 4. 실패: 수정할 필드 없음
PATCH /api/categories/1
{}
→ 400 Bad Request (No fields to update)
```

### 6.4 카테고리 삭제 테스트

```javascript
// 1. 성공: 하위 카테고리와 상품이 없는 경우
DELETE /api/categories/3
→ 200 OK

// 2. 실패: 하위 카테고리가 있는 경우
DELETE /api/categories/1 (하위에 찻잔, 접시 등)
→ 400 Bad Request (Cannot delete category with 5 child categories...)

// 3. 실패: 상품이 있는 경우
DELETE /api/categories/2 (23개 상품)
→ 400 Bad Request (Cannot delete category with 23 products...)
```

### 6.5 카테고리 통계 테스트

```javascript
// 1. 성공: 통계 조회
GET /api/categories/1/stats
→ 200 OK
{
  "category_id": 1,
  "category_name": "도자기",
  "child_category_count": 5,
  "product_count": 23
}

// 2. 실패: 존재하지 않는 카테고리
GET /api/categories/999/stats
→ 404 Not Found (Category not found)
```

---

## 7. Routes 연결 예시 (다음 단계)

```javascript
// src/routes/category.routes.js
const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const { authenticate, authorize } = require('../middlewares/auth');

// 공개 API
router.get('/tree', categoryController.getCategoryTree);
router.get('/:categoryId', categoryController.getCategoryById);
router.get('/:categoryId/children', categoryController.getChildCategories);
router.get('/:categoryId/stats', categoryController.getCategoryStats);

// 관리자 전용
router.post('/', authenticate, authorize('admin'), categoryController.createCategory);
router.patch('/:categoryId', authenticate, authorize('admin'), categoryController.updateCategory);
router.delete('/:categoryId', authenticate, authorize('admin'), categoryController.deleteCategory);

module.exports = router;
```

---

## 8. 다음 단계

1. **Step 2-14**: Product Controller 문서화
2. **Step 2-15**: Tenant Routes 구현
3. **Step 2-16**: TenantMember Routes 구현
4. **Step 2-17**: Category Routes 구현
5. **Step 2-18**: Product Routes 구현

