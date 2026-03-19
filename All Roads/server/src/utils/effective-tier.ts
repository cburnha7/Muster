/**
 * Effective tier resolution for promo code trials.
 *
 * Determines a user's current tier by checking whether they have an active
 * trial. If the trial is active (non-null trialTier with a future expiry),
 * the trial tier takes precedence; otherwise the paid membershipTier is used.
 */

/** Tier hierarchy for upgrade comparison during re-redemption. */
export const TIER_HIERARCHY: Record<string, number> = {
  standard: 0,
  player: 1,
  host: 2,
  facility: 3,
};

/**
 * Resolve a user's effective membership tier.
 *
 * @param user - Object containing membershipTier, trialTier, and trialExpiry
 * @returns The active trialTier if the trial is still valid, otherwise membershipTier
 */
export function getEffectiveTier(user: {
  membershipTier: string;
  trialTier: string | null;
  trialExpiry: Date | null;
}): string {
  if (user.trialTier && user.trialExpiry && user.trialExpiry > new Date()) {
    return user.trialTier;
  }
  return user.membershipTier;
}
