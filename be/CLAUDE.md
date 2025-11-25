# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

Fleecat is a **multi-tenant e-commerce platform** backend API that allows multiple sellers (tenants) to manage their own stores within a unified platform. Built with Node.js, Express, Prisma, and Supabase (PostgreSQL).

**Key Domain Concepts**:
- **Member**: End users who can be buyers, sellers, or both
- **Company**: Corporate entities that members can belong to
- **Tenant**: A seller's store/shop (공방) - the core multi-tenancy unit
- **TenantMember**: A member who belongs to a tenant and can sell products
- **Product**: Items sold by tenant members
- **Order/Payment**: Customer purchases with coupon support

---

## Common Commands

### Development
```bash
npm run dev              # Start development server with nodemon
npm start                # Start production server
```

### Database (Prisma)
```bash
npm run prisma:generate  # Generate Prisma Client after schema changes
npm run prisma:migrate   # Create and apply migrations
npm run prisma:studio    # Open Prisma Studio (database GUI)
npm run prisma:seed      # Run seed script
```

### Code Quality
```bash
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint errors automatically
npm test                 # Run all tests with coverage
npm run test:watch       # Run tests in watch mode
```

---

## Architecture

### Layered Architecture Pattern

```
Routes → Middleware → Controller → Service → Repository → Database
```

- **Routes** (`src/routes/`): Define API endpoints and attach middleware
- **Middleware** (`src/middlewares/`): Authentication, validation, error handling
- **Controllers** (`src/controllers/`): Handle HTTP requests/responses, call services
- **Services** (`src/services/`): Business logic, transactions, orchestration
- **Repositories** (`src/repositories/`): Data access layer using Prisma
- **Utils** (`src/utils/`): Shared utilities (response formatters, custom errors, logger)

### Multi-Tenancy Model

This platform uses **shared database, shared schema** multi-tenancy:

1. **Member** can belong to multiple **Tenants** (via `TenantMember` join table)
2. **Product** belongs to a **TenantMember** (not directly to Tenant)
3. Data isolation is handled via FK relationships, not separate databases
4. A member can be both a buyer and a seller across different tenants

**Key Relationships**:
```
Company (1) → (N) Member
Member (N) → (N) Tenant (via TenantMember)
TenantMember (1) → (N) Product
Member (1) → (N) Order
Order (1) → (1) Payment
```

---

## Database Standards

### Naming Conventions

All database variables follow strict conventions defined in `md/db_02_NAMING_DATATYPES.md`:

- **Table names**: Singular, lowercase (e.g., `member`, `product`, not `members` or `Product`)
- **Column names**: `{table}_{column}` format (e.g., `member_id`, `product_status`)
- **Primary keys**: `{table}_id` BIGINT AUTO_INCREMENT
- **Foreign keys**: `{referenced_table}_id`
- **Timestamps**: `{table}_created_at`, `{table}_updated_at` (required on all tables)
- **Status fields**: VARCHAR(20) with standard values:
  - `member_status`: `active`, `suspended`, `inactive`
  - `product_status`: `active`, `sold_out`, `inactive`
  - `order_status`: `pending`, `preparing`, `shipped`, `delivered`, `cancelled`, `refunded`
  - `payment_status`: `pending`, `completed`, `failed`, `cancelled`, `refunded`

**Quick Reference**: See `md/db_01_VARIABLE_REFERENCE.md` for a complete list of commonly used variables.

### Prisma Schema Organization

The schema is organized into 7 logical sections (see `prisma/schema.prisma`):

1. **Members & Company** (5 tables): Member, Company, MemberAddress, MemberPermission, MemberTransaction
2. **Tenants** (3 tables): Tenant, TenantDetail, TenantMember
3. **Categories** (1 table): Category (hierarchical, self-referencing)
4. **Products** (2 tables): Product, ProductImg
5. **Coupons** (1 table): Coupon
6. **Shopping Cart** (1 table): ShoppingCart
7. **Orders & Payments** (2 tables): Order, Payment

### Critical Cascade Policies

- **CASCADE DELETE**: `member_address`, `product_img`, `shopping_cart`, `tenant_member`
- **RESTRICT**: `order`, `payment` (preserve transaction history for legal/audit requirements)

