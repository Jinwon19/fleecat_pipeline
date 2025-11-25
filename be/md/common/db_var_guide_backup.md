데이터베이스 변수 관리 가이드
ﬂeecat 멀티테넌트 쇼핑몰 플랫폼
작성일: 2025년 9월 29일 | 대상: 초급 데이터 분석가
📌 1. 변수 빠른 참조 (Quick Reference)
1.1 도메인별 주요 변수 요약
도
메
인핵심 테이블 주요 식별자 핵심 상태 변수 핵심 금액 변수
회
원/
기
업members, companymember_id,
company_idmember_status, company_status-
권
한member_permissionsmember_permission_idis_account_active -
테
넌
트tenant,
tenant_membertenant_id,
tenant_member_idtenant_status,
tenant_member_approval_statustenant_member
상
품product, categoryproduct_id,
category_idproduct_status product_price, p
주
문order, shopping_cartorder_id,
shopping_cart_idorder_statusorder_total_amo
order_subtotal_a
결
제payment, coupon payment_id, coupon_idpayment_status,
coupon_is_usedpayment_amoun
coupon_discoun
기
타member_address,
product_imgmember_address_id,
product_img_idmember_address_status -
1.2 자주 사용하는 변수 TOP 30
식별자 (ID)

상태 변수
금액 변수
날짜/시간
1.3 필수 시스템 변수 (모든 테이블)member_id           - 회원 고유 ID
company_id          - 기업 고유 ID
tenant_id           - 판매사(공방) ID
tenant_member_id    - 판매사 구성원 ID
product_id          - 상품 ID
category_id         - 카테고리 ID
order_id            - 주문 ID
payment_id          - 결제 ID
member_status              - active/suspended/inactive
product_status             - active/sold_out/inactive
order_status               - pending/preparing/shipped/delivered/cancelled
payment_status             - pending/completed/failed/cancelled/refunded
tenant_status              - pending/approved/rejected/suspended
product_price              - 상품 가격
order_total_amount         - 주문 총액
order_discount_amount      - 할인 금액
order_subtotal_amount      - 최종 결제액
payment_amount             - 실제 결제 금액
*_created_at              - 생성 일시 (모든 테이블 공통)
*_updated_at              - 수정 일시 (모든 테이블 공통)
member_last_login_at      - 마지막 로그인
order_created_at          - 주문 일시
payment_approved_at       - 결제 승인 일시
sql
-- 모든 테이블에 공통적으로 포함되는 변수
[테이블명]_id           BIGINT           PK,AUTO_INCREMENT
[테이블명]_created_at   TIMESTAMPNOTNULL,DEFAULTNOW()
[테이블명]_updated_at   TIMESTAMPNOTNULL,DEFAULTNOW()

🎯 2. 변수 네이밍 규칙 (Naming Conventions)
2.1 기본 명명 규칙
테이블명
형식: 소문자, 단수형
예시: member, product, order, payment
복합어: 언더스코어 사용 (shopping_cart, product_img)
컬럼명
형식: 테이블명_컬럼명 (소문자, 언더스코어)
예시: member_id, product_name, order_status
Primary Key
형식: 테이블명_id
타입: BIGINT (AUTO_INCREMENT)
예시: member_id, product_id, order_id
Foreign Key
형식: 참조테이블명_id
예시: member_id, company_id, category_id
2.2 접두사/접미사 사전
접미사 의미 예시 데이터 타입
_id 식별자 member_id, product_id BIGINT
_name이름 member_name, product_name VARCHAR(30-100)
_email이메일 member_email, company_email VARCHAR(100)
_phone 연락처 member_phone, company_phone VARCHAR(15)
_address 주소 company_address, member_address_address1 VARCHAR(200)
_status 상태 member_status, order_status VARCHAR(20)
_type 유형 member_account_type, transaction_type VARCHAR(20)
_role 역할 member_account_role, tenant_member_role VARCHAR(20)
_count 개수 product_view_count INTEGER
_amount금액 order_total_amount, payment_amount DECIMAL(15,2)
_rate 비율 tenant_member_commission_rate DECIMAL(5,4)
_quantity수량 product_quantity, shopping_cart_quantity INTEGER

