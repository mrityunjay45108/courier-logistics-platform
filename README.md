# Courier & Logistics Platform (Phase 1 MVP)

> **Ship Smarter. Deliver Faster.**  
> A high-performance, enterprise-ready Courier and Logistics Platform designed with a modular monolith architecture, React web console, PostgreSQL persistence with Prisma ORM, and comprehensive role-based access control.

---

## 1. Project Overview

The **Courier & Logistics Platform** provides the core operational infrastructure for handling parcels, dispatches, tracking, merchant manifests, and last-mile deliveries. Built as an autonomous service with clean REST API contracts, it is engineered to easily connect with external E-Commerce applications and scale gracefully.

### Key Capabilities (Phase 1)
- **Modular Monolith Backend**: Domain-separated architecture ready for microservice extraction.
- **Role-Based Workspaces**: Tailored interfaces and RBAC for `CUSTOMER`, `SELLER`, `ADMIN`, `OPERATIONS`, and `DELIVERY_PARTNER`.
- **Public Consignment Tracking**: Fast tracking endpoint and UI displaying live checkpoint milestone timelines.
- **Enterprise Security**: Helmet headers, strict CORS, rate-limiting, bcrypt password hashing, and dual JWT + HTTP-only refresh tokens.
- **Honest MVP Telemetry**: Zero fabricated data; clean zero-state presentations across all operations.
- **Docker-Ready**: Out-of-the-box Compose setup for PostgreSQL 16 and Redis 7.

---

## 2. Tech Stack

### Frontend (`apps/web`)
- **Core**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, PostCSS, Lucide React
- **Routing & State**: React Router v6, TanStack Query v5
- **Form & Validation**: React Hook Form, Zod

### Backend (`apps/api`)
- **Engine**: Node.js v22, Express.js, TypeScript
- **Database & ORM**: PostgreSQL 16/17, Prisma ORM
- **Security & Tokens**: JWT (jsonwebtoken), bcryptjs, Helmet, CORS, express-rate-limit
- **Testing**: Vitest, Supertest

### Monorepo & Tooling
- **Package Manager**: PNPM 11 (Workspace configuration)
- **CI/CD**: GitHub Actions workflow (`.github/workflows/ci.yml`)

---

## 3. Project Structure

```text
courier-logistics-platform/
│
├── apps/
│   ├── api/                    # Express + Prisma Backend
│   │   ├── prisma/             # Schema, migrations, seed script
│   │   ├── src/
│   │   │   ├── config/         # Environment variables & constants
│   │   │   ├── lib/            # Prisma, JWT token, password utilities
│   │   │   ├── middleware/     # Auth, RBAC, error, rate-limit, logging
│   │   │   ├── modules/        # Domain modules (auth, tracking, health, users, etc.)
│   │   │   ├── routes/         # Central router
│   │   │   ├── utils/          # Standard response and AppError classes
│   │   │   ├── app.ts          # Express application factory
│   │   │   └── server.ts       # Server bootstrap & graceful shutdown
│   │   └── tests/              # Vitest test suite
│   │
│   └── web/                    # React + Vite Frontend
│       ├── src/
│       │   ├── components/ui/  # Reusable UI (Button, Card, Input, Badge, etc.)
│       │   ├── hooks/          # useAuth context hook
│       │   ├── layouts/        # PublicLayout, DashboardLayout (responsive drawer)
│       │   ├── pages/
│       │   │   ├── public/     # Landing, Login, Register, Track, About, Contact
│       │   │   └── dashboard/  # Customer, Seller, Admin, Ops, Delivery portals
│       │   ├── routes/         # Protected role-based route definitions
│       │   └── services/       # Central Axios API client with token interceptor
│
├── packages/
│   ├── types/                  # Shared TypeScript interfaces
│   ├── shared/                 # Shared Zod schemas & constants
│   └── config/                 # Shared base tsconfigs
│
├── docs/
│   ├── api-documentation.md    # Detailed API endpoint reference
│   ├── architecture.md         # Architecture blueprint & monolith boundaries
│   └── ecommerce-integration.md# External E-Commerce integration contracts
│
├── docker/
│   ├── Dockerfile.api
│   └── Dockerfile.web
│
├── .github/workflows/ci.yml    # CI build and test pipeline
├── docker-compose.yml          # PostgreSQL & Redis container configuration
├── pnpm-workspace.yaml         # PNPM workspace layout
├── .env.example                # Sanitized environment template
└── package.json                # Monorepo task orchestration
```

