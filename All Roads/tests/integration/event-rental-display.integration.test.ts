/**
 * Event Rental Display Integration Test
 * 
 * Tests for Task 13.6: Update event details screen to show rental information
 * 
 * This test verifies that:
 * 1. Events with rentals return complete rental information from API
 * 2. Rental information includes court/field name
 * 3. Rental information includes sport type
 * 4. Events without rentals don't include rental data
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Event Rental Display Integration', () => {
  let testFacility: any;
  let testCourt: any;
  let testTimeSlot: any;
  let testRental: any;
  let testUser: any;
  let testEventWithRental: any;
  let testEventWithoutRental: any;

  beforeAll(async () => {
    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: `test-rental-display-${Date.now()}@example.com`,
        passwordHash: 'hashed_password',
        firstName: 'Test',
        lastName: 'User',
        phoneNumber: '555-0100',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male',
      },
    });

    // Create test facility
    testFacility = await prisma.facility.create({
      data: {
        name: 'Test Facility for Rental Display',
        street: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        country: 'USA',
        latitude: 40.7128,
        longitude: -74.0060,
        description: 'Test facility',
        amenities: ['Parking'],
        operatingHours: '9am-9pm',
        contactPhone: '555-0100',
        contactEmail: 'test@facility.com',
        pricePerHour: 50,
        sportTypes: ['basketball'],
        ownerId: testUser.id,
      },
    });

    // Create test court
    testCourt = await prisma.facilityCourt.create({
      data: {
        facilityId: testFacility.id,
        name: 'Test Court 1',
        sportType: 'basketball',
        capacity: 10,
        isIndoor: true,
        isActive: true,
        displayOrder: 1,
      },
    });

    // Create test time slot
    const slotDate = new Date();
    slotDate.setDate(slotDate.getDate() + 7); // 7 days from now
    const slotDateStr = slotDate.toISOString().split('T')[0];

    testTimeSlot = await prisma.facilityTimeSlot.create({
      data: {
        courtId: testCourt.id,
        date: slotDateStr,
        startTime: '14:00',
        endTime: '16:00',
        status: 'rented',
        price: 100,
      },
    });

    // Create test rental
    testRental = await prisma.facilityRental.create({
      data: {
        userId: testUser.id,
        timeSlotId: testTimeSlot.id,
        status: 'confirmed',
        totalPrice: 100,
        paymentStatus: 'paid',
      },
    });

    // Create event WITH rental
    const eventStartTime = new Date(slotDateStr + 'T14:00:00Z');
    const eventEndTime = new Date(slotDateStr + 'T16:00:00Z');

    testEventWithRental = await prisma.event.create({
      data: {
        title: 'Test Event with Rental',
        description: 'Event linked to rental',
        sportType: 'basketball',
        facilityId: testFacility.id,
        organizerId: testUser.id,
        startTime: eventStartTime,
        endTime: eventEndTime,
        maxParticipants: 10,
        currentParticipants: 0,
        price: 0,
        currency: 'USD',
        skillLevel: 'intermediate',
        equipment: [],
        status: 'active',
        eventType: 'pickup',
        rentalId: testRental.id, // Link to rental
      },
    });

    // Create event WITHOUT rental
    const eventStartTime2 = new Date();
    eventStartTime2.setDate(eventStartTime2.getDate() + 14);
    const eventEndTime2 = new Date(eventStartTime2);
    eventEndTime2.setHours(eventEndTime2.getHours() + 2);

    testEventWithoutRental = await prisma.event.create({
      data: {
        title: 'Test Event without Rental',
        description: 'Event not linked to rental',
        sportType: 'basketball',
        facilityId: testFacility.id,
        organizerId: testUser.id,
        startTime: eventStartTime2,
        endTime: eventEndTime2,
        maxParticipants: 10,
        currentParticipants: 0,
        price: 0,
        currency: 'USD',
        skillLevel: 'intermediate',
        equipment: [],
        status: 'active',
        eventType: 'pickup',
        // No rentalId
      },
    });
  });

  afterAll(async () => {
    // Clean up in reverse order of creation
    if (testEventWithRental) {
      await prisma.event.delete({ where: { id: testEventWithRental.id } });
    }
    if (testEventWithoutRental) {
      await prisma.event.delete({ where: { id: testEventWithoutRental.id } });
    }
    if (testRental) {
      await prisma.facilityRental.delete({ where: { id: testRental.id } });
    }
    if (testTimeSlot) {
      await prisma.facilityTimeSlot.delete({ where: { id: testTimeSlot.id } });
    }
    if (testCourt) {
      await prisma.facilityCourt.delete({ where: { id: testCourt.id } });
    }
    if (testFacility) {
      await prisma.facility.delete({ where: { id: testFacility.id } });
    }
    if (testUser) {
      await prisma.user.delete({ where: { id: testUser.id } });
    }

    await prisma.$disconnect();
  });

  describe('Event with Rental', () => {
    it('should retrieve event with complete rental information', async () => {
      const event = await prisma.event.findUnique({
        where: { id: testEventWithRental.id },
        include: {
          rental: {
            include: {
              timeSlot: {
                include: {
                  court: true,
                },
              },
            },
          },
        },
      });

      expect(event).toBeTruthy();
      expect(event?.rentalId).toBe(testRental.id);
      expect(event?.rental).toBeTruthy();
    });

    it('should include court/field name in rental information', async () => {
      const event = await prisma.event.findUnique({
        where: { id: testEventWithRental.id },
        include: {
          rental: {
            include: {
              timeSlot: {
                include: {
                  court: true,
                },
              },
            },
          },
        },
      });

      expect(event?.rental?.timeSlot?.court?.name).toBe('Test Court 1');
    });

    it('should include sport type in rental court information', async () => {
      const event = await prisma.event.findUnique({
        where: { id: testEventWithRental.id },
        include: {
          rental: {
            include: {
              timeSlot: {
                include: {
                  court: true,
                },
              },
            },
          },
        },
      });

      expect(event?.rental?.timeSlot?.court?.sportType).toBe('basketball');
    });

    it('should include time slot information', async () => {
      const event = await prisma.event.findUnique({
        where: { id: testEventWithRental.id },
        include: {
          rental: {
            include: {
              timeSlot: {
                include: {
                  court: true,
                },
              },
            },
          },
        },
      });

      expect(event?.rental?.timeSlot?.startTime).toBe('14:00');
      expect(event?.rental?.timeSlot?.endTime).toBe('16:00');
    });

    it('should include rental status', async () => {
      const event = await prisma.event.findUnique({
        where: { id: testEventWithRental.id },
        include: {
          rental: true,
        },
      });

      expect(event?.rental?.status).toBe('confirmed');
    });
  });

  describe('Event without Rental', () => {
    it('should retrieve event without rental information', async () => {
      const event = await prisma.event.findUnique({
        where: { id: testEventWithoutRental.id },
        include: {
          rental: {
            include: {
              timeSlot: {
                include: {
                  court: true,
                },
              },
            },
          },
        },
      });

      expect(event).toBeTruthy();
      expect(event?.rentalId).toBeNull();
      expect(event?.rental).toBeNull();
    });

    it('should still have facility information', async () => {
      const event = await prisma.event.findUnique({
        where: { id: testEventWithoutRental.id },
        include: {
          facility: true,
        },
      });

      expect(event?.facility).toBeTruthy();
      expect(event?.facility?.name).toBe('Test Facility for Rental Display');
    });
  });

  describe('Rental Information Structure', () => {
    it('should have correct nested structure for rental data', async () => {
      const event = await prisma.event.findUnique({
        where: { id: testEventWithRental.id },
        include: {
          rental: {
            include: {
              timeSlot: {
                include: {
                  court: true,
                },
              },
            },
          },
        },
      });

      // Verify structure matches what EventDetailsScreen expects
      expect(event?.rental).toHaveProperty('id');
      expect(event?.rental).toHaveProperty('timeSlot');
      expect(event?.rental?.timeSlot).toHaveProperty('id');
      expect(event?.rental?.timeSlot).toHaveProperty('court');
      expect(event?.rental?.timeSlot?.court).toHaveProperty('id');
      expect(event?.rental?.timeSlot?.court).toHaveProperty('name');
      expect(event?.rental?.timeSlot?.court).toHaveProperty('sportType');
    });

    it('should match the TypeScript interface structure', async () => {
      const event = await prisma.event.findUnique({
        where: { id: testEventWithRental.id },
        include: {
          rental: {
            include: {
              timeSlot: {
                include: {
                  court: true,
                },
              },
            },
          },
        },
      });

      // Structure should match:
      // rental?: {
      //   id: string;
      //   timeSlot: {
      //     id: string;
      //     court: {
      //       id: string;
      //       name: string;
      //       sportType: string;
      //     };
      //   };
      // };

      const rentalData = {
        id: event?.rental?.id,
        timeSlot: {
          id: event?.rental?.timeSlot?.id,
          court: {
            id: event?.rental?.timeSlot?.court?.id,
            name: event?.rental?.timeSlot?.court?.name,
            sportType: event?.rental?.timeSlot?.court?.sportType,
          },
        },
      };

      expect(rentalData.id).toBeTruthy();
      expect(rentalData.timeSlot.id).toBeTruthy();
      expect(rentalData.timeSlot.court.id).toBeTruthy();
      expect(rentalData.timeSlot.court.name).toBe('Test Court 1');
      expect(rentalData.timeSlot.court.sportType).toBe('basketball');
    });
  });

  describe('Query Performance', () => {
    it('should efficiently retrieve event with rental in single query', async () => {
      const startTime = Date.now();

      const event = await prisma.event.findUnique({
        where: { id: testEventWithRental.id },
        include: {
          organizer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          facility: true,
          rental: {
            include: {
              timeSlot: {
                include: {
                  court: true,
                },
              },
            },
          },
        },
      });

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(event).toBeTruthy();
      expect(queryTime).toBeLessThan(1000); // Should complete in less than 1 second
    });
  });
});
