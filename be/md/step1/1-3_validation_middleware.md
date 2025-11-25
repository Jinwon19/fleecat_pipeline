# Step 1-3: 입력 검증 미들웨어 생성

> **Phase 1: 기초 인프라 구축**
> **작성일**: 2025년 10월 1일
> **상태**: ✅ 완료

---

## 📋 작업 개요

### 목적
클라이언트가 보낸 데이터의 형식, 필수 값, 보안 규칙을 검증하여 잘못된 데이터가 서버에 저장되는 것을 방지합니다.

### 작업 내용
- `express-validator` 패키지 설치
- `src/middlewares/validation.js` 파일 생성
- `validateRegister()` 함수 구현 - 회원가입 입력 검증
- `validateLogin()` 함수 구현 - 로그인 입력 검증
- `validateUpdateMember()` 함수 구현 - 회원 정보 수정 검증
- `validateChangePassword()` 함수 구현 - 비밀번호 변경 검증

---

## 🎯 입력 검증이 필요한 이유

### 1. 데이터 무결성 보장
- 잘못된 형식의 데이터가 DB에 저장되는 것을 방지
- 이메일 형식, 전화번호 형식 등 규칙 준수
- 필수 필드 누락 방지

### 2. 보안 위협 차단
- **SQL Injection**: 악의적인 SQL 쿼리 삽입 시도 차단
- **XSS (Cross-Site Scripting)**: 스크립트 태그 삽입 방지
- **Buffer Overflow**: 과도하게 긴 입력 차단

### 3. 사용자 경험 개선
- 명확한 에러 메시지 제공
- 빠른 피드백 (DB 조회 전 검증)
- 어떤 필드가 잘못되었는지 명시

### 4. 서버 리소스 절약
- 잘못된 요청을 조기에 차단
- 불필요한 DB 조회 방지
- 비즈니스 로직 실행 전 필터링

---

## 📁 파일 위치

```
src/
└── middlewares/
    ├── auth.js           (Step 1-2)
    ├── errorHandler.js   (기존)
    └── validation.js     ← 생성한 파일
```

---

## 💻 구현 코드

### 전체 코드 구조

```javascript
const { body, validationResult } = require('express-validator');

/**
 * 검증 결과를 처리하는 헬퍼 함수
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
```

---

## 🔧 검증 함수 설명

### 1. `validateRegister` - 회원가입 검증

**검증 항목**:
- `email`: 필수, 이메일 형식, 최대 255자
- `password`: 필수, 8자 이상, 영문+숫자 포함
- `nickname`: 필수, 2~20자, 한글/영문/숫자만
- `phone`: 선택, 전화번호 형식

**구현 코드**:
```javascript
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
```

**사용 예시**:
```javascript
// src/routes/auth.routes.js
router.post('/register', validateRegister, authController.register);
```

**성공 케이스**:
```json
// 요청
{
  "email": "user@example.com",
  "password": "secure123!",
  "nickname": "홍길동",
  "phone": "010-1234-5678"
}

// 검증 통과 → 다음 미들웨어로 진행
```

**실패 케이스**:
```json
// 요청
{
  "email": "not-an-email",
  "password": "123",
  "nickname": "홍"
}

// 응답 (400 Bad Request)
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Invalid email format" },
    { "field": "password", "message": "Password must be at least 8 characters" },
    { "field": "password", "message": "Password must contain at least one letter and one number" },
    { "field": "nickname", "message": "Nickname must be between 2 and 20 characters" }
  ]
}
```

---

### 2. `validateLogin` - 로그인 검증

**검증 항목**:
- `email`: 필수, 이메일 형식
- `password`: 필수

**구현 코드**:
```javascript
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
```

**사용 예시**:
```javascript
// src/routes/auth.routes.js
router.post('/login', validateLogin, authController.login);
```

**성공 케이스**:
```json
{
  "email": "user@example.com",
  "password": "anypassword"
}
// 검증 통과 → authController에서 비밀번호 일치 여부 확인
```

**실패 케이스**:
```json
// 요청
{
  "email": "user@example.com"
  // password 누락
}

// 응답 (400 Bad Request)
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "password", "message": "Password is required" }
  ]
}
```

---

### 3. `validateUpdateMember` - 회원 정보 수정 검증

