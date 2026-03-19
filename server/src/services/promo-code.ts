/**
 * Promo code service.
 *
 * Handles validation, redemption, creation, and listing of promotional codes
 * that grant users free tier trials (Player, Host, or Facility).
 */

import { prisma } from '../index';
import { TIER_HIERARCHY } from '../utils/effective-tier';

const VALID_TIERS = ['player', 'host', 'facility'];

/**
 * Validate a promo code by looking it up (case-insensitive).
 *
 * @returns Success with trialDurationDays, or failure with error message
 */
export async function validate(code: string): Promise<
  | { valid: true; trialDurationDays: number }
  | { valid: false; error: string }
> {
  if (!code || !code.trim()) {
    throw new Error('Promo code is required');
  }

  const promoCode = await prisma.promoCode.findUnique({
    where: { code: code.toUpperCase() },
  });

  if (!promoCode) {
    return { valid: false, error: 'Invalid promo code' };
  }

  return { valid: true, trialDurationDays: promoCode.trialDurationDays };
}

/**
 * Redeem a promo code for a user with a selected tier.
 *
 * Validates the tier, checks re-redemption upgrade logic, and atomically
 * updates the user's trial state and creates a redemption log entry.
 *
 * @param userId - The user redeeming the code
 * @param code - The promo code string
 * @param selectedTier - One of 'player', 'host', 'facility'
 * @returns The updated user record
 */
export async function redeem(userId: string, code: string, selectedTier: string) {
  if (!VALID_TIERS.includes(selectedTier)) {
    throw new Error('Invalid tier selection');
  }

  if (!code || !code.trim()) {
    throw new Error('Promo code is required');
  }

  const promoCode = await prisma.promoCode.findUnique({
    where: { code: code.toUpperCase() },
  });

  if (!promoCode) {
    throw new Error('Invalid promo code');
  }

  // Check re-redemption: if user already has an active trial from this code
  // with the same or higher tier, reject
  const existingRedemption = await prisma.promoCodeRedemption.findFirst({
    where: { userId, promoCodeId: promoCode.id },
    orderBy: { redeemedAt: 'desc' },
  });

  if (existingRedemption) {
    const currentTierRank = TIER_HIERARCHY[existingRedemption.selectedTier] ?? 0;
    const newTierRank = TIER_HIERARCHY[selectedTier] ?? 0;

    if (currentTierRank >= newTierRank) {
      throw new Error('You already have this tier or higher from this code');
    }
  }

  // Calculate trial expiry
  const trialExpiry = new Date();
  trialExpiry.setDate(trialExpiry.getDate() + promoCode.trialDurationDays);

  // Atomically update user and create redemption log
  const updatedUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: {
        trialTier: selectedTier,
        trialExpiry,
        trialNotified7d: false,
        trialNotified1d: false,
      },
    });

    await tx.promoCodeRedemption.create({
      data: {
        userId,
        promoCodeId: promoCode.id,
        selectedTier,
      },
    });

    return user;
  });

  return updatedUser;
}

/**
 * Create a new promo code (admin only).
 *
 * @param code - The code string (stored uppercase)
 * @param trialDurationDays - Duration of the trial in days
 * @param adminId - The admin user's ID
 */
export async function create(code: string, trialDurationDays: number, adminId: string) {
  try {
    return await prisma.promoCode.create({
      data: {
        code: code.toUpperCase(),
        trialDurationDays,
        createdByAdminId: adminId,
      },
    });
  } catch (err: any) {
    if (err.code === 'P2002') {
      throw new Error('A promo code with this value already exists');
    }
    throw err;
  }
}

/**
 * List all promo codes ordered by creation date (newest first).
 */
export async function list() {
  return prisma.promoCode.findMany({
    orderBy: { createdAt: 'desc' },
  });
}
