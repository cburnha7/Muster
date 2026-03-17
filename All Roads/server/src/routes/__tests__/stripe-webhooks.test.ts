/**
 * Unit tests for Stripe webhook handler
 *
 * Mocks Stripe SDK signature verification and Prisma to test
 * each webhook event type is handled correctly.
 */

import { Request, Response } from 'express';

// --- Mocks ---

const mockConstructEvent = jest.fn();
jest.mock('stripe', () => {
  // The mock must return an object with webhooks.constructEvent
  // that references the outer mockConstructEvent so tests can control it.
  const MockStripe = jest.fn().mockImplementation(() => ({
    webhooks: { constructEvent: (...args: any[]) => mockConstructEvent(...args) },
  }));
  return { __esModule: true, default: MockStripe };
});

const mockBookingUpdate = jest.fn();
const mockSubscriptionFindFirst = jest.fn();
const mockSubscriptionUpdate = jest.fn();
const mockSubscriptionUpdateMany = jest.fn();
const mockTransaction = jest.fn();

jest.mock('../../index', () => ({
  prisma: {
    booking: { update: (...args: any[]) => mockBookingUpdate(...args) },
    subscription: {
      findFirst: (...args: any[]) => mockSubscriptionFindFirst(...args),
      update: (...args: any[]) => mockSubscriptionUpdate(...args),
      updateMany: (...args: any[]) => mockSubscriptionUpdateMany(...args),
    },
    $transaction: (...args: any[]) => mockTransaction(...args),
  },
}));

// Import the router after mocks are set up
import router from '../stripe-webhooks';

// --- Helpers ---

/** Build a minimal Express Request with raw body and stripe-signature header */
function buildReq(body: string = ''): Partial<Request> {
  return {
    body: Buffer.from(body),
    headers: { 'stripe-signature': 'sig_test' },
  };
}

/** Build a minimal Express Response with chainable json/status */
function buildRes(): Partial<Response> & { _status: number; _json: any } {
  const res: any = { _status: 200, _json: null };
  res.status = jest.fn((code: number) => { res._status = code; return res; });
  res.json = jest.fn((data: any) => { res._json = data; return res; });
  return res;
}

/** Simulate calling the POST / handler on the router */
async function callWebhook(req: Partial<Request>, res: Partial<Response>) {
  // The router has a single POST '/' handler — grab it from the stack
  const layer = (router as any).stack.find(
    (l: any) => l.route && l.route.path === '/' && l.route.methods.post,
  );
  const handler = layer.route.stack[0].handle;
  await handler(req, res);
}

function stripeEvent(type: string, object: Record<string, any>) {
  return { type, data: { object } };
}

// --- Tests ---

