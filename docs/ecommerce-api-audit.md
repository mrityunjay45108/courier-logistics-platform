# Courier Platform — E-Commerce Integration API Audit

This document provides a technical audit of all currently implemented backend APIs in `courier-logistics-platform`, evaluated specifically for integration with a separate external E-Commerce application.

---

## 1. Architecture Overview

The platform is structured as a **Modular Monolith** using Express.js, TypeScript, Prisma ORM, and Supabase PostgreSQL.

- **Monorepo Structure**:
  - `apps/api`: Express REST API backend (Port `5000`, Base path `/api`).
  - `apps/web`: React / Vite dashboard & tracking frontend (Port `5173`).
  - `packages/types`: Shared TypeScript domain models & DTOs.
  - `packages/shared`: Shared Zod validation schemas.
- **Database**: PostgreSQL with connection pooling via PgBouncer.
- **Communication Protocol**: JSON REST over HTTP/1.1; Server-Sent Events (SSE) for tracking timeline streaming.

---

## 2. Base URL & Environments

- **Base URL**: `http://localhost:5000/api` (or custom host defined by `PORT` & `FRONTEND_URL`)
- **Root Diagnostic Routes**:
  - `GET /health`: Liveness probe (`{ status: "UP" }`).
  - `GET /ready`: Readiness probe (Validates live PostgreSQL connection).
  - `GET /version`: Build and environment version information.

---

## 3. Authentication & Authorization

### Current Implementation
- **Mechanism**: JSON Web Token (JWT) Bearer Authentication.
- **Header Required**: `Authorization: Bearer <accessToken>`
- **Token Lifecycle**:
  - Access Token: Short-lived (`15m`), signed via `JWT_ACCESS_SECRET`.
  - Refresh Token: Long-lived (`7d`), signed via `JWT_REFRESH_SECRET`, stored in `RefreshToken` database table and httpOnly cookie `courier_refresh_token`.
- **RBAC (Roles)**: `CUSTOMER`, `SELLER`, `DELIVERY_PARTNER`, `OPERATIONS`, `ADMIN`.
- **Identity Context**: Attached to Express request as `req.user: { id, userId, email, role, ... }`.

### Evaluation for External E-Commerce Server-to-Server Integration
- **Server-to-Server API Key Auth (`X-Api-Key`)**: `NOT IMPLEMENTED`.
- **OAuth2 / Client Credentials**: `NOT IMPLEMENTED`.
- **Current Integration Workaround**: The E-Commerce backend must authenticate as a registered `SELLER` or `ADMIN` account using `POST /api/auth/login`, cache the Bearer `accessToken`, and refresh it every 15 minutes via `POST /api/auth/refresh`.

---

## 4. Complete API Inventory (72 Implemented Routes)

### A. Health & Diagnostics (`modules/health`)
1. `GET /health` (and `GET /api/health`) — Liveness probe (Public)
2. `GET /ready` (and `GET /api/ready`) — Readiness probe with DB ping (Public)
3. `GET /version` (and `GET /api/version`) — Service version information (Public)

### B. Authentication & Sessions (`modules/auth` — Prefix: `/api/auth`)
4. `POST /api/auth/register` — Register customer account (Public, Rate Limited: 30 req/15m)
5. `POST /api/auth/login` — Login with email/password, issues JWT tokens (Public, Rate Limited)
6. `POST /api/auth/refresh` — Refresh access token via cookie or body token (Public)
7. `POST /api/auth/logout` — Revoke active refresh token (Public)
8. `POST /api/auth/forgot-password` — Send reset email via Resend (Public, Rate Limited)
9. `POST /api/auth/reset-password` — Verify reset token and set new password (Public, Rate Limited)
10. `GET /api/auth/me` — Return authenticated user identity (Authenticated)
11. `POST /api/auth/logout-all` — Revoke all device sessions for current user (Authenticated)
12. `GET /api/auth/sessions` — List active device sessions with IP and User-Agent (Authenticated)
13. `DELETE /api/auth/sessions/:id` — Revoke specific session (Authenticated)

