# POST /api/v1/auth/login - 로그인 API

> **작성일**: 2025-01-13
> **구현 파일**: `src/routes/auth.routes.js`, `src/controllers/auth.controller.js`, `src/services/auth.service.js`

---

## 📋 API 기본 정보

| 항목 | 내용 |
|------|------|
| **메서드** | POST |
| **경로** | `/api/v1/auth/login` |
| **설명** | 이메일과 비밀번호로 로그인하여 JWT 토큰을 발급받습니다 |
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
| `email` | String | ✅ | 이메일 주소 | 이메일 형식 |
| `password` | String | ✅ | 비밀번호 | 8~100자 |

### 요청 예제

```json
{
  "email": "user@example.com",
  "password": "secure123!"
}
```

---

## 📥 응답 명세

### 성공 응답 (200 OK)

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "member": {
      "member_id": 123,
      "member_email": "user@example.com",
      "member_name": "홍길동",
      "member_nickname": "길동이",
      "member_phone": "010-1234-5678",
      "member_status": "active",
      "member_account_role": "seller",
      "company_id": null,
      "member_created_at": "2025-01-13T12:00:00.000Z",
      "member_updated_at": "2025-01-13T15:30:00.000Z",
      "role": "seller",
      "roles": ["buyer", "seller"]
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**응답 필드 설명**:
- `member` - 회원 정보 (비밀번호 제외)
- `token` - JWT 토큰 (인증용, 7일 만료)
- `role` - 주요 권한 (buyer/seller/admin)
- `roles` - 모든 권한 배열
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
      "message": "Password is required"
    }
  ]
}
```

#### 2. 이메일 또는 비밀번호 오류 (401 Unauthorized)

```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

**보안상 이유로 이메일/비밀번호 오류를 구분하지 않습니다.**

#### 3. 계정 정지/삭제 (401 Unauthorized)

```json
{
  "success": false,
  "message": "Account is suspended or deleted"
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
| **200 OK** | 로그인 성공 | 정상 처리 |
| **400 Bad Request** | 잘못된 요청 | 입력 검증 실패 |
| **401 Unauthorized** | 인증 실패 | 이메일/비밀번호 오류, 계정 정지 |
| **500 Internal Server Error** | 서버 오류 | 예상치 못한 에러 |

---

## ⚠️ 에러 코드

| 에러 메시지 | 원인 | 해결 방법 |
|-----------|------|----------|
| `Invalid email format` | 이메일 형식 오류 | 올바른 이메일 형식 입력 |
| `Password is required` | 비밀번호 누락 | 비밀번호 입력 |
| `Invalid credentials` | 이메일 또는 비밀번호 오류 | 올바른 이메일/비밀번호 입력 |
| `Account is suspended or deleted` | 계정 정지/삭제 | 관리자 문의 |

---

## 💻 요청 예제

### cURL

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "secure123!"
  }'
```

### JavaScript (fetch)

```javascript
const response = await fetch('http://localhost:3000/api/v1/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'secure123!'
  })
});

const data = await response.json();

if (data.success) {
  console.log('로그인 성공:', data.data.member);
  console.log('JWT 토큰:', data.data.token);

  // 토큰을 로컬스토리지에 저장
  localStorage.setItem('fleecat_token', data.data.token);
  localStorage.setItem('fleecat_user', JSON.stringify(data.data.member));

  // 이후 API 호출 시 토큰 사용
  // Authorization: Bearer {token}
} else {
  console.error('로그인 실패:', data.message);
}
```

### Axios

```javascript
import axios from 'axios';

try {
  const response = await axios.post('http://localhost:3000/api/v1/auth/login', {
    email: 'user@example.com',
    password: 'secure123!'
  });

  const { member, token } = response.data.data;

  console.log('로그인 성공:', member);
  console.log('JWT 토큰:', token);

  // 토큰 저장
  localStorage.setItem('fleecat_token', token);

  // Axios 기본 헤더 설정
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
} catch (error) {
  if (error.response) {
    const { status, data } = error.response;

    if (status === 401) {
      console.error('인증 실패:', data.message);
      // 이메일/비밀번호 오류 처리
    } else if (status === 400) {
      console.error('입력 검증 실패:', data.errors);
    }
  }
}
```

### React 컴포넌트 예제

```javascript
import { useState } from 'react';
import axios from 'axios';

function LoginForm() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await axios.post('/api/v1/auth/login', formData);
      const { token, member } = response.data.data;

      // 토큰 저장
      localStorage.setItem('fleecat_token', token);
      localStorage.setItem('fleecat_user', JSON.stringify(member));

      // 로그인 성공 처리
      window.location.href = '/dashboard';
    } catch (err) {
      if (err.response) {
        setError(err.response.data.message);
      } else {
        setError('서버와 통신할 수 없습니다.');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder="이메일"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        required
      />
      <input
        type="password"
        placeholder="비밀번호"
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        required
      />
      {error && <div className="error">{error}</div>}
      <button type="submit">로그인</button>
    </form>
  );
}
```

---

## 🔄 비즈니스 로직

### 처리 흐름

