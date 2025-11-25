# 데이터베이스 변수 빠른 참조

> [← 목차로 돌아가기](./db_00_INDEX.md)

**fleecat 멀티테넌트 쇼핑몰 플랫폼**

---

## 📌 1. 변수 빠른 참조 (Quick Reference)

### 1.1 도메인별 주요 변수 요약

| 도메인 | 핵심 테이블 | 주요 식별자 | 핵심 상태 변수 | 핵심 금액 변수 |
|--------|------------|------------|---------------|---------------|
| 회원/기업 | members, company | member_id, company_id | member_status, company_status | - |
| 권한 | member_permissions | member_permission_id | is_account_active | - |
| 테넌트 | tenant, tenant_member | tenant_id, tenant_member_id | tenant_status, tenant_member_approval_status | tenant_member_commission_rate |
| 상품 | product, category | product_id, category_id | product_status | product_price, product_quantity |
| 주문 | order, shopping_cart | order_id, shopping_cart_id | order_status | order_total_amount, order_subtotal_amount, order_discount_amount |
| 결제 | payment, coupon | payment_id, coupon_id | payment_status, coupon_is_used | payment_amount, coupon_discount_value |
| 기타 | member_address, product_img | member_address_id, product_img_id | member_address_status | - |

---

### 1.2 자주 사용하는 변수 TOP 30

#### 식별자 (ID)
```
member_id           - 회원 고유 ID
company_id          - 기업 고유 ID
tenant_id           - 판매사(공방) ID
tenant_member_id    - 판매사 구성원 ID
product_id          - 상품 ID
category_id         - 카테고리 ID
order_id            - 주문 ID
payment_id          - 결제 ID
```

#### 상태 변수
```
member_status              - active/suspended/inactive
product_status             - active/sold_out/inactive
order_status               - pending/preparing/shipped/delivered/cancelled
payment_status             - pending/completed/failed/cancelled/refunded
tenant_status              - pending/approved/rejected/suspended
```

#### 금액 변수
```
product_price              - 상품 가격
order_total_amount         - 주문 총액
order_discount_amount      - 할인 금액
order_subtotal_amount      - 최종 결제액
payment_amount             - 실제 결제 금액
```

#### 날짜/시간
```
*_created_at              - 생성 일시 (모든 테이블 공통)
*_updated_at              - 수정 일시 (모든 테이블 공통)
member_last_login_at      - 마지막 로그인
order_created_at          - 주문 일시
payment_approved_at       - 결제 승인 일시
```

---

### 1.3 필수 시스템 변수 (모든 테이블)

모든 테이블에 공통적으로 포함되는 변수:

```sql
-- 모든 테이블에 공통적으로 포함되는 변수
[테이블명]_id           BIGINT           PK, AUTO_INCREMENT
[테이블명]_created_at   TIMESTAMP        NOT NULL, DEFAULT NOW()
[테이블명]_updated_at   TIMESTAMP        NOT NULL, DEFAULT NOW()
```

#### 예시

```sql
-- members 테이블
member_id           BIGINT      PRIMARY KEY AUTO_INCREMENT
member_created_at   TIMESTAMP   NOT NULL DEFAULT NOW()
member_updated_at   TIMESTAMP   NOT NULL DEFAULT NOW()

-- product 테이블
product_id          BIGINT      PRIMARY KEY AUTO_INCREMENT
product_created_at  TIMESTAMP   NOT NULL DEFAULT NOW()
product_updated_at  TIMESTAMP   NOT NULL DEFAULT NOW()

-- order 테이블
order_id            BIGINT      PRIMARY KEY AUTO_INCREMENT
order_created_at    TIMESTAMP   NOT NULL DEFAULT NOW()
order_updated_at    TIMESTAMP   NOT NULL DEFAULT NOW()
```

---

## 📊 도메인별 상세 변수 목록

### 회원 도메인

#### members (회원)
```
member_id                  - BIGINT PK
member_email               - VARCHAR(100) UNIQUE
member_name                - VARCHAR(30)
member_nickname            - VARCHAR(30)
member_phone               - VARCHAR(15)
member_password            - VARCHAR(255)
member_status              - VARCHAR(20)
member_account_type        - VARCHAR(20)
member_account_role        - VARCHAR(20)
member_last_login_at       - TIMESTAMP
member_marketing_email     - BOOLEAN
member_created_at          - TIMESTAMP
member_updated_at          - TIMESTAMP
company_id                 - BIGINT FK (nullable)
```

#### company (기업)
```
company_id                 - BIGINT PK
company_name               - VARCHAR(100)
company_email              - VARCHAR(100)
company_phone              - VARCHAR(15)
company_address            - VARCHAR(200)
company_address_detail     - VARCHAR(100)
company_zipcode            - VARCHAR(10)
company_status             - VARCHAR(20)
company_created_at         - TIMESTAMP
company_updated_at         - TIMESTAMP
```

#### member_permissions (권한)
```
member_permission_id       - BIGINT PK
member_id                  - BIGINT FK UNIQUE
can_purchase               - BOOLEAN
can_sell                   - BOOLEAN
can_review                 - BOOLEAN
is_account_active          - BOOLEAN
member_permission_created_at - TIMESTAMP
member_permission_updated_at - TIMESTAMP
```

