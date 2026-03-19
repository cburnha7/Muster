import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSkatingBooking() {
  const booking = await prisma.booking.findUnique({
    where: { id: '0fa186ab-6a3d-4da5-8f62-99d814aa4833' },
    include: { 
      user: true, 
      event: true 
    },
  });

  console.log('Skating Booking Details:');
  console.log('  Booking ID:', booking?.id);
  console.log('  User ID:', booking?.userId);
  console.log('  User Email:', booking?.user.email);
  console.log('  Event ID:', booking?.eventId);
  console.log('  Event Title:', booking?.event?.title);
  console.log('  Event Start:', booking?.event?.startTime);
  console.log('  Now:', new Date());
  console.log('  Is upcoming:', booking?.event?.startTime && booking.event.startTime > new Date());
  console.log('  Booking Status:', booking?.status);
  console.log('  Payment Status:', booking?.paymentStatus);

  await prisma.$disconnect();
}

checkSkatingBooking();