### C. Users & Address Book (`modules/users` — Prefix: `/api/users`)
14. `GET /api/users/me` — Get profile details (Authenticated)
15. `PATCH /api/users/me` — Update name, phone, company name (Authenticated)
16. `POST /api/users/change-password` — Change password with current password check (Authenticated)
17. `GET /api/users/addresses` — List saved addresses for current user (Authenticated)
18. `POST /api/users/addresses` — Create address in user's address book (Authenticated)
19. `GET /api/users/addresses/:id` — Get single address (Authenticated, IDOR protected)
20. `PUT /api/users/addresses/:id` — Update address (Authenticated, IDOR protected)
21. `DELETE /api/users/addresses/:id` — Delete address (Authenticated, IDOR protected)
22. `PATCH /api/users/addresses/:id/default` — Set address as default (Authenticated, IDOR protected)
23. `GET /api/users/admin/users` — Paginated user directory (Authenticated, Role: `ADMIN`)
24. `GET /api/users/admin/users/:id` — View detailed user account (Authenticated, Role: `ADMIN`)
25. `PATCH /api/users/admin/users/:id/status` — Activate/Deactivate user account (Authenticated, Role: `ADMIN`)

### D. Shipments & Orders (`modules/shipments` — Prefix: `/api/shipments`)
26. `POST /api/shipments` — Book shipment with package specs, address snapshots, and server-side quote calculation (Authenticated)
27. `GET /api/shipments` — Paginated shipments list with filters (Authenticated, scoped to caller role)
28. `GET /api/shipments/:id` — Full consignment detail by UUID (Authenticated, scoped to owner/admin)
29. `PATCH /api/shipments/:id/cancel` — Cancel pre-pickup shipment (Authenticated, pre-pickup validation)
30. `PATCH /api/shipments/:id/status` — Status override with state machine check (Authenticated, Roles: `ADMIN`, `OPERATIONS`)

### E. Pricing & Rate Engine (`modules/pricing` — Prefix: `/api/pricing`)
31. `POST /api/pricing/quote` — Calculate authoritative shipping quote with volumetric weight, slabs, fuel surcharge, COD fee, and GST (Public / Optional Authenticated)
32. `GET /api/pricing/serviceability/:pincode` — Check pincode coverage and shipping zone (Public)
33. `GET /api/pricing/admin/zones` — List shipping zones (Authenticated, Roles: `ADMIN`, `OPERATIONS`)
34. `GET /api/pricing/admin/rate-cards` — List pricing rate cards (Authenticated, Roles: `ADMIN`, `OPERATIONS`)
35. `GET /api/pricing/admin/serviceability` — List serviceable pincodes (Authenticated, Roles: `ADMIN`, `OPERATIONS`)

### F. Tracking & Timeline (`modules/tracking` — Prefix: `/api/tracking`)
36. `GET /api/tracking/:trackingNumber` — Public tracking inquiry with PII masking, ETA, and checkpoint history (Public, Rate Limited: 60 req/min)
37. `GET /api/tracking/stream/:trackingNumber` — Live real-time Server-Sent Events (SSE) stream (Public)

### G. Pickup Operations (`modules/pickup` — Prefix: `/api/pickups`)
38. `POST /api/pickups/schedule` — Schedule pickup window for shipment (Authenticated)
39. `PATCH /api/pickups/:id/reschedule` — Reschedule pickup (Authenticated)
40. `POST /api/pickups/:id/attempts` — Record pickup attempt result (Authenticated, Roles: `ADMIN`, `OPERATIONS`, `DELIVERY_PARTNER`)
41. `GET /api/pickups` — List pickups (Authenticated, Roles: `ADMIN`, `OPERATIONS`)

