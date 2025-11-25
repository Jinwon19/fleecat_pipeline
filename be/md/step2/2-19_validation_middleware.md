# Step 2-19: Validation Middleware 추가

## 1. 개요

**Validation Middleware**는 API 요청의 입력 데이터를 검증하여 잘못된 데이터가 비즈니스 로직으로 전달되는 것을 방지하는 미들웨어입니다.

### 주요 역할

- **입력 검증**: 필수 필드, 데이터 타입, 형식 검증
- **에러 반환**: 검증 실패 시 즉시 400 Bad Request 응답
- **보안 강화**: SQL Injection, XSS 등 공격 방지
- **코드 간결화**: Controller에서 검증 로직 분리

### 파일 위치

```
src/middlewares/validation.js
```

### 의존성

```javascript
const { body, validationResult } = require('express-validator');
```

---

## 2. 개념

### Validation Middleware의 필요성

Validation Middleware가 없으면 모든 검증 로직을 Controller나 Service에서 처리해야 합니다:

```javascript
// ❌ Validation Middleware 없이 (안티 패턴)
async function createTenant(req, res, next) {
  try {
    const { tenant_name, tenant_detail_phone, tenant_detail_email } = req.body;

    // 검증 로직이 Controller에 섞임
    if (!tenant_name || tenant_name.length < 2 || tenant_name.length > 50) {
      return res.status(400).json({ message: 'Invalid tenant name' });
    }

    if (!tenant_detail_phone || !/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/.test(tenant_detail_phone)) {
      return res.status(400).json({ message: 'Invalid phone number' });
    }

    // ... 비즈니스 로직
  } catch (error) {
    next(error);
  }
}
```

Validation Middleware를 사용하면 검증 로직을 깔끔하게 분리할 수 있습니다:

```javascript
// ✅ Validation Middleware 사용 (권장)
router.post('/', authenticate, validateCreateTenant, tenantController.createTenant);

// Controller는 비즈니스 로직에만 집중
async function createTenant(req, res, next) {
  try {
    // 이미 검증된 데이터만 전달됨
    const result = await tenantService.createTenant(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}
```

---

## 3. Validation Middleware 구조

### 3.1 검증 결과 처리 헬퍼

모든 검증 미들웨어는 `handleValidationErrors`를 마지막에 호출합니다:

```javascript
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }

  next();
};
```

