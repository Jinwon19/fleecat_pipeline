# 데이터베이스 네이밍 규칙 & 데이터 타입

> [← 목차로 돌아가기](./db_00_INDEX.md)

**fleecat 멀티테넌트 쇼핑몰 플랫폼**

---

## 🎯 2. 변수 네이밍 규칙 (Naming Conventions)

### 2.1 기본 명명 규칙

#### 테이블명
- **형식**: 소문자, 단수형
- **예시**: `member`, `product`, `order`, `payment`
- **복합어**: 언더스코어 사용 (`shopping_cart`, `product_img`)

#### 컬럼명
- **형식**: `테이블명_컬럼명` (소문자, 언더스코어)
- **예시**: `member_id`, `product_name`, `order_status`

#### Primary Key
- **형식**: `테이블명_id`
- **타입**: `BIGINT` (AUTO_INCREMENT)
- **예시**: `member_id`, `product_id`, `order_id`

#### Foreign Key
- **형식**: `참조테이블명_id`
- **예시**: `member_id`, `company_id`, `category_id`

---

### 2.2 접두사/접미사 사전

| 접미사 | 의미 | 예시 | 데이터 타입 |
|--------|------|------|------------|
| `_id` | 식별자 | member_id, product_id | BIGINT |
| `_name` | 이름 | member_name, product_name | VARCHAR(30-100) |
| `_email` | 이메일 | member_email, company_email | VARCHAR(100) |
| `_phone` | 연락처 | member_phone, company_phone | VARCHAR(15) |
| `_address` | 주소 | company_address, member_address_address1 | VARCHAR(200) |
| `_status` | 상태 | member_status, order_status | VARCHAR(20) |
| `_type` | 유형 | member_account_type, transaction_type | VARCHAR(20) |
| `_role` | 역할 | member_account_role, tenant_member_role | VARCHAR(20) |
| `_count` | 개수 | product_view_count | INTEGER |
| `_amount` | 금액 | order_total_amount, payment_amount | DECIMAL(15,2) |
| `_rate` | 비율 | tenant_member_commission_rate | DECIMAL(5,4) |
| `_quantity` | 수량 | product_quantity, shopping_cart_quantity | INTEGER |
| `_is_*` | 불린 | coupon_is_used, is_account_active | BOOLEAN |
| `_at` | 일시 | member_created_at, payment_approved_at | TIMESTAMP |
| `_date` | 날짜 | transaction_date | DATE |

---

### 2.3 상태값 표준 (Status Values)

#### member_status (회원 상태)
```
active       - 정상 활동
suspended    - 정지 (관리자 제재)
inactive     - 휴면 (장기 미접속)
```

**사용 예시**:
```sql
SELECT * FROM members WHERE member_status = 'active';
```

---

#### product_status (상품 상태)
```
active       - 판매중
sold_out     - 품절
inactive     - 판매중지 (미승인/판매자중지)
```

**사용 예시**:
```sql
UPDATE product
SET product_status = 'sold_out'
WHERE product_quantity = 0;
```

---

#### order_status (주문 상태)
```
pending      - 결제 대기
preparing    - 상품 준비중
shipped      - 배송중
delivered    - 배송 완료
cancelled    - 주문 취소
refunded     - 환불 완료
```

**주문 상태 흐름**:
```
pending → preparing → shipped → delivered
   ↓
cancelled → refunded
```

---

#### payment_status (결제 상태)
```
pending      - 결제 대기
completed    - 결제 완료
failed       - 결제 실패
cancelled    - 결제 취소
refunded     - 환불 완료
```

**결제 상태 흐름**:
```
pending → completed
   ↓         ↓
failed    cancelled → refunded
```

---

#### tenant_status (판매사 상태)
```
pending      - 승인 대기
approved     - 승인 완료
rejected     - 승인 거절
suspended    - 정지
```

**사용 예시**:
```sql
SELECT tenant_name, tenant_status
FROM tenant
WHERE tenant_status IN ('approved', 'pending');
```

---

### 2.4 특수 변수 패턴

#### 주소 관련 (3단 구조)
```
*_zipcode        - 우편번호 (VARCHAR 10)
*_address        - 기본 주소 (VARCHAR 200)
*_address_detail - 상세 주소 (VARCHAR 100)
```

**예시**:
```sql
-- member_address 테이블
member_address_zipcode           VARCHAR(10)
member_address_address1          VARCHAR(200)
member_address_address_detail    VARCHAR(100)

-- order 테이블
order_recipient_zipcode          VARCHAR(10)
order_recipient_address          VARCHAR(200)
order_recipient_address_detail   VARCHAR(100)
```