### H. Delivery Operations (`modules/delivery` — Prefix: `/api/deliveries`)
42. `POST /api/deliveries/schedule` — Schedule delivery date (Authenticated, Roles: `ADMIN`, `OPERATIONS`)
43. `POST /api/deliveries/:id/attempts` — Record delivery attempt / Proof of Delivery (Authenticated, Roles: `ADMIN`, `OPERATIONS`, `DELIVERY_PARTNER`)
44. `GET /api/deliveries` — List deliveries (Authenticated, Roles: `ADMIN`, `OPERATIONS`)

### I. Delivery Partners / Riders (`modules/delivery-partners` — Prefix: `/api/delivery-partners`)
45. `GET /api/delivery-partners/me` — Rider profile (Authenticated, Role: `DELIVERY_PARTNER`)
46. `PATCH /api/delivery-partners/availability` — Toggle status: `AVAILABLE`, `BUSY`, `OFFLINE` (Authenticated, Role: `DELIVERY_PARTNER`)
47. `GET /api/delivery-partners/tasks` — List assigned tasks (Authenticated, Role: `DELIVERY_PARTNER`)
48. `GET /api/delivery-partners/manifest` — Manifest task list (Authenticated, Role: `DELIVERY_PARTNER`)
49. `PATCH /api/delivery-partners/tasks/:id` — Update task status with POD info (Authenticated, Role: `DELIVERY_PARTNER`)
50. `GET /api/delivery-partners/admin` — List all riders (Authenticated, Roles: `ADMIN`, `OPERATIONS`)
51. `POST /api/delivery-partners/admin/assign` — Dispatch task to rider (Authenticated, Roles: `ADMIN`, `OPERATIONS`)

### J. Payments & COD (`modules/payments` — Prefix: `/api/payments`)
52. `POST /api/payments/webhook` — Inbound payment gateway webhook with HMAC verification (Public)
53. `POST /api/payments/orders` — Create payment order for prepaid shipment (Authenticated)
54. `POST /api/payments/verify` — Verify online payment transaction (Authenticated)
55. `POST /api/payments/cod/:shipmentId/collect` — Record Cash/UPI COD collection (Authenticated, Roles: `DELIVERY_PARTNER`, `ADMIN`, `OPERATIONS`)
56. `GET /api/payments/admin/orders` — List payment orders (Authenticated, Roles: `ADMIN`, `OPERATIONS`)
57. `GET /api/payments/admin/cod` — List COD orders and balances (Authenticated, Roles: `ADMIN`, `OPERATIONS`)
58. `POST /api/payments/admin/refund` — Issue refund (Authenticated, Roles: `ADMIN`, `OPERATIONS`)

### K. Returns & RTO (`modules/returns` — Prefix: `/api/returns`)
59. `POST /api/returns` — Create customer return for delivered consignment (Authenticated)
60. `GET /api/returns` — List returns (Authenticated)
61. `GET /api/returns/:id` — Get return detail (Authenticated)
62. `PATCH /api/returns/admin/:id/approve` — Approve return request (Authenticated, Roles: `ADMIN`, `OPERATIONS`)
63. `PATCH /api/returns/admin/:id/reject` — Reject return request (Authenticated, Roles: `ADMIN`, `OPERATIONS`)
64. `POST /api/returns/admin/:id/inspection` — Record item condition inspection (Authenticated, Roles: `ADMIN`, `OPERATIONS`)
65. `POST /api/returns/admin/shipments/:shipmentId/rto` — Trigger Return to Origin (Authenticated, Roles: `ADMIN`, `OPERATIONS`)

### L. Admin & Operations Hub (`modules/admin` — Prefix: `/api/admin`)
66. `GET /api/admin/dashboard/summary` — Aggregate KPI metrics from DB (Authenticated, Roles: `ADMIN`, `OPERATIONS`)
67. `GET /api/admin/search` — Multi-model global search querying Shipments, Tasks, Partners, Returns (Authenticated, Roles: `ADMIN`, `OPERATIONS`)
68. `GET /api/admin/exceptions` — Exception management ledger (Authenticated, Roles: `ADMIN`, `OPERATIONS`)
69. `PATCH /api/admin/exceptions/:id/resolve` — Resolve operational exception (Authenticated, Roles: `ADMIN`, `OPERATIONS`)
70. `GET /api/admin/activity` — System audit activity stream (Authenticated, Roles: `ADMIN`, `OPERATIONS`)
71. `GET /api/admin/system-health` — Real-time telemetry, memory, DB latency (Authenticated, Roles: `ADMIN`, `OPERATIONS`)

