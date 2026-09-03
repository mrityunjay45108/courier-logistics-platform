# Courier Platform — E-Commerce Integration Contract (Production Specification)

This specification defines the authoritative machine-to-machine (server-to-server) API integration contract between the **Courier & Logistics Platform** and external **E-Commerce Applications**.

---

## 1. Architecture & Protocol Overview

- **Base URL**: `https://<courier-host>/api` (Development: `http://localhost:5000/api`)
- **Protocol**: HTTPS (TLS 1.2+ mandatory in production), RESTful JSON
- **Outbound Webhooks**: Push notification events dispatched from Courier to E-Commerce with HMAC-SHA256 signature verification.

---

## 2. Authentication & Headers

### Server-to-Server Authentication
All integration endpoints require an active API key passed in the `X-Api-Key` HTTP header.

```http
X-Api-Key: ck_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> [!NOTE]
> Demo / Seed API Key for local development and integration testing:
> `X-Api-Key: ck_live_ecommerce_test_key_2026`

### Required & Standard Headers

| Header | Format | Requirement | Description |
| :--- | :--- | :--- | :--- |
| `X-Api-Key` | String | **Mandatory** | Machine-to-machine client API key. |
| `Idempotency-Key` | UUID / String | **Mandatory for Mutations** | Unique key for `POST /api/shipments` and `PATCH /cancel`. |
| `X-Request-Id` | UUID / String | **Recommended** | Client correlation ID (echoed in logs and errors). |
| `Content-Type` | `application/json` | **Mandatory for POST/PATCH** | Standard JSON body declaration. |

---

## 3. Standard API Response Formats

### Successful Response Format
```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully",
  "timestamp": "2026-09-03T12:00:00.000Z"
}
```

### Error Response Format
```json
{
  "success": false,
  "message": "A human readable explanation of the error",
  "error": {
    "code": "ERROR_CODE",
    "details": null
  },
  "timestamp": "2026-09-03T12:00:00.000Z"
}
```

### Stable Error Codes

| Error Code | HTTP Status | Meaning |
| :--- | :---: | :--- |
| `UNAUTHORIZED` | `401` | Missing `X-Api-Key` or Bearer token. |
| `INVALID_API_KEY` | `401` | Key does not exist, is deactivated, or has expired. |
| `FORBIDDEN` | `403` | Access to another tenant's shipment or resource is denied (IDOR protection). |
| `NOT_FOUND` | `404` | Consignment or external order ID was not found. |
| `IDEMPOTENCY_CONFLICT` | `409` | Same `Idempotency-Key` was submitted with a different payload or concurrent request in progress. |
| `VALIDATION_ERROR` | `422` | Request body failed Zod schema validation (see `details` array). |
| `BAD_REQUEST` | `400` | Invalid shipment state transition (e.g. attempting to cancel after pickup). |
| `RATE_LIMIT_EXCEEDED`| `429` | Request rate limit exceeded. |
| `INTERNAL_ERROR` | `500` | Unhandled server exception. |

---

## 4. API Endpoints Contract

### 4.1 Check Pincode Serviceability
Check delivery coverage, zone classification, and COD eligibility before order placement.

```http
GET /api/pricing/serviceability/:pincode
```

- **Authentication**: `X-Api-Key` or Public
- **Path Parameters**:
  - `pincode` (string): 6-digit destination postal code (e.g. `800001`)

**Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "serviceable": true,
    "pincode": "800001",
    "city": "Patna",
    "state": "Bihar",
    "zone": "REGIONAL",
    "codAvailable": true
  },
  "message": "Pincode serviceability checked"
}
```

---

### 4.2 Dynamic Shipping Rate Quote
Calculate authoritative freight, volumetric weight, fuel surcharges, COD fee, and GST.

```http
POST /api/pricing/quote
```

- **Authentication**: `X-Api-Key` or Public
- **Request Body**:
```json
{
  "pickupPincode": "110001",
  "deliveryPincode": "800001",
  "weight": 1.5,
  "length": 25.0,
  "width": 20.0,
  "height": 15.0,
  "shipmentType": "COD",
  "codAmount": 1499.00
}
```

