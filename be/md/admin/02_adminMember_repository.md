# Step 2: AdminMember Repository 생성

> **작성일**: 2025년 10월 7일
> **상태**: ✅ 완료
> **파일**: `src/repositories/admin/adminMember.repository.js`

---

## 📚 개념 설명

### 🎯 왜 필요한가?

관리자가 **전체 회원을 관리**하기 위해:
- 모든 회원 목록 조회 (일반 회원은 자신의 정보만 볼 수 있지만, 관리자는 전체 조회)
- 회원 상태 변경 (정지, 활성화)
- 회원 역할 변경 (buyer → seller → admin)
- 회원 검색 및 필터링
- 회원 통계 (총 회원 수, 역할별 분포 등)

### 💡 일반 Repository vs Admin Repository

**기존 `member.repository.js`** (Phase 1):
```javascript
// 자신의 정보만 조회/수정
findById(memberId)
update(memberId, data)
```

**새로운 `admin/adminMember.repository.js`**:
```javascript
// 관리자 전용 - 모든 회원 관리
findAll({ page, limit, status, role, search })  // 페이징, 필터링
findByIdWithDetails(memberId)                   // 상세 정보
updateStatus(memberId, status)                  // 상태 변경
updateRole(memberId, role)                      // 역할 변경
getStatistics()                                 // 통계
searchMembers(keyword)                          // 검색
```

---

## 🔑 핵심 개념

### 1. 페이징 (Pagination)

**목적**: 수천 명의 회원을 한 번에 조회하면 성능 문제 발생 → 페이지별로 나눠서 조회

**계산**:
```javascript
const page = 2;      // 2페이지
const limit = 20;    // 페이지당 20명

const skip = (page - 1) * limit;  // (2-1) * 20 = 20 (건너뛸 개수)
const take = limit;               // 20 (가져올 개수)

// 결과: 21번째~40번째 회원 조회
```

**Prisma 쿼리**:
```javascript
prisma.member.findMany({
  skip: 20,
  take: 20
});
```

---

### 2. 필터링 (Filtering)

**조건에 맞는 회원만 조회**:

```javascript
// 정지된 회원만
where: { member_status: 'suspended' }

// seller 역할 회원만
where: { member_account_role: 'seller' }

// 여러 조건 조합
where: {
  member_status: 'active',
  member_account_role: 'seller'
}
```

---

### 3. 검색 (Search) - OR 조건

**이메일, 이름, 닉네임 중 하나라도 일치하면 검색**:

```javascript
where: {
  OR: [
    { member_email: { contains: 'user' } },
    { member_name: { contains: 'user' } },
    { member_nickname: { contains: 'user' } }
  ]
}

// "user"가 포함된 회원 모두 검색
```

**mode: 'insensitive'**: 대소문자 구분 안 함
- "USER", "user", "User" 모두 동일하게 검색

---

### 4. 역할 변경 시 권한 자동 업데이트

**중요**: 역할을 변경하면 관련 권한도 함께 변경되어야 함

| 역할 | can_purchase | can_sell | can_product_manage | can_member_manage | can_system_config |
|------|--------------|----------|-------------------|-------------------|-------------------|
| buyer | ✅ | ❌ | ❌ | ❌ | ❌ |
| seller | ✅ | ✅ | ✅ | ❌ | ❌ |
| admin | ✅ | ✅ | ✅ | ✅ | ✅ |

**트랜잭션 사용**:
```javascript
await prisma.$transaction(async (tx) => {
  // 1. member 테이블 업데이트
  await tx.member.update({ ... });

  // 2. member_permissions 테이블 업데이트
  await tx.memberPermission.upsert({ ... });
});
```

**왜 트랜잭션?**
- 두 테이블을 동시에 업데이트해야 함
- 하나만 성공하고 하나 실패하면 데이터 불일치 발생
- 트랜잭션: 둘 다 성공 or 둘 다 실패 (원자성)

---

### 5. 통계 (Statistics)

**병렬 쿼리로 성능 최적화**:

```javascript
const [total, active, suspended] = await Promise.all([
  prisma.member.count(),
  prisma.member.count({ where: { member_status: 'active' } }),
  prisma.member.count({ where: { member_status: 'suspended' } })
]);
```

**순차 실행 vs 병렬 실행**:
- 순차: 3개 쿼리 → 각 100ms = 300ms
- 병렬: 3개 쿼리 동시 실행 → 100ms
- **3배 빠름!**

---

## 📦 구현 내용

### 파일 위치
```
src/repositories/admin/adminMember.repository.js
```

### 주요 함수 (6개)