```
1. 요청 수신
   ↓
2. 입력 검증 (validateLogin 미들웨어)
   - email: 이메일 형식 확인
   - password: 필수 확인
   ↓
3. Auth Service 호출
   ↓
4. 이메일로 회원 조회
   - memberRepository.findByEmail(email)
   - 회원 없으면 UnauthorizedError 발생
   ↓
5. 회원 상태 확인
   - member_status === 'active' 확인
   - 아니면 UnauthorizedError 발생
   ↓
6. 비밀번호 검증
   - bcrypt.compare(password, member_password)
   - 일치하지 않으면 UnauthorizedError 발생
   ↓
7. 권한 조회
   - member_account_role 추출
   - 기본값: 'buyer'
   ↓
8. JWT 토큰 발급
   - generateToken({
       member_id,
       email,
       role,
       roles: [role]
     })
   - 만료 시간: 7일 (JWT_EXPIRES_IN)
   ↓
9. 응답 반환
   - 200 OK
   - { member, token }
```

### 보안 처리

1. **비밀번호 검증 시간 일정하게 유지**
   - bcrypt.compare는 타이밍 공격 방어
   - 성공/실패 모두 동일한 시간 소요

2. **에러 메시지 일반화**
   - "Invalid credentials" - 이메일/비밀번호 오류 구분 안 함
   - 공격자가 존재하는 이메일을 알 수 없도록

3. **계정 상태 확인**
   - member_status: active만 로그인 허용
   - suspended, inactive는 로그인 차단

---

## 🔐 보안 고려사항

### 1. 비밀번호 검증

```javascript
const isPasswordValid = await bcrypt.compare(password, member.member_password);
```

- **bcrypt 사용**: 타이밍 공격 방어
- **평문 비밀번호는 저장하지 않음**

### 2. 에러 메시지 일반화

```javascript
// ❌ 나쁜 예
if (!member) {
  throw new Error('Email not found');
}
if (!isPasswordValid) {
  throw new Error('Password incorrect');
}

// ✅ 좋은 예
if (!member || !isPasswordValid) {
  throw new UnauthorizedError('Invalid credentials');
}
```

**이유**: 공격자가 존재하는 이메일을 알 수 없도록

### 3. 계정 상태 확인

```javascript
if (member.member_status !== 'active') {
  throw new UnauthorizedError('Account is suspended or deleted');
}
```

- **active**: 로그인 허용
- **suspended**: 정지된 계정
- **inactive**: 탈퇴한 계정

### 4. JWT 토큰 발급

```javascript
const token = generateToken({
  member_id: Number(member.member_id),
  email: member.member_email,
  role: primaryRole,
  roles: allRoles
});
```

- **만료 시간**: 7일 (환경 변수 JWT_EXPIRES_IN)
- **포함 정보**: member_id, email, role, roles
- **제외 정보**: 비밀번호, 전화번호 등 민감 정보

### 5. 로그인 시간 업데이트 (선택)

현재는 구현되지 않았지만, 추후 다음과 같이 구현 가능:

```javascript
// 로그인 성공 시 마지막 로그인 시간 업데이트
await memberRepository.updateLoginTime(member.member_id);
```

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
  member_status VARCHAR(20) DEFAULT 'active',  -- 로그인 가능 여부
  member_account_role VARCHAR(20) DEFAULT 'buyer',  -- 기본 권한
  member_last_login_at TIMESTAMP,  -- 마지막 로그인 시간 (선택)
  INDEX idx_email (member_email),
  INDEX idx_status (member_status)
);
```

---

## 🧪 테스트 케이스

### 성공 케이스

1. ✅ 정상 로그인 (buyer)
2. ✅ 정상 로그인 (seller)
3. ✅ 정상 로그인 (admin)

### 실패 케이스

1. ❌ 이메일 형식 오류
2. ❌ 비밀번호 누락
3. ❌ 존재하지 않는 이메일
4. ❌ 비밀번호 불일치
5. ❌ 계정 정지 (member_status: suspended)
6. ❌ 계정 삭제 (member_status: inactive)

---

## 🔗 JWT 토큰 사용 방법

### 토큰 저장

```javascript
// 로그인 성공 후
localStorage.setItem('fleecat_token', token);
```

### 인증이 필요한 API 호출

```javascript
// Authorization 헤더에 토큰 포함
const response = await fetch('/api/v1/members/me', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('fleecat_token')}`
  }
});
```

### Axios 기본 헤더 설정

```javascript
// 로그인 후 한 번만 설정
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

// 이후 모든 요청에 자동으로 토큰 포함
await axios.get('/api/v1/members/me');
await axios.put('/api/v1/members/me', { nickname: '새닉네임' });
```

### 토큰 만료 처리

```javascript
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 토큰 만료 또는 유효하지 않음
      localStorage.removeItem('fleecat_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

---

## 📚 관련 문서

- [회원가입 API](./auth_register.md)
- [비밀번호 변경 API](./auth_change_password.md)
- [소셜 로그인 API](./auth_social_login.md)
- [내 정보 조회 API](./member_get_me.md)
- [Auth Service 구현](../1-6_auth_service.md)

---

**작성자**: Backend Team
**최종 업데이트**: 2025-01-13
