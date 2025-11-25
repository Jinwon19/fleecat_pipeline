const { body, validationResult } = require('express-validator');

/**
 * 검증 결과를 처리하는 헬퍼 함수
 * 검증 에러가 있으면 400 응답을 반환하고, 없으면 다음 미들웨어로 진행
 */
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

/**
 * 회원가입 입력 검증
 *
 * 검증 항목:
 * - email: 필수, 이메일 형식, 최대 255자
 * - password: 필수, 8자 이상, 영문+숫자 포함
 * - name: 필수, 2~30자
 * - nickname: 필수, 2~20자
 * - phone: 선택, 전화번호 형식 (010-1234-5678 또는 01012345678)
 */
const validateRegister = [
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .isLength({ max: 255 })
    .withMessage('Email must not exceed 255 characters')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
    .withMessage('Password must contain at least one letter and one number'),

  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 30 })
    .withMessage('Name must be between 2 and 30 characters')
    .trim(),

  body('nickname')
    .notEmpty()
    .withMessage('Nickname is required')
    .isLength({ min: 2, max: 20 })
    .withMessage('Nickname must be between 2 and 20 characters')
    .matches(/^[a-zA-Z0-9가-힣]+$/)
    .withMessage('Nickname can only contain letters, numbers, and Korean characters')
    .trim(),

  body('phone')
    .optional({ checkFalsy: true })
    .matches(/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/)
    .withMessage('Invalid phone number format (e.g., 010-1234-5678 or 01012345678)')
    .trim(),

  handleValidationErrors
];

/**
 * 로그인 입력 검증
 *
 * 검증 항목:
 * - email: 필수, 이메일 형식
 * - password: 필수
 */
const validateLogin = [
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),

  handleValidationErrors
];

/**
 * 회원 정보 수정 입력 검증
 *
 * 검증 항목:
 * - nickname: 선택, 2~20자
 * - phone: 선택, 전화번호 형식
 *
 * 참고: 이메일과 비밀번호는 별도 API로 변경
 */
const validateUpdateMember = [
  body('nickname')
    .optional({ checkFalsy: true })
    .isLength({ min: 2, max: 20 })
    .withMessage('Nickname must be between 2 and 20 characters')
    .matches(/^[a-zA-Z0-9가-힣]+$/)
    .withMessage('Nickname can only contain letters, numbers, and Korean characters')
    .trim(),

  body('phone')
    .optional({ checkFalsy: true })
    .matches(/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/)
    .withMessage('Invalid phone number format (e.g., 010-1234-5678 or 01012345678)')
    .trim(),

  body('email')
    .not()
    .exists()
    .withMessage('Email cannot be updated through this endpoint. Use /auth/change-email'),

  body('password')
    .not()
    .exists()
    .withMessage('Password cannot be updated through this endpoint. Use /auth/change-password'),

  handleValidationErrors
];

/**
 * 비밀번호 변경 입력 검증
 *
 * 검증 항목:
 * - current_password: 필수
 * - new_password: 필수, 8자 이상, 영문+숫자 포함
 * - confirm_password: 필수, new_password와 일치
 */
const validateChangePassword = [
  body('current_password')
    .notEmpty()
    .withMessage('Current password is required'),

  body('new_password')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
    .withMessage('New password must contain at least one letter and one number'),

  body('confirm_password')
    .notEmpty()
    .withMessage('Confirm password is required')
    .custom((value, { req }) => {
      if (value !== req.body.new_password) {
        throw new Error('Confirm password does not match new password');
      }
      return true;
    }),

  body('new_password')
    .custom((value, { req }) => {
      if (value === req.body.current_password) {
        throw new Error('New password must be different from current password');
      }
      return true;
    }),

  handleValidationErrors
];

/**
 * 판매사 등록 입력 검증
 *
 * 검증 항목:
 * - tenant_name: 필수, 2~50자
 * - tenant_detail_description: 선택, 최대 1000자
 * - tenant_detail_phone: 필수, 전화번호 형식
 * - tenant_detail_email: 필수, 이메일 형식
 * - tenant_detail_address: 선택, 최대 200자
 * - tenant_detail_commission_rate: 선택, 0~1 범위 (기본값: 0.15)
 */
