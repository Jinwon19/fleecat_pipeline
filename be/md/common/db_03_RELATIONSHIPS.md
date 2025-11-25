# 데이터베이스 변수 관계도 & FK

> [← 목차로 돌아가기](./db_00_INDEX.md)

**fleecat 멀티테넌트 쇼핑몰 플랫폼**

---

## 🔗 4. 변수 관계도 (Relationship Map)

### 4.1 핵심 FK 관계 매핑

#### 회원 → 기업
```
members.company_id → company.company_id (N:1)
```
- 여러 회원이 한 기업에 소속 가능
- **NULL 허용** (개인회원)

**예시 쿼리**:
```sql
-- 기업 소속 회원 조회
SELECT m.member_name, c.company_name
FROM members m
LEFT JOIN company c ON m.company_id = c.company_id;
```

---

#### 회원 → 권한
```
member_permissions.member_id → members.member_id (1:1)
```
- 한 회원당 하나의 권한 레코드
- **UNIQUE 제약**

**예시 쿼리**:
```sql
-- 회원과 권한 정보 조회
SELECT m.member_name, p.can_purchase, p.can_sell
FROM members m
INNER JOIN member_permissions p ON m.member_id = p.member_id;
```

---

#### 판매사 → 구성원
```
tenant_member.tenant_id → tenant.tenant_id (N:1)
tenant_member.member_id → members.member_id (N:1)
```
- 한 판매사에 여러 구성원
- 한 회원이 여러 판매사에 소속 가능

**예시 쿼리**:
```sql
-- 판매사별 구성원 조회
SELECT t.tenant_name, m.member_name, tm.tenant_member_role
FROM tenant t
INNER JOIN tenant_member tm ON t.tenant_id = tm.tenant_id
INNER JOIN members m ON tm.member_id = m.member_id;
```

---

#### 판매사 → 상세정보
```
tenant_detail.tenant_id → tenant.tenant_id (1:1)
```
- 한 판매사당 하나의 상세정보
- **UNIQUE 제약**

---

#### 상품 → 판매자/카테고리
```
product.tenant_member_id → tenant_member.tenant_member_id (N:1)
product.category_id → category.category_id (N:1)
```
- 여러 상품이 한 판매자에 속함
- 여러 상품이 한 카테고리에 속함

**예시 쿼리**:
```sql
-- 상품과 판매자, 카테고리 정보 조회
SELECT
  p.product_name,
  m.member_name AS seller_name,
  c.category_name
FROM product p
INNER JOIN tenant_member tm ON p.tenant_member_id = tm.tenant_member_id
INNER JOIN members m ON tm.member_id = m.member_id
INNER JOIN category c ON p.category_id = c.category_id;
```

---

#### 상품 → 이미지
```
product_img.product_id → product.product_id (N:1)
```
- 한 상품에 여러 이미지 (최대 5개)
- **CASCADE 삭제**

**예시 쿼리**:
```sql
-- 상품의 대표 이미지 조회
SELECT p.product_name, pi.product_img_url
FROM product p
INNER JOIN product_img pi ON p.product_id = pi.product_id
WHERE pi.product_img_sequence = 0;
```

---

#### 장바구니
```
shopping_cart.member_id → members.member_id (N:1)
shopping_cart.product_id → product.product_id (N:1)
```
- **UNIQUE(member_id, product_id)** - 중복 방지

**예시 쿼리**:
```sql
-- 회원의 장바구니 조회
SELECT m.member_name, p.product_name, sc.shopping_cart_quantity
FROM shopping_cart sc
INNER JOIN members m ON sc.member_id = m.member_id
INNER JOIN product p ON sc.product_id = p.product_id
WHERE m.member_id = 1;
```

---

#### 주문 → 회원/장바구니/쿠폰
```
order.member_id → members.member_id (N:1)
order.shopping_cart_id → shopping_cart.shopping_cart_id (N:1, nullable)
order.coupon_id → coupon.coupon_id (N:1, nullable)
```