---

### 판매사 도메인

#### tenant (판매사)
```
tenant_id                  - BIGINT PK
tenant_name                - VARCHAR(100)
tenant_status              - VARCHAR(20)
tenant_created_at          - TIMESTAMP
tenant_updated_at          - TIMESTAMP
```

#### tenant_member (판매사 구성원)
```
tenant_member_id           - BIGINT PK
tenant_id                  - BIGINT FK
member_id                  - BIGINT FK
tenant_member_role         - VARCHAR(20)
tenant_member_approval_status - VARCHAR(20)
tenant_member_commission_rate - DECIMAL(5,4)
tenant_member_applied_at   - TIMESTAMP
tenant_member_approved_at  - TIMESTAMP (nullable)
tenant_member_created_at   - TIMESTAMP
tenant_member_updated_at   - TIMESTAMP
```

---

### 상품 도메인

#### product (상품)
```
product_id                 - BIGINT PK
product_name               - VARCHAR(100)
product_price              - DECIMAL(10,2)
product_quantity           - INTEGER
product_description        - TEXT
product_status             - VARCHAR(20)
product_view_count         - INTEGER
product_created_at         - TIMESTAMP
product_updated_at         - TIMESTAMP
tenant_member_id           - BIGINT FK
category_id                - BIGINT FK
```

#### category (카테고리)
```
category_id                - BIGINT PK
category_name              - VARCHAR(50)
category_depth             - INTEGER
category_parent_id         - BIGINT FK (nullable, 자기참조)
category_created_at        - TIMESTAMP
category_updated_at        - TIMESTAMP
```

#### product_img (상품 이미지)
```
product_img_id             - BIGINT PK
product_img_url            - VARCHAR(500)
product_img_sequence       - INTEGER
product_img_created_at     - TIMESTAMP
product_img_updated_at     - TIMESTAMP
product_id                 - BIGINT FK
```

---

### 주문 도메인

#### shopping_cart (장바구니)
```
shopping_cart_id           - BIGINT PK
shopping_cart_quantity     - INTEGER
shopping_cart_created_at   - TIMESTAMP
shopping_cart_updated_at   - TIMESTAMP
member_id                  - BIGINT FK
product_id                 - BIGINT FK
```

#### order (주문)
```
order_id                   - BIGINT PK
order_number               - VARCHAR(50) UNIQUE
order_status               - VARCHAR(20)
order_total_amount         - DECIMAL(15,2)
order_discount_amount      - DECIMAL(15,2)
order_subtotal_amount      - DECIMAL(15,2)
order_recipient_name       - VARCHAR(30)
order_recipient_phone      - VARCHAR(15)
order_recipient_zipcode    - VARCHAR(10)
order_recipient_address    - VARCHAR(200)
order_recipient_address_detail - VARCHAR(100)
order_created_at           - TIMESTAMP
order_updated_at           - TIMESTAMP
member_id                  - BIGINT FK
shopping_cart_id           - BIGINT FK (nullable)
coupon_id                  - BIGINT FK (nullable)
```

---

### 결제 도메인

#### payment (결제)
```
payment_id                 - BIGINT PK
payment_method             - VARCHAR(20)
payment_status             - VARCHAR(20)
payment_amount             - DECIMAL(15,2)
payment_approved_at        - TIMESTAMP (nullable)
payment_created_at         - TIMESTAMP
payment_updated_at         - TIMESTAMP
order_id                   - BIGINT FK UNIQUE
```

#### coupon (쿠폰)
```
coupon_id                  - BIGINT PK
coupon_code                - VARCHAR(20) UNIQUE
coupon_discount_type       - VARCHAR(20)
coupon_discount_value      - DECIMAL(10,2)
coupon_is_used             - BOOLEAN
coupon_created_at          - TIMESTAMP
coupon_updated_at          - TIMESTAMP
member_id                  - BIGINT FK
```

---

## 🔍 빠른 검색 가이드

### 변수명으로 검색
1. **Ctrl+F** (또는 Cmd+F) 사용
2. 검색할 변수명 입력 (예: `member_status`, `product_price`)
3. 해당 변수가 속한 도메인 및 테이블 확인

### 용도별 검색 키워드

| 찾고 싶은 것 | 검색 키워드 |
|-------------|-----------|
| ID 변수 | `_id` |
| 상태 변수 | `_status` |
| 금액 변수 | `_amount` 또는 `_price` |
| 날짜/시간 | `_at` 또는 `_date` |
| 불린 변수 | `is_` 또는 `can_` |
| 개수 변수 | `_count` 또는 `_quantity` |

---

## 다음 단계

- **네이밍 규칙 확인**: [02. 네이밍 규칙 & 데이터 타입](./db_02_NAMING_DATATYPES.md)
- **FK 관계 확인**: [03. 변수 관계도 & FK](./db_03_RELATIONSHIPS.md)

---

> [← 목차로 돌아가기](./db_00_INDEX.md)
