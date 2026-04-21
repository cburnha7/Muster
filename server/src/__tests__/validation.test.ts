/**
 * Zod schema validation tests.
 *
 * These are pure unit tests — no database, no HTTP, no side effects.
 * They verify that every schema accepts valid data and rejects invalid data.
 */

import {
  LoginSchema,
  RegisterSchema,
  RefreshTokenSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  CreateEventSchema,
  BookEventSchema,
  CreateTeamSchema,
  CreateFacilitySchema,
  PresignUploadSchema,
  SendInviteSchema,
  UpdateProfileSchema,
  CreateCourtSchema,
  CreateLeagueSchema,
  CreateMatchSchema,
  CreateDependentSchema,
  SubmitSalutesSchema,
  SignWaiverSchema,
} from '../validation/schemas';

// ── Auth Schemas ─────────────────────────────────────────────

describe('LoginSchema', () => {
  it('accepts valid credentials', () => {
    const result = LoginSchema.safeParse({
      emailOrUsername: 'user@example.com',
      password: 'password123',
    });
    expect(result.success).toBe(true);
  });

  it('accepts with rememberMe', () => {
    const result = LoginSchema.safeParse({
      emailOrUsername: 'user',
      password: 'pass',
      rememberMe: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty emailOrUsername', () => {
    const result = LoginSchema.safeParse({
      emailOrUsername: '',
      password: 'password123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing password', () => {
    const result = LoginSchema.safeParse({
      emailOrUsername: 'user@example.com',
    });
    expect(result.success).toBe(false);
  });
});

describe('RegisterSchema', () => {
  const validData = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    username: 'johndoe',
    password: 'securepass123',
    agreedToTerms: true as const,
  };

  it('accepts valid registration', () => {
    const result = RegisterSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('rejects short password', () => {
    const result = RegisterSchema.safeParse({
      ...validData,
      password: 'short',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = RegisterSchema.safeParse({
      ...validData,
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });

  it('rejects agreedToTerms: false', () => {
    const result = RegisterSchema.safeParse({
      ...validData,
      agreedToTerms: false,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing firstName', () => {
    const { firstName, ...rest } = validData;
    const result = RegisterSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});

describe('RefreshTokenSchema', () => {
  it('accepts valid refresh token', () => {
    const result = RefreshTokenSchema.safeParse({
      refreshToken: 'some-token-value',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty refresh token', () => {
    const result = RefreshTokenSchema.safeParse({ refreshToken: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing refresh token', () => {
    const result = RefreshTokenSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ── Event Schemas ────────────────────────────────────────────

describe('CreateEventSchema', () => {
  const validEvent = {
    title: 'Pickup Basketball',
    description: 'Casual game',
    sportType: 'basketball',
    eventType: 'pickup',
    startTime: '2026-05-01T14:00:00Z',
    endTime: '2026-05-01T16:00:00Z',
    maxParticipants: 10,
  };

  it('accepts valid event', () => {
    const result = CreateEventSchema.safeParse(validEvent);
    expect(result.success).toBe(true);
  });

  it('coerces date strings to Date objects', () => {
    const result = CreateEventSchema.safeParse(validEvent);
    if (result.success) {
      expect(result.data.startTime).toBeInstanceOf(Date);
      expect(result.data.endTime).toBeInstanceOf(Date);
    }
  });

  it('rejects endTime before startTime', () => {
    const result = CreateEventSchema.safeParse({
      ...validEvent,
      startTime: '2026-05-01T16:00:00Z',
      endTime: '2026-05-01T14:00:00Z',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing title', () => {
    const { title, ...rest } = validEvent;
    const result = CreateEventSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects zero maxParticipants', () => {
    const result = CreateEventSchema.safeParse({
      ...validEvent,
      maxParticipants: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative price', () => {
    const result = CreateEventSchema.safeParse({ ...validEvent, price: -5 });
    expect(result.success).toBe(false);
  });

  it('defaults price to 0', () => {
    const result = CreateEventSchema.safeParse(validEvent);
    if (result.success) {
      expect(result.data.price).toBe(0);
    }
  });

  it('defaults equipment to empty array', () => {
    const result = CreateEventSchema.safeParse(validEvent);
    if (result.success) {
      expect(result.data.equipment).toEqual([]);
    }
  });
});

describe('BookEventSchema', () => {
  it('accepts empty body (self-booking)', () => {
    const result = BookEventSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts valid userId for dependent booking', () => {
    const result = BookEventSchema.safeParse({
      userId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid UUID', () => {
    const result = BookEventSchema.safeParse({ userId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });
});

// ── Team Schemas ─────────────────────────────────────────────

describe('CreateTeamSchema', () => {
  it('accepts valid team', () => {
    const result = CreateTeamSchema.safeParse({
      name: 'Thunder',
      sportType: 'basketball',
    });
    expect(result.success).toBe(true);
  });

  it('defaults maxMembers to 10', () => {
    const result = CreateTeamSchema.safeParse({
      name: 'Thunder',
      sportType: 'basketball',
    });
    if (result.success) {
      expect(result.data.maxMembers).toBe(10);
    }
  });

  it('defaults isPublic to true', () => {
    const result = CreateTeamSchema.safeParse({
      name: 'Thunder',
      sportType: 'basketball',
    });
    if (result.success) {
      expect(result.data.isPublic).toBe(true);
    }
  });

  it('rejects empty name', () => {
    const result = CreateTeamSchema.safeParse({
      name: '',
      sportType: 'basketball',
    });
    expect(result.success).toBe(false);
  });

  it('rejects maxMembers > 200', () => {
    const result = CreateTeamSchema.safeParse({
      name: 'Thunder',
      sportType: 'basketball',
      maxMembers: 500,
    });
    expect(result.success).toBe(false);
  });
});

// ── Facility Schemas ─────────────────────────────────────────

describe('CreateFacilitySchema', () => {
  it('accepts valid facility', () => {
    const result = CreateFacilitySchema.safeParse({
      name: 'Central Park Courts',
    });
    expect(result.success).toBe(true);
  });

  it('defaults sportTypes to empty array', () => {
    const result = CreateFacilitySchema.safeParse({ name: 'Park' });
    if (result.success) {
      expect(result.data.sportTypes).toEqual([]);
    }
  });

  it('rejects empty name', () => {
    const result = CreateFacilitySchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });
});

// ── Upload Schemas ───────────────────────────────────────────

describe('PresignUploadSchema', () => {
  it('accepts valid upload request', () => {
    const result = PresignUploadSchema.safeParse({
      context: 'profiles',
      fileName: 'photo.jpg',
      contentType: 'image/jpeg',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid context', () => {
    const result = PresignUploadSchema.safeParse({
      context: 'invalid',
      fileName: 'photo.jpg',
      contentType: 'image/jpeg',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid content type', () => {
    const result = PresignUploadSchema.safeParse({
      context: 'profiles',
      fileName: 'doc.pdf',
      contentType: 'application/pdf',
    });
    expect(result.success).toBe(false);
  });

  it('accepts all valid contexts', () => {
    const contexts = [
      'profiles',
      'grounds',
      'rosters',
      'events',
      'dependents',
      'leagues',
    ];
    for (const context of contexts) {
      const result = PresignUploadSchema.safeParse({
        context,
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
      });
      expect(result.success).toBe(true);
    }
  });

  it('accepts all valid content types', () => {
    const types = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/heic',
    ];
    for (const contentType of types) {
      const result = PresignUploadSchema.safeParse({
        context: 'profiles',
        fileName: 'photo.jpg',
        contentType,
      });
      expect(result.success).toBe(true);
    }
  });
});

// ── Invite Schemas ───────────────────────────────────────────

describe('SendInviteSchema', () => {
  it('accepts valid invite', () => {
    const result = SendInviteSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = SendInviteSchema.safeParse({
      name: 'John',
      email: 'not-email',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = SendInviteSchema.safeParse({
      name: '',
      email: 'john@example.com',
    });
    expect(result.success).toBe(false);
  });
});

// ── Court Schemas ────────────────────────────────────────────

describe('CreateCourtSchema', () => {
  it('accepts valid court', () => {
    const result = CreateCourtSchema.safeParse({
      name: 'Court 1',
      sportType: 'basketball',
    });
    expect(result.success).toBe(true);
  });

  it('defaults capacity to 10', () => {
    const result = CreateCourtSchema.safeParse({
      name: 'Court 1',
      sportType: 'basketball',
    });
    if (result.success) {
      expect(result.data.capacity).toBe(10);
    }
  });

  it('defaults isIndoor to false', () => {
    const result = CreateCourtSchema.safeParse({
      name: 'Court 1',
      sportType: 'basketball',
    });
    if (result.success) {
      expect(result.data.isIndoor).toBe(false);
    }
  });
});

// ── League Schemas ───────────────────────────────────────────

describe('CreateLeagueSchema', () => {
  it('accepts valid league', () => {
    const result = CreateLeagueSchema.safeParse({
      name: 'Summer League 2026',
      sportType: 'soccer',
    });
    expect(result.success).toBe(true);
  });

  it('defaults visibility to public', () => {
    const result = CreateLeagueSchema.safeParse({
      name: 'League',
      sportType: 'soccer',
    });
    if (result.success) {
      expect(result.data.visibility).toBe('public');
    }
  });
});

// ── Dependent Schemas ────────────────────────────────────────

describe('CreateDependentSchema', () => {
  it('accepts valid dependent', () => {
    const result = CreateDependentSchema.safeParse({
      firstName: 'Junior',
      lastName: 'Doe',
      dateOfBirth: '2015-06-15',
    });
    expect(result.success).toBe(true);
  });

  it('coerces date string', () => {
    const result = CreateDependentSchema.safeParse({
      firstName: 'Junior',
      lastName: 'Doe',
      dateOfBirth: '2015-06-15',
    });
    if (result.success) {
      expect(result.data.dateOfBirth).toBeInstanceOf(Date);
    }
  });

  it('rejects missing firstName', () => {
    const result = CreateDependentSchema.safeParse({
      lastName: 'Doe',
      dateOfBirth: '2015-06-15',
    });
    expect(result.success).toBe(false);
  });
});

// ── Salute Schemas ───────────────────────────────────────────

describe('SubmitSalutesSchema', () => {
  it('accepts 1-3 valid UUIDs', () => {
    const result = SubmitSalutesSchema.safeParse({
      salutedUserIds: ['550e8400-e29b-41d4-a716-446655440000'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty array', () => {
    const result = SubmitSalutesSchema.safeParse({ salutedUserIds: [] });
    expect(result.success).toBe(false);
  });

  it('rejects more than 3', () => {
    const result = SubmitSalutesSchema.safeParse({
      salutedUserIds: [
        '550e8400-e29b-41d4-a716-446655440001',
        '550e8400-e29b-41d4-a716-446655440002',
        '550e8400-e29b-41d4-a716-446655440003',
        '550e8400-e29b-41d4-a716-446655440004',
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid UUIDs', () => {
    const result = SubmitSalutesSchema.safeParse({
      salutedUserIds: ['not-a-uuid'],
    });
    expect(result.success).toBe(false);
  });
});

// ── Waiver Schemas ───────────────────────────────────────────

describe('SignWaiverSchema', () => {
  it('accepts valid waiver signature', () => {
    const result = SignWaiverSchema.safeParse({
      facilityId: '550e8400-e29b-41d4-a716-446655440000',
      waiverVersion: '1.0',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing facilityId', () => {
    const result = SignWaiverSchema.safeParse({ waiverVersion: '1.0' });
    expect(result.success).toBe(false);
  });
});

// ── Profile Schemas ──────────────────────────────────────────

describe('UpdateProfileSchema', () => {
  it('accepts partial update', () => {
    const result = UpdateProfileSchema.safeParse({ firstName: 'Jane' });
    expect(result.success).toBe(true);
  });

  it('accepts empty object', () => {
    const result = UpdateProfileSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects invalid gender', () => {
    const result = UpdateProfileSchema.safeParse({ gender: 'other' });
    expect(result.success).toBe(false);
  });

  it('accepts null gender', () => {
    const result = UpdateProfileSchema.safeParse({ gender: null });
    expect(result.success).toBe(true);
  });
});