**예시 쿼리**:
```sql
-- 주문 정보 전체 조회
SELECT
  o.order_number,
  m.member_name,
  o.order_total_amount,
  c.coupon_code
FROM order o
INNER JOIN members m ON o.member_id = m.member_id
LEFT JOIN coupon c ON o.coupon_id = c.coupon_id;
```

---

#### 결제 → 주문
```
payment.order_id → order.order_id (1:1)
```
- 한 주문에 하나의 결제
- **UNIQUE 제약**

**예시 쿼리**:
```sql
-- 주문과 결제 정보 조회
SELECT
  o.order_number,
  o.order_total_amount,
  p.payment_status,
  p.payment_approved_at
FROM order o
INNER JOIN payment p ON o.order_id = p.order_id;
```

---

#### 회원 → 배송지
```
member_address.member_id → members.member_id (N:1)
```
- 한 회원이 여러 배송지 보유
- **CASCADE 삭제**

---

#### 회원 → 거래내역
```
member_transactions.member_id → members.member_id (N:1)
member_transactions.related_order_id → order.order_id (N:1, nullable)
```

---

### 4.2 도메인 간 연결 구조

```
📦 회원 도메인
company (기업)
  ↓ (1:N)
members (회원) ←─────────┐
  ↓ (1:1)               │
member_permissions       │
  ↓ (1:N)               │
member_address           │
  ↓ (1:N)               │
member_transactions      │
                         │
📦 판매사 도메인          │
tenant (판매사)          │
  ↓ (1:1)               │
tenant_detail            │
  ↓ (1:N)               │
tenant_member ──────────┘
  ↓ (1:N)

📦 상품 도메인
category (카테고리)
  ↓ (1:N, 자기참조)
product (상품) ←── tenant_member
  ↓ (1:N)
product_img

📦 주문 도메인
shopping_cart ──→ members
  ↓          product
  ↓
order ──→ members
  ↓       coupon
  ↓ (1:1)
payment

📦 거래 도메인
coupon ──→ members
member_transactions ──→ members, order
```

---

### 4.3 CASCADE 삭제 정책

| 부모 테이블 | 자식 테이블 | 삭제 정책 |
|------------|------------|----------|
| members | member_address | **CASCADE** |
| members | member_permissions | **CASCADE** |
| members | member_transactions | **CASCADE** |
| members | shopping_cart | **CASCADE** |
| tenant | tenant_detail | **CASCADE** |
| tenant | tenant_member | **CASCADE** |
| product | product_img | **CASCADE** |
| product | shopping_cart | **CASCADE** |
| category | category (자기참조) | **CASCADE** |

#### ⚠️ 주의사항

**RESTRICT (삭제 금지) 정책**:
- `order`는 **RESTRICT** (주문 이력 보존)
- `payment`는 **RESTRICT** (결제 이력 보존)

**이유**: 법적 요구사항 및 데이터 감사 추적을 위해 주문/결제 이력은 영구 보존

---

### 4.4 NULL 허용 FK

| 테이블 | FK 컬럼 | NULL 허용 | 이유 |
|--------|---------|----------|------|
| members | company_id | ✅ | 개인회원은 기업 없음 |
| order | shopping_cart_id | ✅ | 직접 구매 시 장바구니 거치지 않음 |
| order | coupon_id | ✅ | 쿠폰 미사용 주문 가능 |
| member_transactions | related_order_id | ✅ | 이벤트 적립금은 주문 없이 발생 |

**NULL 허용 FK 쿼리 예시**:
```sql
-- 개인회원 조회 (company_id가 NULL)
SELECT member_name, member_email
FROM members
WHERE company_id IS NULL;

-- 쿠폰 미사용 주문 조회
SELECT order_number, order_total_amount
FROM order
WHERE coupon_id IS NULL;
```

---

## 🔍 실전 JOIN 쿼리 예시

### 예시 1: 회원의 최근 주문 내역 조회