**Calculation Rules**:
- Volumetric Weight = $(L \times W \times H) / 5000$
- Chargeable Weight = $\max(\text{Dead Weight}, \text{Volumetric Weight})$ rounded up to $0.5\text{ kg}$ slab.
- Tax: 18% GST on freight and surcharges.

**Response (`200 OK`)**:
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

### 4.3 Create Courier Shipment (Idempotent)
Dispatches consignment booking with package specifications, address snapshots, and external order mapping.

```http
POST /api/shipments
```

- **Authentication**: `X-Api-Key` (Mandatory)
- **Required Headers**: `Idempotency-Key: <unique-uuid>`
- **Request Body**:
```json
{
  "externalOrderId": "ORD-2026-90481",
  "shipmentType": "COD",
  "codAmount": 1499.00,
  "notes": "Fragile items. Handle with care.",
  "package": {
    "weight": 1.5,
    "length": 25,
    "width": 20,
    "height": 15,
    "packageType": "PARCEL",
    "description": "Footwear and accessories"
  },
  "pickupAddress": {
    "name": "E-Commerce Fulfillment Warehouse",
    "phone": "+919876543210",
    "addressLine1": "Plot 42, Industrial Area Phase 2",
    "addressLine2": "Near Inland Container Depot",
    "city": "New Delhi",
    "state": "Delhi",
    "postalCode": "110001",
    "country": "India"
  },
  "deliveryAddress": {
    "name": "Jane Customer",
    "phone": "+919123456780",
    "addressLine1": "Flat 302, Green Valley Apartments",
    "addressLine2": "Sector 62",
    "city": "Noida",
    "state": "Uttar Pradesh",
    "postalCode": "201301",
    "country": "India"
  }
}
```

**Response (`201 Created` or `200 OK` on replay)**:
```json
{
  "success": true,
  "data": {
    "shipmentId": "8f4a102e-5034-4b52-97b1-cf88921a415b",
    "externalOrderId": "ORD-2026-90481",
    "trackingNumber": "CRL-8F4K2P9X",
    "status": "CREATED",
    "shipmentType": "COD",
    "shippingCost": 165.2,
    "codAmount": 1499.0,
    "currency": "INR",
    "carrier": "Apex Express Logistics",
    "estimatedDelivery": null,
    "pickupStatus": null,
    "deliveryStatus": null,
    "label": {
      "format": "PDF",
      "url": null,
      "barcodeText": "CRL-8F4K2P9X"
    },
    "createdAt": "2026-09-03T12:00:00.000Z",
    "updatedAt": "2026-09-03T12:00:00.000Z"
  },
  "message": "Shipment booked successfully"
}
```

---

### 4.4 Get Shipment by External Order ID
Lookup consignment without knowing Courier database UUIDs. Strictly tenant-isolated.

```http
GET /api/shipments/by-external-order/:externalOrderId
```

- **Authentication**: `X-Api-Key`
- **Response (`200 OK`)**: Returns `CourierShipmentIntegrationResponse` DTO.

---

### 4.5 Get Shipment by Tracking Number
```http
GET /api/shipments/by-tracking/:trackingNumber
```

- **Authentication**: `X-Api-Key`
- **Response (`200 OK`)**: Returns `CourierShipmentIntegrationResponse` DTO.

---

### 4.6 Get Shipping Label Metadata
Retrieve label metadata, barcode string, and printable format.

```http
GET /api/shipments/:id/label
GET /api/shipments/by-external-order/:externalOrderId/label
```

