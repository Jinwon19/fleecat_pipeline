# Fleecat 백엔드 - 데이터베이스 가이드

> [← 목차로 돌아가기](./00_INDEX.md)

---

## 7. 데이터베이스 표준

### 7.1 Prisma Schema 규칙

```prisma
// schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// 모델 정의 규칙
model Product {
  // 1. ID 필드 (항상 첫 번째)
  product_id          BigInt    @id @default(autoincrement())

  // 2. 필수 필드
  product_name        String    @db.VarChar(100)
  product_price       Decimal   @db.Decimal(10, 2)
  product_status      String    @default("inactive") @db.VarChar(20)

  // 3. Foreign Key
  tenant_member_id    BigInt
  category_id         BigInt    @default(0)

  // 4. 타임스탬프
  product_created_at  DateTime  @default(now())
  product_updated_at  DateTime  @updatedAt

  // 5. 관계 정의
  tenant_member       TenantMember @relation(fields: [tenant_member_id], references: [tenant_member_id])
  category            Category     @relation(fields: [category_id], references: [category_id])
  product_images      ProductImage[]

  // 6. 테이블명 매핑
  @@map("product")

  // 7. 인덱스
  @@index([tenant_member_id])
  @@index([category_id])
  @@index([product_status])
}
```

#### 필드 순서 규칙

1. **Primary Key**: ID 필드
2. **필수 필드**: NOT NULL 컬럼
3. **Foreign Key**: 관계 참조 필드
4. **타임스탬프**: created_at, updated_at
5. **관계 정의**: @relation
6. **테이블 설정**: @@map, @@index, @@unique

#### 데이터 타입 선택 가이드

| 용도 | Prisma 타입 | PostgreSQL 타입 | 예시 |
|------|-------------|-----------------|------|
| 고유 ID | BigInt | BIGINT | product_id |
| 짧은 텍스트 | String @db.VarChar(n) | VARCHAR(n) | product_name |
| 긴 텍스트 | String @db.Text | TEXT | product_description |
| 금액 | Decimal @db.Decimal(10,2) | DECIMAL(10,2) | product_price |
| 정수 | Int | INTEGER | product_quantity |
| 불린 | Boolean | BOOLEAN | is_active |
| 날짜시간 | DateTime | TIMESTAMP | created_at |
| JSON | Json | JSONB | metadata |

### 7.2 쿼리 작성 규칙

#### 기본 CRUD

```javascript
// 생성 (Create)
const product = await prisma.product.create({
  data: {
    product_name: '새 상품',
    product_price: 10000,
    tenant_member_id: 1,
    category_id: 1
  }
});

// 조회 (Read)
const products = await prisma.product.findMany();
const product = await prisma.product.findUnique({
  where: { product_id: 1 }
});

// 수정 (Update)
const updated = await prisma.product.update({
  where: { product_id: 1 },
  data: { product_price: 12000 }
});

// 삭제 (Delete)
const deleted = await prisma.product.delete({
  where: { product_id: 1 }
});
```

#### 필드 선택 (Select vs Include)

```javascript
// ✅ 권장: 필요한 필드만 선택
const products = await prisma.product.findMany({
  select: {
    product_id: true,
    product_name: true,
    product_price: true,
    tenant_member: {
      select: {
        tenant: {
          select: {
            tenant_name: true
          }
        }
      }
    }
  }
});

// ❌ 비권장: 모든 필드 조회 (성능 저하)
const products = await prisma.product.findMany();
```

#### 관계 포함 조회

```javascript
// Include: 관계 데이터 전체 포함
const product = await prisma.product.findUnique({
  where: { product_id: 1 },
  include: {
    tenant_member: true,
    category: true,
    product_images: true
  }
});

// Select: 관계 데이터 중 특정 필드만
const product = await prisma.product.findUnique({
  where: { product_id: 1 },
  select: {
    product_name: true,
    category: {
      select: {
        category_name: true
      }
    }
  }
});
```

#### 필터링