#### 1. findAll(options)
회원 목록 조회 (페이징, 필터링, 검색)

**파라미터**:
```javascript
{
  page: 1,              // 페이지 번호
  limit: 20,            // 페이지당 개수
  status: 'active',     // 상태 필터 (선택)
  role: 'seller',       // 역할 필터 (선택)
  search: 'user'        // 검색어 (선택)
}
```

**반환값**:
```javascript
{
  members: [ ... ],     // 회원 배열
  total: 100,           // 전체 회원 수
  page: 1,              // 현재 페이지
  totalPages: 5         // 전체 페이지 수
}
```

**예시**:
```javascript
// 1페이지, 20명씩
const result = await findAll({ page: 1, limit: 20 });

// 정지된 회원만
const suspended = await findAll({ status: 'suspended' });

// seller 역할 회원 검색
const sellers = await findAll({ role: 'seller', search: 'kim' });
```

---

#### 2. findByIdWithDetails(memberId)
회원 상세 조회 (관리자용 - 모든 정보 포함)

**포함 정보**:
- 기본 회원 정보
- 회사 정보 (company)
- 권한 정보 (member_permissions)
- 배송지 목록 (member_addresses)
- 소속 판매사 목록 (tenant_members)
- 주문 개수, 장바구니 개수

**반환값**:
```javascript
{
  member_id: 1,
  member_email: "user@example.com",
  member_name: "홍길동",
  company: { ... },
  member_permissions: { ... },
  member_addresses: [ ... ],
  tenant_members: [ ... ],
  _count: {
    orders: 5,
    shopping_carts: 3
  }
}
```

**예시**:
```javascript
const member = await findByIdWithDetails(1);
console.log(member.company.company_name);
console.log(member._count.orders);
```

---

#### 3. updateStatus(memberId, status)
회원 상태 변경

**파라미터**:
- `memberId` (number): 회원 ID
- `status` (string): 변경할 상태
  - `'active'`: 활성
  - `'suspended'`: 정지
  - `'inactive'`: 비활성

**반환값**: 수정된 회원 정보 (간략)

**예시**:
```javascript
// 회원 정지
await updateStatus(1, 'suspended');

// 회원 활성화
await updateStatus(1, 'active');
```

---

#### 4. updateRole(memberId, role)
회원 역할 변경 (권한 자동 업데이트)

**파라미터**:
- `memberId` (number): 회원 ID
- `role` (string): 변경할 역할
  - `'buyer'`: 구매자
  - `'seller'`: 판매자
  - `'admin'`: 관리자

**동작**:
1. `member.member_account_role` 업데이트
2. `member_permissions` 권한 자동 업데이트
3. 트랜잭션으로 원자성 보장

**권한 매핑**:
```javascript
// buyer
{
  can_purchase: true,
  can_sell: false,
  can_product_manage: false,
  can_member_manage: false,
  can_system_config: false
}

// seller
{
  can_purchase: true,
  can_sell: true,
  can_product_manage: true,
  can_order_manage: true,
  can_member_manage: false,
  can_system_config: false
}

// admin
{
  can_purchase: true,
  can_sell: true,
  can_product_manage: true,
  can_order_manage: true,
  can_member_manage: true,
  can_system_config: true
}
```

**예시**:
```javascript
// buyer → seller 변경
await updateRole(1, 'seller');
// member_account_role: 'seller'
// can_sell: true (자동 업데이트)
```

**주의**: `member_permission_role`은 Int 타입
- buyer = 1
- seller = 2
- admin = 3

---

#### 5. getStatistics()
회원 통계 조회

**반환값**:
```javascript
{
  totalMembers: 1000,           // 전체 회원
  activeMembers: 950,           // 활성 회원
  suspendedMembers: 30,         // 정지된 회원
  inactiveMembers: 20,          // 비활성 회원
  roleDistribution: {           // 역할별 분포
    buyer: 800,
    seller: 150,
    admin: 50
  },
  recentMembers: 50             // 최근 7일 가입
}
```

**예시**:
```javascript
const stats = await getStatistics();
console.log(`전체 회원: ${stats.totalMembers}명`);
console.log(`seller 비율: ${stats.roleDistribution.seller / stats.totalMembers * 100}%`);
```

---

#### 6. searchMembers(keyword, limit)
회원 검색 (이메일, 이름, 닉네임)

**파라미터**:
- `keyword` (string): 검색 키워드
- `limit` (number, 선택): 결과 개수 (기본 10)

**반환값**: 검색된 회원 배열 (간략 정보)

