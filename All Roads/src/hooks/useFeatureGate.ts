/**
 * useFeatureGate — checks whether the current user's plan allows a gated feature.
 *
 * Usage:
 *   const { allowed, requiredPlan } = useFeatureGate('create_league');
 *   if (!allowed) showUpsellModal(requiredPlan);
 */

import { useSelector } from 'react-redux';
import { selectPlan, selectIsSubscriptionActive } from '../store/slices/subscriptionSlice';
import {
  GatedFeature,
  SubscriptionPlan,
  FEATURE_PLAN_MAP,
  PLAN_HIERARCHY,
} from '../types/subscription';

interface FeatureGateResult {
  allowed: boolean;
  requiredPlan: SubscriptionPlan;
}

export function useFeatureGate(feature: GatedFeature): FeatureGateResult {
  const currentPlan = useSelector(selectPlan);
  const isActive = useSelector(selectIsSubscriptionActive);

  const requiredPlan = FEATURE_PLAN_MAP[feature];
  const currentIndex = PLAN_HIERARCHY.indexOf(currentPlan);
  const requiredIndex = PLAN_HIERARCHY.indexOf(requiredPlan);

  return {
    allowed: isActive && currentIndex >= requiredIndex,
    requiredPlan,
  };
}
