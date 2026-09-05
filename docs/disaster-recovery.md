# Disaster Recovery & Continuity Plan

This plan details recovery objectives, database point-in-time recovery (PITR), Kafka catastrophic cluster recovery, and emergency failover procedures for the **Courier & Logistics Platform**.

---

## 1. Recovery Objectives

- **Recovery Point Objective (RPO):** < 5 minutes (Maximum acceptable data loss window during catastrophic storage failure).
- **Recovery Time Objective (RTO):** < 30 minutes (Target time to restore complete operational service).

---

## 2. PostgreSQL Backup & Restoration

### Backup Architecture
1. **Continuous WAL Archiving:** Write-Ahead Logs (WAL) streamed continuously to secure object storage.
2. **Daily Automated Snapshots:** Full storage volume snapshots taken daily at 02:00 UTC.
3. **Point-In-Time Recovery (PITR):** Enables rolling back database state to any specific second within the retention window (default 30 days).

### Disaster Restoration Runbook
If primary PostgreSQL cluster data is corrupted or lost:
1. Provision a replacement managed PostgreSQL instance.
2. Restore the database from the latest PITR checkpoint just prior to the corruption incident.
3. Execute schema migration validation:
   `ash
   pnpm db:migrate:deploy
   `
4. Verify data integrity against key constraints:
   `sql
   SELECT count(*) FROM "Shipment";
   SELECT count(*) FROM "KafkaOutboxEvent" WHERE status = 'PENDING';
   SELECT count(*) FROM "KafkaProcessedEvent";
   `
5. Update DATABASE_URL and DIRECT_URL in production secrets manager and restart API instances.

---

## 3. Kafka Catastrophic Cluster Recovery

If the Aiven Kafka cluster is destroyed or reset:

1. **Re-provision Cluster with the EXACT 5 Permitted Topics:**
   - courier.shipment.events
   - ecommerce.inventory.events
   - ecommerce.order.created
   - ecommerce.order.events
   - ecommerce.shipment.events
2. **Re-initialize Outbox Backlog:**
   - Because the Transactional Outbox resides in PostgreSQL, unpublished events remain safely stored as KafkaOutboxEvent with status = 'PENDING'.
3. **Consumer Idempotency Protection:**
   - Consumers tracking processed IDs in KafkaProcessedEvent will safely discard redelivered events when partition offsets reset to zero, ensuring **at-least-once delivery with idempotent business processing**.

---

## 4. Redis Cluster Failure & Failover

If the Upstash / Managed Redis cluster suffers total outage:

1. **Graceful Degradation:**
   - The platform switches to direct database querying for serviceability and pricing lookups.
   - Replay protection falls back to PostgreSQL IdempotencyKey and WebhookSubscription records.
2. **Readiness Impact:**
   - /health/ready reports Redis as DEGRADED, but HTTP routing continues for critical shipment bookings.
3. **Restoration:**
   - Update REDIS_URL in environment configuration upon Redis cluster provisioning.