### M. Notifications Placeholder (`modules/notifications` — Prefix: `/api/notifications`)
72. `GET /api/notifications` — Stub endpoint returning `{ notifications: [], unreadCount: 0 }` (Authenticated)

---

## 5. E-Commerce Integration Analysis

### A. E-Commerce $\rightarrow$ Courier Endpoints

| Purpose | Method | Full Endpoint Path | Auth Required | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Check Serviceability** | `GET` | `/api/pricing/serviceability/:pincode` | None (Public) | **READY** |
| **Get Shipping Quote** | `POST` | `/api/pricing/quote` | Optional (`Bearer`) | **READY** |
| **Create Shipment** | `POST` | `/api/shipments` | `Bearer <accessToken>` | **NEEDS FIX** |
| **Get Shipment** | `GET` | `/api/shipments/:id` | `Bearer <accessToken>` | **NEEDS FIX** |
| **Track Shipment** | `GET` | `/api/tracking/:trackingNumber` | None (Public) | **READY** |
| **Cancel Shipment** | `PATCH` | `/api/shipments/:id/cancel` | `Bearer <accessToken>` | **NEEDS FIX** |
| **Generate Shipping Label** | — | `/api/shipments/:id/label` | — | **NOT IMPLEMENTED** |
| **Create Return** | `POST` | `/api/returns` | `Bearer <accessToken>` | **NEEDS FIX** |
| **Initiate RTO** | `POST` | `/api/returns/admin/shipments/:shipmentId/rto` | `Bearer <adminToken>` | **NEEDS FIX** |

---

## 6. Courier $\rightarrow$ E-Commerce Webhooks

- **Status**: `NOT IMPLEMENTED`
- **Audit Findings**:
  - The platform has an **inbound** payment gateway webhook receiver at `POST /api/payments/webhook`.
  - The platform has an **in-memory event emitter** (`trackingPublisher` in `tracking-publisher.ts`) that powers a public Server-Sent Events (SSE) feed (`GET /api/tracking/stream/:trackingNumber`).
  - There is **no outbound HTTP webhook dispatcher** to post consignment status events (e.g. `SHIPMENT_DISPATCHED`, `OUT_FOR_DELIVERY`, `DELIVERED`, `DELIVERY_FAILED`, `RTO_INITIATED`) to an external E-Commerce webhook listener URL.
  - There is **no webhook subscription model** (e.g. storing target URL, client secret, event subscriptions).

---

## 7. Deep-Dive: Best Shipment Creation API

### Endpoint
`POST /api/shipments`

### Authentication & Role
- **Auth**: `Authorization: Bearer <accessToken>`
- **Accepted Roles**: Any authenticated user (`CUSTOMER` or `SELLER`).
  - If authenticated user has role `SELLER`, `sellerId` is populated with `userId`.
  - If role `CUSTOMER`, `customerId` is populated with `userId`.

### Request Schema (`createShipmentSchema`)
```json
{
  "externalOrderId": "ECOMM-ORD-109482",
  "pickupAddress": {
    "name": "Warehouse Dispatch Hub",
    "phone": "+919876543210",
    "addressLine1": "Plot 42, Industrial Area Phase 2",
    "addressLine2": "Near Container Depot",
    "city": "Patna",
    "state": "Bihar",
    "postalCode": "800001",
    "country": "India"
  },
  "deliveryAddress": {
    "name": "Customer Name",
    "phone": "+919123456780",
    "addressLine1": "Flat 302, Green Valley Apartments",
    "city": "Noida",
    "state": "Uttar Pradesh",
    "postalCode": "201301",
    "country": "India"
  },
  "package": {
    "weight": 1.5,
    "length": 25,
    "width": 20,
    "height": 15,
    "packageType": "PARCEL",
    "description": "Footwear"
  },
  "shipmentType": "COD",
  "codAmount": 1499.00,
  "notes": "Call customer prior to delivery"
}
```

