# Step 7: AdminMember Service 생성

> **작성일**: 2025년 10월 7일
> **상태**: ✅ 완료
> **파일**: `src/services/admin/adminMember.service.js`

---

## 📚 개념 설명

### 🎯 Service Layer의 역할

Service Layer는 **비즈니스 로직을 처리**하는 계층입니다:

- **Repository 호출** (데이터 접근)
- **데이터 검증** (Validation)
- **비즈니스 규칙 적용** (Business Logic)
- **에러 핸들링** (Custom Errors)
- **데이터 가공** (BigInt 변환, 계산 등)

### 💡 Repository vs Service

**Repository (데이터 접근):**
```javascript
// 단순히 DB 업데이트만 수행
async function updateStatus(memberId, status) {
  return await prisma.member.update({
    where: { member_id: BigInt(memberId) },
    data: { member_status: status }
  });
}
```

**Service (비즈니스 로직):**
```javascript
// 검증 + 비즈니스 규칙 + 데이터 가공
async function updateMemberStatus(memberId, status) {
  // 1. 입력값 검증
  if (!['active', 'suspended', 'inactive'].includes(status)) {
    throw new ValidationError('유효하지 않은 상태');
  }

  // 2. 회원 조회
  const member = await memberRepo.findById(memberId);
  if (!member) {
    throw new NotFoundError('회원을 찾을 수 없습니다');
  }

  // 3. 비즈니스 규칙
  if (member.member_account_role === 'admin' && status === 'suspended') {
    throw new ValidationError('관리자는 정지할 수 없습니다');
  }

  // 4. Repository 호출
  const updated = await memberRepo.updateStatus(memberId, status);

  // 5. 데이터 가공
  return {
    ...updated,
    member_id: updated.member_id.toString()
  };
}
```

---

## 🔑 핵심 개념

### 1. 데이터 검증 (Validation)

**입력값 검증:**
```javascript
async function getMemberList(options) {
  const { page, limit, status, role } = options;

  // 1. 페이지 번호 검증
  if (page < 1) {
    throw new ValidationError('페이지 번호는 1 이상이어야 합니다');
  }

  // 2. limit 검증
  if (limit < 1 || limit > 100) {
    throw new ValidationError('limit은 1~100 사이여야 합니다');
  }

  // 3. status 검증
  const validStatuses = ['active', 'suspended', 'inactive'];
  if (status && !validStatuses.includes(status)) {
    throw new ValidationError(`유효하지 않은 상태: ${status}`);
  }

  // 4. role 검증
  const validRoles = ['buyer', 'seller', 'admin'];
  if (role && !validRoles.includes(role)) {
    throw new ValidationError(`유효하지 않은 역할: ${role}`);
  }

  // 검증 통과 후 Repository 호출
  return await memberRepo.findAll(options);
}
```

---

### 2. 비즈니스 규칙

**회원 상태 변경 규칙:**
```javascript
async function updateMemberStatus(memberId, status) {
  const member = await memberRepo.findById(memberId);

  // 규칙 1: admin은 정지할 수 없음
  if (member.member_account_role === 'admin' && status === 'suspended') {
    throw new ValidationError('관리자는 정지할 수 없습니다');
  }

  // 규칙 2: 이미 같은 상태면 에러
  if (member.member_status === status) {
    throw new ValidationError(`이미 ${status} 상태입니다`);
  }

  // 규칙 통과 후 업데이트
  return await memberRepo.updateStatus(memberId, status);
}
```

**회원 역할 변경 규칙:**
```javascript
async function updateMemberRole(memberId, role, currentAdminId) {
  const member = await memberRepo.findById(memberId);

  // 규칙 1: 자기 자신의 역할 변경 불가
  if (memberId === currentAdminId) {
    throw new ValidationError('자신의 역할은 변경할 수 없습니다');
  }

  // 규칙 2: admin 권한은 해제 불가
  if (member.member_account_role === 'admin') {
    throw new ValidationError('관리자 권한은 해제할 수 없습니다');
  }

  // 규칙 3: admin 권한은 시스템에서만 부여
  if (role === 'admin') {
    throw new ValidationError('관리자 권한은 시스템에서 직접 부여합니다');
  }

  // 규칙 4: 이미 같은 역할이면 에러
  if (member.member_account_role === role) {
    throw new ValidationError(`이미 ${role} 역할입니다`);
  }

  return await memberRepo.updateRole(memberId, role);
}
```

