/**
 * useFeatureGate — checks whether the current user's plan allows a gated feature.
 *
 * Admins and users with a sufficient membershipTier bypass the paywall.
 *
 * Usage:
 *   const { allowed, requiredPlan } = useFeatureGate('create_league');
 *   if (!allowed) showUpsellModal(requiredPlan);
 */

import { useSelector } from 'react-redux';
import { selectUser } from '../store/slices/authSlice';
import { selectPlan, selectIsSubscriptionActive } from '../store/slices/subscriptionSlice';
import { selectActiveUserId, selectDependents } from '../store/slices/contextSlice';
import {
  GatedFeature,
  SubscriptionPlan,
  FEATURE_PLAN_MAP,
  PLAN_HIERARCHY,
} from '../types/subscription';

/** Maps membershipTier values to equivalent subscription plans */
const TIER_TO_PLAN: Record<string, SubscriptionPlan> = {
  facility: 'facility_pro',
  host: 'facility_basic',
  player: 'league',
  standard: 'free',
};

interface FeatureGateResult {
  allowed: boolean;
  requiredPlan: SubscriptionPlan;
}

export function useFeatureGate(feature: GatedFeature): FeatureGateResult {
  const user = useSelector(selectUser);
  const currentPlan = useSelector(selectPlan);
  const isActive = useSelector(selectIsSubscriptionActive);

  const requiredPlan = FEATURE_PLAN_MAP[feature];

  // Admins bypass all gates
  if (user?.role === 'admin') {
    return { allowed: true, requiredPlan };
  }

  // Dependents are locked to free-tier access only
  const activeUserId = useSelector(selectActiveUserId);
  const dependents = useSelector(selectDependents);
  const isDependent =
    !!activeUserId &&
    activeUserId !== user?.id &&
    dependents.some((d) => d.id === activeUserId);

  if (isDependent) {
    return { allowed: requiredPlan === 'free', requiredPlan };
  }

  // Check membershipTier (from promo codes / manual assignment)
  const tierPlan = TIER_TO_PLAN[user?.membershipTier || 'standard'] || 'free';
  const tierIndex = PLAN_HIERARCHY.indexOf(tierPlan);
  const requiredIndex = PLAN_HIERARCHY.indexOf(requiredPlan);

  if (tierIndex >= requiredIndex) {
    return { allowed: true, requiredPlan };
  }

  // Check active trial tier
  if (user?.trialTier && user?.trialExpiry) {
    const trialPlan = TIER_TO_PLAN[user.trialTier] || 'free';
    const trialIndex = PLAN_HIERARCHY.indexOf(trialPlan);
    const trialActive = new Date(user.trialExpiry) > new Date();
    if (trialActive && trialIndex >= requiredIndex) {
      return { allowed: true, requiredPlan };
    }
  }

  // Fall back to subscription plan
  const currentIndex = PLAN_HIERARCHY.indexOf(currentPlan);

  return {
    allowed: isActive && currentIndex >= requiredIndex,
    requiredPlan,
  };
}