#### 에러 응답 형식

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "tenant_name",
      "message": "Tenant name must be between 2 and 50 characters"
    },
    {
      "field": "tenant_detail_phone",
      "message": "Invalid phone number format (e.g., 010-1234-5678 or 01012345678)"
    }
  ]
}
```

### 3.2 검증 미들웨어 패턴

모든 검증 미들웨어는 다음 패턴을 따릅니다:

```javascript
const validateSomething = [
  // 1. 필드별 검증 규칙
  body('field_name')
    .notEmpty()
    .withMessage('Field is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Field must be between 2 and 50 characters')
    .trim(),

  // 2. 다른 필드 검증...
  body('other_field')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('Invalid email format'),

  // 3. 검증 결과 처리
  handleValidationErrors
];
```

---

## 4. 추가된 Validation Middleware

### 4.1 Tenant 검증

#### validateCreateTenant

판매사 등록 시 입력 검증:

```javascript
const validateCreateTenant = [
  body('tenant_name')
    .notEmpty()
    .withMessage('Tenant name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Tenant name must be between 2 and 50 characters')
    .trim(),

  body('tenant_detail_phone')
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/)
    .withMessage('Invalid phone number format (e.g., 010-1234-5678 or 01012345678)')
    .trim(),

  body('tenant_detail_email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),

  body('tenant_detail_description')
    .optional({ checkFalsy: true })
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters')
    .trim(),

  body('tenant_detail_address')
    .optional({ checkFalsy: true })
    .isLength({ max: 200 })
    .withMessage('Address must not exceed 200 characters')
    .trim(),

  body('tenant_detail_commission_rate')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0, max: 1 })
    .withMessage('Commission rate must be between 0 and 1'),

  handleValidationErrors
];
```

**적용 위치**: `POST /api/v1/tenants`

#### validateUpdateTenant

판매사 수정 시 입력 검증 (모든 필드 선택):

```javascript
const validateUpdateTenant = [
  body('tenant_name')
    .optional({ checkFalsy: true })
    .isLength({ min: 2, max: 50 })
    .withMessage('Tenant name must be between 2 and 50 characters')
    .trim(),

  // ... 다른 필드도 optional로 검증

  handleValidationErrors
];
```

**적용 위치**: `PUT /api/v1/tenants/:id`

---

### 4.2 TenantMember 검증

#### validateCreateTenantMember

판매사 구성원 가입 시 입력 검증:

```javascript
const validateCreateTenantMember = [
  body('tenant_member_role')
    .notEmpty()
    .withMessage('Tenant member role is required')
    .isIn(['owner', 'member'])
    .withMessage('Role must be either "owner" or "member"'),

  body('tenant_member_bank_name')
    .optional({ checkFalsy: true })
    .isLength({ max: 50 })
    .withMessage('Bank name must not exceed 50 characters')
    .trim(),

  body('tenant_member_bank_account')
    .optional({ checkFalsy: true })
    .isLength({ max: 50 })
    .withMessage('Bank account must not exceed 50 characters')
    .trim(),

  handleValidationErrors
];
```

**적용 위치**: `POST /api/v1/tenants/:id/members`

#### validateUpdateTenantMember

구성원 정보 수정 시 입력 검증:

```javascript
const validateUpdateTenantMember = [
  body('tenant_member_role')
    .optional({ checkFalsy: true })
    .isIn(['owner', 'member'])
    .withMessage('Role must be either "owner" or "member"'),

  // ... 다른 필드도 optional로 검증

  handleValidationErrors
];
```

**적용 위치**: `PUT /api/v1/tenant-members/:id`

---

### 4.3 Category 검증

#### validateCreateCategory

카테고리 생성 시 입력 검증:

```javascript
const validateCreateCategory = [
  body('category_name')
    .notEmpty()
    .withMessage('Category name is required')
    .isLength({ min: 2, max: 30 })
    .withMessage('Category name must be between 2 and 30 characters')
    .trim(),

  body('parent_category_id')
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Parent category ID must be a positive integer'),

  body('category_description')
    .optional({ checkFalsy: true })
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters')
    .trim(),

  body('category_order')
    .optional({ checkFalsy: true })
    .isInt({ min: 0 })
    .withMessage('Category order must be a non-negative integer'),

  handleValidationErrors
];
```

**적용 위치**: `POST /api/v1/categories`

#### validateUpdateCategory

카테고리 수정 시 입력 검증:

```javascript
const validateUpdateCategory = [
  body('category_name')
    .optional({ checkFalsy: true })
    .isLength({ min: 2, max: 30 })
    .withMessage('Category name must be between 2 and 30 characters')
    .trim(),

  // ... 다른 필드도 optional로 검증

  // 부모 카테고리 변경 금지
  body('parent_category_id')
    .not()
    .exists()
    .withMessage('Cannot change parent category (category movement not allowed)'),

  handleValidationErrors
];
```

**적용 위치**: `PATCH /api/v1/categories/:categoryId`

---

### 4.4 Product 검증

#### validateCreateProduct

상품 등록 시 입력 검증:

```javascript
const validateCreateProduct = [
  body('tenant_member_id')
    .notEmpty()
    .withMessage('Tenant member ID is required')
    .isInt({ min: 1 })
    .withMessage('Tenant member ID must be a positive integer'),

  body('category_id')
    .notEmpty()
    .withMessage('Category ID is required')
    .isInt({ min: 1 })
    .withMessage('Category ID must be a positive integer'),

  body('product_name')
    .notEmpty()
    .withMessage('Product name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Product name must be between 2 and 100 characters')
    .trim(),

  body('product_price')
    .notEmpty()
    .withMessage('Product price is required')
    .isInt({ min: 1 })
    .withMessage('Product price must be greater than 0'),

  body('product_stock')
    .notEmpty()
    .withMessage('Product stock is required')
    .isInt({ min: 0 })
    .withMessage('Product stock must be a non-negative integer'),

  body('product_description')
    .optional({ checkFalsy: true })
    .isLength({ max: 2000 })
    .withMessage('Description must not exceed 2000 characters')
    .trim(),

  handleValidationErrors
];
```

**적용 위치**: `POST /api/v1/products`

#### validateUpdateProduct

상품 수정 시 입력 검증:

```javascript
const validateUpdateProduct = [
  body('category_id')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Category ID must be a positive integer'),

  // ... 다른 필드도 optional로 검증

  // 판매자 변경 금지
  body('tenant_member_id')
    .not()
    .exists()
    .withMessage('Cannot change product owner (tenant_member_id)'),

  handleValidationErrors
];
```

**적용 위치**: `PATCH /api/v1/products/:productId`

#### validateUpdateProductStatus

상품 상태 변경 시 입력 검증:

```javascript
const validateUpdateProductStatus = [
  body('product_status')
    .notEmpty()
    .withMessage('Product status is required')
    .isIn(['active', 'sold_out', 'inactive'])
    .withMessage('Product status must be "active", "sold_out", or "inactive"'),

  handleValidationErrors
];
```

**적용 위치**: `PATCH /api/v1/products/:productId/status`

#### validateUploadProductImages

상품 이미지 업로드 시 입력 검증:

```javascript
const validateUploadProductImages = [
  body('images')
    .notEmpty()
    .withMessage('Images array is required')
    .isArray({ min: 1, max: 10 })
    .withMessage('Images must be an array with 1-10 items'),

  body('images.*.product_img_url')
    .notEmpty()
    .withMessage('Image URL is required')
    .isURL()
    .withMessage('Invalid URL format'),

  body('images.*.product_img_sequence')
    .notEmpty()
    .withMessage('Image sequence is required')
    .isInt({ min: 1, max: 10 })
    .withMessage('Image sequence must be between 1 and 10'),

  handleValidationErrors
];
```

**적용 위치**: `POST /api/v1/products/:productId/images`

#### validateReorderProductImages

상품 이미지 순서 재배치 시 입력 검증:

```javascript
const validateReorderProductImages = [
  body('image_orders')
    .notEmpty()
    .withMessage('Image orders array is required')
    .isArray({ min: 1 })
    .withMessage('Image orders must be an array with at least 1 item'),

  body('image_orders.*.product_img_id')
    .notEmpty()
    .withMessage('Image ID is required')
    .isInt({ min: 1 })
    .withMessage('Image ID must be a positive integer'),

  body('image_orders.*.product_img_sequence')
    .notEmpty()
    .withMessage('Image sequence is required')
    .isInt({ min: 1, max: 10 })
    .withMessage('Image sequence must be between 1 and 10'),

  handleValidationErrors
];
```

**적용 위치**: `PUT /api/v1/products/:productId/images/reorder`

---

## 5. Routes 적용

### 5.1 Tenant Routes

```javascript
// src/routes/tenant.routes.js
const { validateCreateTenant, validateUpdateTenant } = require('../middlewares/validation');

