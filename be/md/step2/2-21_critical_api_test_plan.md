# Step 2-21: Phase 2 핵심 API 테스트 계획

**작성일**: 2025년 10월 13일
**목적**: Phase 2 구현 API의 필수 기능 검증 (Railway 배포 환경)
**테스트 도구**: HTML + JavaScript (Fetch API)
**총 테스트 케이스**: 40개

---

## 📋 목차

1. [테스트 개요](#테스트-개요)
2. [6개 핵심 API 선정](#6개-핵심-api-선정)
3. [API별 테스트 케이스 (40개)](#api별-테스트-케이스)
4. [테스트 실행 방법](#테스트-실행-방법)
5. [성공 기준](#성공-기준)

---

## 테스트 개요

### 테스트 대상
Phase 2에서 구현한 멀티테넌트 상품 관리 시스템의 핵심 API 6개

### 테스트 환경
- **배포 플랫폼**: Railway
- **데이터베이스**: Supabase (PostgreSQL)
- **API Base URL**: `https://fleecat-production.up.railway.app`
- **테스트 방식**: HTML 기반 수동 테스트 (Railway 실제 환경)

### 테스트 범위
✅ **포함**:
- 필수 기능 검증 (Success Cases)
- 인증/권한 검증 (Authentication/Authorization)
- 필수 입력값 검증 (Required Fields Validation)
- 핵심 비즈니스 로직 검증 (Critical Business Logic)

❌ **제외**:
- 세부 경계값 테스트
- 복잡한 통합 시나리오
- 성능/부하 테스트

---

## 6개 핵심 API 선정

| 순서 | API | 엔드포인트 | 선정 이유 | 테스트 케이스 |
|------|-----|-----------|----------|-------------|
| **0** | **Register & Login** | `POST /api/v1/auth/*` | 모든 인증의 시작점, JWT 토큰 발급 | 5 |
| **1** | **Tenant Registration** | `POST /api/v1/tenants` | 멀티테넌시 시작점, 판매사 등록 | 7 |
| **2** | **TenantMember Application** | `POST /api/v1/tenants/:id/members` | 판매 권한 부여, 승인 워크플로우 | 7 |
| **3** | **Category Creation** | `POST /api/v1/categories` | 계층형 구조 (최대 3단계) | 7 |
| **4** | **Product Creation** | `POST /api/v1/products` | 핵심 비즈니스 로직, 복잡한 권한 | 8 |
| **5** | **Product List** | `GET /api/v1/products` | 가장 많이 호출, 필터링/정렬 | 6 |

**총 40개 필수 테스트 케이스**

---

## API별 테스트 케이스

### 0. POST /api/v1/auth/* (Register & Login) - 5개

#### TC-0.1: 정상 회원가입 ✅
- **API**: `POST /api/v1/auth/register`
- **목적**: 신규 회원 등록 및 JWT 토큰 발급
- **Request**:
```json
POST /api/v1/auth/register
Body: {
  "email": "testuser@example.com",
  "password": "Test1234!",
  "name": "테스트유저",
  "nickname": "테스터",
  "phone": "010-1234-5678"
}
```
- **Expected**: 201, `{ success: true, data: { member, token } }`

#### TC-0.2: 정상 로그인 ✅
- **API**: `POST /api/v1/auth/login`
- **목적**: 이메일/비밀번호로 JWT 토큰 발급
- **Request**:
```json
POST /api/v1/auth/login
Body: {
  "email": "testuser@example.com",
  "password": "Test1234!"
}
```
- **Expected**: 200, `{ success: true, data: { member: {..., role: "buyer"}, token } }`

#### TC-0.3: 회원가입 - 필수 필드 누락 (email) ❌
- **Request**: `email` 생략
- **Expected**: 400, validation error

#### TC-0.4: 로그인 - 잘못된 비밀번호 ❌
- **Request**: `password: "WrongPassword123!"`
- **Expected**: 401, `{ success: false, message: "Invalid credentials" }`

#### TC-0.5: 로그인 - 존재하지 않는 이메일 ❌
- **Request**: `email: "nonexistent@example.com"`
- **Expected**: 401, `{ success: false, message: "Invalid credentials" }`

---

### 1. POST /api/v1/tenants (Tenant Registration) - 7개

#### TC-1.1: 정상 판매사 등록 ✅
- **목적**: 인증된 회원이 판매사 등록
- **Request**:
```json
POST /api/v1/tenants
Headers: { "Authorization": "Bearer {valid_token}" }
Body: {
  "tenant_name": "플리캣공방",
  "tenant_detail_phone": "010-1234-5678",
  "tenant_detail_email": "fleecat@example.com",
  "tenant_detail_address": "서울시 강남구 테헤란로 123",
  "tenant_detail_zip_code": "06141"
}
```
- **Expected**: 201, `{ success: true, data: { tenant_id, tenant_name, ... } }`

#### TC-1.2: 인증 없이 등록 시도 ❌
- **Request**: Authorization header 없음
- **Expected**: 401, `{ success: false, message: "Unauthorized" }`

#### TC-1.3: 필수 필드 누락 - tenant_name ❌
- **Request**: `tenant_name` 생략
- **Expected**: 400, validation error

#### TC-1.4: 필수 필드 누락 - phone ❌
- **Request**: `tenant_detail_phone` 생략
- **Expected**: 400, validation error

#### TC-1.5: 중복된 tenant_name ❌
- **Request**: 이미 존재하는 판매사명
- **Expected**: 409, `{ success: false, message: "Tenant name already exists" }`

#### TC-1.6: 잘못된 전화번호 형식 ❌
- **Request**: `"tenant_detail_phone": "123456"`
- **Expected**: 400, validation error

#### TC-1.7: 잘못된 이메일 형식 ❌
- **Request**: `"tenant_detail_email": "invalid-email"`
- **Expected**: 400, validation error

---

### 2. POST /api/v1/tenants/:id/members (TenantMember Application) - 7개

#### TC-2.1: 정상 가입 신청 ✅
- **목적**: 일반 회원이 판매사에 가입 신청 (status: pending)
- **Request**:
```json
POST /api/v1/tenants/1/members
Headers: { "Authorization": "Bearer {valid_token}" }
Body: {
  "tenant_member_role": "seller",
  "tenant_member_position": "크리에이터"
}
```
- **Expected**: 201, `{ success: true, data: { tenant_member_status: "pending" } }`

#### TC-2.2: 인증 없이 가입 신청 ❌
- **Request**: Authorization header 없음
- **Expected**: 401

#### TC-2.3: 필수 필드 누락 - role ❌
- **Request**: `tenant_member_role` 생략
- **Expected**: 400, validation error

#### TC-2.4: 잘못된 role 값 ❌
- **Request**: `"tenant_member_role": "invalid_role"`
- **Expected**: 400, validation error (seller/manager만 허용)

#### TC-2.5: 동일 회원 중복 가입 신청 ❌
- **목적**: 같은 판매사에 두 번 신청 방지
- **Request**: 이미 신청했거나 가입된 판매사
- **Expected**: 409, `{ success: false, message: "Already applied or member" }`

#### TC-2.6: 존재하지 않는 Tenant ❌
- **Request**: `POST /api/v1/tenants/999999/members`
- **Expected**: 404, `{ success: false, message: "Tenant not found" }`

#### TC-2.7: 가입 승인 (Owner 권한) ✅
- **API**: `PUT /api/v1/tenant-members/:id/approve`
- **목적**: Tenant Owner가 pending 회원을 approved로 변경
- **Request**:
```json
PUT /api/v1/tenant-members/1/approve
Headers: { "Authorization": "Bearer {owner_token}" }
```
- **Expected**: 200, `{ success: true, data: { tenant_member_status: "approved" } }`

---

### 3. POST /api/v1/categories (Category Creation) - 7개

#### TC-3.1: 1단계 카테고리 생성 (Root) ✅
- **목적**: Admin이 최상위 카테고리 생성
- **Request**:
```json
POST /api/v1/categories
Headers: { "Authorization": "Bearer {admin_token}" }
Body: {
  "category_name": "패션",
  "category_level": 1
}
```
- **Expected**: 201, `{ success: true, data: { category_id, category_parent_id: null } }`

#### TC-3.2: 관리자 권한 없이 생성 시도 ❌
- **Request**: 일반 사용자 토큰 사용
- **Expected**: 403, `{ success: false, message: "Forbidden" }`

#### TC-3.3: 인증 없이 생성 시도 ❌
- **Request**: Authorization header 없음
- **Expected**: 401

#### TC-3.4: 필수 필드 누락 - category_name ❌
- **Request**: `category_name` 생략
- **Expected**: 400, validation error

#### TC-3.5: 4단계 카테고리 생성 시도 (depth 제한) ❌
- **목적**: 최대 3단계 제한 확인
- **Request**: `category_level: 4`, `category_parent_id: {3단계 카테고리}`
- **Expected**: 400, `{ success: false, message: "Maximum category depth is 3" }`

#### TC-3.6: 중복된 category_name (같은 부모) ❌
- **Request**: 같은 `category_parent_id`에 동일한 `category_name`
- **Expected**: 409, `{ success: false, message: "Category name already exists" }`

#### TC-3.7: 존재하지 않는 parent_id ❌
- **Request**: `category_parent_id: 999999`
- **Expected**: 404, `{ success: false, message: "Parent category not found" }`

---

### 4. POST /api/v1/products (Product Creation) - 8개

#### TC-4.1: 정상 상품 등록 ✅
- **목적**: 승인된 TenantMember가 상품 등록
- **Request**:
```json
POST /api/v1/products
Headers: { "Authorization": "Bearer {approved_tenant_member_token}" }
Body: {
  "tenant_member_id": 1,
  "category_id": 3,
  "product_name": "수제 가죽 지갑",
  "product_price": 45000,
  "product_stock": 10,
  "product_description": "소가죽 100% 수제 장지갑"
}
```
- **Expected**: 201, `{ success: true, data: { product_id, product_status: "active" } }`

#### TC-4.2: 인증 없이 등록 시도 ❌
- **Request**: Authorization header 없음
- **Expected**: 401

#### TC-4.3: 필수 필드 누락 - product_name ❌
- **Request**: `product_name` 생략
- **Expected**: 400, validation error

#### TC-4.4: 필수 필드 누락 - product_price ❌
- **Request**: `product_price` 생략
- **Expected**: 400, validation error

#### TC-4.5: 승인되지 않은 TenantMember ❌
- **목적**: `tenant_member_status = 'pending'`인 회원은 등록 불가
- **Request**: pending 상태의 `tenant_member_id`
- **Expected**: 403, `{ success: false, message: "TenantMember not approved" }`

#### TC-4.6: 존재하지 않는 category_id ❌
- **Request**: `category_id: 999999`
- **Expected**: 404, `{ success: false, message: "Category not found" }`

#### TC-4.7: 음수 가격 ❌
- **Request**: `product_price: -1000`
- **Expected**: 400, validation error (최소 1 이상)

#### TC-4.8: 음수 재고 ❌
- **Request**: `product_stock: -5`
- **Expected**: 400, validation error (최소 0 이상)

---

### 5. GET /api/v1/products (Product List) - 6개

#### TC-5.1: 기본 상품 목록 조회 ✅
- **목적**: 필터 없이 전체 조회 (기본 페이지네이션)
- **Request**: `GET /api/v1/products`
- **Expected**: 200, `{ success: true, data: { products: [...], pagination: {...} } }`

#### TC-5.2: 페이지네이션 ✅
- **Request**: `GET /api/v1/products?page=2&limit=10`
- **Expected**: 200, 두 번째 페이지 데이터 (10개)

#### TC-5.3: 카테고리 필터 ✅
- **Request**: `GET /api/v1/products?categoryId=3`
- **Expected**: 200, `category_id = 3`인 상품만 반환

#### TC-5.4: 가격 범위 필터 ✅
- **Request**: `GET /api/v1/products?minPrice=10000&maxPrice=50000`
- **Expected**: 200, 10,000원 ~ 50,000원 상품만

#### TC-5.5: 검색 (product_name) ✅
- **Request**: `GET /api/v1/products?search=지갑`
- **Expected**: 200, `product_name`에 '지갑' 포함된 상품

#### TC-5.6: 정렬 - 가격 오름차순 ✅
- **Request**: `GET /api/v1/products?sortBy=price&sortOrder=asc`
- **Expected**: 200, 가격 낮은 순으로 정렬

---

## 테스트 실행 방법

### 1. 사전 준비

#### Railway 환경 확인
```bash
# Railway 배포 URL 확인
https://fleecat-production.up.railway.app

# Health Check
GET /health
```

#### 테스트용 계정 준비
1. **일반 회원**: TC-0.1, TC-0.2로 생성
2. **Admin 계정**: 데이터베이스에서 수동으로 role 변경 필요
3. **Tenant Owner**: TC-1.1로 Tenant 생성 시 자동으로 Owner가 됨

---

### 2. HTML 테스트 인터페이스 사용

#### 파일 위치
```
public/api-tester.html
```

#### 사용 방법
1. 브라우저에서 `public/api-tester.html` 열기 또는 Railway 웹에서 접근: `https://fleecat-production.up.railway.app/api-tester.html`
2. Railway API URL 입력: `https://fleecat-production.up.railway.app/api/v1`
3. **Step 0**: 회원가입 → 로그인 (JWT 토큰 자동 저장)
4. **Step 1-5**: 순차적으로 테스트 실행
5. 각 테스트 결과 확인 (Status Code, Response Body)

---

### 3. 테스트 순서 (중요!)

```
0. Register & Login (TC-0.1 ~ TC-0.5)
   → JWT 토큰 획득 및 저장

1. Tenant Registration (TC-1.1 ~ TC-1.7)
   → tenant_id 획득

2. TenantMember Application (TC-2.1 ~ TC-2.7)
   → Tenant Owner가 수동으로 승인 필요 (TC-2.7)
   → tenant_member_id 획득

3. Category Creation (TC-3.1 ~ TC-3.7)
   → Admin 토큰 필요
   → category_id 획득 (3단계까지 생성)

4. Product Creation (TC-4.1 ~ TC-4.8)
   → 승인된 TenantMember 토큰 필요
   → product_id 획득

5. Product List (TC-5.1 ~ TC-5.6)
   → 등록된 상품 조회/필터링 테스트
```

**⚠️ 주의사항**:
- TC-2.7 (가입 승인)은 **Tenant Owner만** 가능
- TC-3.x (카테고리)는 **Admin만** 가능
- TC-4.x (상품 등록)은 **approved TenantMember만** 가능

---

### 4. Admin 계정 설정 (수동)

Category 테스트를 위해 Admin 계정 필요:

```sql
-- Supabase Dashboard에서 실행
UPDATE member
SET role = 'admin'
WHERE member_email = 'admin@example.com';
```

또는 Railway 환경변수에 Admin 계정 미리 설정:
```env
ADMIN_EMAIL=admin@fleecat.com
ADMIN_PASSWORD=AdminPass123!
```

---

## 성공 기준

### ✅ 테스트 통과 조건
- **40개 테스트 케이스 중 36개 이상 통과** (90% 이상)
- 모든 **정상 케이스(Success Cases) 통과** (6개 필수)
  - TC-0.1, TC-0.2, TC-1.1, TC-2.1, TC-3.1, TC-4.1
- 모든 **인증/권한 검증 통과**
  - 인증 없이 접근 → 401
  - 권한 없이 접근 → 403
- **필수 필드 검증** 정상 작동 (validation middleware)

### ⚠️ 주의사항
- TC-2.6, TC-3.7, TC-4.6: FK 제약조건 확인 (404 반환)
- TC-3.5: Category depth 제한 (최대 3단계)
- TC-4.5: TenantMember 승인 상태 확인 (핵심 권한 체크)
- TC-5.3 ~ TC-5.6: 필터링/정렬 로직 정확성

### 📊 결과 기록 양식

각 테스트 케이스별로:
```
[TC-0.1] 정상 회원가입
- Status: ✅ PASS / ❌ FAIL
- Response Code: 201
- Response Body: { success: true, data: {...} }
- 비고: JWT 토큰 정상 발급됨
```

---

## 다음 단계

테스트 완료 후:

1. **버그 수정**
   - 실패한 테스트 케이스 분석
   - 코드 수정 및 재배포

2. **API 문서 업데이트**
   - 실제 동작과 문서 일치 확인
   - Postman Collection 생성

3. **자동화 테스트 작성**
   - Jest + Supertest 기반 통합 테스트
   - CI/CD 파이프라인 연동 (GitHub Actions)

4. **Phase 3 준비**
   - 장바구니 기능 구현
   - 주문/결제 기능 구현

---

## 부록: 테스트 데이터 예시

### A. 회원 데이터
```json
{
  "user1": {
    "email": "buyer1@example.com",
    "password": "Buyer123!",
    "name": "구매자1",
    "nickname": "바이어1"
  },
  "user2": {
    "email": "seller1@example.com",
    "password": "Seller123!",
    "name": "판매자1",
    "nickname": "셀러1"
  },
  "admin": {
    "email": "admin@fleecat.com",
    "password": "Admin123!",
    "name": "관리자",
    "nickname": "어드민"
  }
}
```

### B. Tenant 데이터
```json
{
  "tenant_name": "플리캣공방",
  "tenant_detail_phone": "010-1234-5678",
  "tenant_detail_email": "fleecat@example.com",
  "tenant_detail_address": "서울시 강남구 테헤란로 123",
  "tenant_detail_zip_code": "06141",
  "tenant_detail_description": "수제 가죽 공예품 전문"
}
```

### C. Category 데이터 (3단계)
```json
[
  {
    "category_name": "패션",
    "category_level": 1,
    "category_parent_id": null
  },
  {
    "category_name": "가죽제품",
    "category_level": 2,
    "category_parent_id": 1
  },
  {
    "category_name": "지갑",
    "category_level": 3,
    "category_parent_id": 2
  }
]
```

### D. Product 데이터
```json
{
  "tenant_member_id": 1,
  "category_id": 3,
  "product_name": "수제 가죽 장지갑",
  "product_price": 45000,
  "product_stock": 10,
  "product_description": "이탈리아산 소가죽 100% 수제 장지갑"
}
```

---

**작성자**: Claude Code
**최종 수정**: 2025년 10월 13일
