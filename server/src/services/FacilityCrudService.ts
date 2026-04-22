import { prisma } from '../lib/prisma';
import { ServiceError } from '../utils/ServiceError';
import { isValidPolicyHours } from './cancellation-window';
import fs from 'fs';
import path from 'path';
import { deleteImageFiles } from './ImageUploadService';

// ─── Public API ─────────────────────────────────────────────────────────────

export interface GetFacilitiesFilters {
  sportType?: string;
  ownerId?: string;
  page?: string;
  limit?: string;
}

export async function getFacilities(filters: GetFacilitiesFilters) {
  const { sportType, ownerId, page = '1', limit = '10' } = filters;

  const skip = (parseInt(page) - 1) * Math.min(parseInt(limit), 50);
  const take = Math.min(parseInt(limit), 50);

  const where: any = { isActive: true };
  if (sportType) {
    where.sportTypes = { has: sportType };
  }
  if (ownerId) {
    where.ownerId = ownerId;
  }

  const [facilities, total] = await Promise.all([
    prisma.facility.findMany({
      where,
      skip,
      take,
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        courts: {
          orderBy: {
            displayOrder: 'asc',
          },
        },
      },
    }),
    prisma.facility.count({ where }),
  ]);

  return {
    data: facilities,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / take),
    },
  };
}

export async function getFacilityById(id: string) {
  const facility = await prisma.facility.findUnique({
    where: { id },
    include: {
      owner: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      verification: {
        include: {
          documents: true,
        },
      },
      rateSchedules: {
        where: { isActive: true },
        orderBy: { priority: 'desc' },
      },
      availabilitySlots: true,
      photos: {
        orderBy: { displayOrder: 'asc' },
      },
      accessImages: {
        orderBy: { displayOrder: 'asc' },
      },
      courts: {
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' },
        include: {
          availability: {
            orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
          },
        },
      },
    },
  });

  if (!facility) {
    throw new ServiceError('Facility not found', 404);
  }

  return facility;
}

export interface GetFacilityEventsParams {
  page?: string;
  limit?: string;
}

export async function getFacilityEvents(
  id: string,
  pagination: GetFacilityEventsParams
) {
  const { page = '1', limit = '10' } = pagination;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  // Check if facility exists
  const facility = await prisma.facility.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!facility) {
    throw new ServiceError('Facility not found', 404);
  }

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where: { facilityId: id },
      skip,
      take,
      include: {
        organizer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        facility: {
          select: {
            id: true,
            name: true,
            street: true,
            city: true,
            state: true,
          },
        },
        rental: {
          include: {
            timeSlot: {
              include: {
                court: {
                  select: {
                    id: true,
                    name: true,
                    sportType: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { startTime: 'asc' },
    }),
    prisma.event.count({ where: { facilityId: id } }),
  ]);

  return {
    data: events,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / take),
    },
  };
}

