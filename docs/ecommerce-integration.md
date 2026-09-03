# E-Commerce Integration Contracts & Specifications

This document defines the integration architecture, API contracts, and webhook protocols for securely connecting external E-Commerce applications to this **Courier & Logistics Platform**.

---

## 1. High-Level Flow

```text
  E-Commerce Application                   Courier Logistics Platform
         │                                              │
         │  1. POST /api/integrations/shipments/create  │
         │─────────────────────────────────────────────>│
         │                                              │ (Generates AWB, assigns carrier)
         │  2. Returns AWB & Shipping Label PDF URL     │
         │<─────────────────────────────────────────────│
         │                                              │
         │  3. Logistics Hub sorts & dispatches parcel  │
         │                                              │
         │  4. Webhook Notification: Status Updated     │
         │<─────────────────────────────────────────────│
         │ (e.g. OUT_FOR_DELIVERY, DELIVERED, RTO)      │
         │                                              │
         │  5. E-Commerce updates customer order status │
```

---

## 2. Authentication for External E-Commerce Platforms

External platforms authenticate using signed API Keys and HMAC-SHA256 signatures:
```http
X-Api-Key: coup_live_xxxxxxxxxxxxxxxxx
X-Signature: <hex-encoded-sha256-hmac-of-body>
X-Timestamp: 1725350400
```

---

## 3. Shipment Creation Contract (E-Commerce -> Courier)

### Endpoint
`POST /api/integrations/v1/shipments`

### Payload Schema
```json
{
  "orderId": "ORD-2026-9912",
  "paymentMode": "PREPAID", // "PREPAID" | "COD"
  "collectableAmount": 0, // Amount to collect if COD
  "pickupDetails": {
    "warehouseCode": "WH-MUM-01",
    "contactPerson": "Warehouse Dispatch",
    "phone": "+919800000001",
    "address": "Plot 12, Logistic Park, Bhiwandi",
    "city": "Mumbai",
    "state": "Maharashtra",
    "postalCode": "421302"
  },
  "deliveryDetails": {
    "recipientName": "Aarav Gupta",
    "recipientPhone": "+919811122233",
    "deliveryAddress": "Flat 501, Green Heights, Indirapuram",
    "city": "Ghaziabad",
    "state": "Uttar Pradesh",
    "postalCode": "201014"
  },
  "packageDetails": {
    "weightKg": 1.25,
    "dimensionsCm": {
      "length": 25,
      "width": 15,
      "height": 10
    },
    "items": [
      {
        "sku": "SKU-TSHIRT-BLK-L",
        "description": "Men Cotton T-Shirt",
        "quantity": 2,
        "price": 799
      }
    ]
  }
}
```

### Response Schema
```json
{
  "success": true,
  "message": "Shipment booked and AWB generated",
  "data": {
    "trackingNumber": "TRK-98124018",
    "orderId": "ORD-2026-9912",
    "carrier": "Apex Prime Express",
    "estimatedDelivery": "2026-09-06T18:00:00.000Z",
    "labelUrl": "https://api.courier.local/labels/TRK-98124018.pdf",
    "status": "CREATED"
  }
}
```

---

## 4. Webhook Notification Protocol (Courier -> E-Commerce)

When milestones occur, the courier platform delivers HTTP POST webhooks to the merchant's configured endpoint:

### Webhook Event Payload
```json
{
  "eventId": "evt_01J6ABC123",
  "eventType": "shipment.status_changed",
  "timestamp": "2026-09-04T12:15:30.000Z",
  "data": {
    "trackingNumber": "TRK-98124018",
    "orderId": "ORD-2026-9912",
    "previousStatus": "IN_TRANSIT",
    "currentStatus": "OUT_FOR_DELIVERY",
    "location": "Ghaziabad Delivery Branch",
    "rider": {
      "name": "Suresh Yadav",
      "contact": "+919899887766"
    }
  }
}
```

---

## 5. Idempotency & Fault Tolerance
- All shipment booking requests support `Idempotency-Key` headers to prevent duplicate order generation.
- Webhook deliveries retry up to 5 times with exponential backoff if the target server returns 5xx codes.
