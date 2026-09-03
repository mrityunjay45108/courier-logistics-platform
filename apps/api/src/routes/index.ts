import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import trackingRoutes from '../modules/tracking/tracking.routes';
import usersRoutes from '../modules/users/users.routes';
import shipmentsRoutes from '../modules/shipments/shipments.routes';
import pricingRoutes from '../modules/pricing/pricing.routes';
import deliveryRoutes from '../modules/delivery-partners/delivery-partners.routes';
import paymentsRoutes from '../modules/payments/payments.routes';
import notificationsRoutes from '../modules/notifications/notifications.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/tracking', trackingRoutes);
router.use('/users', usersRoutes);
router.use('/shipments', shipmentsRoutes);
router.use('/pricing', pricingRoutes);
router.use('/delivery-partners', deliveryRoutes);
router.use('/payments', paymentsRoutes);
router.use('/notifications', notificationsRoutes);

export default router;
