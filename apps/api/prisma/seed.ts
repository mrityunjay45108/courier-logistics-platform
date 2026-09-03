import {
  PrismaClient,
  Role,
  ShipmentStatus,
  ShipmentType,
  PackageType,
  ShipmentAddressType,
  AddressType,
  SurchargeType,
  ShippingZoneCode,
  PartnerStatus,
  AvailabilityStatus,
  VehicleType,
  TaskType,
  TaskStatus,
  ExceptionType,
  ExceptionSeverity,
  ExceptionStatus,
  PaymentOrderStatus,
  CODOrderStatus,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive database seed for Phases 2-10...');

  // 1. Seed Users for all 5 roles
  const adminHash = await bcrypt.hash('Admin@12345', 10);
  const sellerHash = await bcrypt.hash('Seller@12345', 10);
  const customerHash = await bcrypt.hash('Customer@12345', 10);
  const opsHash = await bcrypt.hash('Ops@12345', 10);
  const deliveryHash = await bcrypt.hash('Delivery@12345', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@courier.local' },
    update: { role: Role.ADMIN, isActive: true },
    create: {
      name: 'System Administrator',
      email: 'admin@courier.local',
      phone: '+919876543210',
      passwordHash: adminHash,
      role: Role.ADMIN,
      emailVerified: true,
      phoneVerified: true,
    },
  });

  const seller = await prisma.user.upsert({
    where: { email: 'seller@courier.local' },
    update: { role: Role.SELLER, isActive: true, companyName: 'Apex Merchant Store' },
    create: {
      name: 'Apex Merchant Store',
      email: 'seller@courier.local',
      phone: '+919876543211',
      passwordHash: sellerHash,
      role: Role.SELLER,
      companyName: 'Apex Merchant Store',
      emailVerified: true,
      phoneVerified: true,
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: 'customer@courier.local' },
    update: { role: Role.CUSTOMER, isActive: true },
    create: {
      name: 'Jane Customer',
      email: 'customer@courier.local',
      phone: '+919876543212',
      passwordHash: customerHash,
      role: Role.CUSTOMER,
      emailVerified: true,
      phoneVerified: true,
    },
  });

  const ops = await prisma.user.upsert({
    where: { email: 'ops@courier.local' },
    update: { role: Role.OPERATIONS, isActive: true },
    create: {
      name: 'Hub Operations Manager',
      email: 'ops@courier.local',
      phone: '+919876543213',
      passwordHash: opsHash,
      role: Role.OPERATIONS,
      emailVerified: true,
      phoneVerified: true,
    },
  });

  const deliveryUser = await prisma.user.upsert({
    where: { email: 'delivery@courier.local' },
    update: { role: Role.DELIVERY_PARTNER, isActive: true },
    create: {
      name: 'Swift Delivery Partner',
      email: 'delivery@courier.local',
      phone: '+919876543214',
      passwordHash: deliveryHash,
      role: Role.DELIVERY_PARTNER,
      emailVerified: true,
      phoneVerified: true,
    },
  });

  console.log('✅ Users seeded for all 5 roles.');

  // 1b. Seed Demo E-Commerce API Client for server-to-server integration
  // Raw Key: ck_live_ecommerce_test_key_2026
  const demoApiKey = 'ck_live_ecommerce_test_key_2026';
  const demoKeyHash = crypto.createHash('sha256').update(demoApiKey).digest('hex');

  const apiClient = await prisma.apiClient.upsert({
    where: { keyHash: demoKeyHash },
    update: { isActive: true, sellerId: seller.id },
    create: {
      name: 'Apex E-Commerce Platform',
      keyHash: demoKeyHash,
      keyPrefix: 'ck_live_ecommerce',
      sellerId: seller.id,
      scopes: ['shipments:read', 'shipments:write', 'pricing:read', 'tracking:read', 'webhooks:manage'],
      isActive: true,
    },
  });

  // Seed default Webhook Subscription for the API Client
  const demoWebhookSecret = 'whsec_demo_ecommerce_signing_secret_2026';
  const demoSecretHash = crypto.createHash('sha256').update(demoWebhookSecret).digest('hex');

  await prisma.webhookSubscription.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: { clientId: apiClient.id, secretKey: demoWebhookSecret, secretHash: demoSecretHash },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      clientId: apiClient.id,
      url: 'https://ecommerce.local/api/v1/shipments/webhooks/courier',
      secretHash: demoSecretHash,
      secretKey: demoWebhookSecret,
      subscribedEvents: ['shipment.*', 'rto.*'],
      isActive: true,
    },
  });

  console.log('✅ Demo E-Commerce ApiClient and Webhook Subscription seeded.');

  // 2. Seed Customer & Seller Saved Addresses
  await prisma.address.deleteMany({ where: { userId: customer.id } });
  const custHomeAddr = await prisma.address.create({
    data: {
      userId: customer.id,
      name: 'Jane Customer',
      phone: '+919876543212',
      addressLine1: 'Flat 402, Ganga Heights',
      addressLine2: 'Boring Road',
      city: 'Patna',
      state: 'Bihar',
      postalCode: '800001',
      country: 'India',
      landmark: 'Near AN College',
      type: AddressType.HOME,
      isDefault: true,
    },
  });

  await prisma.address.create({
    data: {
      userId: customer.id,
      name: 'Jane Customer (Office)',
      phone: '+919876543212',
      addressLine1: 'Tower B, Tech Park',
      addressLine2: 'Sector 62',
      city: 'Noida',
      state: 'Uttar Pradesh',
      postalCode: '201301',
      country: 'India',
      landmark: 'Near Metro Station',
      type: AddressType.OFFICE,
      isDefault: false,
    },
  });

  await prisma.address.deleteMany({ where: { userId: seller.id } });
  const sellerOriginAddr = await prisma.address.create({
    data: {
      userId: seller.id,
      name: 'Apex Merchant Fulfillment Center',
      phone: '+919876543211',
      addressLine1: 'Warehouse 14, Okhla Phase 3',
      city: 'New Delhi',
      state: 'Delhi',
      postalCode: '110001',
      country: 'India',
      landmark: 'Near ESI Hospital',
      type: AddressType.OFFICE,
      isDefault: true,
    },
  });

  console.log('✅ Addresses seeded.');

  // 3. Seed Shipping Zones
  const zonesData = [
    { code: ShippingZoneCode.LOCAL, name: 'Local Metro Zone', description: 'Intra-city express' },
    { code: ShippingZoneCode.REGIONAL, name: 'Regional Zone', description: 'Intra-state surface logistics' },
    { code: ShippingZoneCode.NATIONAL, name: 'National Zone', description: 'Inter-state express lines' },
    { code: ShippingZoneCode.REMOTE, name: 'Remote & Special Areas', description: 'Hill areas and islands' },
  ];

  const zoneMap: Record<string, string> = {};
  for (const z of zonesData) {
    const zone = await prisma.shippingZone.upsert({
      where: { code: z.code },
      update: { name: z.name, description: z.description },
      create: { code: z.code, name: z.name, description: z.description, isActive: true },
    });
    zoneMap[z.code] = zone.id;
  }
  console.log('✅ Shipping zones seeded.');

  // 4. Seed Serviceability Rules
  const serviceabilityData = [
    { pincode: '110001', city: 'New Delhi', state: 'Delhi', zoneCode: ShippingZoneCode.NATIONAL },
    { pincode: '201301', city: 'Noida', state: 'Uttar Pradesh', zoneCode: ShippingZoneCode.LOCAL },
    { pincode: '800001', city: 'Patna', state: 'Bihar', zoneCode: ShippingZoneCode.REGIONAL },
    { pincode: '400001', city: 'Mumbai', state: 'Maharashtra', zoneCode: ShippingZoneCode.NATIONAL },
    { pincode: '560001', city: 'Bengaluru', state: 'Karnataka', zoneCode: ShippingZoneCode.NATIONAL },
    { pincode: '795001', city: 'Imphal', state: 'Manipur', zoneCode: ShippingZoneCode.REMOTE },
  ];

  for (const item of serviceabilityData) {
    await prisma.serviceabilityRule.upsert({
      where: { pincode: item.pincode },
      update: { city: item.city, state: item.state, zoneId: zoneMap[item.zoneCode] },
      create: {
        pincode: item.pincode,
        city: item.city,
        state: item.state,
        zoneId: zoneMap[item.zoneCode],
        isPickupAvailable: true,
        isDeliveryAvailable: true,
        isActive: true,
      },
    });
  }
  console.log('✅ Serviceability rules seeded.');

  // 5. Seed Pricing Rate Cards
  const rateCards = [
    {
      code: 'RC-LOCAL-PRE',
      name: 'Local Express Prepaid Rate Card',
      zoneId: zoneMap[ShippingZoneCode.LOCAL],
      shipmentType: ShipmentType.PREPAID,
      baseWeight: 0.5,
      baseRate: 40.0,
      additionalWeightUnit: 0.5,
      additionalWeightRate: 20.0,
      fuelSurchargeType: SurchargeType.PERCENTAGE,
      fuelSurchargeValue: 5.0,
      taxPercentage: 18.0,
    },
    {
      code: 'RC-REGIONAL-PRE',
      name: 'Regional Surface Prepaid Rate Card',
      zoneId: zoneMap[ShippingZoneCode.REGIONAL],
      shipmentType: ShipmentType.PREPAID,
      baseWeight: 0.5,
      baseRate: 60.0,
      additionalWeightUnit: 0.5,
      additionalWeightRate: 30.0,
      fuelSurchargeType: SurchargeType.PERCENTAGE,
      fuelSurchargeValue: 8.0,
      taxPercentage: 18.0,
    },
    {
      code: 'RC-NATIONAL-PRE',
      name: 'National Air Express Prepaid Rate Card',
      zoneId: zoneMap[ShippingZoneCode.NATIONAL],
      shipmentType: ShipmentType.PREPAID,
      baseWeight: 0.5,
      baseRate: 80.0,
      additionalWeightUnit: 0.5,
      additionalWeightRate: 40.0,
      fuelSurchargeType: SurchargeType.PERCENTAGE,
      fuelSurchargeValue: 10.0,
      taxPercentage: 18.0,
    },
    {
      code: 'RC-NATIONAL-COD',
      name: 'National Express COD Rate Card',
      zoneId: zoneMap[ShippingZoneCode.NATIONAL],
      shipmentType: ShipmentType.COD,
      baseWeight: 0.5,
      baseRate: 80.0,
      additionalWeightUnit: 0.5,
      additionalWeightRate: 40.0,
      codEnabled: true,
      codFixedFee: 30.0,
      codPercentage: 1.5,
      fuelSurchargeType: SurchargeType.PERCENTAGE,
      fuelSurchargeValue: 10.0,
      taxPercentage: 18.0,
    },
    {
      code: 'RC-REMOTE-PRE',
      name: 'Remote Special Zone Rate Card',
      zoneId: zoneMap[ShippingZoneCode.REMOTE],
      shipmentType: ShipmentType.PREPAID,
      baseWeight: 0.5,
      baseRate: 120.0,
      additionalWeightUnit: 0.5,
      additionalWeightRate: 60.0,
      fuelSurchargeType: SurchargeType.PERCENTAGE,
      fuelSurchargeValue: 15.0,
      taxPercentage: 18.0,
    },
  ];

  for (const rc of rateCards) {
    await prisma.pricingRateCard.upsert({
      where: { code: rc.code },
      update: rc,
      create: { ...rc, isActive: true },
    });
  }
  console.log('✅ Pricing rate cards seeded.');

  // 6. Seed Delivery Partner Profile
  const partner = await prisma.deliveryPartner.upsert({
    where: { userId: deliveryUser.id },
    update: {
      status: PartnerStatus.ACTIVE,
      availabilityStatus: AvailabilityStatus.AVAILABLE,
      serviceZoneId: zoneMap[ShippingZoneCode.LOCAL],
    },
    create: {
      userId: deliveryUser.id,
      partnerCode: 'RDR-8F4K29',
      fullName: 'Swift Delivery Partner',
      phone: '+919876543214',
      email: 'delivery@courier.local',
      status: PartnerStatus.ACTIVE,
      availabilityStatus: AvailabilityStatus.AVAILABLE,
      vehicleType: VehicleType.BIKE,
      vehicleNumber: 'DL-01-AB-1234',
      serviceZoneId: zoneMap[ShippingZoneCode.LOCAL],
    },
  });
  console.log('✅ Delivery partner profile seeded.');

  // 7. Seed Tracking Locations
  const locations = [
    { code: 'HUB-DEL-01', name: 'Delhi Central Hub', city: 'New Delhi', state: 'Delhi', type: 'HUB' },
    { code: 'HUB-PAT-01', name: 'Patna Regional Hub', city: 'Patna', state: 'Bihar', type: 'HUB' },
    { code: 'HUB-BLR-01', name: 'Bengaluru South Hub', city: 'Bengaluru', state: 'Karnataka', type: 'HUB' },
  ];

  for (const loc of locations) {
    await prisma.trackingLocation.upsert({
      where: { code: loc.code },
      update: loc,
      create: loc,
    });
  }
  console.log('✅ Tracking locations seeded.');

  // 8. Seed Demo Consignments
  // Consignment 1: In Transit
  const shipment1 = await prisma.shipment.upsert({
    where: { trackingNumber: 'CRL-8F4K2P9X' },
    update: {},
    create: {
      trackingNumber: 'CRL-8F4K2P9X',
      externalOrderId: 'ORD-2026-9901',
      customerId: customer.id,
      sellerId: seller.id,
      status: ShipmentStatus.IN_TRANSIT,
      shipmentType: ShipmentType.PREPAID,
      shippingCost: 118.0,
      codAmount: 0.0,
      currency: 'INR',
      carrier: 'Apex Express Prime',
      notes: 'Fragile electronic equipment',
      package: {
        create: {
          weight: 1.5,
          length: 25.0,
          width: 20.0,
          height: 15.0,
          quantity: 1,
          packageType: PackageType.ELECTRONICS,
          description: 'Wireless Bluetooth Headset',
        },
      },
      addresses: {
        create: [
          {
            type: ShipmentAddressType.PICKUP,
            name: sellerOriginAddr.name,
            phone: sellerOriginAddr.phone,
            addressLine1: sellerOriginAddr.addressLine1,
            city: sellerOriginAddr.city,
            state: sellerOriginAddr.state,
            postalCode: sellerOriginAddr.postalCode,
            country: 'India',
          },
          {
            type: ShipmentAddressType.DELIVERY,
            name: custHomeAddr.name,
            phone: custHomeAddr.phone,
            addressLine1: custHomeAddr.addressLine1,
            addressLine2: custHomeAddr.addressLine2,
            city: custHomeAddr.city,
            state: custHomeAddr.state,
            postalCode: custHomeAddr.postalCode,
            country: 'India',
          },
        ],
      },
      events: {
        create: [
          {
            status: ShipmentStatus.CREATED,
            eventType: 'SHIPMENT_CREATED',
            title: 'Shipment Created',
            description: 'Shipment created and electronic shipping label generated',
            location: 'New Delhi',
            city: 'New Delhi',
            state: 'Delhi',
            isPublic: true,
          },
          {
            status: ShipmentStatus.PICKED_UP,
            eventType: 'PICKED_UP',
            title: 'Picked Up by Courier',
            description: 'Consignment collected from seller origin fulfillment hub',
            location: 'New Delhi',
            city: 'New Delhi',
            state: 'Delhi',
            isPublic: true,
          },
          {
            status: ShipmentStatus.IN_TRANSIT,
            eventType: 'IN_TRANSIT',
            title: 'In Transit between Hubs',
            description: 'Dispatched via air line-haul towards regional destination hub',
            location: 'Patna Hub',
            city: 'Patna',
            state: 'Bihar',
            isPublic: true,
          },
        ],
      },
    },
  });

  // Consignment 2: Out For Delivery (COD) with DeliveryTask assigned to Rider
  const shipment2 = await prisma.shipment.upsert({
    where: { trackingNumber: 'CRL-772299AA' },
    update: {},
    create: {
      trackingNumber: 'CRL-772299AA',
      externalOrderId: 'ORD-2026-9902',
      customerId: customer.id,
      sellerId: seller.id,
      status: ShipmentStatus.OUT_FOR_DELIVERY,
      shipmentType: ShipmentType.COD,
      shippingCost: 153.4,
      codAmount: 1250.0,
      currency: 'INR',
      carrier: 'Apex Express Prime',
      notes: 'Collect Cash or UPI on delivery',
      package: {
        create: {
          weight: 2.0,
          length: 30.0,
          width: 25.0,
          height: 10.0,
          quantity: 1,
          packageType: PackageType.PARCEL,
          description: 'Sports Shoes Pair',
        },
      },
      addresses: {
        create: [
          {
            type: ShipmentAddressType.PICKUP,
            name: sellerOriginAddr.name,
            phone: sellerOriginAddr.phone,
            addressLine1: sellerOriginAddr.addressLine1,
            city: sellerOriginAddr.city,
            state: sellerOriginAddr.state,
            postalCode: sellerOriginAddr.postalCode,
          },
          {
            type: ShipmentAddressType.DELIVERY,
            name: 'Rahul Sharma',
            phone: '+919988776655',
            addressLine1: 'Flat 12, Sunrise Apartments, Sector 62',
            city: 'Noida',
            state: 'Uttar Pradesh',
            postalCode: '201301',
          },
        ],
      },
      events: {
        create: [
          {
            status: ShipmentStatus.CREATED,
            eventType: 'SHIPMENT_CREATED',
            title: 'Shipment Created',
            description: 'Shipment created successfully',
            city: 'New Delhi',
            state: 'Delhi',
            isPublic: true,
          },
          {
            status: ShipmentStatus.OUT_FOR_DELIVERY,
            eventType: 'OUT_FOR_DELIVERY',
            title: 'Out for Delivery',
            description: 'Out for delivery with rider Swift Delivery Partner',
            city: 'Noida',
            state: 'Uttar Pradesh',
            isPublic: true,
          },
        ],
      },
      delivery: {
        create: {
          scheduledDate: new Date(),
          timeSlotStart: '09:00',
          timeSlotEnd: '18:00',
          status: 'OUT_FOR_DELIVERY',
          recipientName: 'Rahul Sharma',
          recipientPhone: '+919988776655',
        },
      },
      codOrder: {
        create: {
          customerId: customer.id,
          sellerId: seller.id,
          codAmount: 1250.0,
          outstandingAmount: 1250.0,
          status: CODOrderStatus.OUT_FOR_DELIVERY,
        },
      },
      tasks: {
        create: {
          taskNumber: 'TASK-1002-DLV',
          deliveryPartnerId: partner.id,
          taskType: TaskType.DELIVERY,
          status: TaskStatus.STARTED,
          startedAt: new Date(),
        },
      },
    },
  });

  // Consignment 3: Delivered with POD
  const shipment3 = await prisma.shipment.upsert({
    where: { trackingNumber: 'CRL-554433BB' },
    update: {},
    create: {
      trackingNumber: 'CRL-554433BB',
      externalOrderId: 'ORD-2026-9903',
      customerId: customer.id,
      sellerId: seller.id,
      status: ShipmentStatus.DELIVERED,
      shipmentType: ShipmentType.PREPAID,
      shippingCost: 94.4,
      codAmount: 0.0,
      currency: 'INR',
      carrier: 'Apex Express Prime',
      deliveredAt: new Date(),
      package: {
        create: {
          weight: 0.8,
          length: 20.0,
          width: 15.0,
          height: 5.0,
          quantity: 1,
          packageType: PackageType.PARCEL,
          description: 'Hardcover Novel Book',
        },
      },
      addresses: {
        create: [
          {
            type: ShipmentAddressType.PICKUP,
            name: sellerOriginAddr.name,
            phone: sellerOriginAddr.phone,
            addressLine1: sellerOriginAddr.addressLine1,
            city: sellerOriginAddr.city,
            state: sellerOriginAddr.state,
            postalCode: sellerOriginAddr.postalCode,
          },
          {
            type: ShipmentAddressType.DELIVERY,
            name: custHomeAddr.name,
            phone: custHomeAddr.phone,
            addressLine1: custHomeAddr.addressLine1,
            city: custHomeAddr.city,
            state: custHomeAddr.state,
            postalCode: custHomeAddr.postalCode,
          },
        ],
      },
      proofOfDelivery: {
        create: {
          recipientName: 'Jane Customer',
          recipientRelation: 'SELF',
          notes: 'Handed over directly to customer at doorstep',
        },
      },
      events: {
        create: [
          {
            status: ShipmentStatus.DELIVERED,
            eventType: 'DELIVERED',
            title: 'Delivered',
            description: 'Shipment delivered to recipient Jane Customer',
            city: 'Patna',
            state: 'Bihar',
            isPublic: true,
          },
        ],
      },
    },
  });

  // Consignment 4: Failed Delivery with Exception
  const shipment4 = await prisma.shipment.upsert({
    where: { trackingNumber: 'CRL-332211CC' },
    update: {},
    create: {
      trackingNumber: 'CRL-332211CC',
      externalOrderId: 'ORD-2026-9904',
      customerId: customer.id,
      sellerId: seller.id,
      status: ShipmentStatus.FAILED_DELIVERY,
      shipmentType: ShipmentType.PREPAID,
      shippingCost: 118.0,
      codAmount: 0.0,
      carrier: 'Apex Express Prime',
      package: {
        create: {
          weight: 1.0,
          length: 20.0,
          width: 15.0,
          height: 10.0,
          quantity: 1,
          packageType: PackageType.CLOTHING,
          description: 'Winter Jacket',
        },
      },
      addresses: {
        create: [
          {
            type: ShipmentAddressType.PICKUP,
            name: sellerOriginAddr.name,
            phone: sellerOriginAddr.phone,
            addressLine1: sellerOriginAddr.addressLine1,
            city: sellerOriginAddr.city,
            state: sellerOriginAddr.state,
            postalCode: sellerOriginAddr.postalCode,
          },
          {
            type: ShipmentAddressType.DELIVERY,
            name: 'Vikas Kumar',
            phone: '+919811223344',
            addressLine1: 'House 88, Kankarbagh',
            city: 'Patna',
            state: 'Bihar',
            postalCode: '800001',
          },
        ],
      },
      events: {
        create: [
          {
            status: ShipmentStatus.FAILED_DELIVERY,
            eventType: 'DELIVERY_FAILED',
            title: 'Delivery Attempt Failed',
            description: 'Customer unavailable at provided shipping address',
            city: 'Patna',
            state: 'Bihar',
            isPublic: true,
          },
        ],
      },
      exceptions: {
        create: {
          type: ExceptionType.CUSTOMER_UNAVAILABLE,
          severity: ExceptionSeverity.MEDIUM,
          status: ExceptionStatus.OPEN,
          title: 'Delivery Attempt Failed - Customer Unavailable',
          description: 'First delivery attempt could not be completed. Customer was not reachable on phone.',
          source: 'OPERATIONS',
        },
      },
    },
  });

  console.log('✅ Demo consignments, tasks, and exceptions seeded.');
  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
