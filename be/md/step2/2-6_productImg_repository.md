# Step 2-6: ProductImg Repository 생성

> **Phase 2: 판매자 기능 구축**
> **작성일**: 2025년 10월 13일
> **상태**: ✅ 완료

---

## 📋 작업 개요

### 목적
product_img 테이블에 대한 데이터 접근 계층(Repository)을 구현하여 상품 이미지를 순서대로 관리합니다.

### 작업 내용
- `src/repositories/productImg.repository.js` 파일 생성
- Prisma를 사용한 이미지 CRUD 구현
- 이미지 순서(sequence) 관리
- 트랜잭션 기반 순서 재배치

---

## 🎯 ProductImg Repository의 핵심 개념

### 1. Product와 ProductImg의 관계

```
Product (상품)
  ↓ 1:N
ProductImg (상품 이미지)
```

**특징**:
- 한 상품에 여러 이미지 가능
- 이미지에는 순서(sequence)가 있음
- 첫 번째 이미지 (sequence: 1)가 대표 이미지

**예시**:
```javascript
Product: { product_id: 100, product_name: "수제 찻잔" }

ProductImg: [
  {
    product_img_id: 1,
    product_id: 100,
    product_image_sequence: 1,
    product_img_url: "https://storage.../image1.jpg"  // 대표 이미지
  },
  {
    product_img_id: 2,
    product_id: 100,
    product_image_sequence: 2,
    product_img_url: "https://storage.../image2.jpg"
  },
  {
    product_img_id: 3,
    product_id: 100,
    product_image_sequence: 3,
    product_img_url: "https://storage.../image3.jpg"
  }
]
```

---

### 2. Sequence (순서) 관리

**product_image_sequence**:
- 이미지 표시 순서
- 1부터 시작 (1, 2, 3, ...)
- 유니크 제약: `(product_id, product_image_sequence)`
- 순서 변경 가능 (드래그 앤 드롭)

**왜 순서가 중요한가?**
- 첫 번째 이미지 (sequence: 1)가 상품 목록의 썸네일
- 상품 상세에서 순서대로 표시
- 사용자가 원하는 순서로 배치 가능

**Unique 제약 조건**:
```prisma
@@unique([product_id, product_image_sequence])
```

같은 상품 내에서 동일한 순서 번호를 가질 수 없습니다.

---

### 3. 이미지 URL 저장 방식

```javascript
// Supabase Storage 예시
product_img_url: "https://ymqnpsiephgvdzzizsns.supabase.co/storage/v1/object/public/products/100/image1.jpg"

// S3 예시
product_img_url: "https://s3.amazonaws.com/fleecat/products/100/image1.jpg"

// Cloudinary 예시
product_img_url: "https://res.cloudinary.com/fleecat/image/upload/v1/products/100/image1.jpg"
```

**주의**:
- URL만 저장 (실제 파일은 별도 스토리지)
- 이미지 업로드는 Service 레이어에서 처리
- Repository는 URL만 DB에 저장

---

## 📁 파일 위치

```
src/
└── repositories/
    └── productImg.repository.js  ← 생성한 파일
```

---

## 💻 구현 코드

### 전체 구조

```javascript
const prisma = require('../config/database');

// 11개의 함수 제공:
// - 조회: findByProductId, findById, findBySequence, findFirstImage
// - 생성: create
// - 수정: updateSequence, reorderSequences, updateUrl
// - 삭제: deleteById, deleteByProductId
// - 통계: countByProductId
```

---

## 🔧 함수 설명

### 1. 조회 함수 (Read)

#### `findByProductId(productId)`
**역할**: 상품의 모든 이미지 조회 (순서대로)

**파라미터**:
- `productId` (number): 상품 ID

**반환값**:
- 이미지 목록 배열 (sequence 순서)

**사용 예시**:
```javascript
const images = await productImgRepository.findByProductId(100);

console.log(images.length);  // 3

images.forEach((img, index) => {
  console.log(`${img.product_image_sequence}번째: ${img.product_img_url}`);
});

// 결과:
// 1번째: https://storage.../image1.jpg
// 2번째: https://storage.../image2.jpg
// 3번째: https://storage.../image3.jpg
```

**특징**:
- `product_image_sequence` 순서로 정렬 (ASC)
- 빈 배열 반환 (이미지가 없는 경우)

---

#### `findById(productImgId)`
**역할**: ID로 이미지 조회 (상품 정보 포함)