**검증 항목**:
- `nickname`: 선택, 2~20자
- `phone`: 선택, 전화번호 형식
- `email`, `password`: 수정 불가 (별도 API 사용)

**구현 코드**:
```javascript
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
```

**사용 예시**:
```javascript
// src/routes/member.routes.js
router.put('/me', validateUpdateMember, authenticate, memberController.updateMe);
```

**성공 케이스**:
```json
// 요청
{
  "nickname": "새닉네임",
  "phone": "010-9999-8888"
}

// 검증 통과
```

**실패 케이스**:
```json
// 요청 (이메일 변경 시도)
{
  "email": "newemail@example.com",
  "nickname": "홍길동"
}

// 응답 (400 Bad Request)
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Email cannot be updated through this endpoint. Use /auth/change-email" }
  ]
}
```

---

### 4. `validateChangePassword` - 비밀번호 변경 검증

**검증 항목**:
- `current_password`: 필수
- `new_password`: 필수, 8자 이상, 영문+숫자 포함, 현재 비밀번호와 달라야 함
- `confirm_password`: 필수, new_password와 일치

**구현 코드**:
```javascript
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
```

**사용 예시**:
```javascript
// src/routes/auth.routes.js
router.put('/change-password', validateChangePassword, authenticate, authController.changePassword);
```

**성공 케이스**:
```json
{
  "current_password": "oldpass123!",
  "new_password": "newpass456!",
  "confirm_password": "newpass456!"
}
// 검증 통과 → authController에서 current_password 일치 여부 확인
```

**실패 케이스 1 - 비밀번호 불일치**:
```json
// 요청
{
  "current_password": "oldpass123!",
  "new_password": "newpass456!",
  "confirm_password": "different!"
}

// 응답 (400 Bad Request)
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "confirm_password", "message": "Confirm password does not match new password" }
  ]
}
```

**실패 케이스 2 - 새 비밀번호가 현재와 동일**:
```json
// 요청
{
  "current_password": "samepass123!",
  "new_password": "samepass123!",
  "confirm_password": "samepass123!"
}

// 응답 (400 Bad Request)
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "new_password", "message": "New password must be different from current password" }
  ]
}
```

---

## 🔄 전체 요청 흐름

### 회원가입 성공 시

```
📱 클라이언트 요청
   POST /api/v1/auth/register
   Body: {
     "email": "user@example.com",
     "password": "secure123!",
     "nickname": "홍길동"
   }
       ↓
🔍 validateRegister 미들웨어
   1. email 검증 ✅
   2. password 검증 ✅
   3. nickname 검증 ✅
   4. 모든 검증 통과 → next()
       ↓
🎯 authController.register
   1. 이메일 중복 확인
   2. 비밀번호 해싱
   3. DB에 저장
   4. JWT 토큰 생성
       ↓
✅ 응답 (201 Created)
   {
     "success": true,
     "message": "Registration successful",
     "data": {
       "member_id": 123,
       "email": "user@example.com",
       "token": "eyJhbGci..."
     }
   }
```

### 검증 실패 시

```
📱 클라이언트 요청
   POST /api/v1/auth/register
   Body: {
     "email": "not-an-email",
     "password": "123",
     "nickname": "홍"
   }
       ↓
🔍 validateRegister 미들웨어
   1. email 검증 ❌ (형식 오류)
   2. password 검증 ❌ (길이 부족, 영문+숫자 미포함)
   3. nickname 검증 ❌ (길이 부족)
   4. handleValidationErrors 실행
       ↓
❌ 응답 (400 Bad Request)
   {
     "success": false,
     "message": "Validation failed",
     "errors": [
       { "field": "email", "message": "Invalid email format" },
       { "field": "password", "message": "Password must be at least 8 characters" },
       { "field": "password", "message": "Password must contain at least one letter and one number" },
       { "field": "nickname", "message": "Nickname must be between 2 and 20 characters" }
     ]
   }

   ⚠️ authController.register는 실행되지 않음!
```

---

## 🛡️ 보안 기능

### 1. SQL Injection 방지

```javascript
// 악의적인 입력
{
  "email": "admin'; DROP TABLE member; --@example.com"
}

// 검증 결과
{
  "field": "email",
  "message": "Invalid email format"
}
// SQL 쿼리가 실행되기 전에 차단됨
```

