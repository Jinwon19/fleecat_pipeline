# Step 1 API 정의서 - 목차

> **작성일**: 2025-01-13
> **대상**: Phase 1 (기초 인프라 구축) API
> **총 API 수**: 8개

---

## 📚 API 목록

### 인증 관련 API (6개)

#### 일반 인증
1. [**POST** `/api/v1/auth/register`](./auth_register.md) - 회원가입
2. [**POST** `/api/v1/auth/login`](./auth_login.md) - 로그인
3. [**PUT** `/api/v1/auth/change-password`](./auth_change_password.md) - 비밀번호 변경

#### 소셜 로그인
4. [**GET** `/api/v1/auth/social/:provider`](./auth_social_login.md#1-oauth-url-생성) - OAuth URL 생성
5. [**POST** `/api/v1/auth/social/:provider/callback`](./auth_social_login.md#2-콜백-처리-pkce-flow) - 콜백 처리 (PKCE Flow)
6. [**POST** `/api/v1/auth/social/:provider/token`](./auth_social_login.md#3-토큰-처리-implicit-flow) - 토큰 처리 (Implicit Flow)

### 회원 정보 관리 API (2개)

7. [**GET** `/api/v1/members/me`](./member_get_me.md) - 내 정보 조회
8. [**PUT** `/api/v1/members/me`](./member_update_me.md) - 내 정보 수정

---

## 🔐 인증 방식

### Public API (인증 불필요)

다음 API들은 JWT 토큰 없이 호출 가능합니다:

- POST `/api/v1/auth/register` - 회원가입
- POST `/api/v1/auth/login` - 로그인
- GET `/api/v1/auth/social/:provider` - OAuth URL 생성
- POST `/api/v1/auth/social/:provider/callback` - 콜백 처리
- POST `/api/v1/auth/social/:provider/token` - 토큰 처리

### Private API (인증 필요)

다음 API들은 JWT 토큰이 필수입니다:

- PUT `/api/v1/auth/change-password` - 비밀번호 변경
- GET `/api/v1/members/me` - 내 정보 조회
- PUT `/api/v1/members/me` - 내 정보 수정

**인증 헤더 형식**:
```http
Authorization: Bearer {JWT_TOKEN}
```

---

## 📋 공통 응답 형식

### 성공 응답

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // API별 데이터
  }
}
```

### 에러 응답

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    // 검증 에러 배열 (선택)
  ]
}
```

---

## 📊 HTTP 상태 코드

| 상태 코드 | 설명 | 사용 케이스 |
|----------|------|-----------|
| **200 OK** | 요청 성공 | 로그인, 조회, 수정 성공 |
| **201 Created** | 리소스 생성 성공 | 회원가입 성공 |
| **400 Bad Request** | 잘못된 요청 | 입력 검증 실패, 중복 데이터 |
| **401 Unauthorized** | 인증 실패 | JWT 토큰 없음/만료/유효하지 않음 |
| **404 Not Found** | 리소스 없음 | 회원 조회 실패 |
| **500 Internal Server Error** | 서버 오류 | 예상치 못한 에러 |

---

## 🔄 데이터베이스 테이블

Step 1에서 사용하는 주요 테이블:

### Member 테이블

회원 정보 저장 테이블

**주요 필드**:
- `member_id` (BigInt) - 회원 ID (PK)
- `member_email` (String) - 이메일 (Unique)
- `member_password` (String) - 비밀번호 해시 (소셜 로그인 시 NULL)
- `member_name` (String) - 이름
- `member_nickname` (String) - 닉네임 (Unique)
- `member_phone` (String) - 전화번호
- `member_status` (String) - 상태 (active/suspended/inactive)
- `member_account_role` (String) - 기본 권한 (buyer/seller/admin)
- `member_auth_id` (String) - Supabase Auth ID (소셜 로그인용)
- `member_auth_provider` (String) - 소셜 로그인 제공자 (google/kakao)

### MemberPermission 테이블

회원 권한 정보 저장 테이블

**주요 필드**:
- `member_permission_id` (BigInt) - 권한 ID (PK)
- `member_id` (BigInt) - 회원 ID (FK)
- `member_permission_role` (Int) - 권한 레벨
- `can_purchase` (Boolean) - 구매 권한
- `can_sell` (Boolean) - 판매 권한
- `can_member_manage` (Boolean) - 회원 관리 권한
- `is_account_active` (Boolean) - 계정 활성 여부

---

## 🚀 API 테스트 환경

### 로컬 개발 서버
```
Base URL: http://localhost:3000/api/v1
```

### 프로덕션 서버 (Railway)
```
Base URL: https://fleecat-production.up.railway.app/api/v1
```

### 테스트 도구
- **cURL**: 터미널 기반 테스트
- **Postman**: GUI 기반 테스트
- **Jest + Supertest**: 자동화 테스트

---

## 📖 관련 문서

- [Step 1 작업 기록](../00_INDEX.md)
- [Auth Routes 구현](../1-10_auth_routes.md)
- [Member Routes 구현](../1-11_member_routes.md)
- [데이터베이스 관계도](../../db_03_RELATIONSHIPS.md)
- [Railway 배포 가이드](../../railway/info.md)

---

## 📝 API 정의서 읽는 방법

각 API 정의서는 다음과 같은 구조로 작성되어 있습니다:

1. **API 기본 정보** - 메서드, 경로, 설명, 접근 권한
2. **요청 명세** - 헤더, 쿼리 파라미터, 요청 본문
3. **응답 명세** - 성공/실패 응답, 상태 코드
4. **에러 코드** - 발생 가능한 에러와 처리 방법
5. **예제** - 실제 요청/응답 예제 (cURL, JavaScript)
6. **비즈니스 로직** - 내부 처리 흐름
7. **보안 고려사항** - 주의할 점

---

**작성자**: Backend Team
**최종 업데이트**: 2025-01-13
