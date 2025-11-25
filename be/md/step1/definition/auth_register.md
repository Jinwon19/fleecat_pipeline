# POST /api/v1/auth/register - 회원가입 API

> **작성일**: 2025-01-13
> **구현 파일**: `src/routes/auth.routes.js`, `src/controllers/auth.controller.js`, `src/services/auth.service.js`

---

## 📋 API 기본 정보

| 항목 | 내용 |
|------|------|
| **메서드** | POST |
| **경로** | `/api/v1/auth/register` |
| **설명** | 새로운 회원을 등록합니다 |
| **접근 권한** | Public (인증 불필요) |
| **Content-Type** | `application/json` |

---

## 📤 요청 명세

### 요청 헤더

```http
Content-Type: application/json
```

### 요청 본문

| 필드 | 타입 | 필수 | 설명 | 제약 조건 |
|------|------|------|------|----------|
| `email` | String | ✅ | 이메일 주소 | 이메일 형식, 중복 불가 |
| `password` | String | ✅ | 비밀번호 | 8~100자, 특수문자 1개 이상 |
| `name` | String | ✅ | 이름 | 2~30자 |
| `nickname` | String | ✅ | 닉네임 | 2~30자, 중복 불가 |
| `phone` | String | ❌ | 전화번호 | 10~15자, 숫자와 `-` |

### 요청 예제

```json
{
  "email": "user@example.com",
  "password": "secure123!",
  "name": "홍길동",
  "nickname": "길동이",
  "phone": "010-1234-5678"
}
```

---

## 📥 응답 명세

### 성공 응답 (201 Created)

```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "member": {
      "member_id": 123,
      "member_email": "user@example.com",
      "member_name": "홍길동",
      "member_nickname": "길동이",
      "member_phone": "010-1234-5678",
      "member_status": "active",
      "member_account_role": "buyer",
      "company_id": null,
      "member_created_at": "2025-01-13T12:00:00.000Z",
      "member_updated_at": "2025-01-13T12:00:00.000Z",
      "role": "buyer",
      "roles": ["buyer"]
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**응답 필드 설명**:
- `member` - 생성된 회원 정보 (비밀번호 제외)
- `token` - JWT 토큰 (로그인용)
- `member_password` - **반환되지 않음** (보안)

### 에러 응답

#### 1. 입력 검증 실패 (400 Bad Request)

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters"
    }
  ]
}
```

#### 2. 이메일 중복 (400 Bad Request)

```json
{
  "success": false,
  "message": "Email already exists"
}
```

#### 3. 닉네임 중복 (400 Bad Request)

```json
{
  "success": false,
  "message": "Nickname already exists"
}
```

#### 4. 서버 오류 (500 Internal Server Error)

```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## 🔢 HTTP 상태 코드

| 상태 코드 | 설명 | 발생 케이스 |
|----------|------|-----------|
| **201 Created** | 회원가입 성공 | 정상 처리 |
| **400 Bad Request** | 잘못된 요청 | 입력 검증 실패, 이메일/닉네임 중복 |
| **500 Internal Server Error** | 서버 오류 | 예상치 못한 에러 |

---

## ⚠️ 에러 코드

| 에러 메시지 | 원인 | 해결 방법 |
|-----------|------|----------|
| `Invalid email format` | 이메일 형식 오류 | 올바른 이메일 형식 입력 |
| `Password must be at least 8 characters` | 비밀번호 너무 짧음 | 8자 이상 입력 |
| `Password must contain at least one special character` | 특수문자 없음 | 특수문자 1개 이상 포함 |
| `Name must be between 2 and 30 characters` | 이름 길이 오류 | 2~30자로 입력 |
| `Nickname must be between 2 and 30 characters` | 닉네임 길이 오류 | 2~30자로 입력 |
| `Email already exists` | 이메일 중복 | 다른 이메일 사용 |
| `Nickname already exists` | 닉네임 중복 | 다른 닉네임 사용 |

---

## 💻 요청 예제

### cURL

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "secure123!",
    "name": "홍길동",
    "nickname": "길동이",
    "phone": "010-1234-5678"
  }'
```

### JavaScript (fetch)

```javascript
const response = await fetch('http://localhost:3000/api/v1/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'secure123!',
    name: '홍길동',
    nickname: '길동이',
    phone: '010-1234-5678'
  })
});

const data = await response.json();

if (data.success) {
  console.log('회원가입 성공:', data.data.member);
  console.log('JWT 토큰:', data.data.token);

  // 토큰을 로컬스토리지에 저장
  localStorage.setItem('fleecat_token', data.data.token);
} else {
  console.error('회원가입 실패:', data.message);
}
```

### Axios

```javascript
import axios from 'axios';

try {
  const response = await axios.post('http://localhost:3000/api/v1/auth/register', {
    email: 'user@example.com',
    password: 'secure123!',
    name: '홍길동',
    nickname: '길동이',
    phone: '010-1234-5678'
  });

  console.log('회원가입 성공:', response.data.data.member);
  console.log('JWT 토큰:', response.data.data.token);
} catch (error) {
  if (error.response) {
    console.error('회원가입 실패:', error.response.data.message);
    if (error.response.data.errors) {
      console.error('검증 에러:', error.response.data.errors);
    }
  }
}
```

