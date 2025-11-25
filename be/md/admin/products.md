# 상품관리 어드민 페이지 완전 가이드

> **작성일**: 2025년 10월 10일
> **상태**: ✅ 완료
> **페이지**: `/public/admin/products.html`

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

### 1.1 상품관리란?

상품관리는 **플랫폼 내 모든 상품을 관리하고 모니터링**하는 기능입니다.

**목적**:
- 📦 **상품 모니터링**: 전체 상품 현황 및 상태 파악
- 🔍 **품질 관리**: 부적절한 상품 검토 및 비활성화
- 📊 **통계 분석**: 카테고리별 상품 분포, 판매 현황 분석
- 🏷️ **카테고리 관리**: 상품 카테고리 분류 및 수정

### 1.2 상품 상태

| 상태 | 설명 | 판매 가능 | 노출 |
|------|------|-----------|------|
| **active** | 판매 중 | ✅ 가능 | ✅ 노출 |
| **sold_out** | 품절 | ❌ 불가 | ⚠️ 품절 표시 |
| **inactive** | 비활성화 | ❌ 불가 | ❌ 미노출 |

### 1.3 상품 소유권

**Product는 TenantMember에 속함**:
```
Member (판매자)
  ↓
TenantMember (판매사 소속)
  ↓
Product (상품)
```

**중요**: 상품은 Tenant가 아닌 **TenantMember** 소유
- 한 판매사(Tenant)에 여러 판매자(TenantMember)가 있을 수 있음
- 각 판매자가 독립적으로 상품 관리

---

## 2. 데이터베이스 구조

### 2.1 Product 테이블 스키마

| 컬럼명 | 타입 | 설명 | 예시 |
|--------|------|------|------|
| `product_id` | BIGINT | 기본키 | `100` |
| `tenant_member_id` | BIGINT | 판매자 ID (FK) | `25` |
| `category_id` | BIGINT | 카테고리 ID (FK) | `10` |
| `product_name` | VARCHAR(200) | 상품명 | `핸드메이드 도자기 찻잔` |
| `product_description` | TEXT | 상품 설명 | `전통 방식으로 ...` |
| `product_price` | INT | 가격 (원) | `35000` |
| `product_quantity` | INT | 재고 수량 | `50` |
| `product_status` | VARCHAR(20) | 상태 | `active` |
| `product_view_count` | INT | 조회수 | `1250` |
| `product_created_at` | TIMESTAMP | 등록일 | `2025-10-01` |

### 2.2 ProductImg 테이블 스키마

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `product_img_id` | BIGINT | 기본키 |
| `product_id` | BIGINT | 상품 ID (FK) |
| `product_img_url` | VARCHAR(500) | 이미지 URL |
| `product_img_alt_text` | VARCHAR(200) | 대체 텍스트 |
| `product_img_order` | INT | 이미지 순서 |
| `product_img_is_primary` | BOOLEAN | 대표 이미지 여부 |

### 2.3 관계형 구조

```
Product (N) → (1) TenantMember → (1) Tenant
Product (N) → (1) Category
Product (1) → (N) ProductImg
Product (1) → (N) ShoppingCart
Product (1) → (N) Order
```

### 2.4 CASCADE 정책

**ProductImg**:
- 상품 삭제 시 → 모든 이미지 자동 삭제 (CASCADE)

**ShoppingCart**:
- 상품 삭제 시 → 장바구니에서 자동 제거 (CASCADE)

**Order**:
- 상품 삭제 시 → **주문은 유지** (RESTRICT)
- 주문 이력이 있으면 상품 삭제 불가

---

## 3. 백엔드 아키텍처

### 3.1 파일 구조

```
src/
├── repositories/
│   └── admin/
│       └── adminProduct.repository.js
├── services/
│   └── admin/
│       └── adminProduct.service.js
├── controllers/
│   └── admin/
│       └── adminProduct.controller.js
└── routes/
    └── admin/
        └── adminProduct.routes.js
```

### 3.2 주요 함수