---

### 3. 에러 핸들링

**커스텀 에러 사용:**
```javascript
// src/utils/errors.js
class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
  }
}

// Service에서 사용
const { NotFoundError, ValidationError } = require('../../utils/errors');

async function getMemberById(memberId) {
  const member = await memberRepo.findById(memberId);

  if (!member) {
    throw new NotFoundError(`회원 ID ${memberId}를 찾을 수 없습니다`);
  }

  return member;
}
```

**Controller에서 처리:**
```javascript
// Controller
async function getMember(req, res, next) {
  try {
    const member = await memberService.getMemberById(req.params.id);
    res.json({ success: true, data: member });
  } catch (error) {
    next(error);  // errorHandler로 전달
  }
}

// src/middlewares/errorHandler.js
function errorHandler(err, req, res, next) {
  if (err instanceof NotFoundError) {
    return res.status(404).json({
      success: false,
      message: err.message
    });
  }

  if (err instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  return res.status(500).json({
    success: false,
    message: 'Internal Server Error'
  });
}
```

---

### 4. BigInt 변환

**Repository → Service → Controller:**
```javascript
// Repository: BigInt 반환
async function findById(memberId) {
  return await prisma.member.findUnique({
    where: { member_id: BigInt(memberId) }
  });
  // 반환: { member_id: 1n, ... }
}

// Service: BigInt → String 변환
async function getMemberById(memberId) {
  const member = await memberRepo.findById(memberId);

  return {
    ...member,
    member_id: member.member_id.toString(),
    company_id: member.company_id?.toString()
  };
  // 반환: { member_id: "1", ... }
}

// Controller: JSON 응답
async function getMember(req, res) {
  const member = await memberService.getMemberById(req.params.id);

  res.json({
    success: true,
    data: member  // 정상적으로 JSON 변환됨
  });
}
```

---

### 5. 응답 형식 표준화

**페이징 응답:**
```javascript
async function getMemberList(options) {
  const result = await memberRepo.findAll(options);

  // 표준 페이징 응답
  return {
    data: result.members.map(m => ({
      ...m,
      member_id: m.member_id.toString()
    })),
    pagination: {
      currentPage: result.page,
      totalPages: result.totalPages,
      totalItems: result.total,
      itemsPerPage: options.limit || 20,
      hasNextPage: result.page < result.totalPages,
      hasPreviousPage: result.page > 1
    }
  };
}
```

---

### 6. 데이터 가공 및 계산

**통계 데이터 가공:**
```javascript
async function getMemberStatistics() {
  // 1. Repository 호출
  const stats = await memberRepo.getStatistics();

  // 2. 비율 계산
  const activeRate = stats.totalMembers > 0
    ? (stats.activeMembers / stats.totalMembers * 100).toFixed(1)
    : 0;

  const roleRates = {
    buyer: stats.totalMembers > 0
      ? (stats.roleDistribution.buyer / stats.totalMembers * 100).toFixed(1)
      : 0,
    seller: stats.totalMembers > 0
      ? (stats.roleDistribution.seller / stats.totalMembers * 100).toFixed(1)
      : 0,
    admin: stats.totalMembers > 0
      ? (stats.roleDistribution.admin / stats.totalMembers * 100).toFixed(1)
      : 0
  };

  // 3. 가공된 데이터 반환
  return {
    ...stats,
    activeRate: parseFloat(activeRate),
    roleRates: {
      buyer: parseFloat(roleRates.buyer),
      seller: parseFloat(roleRates.seller),
      admin: parseFloat(roleRates.admin)
    }
  };
}
```

---

### 7. 검색 로직 개선

**Repository: 단순 검색**
```javascript
async function searchMembers(keyword, limit) {
  return await prisma.member.findMany({
    where: {
      OR: [
        { member_email: { contains: keyword } },
        { member_name: { contains: keyword } }
      ]
    },
    take: limit
  });
}
```

**Service: 검증 및 정제**
```javascript
async function searchMembers(keyword, options = {}) {
  // 1. 검색어 검증
  if (!keyword || keyword.trim().length === 0) {
    throw new ValidationError('검색어를 입력해주세요');
  }

  if (keyword.trim().length < 2) {
    throw new ValidationError('검색어는 2자 이상 입력해주세요');
  }

  // 2. 검색어 정제
  const cleanKeyword = keyword.trim();

  // 3. limit 검증
  const limit = options.limit || 10;
  if (limit < 1 || limit > 50) {
    throw new ValidationError('limit은 1~50 사이여야 합니다');
  }

  // 4. Repository 호출
  const members = await memberRepo.searchMembers(cleanKeyword, limit);

  // 5. BigInt 변환
  return members.map(m => ({
    ...m,
    member_id: m.member_id.toString()
  }));
}
```