**파라미터**:
- `productImgId` (number): 이미지 ID

**반환값**:
- 이미지 정보 객체 (product 정보 포함)

**사용 예시**:
```javascript
const image = await productImgRepository.findById(1);

console.log(image.product_img_url);  // "https://storage.../image1.jpg"
console.log(image.product.product_name);  // "수제 찻잔"
console.log(image.product.tenant_member_id);  // 10n
```

**특징**:
- 상품 정보 포함 (product_id, product_name, tenant_member_id)
- 권한 확인에 유용 (삭제 시)

---

#### `findBySequence(productId, sequence)`
**역할**: 특정 순서의 이미지 조회

**파라미터**:
- `productId` (number): 상품 ID
- `sequence` (number): 순서 번호

**반환값**:
- 이미지 정보 객체 또는 null

**사용 예시**:
```javascript
// 대표 이미지 (첫 번째) 조회
const thumbnail = await productImgRepository.findBySequence(100, 1);

if (thumbnail) {
  console.log(thumbnail.product_img_url);
}
```

**특징**:
- Unique 제약을 활용한 정확한 조회
- `findUnique` 사용 (빠름)

---

#### `findFirstImage(productId)`
**역할**: 첫 번째 이미지 조회 (대표 이미지)

**파라미터**:
- `productId` (number): 상품 ID

**반환값**:
- 첫 번째 이미지 정보 또는 null

**사용 예시**:
```javascript
// 상품 목록의 썸네일 이미지
const thumbnail = await productImgRepository.findFirstImage(100);

if (thumbnail) {
  console.log(thumbnail.product_img_url);
} else {
  console.log('기본 이미지 사용');
}
```

**특징**:
- `sequence` 오름차순 정렬 후 첫 번째 선택
- 이미지가 없으면 null 반환

---

### 2. 생성 함수 (Create)

#### `create(productImgData)`
**역할**: 이미지 추가

**파라미터**:
```javascript
productImgData = {
  product_id: 100,                     // 필수: 상품 ID
  product_img_url: "https://...",      // 필수: 이미지 URL
  product_image_sequence: 1            // 선택: 순서 (기본: 마지막 + 1)
}
```

**반환값**:
- 생성된 이미지 정보

**사용 예시**:

**예시 1: 첫 번째 이미지 추가 (대표 이미지)**
```javascript
const image = await productImgRepository.create({
  product_id: 100,
  product_img_url: "https://storage.../image1.jpg",
  product_image_sequence: 1  // 대표 이미지
});
```

**예시 2: 순서 지정 없이 추가 (자동으로 마지막에 추가)**
```javascript
// 이미 2개의 이미지가 있는 경우 (sequence: 1, 2)
const image = await productImgRepository.create({
  product_id: 100,
  product_img_url: "https://storage.../image3.jpg"
  // sequence: 자동으로 3 할당됨
});
```

**내부 동작**:
```javascript
// sequence가 지정되지 않으면 마지막 + 1
if (sequence === undefined) {
  const lastImage = await prisma.productImg.findFirst({
    where: { product_id },
    orderBy: { product_image_sequence: 'desc' }
  });

  sequence = lastImage ? lastImage.product_image_sequence + 1 : 1;
}
```

**특징**:
- sequence 자동 계산 (편의성)
- 수동 지정도 가능 (정확한 위치 삽입)

---

### 3. 수정 함수 (Update)

#### `updateSequence(productImgId, newSequence)`
**역할**: 이미지 순서 변경

**파라미터**:
- `productImgId` (number): 이미지 ID
- `newSequence` (number): 새 순서

**반환값**:
- 수정된 이미지 정보

**사용 예시**:
```javascript
// 3번째 이미지를 1번째로 이동
await productImgRepository.updateSequence(imageId3, 1);

// 1번째 이미지를 2번째로 이동
await productImgRepository.updateSequence(imageId1, 2);
```

**주의사항**:
- Unique 제약 위반 가능 (순서 교환 시)
- `reorderSequences()` 사용 권장 (트랜잭션)

---

#### `reorderSequences(productId, updates)`
**역할**: 여러 이미지의 순서 재배치 (트랜잭션)

**파라미터**:
```javascript
productId = 100;

updates = [
  { imageId: 1, sequence: 2 },  // 이미지 1 → 2번째로
  { imageId: 2, sequence: 3 },  // 이미지 2 → 3번째로
  { imageId: 3, sequence: 1 }   // 이미지 3 → 1번째로 (대표)
];
```

