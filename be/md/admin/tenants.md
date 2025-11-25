# 판매사관리 어드민 페이지 완전 가이드

> **작성일**: 2025년 10월 10일
> **상태**: ✅ 완료
> **페이지**: `/public/admin/tenants.html`

---

## 📚 목차

1. [개념 설명](#1-개념-설명)
2. [데이터베이스 구조](#2-데이터베이스-구조)
3. [백엔드 아키텍처](#3-백엔드-아키텍처)
4. [API 엔드포인트](#4-api-엔드포인트)
5. [프론트엔드 구현](#5-프론트엔드-구현)
6. [사용 시나리오](#6-사용-시나리오)
7. [트러블슈팅](#7-트러블슈팅)

---

## 1. 개념 설명

### 1.1 판매사(Tenant)란?

판매사는 **플랫폼 내에서 독립적으로 운영되는 판매자의 상점(공방)**을 의미합니다.

**목적**:
- 🏪 **멀티 테넌트 구현**: 하나의 플랫폼에서 여러 판매사 운영
- 📋 **판매사 승인 관리**: 신규 판매사 신청 검토 및 승인
- 👥 **판매사 회원 관리**: 각 판매사 소속 회원 파악
- 📊 **판매사 통계**: 판매사별 상품 수, 주문 수 분석

### 1.2 판매사 승인 프로세스

```
신청 (pending)
  ↓
검토 중 (pending)
  ↓
승인 (approved) / 거부 (rejected)
```

| 상태 | 설명 | 상품 등록 | 주문 처리 |
|------|------|-----------|-----------|
| **pending** | 승인 대기 | ❌ 불가 | ❌ 불가 |
| **approved** | 승인 완료 | ✅ 가능 | ✅ 가능 |
| **rejected** | 승인 거부 | ❌ 불가 | ❌ 불가 |
| **suspended** | 일시 정지 | ❌ 불가 | ⚠️ 기존 주문만 |

### 1.3 핵심 특징

#### ✅ 다대다 관계 (Member ↔ Tenant)

**하나의 회원이 여러 판매사에 속할 수 있음**:
```
홍길동 (Member)
  ├─ 홍길동의 도자기 공방 (Tenant 1)
  └─ 홍길동의 가죽공방 (Tenant 2)
```

**TenantMember 중간 테이블**:
```prisma
model TenantMember {
  tenant_member_id  BigInt
  member_id         BigInt
  tenant_id         BigInt

  member   Member  @relation(...)
  tenant   Tenant  @relation(...)
}
```

#### ✅ 2단계 테이블 구조

**Tenant (필수 정보)** + **TenantDetail (상세 정보)**:
- `Tenant`: 기본 정보 (이름, 상태, 승인일)
- `TenantDetail`: 상세 정보 (설명, 주소, 영업시간, 수수료율)

**장점**:
- 자주 조회되는 정보(Tenant)와 덜 조회되는 정보(TenantDetail) 분리
- 목록 조회 시 성능 향상

---

## 2. 데이터베이스 구조

### 2.1 Tenant 테이블 스키마

| 컬럼명 | 타입 | 설명 | 예시 |
|--------|------|------|------|
| `tenant_id` | BIGINT | 기본키 | `10` |
| `tenant_name` | VARCHAR(100) | 판매사 이름 | `홍길동의 도자기 공방` |
| `tenant_status` | VARCHAR(20) | 상태 | `approved`, `pending`, `rejected` |
| `tenant_approval_member` | VARCHAR(50) | 승인한 관리자 | `admin@fleecat.com` |
| `tenant_applied_at` | TIMESTAMP | 신청일 | `2025-10-01 10:00:00` |
| `tenant_approved_at` | TIMESTAMP | 승인일 | `2025-10-02 15:30:00` |
| `tenant_updated_at` | TIMESTAMP | 수정일 | `2025-10-10 10:00:00` |

### 2.2 TenantDetail 테이블 스키마

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `tenant_detail_id` | BIGINT | 기본키 |
| `tenant_id` | BIGINT | 판매사 ID (FK, UNIQUE) |
| `tenant_detail_description` | TEXT | 판매사 소개 |
| `tenant_detail_email` | VARCHAR(100) | 이메일 |
| `tenant_detail_zipcode` | VARCHAR(10) | 우편번호 |
| `tenant_detail_address` | VARCHAR(255) | 주소 |
| `tenant_detail_address_detail` | VARCHAR(255) | 상세 주소 |
| `tenant_detail_business_hours` | VARCHAR(100) | 영업시간 |
| `tenant_detail_commission_rate` | DECIMAL(5,2) | 수수료율 (%) |

### 2.3 TenantMember 테이블 (중간 테이블)

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `tenant_member_id` | BIGINT | 기본키 |
| `member_id` | BIGINT | 회원 ID (FK) |
| `tenant_id` | BIGINT | 판매사 ID (FK) |
| `tenant_member_role` | VARCHAR(20) | 역할 (`owner`, `staff`) |
| `tenant_member_joined_at` | TIMESTAMP | 가입일 |

### 2.4 관계형 구조

```
Tenant (1) → (1) TenantDetail
Tenant (1) → (N) TenantMember → (1) Member
Tenant (1) → (N) Product
```

### 2.5 비즈니스 규칙

| 규칙 | 설명 | 구현 위치 |
|------|------| ----------|
| **승인 필수** | 상품 등록 전 승인 필요 | Service Layer |
| **승인 기록** | 승인한 관리자 email 저장 | Repository Layer |
| **상품 있으면 삭제 불가** | 상품이 있는 판매사는 삭제 불가 | Service Layer |
| **주문 있으면 정지만 가능** | 주문 이력이 있으면 정지만 가능 | Service Layer |

---

## 3. 백엔드 아키텍처

### 3.1 파일 구조

```
src/
├── repositories/
│   └── admin/
│       └── adminTenant.repository.js
├── services/
│   └── admin/
│       └── adminTenant.service.js
├── controllers/
│   └── admin/
│       └── adminTenant.controller.js
└── routes/
    └── admin/
        └── adminTenant.routes.js
```

### 3.2 주요 함수

#### 📦 Repository Layer
- `findAll(options)`: 판매사 목록 조회
- `findByIdWithDetails(tenantId)`: 판매사 상세 조회
- `updateStatus(tenantId, status, adminEmail)`: 상태 변경
- `approve(tenantId, adminEmail)`: 승인 처리
- `reject(tenantId, adminEmail, reason)`: 거부 처리
- `getStatistics()`: 판매사 통계

#### 🧠 Service Layer
- `getTenantList(options)`: 비즈니스 로직 적용 목록 조회
- `approveTenant(tenantId, adminEmail)`: 승인 프로세스
- `rejectTenant(tenantId, adminEmail, reason)`: 거부 프로세스

---

## 4. API 엔드포인트

### 4.1 판매사 목록 조회

**Request**:
```http
GET /api/v1/admin/tenants?page=1&limit=20&status=pending
```

**Query Parameters**:
- `page` (number): 페이지 번호
- `limit` (number): 페이지당 항목 수
- `status` (string): 상태 필터

**Response**:
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "tenant_id": "10",
        "tenant_name": "홍길동의 도자기 공방",
        "tenant_status": "pending",
        "tenant_applied_at": "2025-10-01T10:00:00.000Z",
        "tenant_detail": {
          "tenant_detail_email": "hong@example.com"
        },
        "_count": {
          "tenant_members": 2,
          "products": 0
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 100
    }
  }
}
```

### 4.2 판매사 승인

**Request**:
```http
PATCH /api/v1/admin/tenants/10/approve
Content-Type: application/json

{
  "adminEmail": "admin@fleecat.com"
}
```

**Response**:
```json
{
  "success": true,
  "message": "판매사가 승인되었습니다.",
  "data": {
    "tenant_id": "10",
    "tenant_status": "approved",
    "tenant_approved_at": "2025-10-10T10:00:00.000Z",
    "tenant_approval_member": "admin@fleecat.com"
  }
}
```

### 4.3 판매사 거부

**Request**:
```http
PATCH /api/v1/admin/tenants/10/reject
Content-Type: application/json

{
  "adminEmail": "admin@fleecat.com",
  "reason": "사업자등록증 미제출"
}
```

### 4.4 판매사 통계

**Request**:
```http
GET /api/v1/admin/tenants/statistics
```

**Response**:
```json
{
  "success": true,
  "data": {
    "totalTenants": 150,
    "approvedTenants": 120,
    "pendingTenants": 20,
    "rejectedTenants": 10,
    "approvalRate": 80.0,
    "recentTenants": 5
  }
}
```

---

## 5. 프론트엔드 구현

### 5.1 페이지 구조

1. **통계 대시보드**
   - 전체 판매사 수
   - 승인 완료 수
   - 승인 대기 수
   - 거부된 판매사 수

2. **필터 및 검색**
   - 상태 필터 (전체/승인대기/승인완료/거부)
   - 검색 (판매사명)

3. **판매사 목록 테이블**
   - 판매사 정보 (ID, 이름, 상태, 신청일)
   - 액션 버튼 (상세보기, 승인, 거부)

### 5.2 UI/UX 특징

**상태별 색상 구분**:
```css
.badge-pending { background-color: #ffc107; }    /* 노란색 */
.badge-approved { background-color: #28a745; }   /* 녹색 */
.badge-rejected { background-color: #dc3545; }   /* 빨간색 */
```

---

## 6. 사용 시나리오

### 6.1 판매사 승인 프로세스

1. 회원이 판매사 신청 → `tenant_status = 'pending'`
2. 관리자가 승인 대기 목록 확인
3. 판매사 상세 정보 검토 (사업자등록증, 주소 등)
4. 승인 버튼 클릭 → `PATCH /api/v1/admin/tenants/10/approve`
5. Service Layer:
   - 상태를 `approved`로 변경
   - `tenant_approved_at`에 현재 시각 저장
   - `tenant_approval_member`에 관리자 이메일 저장
6. 이메일 알림 발송 (선택)
7. 판매사가 상품 등록 가능

### 6.2 판매사 거부 프로세스

1. 관리자가 거부 버튼 클릭
2. 거부 사유 입력 모달 표시
3. 사유 입력 후 확인 → `PATCH /api/v1/admin/tenants/10/reject`
4. Service Layer:
   - 상태를 `rejected`로 변경
   - 거부 사유 저장 (TenantDetail 또는 별도 테이블)
5. 이메일 알림 발송 (거부 사유 포함)

---

## 7. 트러블슈팅

### 7.1 문제: 승인 후에도 상품 등록 불가

**원인**: 승인 상태가 캐시되어 있거나 권한이 업데이트되지 않음

**해결**:
1. 승인 후 JWT 토큰 재발급 (권한 갱신)
2. 프론트엔드 캐시 무효화
3. 판매사 상태 재조회

---

**최종 업데이트**: 2025년 10월 10일
**작성자**: Backend Team
**상태**: ✅ **완료**