### 2. XSS (Cross-Site Scripting) 방지

```javascript
// 악의적인 입력
{
  "nickname": "<script>alert('XSS')</script>"
}

// 검증 결과
{
  "field": "nickname",
  "message": "Nickname can only contain letters, numbers, and Korean characters"
}
// 스크립트 태그가 차단됨
```

### 3. Buffer Overflow 방지

```javascript
// 과도하게 긴 입력
{
  "email": "a".repeat(1000) + "@example.com"
}

// 검증 결과
{
  "field": "email",
  "message": "Email must not exceed 255 characters"
}
```

### 4. 권한 상승 시도 차단

```javascript
// 관리자 권한 획득 시도
{
  "email": "user@example.com",
  "password": "secure123!",
  "role": "admin"  // ← 사용자가 직접 지정 시도
}

// role 필드는 검증 대상이 아니므로 무시됨
// 서비스 레이어에서 기본값 'buyer'로 설정
```

---

## 📊 express-validator 주요 메서드

### 기본 검증

| 메서드 | 설명 | 예시 |
|--------|------|------|
| `notEmpty()` | 빈 값 불허 | email 필수 |
| `isEmail()` | 이메일 형식 | user@example.com |
| `isLength({ min, max })` | 길이 제한 | 8~20자 |
| `matches(regex)` | 정규식 패턴 | 영문+숫자 조합 |
| `optional()` | 선택 필드 | phone (있으면 검증) |

### 데이터 변환 (Sanitization)

| 메서드 | 설명 | 예시 |
|--------|------|------|
| `trim()` | 앞뒤 공백 제거 | " 홍길동 " → "홍길동" |
| `normalizeEmail()` | 이메일 정규화 | User@Example.COM → user@example.com |
| `escape()` | HTML 특수문자 이스케이프 | `<script>` → `&lt;script&gt;` |

### 커스텀 검증

```javascript
body('confirm_password')
  .custom((value, { req }) => {
    if (value !== req.body.new_password) {
      throw new Error('Passwords do not match');
    }
    return true;
  })
```

---

## 🧪 테스트 방법

### 방법 1: curl로 테스트

```bash
# 1. 정상 회원가입
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "secure123!",
    "nickname": "홍길동",
    "phone": "010-1234-5678"
  }'

# 2. 이메일 형식 오류
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "not-an-email",
    "password": "secure123!",
    "nickname": "홍길동"
  }'

# 3. 비밀번호 약함
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "123",
    "nickname": "홍길동"
  }'

# 4. 필수 필드 누락
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com"
  }'
```

### 방법 2: Postman 테스트 케이스

#### Collection: Auth API

**1. Register - Success**
```
POST http://localhost:3000/api/v1/auth/register
Body:
{
  "email": "user@example.com",
  "password": "secure123!",
  "nickname": "홍길동"
}

Expected: 201 Created
```

**2. Register - Invalid Email**
```
POST http://localhost:3000/api/v1/auth/register
Body:
{
  "email": "invalid-email",
  "password": "secure123!",
  "nickname": "홍길동"
}

Expected: 400 Bad Request
Error: "Invalid email format"
```

**3. Register - Weak Password**
```
POST http://localhost:3000/api/v1/auth/register
Body:
{
  "email": "user@example.com",
  "password": "weak",
  "nickname": "홍길동"
}

Expected: 400 Bad Request
Errors:
- "Password must be at least 8 characters"
- "Password must contain at least one letter and one number"
```

**4. Login - Success**
```
POST http://localhost:3000/api/v1/auth/login
Body:
{
  "email": "user@example.com",
  "password": "secure123!"
}

Expected: 200 OK
```

**5. Update Member - Email Not Allowed**
```
PUT http://localhost:3000/api/v1/members/me
Headers:
  Authorization: Bearer {token}
Body:
{
  "email": "newemail@example.com"
}

Expected: 400 Bad Request
Error: "Email cannot be updated through this endpoint. Use /auth/change-email"
```

---

## ⚠️ 주의사항

### 1. 검증 미들웨어 순서

```javascript
// ✅ 올바른 순서: 검증 → 인증 → 컨트롤러
router.post('/register', validateRegister, authController.register);
router.put('/me', validateUpdateMember, authenticate, memberController.updateMe);

// ❌ 잘못된 순서 (검증 없이 컨트롤러 실행)
router.post('/register', authController.register);
```

