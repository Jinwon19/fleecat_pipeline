# 🔐 관리자 페이지 API + 관리자 대시보드 HTML 구현 계획

> **Phase**: Admin (관리자 기능)
> **작성일**: 2025년 10월 7일
> **상태**: 📋 계획 수립 완료

---

## 📋 목표

1. 플랫폼 전체를 관리할 수 있는 관리자 전용 API 구축
2. API를 테스트할 수 있는 관리자 대시보드 HTML 페이지 제공

---

## 🎯 구현 범위

### Admin-1. 회원 관리 API
- **GET** `/api/v1/admin/members` - 전체 회원 목록 조회 (페이징, 필터링)
- **GET** `/api/v1/admin/members/:id` - 회원 상세 조회
- **PUT** `/api/v1/admin/members/:id/status` - 회원 상태 변경 (정지/활성화)
- **PUT** `/api/v1/admin/members/:id/role` - 회원 역할 변경 (buyer/seller/admin)

### Admin-2. 판매사(Tenant) 관리 API
- **GET** `/api/v1/admin/tenants` - 판매사 목록 조회 (승인 대기/승인/거절)
- **GET** `/api/v1/admin/tenants/:id` - 판매사 상세 조회
- **PUT** `/api/v1/admin/tenants/:id/approve` - 판매사 승인
- **PUT** `/api/v1/admin/tenants/:id/reject` - 판매사 거절
- **PUT** `/api/v1/admin/tenants/:id/status` - 판매사 상태 변경 (정지/해제)

### Admin-3. 카테고리 관리 API
- **GET** `/api/v1/admin/categories` - 카테고리 목록 조회 (계층형)
- **POST** `/api/v1/admin/categories` - 카테고리 생성
- **PUT** `/api/v1/admin/categories/:id` - 카테고리 수정
- **DELETE** `/api/v1/admin/categories/:id` - 카테고리 삭제

### Admin-4. 상품 관리 API
- **GET** `/api/v1/admin/products` - 전체 상품 목록 조회 (모든 상태)
- **GET** `/api/v1/admin/products/:id` - 상품 상세 조회
- **PUT** `/api/v1/admin/products/:id/status` - 상품 상태 변경
- **DELETE** `/api/v1/admin/products/:id` - 부적절 상품 삭제

### Admin-5. 주문 관리 API
- **GET** `/api/v1/admin/orders` - 전체 주문 조회
- **GET** `/api/v1/admin/orders/:id` - 주문 상세 조회
- **PUT** `/api/v1/admin/orders/:id/status` - 주문 상태 강제 변경
- **POST** `/api/v1/admin/orders/:id/refund` - 환불 처리

### Admin-6. 대시보드 통계 API
- **GET** `/api/v1/admin/dashboard/stats` - 전체 통계 요약
- **GET** `/api/v1/admin/dashboard/members` - 회원 통계
- **GET** `/api/v1/admin/dashboard/sales` - 매출 통계
- **GET** `/api/v1/admin/dashboard/products` - 상품 통계

---

## 🖥️ 관리자 대시보드 HTML 구조

### 파일 구조
```
public/
├── admin/
│   ├── index.html                  (로그인 페이지)
│   ├── dashboard.html              (메인 대시보드)
│   ├── members.html                (회원 관리)
│   ├── tenants.html                (판매사 관리)
│   ├── categories.html             (카테고리 관리)
│   ├── products.html               (상품 관리)
│   ├── orders.html                 (주문 관리)
│   ├── css/
│   │   └── admin.css               (공통 스타일)
│   └── js/
│       ├── auth.js                 (인증 처리)
│       ├── api.js                  (API 호출 유틸)
│       ├── dashboard.js            (대시보드 로직)
│       ├── members.js              (회원 관리 로직)
│       ├── tenants.js              (판매사 관리 로직)
│       ├── categories.js           (카테고리 관리 로직)
│       ├── products.js             (상품 관리 로직)
│       └── orders.js               (주문 관리 로직)
```

### HTML 페이지 구성

#### 1. index.html (로그인 페이지)
- 관리자 로그인 폼
- JWT 토큰 저장 (localStorage)
- 역할 검증 (admin만 허용)

#### 2. dashboard.html (메인 대시보드)
- 전체 통계 카드 (회원/판매사/상품/주문 카운트)
- 최근 가입 회원 목록
- 승인 대기 중인 판매사 목록
- 최근 주문 목록
- 매출 그래프 (Chart.js 사용)

#### 3. members.html (회원 관리)
- 회원 목록 테이블 (페이징)
- 검색 및 필터링 (상태, 역할)
- 회원 상세 모달
- 상태 변경 버튼 (정지/활성화)
- 역할 변경 드롭다운

