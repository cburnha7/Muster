/**
 * Stripe Webhook Handler
 *
 * Keeps the Subscription table in sync with Stripe events.
 * Must be registered with express.raw() body parser, NOT express.json().
 */

import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { prisma } from '../index';

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

/** Map Stripe price IDs to plan names */
const PRICE_TO_PLAN: Record<string, string> = {
  [process.env.STRIPE_PRICE_ROSTER || '']: 'roster',
  [process.env.STRIPE_PRICE_LEAGUE || '']: 'league',
  [process.env.STRIPE_PRICE_FACILITY_BASIC || '']: 'facility_basic',
  [process.env.STRIPE_PRICE_FACILITY_PRO || '']: 'facility_pro',
};

function planFromPriceId(priceId: string): string {
  return PRICE_TO_PLAN[priceId] || 'free';
}

router.post('/', async (req: Request, res: Response) => {
  let event: Stripe.Event;

  try {
    const sig = req.headers['stripe-signature'] as string;
    event = stripe.webhooks.constructEvent(req.body, sig, WEBHOOK_SECRET);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const priceId = sub.items.data[0]?.price?.id || '';
        const plan = planFromPriceId(priceId);

        // Map Stripe status to our status
        let status = 'active';
        if (sub.status === 'past_due') status = 'past_due';
        else if (sub.status === 'canceled') status = 'cancelled';
        else if (sub.status === 'trialing') status = 'trialing';

        // Find user by stripeCustomerId
        const existing = await prisma.subscription.findFirst({
          where: { stripeCustomerId: customerId },
        });

        if (existing) {
          await prisma.subscription.update({
            where: { id: existing.id },
            data: {
              plan,
              status,
              stripePriceId: priceId,
              stripeSubscriptionId: sub.id,
              currentPeriodStart: new Date(sub.current_period_start * 1000),
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
              cancelAtPeriodEnd: sub.cancel_at_period_end,
            },
          });
          console.log(`[Stripe] Updated subscription for customer ${customerId} → ${plan} (${status})`);
        } else {
          console.warn(`[Stripe] No subscription found for customer ${customerId}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        await prisma.subscription.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            plan: 'free',
            status: 'cancelled',
            cancelAtPeriodEnd: false,
          },
        });
        console.log(`[Stripe] Subscription cancelled for customer ${customerId}`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        await prisma.subscription.updateMany({
          where: { stripeCustomerId: customerId },
          data: { status: 'past_due' },
        });
        console.log(`[Stripe] Payment failed for customer ${customerId}`);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('[Stripe] PaymentIntent succeeded:', paymentIntent.id);

        const bookingId = paymentIntent.metadata?.bookingId;
        if (bookingId) {
          await prisma.$transaction([
            prisma.booking.update({
              where: { id: bookingId },
              data: { paymentStatus: 'paid' },
            }),
            // TODO: Update BookingParticipant.paymentStatus to 'captured' when table exists (task 3.2)
          ]);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('[Stripe] PaymentIntent failed:', paymentIntent.id);

        const bookingId = paymentIntent.metadata?.bookingId;
        if (bookingId) {
          await prisma.$transaction([
            prisma.booking.update({
              where: { id: bookingId },
              data: { paymentStatus: 'failed' },
            }),
            // TODO: Update BookingParticipant.paymentStatus to 'failed' when table exists (task 3.2)
          ]);
        }
        break;
      }

      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('[Stripe] PaymentIntent canceled:', paymentIntent.id);

        const bookingId = paymentIntent.metadata?.bookingId;
        if (bookingId) {
          await prisma.$transaction([
            prisma.booking.update({
              where: { id: bookingId },
              data: { paymentStatus: 'refunded' },
            }),
            // TODO: Update BookingParticipant.paymentStatus to 'refunded' when table exists (task 3.2)
          ]);
        }
        break;
      }

      case 'transfer.reversed': {
        const transfer = event.data.object as Stripe.Transfer;
        console.log('[Stripe] Transfer reversed:', transfer.id);
        // TODO: Handle transfer reversal — update booking and participant records
        break;
      }

      default:
        // Unhandled event type — ignore
        break;
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