---

#### 승인 관련 (3단 구조)
```
*_status         - 승인 상태
*_applied_at     - 신청 일시
*_approved_at    - 승인 일시
```

**예시**:
```sql
-- tenant_member 테이블
tenant_member_approval_status    VARCHAR(20)
tenant_member_applied_at         TIMESTAMP
tenant_member_approved_at        TIMESTAMP
```

---

#### 금액 관련 (3단 구조)
```
*_total_amount     - 총 금액
*_discount_amount  - 할인 금액
*_subtotal_amount  - 최종 금액
```

**계산 공식**:
```
subtotal_amount = total_amount - discount_amount
```

**예시**:
```sql
-- order 테이블
order_total_amount       DECIMAL(15,2)   -- 10,000원
order_discount_amount    DECIMAL(15,2)   --  1,000원
order_subtotal_amount    DECIMAL(15,2)   --  9,000원
```

---

## 📊 3. 데이터 타입 가이드 (Data Type Guide)

### 3.1 식별자 타입

| 용도 | 타입 | 크기 | 제약조건 | 비고 |
|------|------|------|---------|------|
| 일반 Primary Key | BIGINT | 8 bytes | PK, AUTO_INCREMENT | 순차 증가 (1, 2, 3...) |
| Foreign Key | BIGINT | 8 bytes | FK | 참조 무결성 |

**사용 예시**:
```sql
member_id           BIGINT    PK, AUTO_INCREMENT
company_id          BIGINT    FK (nullable)
product_id          BIGINT    PK, AUTO_INCREMENT
```

---

### 3.2 문자열 타입

| 용도 | 타입 | 권장 크기 | 예시 |
|------|------|----------|------|
| 이메일 | VARCHAR | 100 | member_email |
| 이름/닉네임 | VARCHAR | 30 | member_name, member_nickname |
| 휴대폰 | VARCHAR | 15 | member_phone |
| 주소 | VARCHAR | 200 | company_address |
| 상세주소 | VARCHAR | 100 | company_address_detail |
| 제목 | VARCHAR | 100 | transaction_title |
| 상태값 | VARCHAR | 20 | member_status, order_status |
| 설명 | TEXT | - | product_description |
| 우편번호 | VARCHAR | 10 | company_zipcode |
| 쿠폰코드 | VARCHAR | 20 | coupon_code |
| 주문번호 | VARCHAR | 50 | order_number |
| URL | VARCHAR | 500 | product_img_url |

**선택 기준**:
- **30자 이하**: 이름, 닉네임, 짧은 텍스트
- **50-100자**: 제목, 이메일, 설명
- **200자**: 주소
- **TEXT**: 긴 설명, 제한 없는 텍스트

---

### 3.3 숫자 타입

| 용도 | 타입 | 크기/정밀도 | 범위 | 비고 |
|------|------|-----------|------|------|
| 정수 (카운트) | INTEGER | - | -2,147,483,648 ~ 2,147,483,647 | 조회수, 개수 |
| 큰 정수 (ID) | BIGINT | - | 매우 큰 범위 | Primary Key, FK |
| 금액 | DECIMAL | 15,2 | 최대 999,999,999,999.99 | 주문금액, 결제금액 |
| 상품 가격 | DECIMAL | 10,2 | 최대 99,999,999.99 | product_price |
| 수수료율 | DECIMAL | 5,4 | 0.0000 ~ 9.9999 (0~999.99%) | commission_rate |
| 백분율 | DECIMAL | 5,2 | 0.00 ~ 999.99 | 일반 퍼센트 |

**사용 예시**:
```sql
product_view_count              INTEGER DEFAULT 0
product_price                   DECIMAL(10,2) NOT NULL
order_total_amount              DECIMAL(15,2) NOT NULL
tenant_member_commission_rate   DECIMAL(5,4) DEFAULT 0.0500
coupon_discount_value           DECIMAL(10,2) NOT NULL
```

**DECIMAL 정밀도 선택 가이드**:
- `DECIMAL(10,2)`: 상품 가격, 쿠폰 할인 (최대 천만 원)
- `DECIMAL(15,2)`: 주문 금액, 결제 금액 (최대 천억 원)
- `DECIMAL(5,4)`: 수수료율 (0.0001 ~ 9.9999, 0.01% ~ 999.99%)

---

### 3.4 날짜/시간 타입

