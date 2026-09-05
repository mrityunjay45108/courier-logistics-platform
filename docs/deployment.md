# Production Deployment Guide

This document defines the deployment architecture, containerization standards, database migration procedure, health verification, and rollback runbook for the **Courier & Logistics Management Platform**.

---

## 1. Deployment Architecture

The platform is designed as a production-grade containerized system:

`mermaid
flowchart TD
    CLIENT[Browser / E-Commerce Client] --> INGRESS[Reverse Proxy / Nginx / ALB]
    
    subgraph Container Cluster
        WEB[courier-web:production<br/>Nginx 80]
        API[courier-api:production<br/>Node.js 22 5000]
    end
    
    subgraph Managed Services
        PG[(Managed PostgreSQL<br/>Port 5432 / 6543)]
        REDIS[(Upstash / Managed Redis<br/>Port 6379)]
        KAFKA[(Aiven Kafka 4.2.1<br/>Strict 5 Topics)]
    end
    
    INGRESS -->|Static Assets / SPA| WEB
    INGRESS -->|/api & /health| API
    API -->|Prisma Client| PG
    API -->|Replay Cache & Limits| REDIS
    API -->|Outbox & Events| KAFKA
`

- **Frontend Container (courier-web)**: Multi-stage build compiled with Vite and served through an optimized 
ginx:alpine image with SPA routing fallbacks, Gzip compression, and HTTP security headers.
- **Backend Container (courier-api)**: Multi-stage build running Node.js 22 Alpine under a non-root 
ode user with dumb-init for signal forwarding and native Docker healthcheck probes.
- **Managed Tiers**: Decoupled external PostgreSQL, Redis, and Aiven Kafka cluster (strictly adhering to the 5 permitted topics quota).

---

## 2. Pre-Deployment Verification

Before triggering any production deployment, execute the local/CI verification pipeline:

`ash
# 1. Dependency integrity
pnpm install --frozen-lockfile

# 2. Type checking across workspace
pnpm typecheck

# 3. Code formatting and linting
pnpm lint

# 4. Automated test suite execution
pnpm test

# 5. Production build artifacts
pnpm build
`

---

## 3. Database Migration Strategy (prisma migrate deploy)

> [!IMPORTANT]
> **Zero Destructive Migrations:** Production environments must **NEVER** run prisma migrate dev or prisma db push. Always execute prisma migrate deploy, which applies only committed, forward-compatible SQL migrations in pps/api/prisma/migrations/.

### Migration Execution Procedure
Run migrations prior to traffic cutover:

`ash
# Execute pending migrations
pnpm db:migrate:deploy
`

The migration engine tracks executed migrations in the _prisma_migrations table, ensuring idempotency and zero duplicate execution.

---

## 4. Container Build & Push

Build multi-stage production images using root build contexts:

`ash
# Build API Container
docker build -f docker/Dockerfile.api -t courier-api:v1.0.0 -t courier-api:latest .

# Build Web Container
docker build -f docker/Dockerfile.web -t courier-web:v1.0.0 -t courier-web:latest .
`

---

## 5. Health Verification & Smoke Testing

Immediately upon container startup, verify service readiness:

1. **Liveness Probe:**
   `ash
   curl -f http://localhost:5000/health/live
   # Expected: HTTP 200 {"success":true,"data":{"status":"UP","uptimeSec":...}}
   `
2. **Readiness Probe:**
   `ash
   curl -f http://localhost:5000/health/ready
   # Expected: HTTP 200 {"success":true,"data":{"status":"READY","database":"CONNECTED","redis":"CONNECTED","kafka":"CONNECTED"}}
   `
3. **Web Frontend Health:**
   `ash
   curl -f http://localhost/healthz
   # Expected: HTTP 200 "OK"
   `

---

## 6. Rollback Runbook

If a critical degradation or error spike occurs post-deployment:

1. **Traffic Reversion:**
   - Redirect ingress traffic back to the previous stable container image tag (e.g., 0.9.9).
2. **Database Backward Compatibility:**
   - All migrations must adhere to the **Expand and Contract** pattern (add columns as nullable, never drop active columns during deployment).
3. **Outbox Recovery Post-Rollback:**
   - The Transactional Outbox worker safely handles events regardless of container versions because event payloads adhere to versioned envelope schemas (1.0.0).
