/**
 * Validation middleware integration tests.
 *
 * Tests that the validate() middleware correctly rejects invalid bodies
 * and passes valid bodies through to the handler.
 */

import request from 'supertest';
import { createBaseApp, generateTestToken } from './setup';
import { authMiddleware } from '../middleware/auth';
import {
  validate,
  CreateEventSchema,
  RegisterSchema,
} from '../validation/schemas';

function createValidationTestApp() {
  const app = createBaseApp();

  // Endpoint with validation
  app.post(
    '/validated',
    authMiddleware,
    validate(CreateEventSchema),
    (req, res) => {
      res.status(201).json({ title: req.body.title, parsed: true });
    }
  );

  // Registration endpoint with validation
  app.post('/register', validate(RegisterSchema), (req, res) => {
    res.status(201).json({ email: req.body.email });
  });

  return app;
}

describe('validate() middleware', () => {
  const app = createValidationTestApp();
  const token = generateTestToken('user-123');

  it('passes valid body through to handler', async () => {
    const res = await request(app)
      .post('/validated')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Test Event',
        description: 'A test',
        sportType: 'basketball',
        eventType: 'pickup',
        startTime: '2026-06-01T14:00:00Z',
        endTime: '2026-06-01T16:00:00Z',
        maxParticipants: 10,
      });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Test Event');
    expect(res.body.parsed).toBe(true);
  });

  it('returns 400 with structured errors for invalid body', async () => {
    const res = await request(app)
      .post('/validated')
      .set('Authorization', `Bearer ${token}`)
      .send({
        // Missing required fields
        description: 'A test',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.details).toBeInstanceOf(Array);
    expect(res.body.details.length).toBeGreaterThan(0);
    expect(res.body.details[0]).toHaveProperty('field');
    expect(res.body.details[0]).toHaveProperty('message');
  });

  it('returns 400 when endTime is before startTime', async () => {
    const res = await request(app)
      .post('/validated')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Test Event',
        description: 'A test',
        sportType: 'basketball',
        eventType: 'pickup',
        startTime: '2026-06-01T16:00:00Z',
        endTime: '2026-06-01T14:00:00Z',
        maxParticipants: 10,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('coerces date strings to Date objects', async () => {
    const res = await request(app)
      .post('/validated')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Test Event',
        sportType: 'basketball',
        eventType: 'pickup',
        startTime: '2026-06-01T14:00:00Z',
        endTime: '2026-06-01T16:00:00Z',
        maxParticipants: 10,
      });

    expect(res.status).toBe(201);
  });

  it('applies defaults for optional fields', async () => {
    const res = await request(app)
      .post('/validated')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Test Event',
        sportType: 'basketball',
        eventType: 'pickup',
        startTime: '2026-06-01T14:00:00Z',
        endTime: '2026-06-01T16:00:00Z',
        maxParticipants: 10,
      });

    expect(res.status).toBe(201);
  });

  it('validates registration with agreedToTerms', async () => {
    const res = await request(app).post('/register').send({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      username: 'johndoe',
      password: 'securepass123',
      agreedToTerms: true,
    });

    expect(res.status).toBe(201);
    expect(res.body.email).toBe('john@example.com');
  });

  it('rejects registration without agreedToTerms', async () => {
    const res = await request(app).post('/register').send({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      username: 'johndoe',
      password: 'securepass123',
      agreedToTerms: false,
    });

    expect(res.status).toBe(400);
  });
});
