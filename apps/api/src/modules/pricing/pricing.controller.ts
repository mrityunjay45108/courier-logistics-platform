import { Request, Response, NextFunction } from 'express';
import { pricingService } from './pricing.service';
import { sendSuccess } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export async function getQuote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).user?.userId;
    const quote = await pricingService.calculateQuote(req.body, userId);
    sendSuccess(res, quote, 'Shipping quote calculated successfully');
  } catch (error) {
    next(error);
  }
}

export async function checkPincode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await pricingService.checkPincode(req.params.pincode);
    sendSuccess(res, result, 'Pincode serviceability checked');
  } catch (error) {
    next(error);
  }
}

export async function listZones(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const zones = await pricingService.listZones();
    sendSuccess(res, zones, 'Shipping zones retrieved');
  } catch (error) {
    next(error);
  }
}

export async function listRateCards(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rateCards = await pricingService.listRateCards();
    sendSuccess(res, rateCards, 'Rate cards retrieved');
  } catch (error) {
    next(error);
  }
}

export async function listServiceability(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit, search } = req.query;
    const rules = await pricingService.listServiceability({
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      search: search as string,
    });
    sendSuccess(res, rules, 'Serviceability rules retrieved');
  } catch (error) {
    next(error);
  }
}