---

## 4. Local Development Setup

### Prerequisites
- **Node.js**: `v20.x` or `v22.x` (`v22.18.0` recommended)
- **PNPM**: `11.x` (`npm install -g pnpm`)
- **PostgreSQL**: Local running instance on port `5432` OR Docker Compose

### 1. Clone & Install
```bash
git clone https://github.com/mrityunjay45108/courier-logistics-platform.git
cd courier-logistics-platform
pnpm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env` in the root:
```bash
cp .env.example .env
```
Ensure your `DATABASE_URL` matches your local PostgreSQL credentials:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/courier_db?schema=public"
```

### 3. Database Initialization & Seeding
```bash
# Generate Prisma Client
pnpm db:generate

# Push schema to database
pnpm --filter api db:push

# Seed predefined demo accounts
pnpm db:seed
```

### 4. Run Both Applications (Parallel Dev Mode)
```bash
pnpm dev
```
- **Web Console**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000`
- **Liveness Probe**: `http://localhost:5000/health`
- **Readiness Probe**: `http://localhost:5000/ready`

---

## 5. Pre-seeded Demo Accounts

| Role | Email | Password | Primary Workspace |
|---|---|---|---|
| **ADMIN** | `admin@courier.local` | `Admin@12345` | `/admin/dashboard` |
| **SELLER** | `seller@courier.local` | `Seller@12345` | `/seller/dashboard` |
| **CUSTOMER** | `customer@courier.local` | `Customer@12345` | `/customer/dashboard` |
| **OPERATIONS** | `ops@courier.local` | `Ops@12345` | `/operations/dashboard` |
| **DELIVERY_PARTNER** | `delivery@courier.local` | `Delivery@12345` | `/delivery/dashboard` |

> *Tip: The web login page includes 1-click demo autofill buttons for each of these roles.*

---

## 6. Running with Docker

To spin up isolated PostgreSQL and Redis containers:
```bash
docker compose up -d
```
Check health:
```bash
docker compose ps
```

---

## 7. Testing & Quality Assurance

Run the automated test suite covering authentication, validation, rate limiting, and health probes:
```bash
# Run API test suite
pnpm test

# Run TypeScript strict type-check across all apps and packages
pnpm typecheck

# Build for production
pnpm build
```

---

## 8. Security Highlights

- **No Secrets in Git**: Enforced via strict `.gitignore` rules.
- **Password Safety**: 12-round salted `bcrypt` hashing.
- **Cross-Site Scripting (XSS)**: Mitigated via Helmet headers and React auto-escaping.
- **CSRF & Cookie Theft**: Refresh tokens stored in `httpOnly`, `sameSite: 'lax'` cookies.
- **Brute Force Protection**: Stricter rate limiting applied on `/api/auth/*` endpoints.
- **Centralized Auditing**: Redacted logging preventing credential or token leakages into log outputs.

---

## 9. Recommended Phase 2 Roadmap

1. **Shipment Booking Engine**: Bulk CSV upload, AWB generation, multi-package dimensions calculation.
2. **Dynamic Pricing & Rate Cards**: Distance-based zone matrix (Metro, Regional, National), volumetric weight charging.
3. **E-Commerce Webhooks**: Real-time dispatch, transit, and delivery webhooks to external stores.
4. **Barcode Scanning**: Camera-based scanner on mobile for Hub sortation and Rider runsheets.
5. **Rider Geo-Tracking**: Live GPS coordinates using WebSockets / Redis PubSub.
