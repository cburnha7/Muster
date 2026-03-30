/**
 * Rental Fee Charge Cron Job
 *
 * Runs every 15 minutes. Finds confirmed rentals that have entered the
 * cancellation window (start time is within cancellationPolicyHours of now)
 * and have not yet been charged, then calls EscrowTransactionService.chargeRentalFee
 * for each eligible rental.
 */

import { prisma } from '../lib/prisma';
import { EscrowTransactionService } from '../services/EscrowTransactionService';

export interface RentalFeeChargeMetrics {
  rentalsChecked: number;
  rentalsCharged: number;
  errors: string[];
}

export async function processRentalFeeCharge(): Promise<RentalFeeChargeMetrics> {
  const metrics: RentalFeeChargeMetrics = {
    rentalsChecked: 0,
    rentalsCharged: 0,
    errors: [],
  };

  // Query confirmed rentals that haven't been charged yet,
  // including the timeSlot → court → facility chain for cancellationPolicyHours
  const rentals = await prisma.facilityRental.findMany({
    where: {
      status: 'confirmed',
      rentalFeeCharged: false,
    },
    include: {
      timeSlot: {
        include: {
          court: {
            include: {
              facility: true,
            },
          },
        },
      },
    },
  });

  const now = new Date();

  for (const rental of rentals) {
    metrics.rentalsChecked++;

    try {
      const facility = rental.timeSlot.court.facility;
      const cancellationPolicyHours = facility.cancellationPolicyHours;

      // If no cancellation policy, skip — no automatic charging
      if (cancellationPolicyHours == null) {
        continue;
      }

      // Compute the slot start datetime from date + startTime (HH:MM)
      const slotDate = new Date(rental.timeSlot.date);
      const [hours, minutes] = rental.timeSlot.startTime.split(':').map(Number);
      const slotStart = new Date(slotDate);
      slotStart.setUTCHours(hours, minutes, 0, 0);

      // Check if now is within the cancellation window
      const windowStart = new Date(slotStart.getTime() - cancellationPolicyHours * 60 * 60 * 1000);

      if (now >= windowStart) {
        await EscrowTransactionService.chargeRentalFee(rental.id);
        metrics.rentalsCharged++;
      }
    } catch (error: any) {
      metrics.errors.push(`Rental ${rental.id}: ${error.message}`);
    }
  }

  return metrics;
}
