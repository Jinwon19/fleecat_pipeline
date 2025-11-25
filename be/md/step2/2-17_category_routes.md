# Step 2-17: Category Routes 구현

## 1. 개요

**Category Routes**는 계층형 카테고리 관련 API 엔드포인트를 정의하는 라우팅 레이어입니다.

### 주요 역할

- Public API: 카테고리 조회 (트리, 상세, 자식 목록, 통계)
- Admin API: 카테고리 생성, 수정, 삭제

### 파일 위치

```
src/routes/category.routes.js
```

### 의존성

```javascript
const express = require('express');
const categoryController = require('../controllers/category.controller');
const { authenticate, authorize } = require('../middlewares/auth');
```

---

## 2. 개념

### Public API vs Admin API

Category Routes는 **Public API**와 **Admin API**로 명확히 구분됩니다.

#### Public API (인증 불필요)
- 계층형 카테고리 트리 조회
- 카테고리 상세 조회
- 자식 카테고리 목록 조회
- 카테고리 통계 조회

#### Admin API (관리자 전용)
- 카테고리 생성
- 카테고리 수정
- 카테고리 삭제

---

## 3. API 엔드포인트

### 3.1 계층형 카테고리 트리 조회

```javascript
GET /api/v1/categories/tree
```

#### 권한
- **Public**
- 미들웨어: 없음

#### Controller
`categoryController.getCategoryTree`

#### Query Parameters
- `includeInactive` (boolean, default: false): 비활성 카테고리 포함 여부

#### 사용 예시
```bash
# 활성 카테고리만 조회 (기본)
GET /api/v1/categories/tree

# 비활성 카테고리 포함
GET /api/v1/categories/tree?includeInactive=true
```

#### 응답 형식
```json
{
  "success": true,
  "message": "Category tree retrieved successfully",
  "data": [
    {
      "category_id": 1,
      "category_name": "도자기",
      "category_depth": 1,
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

---

### 3.2 자식 카테고리 목록 조회

```javascript
GET /api/v1/categories/:categoryId/children
```

#### 권한
- **Public**
- 미들웨어: 없음

#### Controller
`categoryController.getChildCategories`

#### URL Parameters
- `categoryId` (number): 부모 카테고리 ID

#### 사용 예시
```bash
# "도자기" 카테고리의 자식 목록
GET /api/v1/categories/1/children
```

#### 응답 형식
```json
{
  "success": true,
  "message": "Child categories retrieved successfully",
  "data": [
    {
      "category_id": 2,
      "category_name": "찻잔",
      "category_depth": 2
    },
    {
      "category_id": 3,
      "category_name": "접시",
      "category_depth": 2
    }
  ]
}
```

---

### 3.3 카테고리 통계 조회

```javascript
GET /api/v1/categories/:categoryId/stats
```

#### 권한
- **Public**
- 미들웨어: 없음

#### Controller
`categoryController.getCategoryStats`

#### URL Parameters
- `categoryId` (number): 카테고리 ID

#### 사용 예시
```bash
GET /api/v1/categories/1/stats
```

#### 응답 형식
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

---

### 3.4 카테고리 상세 조회

```javascript
GET /api/v1/categories/:categoryId
```

#### 권한
- **Public**
- 미들웨어: 없음

#### Controller
`categoryController.getCategoryById`

#### URL Parameters
- `categoryId` (number): 카테고리 ID

#### 사용 예시
```bash
GET /api/v1/categories/2
```

#### 응답 형식
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

---

### 3.5 카테고리 생성

```javascript
POST /api/v1/categories
```

#### 권한
- **Private** (Admin)
- 미들웨어: `authenticate`, `authorize('admin')`

#### Controller
`categoryController.createCategory`

#### Request Body
```json
{
  "category_name": "도자기",
  "parent_category_id": null,
  "category_description": "전통 도자기 카테고리",
  "category_order": 1
}
```

#### 사용 예시
```bash
POST /api/v1/categories
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "category_name": "도자기",
  "parent_category_id": null
}
```

#### 응답 형식
```json
{
  "success": true,
  "message": "Category created successfully",
  "data": {
    "category_id": 1,
    "category_name": "도자기",
    "category_depth": 1,
    "category_path": "1",
    "category_is_active": true
  }
}
```

---

### 3.6 카테고리 수정

```javascript
PATCH /api/v1/categories/:categoryId
```

#### 권한
- **Private** (Admin)
- 미들웨어: `authenticate`, `authorize('admin')`

#### Controller
`categoryController.updateCategory`

#### URL Parameters
- `categoryId` (number): 카테고리 ID

#### Request Body
```json
{
  "category_name": "전통 도자기",
  "category_description": "한국 전통 도자기",
  "category_order": 2,
  "category_is_active": false
}
```

#### 수정 가능한 필드
- `category_name`
- `category_description`
- `category_order`
- `category_is_active`

#### 수정 불가능한 필드
- `parent_category_id` (카테고리 이동 불가)
- `category_path` (자동 계산)
- `category_depth` (자동 계산)

#### 사용 예시
```bash
PATCH /api/v1/categories/1
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "category_name": "전통 도자기",
  "category_is_active": false
}
```

---

### 3.7 카테고리 삭제

```javascript
DELETE /api/v1/categories/:categoryId
```

#### 권한
- **Private** (Admin)
- 미들웨어: `authenticate`, `authorize('admin')`

#### Controller
`categoryController.deleteCategory`

#### URL Parameters
- `categoryId` (number): 카테고리 ID

#### 삭제 제약 조건
1. **하위 카테고리가 있으면 삭제 불가**
2. **해당 카테고리에 상품이 있으면 삭제 불가**

#### 사용 예시
```bash
DELETE /api/v1/categories/3
Authorization: Bearer <ADMIN_TOKEN>
```

#### 응답 형식
```json
{
  "success": true,
  "message": "Category deleted successfully",
  "data": {
    "message": "Category deleted successfully",
    "deleted_category": {
      "category_id": 3,
      "category_name": "청자 찻잔"
    }
  }
}
```

---

## 4. 라우트 순서

### 구체적인 경로를 먼저 정의

Express는 정의된 순서대로 라우트를 매칭하므로, 구체적인 경로를 먼저 정의해야 합니다.

```javascript
// ✅ 올바른 순서
router.get('/tree', categoryController.getCategoryTree);                        // 구체적
router.get('/:categoryId/children', categoryController.getChildCategories);     // 구체적
router.get('/:categoryId/stats', categoryController.getCategoryStats);          // 구체적
router.get('/:categoryId', categoryController.getCategoryById);                 // 동적

