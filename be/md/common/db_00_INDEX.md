# 데이터베이스 변수 관리 가이드 - 색인

**fleecat 멀티테넌트 쇼핑몰 플랫폼**
작성일: 2025년 9월 29일 | 대상: 초급 데이터 분석가 및 백엔드 개발자

---

## 📚 문서 구성

이 가이드는 fleecat 프로젝트의 데이터베이스 변수 관리를 위한 표준 문서입니다.

### [01. 변수 빠른 참조](./db_01_VARIABLE_REFERENCE.md)
- 도메인별 주요 변수 요약
- 자주 사용하는 변수 TOP 30
- 필수 시스템 변수 (모든 테이블 공통)

**읽어야 할 때**: 개발 중 변수명을 빠르게 확인하고 싶을 때, 치트시트로 활용

---

### [02. 네이밍 규칙 & 데이터 타입](./db_02_NAMING_DATATYPES.md)
- 변수 네이밍 규칙 (테이블명, 컬럼명, FK, PK)
- 접두사/접미사 사전
- 상태값 표준 (status values)
- 데이터 타입 가이드 (BIGINT, VARCHAR, DECIMAL 등)
- 데이터 타입 선택 플로우차트

**읽어야 할 때**: 새로운 테이블이나 컬럼을 설계할 때, 네이밍 표준을 확인하고 싶을 때

---

### [03. 변수 관계도 & FK](./db_03_RELATIONSHIPS.md)
- 핵심 FK 관계 매핑
- 도메인 간 연결 구조
- CASCADE 삭제 정책
- NULL 허용 FK 목록

**읽어야 할 때**: JOIN 쿼리를 작성할 때, 테이블 간 관계를 파악하고 싶을 때

---

## 🎯 사용 시나리오별 가이드

### 시나리오 1: 변수명이 기억나지 않을 때
→ [01. 변수 빠른 참조](./db_01_VARIABLE_REFERENCE.md)의 "도메인별 주요 변수" 테이블 확인

### 시나리오 2: 새로운 테이블을 설계할 때
1. [02. 네이밍 규칙 & 데이터 타입](./db_02_NAMING_DATATYPES.md)에서 네이밍 규칙 확인
2. [02. 네이밍 규칙 & 데이터 타입](./db_02_NAMING_DATATYPES.md)의 데이터 타입 플로우차트로 타입 선택
3. [03. 변수 관계도 & FK](./db_03_RELATIONSHIPS.md)에서 FK 관계 설정

### 시나리오 3: 복잡한 JOIN 쿼리를 작성할 때
→ [03. 변수 관계도 & FK](./db_03_RELATIONSHIPS.md)의 "도메인 간 연결 구조" 다이어그램 참고

### 시나리오 4: 상태값(status)을 확인하고 싶을 때
→ [02. 네이밍 규칙 & 데이터 타입](./db_02_NAMING_DATATYPES.md)의 "상태값 표준" 섹션 확인

### 시나리오 5: CASCADE 삭제 정책을 확인하고 싶을 때
→ [03. 변수 관계도 & FK](./db_03_RELATIONSHIPS.md)의 "CASCADE 삭제 정책" 테이블 확인

---

## 💡 빠른 검색 팁

### 1. 변수명으로 검색
- **Ctrl+F** (또는 Cmd+F)로 변수명 직접 검색
- 예: `member_id`, `product_status`, `order_total_amount`

### 2. 도메인으로 검색
- 키워드: "회원", "상품", "주문", "결제", "판매사" 등
- 해당 도메인의 모든 변수를 한 번에 확인

### 3. 타입으로 검색
- 키워드: "DECIMAL", "VARCHAR", "BIGINT", "TIMESTAMP" 등
- 같은 타입을 사용하는 변수들을 찾을 때 유용

### 4. 접미사로 검색
- 키워드: "_id", "_status", "_amount", "_at" 등
- 특정 용도의 변수를 찾을 때 유용

---

## 📋 주요 도메인 개요

### 회원 도메인
- **핵심 테이블**: `members`, `company`, `member_permissions`, `member_address`
- **주요 변수**: `member_id`, `company_id`, `member_status`, `member_email`

### 판매사 도메인
- **핵심 테이블**: `tenant`, `tenant_member`, `tenant_detail`
- **주요 변수**: `tenant_id`, `tenant_member_id`, `tenant_status`, `tenant_member_role`

### 상품 도메인
- **핵심 테이블**: `product`, `category`, `product_img`
- **주요 변수**: `product_id`, `category_id`, `product_status`, `product_price`

### 주문 도메인
- **핵심 테이블**: `order`, `shopping_cart`, `payment`
- **주요 변수**: `order_id`, `order_status`, `order_total_amount`, `payment_status`

### 결제/쿠폰 도메인
- **핵심 테이블**: `payment`, `coupon`, `member_transactions`
- **주요 변수**: `payment_id`, `coupon_id`, `payment_amount`, `coupon_discount_value`

---

## 🔄 문서 업데이트 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 1.1 | 2025.10.01 | 문서 분리 및 색인 파일 생성 | 백엔드팀 |
| 1.0 | 2025.09.29 | 최초 작성 | AI 데이터 분석팀 |

---

## 📞 문서 관련 문의

- 변수 추가/수정 제안: 백엔드팀에 문의
- 오타 및 오류 발견: GitHub Issue 등록
- 가이드 개선 제안: Pull Request 생성

---

**💡 Tip**: 자주 참조하는 문서는 브라우저 북마크에 추가하세요!