---

## 📦 구현 내용

### 파일 위치
```
src/services/admin/adminMember.service.js
```

### 주요 함수 (6개)

#### 1. getMemberList(options)
회원 목록 조회 (검증 + BigInt 변환 + 페이징 표준화)

**파라미터:**
```javascript
{
  page: 1,
  limit: 20,
  status: 'active',
  role: 'buyer',
  search: 'user'
}
```

**반환값:**
```javascript
{
  data: [
    {
      member_id: "1",
      member_email: "user@example.com",
      member_name: "홍길동",
      member_status: "active",
      member_account_role: "buyer",
      company_id: "5"
    }
  ],
  pagination: {
    currentPage: 1,
    totalPages: 50,
    totalItems: 1000,
    itemsPerPage: 20,
    hasNextPage: true,
    hasPreviousPage: false
  }
}
```

**비즈니스 로직:**
- page 검증 (1 이상)
- limit 검증 (1~100)
- status 검증 (active/suspended/inactive)
- role 검증 (buyer/seller/admin)
- BigInt → String 변환

---

#### 2. getMemberById(memberId)
회원 상세 조회 (존재 확인 + BigInt 변환)

**파라미터:**
- `memberId` (number): 회원 ID

**반환값:**
```javascript
{
  member_id: "1",
  member_email: "user@example.com",
  member_name: "홍길동",
  company: { ... },
  member_permissions: { ... },
  _count: { ... }
}
```

**비즈니스 로직:**
- 회원 존재 확인 (없으면 NotFoundError)
- BigInt → String 변환

---

#### 3. updateMemberStatus(memberId, status)
회원 상태 변경 (비즈니스 규칙 적용)

**파라미터:**
- `memberId` (number): 회원 ID
- `status` (string): 변경할 상태 (active/suspended/inactive)

**반환값:**
```javascript
{
  member_id: "1",
  member_status: "suspended",
  member_updated_at: "2025-10-07T..."
}
```

**비즈니스 로직:**
1. status 검증
2. 회원 존재 확인
3. **admin은 정지 불가**
4. **이미 같은 상태면 에러**
5. BigInt 변환

---

#### 4. updateMemberRole(memberId, role, currentAdminId)
회원 역할 변경 (권한 검증)

**파라미터:**
- `memberId` (number): 회원 ID
- `role` (string): 변경할 역할 (buyer/seller/admin)
- `currentAdminId` (number): 현재 관리자 ID

**반환값:**
```javascript
{
  member_id: "1",
  member_account_role: "seller",
  member_updated_at: "2025-10-07T..."
}
```

**비즈니스 로직:**
1. role 검증
2. 회원 존재 확인
3. **자기 자신의 역할 변경 불가**
4. **admin 권한은 해제 불가**
5. **admin 권한은 시스템에서만 부여**
6. **이미 같은 역할이면 에러**
7. BigInt 변환

---

#### 5. getMemberStatistics()
회원 통계 조회 (데이터 가공)

**반환값:**
```javascript
{
  totalMembers: 10000,
  activeMembers: 9500,
  suspendedMembers: 300,
  inactiveMembers: 200,
  activeRate: 95.0,        // 계산됨
  suspendedRate: 3.0,      // 계산됨
  inactiveRate: 2.0,       // 계산됨
  roleDistribution: {
    buyer: 8000,
    seller: 1500,
    admin: 500
  },
  roleRates: {             // 계산됨
    buyer: 80.0,
    seller: 15.0,
    admin: 5.0
  },
  recentMembers: 50
}
```

**비즈니스 로직:**
- 비율 계산 (activeRate, suspendedRate, inactiveRate)
- 역할별 비율 계산 (roleRates)
- 0으로 나누기 방지

---

#### 6. searchMembers(keyword, options)
회원 검색 (검색어 검증 및 정제)

**파라미터:**
- `keyword` (string): 검색 키워드
- `options` (object): { limit: 10 }

