import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import trackingRoutes from '../modules/tracking/tracking.routes';
import usersRoutes from '../modules/users/users.routes';
import shipmentsRoutes from '../modules/shipments/shipments.routes';
import pricingRoutes from '../modules/pricing/pricing.routes';
import pickupRoutes from '../modules/pickup/pickup.routes';
import deliveryRoutes from '../modules/delivery/delivery.routes';
import deliveryPartnerRoutes from '../modules/delivery-partners/delivery-partners.routes';
import adminRoutes from '../modules/admin/admin.routes';
import paymentsRoutes from '../modules/payments/payments.routes';
import returnsRoutes from '../modules/returns/returns.routes';
import notificationsRoutes from '../modules/notifications/notifications.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/tracking', trackingRoutes);
router.use('/users', usersRoutes);
router.use('/shipments', shipmentsRoutes);
router.use('/pricing', pricingRoutes);
router.use('/pickups', pickupRoutes);
router.use('/deliveries', deliveryRoutes);
router.use('/delivery-partners', deliveryPartnerRoutes);
router.use('/admin', adminRoutes);
router.use('/payments', paymentsRoutes);
router.use('/returns', returnsRoutes);
router.use('/notifications', notificationsRoutes);

export default router;
