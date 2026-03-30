/**
 * Escrow Transaction Service
 *
 * Logs escrow-related financial events and retrieves transaction history
 * for facility rentals. Also handles rental fee charging when a reservation
 * enters the cancellation window.
 */

import { prisma } from '../lib/prisma';
import { stripe, calculatePlatformFee } from './stripe-connect';
import { generateIdempotencyKey, IdempotencyAction } from '../utils/idempotency';

export type EscrowTransactionType =
  | 'authorization'
  | 'capture'
  | 'surplus_payout'
  | 'shortfall_charge'
  | 'refund';

export type EscrowTransactionStatus = 'pending' | 'completed' | 'failed';

export interface LogTransactionInput {
  rentalId: string;
  type: EscrowTransactionType;
  amount: number;
  stripePaymentIntentId?: string;
  status: EscrowTransactionStatus;
}

export class EscrowTransactionService {
  /**
   * Log an escrow transaction event.
   * Creates an EscrowTransaction record for auditing purposes.
   */
  static async logTransaction(data: LogTransactionInput) {
    return prisma.escrowTransaction.create({
      data: {
        rentalId: data.rentalId,
        type: data.type,
        amount: data.amount,
        stripePaymentIntentId: data.stripePaymentIntentId,
        status: data.status,
      },
    });
  }