#### 📦 Repository Layer
- `findAll(options)`: 상품 목록 조회 (판매자, 카테고리 정보 포함)
- `findByIdWithDetails(productId)`: 상품 상세 조회 (이미지, 판매자 정보)
- `updateStatus(productId, status)`: 상품 상태 변경
- `updateCategory(productId, categoryId)`: 카테고리 변경
- `getStatistics()`: 상품 통계 조회

#### 🧠 Service Layer
- `getProductList(options)`: 비즈니스 로직 적용 목록 조회
- `updateProductStatus(productId, status)`: 상태 변경 프로세스
- `deleteProduct(productId)`: 삭제 전 검증 (주문 이력 확인)

---

## 4. API 엔드포인트

### 4.1 상품 목록 조회

**Request**:
```http
GET /api/v1/admin/products?page=1&limit=20&status=active&categoryId=10&search=도자기
```

**Query Parameters**:
- `page` (number): 페이지 번호
- `limit` (number): 페이지당 항목 수
- `status` (string): 상태 필터
- `categoryId` (number): 카테고리 필터
- `search` (string): 검색어 (상품명)

**Response**:
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "product_id": "100",
        "product_name": "핸드메이드 도자기 찻잔",
        "product_price": 35000,
        "product_quantity": 50,
        "product_status": "active",
        "product_created_at": "2025-10-01T10:00:00.000Z",
        "category": {
          "category_id": "10",
          "category_name": "도자기"
        },
        "tenant_member": {
          "tenant": {
            "tenant_id": "5",
            "tenant_name": "홍길동의 공방",
            "tenant_status": "approved"
          },
          "member": {
            "member_id": "1234",
            "member_name": "홍길동",
            "member_email": "hong@example.com"
          }
        },
        "product_images": [
          {
            "product_img_url": "https://example.com/image.jpg",
            "product_img_is_primary": true
          }
        ]
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 20,
      "totalItems": 400
    }
  }
}
```

### 4.2 상품 상세 조회

**Request**:
```http
GET /api/v1/admin/products/100
```

**Response**:
```json
{
  "success": true,
  "data": {
    "product_id": "100",
    "product_name": "핸드메이드 도자기 찻잔",
    "product_description": "전통 방식으로 만든...",
    "product_price": 35000,
    "product_quantity": 50,
    "tenant_member": { ... },
    "product_images": [ ... ],
    "_count": {
      "shopping_carts": 5,
      "orders": 12
    }
  }
}
```

### 4.3 상품 상태 변경

**Request**:
```http
PATCH /api/v1/admin/products/100/status
Content-Type: application/json

{
  "status": "inactive"
}
```

**Response**:
```json
{
  "success": true,
  "message": "상품 상태가 변경되었습니다.",
  "data": {
    "product_id": "100",
    "product_status": "inactive"
  }
}
```

### 4.4 상품 카테고리 변경

**Request**:
```http
PATCH /api/v1/admin/products/100/category
Content-Type: application/json

