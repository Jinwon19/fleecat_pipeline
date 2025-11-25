# Fleecat 백엔드 - 협업 가이드

> [← 목차로 돌아가기](./00_INDEX.md)

---

## 12. 버전 관리 및 협업

### 12.1 Git 브랜치 전략

```
main (프로덕션)
├── develop (개발)
│   ├── feature/product-management
│   ├── feature/order-system
│   ├── feature/payment-integration
│   └── feature/admin-dashboard
├── release/v1.0.0
└── hotfix/critical-bug-fix
```

### 12.2 브랜치 규칙

| 브랜치 타입 | 명명 규칙 | 설명 |
|------------|-----------|------|
| main | main | 프로덕션 배포 브랜치 |
| develop | develop | 개발 통합 브랜치 |
| feature | feature/[기능명] | 새 기능 개발 |
| bugfix | bugfix/[버그명] | 버그 수정 |
| hotfix | hotfix/[긴급수정] | 긴급 수정 |
| release | release/v[버전] | 릴리스 준비 |

#### 브랜치 생성 및 작업 흐름

```bash
# 1. develop 브랜치에서 최신 코드 받기
git checkout develop
git pull origin develop

# 2. feature 브랜치 생성
git checkout -b feature/product-cart

# 3. 작업 후 커밋
git add .
git commit -m "feat: 장바구니 담기 기능 추가"

# 4. 원격 브랜치에 푸시
git push origin feature/product-cart

# 5. Pull Request 생성
# GitHub/GitLab에서 PR 생성

# 6. 리뷰 및 승인 후 develop에 병합
# 병합 후 로컬 브랜치 정리
git checkout develop
git pull origin develop
git branch -d feature/product-cart
```

### 12.3 커밋 메시지 규칙

#### 커밋 타입

| 타입 | 설명 | 예시 |
|------|------|------|
| feat | 새로운 기능 | feat: 상품 필터링 기능 추가 |
| fix | 버그 수정 | fix: 주문 생성 시 재고 검증 오류 수정 |
| docs | 문서 수정 | docs: API 문서 업데이트 |
| style | 코드 포맷팅 | style: ESLint 규칙 적용 |
| refactor | 코드 리팩토링 | refactor: 상품 서비스 로직 개선 |
| test | 테스트 추가 | test: 주문 API 통합 테스트 추가 |
| chore | 빌드/설정 변경 | chore: 패키지 버전 업데이트 |
| perf | 성능 개선 | perf: 상품 조회 쿼리 최적화 |

#### 커밋 메시지 형식

```
[타입]: [간단한 설명]

[상세 설명 (선택)]

[이슈 번호 (선택)]
```

#### 예시

```bash
feat: 상품 장바구니 담기 기능 추가

- 장바구니 API 엔드포인트 구현
- 중복 상품 수량 증가 로직 추가
- 재고 부족 시 에러 처리

Closes #123
```

```bash
fix: 주문 생성 시 재고 차감 오류 수정

트랜잭션 내에서 재고 차감이 제대로 이루어지지 않는 문제 해결

Fixes #456
```

### 12.4 Pull Request 템플릿

```markdown
## 변경 사항
<!-- 이 PR에서 변경된 내용을 설명해주세요 -->

## 변경 이유
<!-- 왜 이 변경이 필요한지 설명해주세요 -->

## 테스트 방법
<!-- 이 변경사항을 어떻게 테스트할 수 있는지 설명해주세요 -->

## 체크리스트
- [ ] 코드가 컨벤션을 따릅니다
- [ ] 테스트를 추가/수정했습니다
- [ ] 문서를 업데이트했습니다
- [ ] 모든 테스트가 통과합니다
- [ ] 브레이킹 체인지가 없습니다

## 스크린샷 (선택)
<!-- API 응답이나 로그 등을 첨부해주세요 -->

## 관련 이슈
<!-- 관련된 이슈 번호를 적어주세요 -->
Closes #이슈번호
```

#### PR 제목 규칙

```
[타입] 간단한 설명
```

예시:
- `[feat] 상품 장바구니 담기 기능 추가`
- `[fix] 주문 생성 시 재고 검증 오류 수정`
- `[refactor] 상품 서비스 코드 리팩토링`

### 12.5 코드 리뷰 체크리스트

#### 기능성
- [ ] 요구사항을 충족하는가?
- [ ] 엣지 케이스를 처리하는가?
- [ ] 에러 처리가 적절한가?

#### 코드 품질
- [ ] 코딩 컨벤션을 따르는가?
- [ ] 함수/변수명이 명확한가?
- [ ] 중복 코드가 없는가?
- [ ] 주석이 적절한가?

#### 성능
- [ ] 불필요한 데이터베이스 쿼리가 없는가?
- [ ] N+1 쿼리 문제가 없는가?
- [ ] 메모리 누수 가능성이 없는가?

