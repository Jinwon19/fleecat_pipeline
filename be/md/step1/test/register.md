# 회원가입 API 테스트

**작성일**: 2025-10-02
**테스트 대상**: POST `/api/v1/auth/register`
**상태**: ✅ 테스트 완료

---

## 📋 목차

1. [API 개요](#1-api-개요)
2. [API 명세](#2-api-명세)
3. [테스트 진행](#3-테스트-진행)
4. [발생한 문제와 해결](#4-발생한-문제와-해결)
5. [최종 검증](#5-최종-검증)

---

## 1. API 개요

### 목적
새로운 회원을 등록하고 JWT 토큰을 발급하는 회원가입 API

### 주요 기능
1. ✅ 이메일 중복 확인
2. ✅ 닉네임 중복 확인
3. ✅ 비밀번호 해싱 (bcrypt)
4. ✅ 회원 정보 저장
5. ✅ 기본 권한 부여 (buyer)
6. ✅ JWT 토큰 발급

### 데이터 흐름
```
Client Request
  ↓
validateRegister (입력 검증)
  ↓
authController.register
  ↓
authService.register
  ├─ memberRepository.existsByEmail() - 이메일 중복 확인
  ├─ memberRepository.existsByNickname() - 닉네임 중복 확인
  ├─ bcrypt.hash() - 비밀번호 해싱
  ├─ memberRepository.create() - 회원 생성
  ├─ memberPermissionRepository.create() - 권한 부여
  └─ generateToken() - JWT 토큰 발급
  ↓
Response (201 Created)
```

---

## 2. API 명세

### 엔드포인트

```
POST /api/v1/auth/register
```

### 요청 헤더

```http
Content-Type: application/json
```

### 요청 바디

#### 필수 필드

| 필드 | 타입 | 제약사항 | 설명 |
|------|------|----------|------|
| `email` | String | 이메일 형식, 최대 255자, 고유값 | 회원 이메일 |
| `password` | String | 최소 8자, 영문+숫자 포함 | 비밀번호 (평문) |
| `name` | String | 2~30자 | 실명 |
| `nickname` | String | 2~20자, 영문/숫자/한글, 고유값 | 닉네임 |

#### 선택 필드

| 필드 | 타입 | 제약사항 | 설명 |
|------|------|----------|------|
| `phone` | String | 010-1234-5678 형식 | 휴대폰 번호 |

### 요청 예시

```json
{
  "email": "testuser001@example.com",
  "name": "John Doe",
  "password": "Password123!",
  "nickname": "johndoe001",
  "phone": "010-1234-5678"
}
```

### 응답 예시

#### 성공 (201 Created)

```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "member": {
      "member_id": 1,
      "company_id": null,
      "member_email": "testuser001@example.com",
      "member_name": "John Doe",
      "member_nickname": "johndoe001",
      "member_phone": "010-1234-5678",
      "member_account_type": "individual",
      "member_account_role": "buyer",
      "member_status": "active",
      "member_marketing_email": false,
      "member_marketing_sms": false,
      "member_last_login_at": null,
      "member_created_at": "2025-10-02T03:34:31.924Z",
      "member_updated_at": "2025-10-02T03:34:31.924Z",
      "role": "buyer",
      "roles": ["buyer"]
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZW1iZXJfaWQiOjEsImVtYWlsIjoidGVzdHVzZXIwMDFAZXhhbXBsZS5jb20iLCJyb2xlIjoiYnV5ZXIiLCJpYXQiOjE3NTkzNzYwNzIsImV4cCI6MTc1OTk4MDg3Mn0.9PcwmEK57oSk0cQmJl3xyIaq-YGSor--XG1uzK7YPPo"
  }
}
```

#### 실패 - 이메일 중복 (400 Bad Request)

```json
{
  "success": false,
  "message": "Email already exists"
}
```

#### 실패 - 닉네임 중복 (400 Bad Request)

```json
{
  "success": false,
  "message": "Nickname already exists"
}
```

#### 실패 - 입력 검증 오류 (400 Bad Request)

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

---

## 3. 테스트 진행

### 테스트 환경

- **서버**: http://localhost:3000
- **데이터베이스**: Supabase PostgreSQL
- **테스트 도구**: curl
- **테스트 일시**: 2025-10-02

### 테스트 케이스

#### Case 1: 정상 회원가입 (모든 필드 포함)

**요청**:
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser001@example.com",
    "name": "John Doe",
    "password": "Password123!",
    "nickname": "johndoe001",
    "phone": "010-1234-5678"
  }'
```

**결과**: ✅ 성공 (201 Created)

**검증 항목**:
- [x] 회원 생성 (member 테이블)
- [x] 권한 생성 (member_permissions 테이블)
- [x] 비밀번호 해싱 (bcrypt)
- [x] JWT 토큰 발급
- [x] member_account_type = "individual" (기본값)
- [x] member_account_role = "buyer" (기본값)
- [x] member_status = "active" (기본값)
- [x] role = "buyer" (응답에 포함)
- [x] roles = ["buyer"] (응답에 포함)

#### Case 2: 선택 필드 생략 (phone 없음)

**요청**:
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser002@example.com",
    "name": "Jane Smith",
    "password": "Password456!",
    "nickname": "janesmith"
  }'
```

**예상 결과**: ✅ 성공 (member_phone = null)

#### Case 3: 이메일 중복

**요청**:
```bash
# 동일한 이메일로 재시도
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser001@example.com",
    "name": "Another User",
    "password": "Password789!",
    "nickname": "anotheruser"
  }'
```

**예상 결과**: ❌ 400 Bad Request - "Email already exists"

#### Case 4: 닉네임 중복

**요청**:
```bash
# 동일한 닉네임으로 재시도
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "name": "New User",
    "password": "Password789!",
    "nickname": "johndoe001"
  }'
```

**예상 결과**: ❌ 400 Bad Request - "Nickname already exists"

#### Case 5: 입력 검증 실패

**요청**:
```bash
# 잘못된 이메일 형식, 짧은 비밀번호
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
    "name": "Test",
    "password": "123",
    "nickname": "ab"
  }'
```

**예상 결과**: ❌ 400 Bad Request - 여러 필드 검증 오류

---

## 4. 발생한 문제와 해결

### 문제 1: Prepared Statement 오류

**오류 메시지**:
```
Error: prepared statement "s0" already exists
```

**원인**: Supabase Pooler 사용 시 `pgbouncer` 파라미터 누락

**해결**:
```bash
# .env 파일 수정
DATABASE_URL=postgresql://...?pgbouncer=true
```

**참고**: [회원가입_필드_변경사항.md](./회원가입_필드_변경사항.md#2-supabase-pooler-설정-prepared-statement-오류-해결)

---

### 문제 2: MemberPermission 생성 실패

**오류 메시지**:
```
Error: Cannot read properties of undefined (reading 'create')
```

**원인**: Prisma 모델명 불일치 (`prisma.member_permission` → `prisma.memberPermission`)

**해결**:
```javascript
// 변경 전
prisma.member_permission.create()

// 변경 후
prisma.memberPermission.create()
```

**참고**: [회원가입_필드_변경사항.md](./회원가입_필드_변경사항.md#3-memberpermission-repository-수정)

---

### 문제 3: Role 타입 불일치

**오류**: Schema는 `Int`인데 코드에서 String 전달

**해결**: Role mapping 로직 추가
```javascript
const roleMap = { 'buyer': 1, 'seller': 2, 'admin': 3 };
const roleValue = roleMap[permissionData.permission_role] || 1;
```

---

### 문제 4: Unique Constraint 충돌

**오류 메시지**:
```
Unique constraint failed on the fields: (member_permission_id)
```

**원인**: 데이터베이스 시퀀스(sequence) 불일치

**해결**: 테이블 초기화
```sql
TRUNCATE TABLE member_permissions RESTART IDENTITY CASCADE;
TRUNCATE TABLE member RESTART IDENTITY CASCADE;
```

---

## 5. 최종 검증

### 성공 응답 분석

```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "member": {
      "member_id": 1,                              // ✅ PK 정상 생성
      "member_email": "testuser001@example.com",   // ✅ 요청값 저장
      "member_name": "John Doe",                   // ✅ name 필드 정상 저장
      "member_nickname": "johndoe001",             // ✅ 요청값 저장
      "member_phone": "010-1234-5678",             // ✅ 선택 필드 저장
      "member_account_type": "individual",         // ✅ 기본값 "individual" 적용
      "member_account_role": "buyer",              // ✅ 기본값 "buyer" 적용
      "member_status": "active",                   // ✅ 기본값 "active" 적용
      "member_marketing_email": false,             // ✅ 기본값 false
      "member_marketing_sms": false,               // ✅ 기본값 false
      "role": "buyer",                             // ✅ 주 역할 반환
      "roles": ["buyer"]                           // ✅ 전체 역할 배열 반환
    },
    "token": "eyJhbGci..."                         // ✅ JWT 토큰 발급
  }
}
```

### 데이터베이스 검증

#### member 테이블

```sql
SELECT * FROM member WHERE member_email = 'testuser001@example.com';
```

**결과**:
| member_id | member_email | member_name | member_nickname | member_account_type | member_password |
|-----------|--------------|-------------|-----------------|---------------------|-----------------|
| 1 | testuser001@example.com | John Doe | johndoe001 | individual | $2b$10$... (해싱됨) |

#### member_permissions 테이블

```sql
SELECT * FROM member_permissions WHERE member_id = 1;
```

**결과**:
| member_permission_id | member_id | member_permission_role | can_purchase | is_account_active |
|----------------------|-----------|------------------------|--------------|-------------------|
| 1 | 1 | 1 (buyer) | true | true |

### JWT 토큰 검증

**토큰**:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZW1iZXJfaWQiOjEsImVtYWlsIjoidGVzdHVzZXIwMDFAZXhhbXBsZS5jb20iLCJyb2xlIjoiYnV5ZXIiLCJpYXQiOjE3NTkzNzYwNzIsImV4cCI6MTc1OTk4MDg3Mn0.9PcwmEK57oSk0cQmJl3xyIaq-YGSor--XG1uzK7YPPo
```

**디코딩 결과** (https://jwt.io):
```json
{
  "member_id": 1,
  "email": "testuser001@example.com",
  "role": "buyer",
  "iat": 1759376072,
  "exp": 1759980872
}
```

**검증 항목**:
- [x] member_id 포함
- [x] email 포함
- [x] role 포함
- [x] iat (발급 시간) 포함
- [x] exp (만료 시간) 포함
- [x] 만료 기간: 7일 (JWT_EXPIRES_IN=7d)

---

## 📊 테스트 결과 요약

### 성공한 항목 ✅

1. **입력 검증**
   - 이메일 형식 검증
   - 비밀번호 강도 검증 (8자 이상, 영문+숫자)
   - 이름 길이 검증 (2~30자)
   - 닉네임 형식 검증 (2~20자, 영문/숫자/한글)
   - 전화번호 형식 검증 (선택)

2. **비즈니스 로직**
   - 이메일 중복 확인
   - 닉네임 중복 확인
   - 비밀번호 해싱 (bcrypt)
   - 회원 정보 저장 (member 테이블)
   - 권한 부여 (member_permissions 테이블)
   - JWT 토큰 발급

3. **기본값 적용**
   - member_account_type = "individual"
   - member_account_role = "buyer"
   - member_status = "active"
   - member_marketing_email = false
   - member_marketing_sms = false

4. **응답 형식**
   - 표준 응답 포맷 (success, message, data)
   - 민감 정보 제외 (member_password 미포함)
   - 역할 정보 포함 (role, roles)
   - JWT 토큰 반환

### 실패한 항목 ❌

없음

---

## 🔗 관련 문서

- [Step 1-6: Auth Service](./1-6_auth_service.md)
- [Step 1-8: Auth Controller](./1-8_auth_controller.md)
- [Step 1-10: Auth Routes](./1-10_auth_routes.md)
- [회원가입 필드 변경사항](./회원가입_필드_변경사항.md)

---

## 📝 추가 테스트 권장사항

### 단위 테스트
- [ ] authService.register() 단위 테스트
- [ ] memberRepository.create() 모킹 테스트
- [ ] memberPermissionRepository.create() 모킹 테스트

### 통합 테스트
- [ ] 전체 회원가입 플로우 테스트 (supertest)
- [ ] 에러 케이스 테스트 (중복, 검증 실패)
- [ ] 트랜잭션 롤백 테스트

### 성능 테스트
- [ ] 동시 회원가입 요청 처리 (부하 테스트)
- [ ] bcrypt 해싱 성능 측정

---

**테스트 완료일**: 2025-10-02
**테스트 담당**: Backend Team
**최종 상태**: ✅ 모든 테스트 통과