**반환값**:
- 업데이트된 이미지 개수

**사용 예시**:

**드래그 앤 드롭 순서 변경**
```javascript
// 현재 순서: [img1, img2, img3]
// 원하는 순서: [img3, img1, img2]

await productImgRepository.reorderSequences(100, [
  { imageId: 1, sequence: 2 },
  { imageId: 2, sequence: 3 },
  { imageId: 3, sequence: 1 }
]);
```

**내부 동작 (트랜잭션)**:
```javascript
await prisma.$transaction(
  updates.map(({ imageId, sequence }) =>
    prisma.productImg.update({
      where: { product_img_id: BigInt(imageId) },
      data: { product_image_sequence: sequence }
    })
  )
);
```

**특징**:
- 트랜잭션으로 원자성 보장 (전부 성공 or 전부 실패)
- Unique 제약 위반 해결

---

#### `updateUrl(productImgId, newUrl)`
**역할**: 이미지 URL 업데이트 (이미지 교체)

**파라미터**:
- `productImgId` (number): 이미지 ID
- `newUrl` (string): 새 URL

**반환값**:
- 수정된 이미지 정보

**사용 예시**:
```javascript
// 이미지 교체
const newUrl = await uploadToStorage(newFile);
await productImgRepository.updateUrl(imageId, newUrl);
```

---

### 4. 삭제 함수 (Delete)

#### `deleteById(productImgId)`
**역할**: 이미지 삭제

**파라미터**:
- `productImgId` (number): 이미지 ID

**반환값**:
- 삭제된 이미지 정보

**사용 예시**:
```javascript
// 이미지 삭제
const deleted = await productImgRepository.deleteById(2);

console.log(`삭제됨: ${deleted.product_img_url}`);

// ⚠️ 주의: Storage에서도 삭제 필요 (Service 레이어)
await deleteFromStorage(deleted.product_img_url);
```

**주의사항**:
- DB에서만 삭제 (Storage는 별도 처리)
- 삭제 후 sequence 재배치 필요 (Service에서)

---

#### `deleteByProductId(productId)`
**역할**: 상품의 모든 이미지 삭제

**파라미터**:
- `productId` (number): 상품 ID

**반환값**:
- 삭제 결과 `{ count: 삭제된 개수 }`

**사용 예시**:
```javascript
// 상품 삭제 시 이미지 모두 삭제
const result = await productImgRepository.deleteByProductId(100);

console.log(`${result.count}개 이미지 삭제됨`);
```

**참고**:
- CASCADE 정책으로 상품 삭제 시 자동 삭제됨
- 명시적으로 호출할 필요는 없음

---

### 5. 통계 함수

#### `countByProductId(productId)`
**역할**: 상품의 이미지 개수 조회

**파라미터**:
- `productId` (number): 상품 ID

**반환값**:
- 이미지 개수 (number)

**사용 예시**:
```javascript
const count = await productImgRepository.countByProductId(100);

if (count === 0) {
  console.log('이미지가 없습니다. 기본 이미지를 사용합니다.');
} else {
  console.log(`${count}개의 이미지가 있습니다.`);
}
```

---

## 🔄 실제 사용 흐름

### 이미지 업로드 시나리오 (productService.js)

```javascript
async function uploadProductImages(productId, memberId, files) {
  // 1. 상품 존재 및 권한 확인
  const product = await productRepository.findById(productId);

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  // 2. 본인 확인
  const tenantMember = await tenantMemberRepository.findById(product.tenant_member_id);

  if (tenantMember.member_id !== BigInt(memberId)) {
    throw new ForbiddenError('Not your product');
  }

  // 3. 이미지 개수 제한 확인 (최대 10개)
  const currentCount = await productImgRepository.countByProductId(productId);

  if (currentCount + files.length > 10) {
    throw new ValidationError('Maximum 10 images allowed');
  }

  // 4. 파일 업로드 (Supabase Storage)
  const uploadedImages = [];

  for (const file of files) {
    // 4-1. Storage에 업로드
    const imageUrl = await uploadToSupabase(file, productId);

    // 4-2. DB에 URL 저장 (순서 자동 할당)
    const productImg = await productImgRepository.create({
      product_id: productId,
      product_img_url: imageUrl
      // sequence: 자동으로 마지막 + 1
    });

    uploadedImages.push(productImg);
  }

  // 5. 첫 이미지 업로드 시 상품 활성화
  if (currentCount === 0 && uploadedImages.length > 0) {
    await productRepository.updateStatus(productId, 'active');
  }

  return uploadedImages;
}
```