#### 보안
- [ ] 입력 검증이 충분한가?
- [ ] SQL Injection 위험이 없는가?
- [ ] 민감한 데이터가 노출되지 않는가?
- [ ] 인증/인가가 적절한가?

#### 테스트
- [ ] 단위 테스트가 있는가?
- [ ] 통합 테스트가 필요한가?
- [ ] 테스트 커버리지가 충분한가?

### 12.6 코드 리뷰 가이드라인

#### 리뷰어를 위한 가이드

**✅ DO (권장)**
- 건설적인 피드백 제공
- 코드의 좋은 점도 언급
- 질문 형식으로 의견 제시
- 명확한 예시 코드 제공
- 우선순위 표시 (필수/권장/선택)

**❌ DON'T (비권장)**
- 개인 공격이나 비난
- 모호한 피드백
- 스타일에만 집착
- 너무 많은 요구사항

#### 리뷰 코멘트 예시

```markdown
# ✅ 좋은 리뷰
**[필수]** 여기서 재고 검증이 누락된 것 같습니다.
다음과 같이 추가하면 어떨까요?

​```javascript
if (product.stock < quantity) {
  throw new Error('재고가 부족합니다');
}
​```

# ❌ 나쁜 리뷰
이 코드 이상해요.
```

#### 작성자를 위한 가이드

**✅ DO (권장)**
- PR은 작은 단위로 분리
- 명확한 설명 작성
- 리뷰 의견에 적극 응답
- 필요시 추가 설명 제공

**❌ DON'T (비권장)**
- 한 PR에 너무 많은 변경사항
- 테스트 없이 PR 생성
- 리뷰 의견 무시
- 방어적인 태도

### 12.7 릴리스 프로세스

#### 1. 릴리스 브랜치 생성

```bash
# develop에서 릴리스 브랜치 생성
git checkout develop
git pull origin develop
git checkout -b release/v1.0.0
```

#### 2. 릴리스 준비

- 버전 번호 업데이트 (package.json)
- CHANGELOG 작성
- 마지막 테스트 및 버그 수정

#### 3. 릴리스 배포

```bash
# main에 병합
git checkout main
git merge release/v1.0.0
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin main --tags

# develop에도 병합
git checkout develop
git merge release/v1.0.0
git push origin develop

# 릴리스 브랜치 삭제
git branch -d release/v1.0.0
```

#### 4. CHANGELOG 작성

```markdown
# Changelog

## [1.0.0] - 2025-09-30

### Added
- 상품 장바구니 담기 기능
- 주문 결제 기능
- 회원 인증 기능

### Changed
- 상품 조회 API 성능 개선
- 에러 메시지 한글화

### Fixed
- 주문 생성 시 재고 차감 오류
- 장바구니 수량 업데이트 버그

### Security
- JWT 토큰 만료 시간 조정
- Rate Limiting 강화
```

### 12.8 핫픽스 프로세스

긴급한 버그 수정이 필요한 경우:

```bash
# 1. main에서 hotfix 브랜치 생성
git checkout main
git checkout -b hotfix/critical-payment-bug

# 2. 버그 수정 및 커밋
git add .
git commit -m "fix: 결제 실패 오류 긴급 수정"

# 3. main에 병합 및 태그
git checkout main
git merge hotfix/critical-payment-bug
git tag -a v1.0.1 -m "Hotfix: 결제 오류 수정"
git push origin main --tags

# 4. develop에도 병합
git checkout develop
git merge hotfix/critical-payment-bug
git push origin develop

# 5. hotfix 브랜치 삭제
git branch -d hotfix/critical-payment-bug
```

---

## 협업 모범 사례

### 커뮤니케이션

- **명확한 커밋 메시지**: 무엇을, 왜 변경했는지 명확히
- **적극적인 PR 설명**: 변경 사항과 이유를 자세히 설명
- **빠른 리뷰 응답**: 24시간 내 리뷰 코멘트에 응답
- **긍정적인 태도**: 건설적이고 존중하는 커뮤니케이션

### 코드 품질

- **작은 PR**: 리뷰하기 쉽도록 300줄 이하 권장
- **테스트 필수**: 새 기능은 테스트 코드와 함께
- **문서화**: 복잡한 로직은 주석으로 설명
- **컨벤션 준수**: 프로젝트 코딩 표준 따르기

### 일정 관리

- **일일 스탠드업**: 진행 상황 공유
- **스프린트 계획**: 주간 목표 설정
- **회고**: 스프린트 종료 후 개선점 논의

---

## 다음 단계

- **코딩 시작**: [02. 코딩 표준](./02_CODING_STANDARDS.md)을 준수하며 개발하세요
- **API 개발**: [04. API 개발 가이드](./04_API_DEVELOPMENT.md)를 참고하세요
- **배포 전**: [05. 테스트 & 배포](./05_TESTING_DEPLOYMENT.md)의 체크리스트를 확인하세요

---

> [← 목차로 돌아가기](./00_INDEX.md)
