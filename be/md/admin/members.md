# 회원관리 어드민 페이지 완전 가이드

> **작성일**: 2025년 10월 10일
> **상태**: ✅ 완료
> **페이지**: `/public/admin/members.html`

---

## 📚 목차

1. [개념 설명](#1-개념-설명)
2. [데이터베이스 구조](#2-데이터베이스-구조)
3. [백엔드 아키텍처](#3-백엔드-아키텍처)
4. [API 엔드포인트](#4-api-엔드포인트)
5. [프론트엔드 구현](#5-프론트엔드-구현)
6. [주요 함수 설명](#6-주요-함수-설명)
7. [사용 시나리오](#7-사용-시나리오)
8. [트러블슈팅](#8-트러블슈팅)
9. [성능 최적화](#9-성능-최적화)
10. [보안 고려사항](#10-보안-고려사항)

---

## 1. 개념 설명

### 1.1 회원관리란?

회원관리는 **플랫폼의 모든 사용자 계정을 관리**하는 핵심 기능입니다.

**목적**:
- 👥 **회원 모니터링**: 전체 회원 현황 및 활동 파악
- 🔐 **권한 관리**: 회원 역할 및 권한 제어
- ⚡ **상태 관리**: 회원 정지, 활성화, 비활성화 처리
- 📊 **통계 분석**: 회원 증가 추이 및 역할별 분포 분석

### 1.2 회원 역할 체계

Fleecat은 **3단계 역할 시스템**을 사용합니다:

```
buyer (구매자)
  ↓ 승급
seller (판매자)
  ↓ 관리자 지정
admin (관리자)
```

| 역할 | 권한 | 설명 |
|------|------|------|
| **buyer** | 구매만 가능 | 일반 구매자, 상품 주문 가능 |
| **seller** | 구매 + 판매 | 판매자, 상품 등록 및 주문 관리 가능 |
| **admin** | 전체 권한 | 플랫폼 관리자, 모든 기능 접근 가능 |

### 1.3 회원 상태

| 상태 | 설명 | 로그인 | 구매/판매 |
|------|------|--------|-----------|
| **active** | 정상 활동 | ✅ 가능 | ✅ 가능 |
| **suspended** | 일시 정지 | ❌ 불가 | ❌ 불가 |
| **inactive** | 비활성화 | ❌ 불가 | ❌ 불가 |

---

## 2. 데이터베이스 구조

### 2.1 Member 테이블 스키마

| 컬럼명 | 타입 | 설명 | 예시 |
|--------|------|------|------|
| `member_id` | BIGINT | 기본키 (자동 증가) | `1234` |
| `member_email` | VARCHAR(100) | 이메일 (UNIQUE) | `user@example.com` |
| `member_name` | VARCHAR(50) | 실명 | `홍길동` |
| `member_nickname` | VARCHAR(30) | 닉네임 (UNIQUE) | `fleecat_user` |
| `member_phone` | VARCHAR(20) | 전화번호 | `010-1234-5678` |
| `member_account_type` | VARCHAR(20) | 계정 유형 | `local`, `google`, `kakao` |
| `member_account_role` | VARCHAR(20) | 역할 | `buyer`, `seller`, `admin` |
| `member_status` | VARCHAR(20) | 상태 | `active`, `suspended`, `inactive` |
| `member_last_login_at` | TIMESTAMP | 마지막 로그인 | `2025-10-10 10:30:00` |
| `member_created_at` | TIMESTAMP | 가입일 | `2025-01-01 10:00:00` |
| `company_id` | BIGINT | 소속 회사 ID (NULL 가능) | `5` |

### 2.2 Member Permissions 테이블

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `member_permission_id` | BIGINT | 기본키 |
| `member_id` | BIGINT | 회원 ID (FK, UNIQUE) |
| `can_purchase` | BOOLEAN | 구매 권한 |
| `can_sell` | BOOLEAN | 판매 권한 |
| `is_account_active` | BOOLEAN | 계정 활성화 |

### 2.3 관계형 구조

```
Member (1) → (1) MemberPermission
Member (N) → (1) Company
Member (1) → (N) MemberAddress
Member (1) → (N) Order
Member (1) → (N) TenantMember
```

### 2.4 인덱스 설정

```prisma
@@unique([member_email])
@@unique([member_nickname])
@@index([member_status])
@@index([member_account_role])
@@index([member_created_at])
@@index([company_id])
```

---

## 3. 백엔드 아키텍처

### 3.1 파일 구조

```
src/
├── repositories/
│   └── admin/
│       └── adminMember.repository.js    # 회원 데이터 접근
├── services/
│   └── admin/
│       └── adminMember.service.js       # 비즈니스 로직
├── controllers/
│   └── admin/
│       └── adminMember.controller.js    # HTTP 요청 처리
└── routes/
    └── admin/
        └── adminMember.routes.js        # 라우팅
```

### 3.2 레이어별 역할

#### 📦 Repository Layer

**역할**: 데이터베이스 직접 접근 (Prisma)

**주요 함수**:
- `findAll(options)`: 회원 목록 조회 (페이징, 필터링, 검색)
- `findByIdWithDetails(memberId)`: 회원 상세 조회 (모든 관계 포함)
- `updateStatus(memberId, status)`: 회원 상태 변경
- `updateRole(memberId, role)`: 회원 역할 변경 (트랜잭션)
- `getStatistics()`: 회원 통계 조회
- `searchMembers(keyword, limit)`: 회원 검색

#### 🧠 Service Layer

**역할**: 비즈니스 로직 처리 및 유효성 검증

**주요 기능**:
- 입력값 검증 (status, role, page, limit)
- 비즈니스 규칙 적용 (관리자 권한 보호, 자기 자신 수정 방지)
- BigInt → String 변환
- 통계 데이터 가공 (비율 계산 등)

#### 🎮 Controller Layer

**역할**: HTTP 요청/응답 처리

**주요 함수**:
- `getMemberList()`: GET /api/v1/admin/members
- `getMemberById()`: GET /api/v1/admin/members/:id
- `updateMemberStatus()`: PATCH /api/v1/admin/members/:id/status
- `updateMemberRole()`: PATCH /api/v1/admin/members/:id/role
- `getMemberStatistics()`: GET /api/v1/admin/members/statistics
- `searchMembers()`: GET /api/v1/admin/members/search

---

## 4. API 엔드포인트

### 4.1 회원 목록 조회

**Request**:
```http
GET /api/v1/admin/members?page=1&limit=20&status=active&role=seller&search=홍길동
```

**Query Parameters**:
- `page` (number): 페이지 번호 (기본값: 1)
- `limit` (number): 페이지당 항목 수 (기본값: 20, 최대: 100)
- `status` (string): 상태 필터 (`active`, `suspended`, `inactive`)
- `role` (string): 역할 필터 (`buyer`, `seller`, `admin`)
- `search` (string): 검색어 (이메일, 이름, 닉네임)

**Response**:
```json
{
  "success": true,
  "message": "회원 목록을 조회했습니다.",
  "data": {
    "data": [
      {
        "member_id": "1234",
        "member_email": "user@example.com",
        "member_name": "홍길동",
        "member_nickname": "fleecat_user",
        "member_account_role": "seller",
        "member_status": "active",
        "member_last_login_at": "2025-10-10T10:30:00.000Z",
        "member_created_at": "2025-01-01T10:00:00.000Z",
        "company": {
          "company_id": "5",
          "company_name": "플리캣 주식회사"
        },
        "member_permissions": {
          "can_purchase": true,
          "can_sell": true,
          "is_account_active": true
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 10,
      "totalItems": 200,
      "itemsPerPage": 20,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  }
}
```

### 4.2 회원 상세 조회

**Request**:
```http
GET /api/v1/admin/members/1234
```

**Response**:
```json
{
  "success": true,
  "message": "회원 정보를 조회했습니다.",
  "data": {
    "member_id": "1234",
    "member_email": "user@example.com",
    "member_name": "홍길동",
    "company": { ... },
    "member_addresses": [ ... ],
    "tenant_members": [
      {
        "tenant": {
          "tenant_id": "10",
          "tenant_name": "홍길동의 공방",
          "tenant_status": "approved"
        }
      }
    ],
    "_count": {
      "orders": 15,
      "shopping_carts": 3
    }
  }
}
```

### 4.3 회원 상태 변경

**Request**:
```http
PATCH /api/v1/admin/members/1234/status
Content-Type: application/json

{
  "status": "suspended"
}
```

**Response**:
```json
{
  "success": true,
  "message": "회원 상태가 변경되었습니다.",
  "data": {
    "member_id": "1234",
    "member_email": "user@example.com",
    "member_status": "suspended"
  }
}
```

**에러 (관리자 정지 시도)**:
```json
{
  "success": false,
  "message": "관리자는 정지할 수 없습니다"
}
```

### 4.4 회원 역할 변경

**Request**:
```http
PATCH /api/v1/admin/members/1234/role
Content-Type: application/json

{
  "role": "seller"
}
```

**Response**:
```json
{
  "success": true,
  "message": "회원 역할이 변경되었습니다.",
  "data": {
    "member_id": "1234",
    "member_account_role": "seller"
  }
}
```

### 4.5 회원 통계 조회

**Request**:
```http
GET /api/v1/admin/members/statistics
```

**Response**:
```json
{
  "success": true,
  "message": "회원 통계를 조회했습니다.",
  "data": {
    "totalMembers": 1000,
    "activeMembers": 850,
    "suspendedMembers": 50,
    "inactiveMembers": 100,
    "activeRate": 85.0,
    "suspendedRate": 5.0,
    "inactiveRate": 10.0,
    "roleDistribution": {
      "buyer": 700,
      "seller": 280,
      "admin": 20
    },
    "roleRates": {
      "buyer": 70.0,
      "seller": 28.0,
      "admin": 2.0
    },
    "recentMembers": 45
  }
}
```

### 4.6 회원 검색

**Request**:
```http
GET /api/v1/admin/members/search?keyword=홍길동&limit=10
```

**Response**:
```json
{
  "success": true,
  "message": "회원 검색 결과입니다.",
  "data": [
    {
      "member_id": "1234",
      "member_email": "hong@example.com",
      "member_name": "홍길동",
      "member_nickname": "hong123",
      "member_account_role": "seller",
      "member_status": "active"
    }
  ]
}
```

---

## 5. 프론트엔드 구현

### 5.1 페이지 구조

**파일 위치**: `/public/admin/members.html`

**주요 섹션**:

1. **통계 대시보드 (상단)**
   - 전체 회원 수
   - 활성 회원 수
   - 정지 회원 수
   - 최근 7일 가입자

2. **필터 및 검색 (중앙)**
   - 상태 필터 (전체/활성/정지/비활성)
   - 역할 필터 (전체/구매자/판매자/관리자)
   - 검색창 (이메일, 이름, 닉네임)

3. **회원 목록 테이블 (하단)**
   - 회원 정보 (ID, 이메일, 이름, 역할, 상태)
   - 액션 버튼 (상세보기, 상태 변경, 역할 변경)
   - 페이지네이션

### 5.2 UI/UX 특징

#### 🎨 상태별 색상 구분

```css
.badge-status-active { background-color: #28a745; }    /* 녹색 */
.badge-status-suspended { background-color: #dc3545; }  /* 빨간색 */
.badge-status-inactive { background-color: #6c757d; }   /* 회색 */
```

#### 🔄 실시간 필터링

- 상태/역할 필터 변경 시 즉시 API 재호출
- 검색어 입력 시 디바운싱 적용 (300ms)
- 페이지 변경 시 현재 필터 유지

---

## 6. 주요 함수 설명

### 6.1 백엔드 함수

#### 📦 Repository: `findAll(options)`

**위치**: `src/repositories/admin/adminMember.repository.js:18-94`

**역할**: 회원 목록 조회 (페이징, 필터링, 검색)

**쿼리 로직**:
```javascript
async function findAll(options) {
  const { page = 1, limit = 20, status, role, search } = options;
  const skip = (page - 1) * limit;
  const where = {};

  // 1. 상태 필터
  if (status) where.member_status = status;

  // 2. 역할 필터
  if (role) where.member_account_role = role;

  // 3. 검색 (OR 조건)
  if (search) {
    where.OR = [
      { member_email: { contains: search, mode: 'insensitive' } },
      { member_name: { contains: search, mode: 'insensitive' } },
      { member_nickname: { contains: search, mode: 'insensitive' } }
    ];
  }

  // 4. 병렬 쿼리 (목록 + 총 개수)
  const [members, total] = await Promise.all([
    prisma.member.findMany({ where, skip, take: limit, ... }),
    prisma.member.count({ where })
  ]);

  return { members, total, page, totalPages: Math.ceil(total / limit) };
}
```

**최적화**:
- `Promise.all`로 목록 조회와 카운트 쿼리 병렬 실행
- `mode: 'insensitive'`로 대소문자 구분 없이 검색

#### 📦 Repository: `updateRole(memberId, role)`

**위치**: `src/repositories/admin/adminMember.repository.js:166-218`

**역할**: 회원 역할 변경 (트랜잭션)

**트랜잭션 로직**:
```javascript
async function updateRole(memberId, role) {
  return await prisma.$transaction(async (tx) => {
    // 1. member_account_role 업데이트
    const member = await tx.member.update({
      where: { member_id: BigInt(memberId) },
      data: { member_account_role: role }
    });

    // 2. member_permissions 동시 업데이트
    const permissionUpdates = {
      can_purchase: true,
      can_sell: role === 'seller' || role === 'admin',
      // ... 기타 권한
    };

    await tx.memberPermission.upsert({
      where: { member_id: BigInt(memberId) },
      update: permissionUpdates,
      create: { member_id: BigInt(memberId), ...permissionUpdates }
    });

    return member;
  });
}
```

**왜 트랜잭션인가?**
- `member`와 `member_permissions`는 1:1 관계
- 역할 변경 시 권한도 동시에 변경되어야 함
- 하나라도 실패하면 전체 롤백

#### 🧠 Service: `getMemberStatistics()`

**위치**: `src/services/admin/adminMember.service.js:172-215`

**역할**: 회원 통계 조회 및 가공

**가공 로직**:
```javascript
async function getMemberStatistics() {
  // 1. Repository에서 기본 통계 조회
  const stats = await memberRepo.getStatistics();

  // 2. 비율 계산
  const activeRate = stats.totalMembers > 0
    ? (stats.activeMembers / stats.totalMembers * 100).toFixed(1)
    : 0;

  // 3. 역할별 비율 계산
  const roleRates = {
    buyer: (stats.roleDistribution.buyer / stats.totalMembers * 100).toFixed(1),
    seller: (stats.roleDistribution.seller / stats.totalMembers * 100).toFixed(1),
    admin: (stats.roleDistribution.admin / stats.totalMembers * 100).toFixed(1)
  };

  // 4. 가공된 데이터 반환
  return { ...stats, activeRate, roleRates, ... };
}
```

---

## 7. 사용 시나리오

### 7.1 회원 검색 및 상태 변경

**시나리오**: 특정 회원을 검색하여 정지 처리

1. 관리자: 검색창에 "홍길동" 입력
2. Frontend: 디바운싱 후 `GET /api/v1/admin/members?search=홍길동` 호출
3. 결과: 3명의 "홍길동" 검색됨
4. 관리자: 대상 회원 선택 → "정지" 버튼 클릭
5. Frontend: `PATCH /api/v1/admin/members/1234/status { "status": "suspended" }`
6. Service: 비즈니스 규칙 검증 (관리자 정지 불가 등)
7. Repository: 상태 변경
8. 응답: 성공 메시지 → 목록 새로고침

**결과**: 해당 회원이 `suspended` 상태로 변경되어 로그인 불가

### 7.2 구매자를 판매자로 승급

**시나리오**: 구매자를 판매자로 역할 변경

1. 관리자: 회원 상세 페이지 진입
2. 현재 역할: `buyer`
3. 관리자: 역할 변경 드롭다운에서 `seller` 선택
4. Frontend: `PATCH /api/v1/admin/members/1234/role { "role": "seller" }`
5. Service: 비즈니스 규칙 검증 (자기 자신 수정 방지 등)
6. Repository: 트랜잭션 시작
   - `member.member_account_role` → `seller`
   - `member_permissions.can_sell` → `true`
7. 트랜잭션 커밋
8. 응답: 성공 메시지

**결과**:
- 해당 회원이 판매자로 승급
- 판매 권한 자동 부여
- 상품 등록 및 주문 관리 가능

### 7.3 관리자 권한 보호

**시나리오**: 관리자를 정지하려는 시도 (실패)

1. 관리자: admin 역할 회원 선택 → "정지" 버튼 클릭
2. Frontend: `PATCH /api/v1/admin/members/5/status { "status": "suspended" }`
3. Service: 비즈니스 규칙 검증
   ```javascript
   if (member.member_account_role === 'admin' && status === 'suspended') {
     throw new ValidationError('관리자는 정지할 수 없습니다');
   }
   ```
4. 에러 응답: `ValidationError`
5. Frontend: 에러 메시지 표시

**결과**: 관리자 보호 → 정지 불가

---

## 8. 트러블슈팅

### 8.1 문제: 페이지네이션 버튼 중복 렌더링

**원인**: 필터 변경 시 페이지네이션 HTML이 누적됨

**증상**:
```html
<div class="pagination">
  <button>1</button> <button>2</button>  <!-- 첫 번째 렌더링 -->
  <button>1</button> <button>2</button>  <!-- 두 번째 렌더링 (중복) -->
</div>
```

**해결**:
```javascript
// Before (잘못된 방식)
function renderPagination(totalPages) {
  paginationContainer.innerHTML += `<button>${pageNum}</button>`;  // ❌ +=
}

// After (올바른 방식)
function renderPagination(totalPages) {
  paginationContainer.innerHTML = '';  // ✅ 기존 내용 초기화
  paginationContainer.innerHTML = `<button>${pageNum}</button>`;
}
```

### 8.2 문제: 검색어 입력 시 과도한 API 호출

**원인**: 키 입력마다 API 호출 발생

**증상**:
- "홍길동" 입력 시 3번의 API 호출 (홍, 홍길, 홍길동)
- 서버 부하 증가

**해결**: 디바운싱 적용
```javascript
let searchTimeout;

document.getElementById('searchInput').addEventListener('input', (e) => {
  clearTimeout(searchTimeout);

  searchTimeout = setTimeout(() => {
    loadMembers({ search: e.target.value });
  }, 300);  // 300ms 후 실행
});
```

### 8.3 문제: BigInt JSON 직렬화 에러

**원인**: PostgreSQL BIGINT가 JavaScript BigInt로 변환

**에러**:
```
TypeError: Do not know how to serialize a BigInt
```

**해결**: Service Layer에서 String 변환
```javascript
return {
  ...member,
  member_id: member.member_id.toString(),
  company_id: member.company?.company_id?.toString()
};
```

---

## 9. 성능 최적화

### 9.1 인덱스 활용

**자주 사용되는 쿼리**:
```sql
-- 1. 상태별 조회
SELECT * FROM member WHERE member_status = 'active';
-- 인덱스: (member_status)

-- 2. 역할별 조회
SELECT * FROM member WHERE member_account_role = 'seller';
-- 인덱스: (member_account_role)

-- 3. 검색 (ILIKE)
SELECT * FROM member WHERE member_email ILIKE '%hong%';
-- 인덱스: GIN 인덱스 (전문 검색) 또는 복합 인덱스
```

### 9.2 병렬 쿼리

**목록 조회 시 병렬화**:
```javascript
// ❌ 순차 실행 (느림)
const members = await prisma.member.findMany({ ... });
const total = await prisma.member.count({ ... });

// ✅ 병렬 실행 (빠름)
const [members, total] = await Promise.all([
  prisma.member.findMany({ ... }),
  prisma.member.count({ ... })
]);
```

### 9.3 페이지네이션 최적화

**Offset 기반 페이지네이션 한계**:
- `OFFSET 1000`은 1000개 행을 건너뛰므로 느림
- 마지막 페이지로 갈수록 성능 저하

**대안**: Cursor 기반 페이지네이션 (추후 개선)
```javascript
// Cursor 기반 (추천)
const members = await prisma.member.findMany({
  take: 20,
  cursor: { member_id: lastMemberId },
  orderBy: { member_id: 'desc' }
});
```

---

## 10. 보안 고려사항

### 10.1 인증/인가

**필수 미들웨어**:
```javascript
router.use(authenticate);           // JWT 토큰 검증
router.use(authorize('admin'));     // 관리자 권한 확인
```

**현재 상태**: 개발 중 (주석 처리)
**프로덕션 배포 전**: 반드시 활성화

### 10.2 자기 자신 보호

**규칙**: 관리자는 자기 자신의 역할을 변경할 수 없음

```javascript
if (Number(memberId) === Number(currentAdminId)) {
  throw new ValidationError('자신의 역할은 변경할 수 없습니다');
}
```

**이유**: 실수로 자기 관리자 권한 해제 방지

### 10.3 관리자 권한 보호

**규칙**: 관리자는 정지하거나 권한 해제 불가

```javascript
if (member.member_account_role === 'admin') {
  throw new ValidationError('관리자 권한은 해제할 수 없습니다');
}
```

**대안**: 시스템 관리자가 DB에서 직접 처리

---

## 요약

### 핵심 포인트

✅ **3단계 역할 시스템**
- buyer → seller → admin
- 역할 변경 시 권한 자동 업데이트 (트랜잭션)

✅ **상태 관리**
- active, suspended, inactive
- 관리자 정지 불가 (비즈니스 규칙)

✅ **페이징 및 필터링**
- 상태별, 역할별, 검색어 필터링
- 병렬 쿼리로 성능 최적화

✅ **통계 대시보드**
- 실시간 회원 현황 파악
- 비율 계산 및 시각화

---

**최종 업데이트**: 2025년 10월 10일
**작성자**: Backend Team
**상태**: ✅ **완료**