### Server Execution Logic
1. Validates payload using Zod (`createShipmentSchema`).
2. Calculates authoritative shipping freight server-side using `pricingService.calculateQuote`.
3. Generates a unique tracking number (`CRL-XXXXXXXX`).
4. Executes atomic PostgreSQL transaction:
   - Inserts `Shipment` with `externalOrderId`.
   - Inserts `ShipmentPackage`.
   - Inserts immutable pickup snapshot (`ShipmentAddress` type `PICKUP`).
   - Inserts immutable delivery snapshot (`ShipmentAddress` type `DELIVERY`).
   - Inserts initial `TrackingEvent` (`SHIPMENT_CREATED`).
   - If `COD`, inserts initial `CODOrder` (`status: PENDING`).
   - Inserts `AuditLog` entry.
5. Emits tracking publisher event.

### Why this API currently "NEEDS FIX" for External E-Commerce Integration:
1. **Idempotency**: Repeated `POST /api/shipments` calls with the same `externalOrderId` create new shipments and generate new tracking numbers. It does not deduplicate or return the existing shipment.
2. **Authentication**: External systems must acquire a user JWT Bearer token instead of using an API Key.
3. **Lookup by External Order ID**: There is currently no endpoint to retrieve the created shipment directly by `externalOrderId` (e.g. `GET /api/shipments/by-order/:externalOrderId` does not exist). The lookup endpoint `GET /api/shipments/:id` strictly requires the internal database UUID.

---

## 8. Database Field Mapping & Order IDs

The database models store identifiers as follows:

| Identifier Concept | DB Model | DB Field Name | Type | Unique? | Indexed? | Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Internal Primary Key** | `Shipment` | `id` | `UUID` | **Yes** (`@id`) | Yes | Internal database identifier |
| **Customer-Facing Tracking #** | `Shipment` | `trackingNumber` | `String` | **Yes** (`@unique`) | Yes | Public code (`CRL-XXXXXXXX`) |
| **E-Commerce Order ID** | `Shipment` | `externalOrderId` | `String?` | **No** | **Yes** (`@@index`) | External order identifier |
| **Carrier Name** | `Shipment` | `carrier` | `String` | No | No | Defaults to `Apex Express Logistics` |
| **Third-Party Provider AWB** | — | — | — | — | — | `NOT IMPLEMENTED` (Phase 12) |
| **Third-Party Provider ID** | — | — | — | — | — | `NOT IMPLEMENTED` (Phase 12) |

---

## 9. Shipment Lifecycle & State Transition Audit

Centralized state machine location:
`apps/api/src/modules/shipments/shipment-state.service.ts`

### Statuses & Allowed Transitions:
```
DRAFT              ──►  CREATED, CANCELLED
CREATED            ──►  PICKUP_SCHEDULED, CANCELLED
PICKUP_SCHEDULED   ──►  PICKED_UP, CANCELLED, CREATED
PICKED_UP          ──►  IN_TRANSIT, CANCELLED
IN_TRANSIT         ──►  OUT_FOR_DELIVERY, FAILED_DELIVERY, RETURN_INITIATED
OUT_FOR_DELIVERY   ──►  DELIVERED, FAILED_DELIVERY
DELIVERED          ──►  RETURN_INITIATED
FAILED_DELIVERY    ──►  OUT_FOR_DELIVERY, RETURN_INITIATED
RETURN_INITIATED   ──►  RETURNED
RETURNED           ──►  [Terminal State]
CANCELLED          ──►  [Terminal State]
```