export async function getFacilitiesForEvent(
  sportType: string | undefined,
  userId: string | undefined
) {
  if (!sportType) {
    throw new ServiceError('sportType is required', 400);
  }

  // Find all active facilities that have at least one court matching the sport
  const facilities = await prisma.facility.findMany({
    where: {
      isActive: true,
      courts: {
        some: {
          sportType: sportType,
          isActive: true,
        },
      },
    },
    include: {
      owner: {
        select: { id: true, firstName: true, lastName: true },
      },
      courts: {
        where: { sportType: sportType, isActive: true },
        select: { id: true, name: true, sportType: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  // If userId provided, check ownership and reservations
  let ownedIds = new Set<string>();
  let reservedIds = new Set<string>();

  if (userId) {
    // Owned facilities
    const owned = await prisma.facility.findMany({
      where: { ownerId: userId, isActive: true },
      select: { id: true },
    });
    ownedIds = new Set(owned.map(f => f.id));

    // Facilities with confirmed future rentals
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const rentals = await prisma.facilityRental.findMany({
      where: {
        userId: userId,
        status: 'confirmed',
        usedForEventId: null,
        timeSlot: { date: { gte: today } },
      },
      select: {
        timeSlot: {
          select: { court: { select: { facilityId: true } } },
        },
      },
    });
    for (const r of rentals) {
      if (r.timeSlot?.court?.facilityId) {
        reservedIds.add(r.timeSlot.court.facilityId);
      }
    }
  }

  const data = facilities.map(f => ({
    id: f.id,
    name: f.name,
    city: f.city,
    state: f.state,
    sportTypes: [...new Set(f.courts.map(c => c.sportType))],
    courtCount: f.courts.length,
    isOwned: ownedIds.has(f.id),
    hasRentals: reservedIds.has(f.id),
  }));

  return { data, total: data.length };
}

export async function getAuthorizedFacilities(userId: string | undefined) {
  if (!userId) {
    throw new ServiceError('userId is required', 400);
  }

  // Get facilities owned by user
  const ownedFacilities = await prisma.facility.findMany({
    where: {
      ownerId: userId,
      isActive: true,
    },
    include: {
      owner: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    // Cancellation policy fields (noticeWindowHours, teamPenaltyPct, penaltyDestination)
    // are included by default since we use include (not select)
  });

  // Normalize today's date to midnight UTC for comparison
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Get facilities where user has confirmed rentals
  let rentalsWithFacilities: any[] = [];
  try {
    rentalsWithFacilities = await prisma.facilityRental.findMany({
      where: {
        userId: userId,
        status: 'confirmed',
        usedForEventId: null,
        timeSlot: {
          date: { gte: today },
        },
      },
      include: {
        timeSlot: {
          include: {
            court: {
              include: {
                facility: {
                  include: {
                    owner: {
                      select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  } catch (rentalErr: any) {
    console.error(
      'Rental query failed, continuing with owned facilities only:',
      rentalErr?.message
    );
  }

  // Filter out rentals with inactive facilities (in JS to avoid nested where issues)
  rentalsWithFacilities = rentalsWithFacilities.filter(
    (r: any) => r.timeSlot?.court?.facility?.isActive !== false
  );

  // Extract unique facilities from rentals
  const rentalFacilityIds = new Set<string>();
  const rentalFacilitiesMap = new Map();

  rentalsWithFacilities.forEach(rental => {
    const facility = rental.timeSlot.court.facility;
    if (!rentalFacilityIds.has(facility.id)) {
      rentalFacilityIds.add(facility.id);
      rentalFacilitiesMap.set(facility.id, facility);
    }
  });

  // Combine owned and rental facilities (avoid duplicates)
  const ownedFacilityIds = new Set(ownedFacilities.map(f => f.id));
  const allFacilities = [
    ...ownedFacilities.map(f => ({ ...f, isOwned: true, hasRentals: false })),
    ...Array.from(rentalFacilitiesMap.values())
      .filter(f => !ownedFacilityIds.has(f.id))
      .map(f => ({ ...f, isOwned: false, hasRentals: true })),
  ];

  // Mark facilities that are both owned and have rentals,
  // and flag whether they have a cancellation policy set (required for booking flows)
  const facilitiesWithBoth = allFacilities.map(f => {
    const hasCancellationPolicy =
      f.noticeWindowHours !== null &&
      f.teamPenaltyPct !== null &&
      f.penaltyDestination !== null;

    const base = { ...f, hasCancellationPolicy };

    if (f.isOwned && rentalFacilityIds.has(f.id)) {
      return { ...base, hasRentals: true };
    }
    return base;
  });

  return {
    data: facilitiesWithBoth,
    total: facilitiesWithBoth.length,
  };
}

export interface CheckDuplicatesAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
}

export async function checkDuplicates(address: CheckDuplicatesAddress) {
  const { street, city, state, zipCode } = address;

  if (!street || !city || !state || !zipCode) {
    throw new ServiceError('Address fields required', 400);
  }

  const existingFacilities = await prisma.facility.findMany({
    where: {
      street: { equals: street, mode: 'insensitive' },
      city: { equals: city, mode: 'insensitive' },
      state: { equals: state, mode: 'insensitive' },
      zipCode,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      description: true,
      sportTypes: true,
      street: true,
      city: true,
      state: true,
      zipCode: true,
      imageUrl: true,
    },
  });

  return { duplicates: existingFacilities };
}

export interface CreateFacilityData {
  name: string;
  description?: string;
  sportTypes: string[];
  amenities?: string[];
  imageUrl?: string;
  rating?: number;
  pricePerHour?: number;
  isVerified?: boolean;
  verificationStatus?: string;
  accessInstructions?: string;
  parkingInfo?: string;
  minimumBookingHours?: number;
  bufferTimeMins?: number;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  contactWebsite?: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  latitude?: number;
  longitude?: number;
  ownerId?: string;
  hoursOfOperation?: any[];
  cancellationPolicyHours?: number;
  requiresInsurance?: boolean;
  requiresBookingConfirmation?: boolean;
  coverImageUrl?: string;
  facilityMapUrl?: string;
}

export async function createFacility(
  data: CreateFacilityData,
  authenticatedUserId: string | undefined
) {
  const {
    name,
    description,
    sportTypes,
    amenities = [],
    imageUrl,
    rating = 0,
    pricePerHour = 0,
    isVerified = false,
    verificationStatus = 'pending',
    accessInstructions,
    parkingInfo,
    minimumBookingHours = 1,
    bufferTimeMins = 0,
    contactName,
    contactPhone,
    contactEmail,
    contactWebsite,
    street,
    city,
    state,
    zipCode,
    latitude = 0,
    longitude = 0,
    ownerId,
    hoursOfOperation = [],
    cancellationPolicyHours,
    requiresInsurance = false,
    requiresBookingConfirmation = false,
    coverImageUrl,
    facilityMapUrl,
  } = data;

  // Validate required fields
  if (!name || !sportTypes || !street || !city || !state || !zipCode) {
    throw new ServiceError(
      'Missing required fields: name, sportTypes, street, city, state, zipCode',
      400
    );
  }

  // Validate cancellation policy hours if provided
  if (
    cancellationPolicyHours !== undefined &&
    !isValidPolicyHours(cancellationPolicyHours)
  ) {
    throw new ServiceError(
      'Invalid cancellation policy value. Allowed values: none, 0, 12, 24, 48, or 72 hours.',
      400
    );
  }

  let facilityOwnerId = authenticatedUserId || ownerId;
  if (!facilityOwnerId) {
    // For testing: use the first user in the database
    const firstUser = await prisma.user.findFirst();
    if (!firstUser) {
      throw new ServiceError(
        'No users found. Please create a user first.',
        400
      );
    }
    facilityOwnerId = firstUser.id;
  }

  // Plan gate: facility creation requires facility_basic; 4th+ requires facility_pro
  const { userBypassesPlanGate } = require('../middleware/subscription');
  const bypassed = await userBypassesPlanGate(
    facilityOwnerId,
    'facility_basic'
  );
  if (!bypassed) {
    const PLAN_HIERARCHY = [
      'free',
      'roster',
      'league',
      'facility_basic',
      'facility_pro',
    ];
    const existingFacilityCount = await prisma.facility.count({
      where: { ownerId: facilityOwnerId },
    });
    const sub = await prisma.subscription.findUnique({
      where: { userId: facilityOwnerId },
      select: { plan: true, status: true },
    });
    const userPlan = sub?.plan || 'free';
    const isActive =
      !sub || sub.status === 'active' || sub.status === 'trialing';
    const userPlanIndex = PLAN_HIERARCHY.indexOf(userPlan);

    if (
      existingFacilityCount >= 3 &&
      (!isActive || userPlanIndex < PLAN_HIERARCHY.indexOf('facility_pro'))
    ) {
      throw new ServiceError('Plan upgrade required', 403, {
        requiredPlan: 'facility_pro',
        currentPlan: userPlan,
      });
    } else if (
      !isActive ||
      userPlanIndex < PLAN_HIERARCHY.indexOf('facility_basic')
    ) {
      throw new ServiceError('Plan upgrade required', 403, {
        requiredPlan: 'facility_basic',
        currentPlan: userPlan,
      });
    }
  }

  const facility = await prisma.facility.create({
    data: {
      name,
      description: description ?? '',
      sportTypes,
      amenities,
      imageUrl,
      rating,
      pricePerHour,
      isVerified,
      verificationStatus,
      accessInstructions,
      parkingInfo,
      minimumBookingHours,
      bufferTimeMins,
      contactName,
      contactPhone,
      contactEmail,
      contactWebsite,
      street,
      city,
      state,
      zipCode,
      latitude,
      longitude,
      ownerId: facilityOwnerId,
      requiresInsurance: requiresInsurance === true,
      requiresBookingConfirmation: requiresBookingConfirmation === true,
      ...(cancellationPolicyHours !== undefined && {
        cancellationPolicyHours,
      }),
      ...(coverImageUrl !== undefined ? { coverImageUrl } : {}),
      ...(facilityMapUrl !== undefined ? { facilityMapUrl } : {}),
    },
  });

  // Create hours of operation if provided
  if (hoursOfOperation && hoursOfOperation.length > 0) {
    const availabilityData = hoursOfOperation.map((hours: any) => ({
      facilityId: facility.id,
      dayOfWeek: hours.dayOfWeek,
      startTime: hours.startTime,
      endTime: hours.endTime,
      isRecurring: true,
      isBlocked: hours.isClosed || false,
      blockReason: hours.isClosed ? 'Closed' : null,
    }));

    await prisma.facilityAvailability.createMany({
      data: availabilityData,
    });
  }

  return facility;
}

export interface UpdateFacilityData {
  hoursOfOperation?: any[];
  slotIncrementMinutes?: number;
  requiresInsurance?: boolean;
  requiresBookingConfirmation?: boolean;
  [key: string]: any;
}

export async function updateFacility(
  id: string,
  data: UpdateFacilityData,
  userId: string
) {
  if (!userId) {
    throw new ServiceError('Authentication required', 401);
  }

  const {
    hoursOfOperation,
    slotIncrementMinutes,
    requiresInsurance,
    requiresBookingConfirmation,
    ...rawData
  } = data;

  const existingFacility = await prisma.facility.findUnique({
    where: { id },
    select: { ownerId: true },
  });

  if (!existingFacility) {
    throw new ServiceError('Facility not found', 404);
  }

  if (existingFacility.ownerId !== userId) {
    throw new ServiceError(
      'Only the facility owner can update this facility',
      403
    );
  }

  // Whitelist only known Facility columns to prevent Prisma "Unknown arg" errors
  const ALLOWED_FIELDS = [
    'name',
    'description',
    'sportTypes',
    'amenities',
    'imageUrl',
    'rating',
    'pricePerHour',
    'isActive',
    'isVerified',
    'verificationStatus',
    'accessInstructions',
    'parkingInfo',
    'minimumBookingHours',
    'bufferTimeMins',
    'contactName',
    'contactPhone',
    'contactEmail',
    'contactWebsite',
    'facilityMapUrl',
    'facilityMapThumbnailUrl',
    'street',
    'city',
    'state',
    'zipCode',
    'country',
    'latitude',
    'longitude',
    'noticeWindowHours',
    'teamPenaltyPct',
    'penaltyDestination',
    'policyVersion',
    'cancellationPolicyHours',
    'stripeConnectAccountId',
    'requiresInsurance',
    'requiresBookingConfirmation',
    'waiverRequired',
    'waiverText',
  ];

  const updateData: Record<string, any> = {};
  for (const key of ALLOWED_FIELDS) {
    if (key in rawData) {
      updateData[key] = rawData[key];
    }
  }

  // Coerce requiresInsurance to boolean if provided
  if (requiresInsurance !== undefined) {
    updateData.requiresInsurance = requiresInsurance === true;
  }

  // Coerce requiresBookingConfirmation to boolean if provided
  if (requiresBookingConfirmation !== undefined) {
    updateData.requiresBookingConfirmation =
      requiresBookingConfirmation === true;
    // If confirmation is turned off, also turn off insurance requirement
    if (!updateData.requiresBookingConfirmation) {
      updateData.requiresInsurance = false;
    }
  }

  // Validate cancellation policy hours if provided
  if (
    updateData.cancellationPolicyHours !== undefined &&
    !isValidPolicyHours(updateData.cancellationPolicyHours)
  ) {
    throw new ServiceError(
      'Invalid cancellation policy value. Allowed values: none, 0, 12, 24, 48, or 72 hours.',
      400
    );
  }

  // Check if slot increment is changing
  let incrementChanged = false;

  if (slotIncrementMinutes !== undefined) {
    // Validate slot increment (must be 30 or 60)
    if (slotIncrementMinutes !== 30 && slotIncrementMinutes !== 60) {
      throw new ServiceError(
        'Invalid slot increment. Must be 30 or 60 minutes.',
        400
      );
    }

    // Get current increment value
    const currentFacility = await prisma.facility.findUnique({
      where: { id },
      select: { slotIncrementMinutes: true },
    });

    if (
      currentFacility &&
      currentFacility.slotIncrementMinutes !== slotIncrementMinutes
    ) {
      incrementChanged = true;
    }
  }

  // Auto-bump waiverVersion if waiverText changed
  if (updateData.waiverText !== undefined) {
    const current = await prisma.facility.findUnique({
      where: { id },
      select: { waiverText: true },
    });
    if (current && updateData.waiverText !== current.waiverText) {
      updateData.waiverVersion = new Date().toISOString();
    }
  }
  // If waiverRequired is turned off, clear waiver fields
  if (updateData.waiverRequired === false) {
    updateData.waiverText = null;
    updateData.waiverVersion = null;
  }

  // Update facility
  const facility = await prisma.facility.update({
    where: { id },
    data: {
      ...updateData,
      ...(slotIncrementMinutes !== undefined && { slotIncrementMinutes }),
    },
  });

  // Update hours of operation if provided
  if (hoursOfOperation && hoursOfOperation.length > 0) {
    // Delete existing hours
    await prisma.facilityAvailability.deleteMany({
      where: {
        facilityId: id,
        isRecurring: true,
        specificDate: null,
      },
    });

    // Create new hours
    const availabilityData = hoursOfOperation.map((hours: any) => ({
      facilityId: id,
      dayOfWeek: hours.dayOfWeek,
      startTime: hours.startTime,
      endTime: hours.endTime,
      isRecurring: true,
      isBlocked: hours.isClosed || false,
      blockReason: hours.isClosed ? 'Closed' : null,
    }));

    await prisma.facilityAvailability.createMany({
      data: availabilityData,
    });
  }

  // Slot increment change is now handled on-the-fly by AvailabilityCalculator
  // No regeneration needed — availability is calculated from operating hours

  return facility;
}

export async function deleteFacility(id: string, userId: string) {
  if (!userId) {
    throw new ServiceError('Authentication required', 401);
  }

  // Check if facility exists and verify ownership
  const facility = await prisma.facility.findUnique({
    where: { id },
    select: {
      id: true,
      ownerId: true,
      facilityMapUrl: true,
      facilityMapThumbnailUrl: true,
    },
  });

  if (!facility) {
    throw new ServiceError('Facility not found', 404);
  }

  if (facility.ownerId !== userId) {
    throw new ServiceError(
      'Only the facility owner can delete this facility',
      403
    );
  }

  // Check for future rentals
  const futureRentalsList = await prisma.facilityRental.findMany({
    where: {
      timeSlot: {
        court: {
          facilityId: id,
        },
        date: { gte: new Date() },
      },
      status: 'confirmed',
    },
    select: {
      id: true,
      timeSlot: {
        select: {
          date: true,
          startTime: true,
          endTime: true,
          court: { select: { name: true } },
        },
      },
      user: { select: { username: true } },
    },
    orderBy: { timeSlot: { date: 'asc' } },
    take: 20,
  });

  if (futureRentalsList.length > 0) {
    throw new ServiceError(
      'Cannot delete ground with future rentals. Cancel all rentals first.',
      400,
      {
        rentals: futureRentalsList.map((r: any) => ({
          id: r.id,
          court: r.timeSlot?.court?.name || 'Unknown court',
          date: r.timeSlot?.date,
          startTime: r.timeSlot?.startTime,
          endTime: r.timeSlot?.endTime,
          user: r.user?.username || 'Unknown',
        })),
      }
    );
  }

  // Check for future events
  const futureEventsList = await prisma.event.findMany({
    where: {
      facilityId: id,
      startTime: { gte: new Date() },
    },
    select: {
      id: true,
      title: true,
      startTime: true,
      endTime: true,
    },
    orderBy: { startTime: 'asc' },
    take: 20,
  });

  if (futureEventsList.length > 0) {
    throw new ServiceError(
      'Cannot delete ground with future events. Cancel all events first.',
      400,
      {
        events: futureEventsList.map((e: any) => ({
          id: e.id,
          title: e.title,
          startTime: e.startTime,
          endTime: e.endTime,
        })),
      }
    );
  }

  // Delete facility map images if they exist
  if (facility.facilityMapUrl) {
    try {
      await deleteImageFiles(
        facility.facilityMapUrl,
        facility.facilityMapThumbnailUrl || undefined
      );
    } catch (error) {
      console.error('Error deleting map images:', error);
      // Continue with deletion even if image cleanup fails
    }
  }

  // Delete all facility photo files from disk
  const facilityPhotos = await prisma.facilityPhoto.findMany({
    where: { facilityId: id },
    select: { imageUrl: true },
  });
  for (const photo of facilityPhotos) {
    try {
      const photoPath = path.join(
        __dirname,
        '../../uploads',
        photo.imageUrl.replace('/uploads/', '')
      );
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    } catch (err) {
      console.error('Error deleting photo file:', err);
    }
  }

  // Clean up references that don't cascade before deleting
  await prisma.$transaction(async tx => {
    // Nullify facility references on events
    await tx.event.updateMany({
      where: { facilityId: id },
      data: { facilityId: null },
    });

    // Nullify facility references on bookings
    await tx.booking.updateMany({
      where: { facilityId: id },
      data: { facilityId: null },
    });

    // Delete reviews for this facility
    await tx.review.deleteMany({
      where: { facilityId: id },
    });

    // Delete facility ratings
    await tx.facilityRating.deleteMany({
      where: { facilityId: id },
    });

    // Delete facility (cascade handles courts, time slots, rentals, etc.)
    await tx.facility.delete({
      where: { id },
    });
  });
}