---

## 🔄 비즈니스 로직

### 처리 흐름

```
1. 요청 수신
   ↓
2. 입력 검증 (validateRegister 미들웨어)
   - email: 이메일 형식 확인
   - password: 8자 이상, 특수문자 포함 확인
   - name: 2~30자 확인
   - nickname: 2~30자 확인
   - phone: 10~15자 확인 (선택)
   ↓
3. Auth Service 호출
   ↓
4. 이메일 중복 확인
   - memberRepository.existsByEmail(email)
   - 중복 시 ValidationError 발생
   ↓
5. 닉네임 중복 확인
   - memberRepository.existsByNickname(nickname)
   - 중복 시 ValidationError 발생
   ↓
6. 비밀번호 해싱
   - bcrypt.hash(password, 10)
   - Salt rounds: 10
   ↓
7. 회원 생성
   - memberRepository.create({...})
   - member_status: 'active'
   - member_account_role: 'buyer'
   ↓
8. 기본 권한 부여
   - memberPermissionRepository.create({
       member_id,
       permission_role: 'buyer'
     })
   ↓
9. JWT 토큰 발급
   - generateToken({
       member_id,
       email,
       role: 'buyer'
     })
   - 만료 시간: 7일 (JWT_EXPIRES_IN)
   ↓
10. 응답 반환
    - 201 Created
    - { member, token }
```

### 데이터베이스 트랜잭션

회원 생성과 권한 부여는 **별도의 트랜잭션**으로 처리됩니다.

**이유**:
- Prisma는 자동으로 각 쿼리를 트랜잭션으로 처리
- 회원 생성 실패 시 권한은 생성되지 않음
- 권한 생성 실패 시 에러 발생 (회원은 이미 생성됨)

**개선 방향** (추후):
```javascript
// Prisma $transaction 사용
await prisma.$transaction(async (tx) => {
  const member = await tx.member.create({...});
  await tx.memberPermission.create({...});
});
```

---

## 🔐 보안 고려사항

### 1. 비밀번호 해싱

```javascript
const hashedPassword = await bcrypt.hash(password, 10);
```

- **알고리즘**: bcrypt
- **Salt rounds**: 10
- **평문 비밀번호는 절대 저장하지 않음**

### 2. 비밀번호 응답 제외

```javascript
const { member_password, ...memberData } = member;
return { member: memberData, token };
```

- 응답에서 `member_password` 필드 제거
- 클라이언트는 비밀번호를 받지 못함

### 3. 이메일 중복 확인

```javascript
const emailExists = await memberRepository.existsByEmail(email);
if (emailExists) {
  throw new ValidationError('Email already exists');
}
```

- 회원가입 전 이메일 중복 확인
- 데이터베이스 Unique 제약 조건으로도 보호

### 4. 닉네임 중복 확인

```javascript
const nicknameExists = await memberRepository.existsByNickname(nickname);
if (nicknameExists) {
  throw new ValidationError('Nickname already exists');
}
```

- 회원가입 전 닉네임 중복 확인
- 데이터베이스 Unique 제약 조건으로도 보호

### 5. JWT 토큰 발급

```javascript
const token = generateToken({
  member_id: Number(member.member_id),
  email: member.member_email,
  role: 'buyer'
});
```

- JWT 토큰에는 최소한의 정보만 포함
- 비밀번호, 전화번호 등 민감 정보는 포함하지 않음

---

## 📊 관련 테이블

### Member 테이블

```sql
CREATE TABLE member (
  member_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  member_email VARCHAR(100) UNIQUE NOT NULL,
  member_password VARCHAR(255),
  member_name VARCHAR(30) NOT NULL,
  member_nickname VARCHAR(30) UNIQUE NOT NULL,
  member_phone VARCHAR(15),
  member_account_role VARCHAR(20) DEFAULT 'buyer',
  member_status VARCHAR(20) DEFAULT 'active',
  member_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  member_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### MemberPermission 테이블

```sql
CREATE TABLE member_permissions (
  member_permission_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  member_id BIGINT UNIQUE NOT NULL,
  member_permission_role INT DEFAULT 1,
  can_purchase BOOLEAN DEFAULT TRUE,
  can_board_write BOOLEAN DEFAULT TRUE,
  is_account_active BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (member_id) REFERENCES member(member_id) ON DELETE CASCADE
);
```

---

## 🧪 테스트 케이스

### 성공 케이스

1. ✅ 정상 회원가입
2. ✅ 전화번호 없이 회원가입

### 실패 케이스

1. ❌ 이메일 형식 오류
2. ❌ 비밀번호 너무 짧음 (8자 미만)
3. ❌ 비밀번호 특수문자 없음
4. ❌ 이름 너무 짧음 (2자 미만)
5. ❌ 닉네임 너무 짧음 (2자 미만)
6. ❌ 이메일 중복
7. ❌ 닉네임 중복
8. ❌ 필수 필드 누락 (email, password, name, nickname)

---

## 📚 관련 문서

- [로그인 API](./auth_login.md)
- [비밀번호 변경 API](./auth_change_password.md)
- [Auth Service 구현](../1-6_auth_service.md)
- [Member Repository 구현](../1-4_member_repository.md)

---

**작성자**: Backend Team
**최종 업데이트**: 2025-01-13
