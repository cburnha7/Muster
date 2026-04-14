/**
 * Stripe Connect — Shared Instance & Connect Account Helpers
 *
 * Canonical Stripe client for the platform. All services should import
 * `stripe` from here rather than instantiating their own.
 */

import Stripe from 'stripe';

// ---------------------------------------------------------------------------
// Shared Stripe client
// ---------------------------------------------------------------------------

let _stripe: Stripe | null = null;

/**
 * Lazy-initialised Stripe client. Returns null when STRIPE_SECRET_KEY is not
 * set so the server can still boot (non-payment routes keep working).
 */
export function getStripe(): Stripe | null {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.warn('⚠️  Stripe client unavailable — STRIPE_SECRET_KEY not set');
    return null;
  }
  _stripe = new Stripe(key, { apiVersion: '2024-12-18.acacia' });
  return _stripe;
}

/**
 * Backward-compatible export — code that imports `stripe` directly will get a
 * proxy that lazily resolves the real client on first property access. This
 * avoids the top-level crash while keeping existing call-sites working.
 */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    const instance = getStripe();
    if (!instance) {
      throw new Error(
        'Stripe is not configured — set STRIPE_SECRET_KEY env var'
      );
    }
    return (instance as any)[prop];
  },
});

// ---------------------------------------------------------------------------
// Platform fee helpers
// ---------------------------------------------------------------------------

/**
 * Read the platform fee rate from env. Returns a number between 0 and 1.
 * Falls back to 0 if the env var is missing or invalid.
 */
export function getPlatformFeeRate(): number {
  const raw = process.env.PLATFORM_FEE_RATE;
  if (!raw) return 0;
  const rate = parseFloat(raw);
  if (isNaN(rate) || rate < 0 || rate > 1) return 0;
  return rate;
}

/**
 * Calculate the platform application fee for a given amount in cents.
 * Always rounds down to avoid overcharging.
 */
export function calculatePlatformFee(amountCents: number): number {
  return Math.floor(amountCents * getPlatformFeeRate());
}

// ---------------------------------------------------------------------------
// Connect account helpers
// ---------------------------------------------------------------------------

/**
 * Create a new Stripe Connect Express account.
 */
export async function createConnectAccount(
  email?: string,
  businessType?: string
): Promise<Stripe.Account> {
  return stripe.accounts.create({
    type: 'express',
    ...(email ? { email } : {}),
    ...(businessType
      ? {
          business_type:
            businessType as Stripe.AccountCreateParams.BusinessType,
        }
      : {}),
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });
}

/**
 * Generate an Account Link for Connect Express onboarding.
 */
export async function createConnectAccountLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string
): Promise<Stripe.AccountLink> {
  return stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });
}

// ---------------------------------------------------------------------------
// Connect account status / balance
// ---------------------------------------------------------------------------

export interface ConnectAccountStatus {
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
}

/**
 * Retrieve a Connect account and return its onboarding status flags.
 */
export async function getConnectAccountStatus(
  accountId: string
): Promise<ConnectAccountStatus> {
  const account = await stripe.accounts.retrieve(accountId);
  return {
    chargesEnabled: account.charges_enabled ?? false,
    payoutsEnabled: account.payouts_enabled ?? false,
    detailsSubmitted: account.details_submitted ?? false,
  };
}

export interface ConnectAccountBalance {
  available: number;
  pending: number;
}

/**
 * Retrieve the balance for a Connect account. Returns amounts in cents (USD).
 */
export async function getConnectAccountBalance(
  accountId: string
): Promise<ConnectAccountBalance> {
  const balance = await stripe.balance.retrieve({
    stripeAccount: accountId,
  });

  const available = balance.available
    .filter(b => b.currency === 'usd')
    .reduce((sum, b) => sum + b.amount, 0);

  const pending = balance.pending
    .filter(b => b.currency === 'usd')
    .reduce((sum, b) => sum + b.amount, 0);

  return { available, pending };
}