```javascript
// 단일 조건
const products = await prisma.product.findMany({
  where: {
    product_status: 'active'
  }
});

// 복합 조건 (AND)
const products = await prisma.product.findMany({
  where: {
    product_status: 'active',
    product_price: {
      gte: 10000,
      lte: 50000
    }
  }
});

// OR 조건
const products = await prisma.product.findMany({
  where: {
    OR: [
      { category_id: 1 },
      { category_id: 2 }
    ]
  }
});

// NOT 조건
const products = await prisma.product.findMany({
  where: {
    NOT: {
      product_status: 'deleted'
    }
  }
});

// 복잡한 조건 조합
const products = await prisma.product.findMany({
  where: {
    AND: [
      { product_status: 'active' },
      {
        OR: [
          { product_price: { lte: 10000 } },
          { category_id: 1 }
        ]
      }
    ]
  }
});
```

#### 정렬 및 페이지네이션

```javascript
// 정렬
const products = await prisma.product.findMany({
  orderBy: {
    product_created_at: 'desc'
  }
});

// 여러 필드 정렬
const products = await prisma.product.findMany({
  orderBy: [
    { product_status: 'asc' },
    { product_created_at: 'desc' }
  ]
});

// 페이지네이션
const page = 2;
const limit = 20;

const products = await prisma.product.findMany({
  skip: (page - 1) * limit,
  take: limit,
  orderBy: { product_created_at: 'desc' }
});
```

#### 집계 쿼리

```javascript
// 개수
const count = await prisma.product.count();
const activeCount = await prisma.product.count({
  where: { product_status: 'active' }
});

// 합계, 평균, 최대, 최소
const result = await prisma.order.aggregate({
  _sum: { order_total_amount: true },
  _avg: { order_total_amount: true },
  _max: { order_total_amount: true },
  _min: { order_total_amount: true },
  _count: true
});

// 그룹화
const groupedOrders = await prisma.order.groupBy({
  by: ['order_status'],
  _count: {
    order_id: true
  },
  _sum: {
    order_total_amount: true
  }
});
```

### 7.3 트랜잭션 처리

#### Sequential Transaction (순차 트랜잭션)

```javascript
// 주문 생성 트랜잭션
async function createOrder(orderData, items) {
  return await prisma.$transaction(async (tx) => {
    // 1. 주문 생성
    const order = await tx.order.create({
      data: orderData
    });

    // 2. 주문 상세 생성
    await tx.orderItem.createMany({
      data: items.map(item => ({
        order_id: order.order_id,
        ...item
      }))
    });

    // 3. 재고 감소
    for (const item of items) {
      await tx.product.update({
        where: { product_id: item.product_id },
        data: {
          product_quantity: {
            decrement: item.quantity
          }
        }
      });
    }

    return order;
  });
}
```

#### Interactive Transaction (대화형 트랜잭션)

```javascript
async function transferCart(userId, targetUserId) {
  return await prisma.$transaction(async (tx) => {
    // 재고 확인
    const cartItems = await tx.cart.findMany({
      where: { member_id: userId },
      include: { product: true }
    });

    for (const item of cartItems) {
      if (item.product.product_quantity < item.cart_quantity) {
        throw new Error(`재고 부족: ${item.product.product_name}`);
      }
    }

    // 장바구니 이전
    await tx.cart.updateMany({
      where: { member_id: userId },
      data: { member_id: targetUserId }
    });

    return cartItems.length;
  });
}
```

### 7.4 성능 최적화

#### N+1 문제 해결

```javascript
// ❌ N+1 문제 발생
const products = await prisma.product.findMany();
for (const product of products) {
  // 각 상품마다 쿼리 실행 (N개의 쿼리)
  const images = await prisma.productImage.findMany({
    where: { product_id: product.product_id }
  });
}

// ✅ Include로 해결 (1개의 쿼리)
const products = await prisma.product.findMany({
  include: {
    product_images: true
  }
});
```

#### 인덱스 활용

```prisma
model Product {
  product_id     BigInt  @id
  product_name   String
  product_status String
  category_id    BigInt

  // 자주 검색되는 필드에 인덱스 추가
  @@index([product_status])
  @@index([category_id])
  @@index([product_status, category_id]) // 복합 인덱스
}
```

#### 부분 데이터 로딩