| 용도 | 타입 | 제약조건 | 비고 |
|------|------|---------|------|
| 생성일시 | TIMESTAMP | NOT NULL, DEFAULT NOW() | 자동 생성 |
| 수정일시 | TIMESTAMP | NOT NULL, DEFAULT NOW() | 트리거로 자동 업데이트 |
| 이벤트 일시 | TIMESTAMP | NULL | 발생하지 않으면 NULL |
| 날짜만 | DATE | - | 생년월일, 거래일 |

**사용 예시**:
```sql
member_created_at          TIMESTAMP NOT NULL DEFAULT NOW()
member_updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
member_last_login_at       TIMESTAMP NULL
payment_approved_at        TIMESTAMP NULL
transaction_date           DATE NOT NULL
```

---

### 3.5 기타 타입

| 용도 | 타입 | 기본값 | 비고 |
|------|------|--------|------|
| 플래그 | BOOLEAN | FALSE | TRUE/FALSE |
| JSON 데이터 | JSON | NULL | 복잡한 구조 데이터 |

**사용 예시**:
```sql
can_purchase              BOOLEAN DEFAULT TRUE
coupon_is_used            BOOLEAN DEFAULT FALSE
is_account_active         BOOLEAN DEFAULT TRUE
member_marketing_email    BOOLEAN DEFAULT FALSE
```

---

### 3.6 데이터 타입 선택 플로우차트

```
질문: 저장할 데이터가 무엇인가요?

├─ ID/식별자인가?
│  └─ YES → BIGINT (PK: AUTO_INCREMENT, FK: 참조)
│
├─ 숫자인가?
│  ├─ 정수 (카운트, 개수)? → INTEGER
│  ├─ 금액? → DECIMAL(15,2) 또는 DECIMAL(10,2)
│  ├─ 비율/퍼센트? → DECIMAL(5,4) 또는 DECIMAL(5,2)
│  └─ 매우 큰 정수? → BIGINT
│
├─ 문자인가?
│  ├─ 30자 이하? → VARCHAR(15~30)
│  ├─ 100자 이하? → VARCHAR(50~100)
│  ├─ 200자 이하? → VARCHAR(200)
│  ├─ 500자 이하? → VARCHAR(500)
│  └─ 길이 제한 없음? → TEXT
│
├─ 날짜/시간인가?
│  ├─ 생성/수정 일시? → TIMESTAMP (DEFAULT NOW())
│  ├─ 이벤트 일시? → TIMESTAMP (NULL 허용)
│  └─ 날짜만? → DATE
│
└─ 참/거짓인가?
   └─ BOOLEAN (DEFAULT TRUE/FALSE)
```

---

## 💡 실무 활용 예시

### 새로운 테이블 설계 시

**예시: review (리뷰) 테이블 설계**

1. **테이블명**: `review` (소문자, 단수형)

2. **컬럼 설계**:
```sql
CREATE TABLE review (
  -- Primary Key
  review_id              BIGINT          PRIMARY KEY AUTO_INCREMENT,

  -- Foreign Keys
  member_id              BIGINT          NOT NULL,
  product_id             BIGINT          NOT NULL,
  order_id               BIGINT          NOT NULL,

  -- 컨텐츠
  review_title           VARCHAR(100)    NOT NULL,
  review_content         TEXT            NOT NULL,
  review_rating          DECIMAL(2,1)    NOT NULL,  -- 0.0 ~ 5.0

  -- 상태
  review_status          VARCHAR(20)     NOT NULL DEFAULT 'active',

  -- 카운트
  review_like_count      INTEGER         NOT NULL DEFAULT 0,

  -- 타임스탬프
  review_created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
  review_updated_at      TIMESTAMP       NOT NULL DEFAULT NOW(),

  -- Foreign Key 제약
  FOREIGN KEY (member_id) REFERENCES members(member_id),
  FOREIGN KEY (product_id) REFERENCES product(product_id),
  FOREIGN KEY (order_id) REFERENCES order(order_id)
);
```

3. **네이밍 규칙 적용 확인**:
- ✅ 테이블명: `review` (소문자, 단수형)
- ✅ PK: `review_id` (테이블명_id)
- ✅ FK: `member_id`, `product_id`, `order_id`
- ✅ 상태: `review_status`
- ✅ 카운트: `review_like_count`
- ✅ 타임스탬프: `review_created_at`, `review_updated_at`

---

## 다음 단계

- **변수 빠른 참조**: [01. 변수 빠른 참조](./db_01_VARIABLE_REFERENCE.md)
- **FK 관계 확인**: [03. 변수 관계도 & FK](./db_03_RELATIONSHIPS.md)

---

> [← 목차로 돌아가기](./db_00_INDEX.md)