#### 4. tenants.html (판매사 관리)
- 판매사 목록 테이블
- 필터링 (pending/approved/rejected)
- 판매사 상세 모달
- 승인/거절 버튼 (승인 사유 입력)
- 정지/해제 버튼

#### 5. categories.html (카테고리 관리)
- 계층형 카테고리 트리
- 카테고리 추가 폼 (부모 선택)
- 카테고리 수정 모달
- 카테고리 삭제 버튼 (확인 다이얼로그)

#### 6. products.html (상품 관리)
- 상품 목록 테이블 (페이징)
- 필터링 (상태, 카테고리, 판매사)
- 상품 상세 모달 (이미지 포함)
- 상태 변경 버튼
- 삭제 버튼 (확인 다이얼로그)

#### 7. orders.html (주문 관리)
- 주문 목록 테이블
- 필터링 (상태, 기간, 회원)
- 주문 상세 모달 (결제 정보 포함)
- 주문 상태 변경 드롭다운
- 환불 처리 버튼

---

## 🗂️ 백엔드 파일 구조

```
src/
├── repositories/
│   ├── admin/
│   │   ├── adminMember.repository.js       (회원 관리용 쿼리)
│   │   ├── adminTenant.repository.js       (판매사 관리용 쿼리)
│   │   ├── adminProduct.repository.js      (상품 관리용 쿼리)
│   │   ├── adminOrder.repository.js        (주문 관리용 쿼리)
│   │   └── adminDashboard.repository.js    (통계용 쿼리)
│   └── category.repository.js              (카테고리 CRUD)
│
├── services/
│   ├── admin/
│   │   ├── adminMember.service.js          (회원 관리 로직)
│   │   ├── adminTenant.service.js          (판매사 승인 로직)
│   │   ├── adminCategory.service.js        (카테고리 관리)
│   │   ├── adminProduct.service.js         (상품 관리)
│   │   ├── adminOrder.service.js           (주문/환불 처리)
│   │   └── adminDashboard.service.js       (통계 집계)
│
├── controllers/
│   ├── admin/
│   │   ├── adminMember.controller.js
│   │   ├── adminTenant.controller.js
│   │   ├── adminCategory.controller.js
│   │   ├── adminProduct.controller.js
│   │   ├── adminOrder.controller.js
│   │   └── adminDashboard.controller.js
│
├── routes/
│   ├── admin/
│   │   ├── adminMember.routes.js
│   │   ├── adminTenant.routes.js
│   │   ├── adminCategory.routes.js
│   │   ├── adminProduct.routes.js
│   │   ├── adminOrder.routes.js
│   │   └── adminDashboard.routes.js
│   └── admin.routes.js                     (admin 라우트 통합)
│
└── middlewares/
    └── validation.js                       (검증 미들웨어 확장)
```

---

## 📝 구현 단계 (17 Steps)

### 백엔드 구현 (Step 1-14)

#### Step 1: Category Repository
**파일**: `src/repositories/category.repository.js`
- 계층형 카테고리 CRUD (자기참조 구조)
- `category_path` 자동 생성 로직
- 주요 함수: `findAll`, `findById`, `findByParentId`, `create`, `update`, `deleteById`

#### Step 2: AdminMember Repository
**파일**: `src/repositories/admin/adminMember.repository.js`
- 회원 목록 조회 (페이징, 필터링: status, role, 검색어)
- 회원 상태 변경 (`member_status`)
- 회원 역할 변경 (`member_account_role`)
- 회원 통계 (총 회원, 활성 회원, 역할별 분포)

#### Step 3: AdminTenant Repository
**파일**: `src/repositories/admin/adminTenant.repository.js`
- 판매사 목록 조회 (페이징, 필터링: status, 신청일)
- 판매사 상세 조회 (TenantDetail 포함)
- 판매사 승인/거절 (status 변경, 승인일 기록)
- 판매사 통계

#### Step 4: AdminProduct Repository
**파일**: `src/repositories/admin/adminProduct.repository.js`
- 전체 상품 목록 조회 (모든 status, 판매사/카테고리 필터)
- 상품 상태 변경
- 상품 강제 삭제
- 상품 통계

#### Step 5: AdminOrder Repository
**파일**: `src/repositories/admin/adminOrder.repository.js`
- 전체 주문 조회 (페이징, 필터링: status, 기간, 회원)
- 주문 상세 조회 (Payment 포함)
- 주문 상태 강제 변경
- 환불 처리 (order_status, payment_status 변경)

