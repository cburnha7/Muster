/**
 * Subscription & Paywall Types
 */

export type SubscriptionPlan = 'free' | 'roster' | 'league' | 'facility_basic' | 'facility_pro';
export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'trialing';

export interface Subscription {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

/** Features that can be gated behind a plan */
export type GatedFeature =
  | 'create_roster'        // 2nd+ roster requires roster plan
  | 'roster_join_fee'      // setting join fee on a roster
  | 'create_league'        // creating a league
  | 'league_scheduler'     // bracket / schedule builder
  | 'facility_basic'       // 1-3 facilities
  | 'facility_pro';        // 4+ facilities

/** Maps each gated feature to the minimum plan required */
export const FEATURE_PLAN_MAP: Record<GatedFeature, SubscriptionPlan> = {
  create_roster:    'roster',
  roster_join_fee:  'roster',
  create_league:    'league',
  league_scheduler: 'league',
  facility_basic:   'facility_basic',
  facility_pro:     'facility_pro',
};

/** Plan hierarchy — higher index = more access */
export const PLAN_HIERARCHY: SubscriptionPlan[] = [
  'free',
  'roster',
  'league',
  'facility_basic',
  'facility_pro',
];

/** Display info for each plan */
export const PLAN_INFO: Record<SubscriptionPlan, { label: string; price: string; features: string[] }> = {
  free: {
    label: 'Free',
    price: '$0/mo',
    features: ['Join events', 'Join 1 roster', 'Browse leagues & grounds'],
  },
  roster: {
    label: 'Roster',
    price: '$10/mo',
    features: ['Create unlimited rosters', 'Set join fees', 'Roster management tools'],
  },
  league: {
    label: 'League',
    price: '$25/mo',
    features: ['Create leagues', 'Schedule builder', 'Standings & brackets', 'Everything in Roster'],
  },
  facility_basic: {
    label: 'Ground Basic',
    price: '$40/mo',
    features: ['List up to 3 grounds', 'Court management', 'Rental bookings', 'Everything in League'],
  },
  facility_pro: {
    label: 'Ground Pro',
    price: '$75/mo',
    features: ['Unlimited grounds', 'Priority support', 'Analytics dashboard', 'Everything in Ground Basic'],
  },
};
