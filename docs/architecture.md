# Architecture Blueprint — Courier & Logistics Platform

This document describes the architectural foundation, boundaries, and scalability blueprint of the **Courier & Logistics Platform**.

---

## 1. Architectural Strategy: The Modular Monolith

Rather than introducing distributed systems complexity (distributed tracing, network partitions, split transactions) during the early MVP phase, this platform uses a **Modular Monolith** architecture:

```text
┌─────────────────────────────────────────────────────────────┐
│                      Express HTTP Engine                    │
├─────────────────────────────────────────────────────────────┤
│  Middleware: Helmet | Strict CORS | RateLimiter | SafeLogger│
├─────────────────────────────────────────────────────────────┤
│                       Modular Domains                       │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────┐  │
│  │    Auth    │ │   Users    │ │  Tracking  │ │Shipments │  │
│  └────────────┘ └────────────┘ └────────────┘ └──────────┘  │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────┐  │
│  │  Pricing   │ │ Delivery   │ │  Payments  │ │Notifs    │  │
│  └────────────┘ └────────────┘ └────────────┘ └──────────┘  │
├─────────────────────────────────────────────────────────────┤
│                     Data & ORM Access                       │
│                  Prisma ORM Client Singleton                │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
                       PostgreSQL 16/17
```

### Key Modular Monolith Principles
1. **Isolated Domain Boundaries**: Each domain (`auth`, `users`, `tracking`, `shipments`) owns its routes, controller, service, and validation logic.
2. **Zero Cross-Module Direct DB Tampering**: Modules communicate via clear service contracts rather than modifying other modules' private data structures.
3. **Microservices Ready**: When traffic scales to millions of shipments, each folder under `src/modules/*` can be extracted into an independent microservice behind an API Gateway with near-zero business logic refactoring.

---

## 2. Multi-Role Authorization Grid

| Role | Accessible Areas | Key Responsibilities |
|---|---|---|
| `CUSTOMER` | `/customer/dashboard`, Public Tracking | Track orders, manage recipient addresses, view delivery history |
| `SELLER` | `/seller/dashboard`, Manifests, Rates | Book consignments, print shipping labels, manage inventory dispatches |
| `ADMIN` | `/admin/dashboard`, All Workspaces | System configuration, database health, audit oversight, global telemetry |
| `OPERATIONS`| `/operations/dashboard`, Sortation | Hub barcode scanning, transit bag creation, cross-dock route allocation |
| `DELIVERY_PARTNER` | `/delivery/dashboard`, Last-Mile | Daily delivery runsheets, doorstep OTP verification, COD collection |

---

## 3. Future Microservices Roadmap

```text
                     API Gateway / Reverse Proxy
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
    Auth Service          Shipment Service        Tracking Service
  (Node / Express)         (Node / Go)            (Fast In-Memory)
         │                       │                       │
         ▼                       ▼                       ▼
    PostgreSQL                 Redis                   Kafka
    (Users/Auth)          (Cache/Queues)         (Streaming Log)
```
