# 로그인 API 테스트 문서

**작성일**: 2025-10-02
**API 엔드포인트**: `POST /api/v1/auth/login`
**테스트 대상**: 회원 로그인 및 JWT 토큰 발급

---

## 📋 목차

1. [API 사양](#api-사양)
2. [테스트 과정에서 발생한 오류](#테스트-과정에서-발생한-오류)
3. [코드 수정 사항](#코드-수정-사항)
4. [테스트 결과](#테스트-결과)
5. [문제 해결 요약](#문제-해결-요약)

---

## API 사양

### Endpoint
```
POST http://localhost:3000/api/v1/auth/login
```

### Headers
```
Content-Type: application/json
```

### Request Body
```json
{
  "email": "buyer1@example.com",
  "password": "Password123!"
}
```

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "member": {
      "member_id": 3,
      "company_id": null,
      "member_email": "buyer1@example.com",
      "member_name": "Hong Gildong",
      "member_nickname": "gildong",
      "member_phone": "010-1111-1111",
      "member_account_type": "individual",
      "member_account_role": "buyer",
      "member_status": "active",
      "member_marketing_email": false,
      "member_marketing_sms": false,
      "member_last_login_at": null,
      "member_created_at": "2025-10-02T03:43:33.139Z",
      "member_updated_at": "2025-10-02T03:43:33.139Z",
      "role": "buyer",
      "roles": ["buyer"]
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

## 테스트 과정에서 발생한 오류

### 오류 1: `member_permission` 필드 존재하지 않음

**발생 시점**: 첫 번째 로그인 시도

**오류 메시지**:
```
Unknown field `member_permission` for include statement on model `Member`.
Available options are marked with ?: member_addresses?, member_permissions?, ...
```

**원인**:
`src/repositories/member.repository.js`의 `findByEmail()` 함수에서 잘못된 relation 이름 사용
- Schema에서는 `member_permissions` (복수형)인데 코드에서는 `member_permission` (단수형) 사용

**해결 방법**:
`src/repositories/member.repository.js:18,37` 수정
```javascript
// 변경 전
include: {
  member_permission: true,  // ❌ 잘못된 필드명
  company: true
}

// 변경 후
include: {
  member_permissions: true,  // ✅ 올바른 필드명
  company: true
}
```

---

### 오류 2: BigInt 직렬화 오류

**발생 시점**: `member_permission` 필드명 수정 후 로그인 시도

**오류 메시지**:
```
TypeError: Do not know how to serialize a BigInt
```

**원인**:
- Prisma에서 반환한 `member_permissions`와 `company` 객체에 BigInt 타입이 포함됨
- Express의 `res.json()`이 BigInt를 직렬화하지 못함

**해결 방법**:
`src/services/auth.service.js:154` - 응답에서 relation 객체 제외

```javascript
// 변경 전
const { member_password, ...memberData } = member;

return {
  member: {
    ...memberData,  // member_permissions, company가 포함되어 BigInt 직렬화 오류 발생
    member_id: Number(memberData.member_id),
    company_id: memberData.company_id ? Number(memberData.company_id) : null,
    role: primaryRole,
    roles: allRoles
  },
  token
};

// 변경 후
const { member_password, member_permissions, company, ...memberData } = member;

return {
  member: {
    ...memberData,  // relation 객체 제외하여 BigInt 직렬화 오류 방지
    member_id: Number(memberData.member_id),
    company_id: memberData.company_id ? Number(memberData.company_id) : null,
    role: primaryRole,
    roles: allRoles
  },
  token
};
```

---

### 오류 3: `roles` 배열이 `[null]`로 반환됨

**발생 시점**: BigInt 직렬화 오류 해결 후 로그인 시도

**응답 결과**:
```json
{
  "member": {
    "role": "buyer",
    "roles": [null]  // ❌ null 반환
  }
}
```

**원인**:
- `memberPermission.repository.js`의 `getRoles()`와 `getPrimaryRole()` 함수가 Int → String 변환을 하지 않음
- Database에는 `member_permission_role`이 Int 타입(1, 2, 3)으로 저장됨
- 코드에서는 String 타입("buyer", "seller", "admin")을 기대함

**해결 방법**:
`src/repositories/memberPermission.repository.js` - 두 함수에 roleMap 변환 로직 추가

#### 1) `getPrimaryRole()` 수정 (74-93번째 줄)

```javascript
// 변경 전
async function getPrimaryRole(memberId) {
  try {
    const permissions = await findByMemberId(memberId);

    if (permissions.length === 0) {
      return 'buyer';
    }

    const roles = permissions.map(p => p.permission_role);  // ❌ 필드명도 잘못됨

    if (roles.includes('seller')) return 'seller';
    if (roles.includes('admin')) return 'admin';
    return 'buyer';
  } catch (error) {
    throw new Error(`Failed to get primary role: ${error.message}`);
  }
}

// 변경 후
async function getPrimaryRole(memberId) {
  try {
    const permissions = await findByMemberId(memberId);

    if (permissions.length === 0) {
      return 'buyer'; // 기본값
    }

    // ✅ Int → String 변환: 1=buyer, 2=seller, 3=admin
    const roleMap = { 1: 'buyer', 2: 'seller', 3: 'admin' };
    const roles = permissions.map(p => roleMap[p.member_permission_role] || 'buyer');

    // 우선순위: seller > admin > buyer
    if (roles.includes('seller')) return 'seller';
    if (roles.includes('admin')) return 'admin';
    return 'buyer';
  } catch (error) {
    throw new Error(`Failed to get primary role: ${error.message}`);
  }
}
```

#### 2) `getRoles()` 수정 (100-109번째 줄)

```javascript
// 변경 전
async function getRoles(memberId) {
  try {
    const permissions = await findByMemberId(memberId);
    return permissions.map(p => p.permission_role);  // ❌ 필드명도 잘못됨
  } catch (error) {
    throw new Error(`Failed to get roles: ${error.message}`);
  }
}

// 변경 후
async function getRoles(memberId) {
  try {
    const permissions = await findByMemberId(memberId);
    // ✅ Int → String 변환: 1=buyer, 2=seller, 3=admin
    const roleMap = { 1: 'buyer', 2: 'seller', 3: 'admin' };
    return permissions.map(p => roleMap[p.member_permission_role] || 'buyer');
  } catch (error) {
    throw new Error(`Failed to get roles: ${error.message}`);
  }
}
```

---

## 코드 수정 사항

### 1. `src/repositories/member.repository.js`

**파일 위치**: `src/repositories/member.repository.js`

**수정 라인**: 18, 37

**변경 내용**:
- `member_permission` → `member_permissions` (복수형)
- Prisma relation 이름을 Schema와 일치시킴

```javascript
// findById() - 18번째 줄
include: {
  member_permissions: true,  // ✅ 수정
  company: true
}

// findByEmail() - 37번째 줄
include: {
  member_permissions: true,  // ✅ 수정
  company: true
}
```

---

### 2. `src/services/auth.service.js`

**파일 위치**: `src/services/auth.service.js`

**수정 라인**: 154

**변경 내용**:
- 응답 객체에서 `member_permissions`, `company` relation 제외
- BigInt 직렬화 오류 방지

```javascript
// 6. 비밀번호 및 관계 데이터 제외하고 반환
const { member_password, member_permissions, company, ...memberData } = member;

return {
  member: {
    ...memberData,
    member_id: Number(memberData.member_id),
    company_id: memberData.company_id ? Number(memberData.company_id) : null,
    role: primaryRole,
    roles: allRoles
  },
  token
};
```

---

### 3. `src/repositories/memberPermission.repository.js`

**파일 위치**: `src/repositories/memberPermission.repository.js`

**수정 함수**: `getPrimaryRole()`, `getRoles()`

**변경 내용**:
- Int 타입 role 값을 String 타입으로 변환하는 roleMap 추가
- Database 저장값: 1=buyer, 2=seller, 3=admin

#### `getPrimaryRole()` 수정 (74-93번째 줄)

```javascript
async function getPrimaryRole(memberId) {
  try {
    const permissions = await findByMemberId(memberId);

    if (permissions.length === 0) {
      return 'buyer'; // 기본값
    }

    // ✅ Int → String 변환
    const roleMap = { 1: 'buyer', 2: 'seller', 3: 'admin' };
    const roles = permissions.map(p => roleMap[p.member_permission_role] || 'buyer');

    // 우선순위: seller > admin > buyer
    if (roles.includes('seller')) return 'seller';
    if (roles.includes('admin')) return 'admin';
    return 'buyer';
  } catch (error) {
    throw new Error(`Failed to get primary role: ${error.message}`);
  }
}
```

#### `getRoles()` 수정 (100-109번째 줄)

```javascript
async function getRoles(memberId) {
  try {
    const permissions = await findByMemberId(memberId);
    // ✅ Int → String 변환
    const roleMap = { 1: 'buyer', 2: 'seller', 3: 'admin' };
    return permissions.map(p => roleMap[p.member_permission_role] || 'buyer');
  } catch (error) {
    throw new Error(`Failed to get roles: ${error.message}`);
  }
}
```

---

## 테스트 결과

### 테스트 케이스 1: buyer1 계정 로그인

**요청**:
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"buyer1@example.com","password":"Password123!"}'
```

**응답 (200 OK)**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "member": {
      "member_id": 3,
      "company_id": null,
      "member_email": "buyer1@example.com",
      "member_name": "Hong Gildong",
      "member_nickname": "gildong",
      "member_phone": "010-1111-1111",
      "member_account_type": "individual",
      "member_account_role": "buyer",
      "member_status": "active",
      "member_marketing_email": false,
      "member_marketing_sms": false,
      "member_last_login_at": null,
      "member_created_at": "2025-10-02T03:43:33.139Z",
      "member_updated_at": "2025-10-02T03:43:33.139Z",
      "role": "buyer",
      "roles": ["buyer"]
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZW1iZXJfaWQiOjMsImVtYWlsIjoiYnV5ZXIxQGV4YW1wbGUuY29tIiwicm9sZSI6ImJ1eWVyIiwicm9sZXMiOlsiYnV5ZXIiXSwiaWF0IjoxNzU5MzgwMTAzLCJleHAiOjE3NTk5ODQ5MDN9.LBZ5MuGFaQiPklM9-7WIIy8CUTjasvnxfwDDttBDtO0"
  }
}
```

**검증**:
- ✅ HTTP 상태 코드: 200
- ✅ `role`: "buyer"
- ✅ `roles`: ["buyer"] (이전 [null] 문제 해결됨)
- ✅ JWT 토큰 정상 발급
- ✅ BigInt 직렬화 오류 없음
- ✅ 모든 필드 정상 반환

---

## 문제 해결 요약

| 오류 | 원인 | 해결 방법 | 수정 파일 |
|------|------|-----------|----------|
| Unknown field `member_permission` | Prisma relation 이름 불일치 (단수/복수) | `member_permission` → `member_permissions` | `member.repository.js:18,37` |
| BigInt 직렬화 오류 | relation 객체에 BigInt 포함 | 응답에서 `member_permissions`, `company` 제외 | `auth.service.js:154` |
| `roles: [null]` 반환 | Int → String 변환 로직 누락 | roleMap 추가 (1→buyer, 2→seller, 3→admin) | `memberPermission.repository.js:74-93, 100-109` |

---

## JWT 토큰 검증

**토큰 Payload (디코딩 결과)**:
```json
{
  "member_id": 3,
  "email": "buyer1@example.com",
  "role": "buyer",
  "roles": ["buyer"],
  "iat": 1759380103,
  "exp": 1759984903
}
```

**검증 내용**:
- ✅ `member_id`: 정상 (3)
- ✅ `email`: 정상
- ✅ `role`: "buyer" (primaryRole)
- ✅ `roles`: ["buyer"] (모든 역할 배열)
- ✅ `iat` (발급 시간): 2025-10-02 12:41:43 (UTC)
- ✅ `exp` (만료 시간): 2025-10-09 12:41:43 (UTC) - 7일 후

---

## 추가 테스트 필요 항목

### 1. 다른 계정 로그인 테스트
- [ ] buyer2@example.com
- [ ] buyer3@example.com
- [ ] seller@example.com
- [ ] admin@example.com

### 2. 에러 케이스 테스트
- [ ] 잘못된 이메일 (존재하지 않는 계정)
- [ ] 잘못된 비밀번호
- [ ] 이메일 누락
- [ ] 비밀번호 누락
- [ ] 비활성화된 계정 (`member_status: 'inactive'`)

### 3. JWT 토큰 검증 테스트
- [ ] 토큰으로 인증이 필요한 API 호출
- [ ] 만료된 토큰 처리
- [ ] 잘못된 형식의 토큰 처리

---

## 데이터베이스 확인 쿼리

### 로그인한 회원 정보 확인
```sql
SELECT
  m.member_id,
  m.member_email,
  m.member_name,
  m.member_nickname,
  mp.member_permission_role
FROM member m
LEFT JOIN member_permissions mp ON m.member_id = mp.member_id
WHERE m.member_email = 'buyer1@example.com';
```

**결과**:
| member_id | member_email | member_name | member_nickname | member_permission_role |
|-----------|--------------|-------------|-----------------|------------------------|
| 3 | buyer1@example.com | Hong Gildong | gildong | 1 |

**해석**:
- `member_permission_role = 1` → "buyer"
- roleMap 변환이 정상적으로 작동함

---

## 참고사항

### Role 매핑 규칙

**Database 저장값 (Int)**:
- `1` = buyer (구매자)
- `2` = seller (판매자)
- `3` = admin (관리자)

**API 응답값 (String)**:
- `"buyer"` = 구매자
- `"seller"` = 판매자
- `"admin"` = 관리자

### Primary Role 우선순위

하나의 회원이 여러 역할을 가질 때, Primary Role 결정 우선순위:
1. `seller` (최우선)
2. `admin`
3. `buyer` (기본값)

**예시**:
- buyer + seller → Primary Role: **seller**
- buyer + admin → Primary Role: **admin**
- buyer + seller + admin → Primary Role: **seller**

---

**작업 완료일**: 2025-10-02
**상태**: ✅ 모든 오류 수정 완료, 테스트 성공