// 판매사 등록
router.post('/', authenticate, validateCreateTenant, tenantController.register);

// 판매사 수정
router.put('/:id', authenticate, validateUpdateTenant, tenantController.updateTenant);
```

### 5.2 TenantMember Routes

```javascript
// src/routes/tenantMember.routes.js
const { validateCreateTenantMember, validateUpdateTenantMember } = require('../middlewares/validation');

// 구성원 가입 신청
router.post('/tenants/:id/members', authenticate, validateCreateTenantMember, tenantMemberController.applyToTenant);

// 구성원 정보 수정
router.put('/tenant-members/:id', authenticate, validateUpdateTenantMember, tenantMemberController.updateMember);
```

### 5.3 Category Routes

```javascript
// src/routes/category.routes.js
const { validateCreateCategory, validateUpdateCategory } = require('../middlewares/validation');

// 카테고리 생성
router.post('/', authenticate, authorize('admin'), validateCreateCategory, categoryController.createCategory);

// 카테고리 수정
router.patch('/:categoryId', authenticate, authorize('admin'), validateUpdateCategory, categoryController.updateCategory);
```

### 5.4 Product Routes

```javascript
// src/routes/product.routes.js
const {
  validateCreateProduct,
  validateUpdateProduct,
  validateUpdateProductStatus,
  validateUploadProductImages,
  validateReorderProductImages
} = require('../middlewares/validation');

// 상품 등록
router.post('/', authenticate, validateCreateProduct, productController.createProduct);

// 상품 수정
router.patch('/:productId', authenticate, validateUpdateProduct, productController.updateProduct);

// 상품 상태 변경
router.patch('/:productId/status', authenticate, validateUpdateProductStatus, productController.updateProductStatus);

// 상품 이미지 업로드
router.post('/:productId/images', authenticate, validateUploadProductImages, productController.uploadProductImages);

// 상품 이미지 순서 재배치
router.put('/:productId/images/reorder', authenticate, validateReorderProductImages, productController.reorderProductImages);
```

---

## 6. 미들웨어 체이닝 순서

Validation Middleware는 항상 **인증 미들웨어 다음**, **컨트롤러 이전**에 위치합니다:

```javascript
// ✅ 올바른 순서
router.post('/',
  authenticate,                  // 1. 인증
  authorize('admin'),            // 2. 권한 (optional)
  validateCreateCategory,        // 3. 검증
  categoryController.createCategory  // 4. 컨트롤러
);