// ❌ 잘못된 순서
router.get('/:categoryId', categoryController.getCategoryById);                 // '/tree'도 여기서 매칭!
router.get('/tree', categoryController.getCategoryTree);                        // 실행 안 됨
```

### Category Routes의 순서

```javascript
// 1. 구체적인 경로 먼저
router.get('/tree', ...);                          // GET /categories/tree
router.get('/:categoryId/children', ...);          // GET /categories/:categoryId/children
router.get('/:categoryId/stats', ...);             // GET /categories/:categoryId/stats

// 2. 동적 파라미터는 나중
router.get('/:categoryId', ...);                   // GET /categories/:categoryId

// 3. 관리자 API
router.post('/', ...);                             // POST /categories
router.patch('/:categoryId', ...);                 // PATCH /categories/:categoryId
router.delete('/:categoryId', ...);                // DELETE /categories/:categoryId
```

---

## 5. 사용 흐름

### 5.1 관리자가 카테고리 생성

```bash
# Step 1: 대분류 생성
POST /api/v1/categories
Authorization: Bearer <ADMIN_TOKEN>
{
  "category_name": "도자기",
  "parent_category_id": null
}
→ 201 Created (category_id: 1, depth: 1, path: "1")

# Step 2: 중분류 생성
POST /api/v1/categories
Authorization: Bearer <ADMIN_TOKEN>
{
  "category_name": "찻잔",
  "parent_category_id": 1
}
→ 201 Created (category_id: 2, depth: 2, path: "1/2")

# Step 3: 소분류 생성
POST /api/v1/categories
Authorization: Bearer <ADMIN_TOKEN>
{
  "category_name": "청자 찻잔",
  "parent_category_id": 2
}
→ 201 Created (category_id: 3, depth: 3, path: "1/2/3")
```

### 5.2 Public 사용자가 카테고리 탐색

```bash
# Step 1: 전체 카테고리 트리 조회
GET /api/v1/categories/tree
→ 200 OK (계층 구조 전체)

# Step 2: 특정 카테고리 상세 조회
GET /api/v1/categories/1
→ 200 OK ("도자기" 카테고리 상세)

# Step 3: 자식 카테고리 목록 조회
GET /api/v1/categories/1/children
→ 200 OK (찻잔, 접시, ... 목록)

# Step 4: 카테고리별 상품 조회
GET /api/v1/products?categoryId=2
→ 200 OK ("찻잔" 카테고리의 상품 목록)
```

### 5.3 관리자가 카테고리 관리

```bash
# Step 1: 카테고리 수정
PATCH /api/v1/categories/1
Authorization: Bearer <ADMIN_TOKEN>
{
  "category_name": "전통 도자기",
  "category_is_active": false
}
→ 200 OK

# Step 2: 카테고리 삭제 시도 (하위 카테고리 있음)
DELETE /api/v1/categories/1
Authorization: Bearer <ADMIN_TOKEN>
→ 400 Bad Request (Cannot delete category with 5 child categories)

# Step 3: 소분류부터 삭제
DELETE /api/v1/categories/3
Authorization: Bearer <ADMIN_TOKEN>
→ 200 OK (하위 카테고리 없으므로 삭제 성공)
```

---

## 6. 주의사항

### 6.1 라우트 순서 매우 중요

구체적인 경로(`/tree`, `/:id/children`)가 먼저, 동적 파라미터(`/:id`)는 나중에:

```javascript
// ✅ 올바른 순서
router.get('/tree', ...);           // 먼저
router.get('/:categoryId', ...);    // 나중