```sql
SELECT
  m.member_name,
  o.order_number,
  o.order_status,
  o.order_total_amount,
  p.payment_status,
  p.payment_approved_at
FROM members m
INNER JOIN order o ON m.member_id = o.member_id
INNER JOIN payment p ON o.order_id = p.order_id
WHERE m.member_id = 1
ORDER BY o.order_created_at DESC
LIMIT 10;
```

---

### 예시 2: 판매사별 상품 및 재고 현황

```sql
SELECT
  t.tenant_name,
  COUNT(p.product_id) AS total_products,
  SUM(CASE WHEN p.product_status = 'active' THEN 1 ELSE 0 END) AS active_products,
  SUM(CASE WHEN p.product_status = 'sold_out' THEN 1 ELSE 0 END) AS sold_out_products,
  SUM(p.product_quantity) AS total_inventory
FROM tenant t
INNER JOIN tenant_member tm ON t.tenant_id = tm.tenant_id
INNER JOIN product p ON tm.tenant_member_id = p.tenant_member_id
GROUP BY t.tenant_id, t.tenant_name;
```

---

### 예시 3: 카테고리별 인기 상품 (조회수 TOP 5)

```sql
SELECT
  c.category_name,
  p.product_name,
  p.product_price,
  p.product_view_count,
  m.member_name AS seller_name
FROM product p
INNER JOIN category c ON p.category_id = c.category_id
INNER JOIN tenant_member tm ON p.tenant_member_id = tm.tenant_member_id
INNER JOIN members m ON tm.member_id = m.member_id
WHERE p.product_status = 'active'
  AND c.category_id = 1
ORDER BY p.product_view_count DESC
LIMIT 5;
```

---

### 예시 4: 회원의 장바구니 총액 계산

```sql
SELECT
  m.member_name,
  COUNT(sc.shopping_cart_id) AS cart_items,
  SUM(p.product_price * sc.shopping_cart_quantity) AS total_cart_amount
FROM members m
INNER JOIN shopping_cart sc ON m.member_id = sc.member_id
INNER JOIN product p ON sc.product_id = p.product_id
WHERE m.member_id = 1
GROUP BY m.member_id, m.member_name;
```

---

### 예시 5: 월별 매출 통계 (판매사별)

```sql
SELECT
  t.tenant_name,
  DATE_FORMAT(o.order_created_at, '%Y-%m') AS month,
  COUNT(o.order_id) AS total_orders,
  SUM(o.order_subtotal_amount) AS total_sales,
  AVG(o.order_subtotal_amount) AS avg_order_amount
FROM order o
INNER JOIN shopping_cart sc ON o.shopping_cart_id = sc.shopping_cart_id
INNER JOIN product p ON sc.product_id = p.product_id
INNER JOIN tenant_member tm ON p.tenant_member_id = tm.tenant_member_id
INNER JOIN tenant t ON tm.tenant_id = t.tenant_id
WHERE o.order_status IN ('delivered', 'shipped')
  AND o.order_created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
GROUP BY t.tenant_id, t.tenant_name, month
ORDER BY month DESC, total_sales DESC;
```

---

## 📝 FK 관계 체크리스트

### 새로운 FK 추가 시 확인사항

- [ ] FK 컬럼명이 `참조테이블명_id` 형식인가?
- [ ] 데이터 타입이 참조 테이블의 PK와 동일한가? (BIGINT)
- [ ] NULL 허용 여부가 명확한가?
- [ ] CASCADE 삭제 정책이 적절한가?
- [ ] 인덱스가 필요한가? (조회 성능 최적화)
- [ ] UNIQUE 제약이 필요한가? (1:1 관계)

---

## 다음 단계

- **변수 빠른 참조**: [01. 변수 빠른 참조](./db_01_VARIABLE_REFERENCE.md)
- **네이밍 규칙**: [02. 네이밍 규칙 & 데이터 타입](./db_02_NAMING_DATATYPES.md)

---

> [← 목차로 돌아가기](./db_00_INDEX.md)
