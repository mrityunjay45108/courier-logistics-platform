import { kafkaObservabilityService } from '../kafka/kafka-observability.service';
import { courierObservabilityService } from '../../modules/integrations/courier-observability.service';
import { logStructured } from '../../utils/sanitizer';

export interface AlertThresholdConfig {
  kafkaOutboxWarningThreshold: number;
  kafkaFailedEventWarningThreshold: number;
  kafkaConsumerLagWarningThreshold: number;
  courierErrorRateThreshold: number;
}

export interface ActiveAlert {
  id: string;
  metric: string;
  severity: 'WARNING' | 'CRITICAL';
  currentValue: number;
  threshold: number;
  message: string;
  triggeredAt: string;
}

/**
 * Alert Notification Abstraction
 * Does not pretend to send emails/SMS; provides a pluggable sink
 */
export interface AlertNotifier {
  notify(alert: ActiveAlert): Promise<void>;
}

class ConsoleAlertNotifier implements AlertNotifier {
  async notify(alert: ActiveAlert): Promise<void> {
    logStructured({
      level: alert.severity === 'CRITICAL' ? 'error' : 'warn',
      message: `[ALERT TRIGGERED] ${alert.message}`,
      alertId: alert.id,
      metric: alert.metric,
      currentValue: alert.currentValue,
      threshold: alert.threshold,
    });
  }
}

export class AlertingService {
  private config: AlertThresholdConfig;
  private notifier: AlertNotifier;

  constructor(notifier?: AlertNotifier) {
    this.notifier = notifier || new ConsoleAlertNotifier();
    this.config = {
      kafkaOutboxWarningThreshold: parseInt(process.env.KAFKA_OUTBOX_WARNING_THRESHOLD || '50', 10),
      kafkaFailedEventWarningThreshold: parseInt(process.env.KAFKA_FAILED_EVENT_WARNING_THRESHOLD || '10', 10),
      kafkaConsumerLagWarningThreshold: parseInt(process.env.KAFKA_CONSUMER_LAG_WARNING_THRESHOLD || '100', 10),
      courierErrorRateThreshold: parseFloat(process.env.COURIER_ERROR_RATE_THRESHOLD || '0.05'),
    };
  }

  getThresholds(): AlertThresholdConfig {
    return { ...this.config };
  }

  /**
   * Evaluate all metrics against warning and critical thresholds
   */
  async evaluateAlerts(): Promise<ActiveAlert[]> {
    const alerts: ActiveAlert[] = [];
    const now = new Date().toISOString();

    const [outboxStats, failedStats, courierSnapshot] = await Promise.all([
      kafkaObservabilityService.getOutboxStats(),
      kafkaObservabilityService.getFailedEventsStats(),
      courierObservabilityService.getSnapshot(),
    ]);

    // 1. Kafka Outbox Pending Count
    if (outboxStats.pendingCount > this.config.kafkaOutboxWarningThreshold) {
      alerts.push({
        id: 'KAFKA_OUTBOX_HIGH_PENDING',
        metric: 'kafka_outbox_pending',
        severity: outboxStats.pendingCount > this.config.kafkaOutboxWarningThreshold * 2 ? 'CRITICAL' : 'WARNING',
        currentValue: outboxStats.pendingCount,
        threshold: this.config.kafkaOutboxWarningThreshold,
        message: `Kafka Outbox has ${outboxStats.pendingCount} pending events (threshold: ${this.config.kafkaOutboxWarningThreshold})`,
        triggeredAt: now,
      });
    }

    // 2. Kafka Failed Events (PostgreSQL DLQ)
    if (failedStats.unresolvedCount > this.config.kafkaFailedEventWarningThreshold) {
      alerts.push({
        id: 'KAFKA_DLQ_HIGH_UNRESOLVED',
        metric: 'kafka_failed_events_unresolved',
        severity: failedStats.unresolvedCount > this.config.kafkaFailedEventWarningThreshold * 2 ? 'CRITICAL' : 'WARNING',
        currentValue: failedStats.unresolvedCount,
        threshold: this.config.kafkaFailedEventWarningThreshold,
        message: `Kafka DLQ contains ${failedStats.unresolvedCount} unresolved events (threshold: ${this.config.kafkaFailedEventWarningThreshold})`,
        triggeredAt: now,
      });
    }

    // 3. Courier Failure Rate
    if (courierSnapshot.totalRequests >= 20 && courierSnapshot.errorRate > this.config.courierErrorRateThreshold) {
      alerts.push({
        id: 'COURIER_HIGH_ERROR_RATE',
        metric: 'courier_error_rate',
        severity: courierSnapshot.errorRate > this.config.courierErrorRateThreshold * 2 ? 'CRITICAL' : 'WARNING',
        currentValue: courierSnapshot.errorRate,
        threshold: this.config.courierErrorRateThreshold,
        message: `Courier Integration failure rate is ${(courierSnapshot.errorRate * 100).toFixed(1)}% (threshold: ${(this.config.courierErrorRateThreshold * 100).toFixed(1)}%)`,
        triggeredAt: now,
      });
    }

    return alerts;
  }
}

export const alertingService = new AlertingService();