---

### 이미지 삭제 시나리오

```javascript
async function deleteProductImage(productImgId, memberId) {
  // 1. 이미지 조회 (상품 정보 포함)
  const image = await productImgRepository.findById(productImgId);

  if (!image) {
    throw new NotFoundError('Image not found');
  }

  // 2. 권한 확인
  const tenantMember = await tenantMemberRepository.findById(image.product.tenant_member_id);

  if (tenantMember.member_id !== BigInt(memberId)) {
    throw new ForbiddenError('Not your product');
  }

  // 3. DB에서 삭제
  await productImgRepository.deleteById(productImgId);

  // 4. Storage에서 삭제
  await deleteFromSupabase(image.product_img_url);

  // 5. 남은 이미지 개수 확인
  const remainingCount = await productImgRepository.countByProductId(image.product_id);

  // 6. 이미지가 모두 삭제되면 상품 비활성화
  if (remainingCount === 0) {
    await productRepository.updateStatus(image.product_id, 'inactive');
  }

  return { message: 'Image deleted successfully' };
}
```

---

### 이미지 순서 변경 시나리오 (드래그 앤 드롭)

```javascript
async function reorderProductImages(productId, memberId, newOrder) {
  // newOrder: [imageId3, imageId1, imageId2]

  // 1. 권한 확인
  const product = await productRepository.findById(productId);
  const tenantMember = await tenantMemberRepository.findById(product.tenant_member_id);

  if (tenantMember.member_id !== BigInt(memberId)) {
    throw new ForbiddenError('Not your product');
  }

  // 2. 현재 이미지 목록 조회
  const currentImages = await productImgRepository.findByProductId(productId);

  // 3. 모든 이미지가 포함되어 있는지 확인
  if (currentImages.length !== newOrder.length) {
    throw new ValidationError('All images must be included');
  }

  // 4. 새 순서 계산
  const updates = newOrder.map((imageId, index) => ({
    imageId,
    sequence: index + 1  // 1부터 시작
  }));

  // 5. 트랜잭션으로 순서 변경
  await productImgRepository.reorderSequences(productId, updates);

  // 6. 변경된 이미지 목록 반환
  return await productImgRepository.findByProductId(productId);
}
```

---

## 📊 데이터 흐름도

```
Controller
    ↓ (HTTP 요청 - 파일 업로드)
Service
    ↓ (Storage 업로드)
Storage (Supabase/S3)
    ↓ (URL 반환)
Service
    ↓ (URL 저장)
Repository ← Step 2-6 (여기!)
    ↓ (Prisma 쿼리)
Database
```

### 예시: POST /products/:id/images

```
1. productController.uploadImages
   - req.files에서 파일 추출
   - productService.uploadProductImages() 호출
       ↓
2. productService.uploadProductImages
   - 권한 확인
   - 이미지 개수 제한 확인
   - 파일 → Storage 업로드
   - productImgRepository.create() 호출
       ↓
3. productImgRepository.create
   - sequence 자동 계산
   - prisma.productImg.create() 실행
   - DB에 URL 저장
       ↓
4. Database
   - product_img 테이블에 레코드 추가
```

---

## ⚠️ 주의사항

### 1. Unique 제약 조건

```prisma
@@unique([product_id, product_image_sequence])
```

**문제 상황**:
```javascript
// 현재: [이미지1(seq:1), 이미지2(seq:2)]

// ❌ 에러 발생
await productImgRepository.updateSequence(이미지2_id, 1);
// Error: Unique constraint failed
// 이미 sequence:1이 존재함

// ✅ 트랜잭션으로 교환
await productImgRepository.reorderSequences(productId, [
  { imageId: 이미지1_id, sequence: 2 },
  { imageId: 이미지2_id, sequence: 1 }
]);
```

### 2. Storage와 DB 불일치

```javascript
// ❌ DB만 삭제
await productImgRepository.deleteById(imageId);
// 문제: Storage에 파일은 남아있음 (용량 낭비)

// ✅ 둘 다 삭제
const image = await productImgRepository.findById(imageId);
await productImgRepository.deleteById(imageId);
await deleteFromStorage(image.product_img_url);
```