{
  "categoryId": 15
}
```

### 4.5 상품 삭제

**Request**:
```http
DELETE /api/v1/admin/products/100
```

**Response (성공)**:
```json
{
  "success": true,
  "message": "상품이 삭제되었습니다."
}
```

**Response (실패 - 주문 이력 있음)**:
```json
{
  "success": false,
  "message": "12개의 주문이 있는 상품은 삭제할 수 없습니다. 비활성화만 가능합니다."
}
```

### 4.6 상품 통계 조회

**Request**:
```http
GET /api/v1/admin/products/statistics
```

**Response**:
```json
{
  "success": true,
  "data": {
    "totalProducts": 500,
    "activeProducts": 400,
    "soldOutProducts": 50,
    "inactiveProducts": 50,
    "categoryDistribution": [
      {
        "category_name": "도자기",
        "count": 120
      },
      {
        "category_name": "가죽제품",
        "count": 80
      }
    ],
    "averagePrice": 45000,
    "totalViews": 125000
  }
}
```

---

## 5. 프론트엔드 구현

### 5.1 페이지 구조

1. **통계 대시보드**
   - 전체 상품 수
   - 판매 중 상품
   - 품절 상품
   - 비활성 상품

2. **필터 및 검색**
   - 상태 필터 (전체/판매중/품절/비활성)
   - 카테고리 필터 (드롭다운)
   - 검색 (상품명)

3. **상품 목록 테이블**
   - 상품 정보 (ID, 이미지, 이름, 가격, 재고, 상태)
   - 판매자 정보 (판매사명, 판매자명)
   - 액션 버튼 (상세보기, 상태 변경, 삭제)

### 5.2 UI/UX 특징

**상태별 색상**:
```css
.badge-active { background-color: #28a745; }    /* 녹색 */
.badge-sold_out { background-color: #ffc107; }  /* 노란색 */
.badge-inactive { background-color: #6c757d; }  /* 회색 */
```

**이미지 표시**:
- 대표 이미지 (product_img_is_primary = true) 표시
- 없으면 기본 이미지 (placeholder)

---

## 6. 사용 시나리오

### 6.1 부적절한 상품 비활성화

1. 관리자가 상품 목록 확인
2. 부적절한 상품 발견 (저작권 침해 등)
3. 해당 상품의 "비활성화" 버튼 클릭
4. `PATCH /api/v1/admin/products/100/status { "status": "inactive" }`
5. Service Layer:
   - 상태를 `inactive`로 변경
   - 노출 중단
6. 판매자에게 알림 발송 (선택)

**결과**: 상품이 비활성화되어 구매자에게 노출되지 않음

### 6.2 카테고리 재분류

1. 관리자가 잘못 분류된 상품 발견
2. 상품 상세 페이지 진입
3. 카테고리 변경 드롭다운에서 올바른 카테고리 선택
4. `PATCH /api/v1/admin/products/100/category { "categoryId": 15 }`
5. Repository:
   - `product.category_id` 업데이트
6. 응답: 성공 메시지

**결과**: 상품이 올바른 카테고리로 이동

### 6.3 상품 삭제 시도 (주문 이력 있음)

1. 관리자가 상품 삭제 버튼 클릭
2. `DELETE /api/v1/admin/products/100`
3. Service Layer:
   - 주문 이력 확인
   ```javascript
   const orderCount = await prisma.order.count({
     where: { product_id: productId }
   });
   ```
4. `orderCount = 12` → ValidationError 발생
5. 에러 응답: "12개의 주문이 있는 상품은 삭제할 수 없습니다"

**결과**: 삭제 불가 → 비활성화 권장

---

## 7. 트러블슈팅

### 7.1 문제: 대표 이미지가 표시되지 않음

**원인**: `product_img_is_primary = true`인 이미지가 없음

**증상**: 상품 목록에서 이미지 영역이 비어있음

**해결**:
```javascript
// 1. 대표 이미지 우선 조회
const primaryImage = product.product_images.find(img => img.product_img_is_primary);

// 2. 없으면 첫 번째 이미지
const fallbackImage = product.product_images[0];

// 3. 둘 다 없으면 placeholder
const imageUrl = primaryImage?.product_img_url
  || fallbackImage?.product_img_url
  || '/images/placeholder.jpg';
```

### 7.2 문제: 재고가 음수로 표시됨

**원인**: 주문 처리 시 재고 차감 로직 오류

**증상**: `product_quantity = -5`

**해결**:
1. 주문 처리 시 트랜잭션 적용
2. 재고 부족 시 주문 거부
```javascript
if (product.product_quantity < orderQuantity) {
  throw new ValidationError('재고가 부족합니다');
}
```

### 7.3 문제: 카테고리 삭제된 상품 조회 불가

**원인**: 카테고리가 삭제되어 FK 참조 오류

**해결**:
1. 카테고리 삭제 전 해당 카테고리 상품 확인
2. 상품이 있으면 삭제 불가 또는 기본 카테고리로 이동
```javascript
const productCount = await prisma.product.count({
  where: { category_id: categoryId }
});

if (productCount > 0) {
  throw new ValidationError(`${productCount}개의 상품이 있는 카테고리는 삭제할 수 없습니다`);
}
```

---

**최종 업데이트**: 2025년 10월 10일
**작성자**: Backend Team
**상태**: ✅ **완료**
