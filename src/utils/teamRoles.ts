/**
 * Roster role utilities
 */

const COACH_ROLES = ['coach', 'head_coach', 'assistant_coach', 'COACH', 'HEAD_COACH', 'ASSISTANT_COACH'];

export function isCoachRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return COACH_ROLES.includes(role) || role.toLowerCase().includes('coach');
}