#### Step 6: AdminDashboard Repository
**파일**: `src/repositories/admin/adminDashboard.repository.js`
- 전체 통계 요약 (회원/판매사/상품/주문 카운트)
- 회원 통계 (신규 가입, 역할별 분포)
- 매출 통계 (일/주/월별 집계)
- 상품 통계 (인기 상품, 카테고리별)

#### Step 7: AdminMember Service
**파일**: `src/services/admin/adminMember.service.js`
- 회원 목록 조회 로직
- 회원 상태 변경 로직 (검증: admin은 정지 불가)
- 회원 역할 변경 로직 (검증: 자기 자신 권한 변경 불가)
- MemberPermission 연동 (can_sell 등 권한 자동 업데이트)

#### Step 8: AdminTenant Service
**파일**: `src/services/admin/adminTenant.service.js`
- 판매사 목록 조회 로직
- 판매사 승인 로직 (트랜잭션: tenant_status 변경 + approved_at 기록)
- 판매사 거절 로직 (approval_memo 기록)
- 판매사 정지/해제 로직

#### Step 9: AdminCategory Service
**파일**: `src/services/admin/adminCategory.service.js`
- 계층형 카테고리 트리 조회
- 카테고리 생성 (parent_category_id 검증, depth/path 자동 계산)
- 카테고리 수정 (이름, 순서 변경)
- 카테고리 삭제 (하위 카테고리 확인, CASCADE 처리)

#### Step 10: AdminProduct Service
**파일**: `src/services/admin/adminProduct.service.js`
- 전체 상품 조회 로직
- 상품 상태 변경 로직
- 부적절 상품 삭제 로직 (연관 이미지 자동 삭제)

#### Step 11: AdminOrder Service
**파일**: `src/services/admin/adminOrder.service.js`
- 전체 주문 조회 로직
- 주문 상태 강제 변경 로직
- 환불 처리 로직 (트랜잭션: order + payment 상태 변경)

#### Step 12: AdminDashboard Service
**파일**: `src/services/admin/adminDashboard.service.js`
- 통계 데이터 집계 및 포맷팅

#### Step 13: Controllers (6개)
각 Service를 호출하는 Controller 생성:
- `adminMember.controller.js`
- `adminTenant.controller.js`
- `adminCategory.controller.js`
- `adminProduct.controller.js`
- `adminOrder.controller.js`
- `adminDashboard.controller.js`

#### Step 14: Routes 통합 및 Validation
**파일**:
- `src/middlewares/validation.js` (확장)
  - `validateCreateCategory` - 카테고리 생성 검증
  - `validateUpdateCategory` - 카테고리 수정 검증
  - `validateApprovalMemo` - 승인/거절 사유 검증
  - `validateStatusChange` - 상태 변경 enum 검증

- `src/routes/admin/*.routes.js` (6개 파일)
- `src/routes/admin.routes.js` (통합)
- `src/routes/index.js` (수정: admin 라우트 추가)
- `src/app.js` (수정: 정적 파일 서빙 추가)

---

### 프론트엔드 구현 (Step 15-17)

#### Step 15: HTML 기본 구조 및 공통 파일
**파일**:
- `public/admin/index.html` - 로그인 페이지
- `public/admin/dashboard.html` - 메인 대시보드 (레이아웃 포함)
- `public/admin/css/admin.css` - 공통 스타일
- `public/admin/js/auth.js` - 인증 처리 (로그인, 토큰 검증)
- `public/admin/js/api.js` - API 호출 유틸리티

**기능**:
- 사이드바 네비게이션
- 헤더 (로그아웃 버튼)
- JWT 토큰 관리
- API 호출 공통 함수

#### Step 16: 핵심 관리 페이지 (3개)
**파일**:
- `public/admin/members.html` + `js/members.js`
- `public/admin/tenants.html` + `js/tenants.js`
- `public/admin/categories.html` + `js/categories.js`

**기능**:
- CRUD 작업
- 테이블/리스트 렌더링
- 모달 팝업
- 상태 변경

#### Step 17: 추가 관리 페이지 (3개)
**파일**:
- `public/admin/products.html` + `js/products.js`
- `public/admin/orders.html` + `js/orders.js`
- `public/admin/js/dashboard.js` (대시보드 통계)

**기능**:
- 상품/주문 목록 및 관리
- 대시보드 통계 시각화 (Chart.js)

---

## 🎨 UI/UX 설계

### 디자인 원칙
- **심플하고 실용적**: 복잡한 디자인 지양, 기능 중심
- **반응형**: 데스크톱 중심, 태블릿 호환
- **직관적**: 명확한 버튼/레이블