**Important**: See `md/db_03_RELATIONSHIPS.md` for complete FK relationship diagrams and JOIN query examples.

---

## Code Standards

### File Naming

Follow conventions from `md/02_CODING_STANDARDS.md`:

- **Routes**: `{domain}.routes.js` (e.g., `product.routes.js`)
- **Controllers**: `{domain}.controller.js`
- **Services**: `{domain}.service.js`
- **Repositories**: `{domain}.repository.js`
- **Middleware**: `{function}.js` (e.g., `auth.js`, `validation.js`)
- **Tests**: `{target}.test.js`

### API Response Format

All API responses use standardized format from `src/utils/response.js`:

**Success**:
```javascript
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

**Error**:
```javascript
{
  "success": false,
  "message": "Error description",
  "errors": [ ... ]  // Optional validation errors
}
```

### Error Handling

Use custom error classes from `src/utils/errors.js`:
- `ValidationError` (400)
- `NotFoundError` (404)
- `UnauthorizedError` (401)

All errors are caught by the central error handler in `src/middlewares/errorHandler.js`.

---

## Development Guidelines

### When Creating New Features

1. **Check documentation first**: Review `md/` guides, especially:
   - `md/01_README.md` for project structure
   - `md/02_CODING_STANDARDS.md` for naming and code style
   - `md/04_API_DEVELOPMENT.md` for API patterns

2. **Database changes**:
   - Update `prisma/schema.prisma` following naming conventions
   - Run `npm run prisma:migrate` to create migration
   - Run `npm run prisma:generate` to update Prisma Client

3. **Follow layered architecture**:
   - Create route → controller → service → repository in order
   - Never skip layers (e.g., don't call repository from controller)

4. **Authentication & Authorization**:
   - Use `authenticate` middleware for protected routes
   - Use `authorize(...roles)` for role-based access
   - JWT tokens are managed via `middlewares/auth.js`

### Testing

- Write unit tests for services using Jest mocks
- Write integration tests for API endpoints using `supertest`
- See `md/05_TESTING_DEPLOYMENT.md` for test patterns

---

## Important Notes

### Multi-Tenant Data Access

When querying products, orders, or tenant-specific data:

1. **Always filter by tenant context** to prevent data leakage
2. Products belong to `TenantMember`, not `Tenant` directly
3. Use Prisma's nested `include` to fetch tenant/seller info:

```javascript
const products = await prisma.product.findMany({
  include: {
    tenant_member: {
      include: {
        tenant: true,
        member: true  // seller info
      }
    }
  }
});
```

### Common Pitfalls

1. **Don't bypass Prisma**: Always use Prisma Client, not raw SQL (unless absolutely necessary)
2. **Respect CASCADE policies**: Deleting a member will cascade delete their addresses, permissions, transactions - this is intentional
3. **NULL-able FKs**: `company_id` on Member, `shopping_cart_id` on Order, `coupon_id` on Order are nullable by design
4. **Unique constraints**:
   - `member_email`, `member_nickname` must be unique
   - `(member_id, product_id)` on ShoppingCart prevents duplicate cart items

---

## Documentation

Comprehensive guides are in the `md/` directory:

- **Backend Standards**: `md/01_README.md` through `md/06_COLLABORATION.md`
- **Database Variables**: `md/db_00_INDEX.md` through `md/db_03_RELATIONSHIPS.md`

**Always check these docs before implementing new features or making architectural decisions.**

---

## Environment Variables

Required variables (see `.env.example`):
- `DATABASE_URL`: PostgreSQL connection string (Supabase)
- `DIRECT_URL`: Direct PostgreSQL connection (for migrations)
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `JWT_SECRET`: Secret for JWT token signing
- `ALLOWED_ORIGINS`: CORS allowed origins (comma-separated)
- `NODE_ENV`: `development` or `production`

---

## Deployment

- **Platform**: Railway
- **Database**: Supabase (PostgreSQL)
- **Before deploying**: Run tests (`npm test`) and ensure migrations are applied
- **Post-deployment**: Verify health endpoint at `/health`
