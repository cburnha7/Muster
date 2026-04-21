/**
 * Zod validation schemas for all mutating API endpoints.
 *
 * Every POST/PUT/PATCH/DELETE that accepts a body must validate
 * through one of these schemas before touching the database.
 */

import { z } from 'zod';

// ── Shared primitives ────────────────────────────────────────

const nonEmptyString = z.string().min(1).max(2000);
const email = z.string().email().max(254);
const optionalString = z.string().max(2000).optional();
const positiveInt = z.number().int().positive();
const nonNegativeFloat = z.number().min(0);
const uuid = z.string().uuid();
const isoDate = z.coerce.date();

// ── Auth ─────────────────────────────────────────────────────

export const LoginSchema = z.object({
  emailOrUsername: nonEmptyString,
  password: nonEmptyString,
  rememberMe: z.boolean().optional(),
});

export const RegisterSchema = z.object({
  firstName: nonEmptyString.max(100),
  lastName: nonEmptyString.max(100),
  email: email,
  username: nonEmptyString.max(50),
  password: nonEmptyString.min(8).max(128),
  agreedToTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must agree to the Terms of Service' }),
  }),
});

export const RefreshTokenSchema = z.object({
  refreshToken: nonEmptyString,
});

export const ForgotPasswordSchema = z.object({
  email: email,
});

export const ResetPasswordSchema = z.object({
  token: nonEmptyString,
  newPassword: nonEmptyString.min(8).max(128),
});

// ── Events ───────────────────────────────────────────────────

export const CreateEventSchema = z
  .object({
    title: nonEmptyString.max(200),
    description: z.string().max(5000).default(''),
    sportType: nonEmptyString,
    eventType: nonEmptyString,
    startTime: isoDate,
    endTime: isoDate,
    maxParticipants: positiveInt.max(1000),
    price: nonNegativeFloat.default(0),
    skillLevel: optionalString,
    equipment: z.array(z.string()).default([]),
    isPrivate: z.boolean().default(false),
    organizerId: uuid.optional(),
    facilityId: uuid.optional().nullable(),
    locationName: optionalString.nullable(),
    locationAddress: optionalString.nullable(),
    locationLat: z.number().optional().nullable(),
    locationLng: z.number().optional().nullable(),
    genderRestriction: optionalString.nullable(),
    minPlayerRating: z.number().int().min(0).max(100).optional().nullable(),
    eligibility: z
      .object({
        isInviteOnly: z.boolean().optional(),
        restrictedToTeams: z.array(z.string()).optional(),
        restrictedToLeagues: z.array(z.string()).optional(),
        minAge: z.number().int().optional(),
        maxAge: z.number().int().optional(),
      })
      .optional(),
    invitedUserIds: z.array(z.string()).optional(),
    timeSlotId: uuid.optional().nullable(),
    timeSlotIds: z.array(z.string()).optional().nullable(),
    rentalId: uuid.optional().nullable(),
    rentalIds: z.array(z.string()).optional().nullable(),
    recurring: z.boolean().optional(),
    recurringFrequency: z.string().optional().nullable(),
    recurringEndDate: z.string().optional().nullable(),
    recurringDays: z.array(z.string()).optional(),
    numberOfEvents: z.string().optional(),
    occurrenceLocations: z.array(z.any()).optional(),
  })
  .refine(data => data.endTime > data.startTime, {
    message: 'End time must be after start time',
    path: ['endTime'],
  });

export const BookEventSchema = z.object({
  userId: uuid.optional(),
  teamId: uuid.optional(),
});

// ── Teams ────────────────────────────────────────────────────

export const CreateTeamSchema = z.object({
  name: nonEmptyString.max(100),
  description: z.string().max(1000).default(''),
  sportType: nonEmptyString,
  sportTypes: z.array(z.string()).optional(),
  skillLevel: z.string().default('all_levels'),
  maxMembers: positiveInt.max(200).default(10),
  isPublic: z.boolean().default(true),
  genderRestriction: optionalString.nullable(),
  imageUrl: optionalString.nullable(),
  initialMemberIds: z.array(z.string()).optional(),
});

// ── Facilities ───────────────────────────────────────────────

export const CreateFacilitySchema = z.object({
  name: nonEmptyString.max(200),
  description: z.string().max(5000).default(''),
  street: optionalString,
  city: optionalString,
  state: optionalString,
  zipCode: optionalString,
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  sportTypes: z.array(z.string()).default([]),
  contactName: optionalString,
  contactPhone: optionalString,
  contactEmail: optionalString.nullable(),
  contactWebsite: optionalString.nullable(),
});

// ── Uploads ──────────────────────────────────────────────────

export const PresignUploadSchema = z.object({
  context: z.enum([
    'profiles',
    'grounds',
    'rosters',
    'events',
    'dependents',
    'leagues',
  ]),
  fileName: nonEmptyString.max(255),
  contentType: z.enum([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
  ]),
});

// ── Invites ──────────────────────────────────────────────────

export const SendInviteSchema = z.object({
  name: nonEmptyString.max(200),
  email: email,
  context: z.enum(['roster', 'event']).optional(),
  contextId: z.string().optional(),
  contextName: optionalString,
});

// ── Profile ──────────────────────────────────────────────────

export const UpdateProfileSchema = z
  .object({
    firstName: nonEmptyString.max(100).optional(),
    lastName: nonEmptyString.max(100).optional(),
    phoneNumber: optionalString,
    dateOfBirth: isoDate.optional(),
    gender: z.enum(['male', 'female']).optional().nullable(),
    profileImage: optionalString.nullable(),
    locationCity: optionalString,
    locationState: optionalString,
    locationLat: z.number().optional().nullable(),
    locationLng: z.number().optional().nullable(),
    sportPreferences: z.array(z.string()).optional(),
  })
  .partial();

// ── Validation middleware factory ─────────────────────────────

import { Request, Response, NextFunction } from 'express';

/**
 * Express middleware that validates req.body against a Zod schema.
 * On failure, returns 400 with structured error details.
 * On success, replaces req.body with the parsed (and coerced) data.
 */
export function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return res.status(400).json({
        error: 'Validation failed',
        details: errors,
      });
    }
    // Replace body with parsed data (applies defaults, coercions)
    req.body = result.data;
    next();
  };
}