  /**
   * Get all escrow transactions for a rental, ordered by createdAt desc.
   */
  static async getByRental(rentalId: string) {
    return prisma.escrowTransaction.findMany({
      where: { rentalId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Charge the rental fee for a reservation that has entered the cancellation window.
   *
   * 1. Looks up the rental (totalPrice, escrowBalance) and facility (stripeConnectAccountId)
   * 2. Fetches all completed authorization EscrowTransactions to get PaymentIntent IDs
   * 3. If escrowBalance >= totalPrice:
   *    a. Captures PaymentIntents to cover the rental fee
   *    b. Transfers any surplus to the host via Stripe Connect
   *    c. Logs 'capture' and 'surplus_payout' transactions
   * 4. If escrowBalance < totalPrice:
   *    a. Captures all PaymentIntents
   *    b. Charges the host for the shortfall
   *    c. Logs 'capture' and 'shortfall_charge' transactions
   * 5. On capture failure: cancels all successfully captured intents, logs failure,
   *    leaves rentalFeeCharged = false for retry on next cron run
   * 6. On success: sets rentalFeeCharged = true
   */
  static async chargeRentalFee(rentalId: string): Promise<void> {
    // 1. Look up the rental with facility info
    const rental = await prisma.facilityRental.findUnique({
      where: { id: rentalId },
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

    if (!rental) {
      throw new Error(`Rental ${rentalId} not found`);
    }

    const facility = rental.timeSlot.court.facility;
    if (!facility.stripeConnectAccountId) {
      throw new Error(`Facility ${facility.id} has no Stripe Connect account`);
    }

    const { totalPrice, escrowBalance } = rental;
    const connectAccountId = facility.stripeConnectAccountId;

    // 2. Fetch all completed authorization transactions to get PaymentIntent IDs
    const authTransactions = await prisma.escrowTransaction.findMany({
      where: {
        rentalId,
        type: 'authorization',
        status: 'completed',
      },
      orderBy: { createdAt: 'asc' },
    });

    if (authTransactions.length === 0) {
      throw new Error(`No authorized escrow PaymentIntents found for rental ${rentalId}`);
    }

    // Track successfully captured intents for rollback on failure
    const capturedIntentIds: string[] = [];

    try {
      if (escrowBalance >= totalPrice) {
        // --- SUFFICIENT ESCROW: capture to cover rental fee, pay surplus ---
        await this.captureSufficientEscrow(
          rentalId,
          authTransactions,
          totalPrice,
          escrowBalance,
          connectAccountId,
          capturedIntentIds,
        );
      } else {
        // --- INSUFFICIENT ESCROW: capture all, charge host for shortfall ---
        await this.captureInsufficientEscrow(
          rentalId,
          authTransactions,
          totalPrice,
          escrowBalance,
          connectAccountId,
          capturedIntentIds,
        );
      }

      // 6. Mark rental fee as charged
      await prisma.facilityRental.update({
        where: { id: rentalId },
        data: { rentalFeeCharged: true },
      });
    } catch (error) {
      // 5. On failure: cancel all successfully captured intents (rollback)
      await this.rollbackCapturedIntents(rentalId, capturedIntentIds);

      // Log the failure
      await EscrowTransactionService.logTransaction({
        rentalId,
        type: 'capture',
        amount: 0,
        status: 'failed',
      });

      throw error;
    }
  }

  /**
   * Handle the case where escrowBalance >= totalPrice.
   * Captures intents to cover the rental fee, then transfers surplus to host.
   */
  private static async captureSufficientEscrow(
    rentalId: string,
    authTransactions: { stripePaymentIntentId: string | null; amount: number }[],
    totalPrice: number,
    escrowBalance: number,
    connectAccountId: string,
    capturedIntentIds: string[],
  ): Promise<void> {
    // Capture each authorized PaymentIntent
    for (const tx of authTransactions) {
      if (!tx.stripePaymentIntentId) continue;

      const platformFee = calculatePlatformFee(tx.amount);
      await stripe.paymentIntents.capture(tx.stripePaymentIntentId, {
        amount_to_capture: tx.amount,
        application_fee_amount: platformFee,
      }, {
        idempotencyKey: generateIdempotencyKey(rentalId, tx.stripePaymentIntentId, IdempotencyAction.CAPTURE),
      });

      capturedIntentIds.push(tx.stripePaymentIntentId);

      // Log capture transaction
      await EscrowTransactionService.logTransaction({
        rentalId,
        type: 'capture',
        amount: tx.amount,
        stripePaymentIntentId: tx.stripePaymentIntentId,
        status: 'completed',
      });
    }

    // Transfer surplus to host if any
    const surplus = escrowBalance - totalPrice;
    if (surplus > 0) {
      const transfer = await stripe.transfers.create({
        amount: surplus,
        currency: 'usd',
        destination: connectAccountId,
        transfer_group: rentalId,
        metadata: {
          rental_id: rentalId,
          type: 'surplus_payout',
        },
      }, {
        idempotencyKey: generateIdempotencyKey(rentalId, 'surplus', 'transfer'),
      });

      await EscrowTransactionService.logTransaction({
        rentalId,
        type: 'surplus_payout',
        amount: surplus,
        stripePaymentIntentId: transfer.id,
        status: 'completed',
      });
    }
  }

  /**
   * Handle the case where escrowBalance < totalPrice.
   * Captures all intents, then charges the host for the shortfall.
   */
  private static async captureInsufficientEscrow(
    rentalId: string,
    authTransactions: { stripePaymentIntentId: string | null; amount: number }[],
    totalPrice: number,
    escrowBalance: number,
    connectAccountId: string,
    capturedIntentIds: string[],
  ): Promise<void> {
    // Capture all authorized PaymentIntents
    for (const tx of authTransactions) {
      if (!tx.stripePaymentIntentId) continue;

      const platformFee = calculatePlatformFee(tx.amount);
      await stripe.paymentIntents.capture(tx.stripePaymentIntentId, {
        amount_to_capture: tx.amount,
        application_fee_amount: platformFee,
      }, {
        idempotencyKey: generateIdempotencyKey(rentalId, tx.stripePaymentIntentId, IdempotencyAction.CAPTURE),
      });

      capturedIntentIds.push(tx.stripePaymentIntentId);

      // Log capture transaction
      await EscrowTransactionService.logTransaction({
        rentalId,
        type: 'capture',
        amount: tx.amount,
        stripePaymentIntentId: tx.stripePaymentIntentId,
        status: 'completed',
      });
    }

    // Charge the host for the shortfall
    const shortfall = totalPrice - escrowBalance;
    const shortfallFee = calculatePlatformFee(shortfall);

    const shortfallIntent = await stripe.paymentIntents.create({
      amount: shortfall,
      currency: 'usd',
      application_fee_amount: shortfallFee,
      transfer_data: {
        destination: connectAccountId,
      },
      transfer_group: rentalId,
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
      metadata: {
        rental_id: rentalId,
        type: 'shortfall_charge',
      },
    }, {
      idempotencyKey: generateIdempotencyKey(rentalId, 'shortfall', IdempotencyAction.CREATE),
    });

    await EscrowTransactionService.logTransaction({
      rentalId,
      type: 'shortfall_charge',
      amount: shortfall,
      stripePaymentIntentId: shortfallIntent.id,
      status: 'completed',
    });
  }

  /**
   * Rollback: cancel all successfully captured PaymentIntents.
   * Used when a capture fails partway through to release held funds.
   */
  private static async rollbackCapturedIntents(
    rentalId: string,
    capturedIntentIds: string[],
  ): Promise<void> {
    for (const intentId of capturedIntentIds) {
      try {
        await stripe.paymentIntents.cancel(intentId, {
          idempotencyKey: generateIdempotencyKey(rentalId, intentId, IdempotencyAction.CANCEL),
        });
      } catch (cancelError) {
        // Log but don't throw — best-effort cleanup
        console.error(`Failed to cancel intent ${intentId} during rollback:`, cancelError);
      }
    }
  }
}