접미사 의미 예시 데이터 타입
_is_* 불린 coupon_is_used, is_account_active BOOLEAN
_at일시 member_created_at, payment_approved_at TIMESTAMP
_date 날짜 transaction_date DATE
2.3 상태값 표준 (Status Values)
member_status (회원 상태)
product_status (상품 상태)
order_status (주문 상태)
payment_status (결제 상태)
tenant_status (판매사 상태)active       - 정상 활동
suspended    - 정지 (관리자 제재)
inactive     - 휴면 (장기 미접속)
active       - 판매중
sold_out     - 품절
inactive     - 판매중지 (미승인/판매자중지)
pending      - 결제 대기
preparing    - 상품 준비중
shipped      - 배송중
delivered    - 배송 완료
cancelled    - 주문 취소
refunded     - 환불 완료
pending      - 결제 대기
completed    - 결제 완료
failed       - 결제 실패
cancelled    - 결제 취소
refunded     - 환불 완료

2.4 특수 변수 패턴
주소 관련 (3단 구조)
승인 관련 (3단 구조)
금액 관련 (3단 구조)
📊 3. 데이터 타입 가이드 (Data Type Guide)
3.1 식별자 타입
용도 타입 크기제약조건 비고
일반 Primary Key BIGINT 8 bytes PK, AUTO_INCREMENT 순차 증가 (1, 2, 3...)
Foreign Key BIGINT 8 bytes FK 참조 무결성
사용 예시:pending      - 승인 대기
approved     - 승인 완료
rejected     - 승인 거절
suspended    - 정지
*_zipcode        - 우편번호 (VARCHAR 10)
*_address        - 기본 주소 (VARCHAR 200)
*_address_detail - 상세 주소 (VARCHAR 100)
*_status         - 승인 상태
*_applied_at     - 신청 일시
*_approved_at    - 승인 일시
*_total_amount     - 총 금액
*_discount_amount  - 할인 금액
*_subtotal_amount  - 최종 금액
sql
member_id           BIGINT    PK,AUTO_INCREMENT
company_id          BIGINT    FK (nullable)
product_id          BIGINT    PK,AUTO_INCREMENT

3.2 문자열 타입
용도 타입 권장 크기 예시
이메일 VARCHAR 100 member_email
이름/닉네임 VARCHAR 30 member_name, member_nickname
휴대폰 VARCHAR 15 member_phone
주소 VARCHAR 200 company_address
상세주소 VARCHAR 100 company_address_detail
제목 VARCHAR 100 transaction_title
상태값 VARCHAR 20 member_status, order_status
설명 TEXT - product_description
우편번호 VARCHAR 10 company_zipcode
쿠폰코드 VARCHAR 20 coupon_code
주문번호 VARCHAR 50 order_number
URL VARCHAR 500 product_img_url
선택 기준:
30자 이하: 이름, 닉네임, 짧은 텍스트
50-100자: 제목, 이메일, 설명
200자: 주소
TEXT: 긴 설명, 제한 없는 텍스트
3.3 숫자 타입
용도 타입 크기/정밀도범위 비고
정수 (카운트) INTEGER - -2,147,483,648 ~ 2,147,483,647 조회수, 개수
큰 정수 (ID) BIGINT - 매우 큰 범위 Primary Key, FK
금액 DECIMAL 15,2 최대 999,999,999,999.99 주문금액, 결제금액
상품 가격 DECIMAL 10,2 최대 99,999,999.99 product_price
수수료율 DECIMAL 5,4 0.0000 ~ 9.9999 (0~999.99%) commission_rate
백분율 DECIMAL 5,2 0.00 ~ 999.99 일반 퍼센트
사용 예시:
sql

3.4 날짜/시간 타입
용도 타입 제약조건 비고
생성일시 TIMESTAMP NOT NULL, DEFAULT NOW()자동 생성
수정일시 TIMESTAMP NOT NULL, DEFAULT NOW() 트리거로 자동 업데이트
이벤트 일시 TIMESTAMP NULL 발생하지 않으면 NULL
날짜만 DATE - 생년월일, 거래일
사용 예시:
3.5 기타 타입
용도 타입 기본값 비고
플래그 BOOLEAN FALSE TRUE/FALSE
JSON 데이터 JSON NULL 복잡한 구조 데이터
사용 예시:
3.6 데이터 타입 선택 플로우차트product_view_count              INTEGER DEFAULT0
product_price                   DECIMAL(10,2)NOTNULL
order_total_amount              DECIMAL(15,2)NOTNULL
tenant_member_commission_rate   DECIMAL(5,4)DEFAULT0.0500
coupon_discount_value           DECIMAL(10,2)NOTNULL
sql
member_created_at          TIMESTAMPNOTNULLDEFAULTNOW()
member_updated_at          TIMESTAMPNOTNULLDEFAULTNOW()
member_last_login_at       TIMESTAMPNULL
payment_approved_at        TIMESTAMPNULL
transaction_date           DATENOTNULL
sql
can_purchase              BOOLEANDEFAULTTRUE
coupon_is_used            BOOLEANDEFAULTFALSE
is_account_active         BOOLEANDEFAULTTRUE
member_marketing_email    BOOLEANDEFAULTFALSE
질문: 저장할 데이터가 무엇인가요?