```javascript
// ✅ 필요한 필드만 선택
const products = await prisma.product.findMany({
  select: {
    product_id: true,
    product_name: true,
    product_price: true
  }
});

// ✅ 관계는 필요한 경우에만
const product = await prisma.product.findUnique({
  where: { product_id: 1 },
  include: {
    product_images: {
      where: { product_image_sequence: 0 },
      take: 1 // 대표 이미지만
    }
  }
});
```

---

## 부록 A. 자주 사용하는 Prisma 쿼리 패턴

### 1. 검색 기능

```javascript
// 부분 일치 검색
const products = await prisma.product.findMany({
  where: {
    product_name: {
      contains: '검색어'
    }
  }
});

// 대소문자 구분 없는 검색 (PostgreSQL)
const products = await prisma.product.findMany({
  where: {
    product_name: {
      contains: '검색어',
      mode: 'insensitive'
    }
  }
});

// 여러 필드 검색
const products = await prisma.product.findMany({
  where: {
    OR: [
      { product_name: { contains: '검색어' } },
      { product_description: { contains: '검색어' } }
    ]
  }
});
```

### 2. 날짜 범위 조회

```javascript
const startDate = new Date('2025-01-01');
const endDate = new Date('2025-12-31');

const orders = await prisma.order.findMany({
  where: {
    order_created_at: {
      gte: startDate,
      lte: endDate
    }
  }
});
```

### 3. Null 처리

```javascript
// NULL인 데이터 조회
const products = await prisma.product.findMany({
  where: {
    product_description: null
  }
});

// NULL이 아닌 데이터 조회
const products = await prisma.product.findMany({
  where: {
    product_description: {
      not: null
    }
  }
});
```

### 4. 배열 필터

```javascript
// IN 조건
const products = await prisma.product.findMany({
  where: {
    category_id: {
      in: [1, 2, 3]
    }
  }
});

// NOT IN 조건
const products = await prisma.product.findMany({
  where: {
    product_status: {
      notIn: ['deleted', 'suspended']
    }
  }
});
```

### 5. 존재 여부 확인

```javascript
// 관계 데이터 존재 여부
const productsWithImages = await prisma.product.findMany({
  where: {
    product_images: {
      some: {} // 이미지가 1개 이상 있는 상품
    }
  }
});

const productsWithoutImages = await prisma.product.findMany({
  where: {
    product_images: {
      none: {} // 이미지가 없는 상품
    }
  }
});
```

### 6. Upsert (있으면 업데이트, 없으면 생성)

```javascript
const cart = await prisma.cart.upsert({
  where: {
    member_id_product_id: {
      member_id: userId,
      product_id: productId
    }
  },
  update: {
    cart_quantity: {
      increment: 1
    }
  },
  create: {
    member_id: userId,
    product_id: productId,
    cart_quantity: 1
  }
});
```

### 7. 일괄 작업

```javascript
// 여러 데이터 생성
await prisma.orderItem.createMany({
  data: [
    { order_id: 1, product_id: 1, quantity: 2 },
    { order_id: 1, product_id: 2, quantity: 1 }
  ]
});

// 여러 데이터 수정
await prisma.product.updateMany({
  where: {
    category_id: 1
  },
  data: {
    product_status: 'inactive'
  }
});

// 여러 데이터 삭제
await prisma.cart.deleteMany({
  where: {
    member_id: userId
  }
});
```

### 8. Raw Query (복잡한 쿼리)

```javascript
// Raw SQL 실행
const result = await prisma.$queryRaw`
  SELECT
    category_id,
    COUNT(*) as product_count,
    AVG(product_price) as avg_price
  FROM product
  WHERE product_status = 'active'
  GROUP BY category_id
`;

// 파라미터 바인딩
const status = 'active';
const result = await prisma.$queryRaw`
  SELECT * FROM product
  WHERE product_status = ${status}
`;
```

---

## 다음 단계

- **API 개발 시**: [04. API 개발 가이드](./04_API_DEVELOPMENT.md)를 참고하세요
- **Repository 패턴**: [04. API 개발 가이드](./04_API_DEVELOPMENT.md#85-repository-작성)에서 Repository 작성법을 확인하세요

---

> [← 목차로 돌아가기](./00_INDEX.md)