**반환값:**
```javascript
[
  {
    member_id: "1",
    member_email: "user@example.com",
    member_name: "홍길동",
    member_nickname: "hong",
    member_account_role: "buyer",
    member_status: "active"
  }
]
```

**비즈니스 로직:**
- 검색어 필수 검증
- 검색어 최소 길이 검증 (2자 이상)
- 검색어 정제 (trim)
- limit 검증 (1~50)
- BigInt 변환

---

## 🔄 사용 예시

### 예시 1: 회원 목록 조회

```javascript
// Controller
const memberService = require('../services/admin/adminMember.service');

async function getMembers(req, res, next) {
  try {
    const { page, limit, status, role, search } = req.query;

    const result = await memberService.getMemberList({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      status,
      role,
      search
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
}
```

---

### 예시 2: 회원 상태 변경

```javascript
async function updateStatus(req, res, next) {
  try {
    const { memberId } = req.params;
    const { status } = req.body;

    const updated = await memberService.updateMemberStatus(
      parseInt(memberId),
      status
    );

    res.json({
      success: true,
      message: '회원 상태가 변경되었습니다',
      data: updated
    });
  } catch (error) {
    next(error);
  }
}
```

---

### 예시 3: 회원 역할 변경

```javascript
async function updateRole(req, res, next) {
  try {
    const { memberId } = req.params;
    const { role } = req.body;
    const currentAdminId = req.user.member_id;  // 인증된 관리자

    const updated = await memberService.updateMemberRole(
      parseInt(memberId),
      role,
      currentAdminId
    );

    res.json({
      success: true,
      message: '회원 역할이 변경되었습니다',
      data: updated
    });
  } catch (error) {
    next(error);
  }
}
```

---

### 예시 4: 통계 조회

```javascript
async function getStatistics(req, res, next) {
  try {
    const stats = await memberService.getMemberStatistics();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
}
```

---

## ⚠️ 주의사항

### 1. Service는 Repository에 의존
```javascript
// ✅ Repository 사용
const memberRepo = require('../../repositories/admin/adminMember.repository');

async function getMemberById(memberId) {
  return await memberRepo.findByIdWithDetails(memberId);
}

// ❌ 직접 Prisma 사용 금지
const prisma = require('../../config/database');

async function getMemberById(memberId) {
  return await prisma.member.findUnique({ ... });  // ❌
}
```

### 2. 비즈니스 로직은 Service에
```javascript
// ❌ Controller에 비즈니스 로직 (잘못됨)
async function updateStatus(req, res) {
  const member = await memberRepo.findById(memberId);
  if (member.member_account_role === 'admin') {
    return res.status(400).json({ message: '관리자는 정지 불가' });
  }
}

// ✅ Service에 비즈니스 로직
async function updateMemberStatus(memberId, status) {
  const member = await memberRepo.findById(memberId);
  if (member.member_account_role === 'admin' && status === 'suspended') {
    throw new ValidationError('관리자는 정지할 수 없습니다');
  }
}
```

### 3. 에러는 throw, Controller에서 catch
```javascript
// Service
async function getMemberById(memberId) {
  const member = await memberRepo.findById(memberId);
  if (!member) {
    throw new NotFoundError('회원을 찾을 수 없습니다');  // throw
  }
  return member;
}

// Controller
async function getMember(req, res, next) {
  try {
    const member = await memberService.getMemberById(req.params.id);
    res.json({ success: true, data: member });
  } catch (error) {
    next(error);  // errorHandler로 전달
  }
}
```

### 4. BigInt 변환 필수
```javascript
// ✅ Service에서 변환
return {
  ...member,
  member_id: member.member_id.toString(),
  company_id: member.company_id?.toString()
};

// ❌ 변환 안 하면 JSON 에러
return member;  // TypeError: Do not know how to serialize a BigInt
```

### 5. 입력값 검증
```javascript
// ✅ 검증 후 Repository 호출
if (page < 1) {
  throw new ValidationError('페이지 번호는 1 이상이어야 합니다');
}

// ❌ 검증 없이 Repository 호출 (DB 에러 발생 가능)
return await memberRepo.findAll({ page });
```

---

## 📝 다음 단계

✅ **Step 7 완료**

**다음**: Step 8 - AdminTenant Service 생성
- 판매사 승인/거절 비즈니스 로직
- 상태 변경 규칙
- 통계 데이터 가공

---

**작성일**: 2025년 10월 7일
**상태**: ✅ 완료