### 2. 검증 vs 비즈니스 로직 검증

**미들웨어에서 검증** (정적 검증):
- 이메일 형식
- 비밀번호 강도
- 필수 필드
- 데이터 길이

**서비스에서 검증** (동적 검증):
- 이메일 중복 여부 (DB 조회 필요)
- 현재 비밀번호 일치 여부
- 사용자 권한 확인

```javascript
// src/services/auth.service.js
async function register(data) {
  // 미들웨어에서 이미 형식 검증 완료

  // 비즈니스 로직 검증
  const existingMember = await memberRepository.findByEmail(data.email);
  if (existingMember) {
    throw new ValidationError('Email already exists');
  }

  // 회원가입 로직
  ...
}
```

### 3. 비밀번호는 검증만, 해싱은 서비스에서

```javascript
// ✅ 올바른 방식
// 미들웨어: 비밀번호 강도 검증
body('password').isLength({ min: 8 }).matches(/^(?=.*[A-Za-z])(?=.*\d)/)

// 서비스: 비밀번호 해싱
const hashedPassword = await bcrypt.hash(password, 10);

// ❌ 잘못된 방식 (미들웨어에서 해싱 X)
```

### 4. 에러 메시지는 명확하게

```javascript
// ✅ 좋은 에러 메시지
"Password must be at least 8 characters"
"Nickname can only contain letters, numbers, and Korean characters"

// ❌ 나쁜 에러 메시지
"Invalid input"
"Error"
```

---

## 📈 검증 확장하기

### 추가 검증 규칙 예시

**생년월일 검증**:
```javascript
body('birth_date')
  .optional()
  .isISO8601()
  .withMessage('Invalid date format (YYYY-MM-DD)')
  .custom((value) => {
    const age = new Date().getFullYear() - new Date(value).getFullYear();
    if (age < 14) {
      throw new Error('Must be at least 14 years old');
    }
    return true;
  })
```

**URL 검증**:
```javascript
body('website')
  .optional()
  .isURL()
  .withMessage('Invalid URL format')
```

**파일 업로드 검증** (multer 사용 시):
```javascript
body('profile_image')
  .custom((value, { req }) => {
    if (!req.file) return true;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      throw new Error('Only JPEG, PNG, and GIF images are allowed');
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (req.file.size > maxSize) {
      throw new Error('Image size must not exceed 5MB');
    }

    return true;
  })
```

---

## 🔗 이전 단계들과의 관계

```
Step 1-1: JWT 유틸리티
  → 토큰 생성/검증 도구 제공

Step 1-2: 인증 미들웨어
  → 로그인한 사용자 식별

Step 1-3: 입력 검증 미들웨어 ← 현재 단계
  → 데이터 형식 검증 (인증보다 먼저 실행)

Step 1-4~: Repository, Service, Controller
  → 검증된 데이터로 비즈니스 로직 수행
```

**실행 순서**:
```javascript
router.post('/register',
  validateRegister,    // 1. 먼저 데이터 검증
  authController.register  // 2. 검증 통과 시 실행
);

router.put('/me',
  validateUpdateMember,  // 1. 데이터 검증
  authenticate,          // 2. 로그인 확인
  memberController.updateMe  // 3. 업데이트 실행
);
```

---

## 🔄 다음 단계

### Step 1-4: Member Repository
다음 단계에서는 Member 테이블의 데이터 접근 계층(Repository)을 만들 예정입니다:

- `src/repositories/member.repository.js`
- Prisma를 사용한 CRUD 작업
- 이메일로 회원 조회
- 회원 생성/수정/삭제

---

## 📚 참고 자료

### 공식 문서
- [express-validator 공식 문서](https://express-validator.github.io/docs/)
- [express-validator GitHub](https://github.com/express-validator/express-validator)

### 관련 가이드
- [02. 코딩 표준](../02_CODING_STANDARDS.md)
- [04. API 개발 가이드](../04_API_DEVELOPMENT.md)

### 이전 단계
- [Step 1-1: JWT 유틸리티](./1-1_jwt_util.md)
- [Step 1-2: 인증 미들웨어](./1-2_auth_middleware.md)

---

**작성일**: 2025년 10월 1일
**작성자**: Backend Team
**상태**: ✅ 완료