// ❌ 잘못된 순서 (검증이 인증보다 먼저)
router.post('/',
  validateCreateCategory,        // 검증이 먼저? NO!
  authenticate,
  categoryController.createCategory
);
```

### 왜 이 순서가 중요한가?

1. **인증 먼저**: 인증되지 않은 사용자의 요청은 즉시 차단
2. **권한 확인**: 인증된 사용자 중 권한이 있는지 확인
3. **검증**: 권한이 있는 사용자의 입력 데이터 검증
4. **컨트롤러**: 모든 검증을 통과한 데이터만 비즈니스 로직으로 전달

```
Client Request
    ↓
authenticate (인증되지 않으면 401)
    ↓
authorize (권한 없으면 403)
    ↓
validate (입력 오류면 400)
    ↓
controller (모든 검증 통과)
```

---

## 7. 검증 메서드 참고

### 7.1 필수/선택 필드

```javascript
// 필수 필드
body('field_name')
  .notEmpty()
  .withMessage('Field is required')

// 선택 필드 (값이 없으면 검증 스킵)
body('field_name')
  .optional({ checkFalsy: true })
  .isEmail()
  .withMessage('Invalid email format')

// NULL 허용 선택 필드
body('parent_category_id')
  .optional({ nullable: true, checkFalsy: true })
  .isInt({ min: 1 })
```

### 7.2 문자열 검증

```javascript
// 길이 제한
body('name')
  .isLength({ min: 2, max: 50 })
  .withMessage('Name must be between 2 and 50 characters')

// 정규식 패턴
body('phone')
  .matches(/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/)
  .withMessage('Invalid phone number format')

// 앞뒤 공백 제거
body('name')
  .trim()
```

### 7.3 숫자 검증

```javascript
// 정수 검증
body('age')
  .isInt({ min: 0, max: 120 })
  .withMessage('Age must be between 0 and 120')

// 실수 검증
body('commission_rate')
  .isFloat({ min: 0, max: 1 })
  .withMessage('Commission rate must be between 0 and 1')
```

### 7.4 기타 검증

```javascript
// 이메일
body('email')
  .isEmail()
  .withMessage('Invalid email format')
  .normalizeEmail()

// URL
body('url')
  .isURL()
  .withMessage('Invalid URL format')

// Boolean
body('is_active')
  .isBoolean()
  .withMessage('Must be a boolean')

// Enum
body('status')
  .isIn(['active', 'inactive', 'pending'])
  .withMessage('Status must be one of: active, inactive, pending')

// 배열
body('items')
  .isArray({ min: 1, max: 10 })
  .withMessage('Items must be an array with 1-10 elements')

// 배열 내부 요소
body('items.*.id')
  .isInt({ min: 1 })
  .withMessage('Item ID must be a positive integer')
```

### 7.5 필드 존재 금지

수정 불가능한 필드를 막을 때 사용:

```javascript
// tenant_member_id는 수정 금지
body('tenant_member_id')
  .not()
  .exists()
  .withMessage('Cannot change product owner (tenant_member_id)')
```

---

## 8. 테스트 예시

### 8.1 성공 케이스

```bash
# 유효한 데이터로 판매사 등록
POST /api/v1/tenants
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>

{
  "tenant_name": "홍길동 공방",
  "tenant_detail_phone": "010-1234-5678",
  "tenant_detail_email": "hong@example.com",
  "tenant_detail_description": "전통 도자기 공방입니다"
}

→ 201 Created
```

### 8.2 실패 케이스 - 필수 필드 누락

```bash
# tenant_name 누락
POST /api/v1/tenants
{
  "tenant_detail_phone": "010-1234-5678",
  "tenant_detail_email": "hong@example.com"
}

→ 400 Bad Request
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "tenant_name",
      "message": "Tenant name is required"
    }
  ]
}
```

### 8.3 실패 케이스 - 형식 오류

```bash
# 잘못된 전화번호 형식
POST /api/v1/tenants
{
  "tenant_name": "홍길동 공방",
  "tenant_detail_phone": "123-456-7890",  # 잘못된 형식
  "tenant_detail_email": "invalid-email"  # 잘못된 이메일
}

→ 400 Bad Request
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "tenant_detail_phone",
      "message": "Invalid phone number format (e.g., 010-1234-5678 or 01012345678)"
    },
    {
      "field": "tenant_detail_email",
      "message": "Invalid email format"
    }
  ]
}
```

### 8.4 실패 케이스 - 길이 초과

```bash
# 이름이 너무 김
POST /api/v1/tenants
{
  "tenant_name": "홍".repeat(100),  # 50자 초과
  "tenant_detail_phone": "010-1234-5678",
  "tenant_detail_email": "hong@example.com"
}