- **Authentication**: `X-Api-Key`
- **Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "shipmentId": "8f4a102e-5034-4b52-97b1-cf88921a415b",
    "trackingNumber": "CRL-8F4K2P9X",
    "format": "PDF",
    "url": null,
    "storageType": "LABEL_METADATA_ONLY",
    "barcodeText": "CRL-8F4K2P9X",
    "metadata": {
      "trackingNumber": "CRL-8F4K2P9X",
      "consignor": {
        "name": "E-Commerce Fulfillment Warehouse",
        "city": "New Delhi",
        "state": "Delhi",
        "postalCode": "110001"
      },
      "consignee": {
        "name": "Jane Customer",
        "city": "Noida",
        "state": "Uttar Pradesh",
        "postalCode": "201301"
      },
      "package": {
        "weight": 1.5,
        "dimensions": "25x20x15 cm"
      },
      "shipmentType": "COD",
      "codAmount": 1499.0
    },
    "createdAt": "2026-09-03T12:00:00.000Z"
  },
  "message": "Shipping label retrieved"
}
```

---

### 4.7 Cancel Shipment
Cancels consignment prior to physical pickup (`CREATED`, `DRAFT`, `PICKUP_SCHEDULED`).

```http
PATCH /api/shipments/:id/cancel
PATCH /api/shipments/by-external-order/:externalOrderId/cancel
```

- **Authentication**: `X-Api-Key`
- **Request Body**:
```json
{
  "reason": "Customer cancelled order on E-Commerce storefront"
}
```
- **Response (`200 OK`)**: Updated shipment object with `status: "CANCELLED"`.

---

### 4.8 Public Customer Tracking
Customer-facing tracking endpoint (no PII, street addresses or phone numbers exposed).

```http
GET /api/tracking/:trackingNumber
```

- **Authentication**: None (Public)
- **Rate Limit**: 60 requests / minute per IP
- **Real-Time Live SSE Feed**: `GET /api/tracking/stream/:trackingNumber`

---

### 4.9 State Reconciliation API
Used by E-Commerce background worker to synchronize order statuses if a webhook was missed.

```http
GET /api/integrations/shipments/reconciliation?updatedAfter=2026-09-03T00:00:00Z&page=1&limit=50
```

- **Authentication**: `X-Api-Key`
- **Query Parameters**:
  - `updatedAfter` (ISO Date string, optional)
  - `updatedBefore` (ISO Date string, optional)
  - `status` (ShipmentStatus, optional)
  - `page` (number, default 1)
  - `limit` (number, default 50, max 200)

**Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "shipmentId": "8f4a102e-5034-4b52-97b1-cf88921a415b",
        "externalOrderId": "ORD-2026-90481",
        "trackingNumber": "CRL-8F4K2P9X",
        "status": "DELIVERED",
        "shipmentType": "COD",
        "shippingCost": 165.2,
        "codAmount": 1499.0,
        "currency": "INR",
        "deliveredAt": "2026-09-05T14:32:00.000Z",
        "createdAt": "2026-09-03T12:00:00.000Z",
        "updatedAt": "2026-09-05T14:32:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 50,
    "totalPages": 1
  },
  "message": "Shipment reconciliation records retrieved"
}
```

---

## 5. Outbound Webhook System & Security

### Webhook Registration
To register your E-Commerce webhook callback URL:

```http
POST /api/integrations/webhooks/subscriptions
```

- **Authentication**: `X-Api-Key`
- **Request Body**:
```json
{
  "url": "https://your-ecommerce-domain.com/api/v1/shipments/webhooks/courier",
  "subscribedEvents": ["shipment.*", "rto.*"],
  "secretKey": "whsec_your_strong_webhook_secret_key_12345"
}
```

### Outbound Webhook Delivery Headers

Every HTTP POST sent by Courier to your E-Commerce webhook endpoint includes:

```http
Content-Type: application/json
X-Courier-Event-Id: evt_1788432100_a8f3b2c1
X-Courier-Timestamp: 2026-09-03T12:05:00.123Z
X-Courier-Signature: 8f4a2b9c3e...64_hex_characters...
X-Request-Id: evt_1788432100_a8f3b2c1
User-Agent: CourierPlatform-WebhookDispatcher/1.0
```

### HMAC-SHA256 Signature Verification Algorithm

The signature is computed using:
$$\text{Signature} = \text{HMAC-SHA256}(\text{secret}, \text{timestamp} + \text{"."} + \text{rawBody})$$

