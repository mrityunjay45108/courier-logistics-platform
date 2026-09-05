# Production Operations Runbook

This runbook outlines daily administrative workflows, incident resolution procedures, Kafka topic management, Outbox backlog recovery, and Dead Letter Queue (DLQ) operations for the **Courier & Logistics Platform**.

---

## 1. Daily Operations & System Health Checklist

| Frequency | Check Area | Verification Method | Action Threshold |
| :--- | :--- | :--- | :--- |
| **Every 1m** | Service Readiness | GET /health/ready | HTTP 503 triggers on-call pager |
| **Every 5m** | Kafka Outbox Backlog | GET /api/admin/kafka/outbox/stats | pendingCount > 50 or oldestPendingAgeSec > 120s |
| **Every 15m**| PostgreSQL DLQ Surges | GET /api/admin/kafka/stats | unresolvedFailures > 10 |
| **Every 1h** | Courier Error Rates | GET /api/admin/integrations/stats | errorRate > 0.05 (5%) |
| **Daily**    | Outbound Webhooks | GET /api/admin/integrations/stats | Investigate FAILED webhook events |

---

## 2. Kafka Topic Quota & Architecture

The production environment operates under an **external Aiven Kafka 4.2.1 cluster strictly capped at 5 topics**:

1. courier.shipment.events (Primary courier lifecycle streaming)
2. ecommerce.inventory.events (Stock allocation and reserving)
3. ecommerce.order.created (New consumer checkout order ingestion)
4. ecommerce.order.events (Order cancellation, payment updates)
5. ecommerce.shipment.events (Cross-platform shipment tracking updates)

> [!CAUTION]
> **Strict 5-Topic Limit:** Do NOT create new topics, DLQ topics, or retry topics on Kafka. llowAutoTopicCreation is permanently set to alse. All failure isolation and poison pill buffering must reside in the PostgreSQL KafkaFailedEvent table.

---

## 3. High Outbox Backlog Remediation

When the Transactional Outbox backlog exceeds warning thresholds (pendingCount > 50):

1. **Verify Kafka Broker Connectivity:**
   Check GET /health/ready. If Kafka is marked DISCONNECTED or FALLBACK, verify network egress to the Aiven cluster.
2. **Inspect Background Outbox Worker:**
   Verify worker execution in logs:
   `ash
   grep 'Outbox dispatcher' /var/log/courier-api.log
   `
3. **Trigger Immediate Fast-Path Flush:**
   Restarting or scaling API instances automatically triggers immediate polling of PENDING outbox records in ascending createdAt order.
4. **Duplicate Safety Guarantee:**
   Because outbox events maintain unique id / eventId identifiers, subsequent retries cannot generate duplicate business records on consumers.

---

## 4. Dead Letter Queue (DLQ) & Poison Pill Handling

Unparseable messages or permanently failing business events are routed to KafkaFailedEvent in PostgreSQL.

### Investigation
Inspect failed events via Admin API or Operations Dashboard:
`ash
curl -H "Authorization: Bearer <ADMIN_TOKEN>" http://localhost:5000/api/admin/kafka/failed-events?status=PENDING
`

### Safe Replay Procedure
If the failure was caused by a transient issue (e.g., downstream database lock or temporary timeout):
`ash
curl -X POST -H "Authorization: Bearer <ADMIN_TOKEN>" http://localhost:5000/api/admin/kafka/failed-events/<FAILED_EVENT_ID>/replay
`
- The event is republished to its original permitted topic.
- The original immutable eventId is strictly preserved.
- Downstream consumers utilize KafkaProcessedEvent to discard any duplicate processing if the business state was already applied.
- The failure record transitions to RESOLVED and logs to AuditLog.

### Poison Pill Suppression
If the event contains malformed JSON or corrupted schemas that can never succeed:
`ash
curl -X POST -H "Authorization: Bearer <ADMIN_TOKEN>" http://localhost:5000/api/admin/kafka/failed-events/<FAILED_EVENT_ID>/ignore
`
- The failure record transitions to IGNORED, suppressing alerts while maintaining non-destructive audit history.

---

## 5. Third-Party Courier (Shiprocket) Outage Runbook

When upstream courier gateways return elevated 5xx errors or timeouts:
1. Review metrics via GET /api/admin/integrations/stats.
2. Verify rate-limiting status (HTTP 429). The platform automatically handles backoff and retry.
3. If an upstream carrier is completely down, failover shipments to secondary integrated partners (e.g. Local Delivery Fleet) via administrative dispatch reassignment.
