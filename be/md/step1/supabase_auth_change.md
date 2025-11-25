# Supabase Auth 소셜 로그인 - 데이터베이스 스키마 변경

> **작업일**: 2025년 10월 10일
> **목적**: Google, Kakao 소셜 로그인 지원을 위한 DB 스키마 수정
> **상태**: ✅ **완료** (Prisma 마이그레이션)

---

## 📚 목차

1. [작업 개요](#1-작업-개요)
2. [데이터베이스 스키마 변경](#2-데이터베이스-스키마-변경)
3. [Prisma Schema 수정](#3-prisma-schema-수정)
4. [마이그레이션 과정](#4-마이그레이션-과정)
5. [변경 사항 검증](#5-변경-사항-검증)
6. [다음 단계](#6-다음-단계)

---

## 1. 작업 개요

### 1.1 목표

기존 이메일/비밀번호 인증 시스템에 **Supabase Auth 소셜 로그인**을 추가하여:
- ✅ Google 로그인 지원
- ✅ Kakao 로그인 지원
- ✅ 기존 회원가입/로그인 유지 (하위 호환성)

### 1.2 변경 전략

**방법**: `prisma db push` 사용
- 기존 데이터 유지
- 마이그레이션 히스토리 생략 (개발 단계)
- 배포 전 `prisma migrate reset`으로 정리 예정

### 1.3 백업

**Git 커밋**: `2a6336f`
- 커밋 메시지: "작업 전 백업: 소셜 로그인 추가 전 상태"
- 브랜치: `backendVER0.1`

---

## 2. 데이터베이스 스키마 변경

### 2.1 Member 테이블 변경

**추가된 컬럼**:

| 컬럼명 | 타입 | 제약조건 | 기본값 | 설명 |
|--------|------|----------|--------|------|
| `member_auth_id` | VARCHAR(255) | UNIQUE, NULL | null | Supabase auth.users.id (UUID) |
| `member_auth_provider` | VARCHAR(20) | NULL | null | 인증 제공자 ('email', 'google', 'kakao') |

**추가된 인덱스**:
- `member_auth_id` (UNIQUE 인덱스)
- `member_auth_provider` (일반 인덱스)

**기존 필드 유지**:
- `member_password` (이미 nullable이었음)

### 2.2 데이터 타입 설명

**member_auth_id**:
- Supabase Auth의 `auth.users.id` (UUID 형식)
- 소셜 로그인 사용자 고유 식별자
- 예시: `"550e8400-e29b-41d4-a716-446655440000"`

**member_auth_provider**:
- 인증 제공자 구분
- 가능한 값:
  - `'email'`: 이메일/비밀번호 회원가입
  - `'google'`: Google 소셜 로그인
  - `'kakao'`: Kakao 소셜 로그인

### 2.3 회원 유형별 데이터

| 로그인 방식 | member_password | member_auth_id | member_auth_provider |
|-------------|-----------------|----------------|----------------------|
| **이메일/비번** | bcrypt 해시 | null | 'email' |
| **Google** | null | Supabase UUID | 'google' |
| **Kakao** | null | Supabase UUID | 'kakao' |
| **계정 연결** | bcrypt 해시 | Supabase UUID | 'email' |

---

## 3. Prisma Schema 수정

### 3.1 변경 전

```prisma
model Member {
  member_id              BigInt    @id @default(autoincrement())
  company_id             BigInt?
  member_email           String    @unique @db.VarChar(100)
  member_password        String?   @db.VarChar(255)
  member_name            String    @db.VarChar(30)
  member_nickname        String    @unique @db.VarChar(30)
  member_phone           String?   @db.VarChar(15)
  member_account_type    String    @default("individual") @db.VarChar(20)
  member_account_role    String    @default("buyer") @db.VarChar(20)
  member_status          String    @default("active") @db.VarChar(20)
  member_marketing_email Boolean   @default(false)
  member_marketing_sms   Boolean   @default(false)
  member_last_login_at   DateTime?
  member_created_at      DateTime  @default(now())
  member_updated_at      DateTime  @default(now()) @updatedAt

  // ... relations

  @@index([company_id])
  @@index([member_email])
  @@index([member_account_role])
  @@index([member_status])
  @@map("member")
}
```

### 3.2 변경 후

```prisma
model Member {
  member_id              BigInt    @id @default(autoincrement())
  company_id             BigInt?
  member_email           String    @unique @db.VarChar(100)
  member_password        String?   @db.VarChar(255)
  member_name            String    @db.VarChar(30)
  member_nickname        String    @unique @db.VarChar(30)
  member_phone           String?   @db.VarChar(15)
  member_account_type    String    @default("individual") @db.VarChar(20)
  member_account_role    String    @default("buyer") @db.VarChar(20)
  member_status          String    @default("active") @db.VarChar(20)
  member_marketing_email Boolean   @default(false)
  member_marketing_sms   Boolean   @default(false)
  member_last_login_at   DateTime?
  member_auth_id         String?   @unique @db.VarChar(255)  // 신규
  member_auth_provider   String?   @db.VarChar(20)           // 신규
  member_created_at      DateTime  @default(now())
  member_updated_at      DateTime  @default(now()) @updatedAt

  // ... relations

  @@index([company_id])
  @@index([member_email])
  @@index([member_account_role])
  @@index([member_status])
  @@index([member_auth_id])          // 신규
  @@index([member_auth_provider])    // 신규
  @@map("member")
}
```

---

## 4. 마이그레이션 과정

### 4.1 작업 순서

```bash
# 1. Git 백업
git add .
git commit -m "작업 전 백업: 소셜 로그인 추가 전 상태"

# 2. Prisma Schema 수정
# prisma/schema.prisma 편집

# 3. 데이터베이스 동기화
npx prisma db pull  # 현재 DB 스키마 확인 (flee_events 발견)
npx prisma db push --accept-data-loss  # 스키마 적용

# 4. Prisma Client 재생성
rm -rf node_modules/.prisma  # 파일 잠금 해제
npx prisma generate
```

### 4.2 발생한 문제 및 해결

**문제 1**: Drift 감지
- **원인**: `flee_events` 테이블이 스키마에 없음
- **해결**: `prisma db pull`로 테이블 추가

**문제 2**: Prisma Client 생성 실패 (EPERM)
- **원인**: 여러 Node 프로세스가 파일 잠금
- **해결**: `node_modules/.prisma` 폴더 삭제 후 재생성

### 4.3 최종 결과

```
✔ Your database is now in sync with your Prisma schema. Done in 717ms
✔ Generated Prisma Client (v6.16.3) to .\node_modules\@prisma\client in 220ms
```

---

## 5. 변경 사항 검증

### 5.1 Prisma Studio 확인

**확인 항목**:
- ✅ Member 테이블에 `member_auth_id` 컬럼 추가
- ✅ Member 테이블에 `member_auth_provider` 컬럼 추가
- ✅ 기존 회원 데이터 유지 (모든 필드 null)
- ✅ `flee_events` 테이블 유지 (10개 row 보존)

**Prisma Studio 실행**:
```bash
npx prisma studio --port 5555
```

### 5.2 데이터 무결성

**기존 회원 (10명 가정)**:
- `member_auth_id`: null
- `member_auth_provider`: null
- `member_password`: 기존 bcrypt 해시 유지

**신규 회원 (소셜 로그인)**:
- `member_auth_id`: Supabase UUID
- `member_auth_provider`: 'google' 또는 'kakao'
- `member_password`: null

---

## 6. 다음 단계

### 6.1 백엔드 코드 구현

**순서**:
1. **Supabase 설정 파일 수정**
   - `src/config/supabase.js` 업데이트
   - ANON_KEY 클라이언트 추가

2. **인증 서비스 로직 추가**
   - `src/services/auth.service.js` 수정
   - `getSocialLoginUrl()` 함수 추가
   - `handleSocialCallback()` 함수 추가
   - `syncSupabaseUser()` 함수 추가

3. **컨트롤러 추가**
   - `src/controllers/auth.controller.js` 수정
   - `socialLoginInit()` 추가
   - `socialLoginCallback()` 추가

4. **라우터 추가**
   - `src/routes/auth.routes.js` 수정
   - `GET /api/v1/auth/social/:provider`
   - `POST /api/v1/auth/social/:provider/callback`

5. **미들웨어 수정**
   - `src/middlewares/auth.js` 이중 인증 지원

### 6.2 Supabase Dashboard 설정

**Google OAuth**:
1. Supabase Dashboard → Authentication → Providers → Google
2. Client ID, Secret 입력 (Google Cloud Console)
3. Redirect URL: `https://<project>.supabase.co/auth/v1/callback`

**Kakao OAuth**:
1. Supabase Dashboard → Authentication → Providers → Kakao
2. REST API Key, Secret 입력 (Kakao Developers)
3. Redirect URL: `https://<project>.supabase.co/auth/v1/callback`

### 6.3 프론트엔드 구현

**로그인 페이지 추가**:
```html
<button onclick="loginWithGoogle()">Google로 시작하기</button>
<button onclick="loginWithKakao()">Kakao로 시작하기</button>
```

**JavaScript**:
```javascript
async function loginWithGoogle() {
  const res = await fetch('/api/v1/auth/social/google');
  const { url } = await res.json();
  window.location.href = url;
}
```

### 6.4 배포 전 정리

**마이그레이션 히스토리 정리**:
```bash
# 모든 개발 완료 후
npx prisma migrate reset
npx prisma migrate dev --name final_social_login
npx prisma generate
```

---

## 📋 체크리스트

### ✅ 완료
- [x] Git 백업 커밋
- [x] Prisma Schema 수정
- [x] 데이터베이스 스키마 동기화
- [x] Prisma Client 재생성
- [x] 변경사항 검증 (Prisma Studio)
- [x] 문서화 (본 파일)

### ⏳ 대기 중
- [ ] Supabase 설정 파일 수정
- [ ] 인증 서비스 로직 구현
- [ ] 컨트롤러 및 라우터 추가
- [ ] 미들웨어 이중 인증 지원
- [ ] Supabase Dashboard OAuth 설정
- [ ] 프론트엔드 UI 구현
- [ ] 통합 테스트
- [ ] 배포 전 마이그레이션 정리

---

## 🔗 참고 문서

- **Supabase Auth 공식 문서**: https://supabase.com/docs/guides/auth
- **Prisma Schema**: `prisma/schema.prisma`
- **Member 모델 스키마**: Line 36-70
- **Git 백업 커밋**: `2a6336f`

---

**최종 업데이트**: 2025년 10월 10일
**작성자**: Backend Team
**다음 문서**: `md/step2/supabase_auth_backend.md` (예정)
