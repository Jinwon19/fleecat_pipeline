# 비밀번호 변경 API 테스트 결과

> **테스트 날짜**: 2025년 10월 2일
> **API 엔드포인트**: `PUT /api/v1/auth/change-password`
> **테스터**: Backend Team

---

## 📋 테스트 개요

### API 정보
- **Method**: `PUT`
- **URL**: `/api/v1/auth/change-password`
- **인증**: Required (JWT Token)
- **Controller**: `src/controllers/auth.controller.js:changePassword()`
- **Service**: `src/services/auth.service.js:changePassword()`
- **Repository**: `src/repositories/member.repository.js`

### 테스트 계정
- **Email**: `jhl5857@naver.com`
- **기존 비밀번호**: `jaehyoek2024!`
- **새 비밀번호**: `newpassword2024!`

---

## 🐛 발견된 버그 및 수정

### Bug #1: Prisma 관계 필드명 오류

**증상**:
```json
{
  "success": false,
  "message": "Unknown field `member_permission` for include statement on model `Member`. Available options are marked with ?."
}
```

**원인**:
`src/repositories/member.repository.js:18` - `findById()` 함수에서 잘못된 관계 필드명 사용

**수정 전**:
```javascript
async function findById(memberId) {
  try {
    return await prisma.member.findUnique({
      where: { member_id: BigInt(memberId) },
      include: {
        member_permission: true,  // ❌ 단수형
        company: true
      }
    });
  } catch (error) {
    throw new Error(`Failed to find member by ID: ${error.message}`);
  }
}
```

**수정 후**:
```javascript
async function findById(memberId) {
  try {
    return await prisma.member.findUnique({
      where: { member_id: BigInt(memberId) },
      include: {
        member_permissions: true,  // ✅ 복수형
        company: true
      }
    });
  } catch (error) {
    throw new Error(`Failed to find member by ID: ${error.message}`);
  }
}
```

**수정 파일**: `src/repositories/member.repository.js:18`

**참고**: `findByEmail()` 함수는 이미 `member_permissions` (복수형)로 올바르게 작성되어 있었음

---

## ✅ 성공 케이스 테스트

### Test Case 1: 비밀번호 변경 성공

**요청**:
```bash
curl -X PUT http://localhost:3000/api/v1/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "current_password": "jaehyoek2024!",
    "new_password": "newpassword2024!",
    "confirm_password": "newpassword2024!"
  }'
```

**응답** (200 OK):
```json
{
  "success": true,
  "message": "Password changed successfully",
  "data": {
    "message": "Password changed successfully"
  }
}
```

**결과**: ✅ **PASS** - 비밀번호가 성공적으로 변경됨

---

### Test Case 2: 새 비밀번호로 로그인 확인

**요청**:
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jhl5857@naver.com",
    "password": "newpassword2024!"
  }'
```

**응답** (200 OK):
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "member": {
      "member_id": 2,
      "member_email": "jhl5857@naver.com",
      "member_name": "이재혁",
      "member_nickname": "플리캣구매자",
      "member_updated_at": "2025-10-02T04:52:41.028Z",
      "role": "buyer",
      "roles": ["buyer"]
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**확인 사항**:
- `member_updated_at`: `2025-10-02T04:52:41.028Z` - 비밀번호 변경 시간 반영됨
- 새 비밀번호로 로그인 성공

**결과**: ✅ **PASS** - 새 비밀번호로 로그인 가능

---

## ❌ 실패 케이스 테스트

### Test Case 3: 현재 비밀번호가 틀린 경우

**요청**:
```bash
curl -X PUT http://localhost:3000/api/v1/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "current_password": "wrongpassword!",
    "new_password": "anotherpass2024!",
    "confirm_password": "anotherpass2024!"
  }'
```

**응답** (401 Unauthorized):
```json
{
  "success": false,
  "message": "Current password is incorrect"
}
```

**결과**: ✅ **PASS** - 올바른 에러 응답 반환

---

### Test Case 4: 새 비밀번호가 현재 비밀번호와 동일

**요청**:
```bash
curl -X PUT http://localhost:3000/api/v1/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "current_password": "newpassword2024!",
    "new_password": "newpassword2024!",
    "confirm_password": "newpassword2024!"
  }'
```

**응답** (400 Bad Request):
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "new_password",
      "message": "New password must be different from current password"
    }
  ]
}
```

**결과**: ✅ **PASS** - 올바른 검증 에러 반환

---

### Test Case 5: 비밀번호 확인 불일치 (예상)

**요청**:
```json
{
  "current_password": "newpassword2024!",
  "new_password": "another2024!",
  "confirm_password": "different2024!"
}
```

