import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:3000/api';

async function testAllUsersBookings() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    for (const user of users) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📋 Testing bookings for: ${user.email}`);
      console.log(`   User ID: ${user.id}`);
      console.log(`${'='.repeat(60)}\n`);

      try {
        const response = await axios.get(`${API_URL}/users/bookings`, {
          params: {
            status: 'upcoming',
            page: 1,
            limit: 20,
          },
          headers: {
            'x-user-id': user.id,
          },
        });

        console.log(`✅ Status: ${response.status}`);
        console.log(`📊 Bookings found: ${response.data.data.length}\n`);

        if (response.data.data.length > 0) {
          response.data.data.forEach((booking: any) => {
            console.log(`  📌 ${booking.event?.title || 'N/A'}`);
            console.log(`     Event ID: ${booking.eventId}`);
            console.log(`     Start: ${booking.event?.startTime}`);
            console.log(`     Status: ${booking.status}`);
            console.log('');
          });
        } else {
          console.log('  (No bookings)\n');
        }
      } catch (error: any) {
        console.error(`❌ Error: ${error.message}\n`);
      }
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

testAllUsersBookings();
