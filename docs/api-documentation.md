# API Documentation — Courier & Logistics Platform (Phase 1)

This document provides complete technical specifications for the implemented REST API endpoints, authentication flows, error codes, and request/response schemas.

---

## 1. Global Specifications

- **Base URL**: `http://localhost:5000/api` (Root probes at `http://localhost:5000`)
- **Content-Type**: `application/json`
- **Authentication Scheme**: HTTP Bearer JWT Token (`Authorization: Bearer <access_token>`)
- **Cookie Authentication**: Secure HTTP-Only Cookie (`courier_refresh_token`) for refresh flow

### Standard Success Envelope
```json
{
  "success": true,
  "message": "Human readable summary",
  "data": {}
}
```

### Standard Error Envelope
```json
{
  "success": false,
  "message": "Human readable error description",
  "error": {
    "code": "VALIDATION_ERROR | UNAUTHORIZED | FORBIDDEN | NOT_FOUND | RATE_LIMIT_EXCEEDED | INTERNAL_SERVER_ERROR",
    "details": []
  }
}
```

---

## 2. Health & Diagnostics Endpoints

### 2.1 Process Liveness Probe
- **Endpoint**: `GET /health`
- **Access**: Public
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Service is healthy",
  "data": {
    "status": "UP",
    "timestamp": "2026-09-03T10:30:00.000Z"
  }
}
```

### 2.2 Database Readiness Probe
- **Endpoint**: `GET /ready`
- **Access**: Public
- **Response**: `200 OK` (or `503 Service Unavailable` if database is down)
```json
{
  "success": true,
  "message": "Service is ready to accept traffic",
  "data": {
    "status": "READY",
    "database": "CONNECTED",
    "timestamp": "2026-09-03T10:30:00.000Z"
  }
}
```

### 2.3 Version Metadata
- **Endpoint**: `GET /version`
- **Access**: Public
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Version information",
  "data": {
    "name": "courier-logistics-api",
    "version": "1.0.0",
    "environment": "development",
    "uptimeSeconds": 1420,
    "nodeVersion": "v22.18.0"
  }
}
```

---

## 3. Authentication Endpoints (`/api/auth`)

### 3.1 Register User
- **Endpoint**: `POST /api/auth/register`
- **Access**: Public (Rate-limited: 20 req/15min)
- **Request Body**:
```json
{
  "name": "Acme Supplies",
  "email": "shipper@acme.com",
  "password": "Password@123",
  "phone": "+919876543210",
  "role": "SELLER" // Options: "CUSTOMER", "SELLER"
}
```
- **Response**: `201 Created`
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "c1f7b0a1-...",
      "name": "Acme Supplies",
      "email": "shipper@acme.com",
      "phone": "+919876543210",
      "role": "SELLER",
      "isActive": true,
      "createdAt": "2026-09-03T10:30:00.000Z",
      "updatedAt": "2026-09-03T10:30:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
    "refreshToken": "7c8a91b2..."
  }
}
```

### 3.2 Login
- **Endpoint**: `POST /api/auth/login`
- **Access**: Public (Rate-limited: 20 req/15min)
- **Request Body**:
```json
{
  "email": "admin@courier.local",
  "password": "Admin@12345"
}
```
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid-...",
      "name": "System Administrator",
      "email": "admin@courier.local",
      "role": "ADMIN",
      "isActive": true
    },
    "accessToken": "eyJhbGciOiJI...",
    "refreshToken": "4df012..."
  }
}
```

### 3.3 Silent Refresh Token
- **Endpoint**: `POST /api/auth/refresh`
- **Access**: Public (Requires cookie `courier_refresh_token` or JSON body `{ "refreshToken": "..." }`)
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "new-rotated-token...",
    "user": { ... }
  }
}
```

### 3.4 Logout
- **Endpoint**: `POST /api/auth/logout`
- **Access**: Public (Clears cookie and revokes refresh token record in DB)
- **Response**: `200 OK`

### 3.5 Current User Profile
- **Endpoint**: `GET /api/auth/me`
- **Access**: Authenticated (`Authorization: Bearer <token>`)
- **Response**: `200 OK`

---

## 4. Tracking Endpoints (`/api/tracking`)

### 4.1 Track Consignment by Number
- **Endpoint**: `GET /api/tracking/:trackingNumber`
- **Access**: Public
- **Example**: `GET /api/tracking/TRK-DEMO-9988`
- **Response (Found)**: `200 OK`
```json
{
  "success": true,
  "message": "Tracking information retrieved",
  "data": {
    "trackingNumber": "TRK-DEMO-9988",
    "status": "IN_TRANSIT",
    "carrier": "Express Prime Logistics",
    "origin": "Merchant Origin Hub",
    "destination": "Flat 402, Cyber Heights, Sector 62, Noida, UP 201309",
    "estimatedDelivery": "2026-09-05T10:30:00.000Z",
    "events": [
      {
        "id": "...",
        "status": "IN_TRANSIT",
        "location": "Delhi Central Transit Hub",
        "description": "Consignment sorted and in-transit to delivery branch.",
        "timestamp": "2026-09-03T04:30:00.000Z"
      }
    ]
  }
}
```
- **Response (Not Found)**: `404 Not Found`
```json
{
  "success": false,
  "message": "Shipment with tracking number 'INVALID-ID' was not found.",
  "error": {
    "code": "NOT_FOUND"
  }
}
```