→ 400 Bad Request
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "tenant_name",
      "message": "Tenant name must be between 2 and 50 characters"
    }
  ]
}
```

### 8.5 실패 케이스 - 수정 불가능한 필드

```bash
# tenant_member_id 변경 시도
PATCH /api/v1/products/1
{
  "product_name": "새 상품명",
  "tenant_member_id": 999  # 변경 금지 필드
}

→ 400 Bad Request
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "tenant_member_id",
      "message": "Cannot change product owner (tenant_member_id)"
    }
  ]
}
```

---

## 9. 주의사항

### 9.1 항상 handleValidationErrors 마지막에 호출

```javascript
// ✅ 올바른 방식
const validateSomething = [
  body('field').notEmpty(),
  handleValidationErrors  // 마지막
];

// ❌ 잘못된 방식 (에러 처리 누락)
const validateSomething = [
  body('field').notEmpty()
  // handleValidationErrors 없음!
];
```

### 9.2 optional vs notEmpty

```javascript
// 필수 필드
body('name')
  .notEmpty()  // 반드시 있어야 함
  .isLength({ min: 2 })

// 선택 필드 (있으면 검증, 없으면 스킵)
body('description')
  .optional({ checkFalsy: true })  // 값이 없으면 검증 스킵
  .isLength({ max: 1000 })
```

### 9.3 trim()과 normalizeEmail() 사용

```javascript
// 앞뒤 공백 자동 제거
body('name')
  .trim()  // "  홍길동  " → "홍길동"

// 이메일 정규화
body('email')
  .normalizeEmail()  // "Hong@Example.COM" → "hong@example.com"
```

### 9.4 isInt vs isFloat

```javascript
// 정수만 허용 (소수점 불가)
body('product_price')
  .isInt({ min: 1 })  // 1000, 2000 (OK)
                       // 1000.5 (NG)

// 실수 허용 (소수점 가능)
body('commission_rate')
  .isFloat({ min: 0, max: 1 })  // 0.15, 0.2 (OK)
```

### 9.5 not().exists() 주의

수정 불가능한 필드를 막을 때만 사용:

```javascript
// ✅ 수정 불가능한 필드 차단
body('tenant_member_id')
  .not()
  .exists()
  .withMessage('Cannot change product owner')

// ❌ 필수 필드에는 사용 금지
body('name')
  .not()  // 이건 뭐?
  .exists()
```

---

## 10. 추가 개선 사항

### 10.1 Custom Validator

복잡한 검증 로직은 Custom Validator로 분리:

```javascript
body('new_password')
  .custom((value, { req }) => {
    if (value === req.body.current_password) {
      throw new Error('New password must be different from current password');
    }
    return true;
  })
```

### 10.2 Sanitization

입력 데이터 정제:

```javascript
body('email')
  .normalizeEmail()  // 이메일 정규화
  .trim()            // 공백 제거
```

### 10.3 배열 검증

```javascript
// 배열 크기 검증
body('images')
  .isArray({ min: 1, max: 10 })

// 배열 내부 요소 검증
body('images.*.url')
  .isURL()
```

---

## 11. 다음 단계

1. **Step 2-20**: 00_INDEX.md 업데이트 (Phase 2 완료 상태 반영)
2. **Phase 3**: 장바구니 및 주문 기능 구현

---

## 12. 정리

이번 Step에서 추가한 Validation Middleware:

### Tenant
- `validateCreateTenant` - 판매사 등록 검증
- `validateUpdateTenant` - 판매사 수정 검증

### TenantMember
- `validateCreateTenantMember` - 구성원 가입 검증
- `validateUpdateTenantMember` - 구성원 수정 검증

### Category
- `validateCreateCategory` - 카테고리 생성 검증
- `validateUpdateCategory` - 카테고리 수정 검증

### Product
- `validateCreateProduct` - 상품 등록 검증
- `validateUpdateProduct` - 상품 수정 검증
- `validateUpdateProductStatus` - 상품 상태 변경 검증
- `validateUploadProductImages` - 상품 이미지 업로드 검증
- `validateReorderProductImages` - 상품 이미지 순서 재배치 검증

**총 11개의 검증 미들웨어**를 추가하여 Phase 2의 모든 API 엔드포인트에 입력 검증을 적용했습니다.

