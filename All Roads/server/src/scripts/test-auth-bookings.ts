import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

async function testAuthBookings() {
  try {
    console.log('Testing authenticated bookings endpoint...\n');

    // Find the host user
    const hostUser = await prisma.user.findFirst({
      where: { email: 'host@muster.app' },
    });

    if (!hostUser) {
      console.log('Host user not found');
      return;
    }

    console.log('Host user:', hostUser.id, hostUser.email);

    // Generate a token for the host user
    const token = jwt.sign(
      { userId: hostUser.id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    console.log('Generated token:', token.substring(0, 50) + '...');

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { userId: string };
    console.log('Decoded token userId:', decoded.userId);

    // Now simulate the endpoint query with the authenticated user
    const userId = decoded.userId;
    const where: any = { 
      userId,
      event: {
        startTime: { gte: new Date() },
      },
    };

    console.log('\nQuerying bookings with userId:', userId);
    console.log('Current time:', new Date().toISOString());

    const bookings = await prisma.booking.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            sportType: true,
            startTime: true,
            endTime: true,
            imageUrl: true,
            facility: {
              select: {
                id: true,
                name: true,
                street: true,
                city: true,
                state: true,
              },
            },
          },
        },
        facility: {
          select: {
            id: true,
            name: true,
            street: true,
            city: true,
            state: true,
            imageUrl: true,
          },
        },
      },
    });

    console.log('\n✅ Bookings found:', bookings.length);
    bookings.forEach((booking, index) => {
      console.log(`\nBooking ${index + 1}:`);
      console.log('  ID:', booking.id);
      console.log('  Event:', booking.event?.title);
      console.log('  Start:', booking.event?.startTime);
      console.log('  Status:', booking.status);
    });

    // Test what the endpoint would return
    const response = {
      data: bookings,
      pagination: {
        page: 1,
        limit: 20,
        total: bookings.length,
        totalPages: Math.ceil(bookings.length / 20),
      },
    };

    console.log('\n📦 API Response:');
    console.log(JSON.stringify(response, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAuthBookings();