### 기술 스택
- **HTML5**: 시맨틱 마크업
- **CSS3**: Flexbox/Grid 레이아웃
- **Vanilla JavaScript**: 프레임워크 없이 순수 JS
- **Chart.js**: 통계 그래프 (CDN)
- **Font Awesome**: 아이콘 (CDN)

### 컬러 스킴
```css
/* Primary Colors */
--primary: #2563eb;      /* 파란색 - 주요 버튼 */
--success: #10b981;      /* 초록색 - 승인/활성화 */
--danger: #ef4444;       /* 빨간색 - 거절/삭제 */
--warning: #f59e0b;      /* 주황색 - 경고/정지 */
--secondary: #6b7280;    /* 회색 - 보조 버튼 */

/* Background */
--bg-primary: #ffffff;
--bg-secondary: #f3f4f6;
--bg-dark: #1f2937;

/* Text */
--text-primary: #111827;
--text-secondary: #6b7280;
```

---

## 🔑 핵심 기능

### 1. 역할 관리 (옵션 1 채택)
**사용 필드**: `member.member_account_role` (VARCHAR)
- 값: `'buyer'`, `'seller'`, `'admin'`
- Phase 1 코드가 이미 이 방식으로 작동 중
- `member_permissions` 테이블은 세부 권한만 관리

**권한 체크 로직**:
```javascript
// middlewares/auth.js의 authorize 미들웨어 사용
authorize('admin') // req.user.role === 'admin' 체크
```

**역할 변경 시**:
- `member.member_account_role` 업데이트
- `member_permissions.can_sell` 등 연동 권한 자동 업데이트
  - admin → can_sell, can_purchase 모두 true
  - seller → can_sell true
  - buyer → can_purchase true

### 2. 인증 흐름
```
1. index.html에서 로그인
2. /api/v1/auth/login 호출
3. JWT 토큰 받아서 localStorage 저장
4. 역할 검증 (role === 'admin' 확인)
5. dashboard.html로 리다이렉트
6. 이후 모든 API 호출 시 Authorization 헤더에 토큰 포함
```

### 3. API 호출 유틸리티 (api.js)
```javascript
// 공통 API 호출 함수
async function apiCall(method, url, data = null) {
  const token = localStorage.getItem('admin_token');
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
  if (data) options.body = JSON.stringify(data);

  const response = await fetch(url, options);
  return await response.json();
}
```

### 4. 승인 프로세스
**Tenant 승인**:
- `tenant_status`: `pending` → `approved` / `rejected`
- `tenant_approved_at`: 승인 시각 기록
- `tenant_approval_member`: 승인한 관리자 정보 (JSON 형태)

### 5. 상태 관리
- **Member**: `active` ↔ `suspended` ↔ `inactive`
- **Tenant**: `pending` → `approved` / `rejected` / `suspended`
- **Product**: `active` ↔ `inactive` / 강제 삭제
- **Order**: `pending` → `preparing` → `shipped` → `delivered` / `cancelled` / `refunded`

### 6. 통계 집계
- 실시간 카운트 (회원/판매사/상품/주문)
- 기간별 매출 통계 (일/주/월)
- 인기 상품 TOP 10
- 판매사별 매출 순위

### 7. 계층형 카테고리
- 부모-자식 관계 (자기참조: `parent_category_id`)
- `category_path` 자동 계산 (예: "1/5/12")
- `category_depth` 자동 계산 (1~3단계)
- 하위 카테고리 CASCADE 삭제

---

## 📊 예상 파일 개수

### 백엔드
| 유형 | 파일 개수 |
|------|----------|
| Repository | 6개 |
| Service | 6개 |
| Controller | 6개 |
| Routes | 7개 |
| **합계** | **25개** |

### 프론트엔드
| 유형 | 파일 개수 |
|------|----------|
| HTML | 7개 |
| CSS | 1개 |
| JavaScript | 8개 |
| **합계** | **16개** |

---

## ⚠️ 주의사항

### 1. 역할 필드 사용 (옵션 1)
- ✅ **사용**: `member.member_account_role` (VARCHAR)
- ❌ **사용 안 함**: `member_permissions.member_permission_role` (Int)
- Phase 1 코드 수정 불필요
- 추가 마이그레이션 불필요

### 2. 정적 파일 서빙 설정
**파일**: `src/app.js`
```javascript
const path = require('path');

// public 폴더를 정적 파일로 서빙
app.use('/admin', express.static(path.join(__dirname, '../public/admin')));
```