#### Node.js / TypeScript Verification Snippet:
```typescript
import crypto from 'crypto';

export function verifyCourierWebhook(
  rawBody: string,
  secret: string,
  timestampHeader: string,
  signatureHeader: string
): boolean {
  // 1. Replay attack protection (reject events older than 5 minutes)
  const eventTime = Date.parse(timestampHeader);
  if (isNaN(eventTime) || Math.abs(Date.now() - eventTime) > 5 * 60 * 1000) {
    return false;
  }

  // 2. Compute expected signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${timestampHeader}.${rawBody}`)
    .digest('hex');

  // 3. Constant-time comparison
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  const providedBuffer = Buffer.from(signatureHeader, 'utf8');

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}
```

### Webhook Event Envelope
```json
{
  "id": "evt_1788432100_a8f3b2c1",
  "event": "shipment.delivered",
  "version": "1.0",
  "createdAt": "2026-09-03T12:05:00.123Z",
  "data": {
    "shipmentId": "8f4a102e-5034-4b52-97b1-cf88921a415b",
    "externalOrderId": "ORD-2026-90481",
    "trackingNumber": "CRL-8F4K2P9X",
    "status": "DELIVERED",
    "shipmentType": "COD",
    "shippingCost": 165.2,
    "codAmount": 1499.0,
    "currency": "INR",
    "carrier": "Apex Express Logistics",
    "estimatedDelivery": "2026-09-03T12:05:00.123Z",
    "updatedAt": "2026-09-03T12:05:00.123Z"
  }
}
```

### Webhook Retry Policy
- **Attempts**: Up to 5 attempts.
- **Intervals**:
  - Attempt 1: Immediate
  - Attempt 2: After 30 seconds
  - Attempt 3: After 2 minutes
  - Attempt 4: After 10 minutes
  - Attempt 5: After 30 minutes $\rightarrow$ Dead Letter
- **Expectation**: Return HTTP `200` or `204` within 8 seconds.

---

## 6. Status Mapping: Courier $\rightarrow$ E-Commerce

| Courier Shipment Status | Meaning | Recommended E-Commerce Status |
| :--- | :--- | :--- |
| `CREATED` | Consignment generated in courier system | `SHIPPED` / `DISPATCH_SCHEDULED` |
| `PICKUP_SCHEDULED` | Rider dispatched to merchant warehouse | `READY_FOR_PICKUP` |
| `PICKED_UP` | Package collected from merchant | `SHIPPED` / `IN_TRANSIT` |
| `IN_TRANSIT` | Moving between sorting hubs | `IN_TRANSIT` |
| `OUT_FOR_DELIVERY` | Rider on final delivery run | `OUT_FOR_DELIVERY` |
| `DELIVERED` | Consignment handed over, POD recorded | `DELIVERED` (or `COMPLETED`) |
| `FAILED_DELIVERY` | Customer unavailable or address issue | `DELIVERY_FAILED` (Awaiting re-attempt) |
| `CANCELLED` | Cancelled before pickup | `CANCELLED` |
| `RETURN_INITIATED` | Return or RTO requested | `RTO_INITIATED` / `RETURN_IN_TRANSIT` |
| `RETURNED` | Package returned to merchant hub | `RETURNED_TO_SELLER` |

---

## 7. Complete End-to-End Flow for E-Commerce Developers

```
[Customer Browsing & Checkout]
   ├── Check Pincode Coverage: GET /api/pricing/serviceability/:pincode
   └── Fetch Shipping Fee:     POST /api/pricing/quote

[Order Payment / COD Confirmed on E-Commerce]
   └── Create Shipment:        POST /api/shipments
                               (Passes: externalOrderId, addresses, package, Idempotency-Key)
                               (Receives: trackingNumber "CRL-XXXXXXXX")

[Fulfillment / Printing Label]
   └── Fetch Label Metadata:   GET /api/shipments/by-external-order/:externalOrderId/label

[Real-Time Status Synchronization]
   ├── Courier dispatches HMAC-signed Webhook -> E-Commerce updates Order status
   └── (Optional fallback):    GET /api/integrations/shipments/reconciliation
```