🔗 4. 변수 관계도 (Relationship Map)
4.1 핵심 FK 관계 매핑
회원 → 기업
회원 → 권한
판매사 → 구성원├─ ID/식별자인가?
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
members.company_id → company.company_id (N:1)
- 여러 회원이 한 기업에 소속 가능
- NULL 허용 (개인회원)
member_permissions.member_id → members.member_id (1:1)
- 한 회원당 하나의 권한 레코드
- UNIQUE 제약

판매사 → 상세정보
상품 → 판매자/카테고리
상품 → 이미지
장바구니
주문 → 회원/장바구니/쿠폰
결제 → 주문tenant_member.tenant_id → tenant.tenant_id (N:1)
tenant_member.member_id → members.member_id (N:1)
- 한 판매사에 여러 구성원
- 한 회원이 여러 판매사에 소속 가능
tenant_detail.tenant_id → tenant.tenant_id (1:1)
- 한 판매사당 하나의 상세정보
- UNIQUE 제약
product.tenant_member_id → tenant_member.tenant_member_id (N:1)
product.category_id → category.category_id (N:1)
- 여러 상품이 한 판매자에 속함
- 여러 상품이 한 카테고리에 속함
product_img.product_id → product.product_id (N:1)
- 한 상품에 여러 이미지 (최대 5개)
- CASCADE 삭제
shopping_cart.member_id → members.member_id (N:1)
shopping_cart.product_id → product.product_id (N:1)
- UNIQUE(member_id, product_id) - 중복 방지
order.member_id → members.member_id (N:1)
order.shopping_cart_id → shopping_cart.shopping_cart_id (N:1, nullable)
order.coupon_id → coupon.coupon_id (N:1, nullable)
payment.order_id → order.order_id (1:1)
- 한 주문에 하나의 결제
- UNIQUE 제약

회원 → 배송지
회원 → 거래내역
4.2 도메인 간 연결 구조member_address.member_id → members.member_id (N:1)
- 한 회원이 여러 배송지 보유
- CASCADE 삭제
member_transactions.member_id → members.member_id (N:1)
member_transactions.related_order_id → order.order_id (N:1, nullable)
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
product (상품) ←── t enant_member
↓ (1:N)
product_img
📦 주문 도메인
shopping_cart ──→ m embers
↓          product
↓
order ──→ m embers

4.3 CASCADE 삭제 정책
부모 테이블 자식 테이블 삭제 정책
members member_address CASCADE
members member_permissions CASCADE
members member_transactions CASCADE
members shopping_cart CASCADE
tenant tenant_detail CASCADE
tenant tenant_member CASCADE
product product_img CASCADE
product shopping_cart CASCADE
category category (자기참조) CASCADE
주의사항:
order는 RESTRICT (주문 이력 보존)
payment는 RESTRICT (결제 이력 보존)
4.4 NULL 허용 FK
테이블 FK 컬럼 NULL 허용 이유
members company_id 개인회원은 기업 없음
order shopping_cart_id 직접 구매 시 장바구니 거치지 않음
order coupon_id 쿠폰 미사용 주문 가능
member_transactions related_order_id이벤트 적립금은 주문 없이 발생
📝 사용 팁
빠른 검색 방법
1. 변수명으로 검색: Ctrl+F로 변수명 검색
2. 도메인으로 검색: "회원", "상품", "주문" 등 키워드로 섹션 찾기↓       coupon
↓ (1:1)
payment
📦 거래 도메인
coupon ──→ m embers
member_transactions ──→ m embers, order

3. 타입으로 검색: "DECIMAL", "VARCHAR" 등으로 유사 변수 찾기
실무 활용
1. 신규 테이블 설계 시: 섹션 2 (네이밍 규칙) 참고
2. 데이터 타입 고민 시: 섹션 3 (데이터 타입 가이드) 플로우차트 활용
3. 조인 쿼리 작성 시: 섹션 4 (변수 관계도) 참고
4. 빠른 확인 필요 시: 섹션 1 (빠른 참조) 테이블 활용
문서 버전: 1.0
최종 수정: 2025년 9월 29일
작성자: AI 데이터 분석팀 (민수, 가영, 하윤, 민지)

