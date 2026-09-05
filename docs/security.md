# Production Security & Hardening Guide

This document outlines the security architecture, authentication mechanisms, webhook signature verification, SSRF controls, and credential rotation procedures for the **Courier & Logistics Platform**.

---

## 1. Security Architecture & Defense in Depth

`mermaid
flowchart TD
    EXT[External Traffic] --> WAF[WAF / Reverse Proxy]
    WAF -->|CORS Whitelist & Helmet| APP[Express Application]
    
    subgraph Security Middleware
        APP --> HELMET[Helmet Security Headers]
        APP --> RATELIMIT[Rate Limiting authLimiter/apiLimiter]
        APP --> PARSER[Body Size Limit: 1MB]
        APP --> AUTH[Authentication Layer]
    end
    
    subgraph Authentication & Authorization
        AUTH -->|Web Users| JWT[JWT Bearer Token]
        AUTH -->|E-Commerce S2S| APIKEY[X-Api-Key SHA-256 Hash]
        AUTH -->|Webhooks| HMAC[HMAC-SHA256 Signature]
    end
    
    subgraph Internal Controls
        JWT & APIKEY & HMAC --> RBAC[Role-Based Access Control]
        RBAC --> SSRF[SSRF URL Validator]
        RBAC --> SANITIZE[Sensitive Data Redaction]
    end
`

---

## 2. API Key Authentication & Tenant Isolation

- **Header:** X-Api-Key: ck_live_...
- **Storage:** Raw API keys are never stored. The database stores only a deterministic SHA-256 hash (keyHash).
- **Scope Verification:** Each ApiClient record contains explicit granular scopes (e.g. ['shipments:read', 'shipments:write', 'pricing:read', 'webhooks:manage']).
- **Tenant Scoping:** Queries made via an API key automatically filter resources to the associated sellerId.

---

## 3. Webhook HMAC-SHA256 Verification & SSRF Controls

### Outbound Webhook Verification
- Every outbound webhook sent to the E-Commerce platform is signed with HMAC-SHA256:
  - Header X-Signature: Hex-encoded SHA-256 HMAC of 	imestamp.payload.
  - Header X-Timestamp: ISO-8601 UTC timestamp.
- **Timing Safe Equal:** Verification uses crypto.timingSafeEqual to prevent timing attacks.
- **Timestamp Tolerance:** Webhook consumers must reject payloads older than 300 seconds (WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS = 300) to prevent replay attacks.

### SSRF Protection
The webhook registration endpoint validates target URLs using [ssrf.validator.ts](file:///c:/Users/kumar/OneDrive/Pictures/Desktop/courier-logistics-platform/apps/api/src/modules/integrations/webhooks/ssrf.validator.ts):
- Protocols strictly limited to https:// (and http:// in development only).
- Prohibits IPv4/IPv6 private ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8).
- Prohibits Cloud Metadata endpoints (169.254.169.254).

---

## 4. Sensitive Data Masking & Log Hygiene

The platform automatically sanitizes all logs and error responses via [sanitizer.ts](file:///c:/Users/kumar/OneDrive/Pictures/Desktop/courier-logistics-platform/apps/api/src/utils/sanitizer.ts):
- Any key matching /password|secret|token|authorization|apikey|x-api-key|creditcard|cvv/i is recursively replaced with [REDACTED].
- Database URLs and Redis connection strings have passwords scrubbed before logging.
- Stack traces are completely stripped from HTTP error responses in production mode.

---

## 5. Credential Rotation Runbook

### Rotating JWT Secrets
1. Generate new 32+ character random secrets:
   `ash
   node -e "console.log(crypto.randomBytes(32).toString('hex'))"
   `
2. Update JWT_ACCESS_SECRET and JWT_REFRESH_SECRET in production secrets manager.
3. Perform a zero-downtime rolling restart of API containers. Existing refresh tokens will expire and require user re-authentication.

### Rotating E-Commerce API Keys
1. Create a new ApiClient record with new keyHash.
2. Provide the new raw key to the partner E-Commerce platform.
3. Confirm partner migration via GET /api/admin/integrations/stats.
4. Deactivate the old API key by setting isActive = false.
