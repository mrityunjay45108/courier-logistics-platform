import { PrismaClient, Role, ShipmentStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  const passwordHash = await bcrypt.hash('Admin@12345', 10);
  const sellerPasswordHash = await bcrypt.hash('Seller@12345', 10);
  const customerPasswordHash = await bcrypt.hash('Customer@12345', 10);
  const opsPasswordHash = await bcrypt.hash('Ops@12345', 10);
  const deliveryPasswordHash = await bcrypt.hash('Delivery@12345', 10);

  const users = [
    {
      name: 'System Administrator',
      email: 'admin@courier.local',
      phone: '+919876543210',
      passwordHash,
      role: Role.ADMIN,
    },
    {
      name: 'Apex Merchant Store',
      email: 'seller@courier.local',
      phone: '+919876543211',
      passwordHash: sellerPasswordHash,
      role: Role.SELLER,
    },
    {
      name: 'Jane Customer',
      email: 'customer@courier.local',
      phone: '+919876543212',
      passwordHash: customerPasswordHash,
      role: Role.CUSTOMER,
    },
    {
      name: 'Hub Operations Manager',
      email: 'ops@courier.local',
      phone: '+919876543213',
      passwordHash: opsPasswordHash,
      role: Role.OPERATIONS,
    },
    {
      name: 'Swift Delivery Partner',
      email: 'delivery@courier.local',
      phone: '+919876543214',
      passwordHash: deliveryPasswordHash,
      role: Role.DELIVERY_PARTNER,
    },
  ];

  for (const user of users) {
    const existing = await prisma.user.findUnique({
      where: { email: user.email },
    });

    if (!existing) {
      const created = await prisma.user.create({
        data: user,
      });
      console.log(` Created ${user.role} account: ${created.email}`);
    } else {
      console.log(` Account already exists: ${user.email}`);
    }
  }

  // Find seller to link a sample initial shipment
  const seller = await prisma.user.findUnique({
    where: { email: 'seller@courier.local' },
  });

  if (seller) {
    const sampleTrackingNumber = 'TRK-DEMO-9988';
    const existingShipment = await prisma.shipment.findUnique({
      where: { trackingNumber: sampleTrackingNumber },
    });

    if (!existingShipment) {
      const shipment = await prisma.shipment.create({
        data: {
          trackingNumber: sampleTrackingNumber,
          senderId: seller.id,
          recipientName: 'Rahul Sharma',
          recipientPhone: '+919811223344',
          destinationAddress: 'Flat 402, Cyber Heights, Sector 62, Noida, UP 201309',
          status: ShipmentStatus.IN_TRANSIT,
          carrier: 'Express Prime Logistics',
          weightKg: 2.4,
          estimatedDelivery: new Date(Date.now() + 48 * 3600 * 1000),
          events: {
            create: [
              {
                status: ShipmentStatus.CREATED,
                location: 'Merchant Warehouse, Mumbai',
                description: 'Shipping label created and manifests electronically generated.',
                timestamp: new Date(Date.now() - 36 * 3600 * 1000),
              },
              {
                status: ShipmentStatus.PICKED_UP,
                location: 'Bhiwandi Hub, Mumbai',
                description: 'Package picked up by courier partner.',
                timestamp: new Date(Date.now() - 24 * 3600 * 1000),
              },
              {
                status: ShipmentStatus.IN_TRANSIT,
                location: 'Delhi Central Transit Hub',
                description: 'Consignment sorted and in-transit to delivery branch.',
                timestamp: new Date(Date.now() - 6 * 3600 * 1000),
              },
            ],
          },
        },
      });
      console.log(` Created demo shipment for tracking tests: ${shipment.trackingNumber}`);
    }
  }

  console.log('✅ Database seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error('Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
