import { prisma } from '../../lib/prisma';
import { NotFoundError } from '../../utils/errors';
import {
  ShipmentStatus,
  ExceptionStatus,
  ExceptionType,
  ExceptionSeverity,
  TaskStatus,
  PartnerStatus,
  AuditAction,
} from '@prisma/client';

export class AdminService {
  /**
   * Executive KPI Aggregates from live database
   */
  async getDashboardSummary(startDate?: string, endDate?: string) {
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const hasDate = Boolean(startDate || endDate);

    const [
      totalShipments,
      inTransitShipments,
      deliveredShipments,
      openExceptions,
      activePartners,
      pendingTasks,
      totalUsers,
      totalReturns,
      financialAggregates,
    ] = await Promise.all([
      prisma.shipment.count({ where: hasDate ? { createdAt: dateFilter } : {} }),
      prisma.shipment.count({ where: { status: ShipmentStatus.IN_TRANSIT } }),
      prisma.shipment.count({ where: { status: ShipmentStatus.DELIVERED } }),
      prisma.shipmentException.count({ where: { status: ExceptionStatus.OPEN } }),
      prisma.deliveryPartner.count({ where: { status: PartnerStatus.ACTIVE } }),
      prisma.deliveryTask.count({
        where: { status: { in: [TaskStatus.ASSIGNED, TaskStatus.ACCEPTED, TaskStatus.STARTED] } },
      }),
      prisma.user.count(),
      prisma.returnOrder.count(),
      prisma.shipment.aggregate({
        _sum: { shippingCost: true, codAmount: true },
        where: hasDate ? { createdAt: dateFilter } : {},
      }),
    ]);

    // Status breakdown
    const statusCounts = await prisma.shipment.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    return {
      kpis: {
        totalShipments,
        inTransitShipments,
        deliveredShipments,
        openExceptions,
        activePartners,
        pendingTasks,
        totalUsers,
        totalReturns,
        totalShippingRevenue: Number(financialAggregates._sum.shippingCost || 0),
        totalCodVolume: Number(financialAggregates._sum.codAmount || 0),
      },
      statusBreakdown: statusCounts.map((s) => ({ status: s.status, count: s._count.status })),
    };
  }

  /**
   * Cross-entity Global Search
   */
  async globalSearch(term: string) {
    const clean = term.trim();
    if (!clean || clean.length < 2) return { shipments: [], tasks: [], partners: [], returns: [] };

    const [shipments, tasks, partners, returns] = await Promise.all([
      prisma.shipment.findMany({
        where: {
          OR: [
            { trackingNumber: { contains: clean, mode: 'insensitive' } },
            { externalOrderId: { contains: clean, mode: 'insensitive' } },
          ],
        },
        take: 5,
        select: { id: true, trackingNumber: true, status: true, carrier: true, createdAt: true },
      }),
      prisma.deliveryTask.findMany({
        where: { taskNumber: { contains: clean, mode: 'insensitive' } },
        take: 5,
        include: { deliveryPartner: { select: { fullName: true } } },
      }),
      prisma.deliveryPartner.findMany({
        where: {
          OR: [
            { partnerCode: { contains: clean, mode: 'insensitive' } },
            { fullName: { contains: clean, mode: 'insensitive' } },
            { phone: { contains: clean } },
          ],
        },
        take: 5,
      }),
      prisma.returnOrder.findMany({
        where: { returnNumber: { contains: clean, mode: 'insensitive' } },
        take: 5,
        select: { id: true, returnNumber: true, status: true, reason: true },
      }),
    ]);

    return { shipments, tasks, partners, returns };
  }

  /**
   * Exception Management
   */
  async listExceptions(query: { status?: ExceptionStatus; severity?: ExceptionSeverity }) {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.severity) where.severity = query.severity;

    return await prisma.shipmentException.findMany({
      where,
      include: {
        shipment: { select: { trackingNumber: true, status: true } },
        assignedUser: { select: { name: true, email: true } },
        resolvedByUser: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolveException(exceptionId: string, resolutionNotes: string, adminUserId: string) {
    const existing = await prisma.shipmentException.findUnique({ where: { id: exceptionId } });
    if (!existing) throw new NotFoundError('Exception not found');

    return await prisma.$transaction([
      prisma.shipmentException.update({
        where: { id: exceptionId },
        data: {
          status: ExceptionStatus.RESOLVED,
          resolutionNotes,
          resolvedBy: adminUserId,
          resolvedAt: new Date(),
        },
      }),
      prisma.auditLog.create({
        data: {
          action: AuditAction.EXCEPTION_RESOLVED,
          userId: adminUserId,
          details: { exceptionId, resolutionNotes },
        },
      }),
    ]);
  }

  /**
   * System Activity Audit Log Stream
   */
  async listActivity(limit: number = 30) {
    return await prisma.auditLog.findMany({
      take: Math.min(100, limit),
      include: { user: { select: { name: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * System Diagnostics Telemetry
   */
  async getSystemHealth() {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatencyMs = Date.now() - dbStart;

    return {
      status: 'UP',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: { status: 'CONNECTED', latencyMs: dbLatencyMs },
      memory: {
        rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      },
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
    };
  }
}

export const adminService = new AdminService();