// ❌ 잘못된 순서 (/:categoryId가 /tree를 가로챔)
router.get('/:categoryId', ...);    // '/tree'도 여기서 매칭!
router.get('/tree', ...);           // 실행 안 됨
```

### 6.2 Public API는 미들웨어 없음

모든 조회 API는 Public이므로 인증 미들웨어를 적용하지 않습니다:

```javascript
// ✅ Public API
router.get('/tree', categoryController.getCategoryTree);
router.get('/:categoryId', categoryController.getCategoryById);

// ❌ Public API인데 인증 필요 (불필요)
router.get('/tree', authenticate, categoryController.getCategoryTree);
```

### 6.3 Admin API는 authorize('admin') 필수

카테고리 생성/수정/삭제는 관리자만 가능:

```javascript
// ✅ Admin 권한 확인
router.post('/', authenticate, authorize('admin'), categoryController.createCategory);
router.patch('/:categoryId', authenticate, authorize('admin'), categoryController.updateCategory);
router.delete('/:categoryId', authenticate, authorize('admin'), categoryController.deleteCategory);

// ❌ 인증만 하고 권한 확인 안 함
router.post('/', authenticate, categoryController.createCategory); // 일반 사용자도 가능!
```

### 6.4 PATCH vs PUT

카테고리 수정은 **PATCH** 메서드를 사용합니다:

- **PATCH**: 일부 필드만 수정 (부분 업데이트)
- **PUT**: 전체 리소스 교체 (전체 업데이트)

```javascript
// ✅ PATCH 사용 (일부 필드만 수정)
router.patch('/:categoryId', authenticate, authorize('admin'), categoryController.updateCategory);

// ❌ PUT 사용 (전체 교체는 일반적으로 사용하지 않음)
router.put('/:categoryId', ...);
```

---

## 7. 테스트 시나리오

### 7.1 Public API 테스트

```bash
# 1. 카테고리 트리 조회 (인증 없음)
GET /api/v1/categories/tree
→ 200 OK

# 2. 카테고리 상세 조회
GET /api/v1/categories/1
→ 200 OK

# 3. 존재하지 않는 카테고리
GET /api/v1/categories/999
→ 404 Not Found (Category not found)

# 4. 잘못된 ID 형식
GET /api/v1/categories/abc
→ 400 Bad Request (Invalid category ID)
```

### 7.2 Admin API - 인증 테스트

```bash
# 1. 성공: 관리자 권한
POST /api/v1/categories
Authorization: Bearer <admin_token>
→ 201 Created

# 2. 실패: 토큰 없음
POST /api/v1/categories
→ 401 Unauthorized (No token provided)

# 3. 실패: 일반 사용자
POST /api/v1/categories
Authorization: Bearer <user_token>
→ 403 Forbidden (Insufficient permissions)
```

### 7.3 카테고리 생성 테스트

```bash
# 1. 성공: 대분류 생성
POST /api/v1/categories
{
  "category_name": "도자기"
}
→ 201 Created

# 2. 성공: 중분류 생성
POST /api/v1/categories
{
  "category_name": "찻잔",
  "parent_category_id": 1
}
→ 201 Created

# 3. 실패: 4단계 카테고리 생성
POST /api/v1/categories
{
  "category_name": "4단계",
  "parent_category_id": 3
}
→ 400 Bad Request (Maximum category depth is 3)

# 4. 실패: 비활성 부모에 자식 생성
POST /api/v1/categories
{
  "category_name": "자식",
  "parent_category_id": 5
}
→ 400 Bad Request (Cannot create child category under inactive parent)
```

### 7.4 카테고리 삭제 테스트

```bash
# 1. 성공: 하위 카테고리와 상품 없음
DELETE /api/v1/categories/3
Authorization: Bearer <admin_token>
→ 200 OK

# 2. 실패: 하위 카테고리 있음
DELETE /api/v1/categories/1
→ 400 Bad Request (Cannot delete category with 5 child categories)

# 3. 실패: 상품 있음
DELETE /api/v1/categories/2
→ 400 Bad Request (Cannot delete category with 23 products)
```

---

## 8. 전체 코드

```javascript
const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const { authenticate, authorize } = require('../middlewares/auth');

/**
 * Category Routes
 * 계층형 카테고리 관련 API 엔드포인트
 */

// Public API (구체적인 경로 먼저)
router.get('/tree', categoryController.getCategoryTree);
router.get('/:categoryId/children', categoryController.getChildCategories);
router.get('/:categoryId/stats', categoryController.getCategoryStats);
router.get('/:categoryId', categoryController.getCategoryById);

// Admin API
router.post('/', authenticate, authorize('admin'), categoryController.createCategory);
router.patch('/:categoryId', authenticate, authorize('admin'), categoryController.updateCategory);
router.delete('/:categoryId', authenticate, authorize('admin'), categoryController.deleteCategory);

module.exports = router;
```

---

## 9. 다음 단계

1. **Step 2-18**: Product Routes 문서화
2. **Step 2-19**: Validation Middleware 추가
3. **Step 2-20**: 00_INDEX.md 업데이트

