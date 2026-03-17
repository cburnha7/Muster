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

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
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
  email: string,
  businessType?: string,
): Promise<Stripe.Account> {
  return stripe.accounts.create({
    type: 'express',
    email,
    ...(businessType ? { business_type: businessType as Stripe.AccountCreateParams.BusinessType } : {}),
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
  returnUrl: string,
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
  accountId: string,
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
  accountId: string,
): Promise<ConnectAccountBalance> {
  const balance = await stripe.balance.retrieve({
    stripeAccount: accountId,
  });

  const available = balance.available
    .filter((b) => b.currency === 'usd')
    .reduce((sum, b) => sum + b.amount, 0);

  const pending = balance.pending
    .filter((b) => b.currency === 'usd')
    .reduce((sum, b) => sum + b.amount, 0);

  return { available, pending };
}
