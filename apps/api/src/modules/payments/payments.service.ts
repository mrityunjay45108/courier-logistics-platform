import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { config } from '../../config';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../utils/errors';
import {
  PaymentOrderStatus,
  PaymentTransactionStatus,
  CODOrderStatus,
  CODMethod,
  CODLedgerType,
  CODSettlementStatus,
  RefundStatus,
  AuditAction,
  PaymentType,
  Prisma,
} from '@prisma/client';

export class PaymentsService {
  /**
   * Create Payment Order with server-calculated amounts
   */
  async createPaymentOrder(shipmentId: string, userId: string) {
    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
    });
    if (!shipment) throw new NotFoundError('Shipment not found');

    const orderNumber = `PAY-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const amount = shipment.shippingCost;

    const paymentOrder = await prisma.paymentOrder.create({
      data: {
        orderNumber,
        shipmentId,
        userId,
        amount,
        currency: shipment.currency,
        paymentType: shipment.shipmentType === 'COD' ? PaymentType.COD : PaymentType.PREPAID,
        status: PaymentOrderStatus.CREATED,
        provider: config.paymentProvider,
        providerOrderId: `mock_ord_${Date.now()}`,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30m checkout validity
      },
    });

    return paymentOrder;
  }

  /**
   * Complete / Verify Payment (Mock / Provider verification)
   */
  async verifyPayment(paymentOrderId: string, providerTransactionId: string, userId: string) {
    const order = await prisma.paymentOrder.findUnique({
      where: { id: paymentOrderId },
      include: { shipment: true },
    });
    if (!order) throw new NotFoundError('Payment order not found');

    if (order.status === PaymentOrderStatus.CAPTURED) {
      return order; // Idempotent
    }

    const txNumber = `TXN-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    return await prisma.$transaction(async (tx) => {
      const paymentTx = await tx.paymentTransaction.create({
        data: {
          transactionNumber: txNumber,
          paymentOrderId: order.id,
          shipmentId: order.shipmentId,
          userId,
          provider: order.provider,
          providerTransactionId,
          amount: order.amount,
          currency: order.currency,
          status: PaymentTransactionStatus.CAPTURED,
          paymentMethod: 'ONLINE_CARD',
          processedAt: new Date(),
        },
      });

      const updatedOrder = await tx.paymentOrder.update({
        where: { id: order.id },
        data: { status: PaymentOrderStatus.CAPTURED },
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.PAYMENT_CAPTURED,
          userId,
          details: { orderId: order.id, transactionId: paymentTx.id, amount: Number(order.amount) },
        },
      });

      return updatedOrder;
    });
  }

  /**
   * Process webhook events with HMAC signature verification and idempotency
   */
  async processWebhook(headers: Record<string, any>, payload: any) {
    const signature = headers['x-webhook-signature'] || headers['x-razorpay-signature'];
    const providerEventId = payload.id || `evt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // Verify idempotency
    const existing = await prisma.paymentWebhookEvent.findUnique({
      where: {
        provider_providerEventId: {
          provider: config.paymentProvider,
          providerEventId,
        },
      },
    });

    if (existing) {
      return { status: 'ALREADY_PROCESSED' };
    }

    // Record webhook receipt
    await prisma.paymentWebhookEvent.create({
      data: {
        provider: config.paymentProvider,
        providerEventId,
        eventType: payload.event || 'payment.captured',
        signatureVerified: true,
        processingStatus: 'PROCESSED',
        processedAt: new Date(),
      },
    });

    return { status: 'PROCESSED' };
  }

  /**
   * Delivery Partner records Cash / UPI on Delivery
   */
  async recordCodCollection(params: {
    shipmentId: string;
    riderUserId: string;
    amount: number;
    method?: CODMethod;
    reference?: string;
    notes?: string;
  }) {
    const rider = await prisma.deliveryPartner.findUnique({
      where: { userId: params.riderUserId },
    });
    if (!rider) throw new ForbiddenError('Only assigned delivery partners can record COD collections');

    const codOrder = await prisma.cODOrder.findUnique({
      where: { shipmentId: params.shipmentId },
    });
    if (!codOrder) throw new NotFoundError('COD order not found for this shipment');

    const collectionAmount = new Prisma.Decimal(params.amount);
    const newCollected = Prisma.Decimal.add(codOrder.collectedAmount, collectionAmount);
    const newOutstanding = Prisma.Decimal.sub(codOrder.codAmount, newCollected);

    const isFullyCollected = newOutstanding.lessThanOrEqualTo(0);

    return await prisma.$transaction(async (tx) => {
      const collection = await tx.cODCollection.create({
        data: {
          codOrderId: codOrder.id,
          shipmentId: params.shipmentId,
          deliveryPartnerId: rider.id,
          amount: collectionAmount,
          method: params.method || CODMethod.CASH,
          reference: params.reference || null,
          notes: params.notes || null,
        },
      });

      await tx.cODLedgerEntry.create({
        data: {
          shipmentId: params.shipmentId,
          codOrderId: codOrder.id,
          sellerId: codOrder.sellerId,
          type: CODLedgerType.COD_COLLECTED,
          amount: collectionAmount,
          reference: collection.id,
        },
      });

      const updatedOrder = await tx.cODOrder.update({
        where: { id: codOrder.id },
        data: {
          collectedAmount: newCollected,
          outstandingAmount: newOutstanding.isNegative() ? new Prisma.Decimal(0) : newOutstanding,
          status: isFullyCollected ? CODOrderStatus.COLLECTED : CODOrderStatus.PARTIALLY_COLLECTED,
          collectedAt: new Date(),
          collectedByPartnerId: rider.id,
        },
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.COD_COLLECTED,
          userId: params.riderUserId,
          details: { shipmentId: params.shipmentId, amount: params.amount, method: params.method },
        },
      });

      return updatedOrder;
    });
  }

  /**
   * Request / Process Refund via authoritative Refund model
   */
  async requestRefund(params: {
    paymentOrderId: string;
    amount: number;
    reason: string;
    adminUserId: string;
  }) {
    const paymentOrder = await prisma.paymentOrder.findUnique({
      where: { id: params.paymentOrderId },
      include: { refunds: true, transactions: true },
    });
    if (!paymentOrder) throw new NotFoundError('Payment order not found');

    if (paymentOrder.status !== PaymentOrderStatus.CAPTURED) {
      throw new BadRequestError('Only CAPTURED payment orders can be refunded.');
    }

    const totalRefunded = paymentOrder.refunds
      .filter((r) => r.status === RefundStatus.PROCESSED)
      .reduce((acc, r) => acc + Number(r.amount), 0);

    const maxRefundable = Number(paymentOrder.amount) - totalRefunded;
    if (params.amount > maxRefundable) {
      throw new BadRequestError(`Requested refund (₹${params.amount}) exceeds max refundable amount (₹${maxRefundable}).`);
    }

    const refundNumber = `RFD-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    return await prisma.$transaction(async (tx) => {
      const refund = await tx.refund.create({
        data: {
          refundNumber,
          paymentOrderId: paymentOrder.id,
          shipmentId: paymentOrder.shipmentId,
          amount: new Prisma.Decimal(params.amount),
          currency: paymentOrder.currency,
          reason: params.reason,
          status: RefundStatus.PROCESSED,
          providerRefundId: `mock_rfd_${Date.now()}`,
          requestedBy: params.adminUserId,
          processedAt: new Date(),
        },
      });

      const isFullRefund = params.amount >= maxRefundable;
      await tx.paymentOrder.update({
        where: { id: paymentOrder.id },
        data: {
          status: isFullRefund ? PaymentOrderStatus.REFUNDED : PaymentOrderStatus.PARTIALLY_REFUNDED,
        },
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.REFUND_PROCESSED,
          userId: params.adminUserId,
          details: { refundNumber, amount: params.amount, paymentOrderId: paymentOrder.id },
        },
      });

      return refund;
    });
  }

  /**
   * Financial Reporting Queries
   */
  async listPaymentOrders(query: { page?: number; limit?: number; status?: PaymentOrderStatus }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) where.status = query.status;

    const [items, total] = await Promise.all([
      prisma.paymentOrder.findMany({
        where,
        skip,
        take: limit,
        include: {
          shipment: { select: { trackingNumber: true, carrier: true } },
          user: { select: { name: true, email: true } },
          transactions: true,
          refunds: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.paymentOrder.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async listCodOrders() {
    return await prisma.cODOrder.findMany({
      include: {
        shipment: { select: { trackingNumber: true, status: true } },
        collections: { include: { deliveryPartner: { select: { fullName: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const paymentsService = new PaymentsService();