describe('Stripe Webhook Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // By default, make $transaction resolve with whatever is passed in
    mockTransaction.mockImplementation((ops: any[]) => Promise.all(ops));
  });

  // -----------------------------------------------------------------------
  // Signature verification
  // -----------------------------------------------------------------------

  describe('signature verification', () => {
    it('should return 400 when signature is invalid', async () => {
      mockConstructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const req = buildReq();
      const res = buildRes();
      await callWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid signature' });
    });
  });

  // -----------------------------------------------------------------------
  // payment_intent.succeeded
  // -----------------------------------------------------------------------

  describe('payment_intent.succeeded', () => {
    it('should update booking paymentStatus to paid when bookingId is in metadata', async () => {
      const event = stripeEvent('payment_intent.succeeded', {
        id: 'pi_succeeded_123',
        metadata: { bookingId: 'booking_abc' },
      });
      mockConstructEvent.mockReturnValue(event);
      mockBookingUpdate.mockResolvedValue({});

      const req = buildReq();
      const res = buildRes();
      await callWebhook(req, res);

      expect(mockTransaction).toHaveBeenCalledTimes(1);
      expect(mockBookingUpdate).toHaveBeenCalledWith({
        where: { id: 'booking_abc' },
        data: { paymentStatus: 'paid' },
      });
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });

    it('should not update booking when no bookingId in metadata', async () => {
      const event = stripeEvent('payment_intent.succeeded', {
        id: 'pi_no_booking',
        metadata: {},
      });
      mockConstructEvent.mockReturnValue(event);

      const req = buildReq();
      const res = buildRes();
      await callWebhook(req, res);

      expect(mockTransaction).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });
  });

  // -----------------------------------------------------------------------
  // payment_intent.payment_failed
  // -----------------------------------------------------------------------

  describe('payment_intent.payment_failed', () => {
    it('should update booking paymentStatus to failed when bookingId is in metadata', async () => {
      const event = stripeEvent('payment_intent.payment_failed', {
        id: 'pi_failed_456',
        metadata: { bookingId: 'booking_def' },
      });
      mockConstructEvent.mockReturnValue(event);
      mockBookingUpdate.mockResolvedValue({});

      const req = buildReq();
      const res = buildRes();
      await callWebhook(req, res);

      expect(mockTransaction).toHaveBeenCalledTimes(1);
      expect(mockBookingUpdate).toHaveBeenCalledWith({
        where: { id: 'booking_def' },
        data: { paymentStatus: 'failed' },
      });
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });

    it('should not update booking when no bookingId in metadata', async () => {
      const event = stripeEvent('payment_intent.payment_failed', {
        id: 'pi_failed_no_booking',
        metadata: {},
      });
      mockConstructEvent.mockReturnValue(event);

      const req = buildReq();
      const res = buildRes();
      await callWebhook(req, res);

      expect(mockTransaction).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });
  });

  // -----------------------------------------------------------------------
  // payment_intent.canceled
  // -----------------------------------------------------------------------

  describe('payment_intent.canceled', () => {
    it('should update booking paymentStatus to refunded when bookingId is in metadata', async () => {
      const event = stripeEvent('payment_intent.canceled', {
        id: 'pi_canceled_789',
        metadata: { bookingId: 'booking_ghi' },
      });
      mockConstructEvent.mockReturnValue(event);
      mockBookingUpdate.mockResolvedValue({});

      const req = buildReq();
      const res = buildRes();
      await callWebhook(req, res);

      expect(mockTransaction).toHaveBeenCalledTimes(1);
      expect(mockBookingUpdate).toHaveBeenCalledWith({
        where: { id: 'booking_ghi' },
        data: { paymentStatus: 'refunded' },
      });
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });

    it('should not update booking when no bookingId in metadata', async () => {
      const event = stripeEvent('payment_intent.canceled', {
        id: 'pi_canceled_no_booking',
        metadata: {},
      });
      mockConstructEvent.mockReturnValue(event);

      const req = buildReq();
      const res = buildRes();
      await callWebhook(req, res);

      expect(mockTransaction).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });
  });

  // -----------------------------------------------------------------------
  // transfer.reversed
  // -----------------------------------------------------------------------

  describe('transfer.reversed', () => {
    it('should handle transfer reversal without errors', async () => {
      const event = stripeEvent('transfer.reversed', {
        id: 'tr_reversed_101',
      });
      mockConstructEvent.mockReturnValue(event);

      const req = buildReq();
      const res = buildRes();
      await callWebhook(req, res);

      expect(res.json).toHaveBeenCalledWith({ received: true });
    });
  });

  // -----------------------------------------------------------------------
  // Unknown event types
  // -----------------------------------------------------------------------

  describe('unknown event types', () => {
    it('should ignore unknown event types and return received: true', async () => {
      const event = stripeEvent('some.unknown.event', { id: 'obj_unknown' });
      mockConstructEvent.mockReturnValue(event);

      const req = buildReq();
      const res = buildRes();
      await callWebhook(req, res);

      expect(mockTransaction).not.toHaveBeenCalled();
      expect(mockBookingUpdate).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });
  });

  // -----------------------------------------------------------------------
  // Error handling
  // -----------------------------------------------------------------------

  describe('error handling', () => {
    it('should return 500 when a database operation fails', async () => {
      const event = stripeEvent('payment_intent.succeeded', {
        id: 'pi_db_error',
        metadata: { bookingId: 'booking_err' },
      });
      mockConstructEvent.mockReturnValue(event);
      mockTransaction.mockRejectedValue(new Error('DB connection lost'));

      const req = buildReq();
      const res = buildRes();
      await callWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Webhook processing failed' });
    });
  });
});
