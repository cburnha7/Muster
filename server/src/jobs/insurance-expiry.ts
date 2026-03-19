/**
 * Insurance Expiry Cron Job
 *
 * Runs daily at 01:00 UTC. Expires stale insurance documents and sends
 * 30-day warning notifications (once per document via expiryNotificationSent flag).
 */

import { InsuranceDocumentService } from '../services/InsuranceDocumentService';

export async function processInsuranceExpiry(): Promise<{ expired: number; notified: number }> {
  return InsuranceDocumentService.processExpiry();
}