### 3. 기존 코드 재사용
- `member.repository.js` - 회원 조회 재사용
- `authenticate`, `authorize` 미들웨어 재사용
- 공통 Response 포맷 재사용
- JWT 토큰 구조 그대로 사용 (role 필드에 문자열)

### 4. 트랜잭션 처리 필요
**승인 프로세스**:
- Tenant 승인 → `tenant` + `tenant_detail` 업데이트
- 환불 처리 → `order` + `payment` 동시 업데이트

**Prisma 트랜잭션 예시**:
```javascript
await prisma.$transaction(async (tx) => {
  await tx.tenant.update({ ... });
  await tx.tenantDetail.update({ ... });
});
```

### 5. 보안
- 로그인 페이지에서 admin 역할만 허용
- 모든 관리 페이지에서 토큰 검증
- XSS 방지: innerHTML 대신 textContent 사용
- CORS 설정 유지

### 6. CASCADE 정책 준수
- Category 삭제 → 하위 카테고리 자동 삭제 (CASCADE)
- Product 삭제 → ProductImg 자동 삭제 (CASCADE)
- Order/Payment는 RESTRICT (삭제 불가, 이력 보존)

---

## 🚀 구현 우선순위

### Phase 1: 백엔드 API 핵심 기능 (Step 1-8)
1. ✅ **Step 1**: Category Repository
2. ✅ **Step 2**: AdminMember Repository
3. ✅ **Step 3**: AdminTenant Repository
4. ✅ **Step 7**: AdminMember Service
5. ✅ **Step 8**: AdminTenant Service
6. ✅ **Step 9**: AdminCategory Service
7. ✅ **Step 13**: Controllers (Member, Tenant, Category)
8. ✅ **Step 14**: Routes 통합 + app.js 정적 파일 서빙 설정

### Phase 2: 관리자 대시보드 HTML (Step 15-16)
9. ✅ **Step 15**: HTML 기본 구조 (로그인, 대시보드 레이아웃, 공통 파일)
10. ✅ **Step 16**: 핵심 관리 페이지 (회원, 판매사, 카테고리)
11. ✅ **테스트**: 로그인 → 회원 관리 → 판매사 승인 → 카테고리 CRUD

### Phase 3: 상품/주문 관리 (선택)
12. ⭐ **Step 4**: AdminProduct Repository
13. ⭐ **Step 5**: AdminOrder Repository
14. ⭐ **Step 10**: AdminProduct Service
15. ⭐ **Step 11**: AdminOrder Service
16. ⭐ **Step 13**: Controllers (Product, Order)
17. ⭐ **Step 17**: 추가 관리 페이지 (상품, 주문, 대시보드 통계)

### Phase 4: 통계 (선택)
18. ⭐ **Step 6**: AdminDashboard Repository
19. ⭐ **Step 12**: AdminDashboard Service
20. ⭐ **Step 13**: Controller (Dashboard)

---

## 📦 다음 작업

승인 후 다음 순서로 진행:

### 백엔드 우선 (Step 1-8)
1. Category Repository
2. AdminMember Repository
3. AdminTenant Repository
4. AdminMember Service
5. AdminTenant Service
6. AdminCategory Service
7. Controllers (Member, Tenant, Category)
8. Routes 통합 + app.js 정적 파일 서빙 설정

### 프론트엔드 구현 (Step 15-16)
9. HTML 기본 구조 및 공통 파일
10. 핵심 관리 페이지 (회원, 판매사, 카테고리)
11. **테스트**: 로그인 → 회원 관리 → 판매사 승인 → 카테고리 CRUD

### 추가 기능 (선택)
12. 상품/주문 관리 API + HTML
13. 대시보드 통계

---

## 🧪 테스트 시나리오

### 1. 로그인 테스트
1. admin 역할 회원으로 로그인
2. JWT 토큰 저장 확인
3. 대시보드 리다이렉트 확인

### 2. 회원 관리 테스트
1. 회원 목록 조회
2. 회원 상태 변경 (active → suspended)
3. 회원 역할 변경 (buyer → seller)

### 3. 판매사 관리 테스트
1. 승인 대기 판매사 목록 조회
2. 판매사 승인 (사유 입력)
3. 판매사 거절

### 4. 카테고리 관리 테스트
1. 카테고리 트리 조회
2. 카테고리 생성 (부모 선택)
3. 카테고리 수정
4. 카테고리 삭제

각 단계마다 **코드 구현 → HTML 연동 → 브라우저 테스트 → 다음 단계** 진행

---

**최종 업데이트**: 2025년 10월 7일
**작성자**: Backend Team
**상태**: 📋 **계획 수립 완료**