### 3. CASCADE 삭제 정책

```prisma
product  Product  @relation(..., onDelete: Cascade)
```

**상품 삭제 시 이미지도 자동 삭제됨**:
```javascript
// 상품 삭제
await productRepository.deleteById(100);
// product_images도 자동으로 DB에서 삭제됨

// ⚠️ 하지만 Storage의 파일은 남아있음!
// Service에서 삭제 전 이미지 목록 조회 후 Storage 정리 필요
```

### 4. 이미지 순서 재배치 후 정리

```javascript
// 이미지 삭제 후 순서에 빈 구멍이 생김
// [1, 2, 3] → 2번 삭제 → [1, 3]

// Service 레이어에서 순서 재정렬 필요
const images = await productImgRepository.findByProductId(productId);

const updates = images.map((img, index) => ({
  imageId: img.product_img_id,
  sequence: index + 1
}));

await productImgRepository.reorderSequences(productId, updates);
// [1, 3] → [1, 2]
```

---

## 🧪 테스트 시나리오

### 1. 이미지 추가 테스트

```javascript
describe('ProductImg Repository - create', () => {
  it('should create first image with sequence 1', async () => {
    // Given
    const data = {
      product_id: 100,
      product_img_url: "https://storage.../image1.jpg"
    };

    // When
    const image = await productImgRepository.create(data);

    // Then
    expect(image.product_image_sequence).toBe(1);
  });

  it('should auto-increment sequence', async () => {
    // Given: 이미 2개 이미지 존재 (seq: 1, 2)
    const data = {
      product_id: 100,
      product_img_url: "https://storage.../image3.jpg"
    };

    // When
    const image = await productImgRepository.create(data);

    // Then
    expect(image.product_image_sequence).toBe(3);
  });
});
```

### 2. 순서 재배치 테스트

```javascript
describe('ProductImg Repository - reorderSequences', () => {
  it('should reorder images in transaction', async () => {
    // Given: [img1(seq:1), img2(seq:2), img3(seq:3)]
    const updates = [
      { imageId: 1, sequence: 3 },
      { imageId: 2, sequence: 1 },
      { imageId: 3, sequence: 2 }
    ];

    // When
    await productImgRepository.reorderSequences(100, updates);

    // Then
    const images = await productImgRepository.findByProductId(100);
    expect(images[0].product_img_id).toBe(2n);  // img2가 첫 번째
    expect(images[1].product_img_id).toBe(3n);  // img3가 두 번째
    expect(images[2].product_img_id).toBe(1n);  // img1이 세 번째
  });
});
```

---

## 📈 성능 최적화 팁

### 1. 인덱스 활용

```prisma
model ProductImg {
  @@unique([product_id, product_image_sequence])
  @@index([product_id])
  @@index([product_id, product_image_sequence])
}
```

### 2. 이미지 개수 제한

```javascript
// Service에서 제한
const MAX_IMAGES = 10;

const currentCount = await productImgRepository.countByProductId(productId);

if (currentCount >= MAX_IMAGES) {
  throw new ValidationError(`Maximum ${MAX_IMAGES} images allowed`);
}
```

### 3. CDN 사용

```javascript
// Storage URL을 CDN URL로 변환
const cdnUrl = image.product_img_url.replace(
  'https://storage.supabase.co',
  'https://cdn.fleecat.com'
);
```

---

## 🔗 다음 단계

### Step 2-7: Tenant Service
다음 단계에서는 Service 레이어로 넘어갑니다:

- `src/services/tenant.service.js`
- 판매사 등록 및 관리 비즈니스 로직
- Repository 조합 및 트랜잭션 처리

---

## 📚 참고 자료

### Prisma 공식 문서
- [Prisma Transactions](https://www.prisma.io/docs/concepts/components/prisma-client/transactions)
- [Prisma Unique Constraints](https://www.prisma.io/docs/concepts/components/prisma-schema/data-model#unique-constraints)

### 관련 가이드
- [03. 데이터베이스 가이드](../common/03_DATABASE_GUIDE.md)
- [db_03_RELATIONSHIPS.md](../common/db_03_RELATIONSHIPS.md)

### 이전 단계
- [Step 2-5: Product Repository](./2-5_product_repository.md)

---

**작성일**: 2025년 10월 13일
**작성자**: Backend Team
**상태**: ✅ 완료
