import {
  generateIdempotencyKey,
  IdempotencyAction,
} from '../idempotency';

describe('IdempotencyAction constants', () => {
  it('should export the expected action types', () => {
    expect(IdempotencyAction.CREATE).toBe('create');
    expect(IdempotencyAction.CAPTURE).toBe('capture');
    expect(IdempotencyAction.CANCEL).toBe('cancel');
    expect(IdempotencyAction.REFUND).toBe('refund');
  });
});

describe('generateIdempotencyKey', () => {
  it('should return key in bookingId:role:action format', () => {
    const key = generateIdempotencyKey('abc-123', 'home', 'create');
    expect(key).toBe('abc-123:home:create');
  });

  it('should work with IdempotencyAction constants', () => {
    expect(
      generateIdempotencyKey('booking-1', 'away', IdempotencyAction.CAPTURE),
    ).toBe('booking-1:away:capture');

    expect(
      generateIdempotencyKey('booking-2', 'host', IdempotencyAction.REFUND),
    ).toBe('booking-2:host:refund');
  });

  it('should trim whitespace from all inputs', () => {
    const key = generateIdempotencyKey('  abc-123  ', '  home  ', '  create  ');
    expect(key).toBe('abc-123:home:create');
  });

  // --- Validation: empty / missing params ---

  it('should throw when bookingId is empty', () => {
    expect(() => generateIdempotencyKey('', 'home', 'create')).toThrow(
      'bookingId must be a non-empty string',
    );
  });

  it('should throw when participantRole is empty', () => {
    expect(() => generateIdempotencyKey('abc', '', 'create')).toThrow(
      'participantRole must be a non-empty string',
    );
  });

  it('should throw when actionType is empty', () => {
    expect(() => generateIdempotencyKey('abc', 'home', '')).toThrow(
      'actionType must be a non-empty string',
    );
  });

  it('should throw when bookingId is only whitespace', () => {
    expect(() => generateIdempotencyKey('   ', 'home', 'create')).toThrow(
      'bookingId must be a non-empty string',
    );
  });

  it('should throw for non-string values', () => {
    expect(() =>
      generateIdempotencyKey(null as any, 'home', 'create'),
    ).toThrow('bookingId must be a non-empty string');

    expect(() =>
      generateIdempotencyKey('abc', undefined as any, 'create'),
    ).toThrow('participantRole must be a non-empty string');

    expect(() =>
      generateIdempotencyKey('abc', 'home', 123 as any),
    ).toThrow('actionType must be a non-empty string');
  });
});