### Who and What Changes Each Status:
- `CREATED`: `POST /api/shipments`
- `PICKUP_SCHEDULED`: `POST /api/pickups/schedule`
- `PICKED_UP`: `POST /api/pickups/:id/attempts` (Status: `SUCCESS`)
- `IN_TRANSIT`: `PATCH /api/shipments/:id/status` (Admin / Operations)
- `OUT_FOR_DELIVERY`: `POST /api/deliveries/:id/attempts` or `PATCH /api/delivery-partners/tasks/:id` (`STARTED`)
- `DELIVERED`: `POST /api/deliveries/:id/attempts` (`SUCCESS`) or `PATCH /api/delivery-partners/tasks/:id` (`COMPLETED`)
- `FAILED_DELIVERY`: `POST /api/deliveries/:id/attempts` (`FAILED`)
- `CANCELLED`: `PATCH /api/shipments/:id/cancel` (Allowed only if status is `DRAFT`, `CREATED`, or `PICKUP_SCHEDULED`)
- `RETURN_INITIATED`: `POST /api/returns` (Customer) or `POST /api/returns/admin/shipments/:shipmentId/rto` (Admin/Ops RTO)
- `RETURNED`: `POST /api/returns/admin/:id/inspection` or `PATCH /api/shipments/:id/status`

---

## 10. Tracking API Audit

### Endpoint
`GET /api/tracking/:trackingNumber`

- **Authentication**: None (Public endpoint).
- **Rate Limit**: 60 requests / minute per IP via `trackingLimiter`.
- **Accepted Input**: Exact `trackingNumber` (e.g. `CRL-8F4K2P9X`). Does **not** accept internal UUID `id` or `externalOrderId`.
- **PII Privacy Masking**: Enabled. Street addresses, phone numbers, and recipient names are removed; only `originCity` and `destinationCity` are exposed.
- **Estimated Delivery Date (ETA)**: Computed deterministically based on creation date and origin-to-destination zone distance.
- **Sample Output**:
```json
{
  "success": true,
  "data": {
    "trackingNumber": "CRL-8F4K2P9X",
    "status": "IN_TRANSIT",
    "carrier": "Apex Express Logistics",
    "originCity": "Patna, Bihar",
    "destinationCity": "Noida, Uttar Pradesh",
    "estimatedDeliveryDate": "2026-09-07T12:00:00.000Z",
    "lastUpdatedAt": "2026-09-03T16:00:00.000Z",
    "timeline": [
      {
        "id": "event-uuid",
        "status": "CREATED",
        "eventType": "SHIPMENT_CREATED",
        "title": "Shipment Created",
        "description": "Consignment created and label generated (REGIONAL)",
        "location": "Patna, Bihar",
        "createdAt": "2026-09-03T11:00:00.000Z"
      }
    ]
  },
  "message": "Tracking details retrieved successfully"
}
```

---

## 11. Pricing & Serviceability Audit

### Pincode Serviceability Check
`GET /api/pricing/serviceability/:pincode`
- **Auth**: Public
- **Response**: Returns zone code (`LOCAL`, `REGIONAL`, `NATIONAL`, `REMOTE`), city, state, and `codAvailable: boolean`.

### Shipping Rate Calculation (Checkout Quote)
`POST /api/pricing/quote`
- **Auth**: Public (or optional `Bearer` token)
- **Request Parameters**:
  - `pickupPincode`: string (e.g. `"110001"`)
  - `deliveryPincode`: string (e.g. `"800001"`)
  - `weight`: number in kg (e.g. `1.5`)
  - `length`, `width`, `height`: numbers in cm (e.g. `25, 20, 15`)
  - `shipmentType`: `'PREPAID'` or `'COD'`
  - `codAmount`: number (required if COD)