**예상 응답** (400 Bad Request):
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "confirm_password",
      "message": "Confirm password does not match new password"
    }
  ]
}
```

**결과**: 🟡 **NOT TESTED** - 사용자 요청으로 테스트 중단

---

### Test Case 6: JWT 토큰 없음 (예상)

**요청**:
```bash
curl -X PUT http://localhost:3000/api/v1/auth/change-password \
  -H "Content-Type: application/json" \
  -d '{
    "current_password": "newpassword2024!",
    "new_password": "another2024!",
    "confirm_password": "another2024!"
  }'
```

**예상 응답** (401 Unauthorized):
```json
{
  "success": false,
  "message": "Authorization header is missing"
}
```

**결과**: 🟡 **NOT TESTED**

---

### Test Case 7: 새 비밀번호가 너무 짧음 (예상)

**요청**:
```json
{
  "current_password": "newpassword2024!",
  "new_password": "short1",
  "confirm_password": "short1"
}
```

**예상 응답** (400 Bad Request):
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "new_password",
      "message": "New password must be at least 8 characters"
    }
  ]
}
```

**결과**: 🟡 **NOT TESTED**

---

## 🔍 비즈니스 로직 검증

### 1. 비밀번호 변경 프로세스

**처리 순서** (auth.service.js:191-222):
```
1. 회원 조회 (memberRepository.findById)
   ↓
2. 현재 비밀번호 확인 (bcrypt.compare)
   ↓ (틀리면 401 UnauthorizedError)
3. 새 비밀번호 != 현재 비밀번호 확인 (bcrypt.compare)
   ↓ (같으면 400 ValidationError)
4. 새 비밀번호 해싱 (bcrypt.hash, salt=10)
   ↓
5. 비밀번호 업데이트 (memberRepository.updatePassword)
   ↓
6. 성공 메시지 반환
```

✅ **검증 완료**: 모든 단계가 올바르게 동작

### 2. 입력 검증 (validateChangePassword 미들웨어)

**검증 항목** (src/middlewares/validation.js:136-168):
- ✅ `current_password`: 필수
- ✅ `new_password`: 필수, 8자 이상, 영문+숫자 포함
- ✅ `confirm_password`: 필수, new_password와 일치
- ✅ 새 비밀번호 != 현재 비밀번호

### 3. 보안 검증

- ✅ JWT 토큰 검증 (`authenticate` 미들웨어)
- ✅ 본인만 비밀번호 변경 가능 (`req.user.member_id` 사용)
- ✅ 비밀번호 해싱 (bcrypt, salt rounds: 10)
- ✅ 현재 비밀번호 확인 필수

---

## 📊 테스트 결과 요약

### 테스트 통과율

| 구분 | 테스트 케이스 | 통과 | 실패 | 미테스트 |
|------|--------------|------|------|---------|
| **성공 케이스** | 2 | 2 | 0 | 0 |
| **실패 케이스** | 5 | 2 | 0 | 3 |
| **전체** | 7 | 4 | 0 | 3 |

**통과율**: 4/7 = **57%** (테스트된 케이스만: 4/4 = **100%**)

### 발견된 이슈

| 번호 | 심각도 | 이슈 | 상태 |
|------|--------|------|------|
| 1 | 🔴 Critical | `member_permission` 필드명 오류 | ✅ **수정 완료** |

### 추가 테스트 필요

1. 🟡 비밀번호 확인 불일치 케이스
2. 🟡 JWT 토큰 없음 케이스
3. 🟡 비밀번호 길이 검증 케이스

---

## 🎯 결론

### 주요 성과

✅ **핵심 기능 정상 동작 확인**
- 비밀번호 변경 성공
- 새 비밀번호로 로그인 성공
- 현재 비밀번호 검증 동작
- 새/현재 비밀번호 동일성 검증 동작

✅ **버그 발견 및 수정**
- Prisma 관계 필드명 오류 수정 (`member_permission` → `member_permissions`)

### 개선 사항

✅ **수정 완료**
- `src/repositories/member.repository.js:18` - `findById()` 함수 수정

### 다음 단계

1. **나머지 테스트 케이스 완료**
   - 비밀번호 확인 불일치
   - JWT 토큰 없음
   - 비밀번호 길이 검증

2. **다른 API 테스트**
   - GET `/api/v1/members/me` - 내 정보 조회
   - PUT `/api/v1/members/me` - 내 정보 수정

3. **테스트 자동화**
   - Jest 단위 테스트 작성
   - Supertest 통합 테스트 작성

---

## 📝 변경된 파일

### src/repositories/member.repository.js

**변경 라인**: 18

**변경 내용**:
```diff
  async function findById(memberId) {
    try {
      return await prisma.member.findUnique({
        where: { member_id: BigInt(memberId) },
        include: {
-         member_permission: true,
+         member_permissions: true,
          company: true
        }
      });
    } catch (error) {
      throw new Error(`Failed to find member by ID: ${error.message}`);
    }
  }
```

---

**작성일**: 2025년 10월 2일
**작성자**: Backend Team
**상태**: ✅ 테스트 완료 (4/7 케이스)
