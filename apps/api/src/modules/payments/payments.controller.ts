import { Request, Response, NextFunction } from 'express';
import { paymentsService } from './payments.service';
import { sendSuccess } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export async function createPaymentOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId } = (req as AuthenticatedRequest).user!;
    const order = await paymentsService.createPaymentOrder(req.body.shipmentId, userId);
    sendSuccess(res, order, 'Payment order created', 201);
  } catch (error) {
    next(error);
  }
}

export async function verifyPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId } = (req as AuthenticatedRequest).user!;
    const { paymentOrderId, providerTransactionId } = req.body;
    const order = await paymentsService.verifyPayment(paymentOrderId, providerTransactionId, userId);
    sendSuccess(res, order, 'Payment confirmed successfully');
  } catch (error) {
    next(error);
  }
}

export async function handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await paymentsService.processWebhook(req.headers, req.body);
    sendSuccess(res, result, 'Webhook received');
  } catch (error) {
    next(error);
  }
}

export async function recordCodCollection(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const riderUserId = (req as AuthenticatedRequest).user!.userId;
    const result = await paymentsService.recordCodCollection({
      shipmentId: req.params.shipmentId,
      riderUserId,
      ...req.body,
    });
    sendSuccess(res, result, 'COD collection recorded');
  } catch (error) {
    next(error);
  }
}

export async function requestRefund(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminUserId = (req as AuthenticatedRequest).user!.userId;
    const refund = await paymentsService.requestRefund({
      ...req.body,
      adminUserId,
    });
    sendSuccess(res, refund, 'Refund processed successfully');
  } catch (error) {
    next(error);
  }
}

export async function listPaymentOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit, status } = req.query;
    const result = await paymentsService.listPaymentOrders({
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      status: status as any,
    });
    sendSuccess(res, result, 'Payment orders retrieved');
  } catch (error) {
    next(error);
  }
}

export async function listCodOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orders = await paymentsService.listCodOrders();
    sendSuccess(res, orders, 'COD orders retrieved');
  } catch (error) {
    next(error);
  }
}