- **Calculation Rules**:
  - Volumetric Weight: `(length * width * height) / 5000`
  - Chargeable Weight: `Math.max(weight, volumetricWeight)` rounded up to nearest `0.5 kg` slab.
  - Surcharges: Fuel surcharge (percentage or fixed per rate card).
  - COD Fee: Base fixed fee + percentage of COD value.
  - Tax: 18% GST on freight and surcharges.
- **Output**:
```json
{
  "success": true,
  "data": {
    "quoteNumber": "QTE-1788432190-1234",
    "zone": "REGIONAL",
    "actualWeight": 1.5,
    "volumetricWeight": 1.5,
    "chargeableWeight": 1.5,
    "baseShipping": 60.0,
    "additionalWeightCharge": 40.0,
    "fuelSurcharge": 10.0,
    "codFee": 30.0,
    "tax": 25.2,
    "total": 165.2,
    "currency": "INR"
  },
  "message": "Shipping quote calculated successfully"
}
```

---

## 12. Idempotency Audit

| Operation | Idempotency Supported? | Mechanism |
| :--- | :--- | :--- |
| `POST /api/shipments` | **NO** (`NOT IMPLEMENTED`) | No header checking; duplicates created on retries |
| `POST /api/payments/webhook` | **YES** | Keyed on `provider + providerEventId` in `PaymentWebhookEvent` |
| `PATCH /api/shipments/:id/cancel`| **PARTIAL** | Validates status; throws `400` if already cancelled |
| `POST /api/returns` | **PARTIAL** | Rejects if a return is already active for shipment |

---

## 13. Webhook Security Audit

- **Inbound Webhooks (`POST /api/payments/webhook`)**:
  - Supported header: `x-webhook-signature` or `x-razorpay-signature`.
  - Secret: `PAYMENT_WEBHOOK_SECRET` from environment.
  - Deduplication: Unique constraint on `[provider, providerEventId]`.
- **Outbound Webhooks**:
  - `NOT IMPLEMENTED`.

---

## 14. Error Response Format

Standardized error response returned by Express error middleware:

```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      {
        "field": "deliveryAddress.postalCode",
        "message": "String must contain at least 3 character(s)"
      }
    ]
  },
  "timestamp": "2026-09-03T12:00:00.000Z"
}
```

### HTTP Status Codes Used:
- `400` (`BAD_REQUEST`): Invalid state transition or parameter.
- `401` (`UNAUTHORIZED`): Missing or invalid JWT.
- `403` (`FORBIDDEN`): Role insufficient or cross-tenant ownership violation.
- `404` (`NOT_FOUND`): Record does not exist.
- `409` (`CONFLICT`): Unique constraint collision.
- `422` (`VALIDATION_ERROR`): Zod schema validation errors.
- `429` (`RATE_LIMIT_EXCEEDED`): Rate limit exceeded.
- `500` (`INTERNAL_SERVER_ERROR`): Unhandled server exception.
- `503` (`SERVICE_UNAVAILABLE`): Database disconnected.

---

## 15. CORS Audit

- **Implementation**: Express `cors()` package in `apps/api/src/app.ts`.
- **Allowed Origins**: Reads `config.corsOrigin` (`CORS_ORIGIN` env var).
- **Credentials**: `credentials: true` enabled.
- **Server-to-Server Note**: CORS is enforced by web browsers. Backend HTTP calls from an E-Commerce server (Node.js, Python, PHP, Ruby) do not send browser `Origin` headers and are unaffected by CORS.

---

## 16. Rate Limiting Audit

- **Auth endpoints**: 30 requests per 15 minutes (`authLimiter`).
- **Public tracking**: 60 requests per 1 minute (`trackingLimiter`).
- **Shipment creation**: No rate limit currently applied.
- **Pricing quote**: No rate limit currently applied.

---

## 17. E-Commerce Integration Gap Analysis

### Category 1: READY (Can be used immediately)
1. `GET /api/pricing/serviceability/:pincode`: Pincode check during customer address entry.
2. `POST /api/pricing/quote`: Real-time shipping rates during e-commerce checkout.
3. `GET /api/tracking/:trackingNumber`: Public order tracking link for customers.
4. `GET /api/tracking/stream/:trackingNumber`: SSE live stream for customer frontend.

