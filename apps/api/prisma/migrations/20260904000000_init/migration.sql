-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'SELLER', 'ADMIN', 'OPERATIONS', 'DELIVERY_PARTNER');

-- CreateEnum
CREATE TYPE "AddressType" AS ENUM ('HOME', 'OFFICE', 'OTHER');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('DRAFT', 'CREATED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'FAILED_DELIVERY', 'RETURN_INITIATED', 'RETURNED');

-- CreateEnum
CREATE TYPE "ShipmentType" AS ENUM ('PREPAID', 'COD');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('PREPAID', 'COD');

-- CreateEnum
CREATE TYPE "PackageType" AS ENUM ('PARCEL', 'DOCUMENT', 'ELECTRONICS', 'CLOTHING', 'FRAGILE', 'OTHER');

-- CreateEnum
CREATE TYPE "ShipmentAddressType" AS ENUM ('PICKUP', 'DELIVERY', 'RETURN_DESTINATION');

-- CreateEnum
CREATE TYPE "SurchargeType" AS ENUM ('FIXED', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "ShippingZoneCode" AS ENUM ('LOCAL', 'REGIONAL', 'NATIONAL', 'REMOTE');

-- CreateEnum
CREATE TYPE "PickupType" AS ENUM ('FORWARD_PICKUP', 'REVERSE_PICKUP', 'RTO_PICKUP', 'ORIGIN_PICKUP');

-- CreateEnum
CREATE TYPE "PickupStatus" AS ENUM ('SCHEDULED', 'ASSIGNED', 'ARRIVING', 'ATTEMPTED', 'PICKED_UP', 'FAILED', 'CANCELLED', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "PickupAttemptStatus" AS ENUM ('SUCCESS', 'FAILED', 'CUSTOMER_UNAVAILABLE', 'ADDRESS_NOT_FOUND', 'PACKAGE_NOT_READY', 'CONTACT_UNREACHABLE', 'OTHER');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('SCHEDULED', 'ASSIGNED', 'OUT_FOR_DELIVERY', 'ATTEMPTED', 'DELIVERED', 'FAILED', 'RESCHEDULED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeliveryAttemptStatus" AS ENUM ('SUCCESS', 'FAILED', 'CUSTOMER_UNAVAILABLE', 'CUSTOMER_REFUSED', 'ADDRESS_NOT_FOUND', 'PHONE_UNREACHABLE', 'DAMAGED_PACKAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "ProofOfDeliveryType" AS ENUM ('PHOTO', 'SIGNATURE', 'OTP', 'RECIPIENT_CONFIRMATION', 'OTHER');

-- CreateEnum
CREATE TYPE "TrackingEventType" AS ENUM ('SHIPMENT_CREATED', 'PICKUP_SCHEDULED', 'PICKUP_ATTEMPTED', 'PICKED_UP', 'ARRIVED_AT_ORIGIN', 'DEPARTED_ORIGIN', 'IN_TRANSIT', 'ARRIVED_AT_HUB', 'DEPARTED_HUB', 'OUT_FOR_DELIVERY', 'DELIVERY_ATTEMPTED', 'DELIVERED', 'DELIVERY_FAILED', 'RESCHEDULED', 'CANCELLED', 'EXCEPTION', 'RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURN_REJECTED', 'RETURN_PICKED_UP', 'RETURN_RECEIVED', 'RTO_INITIATED', 'RTO_RECEIVED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('LOGIN', 'LOGOUT', 'LOGOUT_ALL', 'PASSWORD_CHANGED', 'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_COMPLETED', 'USER_ACTIVATED', 'USER_DEACTIVATED', 'ROLE_CHANGED', 'PROFILE_UPDATED', 'SESSION_REVOKED', 'SHIPMENT_CREATED', 'SHIPMENT_CANCELLED', 'SHIPMENT_STATUS_CHANGED', 'PICKUP_CREATED', 'DELIVERY_COMPLETED', 'TASK_ASSIGNED', 'TASK_COMPLETED', 'EXCEPTION_CREATED', 'EXCEPTION_RESOLVED', 'PAYMENT_CAPTURED', 'COD_COLLECTED', 'REFUND_PROCESSED', 'RETURN_REQUESTED', 'RETURN_APPROVED', 'RTO_INITIATED');

-- CreateEnum
CREATE TYPE "PartnerStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'INACTIVE', 'REJECTED');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('OFFLINE', 'AVAILABLE', 'BUSY', 'ON_BREAK');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('BIKE', 'SCOOTER', 'BICYCLE', 'THREE_WHEELER', 'VAN', 'TRUCK', 'OTHER');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('PICKUP', 'DELIVERY', 'REVERSE_PICKUP', 'RTO');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('ASSIGNED', 'ACCEPTED', 'REJECTED', 'STARTED', 'ATTEMPTED', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ExceptionType" AS ENUM ('PICKUP_FAILED', 'DELIVERY_FAILED', 'DELAYED', 'ADDRESS_ISSUE', 'CUSTOMER_UNAVAILABLE', 'PARTNER_ISSUE', 'PACKAGE_ISSUE', 'SERVICEABILITY_ISSUE', 'SYSTEM_ISSUE', 'RETURN_PICKUP_FAILED', 'RTO_DELAYED', 'OTHER');

-- CreateEnum
CREATE TYPE "ExceptionSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ExceptionStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentOrderStatus" AS ENUM ('CREATED', 'PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'CANCELLED', 'EXPIRED', 'PARTIALLY_REFUNDED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentTransactionStatus" AS ENUM ('INITIATED', 'PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "CODOrderStatus" AS ENUM ('PENDING', 'ASSIGNED', 'OUT_FOR_DELIVERY', 'COLLECTED', 'PARTIALLY_COLLECTED', 'FAILED', 'CANCELLED', 'SETTLED');

-- CreateEnum
CREATE TYPE "CODMethod" AS ENUM ('CASH', 'UPI', 'OTHER');

-- CreateEnum
CREATE TYPE "CODSettlementStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CODLedgerType" AS ENUM ('COD_COLLECTED', 'COD_ADJUSTMENT', 'COD_FEE', 'COD_SETTLEMENT', 'REFUND_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('REQUESTED', 'PROCESSING', 'PROCESSED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReconciliationStatus" AS ENUM ('MATCHED', 'MISSING_INTERNAL', 'MISSING_PROVIDER', 'AMOUNT_MISMATCH', 'STATUS_MISMATCH', 'MANUAL_REVIEW');

-- CreateEnum
CREATE TYPE "ReturnType" AS ENUM ('CUSTOMER_RETURN', 'RTO', 'SELLER_INITIATED', 'DAMAGED', 'WRONG_ITEM', 'OTHER');

-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'PICKUP_SCHEDULED', 'PICKUP_ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'RECEIVED', 'INSPECTION_PENDING', 'INSPECTION_COMPLETED', 'REFUND_PENDING', 'REFUNDED', 'COMPLETED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReturnReason" AS ENUM ('WRONG_ITEM', 'DAMAGED_ITEM', 'DEFECTIVE_ITEM', 'ITEM_NOT_AS_DESCRIBED', 'SIZE_ISSUE', 'QUALITY_ISSUE', 'MISSING_PARTS', 'CUSTOMER_CHANGED_MIND', 'OTHER');

-- CreateEnum
CREATE TYPE "InspectionStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'PASSED', 'FAILED', 'NOT_REQUIRED');

-- CreateEnum
CREATE TYPE "ItemCondition" AS ENUM ('GOOD', 'DAMAGED', 'USED', 'MISSING_PARTS', 'WRONG_ITEM', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ReturnChargeType" AS ENUM ('RETURN_SHIPPING', 'RTO_CHARGE', 'REVERSE_PICKUP', 'HANDLING', 'INSPECTION', 'OTHER');

-- CreateEnum
CREATE TYPE "ReturnChargeStatus" AS ENUM ('ESTIMATED', 'APPLIED', 'WAIVED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "KafkaOutboxStatus" AS ENUM ('PENDING', 'PUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "KafkaFailureStatus" AS ENUM ('UNRESOLVED', 'RESOLVED', 'IGNORED');

-- CreateEnum
CREATE TYPE "IdempotencyStatus" AS ENUM ('PROCESSING', 'RESOLVED', 'FAILED');

-- CreateEnum
CREATE TYPE "OutboundWebhookStatus" AS ENUM ('PENDING', 'SENDING', 'DELIVERED', 'FAILED', 'DEAD_LETTER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "avatarUrl" TEXT,
    "companyName" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "preferences" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'India',
    "landmark" TEXT,
    "type" "AddressType" NOT NULL DEFAULT 'HOME',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" "AuditAction" NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "trackingNumber" TEXT NOT NULL,
    "externalOrderId" TEXT,
    "customerId" TEXT,
    "sellerId" TEXT,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'CREATED',
    "shipmentType" "ShipmentType" NOT NULL DEFAULT 'PREPAID',
    "shippingCost" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "codAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "carrier" TEXT NOT NULL DEFAULT 'Apex Express Logistics',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentPackage" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "length" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "packageType" "PackageType" NOT NULL DEFAULT 'PARCEL',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShipmentPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentAddress" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "type" "ShipmentAddressType" NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'India',
    "landmark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShipmentAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingZone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceabilityRule" (
    "id" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "isPickupAvailable" BOOLEAN NOT NULL DEFAULT true,
    "isDeliveryAvailable" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceabilityRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingRateCard" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "shipmentType" "ShipmentType" NOT NULL DEFAULT 'PREPAID',
    "baseWeight" DECIMAL(10,2) NOT NULL,
    "baseRate" DECIMAL(10,2) NOT NULL,
    "additionalWeightUnit" DECIMAL(10,2) NOT NULL,
    "additionalWeightRate" DECIMAL(10,2) NOT NULL,
    "codEnabled" BOOLEAN NOT NULL DEFAULT true,
    "codFixedFee" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "codPercentage" DECIMAL(5,2) NOT NULL DEFAULT 0.0,
    "fuelSurchargeType" "SurchargeType" NOT NULL DEFAULT 'PERCENTAGE',
    "fuelSurchargeValue" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "taxEnabled" BOOLEAN NOT NULL DEFAULT true,
    "taxPercentage" DECIMAL(5,2) NOT NULL DEFAULT 18.0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "priority" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingRateCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingQuote" (
    "id" TEXT NOT NULL,
    "quoteNumber" TEXT NOT NULL,
    "userId" TEXT,
    "shipmentId" TEXT,
    "pickupPincode" TEXT NOT NULL,
    "deliveryPincode" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "shipmentType" "ShipmentType" NOT NULL,
    "actualWeight" DECIMAL(10,2) NOT NULL,
    "volumetricWeight" DECIMAL(10,2) NOT NULL,
    "chargeableWeight" DECIMAL(10,2) NOT NULL,
    "baseShipping" DECIMAL(10,2) NOT NULL,
    "additionalWeightCharge" DECIMAL(10,2) NOT NULL,
    "codFee" DECIMAL(10,2) NOT NULL,
    "surcharge" DECIMAL(10,2) NOT NULL,
    "tax" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "rateCardId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PricingQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pickup" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "pickupType" "PickupType" NOT NULL DEFAULT 'FORWARD_PICKUP',
    "returnOrderId" TEXT,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "timeSlotStart" TEXT NOT NULL,
    "timeSlotEnd" TEXT NOT NULL,
    "status" "PickupStatus" NOT NULL DEFAULT 'SCHEDULED',
    "instructions" TEXT,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pickup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PickupAttempt" (
    "id" TEXT NOT NULL,
    "pickupId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "status" "PickupAttemptStatus" NOT NULL,
    "failureReason" TEXT,
    "notes" TEXT,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PickupAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PickupScheduleHistory" (
    "id" TEXT NOT NULL,
    "pickupId" TEXT NOT NULL,
    "previousDate" TIMESTAMP(3) NOT NULL,
    "previousStart" TEXT NOT NULL,
    "previousEnd" TEXT NOT NULL,
    "newDate" TIMESTAMP(3) NOT NULL,
    "newStart" TEXT NOT NULL,
    "newEnd" TEXT NOT NULL,
    "reason" TEXT,
    "changedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PickupScheduleHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Delivery" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "timeSlotStart" TEXT NOT NULL,
    "timeSlotEnd" TEXT NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'SCHEDULED',
    "instructions" TEXT,
    "recipientName" TEXT NOT NULL,
    "recipientPhone" TEXT NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryAttempt" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "status" "DeliveryAttemptStatus" NOT NULL,
    "failureReason" TEXT,
    "notes" TEXT,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProofOfDelivery" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "deliveryAttemptId" TEXT,
    "type" "ProofOfDeliveryType" NOT NULL DEFAULT 'RECIPIENT_CONFIRMATION',
    "reference" TEXT,
    "recipientName" TEXT NOT NULL,
    "recipientRelation" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProofOfDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackingEvent" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "status" "ShipmentStatus" NOT NULL,
    "eventType" "TrackingEventType" NOT NULL DEFAULT 'SHIPMENT_CREATED',
    "title" TEXT NOT NULL DEFAULT 'Tracking Update',
    "description" TEXT NOT NULL,
    "location" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT DEFAULT 'India',
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackingLocation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'India',
    "type" TEXT NOT NULL DEFAULT 'HUB',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrackingLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryPartner" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "partnerCode" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "PartnerStatus" NOT NULL DEFAULT 'PENDING',
    "availabilityStatus" "AvailabilityStatus" NOT NULL DEFAULT 'OFFLINE',
    "vehicleType" "VehicleType" NOT NULL DEFAULT 'BIKE',
    "vehicleNumber" TEXT,
    "serviceZoneId" TEXT,
    "joiningDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryPartner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryTask" (
    "id" TEXT NOT NULL,
    "taskNumber" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "deliveryPartnerId" TEXT NOT NULL,
    "returnOrderId" TEXT,
    "taskType" "TaskType" NOT NULL DEFAULT 'PICKUP',
    "status" "TaskStatus" NOT NULL DEFAULT 'ASSIGNED',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryTaskEvent" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "eventType" "TaskStatus" NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryTaskEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentException" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "type" "ExceptionType" NOT NULL,
    "severity" "ExceptionSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "ExceptionStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'SYSTEM',
    "assignedTo" TEXT,
    "resolvedBy" TEXT,
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShipmentException_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentOrder" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "paymentType" "PaymentType" NOT NULL DEFAULT 'PREPAID',
    "status" "PaymentOrderStatus" NOT NULL DEFAULT 'CREATED',
    "provider" TEXT NOT NULL DEFAULT 'mock',
    "providerOrderId" TEXT,
    "idempotencyKey" TEXT,
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL,
    "transactionNumber" TEXT NOT NULL,
    "paymentOrderId" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'mock',
    "providerTransactionId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "PaymentTransactionStatus" NOT NULL DEFAULT 'INITIATED',
    "paymentMethod" TEXT,
    "failureCode" TEXT,
    "failureReason" TEXT,
    "metadata" JSONB,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentWebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "signatureVerified" BOOLEAN NOT NULL DEFAULT false,
    "processingStatus" TEXT NOT NULL DEFAULT 'RECEIVED',
    "payloadHash" TEXT,
    "processedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CODOrder" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "sellerId" TEXT,
    "codAmount" DECIMAL(10,2) NOT NULL,
    "collectedAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "outstandingAmount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "CODOrderStatus" NOT NULL DEFAULT 'PENDING',
    "collectedAt" TIMESTAMP(3),
    "collectedByPartnerId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CODOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CODCollection" (
    "id" TEXT NOT NULL,
    "codOrderId" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "deliveryPartnerId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "method" "CODMethod" NOT NULL DEFAULT 'CASH',
    "reference" TEXT,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "CODCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CODSettlement" (
    "id" TEXT NOT NULL,
    "settlementNumber" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "totalCollected" DECIMAL(10,2) NOT NULL,
    "adjustments" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "fees" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "netAmount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "CODSettlementStatus" NOT NULL DEFAULT 'PENDING',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CODSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CODLedgerEntry" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "codOrderId" TEXT NOT NULL,
    "sellerId" TEXT,
    "type" "CODLedgerType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CODLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "refundNumber" TEXT NOT NULL,
    "paymentOrderId" TEXT NOT NULL,
    "paymentTransactionId" TEXT,
    "shipmentId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "reason" TEXT NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'REQUESTED',
    "providerRefundId" TEXT,
    "requestedBy" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentReconciliation" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerTransactionId" TEXT NOT NULL,
    "paymentTransactionId" TEXT,
    "expectedAmount" DECIMAL(10,2),
    "providerAmount" DECIMAL(10,2),
    "internalStatus" TEXT,
    "providerStatus" TEXT,
    "reconciliationStatus" "ReconciliationStatus" NOT NULL DEFAULT 'MATCHED',
    "notes" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnOrder" (
    "id" TEXT NOT NULL,
    "returnNumber" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sellerId" TEXT,
    "type" "ReturnType" NOT NULL DEFAULT 'CUSTOMER_RETURN',
    "status" "ReturnStatus" NOT NULL DEFAULT 'REQUESTED',
    "reason" "ReturnReason" NOT NULL,
    "customerComment" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReturnOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnInspection" (
    "id" TEXT NOT NULL,
    "returnOrderId" TEXT NOT NULL,
    "inspectedBy" TEXT,
    "status" "InspectionStatus" NOT NULL DEFAULT 'PENDING',
    "condition" "ItemCondition" NOT NULL DEFAULT 'UNKNOWN',
    "notes" TEXT,
    "inspectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReturnInspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnCharge" (
    "id" TEXT NOT NULL,
    "returnOrderId" TEXT NOT NULL,
    "type" "ReturnChargeType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "ReturnChargeStatus" NOT NULL DEFAULT 'ESTIMATED',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReturnCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiClient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "sellerId" TEXT,
    "scopes" TEXT[] DEFAULT ARRAY['shipments:read', 'shipments:write', 'pricing:read', 'tracking:read', 'webhooks:manage']::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "responseStatus" INTEGER,
    "responseBody" JSONB,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "status" "IdempotencyStatus" NOT NULL DEFAULT 'PROCESSING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingLabel" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'PDF',
    "url" TEXT,
    "storageKey" TEXT,
    "barcodeText" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingLabel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookSubscription" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secretHash" TEXT NOT NULL,
    "secretKey" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "subscribedEvents" TEXT[] DEFAULT ARRAY['shipment.*']::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboundWebhookEvent" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboundWebhookStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "nextAttemptAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "lastAttemptAt" TIMESTAMP(3),
    "responseStatus" INTEGER,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutboundWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KafkaOutboxEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "partitionKey" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "headers" JSONB,
    "status" "KafkaOutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "nextAttemptAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KafkaOutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KafkaProcessedEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "consumerGroup" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KafkaProcessedEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KafkaFailedEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "partition" INTEGER,
    "offset" TEXT,
    "consumerGroup" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "errorReason" TEXT NOT NULL,
    "stackTrace" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "status" "KafkaFailureStatus" NOT NULL DEFAULT 'UNRESOLVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KafkaFailedEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE INDEX "Address_userId_idx" ON "Address"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_tokenHash_idx" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "PasswordResetToken_tokenHash_idx" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_trackingNumber_key" ON "Shipment"("trackingNumber");

-- CreateIndex
CREATE INDEX "Shipment_trackingNumber_idx" ON "Shipment"("trackingNumber");

-- CreateIndex
CREATE INDEX "Shipment_customerId_idx" ON "Shipment"("customerId");

-- CreateIndex
CREATE INDEX "Shipment_sellerId_idx" ON "Shipment"("sellerId");

-- CreateIndex
CREATE INDEX "Shipment_status_idx" ON "Shipment"("status");

-- CreateIndex
CREATE INDEX "Shipment_externalOrderId_idx" ON "Shipment"("externalOrderId");

-- CreateIndex
CREATE INDEX "Shipment_createdAt_idx" ON "Shipment"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ShipmentPackage_shipmentId_key" ON "ShipmentPackage"("shipmentId");

-- CreateIndex
CREATE INDEX "ShipmentAddress_shipmentId_idx" ON "ShipmentAddress"("shipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingZone_code_key" ON "ShippingZone"("code");

-- CreateIndex
CREATE INDEX "ShippingZone_code_idx" ON "ShippingZone"("code");

-- CreateIndex
CREATE INDEX "ShippingZone_isActive_idx" ON "ShippingZone"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceabilityRule_pincode_key" ON "ServiceabilityRule"("pincode");

-- CreateIndex
CREATE INDEX "ServiceabilityRule_pincode_idx" ON "ServiceabilityRule"("pincode");

-- CreateIndex
CREATE INDEX "ServiceabilityRule_zoneId_idx" ON "ServiceabilityRule"("zoneId");

-- CreateIndex
CREATE INDEX "ServiceabilityRule_isActive_idx" ON "ServiceabilityRule"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PricingRateCard_code_key" ON "PricingRateCard"("code");

-- CreateIndex
CREATE INDEX "PricingRateCard_zoneId_idx" ON "PricingRateCard"("zoneId");

-- CreateIndex
CREATE INDEX "PricingRateCard_shipmentType_idx" ON "PricingRateCard"("shipmentType");

-- CreateIndex
CREATE INDEX "PricingRateCard_isActive_idx" ON "PricingRateCard"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PricingQuote_quoteNumber_key" ON "PricingQuote"("quoteNumber");

-- CreateIndex
CREATE INDEX "PricingQuote_quoteNumber_idx" ON "PricingQuote"("quoteNumber");

-- CreateIndex
CREATE INDEX "PricingQuote_userId_idx" ON "PricingQuote"("userId");

-- CreateIndex
CREATE INDEX "PricingQuote_shipmentId_idx" ON "PricingQuote"("shipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Pickup_shipmentId_key" ON "Pickup"("shipmentId");

-- CreateIndex
CREATE INDEX "Pickup_shipmentId_idx" ON "Pickup"("shipmentId");

-- CreateIndex
CREATE INDEX "Pickup_status_idx" ON "Pickup"("status");

-- CreateIndex
CREATE INDEX "Pickup_scheduledDate_idx" ON "Pickup"("scheduledDate");

-- CreateIndex
CREATE INDEX "PickupAttempt_pickupId_idx" ON "PickupAttempt"("pickupId");

-- CreateIndex
CREATE INDEX "PickupAttempt_attemptedAt_idx" ON "PickupAttempt"("attemptedAt");

-- CreateIndex
CREATE INDEX "PickupScheduleHistory_pickupId_idx" ON "PickupScheduleHistory"("pickupId");

-- CreateIndex
CREATE UNIQUE INDEX "Delivery_shipmentId_key" ON "Delivery"("shipmentId");

-- CreateIndex
CREATE INDEX "Delivery_shipmentId_idx" ON "Delivery"("shipmentId");

-- CreateIndex
CREATE INDEX "Delivery_status_idx" ON "Delivery"("status");

-- CreateIndex
CREATE INDEX "Delivery_scheduledDate_idx" ON "Delivery"("scheduledDate");

-- CreateIndex
CREATE INDEX "DeliveryAttempt_deliveryId_idx" ON "DeliveryAttempt"("deliveryId");

-- CreateIndex
CREATE INDEX "DeliveryAttempt_attemptedAt_idx" ON "DeliveryAttempt"("attemptedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProofOfDelivery_shipmentId_key" ON "ProofOfDelivery"("shipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "ProofOfDelivery_deliveryAttemptId_key" ON "ProofOfDelivery"("deliveryAttemptId");

-- CreateIndex
CREATE INDEX "ProofOfDelivery_shipmentId_idx" ON "ProofOfDelivery"("shipmentId");

-- CreateIndex
CREATE INDEX "TrackingEvent_shipmentId_idx" ON "TrackingEvent"("shipmentId");

-- CreateIndex
CREATE INDEX "TrackingEvent_eventType_idx" ON "TrackingEvent"("eventType");

-- CreateIndex
CREATE INDEX "TrackingEvent_status_idx" ON "TrackingEvent"("status");

-- CreateIndex
CREATE INDEX "TrackingEvent_createdAt_idx" ON "TrackingEvent"("createdAt");

-- CreateIndex
CREATE INDEX "TrackingEvent_isPublic_idx" ON "TrackingEvent"("isPublic");

-- CreateIndex
CREATE UNIQUE INDEX "TrackingLocation_code_key" ON "TrackingLocation"("code");

-- CreateIndex
CREATE INDEX "TrackingLocation_code_idx" ON "TrackingLocation"("code");

-- CreateIndex
CREATE INDEX "TrackingLocation_city_idx" ON "TrackingLocation"("city");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryPartner_userId_key" ON "DeliveryPartner"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryPartner_partnerCode_key" ON "DeliveryPartner"("partnerCode");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryPartner_phone_key" ON "DeliveryPartner"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryPartner_email_key" ON "DeliveryPartner"("email");

-- CreateIndex
CREATE INDEX "DeliveryPartner_partnerCode_idx" ON "DeliveryPartner"("partnerCode");

-- CreateIndex
CREATE INDEX "DeliveryPartner_status_idx" ON "DeliveryPartner"("status");

-- CreateIndex
CREATE INDEX "DeliveryPartner_availabilityStatus_idx" ON "DeliveryPartner"("availabilityStatus");

-- CreateIndex
CREATE INDEX "DeliveryPartner_serviceZoneId_idx" ON "DeliveryPartner"("serviceZoneId");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryTask_taskNumber_key" ON "DeliveryTask"("taskNumber");

-- CreateIndex
CREATE INDEX "DeliveryTask_taskNumber_idx" ON "DeliveryTask"("taskNumber");

-- CreateIndex
CREATE INDEX "DeliveryTask_shipmentId_idx" ON "DeliveryTask"("shipmentId");

-- CreateIndex
CREATE INDEX "DeliveryTask_deliveryPartnerId_idx" ON "DeliveryTask"("deliveryPartnerId");

-- CreateIndex
CREATE INDEX "DeliveryTask_status_idx" ON "DeliveryTask"("status");

-- CreateIndex
CREATE INDEX "DeliveryTask_taskType_idx" ON "DeliveryTask"("taskType");

-- CreateIndex
CREATE INDEX "DeliveryTaskEvent_taskId_idx" ON "DeliveryTaskEvent"("taskId");

-- CreateIndex
CREATE INDEX "DeliveryTaskEvent_createdAt_idx" ON "DeliveryTaskEvent"("createdAt");

-- CreateIndex
CREATE INDEX "ShipmentException_shipmentId_idx" ON "ShipmentException"("shipmentId");

-- CreateIndex
CREATE INDEX "ShipmentException_type_idx" ON "ShipmentException"("type");

-- CreateIndex
CREATE INDEX "ShipmentException_severity_idx" ON "ShipmentException"("severity");

-- CreateIndex
CREATE INDEX "ShipmentException_status_idx" ON "ShipmentException"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentOrder_orderNumber_key" ON "PaymentOrder"("orderNumber");

-- CreateIndex
CREATE INDEX "PaymentOrder_orderNumber_idx" ON "PaymentOrder"("orderNumber");

-- CreateIndex
CREATE INDEX "PaymentOrder_shipmentId_idx" ON "PaymentOrder"("shipmentId");

-- CreateIndex
CREATE INDEX "PaymentOrder_userId_idx" ON "PaymentOrder"("userId");

-- CreateIndex
CREATE INDEX "PaymentOrder_status_idx" ON "PaymentOrder"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTransaction_transactionNumber_key" ON "PaymentTransaction"("transactionNumber");

-- CreateIndex
CREATE INDEX "PaymentTransaction_transactionNumber_idx" ON "PaymentTransaction"("transactionNumber");

-- CreateIndex
CREATE INDEX "PaymentTransaction_paymentOrderId_idx" ON "PaymentTransaction"("paymentOrderId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_shipmentId_idx" ON "PaymentTransaction"("shipmentId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_status_idx" ON "PaymentTransaction"("status");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_providerEventId_idx" ON "PaymentWebhookEvent"("providerEventId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentWebhookEvent_provider_providerEventId_key" ON "PaymentWebhookEvent"("provider", "providerEventId");

-- CreateIndex
CREATE UNIQUE INDEX "CODOrder_shipmentId_key" ON "CODOrder"("shipmentId");

-- CreateIndex
CREATE INDEX "CODOrder_shipmentId_idx" ON "CODOrder"("shipmentId");

-- CreateIndex
CREATE INDEX "CODOrder_customerId_idx" ON "CODOrder"("customerId");

-- CreateIndex
CREATE INDEX "CODOrder_sellerId_idx" ON "CODOrder"("sellerId");

-- CreateIndex
CREATE INDEX "CODOrder_status_idx" ON "CODOrder"("status");

-- CreateIndex
CREATE INDEX "CODCollection_codOrderId_idx" ON "CODCollection"("codOrderId");

-- CreateIndex
CREATE INDEX "CODCollection_deliveryPartnerId_idx" ON "CODCollection"("deliveryPartnerId");

-- CreateIndex
CREATE INDEX "CODCollection_collectedAt_idx" ON "CODCollection"("collectedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CODSettlement_settlementNumber_key" ON "CODSettlement"("settlementNumber");

-- CreateIndex
CREATE INDEX "CODSettlement_sellerId_idx" ON "CODSettlement"("sellerId");

-- CreateIndex
CREATE INDEX "CODSettlement_status_idx" ON "CODSettlement"("status");

-- CreateIndex
CREATE INDEX "CODLedgerEntry_shipmentId_idx" ON "CODLedgerEntry"("shipmentId");

-- CreateIndex
CREATE INDEX "CODLedgerEntry_codOrderId_idx" ON "CODLedgerEntry"("codOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_refundNumber_key" ON "Refund"("refundNumber");

-- CreateIndex
CREATE INDEX "Refund_refundNumber_idx" ON "Refund"("refundNumber");

-- CreateIndex
CREATE INDEX "Refund_paymentOrderId_idx" ON "Refund"("paymentOrderId");

-- CreateIndex
CREATE INDEX "Refund_status_idx" ON "Refund"("status");

-- CreateIndex
CREATE INDEX "PaymentReconciliation_providerTransactionId_idx" ON "PaymentReconciliation"("providerTransactionId");

-- CreateIndex
CREATE INDEX "PaymentReconciliation_reconciliationStatus_idx" ON "PaymentReconciliation"("reconciliationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnOrder_returnNumber_key" ON "ReturnOrder"("returnNumber");

-- CreateIndex
CREATE INDEX "ReturnOrder_returnNumber_idx" ON "ReturnOrder"("returnNumber");

-- CreateIndex
CREATE INDEX "ReturnOrder_shipmentId_idx" ON "ReturnOrder"("shipmentId");

-- CreateIndex
CREATE INDEX "ReturnOrder_userId_idx" ON "ReturnOrder"("userId");

-- CreateIndex
CREATE INDEX "ReturnOrder_sellerId_idx" ON "ReturnOrder"("sellerId");

-- CreateIndex
CREATE INDEX "ReturnOrder_status_idx" ON "ReturnOrder"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnInspection_returnOrderId_key" ON "ReturnInspection"("returnOrderId");

-- CreateIndex
CREATE INDEX "ReturnCharge_returnOrderId_idx" ON "ReturnCharge"("returnOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiClient_keyHash_key" ON "ApiClient"("keyHash");

-- CreateIndex
CREATE INDEX "ApiClient_keyHash_idx" ON "ApiClient"("keyHash");

-- CreateIndex
CREATE INDEX "ApiClient_sellerId_idx" ON "ApiClient"("sellerId");

-- CreateIndex
CREATE INDEX "ApiClient_isActive_idx" ON "ApiClient"("isActive");

-- CreateIndex
CREATE INDEX "IdempotencyKey_clientId_key_idx" ON "IdempotencyKey"("clientId", "key");

-- CreateIndex
CREATE INDEX "IdempotencyKey_expiresAt_idx" ON "IdempotencyKey"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyKey_clientId_key_key" ON "IdempotencyKey"("clientId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingLabel_shipmentId_key" ON "ShippingLabel"("shipmentId");

-- CreateIndex
CREATE INDEX "ShippingLabel_shipmentId_idx" ON "ShippingLabel"("shipmentId");

-- CreateIndex
CREATE INDEX "WebhookSubscription_clientId_idx" ON "WebhookSubscription"("clientId");

-- CreateIndex
CREATE INDEX "WebhookSubscription_isActive_idx" ON "WebhookSubscription"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "OutboundWebhookEvent_eventId_key" ON "OutboundWebhookEvent"("eventId");

-- CreateIndex
CREATE INDEX "OutboundWebhookEvent_subscriptionId_idx" ON "OutboundWebhookEvent"("subscriptionId");

-- CreateIndex
CREATE INDEX "OutboundWebhookEvent_status_nextAttemptAt_idx" ON "OutboundWebhookEvent"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "OutboundWebhookEvent_createdAt_idx" ON "OutboundWebhookEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "KafkaOutboxEvent_eventId_key" ON "KafkaOutboxEvent"("eventId");

-- CreateIndex
CREATE INDEX "KafkaOutboxEvent_status_nextAttemptAt_idx" ON "KafkaOutboxEvent"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "KafkaOutboxEvent_topic_idx" ON "KafkaOutboxEvent"("topic");

-- CreateIndex
CREATE INDEX "KafkaOutboxEvent_createdAt_idx" ON "KafkaOutboxEvent"("createdAt");

-- CreateIndex
CREATE INDEX "KafkaProcessedEvent_consumerGroup_idx" ON "KafkaProcessedEvent"("consumerGroup");

-- CreateIndex
CREATE INDEX "KafkaProcessedEvent_processedAt_idx" ON "KafkaProcessedEvent"("processedAt");

-- CreateIndex
CREATE UNIQUE INDEX "KafkaProcessedEvent_consumerGroup_eventId_key" ON "KafkaProcessedEvent"("consumerGroup", "eventId");

-- CreateIndex
CREATE INDEX "KafkaFailedEvent_topic_idx" ON "KafkaFailedEvent"("topic");

-- CreateIndex
CREATE INDEX "KafkaFailedEvent_consumerGroup_idx" ON "KafkaFailedEvent"("consumerGroup");

-- CreateIndex
CREATE INDEX "KafkaFailedEvent_status_idx" ON "KafkaFailedEvent"("status");

-- CreateIndex
CREATE INDEX "KafkaFailedEvent_createdAt_idx" ON "KafkaFailedEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentPackage" ADD CONSTRAINT "ShipmentPackage_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentAddress" ADD CONSTRAINT "ShipmentAddress_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceabilityRule" ADD CONSTRAINT "ServiceabilityRule_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "ShippingZone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingRateCard" ADD CONSTRAINT "PricingRateCard_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "ShippingZone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingQuote" ADD CONSTRAINT "PricingQuote_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "ShippingZone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingQuote" ADD CONSTRAINT "PricingQuote_rateCardId_fkey" FOREIGN KEY ("rateCardId") REFERENCES "PricingRateCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pickup" ADD CONSTRAINT "Pickup_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickupAttempt" ADD CONSTRAINT "PickupAttempt_pickupId_fkey" FOREIGN KEY ("pickupId") REFERENCES "Pickup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickupScheduleHistory" ADD CONSTRAINT "PickupScheduleHistory_pickupId_fkey" FOREIGN KEY ("pickupId") REFERENCES "Pickup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryAttempt" ADD CONSTRAINT "DeliveryAttempt_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProofOfDelivery" ADD CONSTRAINT "ProofOfDelivery_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProofOfDelivery" ADD CONSTRAINT "ProofOfDelivery_deliveryAttemptId_fkey" FOREIGN KEY ("deliveryAttemptId") REFERENCES "DeliveryAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackingEvent" ADD CONSTRAINT "TrackingEvent_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryPartner" ADD CONSTRAINT "DeliveryPartner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryPartner" ADD CONSTRAINT "DeliveryPartner_serviceZoneId_fkey" FOREIGN KEY ("serviceZoneId") REFERENCES "ShippingZone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryTask" ADD CONSTRAINT "DeliveryTask_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryTask" ADD CONSTRAINT "DeliveryTask_deliveryPartnerId_fkey" FOREIGN KEY ("deliveryPartnerId") REFERENCES "DeliveryPartner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryTask" ADD CONSTRAINT "DeliveryTask_returnOrderId_fkey" FOREIGN KEY ("returnOrderId") REFERENCES "ReturnOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryTaskEvent" ADD CONSTRAINT "DeliveryTaskEvent_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "DeliveryTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentException" ADD CONSTRAINT "ShipmentException_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentException" ADD CONSTRAINT "ShipmentException_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentException" ADD CONSTRAINT "ShipmentException_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_paymentOrderId_fkey" FOREIGN KEY ("paymentOrderId") REFERENCES "PaymentOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CODOrder" ADD CONSTRAINT "CODOrder_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CODCollection" ADD CONSTRAINT "CODCollection_codOrderId_fkey" FOREIGN KEY ("codOrderId") REFERENCES "CODOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CODCollection" ADD CONSTRAINT "CODCollection_deliveryPartnerId_fkey" FOREIGN KEY ("deliveryPartnerId") REFERENCES "DeliveryPartner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CODLedgerEntry" ADD CONSTRAINT "CODLedgerEntry_codOrderId_fkey" FOREIGN KEY ("codOrderId") REFERENCES "CODOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_paymentOrderId_fkey" FOREIGN KEY ("paymentOrderId") REFERENCES "PaymentOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_paymentTransactionId_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES "PaymentTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnOrder" ADD CONSTRAINT "ReturnOrder_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnOrder" ADD CONSTRAINT "ReturnOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnOrder" ADD CONSTRAINT "ReturnOrder_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnInspection" ADD CONSTRAINT "ReturnInspection_returnOrderId_fkey" FOREIGN KEY ("returnOrderId") REFERENCES "ReturnOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnCharge" ADD CONSTRAINT "ReturnCharge_returnOrderId_fkey" FOREIGN KEY ("returnOrderId") REFERENCES "ReturnOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiClient" ADD CONSTRAINT "ApiClient_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdempotencyKey" ADD CONSTRAINT "IdempotencyKey_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ApiClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingLabel" ADD CONSTRAINT "ShippingLabel_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookSubscription" ADD CONSTRAINT "WebhookSubscription_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ApiClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundWebhookEvent" ADD CONSTRAINT "OutboundWebhookEvent_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "WebhookSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