const validateCreateTenant = [
  body('tenant_name')
    .notEmpty()
    .withMessage('Tenant name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Tenant name must be between 2 and 50 characters')
    .trim(),

  body('tenant_detail_description')
    .optional({ checkFalsy: true })
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters')
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
    .isLength({ max: 255 })
    .withMessage('Email must not exceed 255 characters')
    .normalizeEmail(),

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

/**
 * 판매사 수정 입력 검증
 *
 * 검증 항목:
 * - tenant_name: 선택, 2~50자
 * - tenant_detail_description: 선택, 최대 1000자
 * - tenant_detail_phone: 선택, 전화번호 형식
 * - tenant_detail_email: 선택, 이메일 형식
 * - tenant_detail_address: 선택, 최대 200자
 * - tenant_detail_commission_rate: 선택, 0~1 범위
 */
const validateUpdateTenant = [
  body('tenant_name')
    .optional({ checkFalsy: true })
    .isLength({ min: 2, max: 50 })
    .withMessage('Tenant name must be between 2 and 50 characters')
    .trim(),

  body('tenant_detail_description')
    .optional({ checkFalsy: true })
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters')
    .trim(),

  body('tenant_detail_phone')
    .optional({ checkFalsy: true })
    .matches(/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/)
    .withMessage('Invalid phone number format (e.g., 010-1234-5678 or 01012345678)')
    .trim(),

  body('tenant_detail_email')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('Invalid email format')
    .isLength({ max: 255 })
    .withMessage('Email must not exceed 255 characters')
    .normalizeEmail(),

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

/**
 * 판매사 구성원 가입 입력 검증
 *
 * 검증 항목:
 * - tenant_member_role: 필수, 'owner' | 'member'
 * - tenant_member_bank_name: 선택, 최대 50자
 * - tenant_member_bank_account: 선택, 최대 50자
 */
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

/**
 * 판매사 구성원 수정 입력 검증
 *
 * 검증 항목:
 * - tenant_member_role: 선택, 'owner' | 'member'
 * - tenant_member_bank_name: 선택, 최대 50자
 * - tenant_member_bank_account: 선택, 최대 50자
 */
const validateUpdateTenantMember = [
  body('tenant_member_role')
    .optional({ checkFalsy: true })
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

/**
 * 카테고리 생성 입력 검증
 *
 * 검증 항목:
 * - category_name: 필수, 2~30자
 * - parent_category_id: 선택, 숫자 (NULL이면 대분류)
 * - category_description: 선택, 최대 500자
 * - category_order: 선택, 숫자
 */
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

/**
 * 카테고리 수정 입력 검증
 *
 * 검증 항목:
 * - category_name: 선택, 2~30자
 * - category_description: 선택, 최대 500자
 * - category_order: 선택, 숫자
 * - category_is_active: 선택, boolean
 */
const validateUpdateCategory = [
  body('category_name')
    .optional({ checkFalsy: true })
    .isLength({ min: 2, max: 30 })
    .withMessage('Category name must be between 2 and 30 characters')
    .trim(),

  body('category_description')
    .optional({ checkFalsy: true })
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters')
    .trim(),

  body('category_order')
    .optional({ checkFalsy: true })
    .isInt({ min: 0 })
    .withMessage('Category order must be a non-negative integer'),

  body('category_is_active')
    .optional({ checkFalsy: true })
    .isBoolean()
    .withMessage('category_is_active must be a boolean'),

  body('parent_category_id')
    .not()
    .exists()
    .withMessage('Cannot change parent category (category movement not allowed)'),

  handleValidationErrors
];

/**
 * 상품 등록 입력 검증
 *
 * 검증 항목:
 * - tenant_member_id: 필수, 숫자
 * - category_id: 필수, 숫자
 * - product_name: 필수, 2~100자
 * - product_price: 필수, 0 초과
 * - product_stock: 필수, 0 이상
 * - product_description: 선택, 최대 2000자
 */
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

/**
 * 상품 수정 입력 검증
 *
 * 검증 항목:
 * - category_id: 선택, 숫자
 * - product_name: 선택, 2~100자
 * - product_price: 선택, 0 초과
 * - product_stock: 선택, 0 이상
 * - product_description: 선택, 최대 2000자
 */
const validateUpdateProduct = [
  body('category_id')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Category ID must be a positive integer'),

  body('product_name')
    .optional({ checkFalsy: true })
    .isLength({ min: 2, max: 100 })
    .withMessage('Product name must be between 2 and 100 characters')
    .trim(),

  body('product_price')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Product price must be greater than 0'),

  body('product_stock')
    .optional({ checkFalsy: true })
    .isInt({ min: 0 })
    .withMessage('Product stock must be a non-negative integer'),

  body('product_description')
    .optional({ checkFalsy: true })
    .isLength({ max: 2000 })
    .withMessage('Description must not exceed 2000 characters')
    .trim(),

  body('tenant_member_id')
    .not()
    .exists()
    .withMessage('Cannot change product owner (tenant_member_id)'),

  handleValidationErrors
];

/**
 * 상품 상태 변경 입력 검증
 *
 * 검증 항목:
 * - product_status: 필수, 'active' | 'sold_out' | 'inactive'
 */
const validateUpdateProductStatus = [
  body('product_status')
    .notEmpty()
    .withMessage('Product status is required')
    .isIn(['active', 'sold_out', 'inactive'])
    .withMessage('Product status must be "active", "sold_out", or "inactive"'),

  handleValidationErrors
];

/**
 * 상품 이미지 업로드 입력 검증
 *
 * 검증 항목:
 * - images: 필수, 배열, 최대 10개
 * - product_img_url: 필수, URL 형식
 * - product_img_sequence: 필수, 1~10 범위
 */
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

/**
 * 상품 이미지 순서 재배치 입력 검증
 *
 * 검증 항목:
 * - image_orders: 필수, 배열
 * - product_img_id: 필수, 숫자
 * - product_img_sequence: 필수, 1~10 범위
 */
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

module.exports = {
  // Member & Auth validations
  validateRegister,
  validateLogin,
  validateUpdateMember,
  validateChangePassword,

  // Tenant validations
  validateCreateTenant,
  validateUpdateTenant,

  // TenantMember validations
  validateCreateTenantMember,
  validateUpdateTenantMember,

  // Category validations
  validateCreateCategory,
  validateUpdateCategory,

  // Product validations
  validateCreateProduct,
  validateUpdateProduct,
  validateUpdateProductStatus,
  validateUploadProductImages,
  validateReorderProductImages
};