### Category 2: NEEDS FIX (Existing but needs adjustments for clean integration)
1. `POST /api/shipments`:
   - Needs server-to-server authentication (e.g. `X-Api-Key` or persistent system token).
   - Needs `Idempotency-Key` header support or strict unique check on `(sellerId, externalOrderId)`.
2. `GET /api/shipments/:id`:
   - Currently requires knowing the Courier Platform's internal UUID.
   - Needs ability to query by `externalOrderId` (e.g. `GET /api/shipments/by-order/:externalOrderId`).
3. `PATCH /api/shipments/:id/cancel`:
   - Currently requires internal UUID.
4. `POST /api/returns`:
   - Requires internal shipment UUID rather than order ID or tracking number.

### Category 3: MISSING (Not yet implemented)
1. **Shipping Label API**: No endpoint to generate or download shipping labels (`/api/shipments/:id/label`).
2. **Outbound Webhooks**: No HTTP dispatcher to notify the E-Commerce backend when shipment statuses change (`DELIVERED`, `FAILED_DELIVERY`, `RTO`).
3. **Dedicated Server-to-Server API Keys**: No API key table or middleware (`X-Api-Key`).
4. **Third-Party Courier Aggregator (Phase 12)**: External courier booking, provider AWB generation, and external label fetching are not implemented.

---

## 18. Recommended Minimum Integration Flow

For an E-Commerce application integrating with this Courier Platform:

```
[Customer on E-Commerce Checkout]
  │
  ├── 1. Check Serviceability: GET /api/pricing/serviceability/:pincode
  │
  └── 2. Get Shipping Rate:    POST /api/pricing/quote
        (Displays shipping fee to customer)

[Customer Places Order on E-Commerce]
  │
  └── 3. E-Commerce Server Authenticates: POST /api/auth/login (as SELLER)
        (Obtains JWT Bearer Token)

[Merchant Fulfills Order / Ready to Ship]
  │
  └── 4. Book Consignment: POST /api/shipments
        (Passes externalOrderId, pickupAddress, deliveryAddress, package)
        (Receives internal trackingNumber: "CRL-XXXXXXXX")

[Post-Shipment Tracking]
  │
  ├── 5. E-Commerce embeds tracking link: https://courier.example.com/track?id=CRL-XXXXXXXX
  │
  └── 6. Customer queries tracking: GET /api/tracking/CRL-XXXXXXXX
```

---

## 19. Summary Matrix for Integration Planning

| Purpose | Method | Endpoint | Auth | Status | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Check Serviceability** | `GET` | `/api/pricing/serviceability/:pincode` | None (Public) | **READY** | Instant response |
| **Shipping Quote** | `POST` | `/api/pricing/quote` | Optional | **READY** | Volumetric & slab calculation |
| **Create Shipment** | `POST` | `/api/shipments` | `Bearer` (JWT) | **NEEDS FIX** | Needs idempotency on `externalOrderId` |
| **Get Shipment** | `GET` | `/api/shipments/:id` | `Bearer` (JWT) | **NEEDS FIX** | Needs lookup by `externalOrderId` |
| **Tracking** | `GET` | `/api/tracking/:trackingNumber`| None (Public) | **READY** | Masked PII, timeline, ETA |
| **Cancel Shipment** | `PATCH` | `/api/shipments/:id/cancel` | `Bearer` (JWT) | **NEEDS FIX** | Pre-pickup only |
| **Shipping Label** | — | — | — | **MISSING** | Label generation endpoint needed |
| **Outbound Webhook** | — | — | — | **MISSING** | Courier $\rightarrow$ E-Commerce callback needed |
| **Reconciliation** | `GET` | `/api/payments/admin/cod` | `Bearer` (Admin) | **NEEDS FIX** | Admin only; seller reconciliation needed |