**예시**:
```javascript
// "kim"이 포함된 회원 검색
const results = await searchMembers('kim');

// 최대 5명만
const top5 = await searchMembers('kim', 5);
```

---

## 🔄 동작 흐름 예시

### 회원 역할 변경 과정

**시나리오**: buyer를 seller로 변경

```javascript
// 1. 트랜잭션 시작
await prisma.$transaction(async (tx) => {

  // 2. member 테이블 업데이트
  await tx.member.update({
    where: { member_id: 1 },
    data: { member_account_role: 'seller' }
  });

  // 3. member_permissions 업데이트
  await tx.memberPermission.upsert({
    where: { member_id: 1 },
    update: {
      member_permission_role: 2,  // seller = 2
      can_sell: true,
      can_product_manage: true,
      can_order_manage: true
    },
    create: {
      member_id: 1,
      member_permission_role: 2,
      can_purchase: true,
      can_sell: true,
      ...
    }
  });
});

// 4. 트랜잭션 커밋 (자동)
```

---

## 📊 사용 예시

### 1. 관리자 대시보드 - 회원 목록

```javascript
// 첫 페이지, 20명씩
const page1 = await findAll({ page: 1, limit: 20 });

// 다음 페이지 버튼
const page2 = await findAll({ page: 2, limit: 20 });

// 전체 페이지 수
console.log(page1.totalPages);  // 50
```

### 2. 회원 검색

```javascript
// 이메일로 검색
const byEmail = await searchMembers('user@example.com');

// 이름으로 검색
const byName = await searchMembers('홍길동');
```

### 3. 회원 필터링

```javascript
// 정지된 seller 회원
const suspendedSellers = await findAll({
  status: 'suspended',
  role: 'seller'
});
```

### 4. 회원 상세 조회

```javascript
const member = await findByIdWithDetails(1);

// 소속 판매사 확인
member.tenant_members.forEach(tm => {
  console.log(tm.tenant.tenant_name);
});

// 주문 내역 개수
console.log(`총 주문: ${member._count.orders}건`);
```

### 5. 회원 통계

```javascript
const stats = await getStatistics();

console.log(`
  전체 회원: ${stats.totalMembers}
  활성: ${stats.activeMembers}
  정지: ${stats.suspendedMembers}

  buyer: ${stats.roleDistribution.buyer}
  seller: ${stats.roleDistribution.seller}
  admin: ${stats.roleDistribution.admin}

  최근 7일 가입: ${stats.recentMembers}
`);
```

---

## ⚠️ 주의사항

### 1. BigInt 처리
```javascript
member_id: BigInt(memberId)  // ✅
member_id: memberId           // ❌ 타입 에러
```

### 2. 트랜잭션 사용
역할 변경 시 반드시 트랜잭션 사용:
```javascript
// ✅ 트랜잭션
await prisma.$transaction(async (tx) => { ... });

// ❌ 개별 쿼리 (데이터 불일치 위험)
await prisma.member.update(...);
await prisma.memberPermission.update(...);
```

### 3. 검색 성능
대소문자 구분 없는 검색은 인덱스를 타지 못함:
```javascript
{ contains: keyword, mode: 'insensitive' }
```
→ 회원 수가 많으면 느려질 수 있음
→ 필요시 전문 검색 엔진(Elasticsearch) 고려

### 4. 페이징 제한
```javascript
const limit = Math.min(options.limit || 20, 100);
```
→ 한 번에 너무 많이 조회하는 것 방지

### 5. member_permission_role Int 타입
```javascript
const roleToInt = { buyer: 1, seller: 2, admin: 3 };
member_permission_role: roleToInt[role]
```

---

## 🧪 테스트 시나리오

### 1. 회원 목록 조회
```javascript
const all = await findAll({ page: 1, limit: 20 });
console.log(all.members.length);  // 20
console.log(all.totalPages);      // 50
```

### 2. 필터링
```javascript
const sellers = await findAll({ role: 'seller' });
const suspended = await findAll({ status: 'suspended' });
```

### 3. 검색
```javascript
const results = await searchMembers('kim');
```

### 4. 상태 변경
```javascript
await updateStatus(1, 'suspended');
```

### 5. 역할 변경
```javascript
await updateRole(1, 'seller');
```

### 6. 통계
```javascript
const stats = await getStatistics();
```

---

## 📝 다음 단계

✅ **Step 2 완료**

**다음**: Step 3 - AdminTenant Repository 생성
- 판매사 목록 조회
- 판매사 승인/거절
- 판매사 상태 변경
- 판매사 통계

---

**작성일**: 2025년 10월 7일
**상태**: ✅ 완료
