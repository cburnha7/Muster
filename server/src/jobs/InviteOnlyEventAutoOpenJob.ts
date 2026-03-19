import { PrismaClient } from '@prisma/client';
import { NotificationService } from '../services/NotificationService';

const prisma = new PrismaClient();

export interface InviteOnlyJobMetrics {
  executionDate: Date;
  eventsChecked: number;
  eventsAutoOpened: number;
  notificationsSent: number;
  duration: number;
  errors: Array<{
    eventId: string;
    error: string;
  }>;
}

/**
 * Background job that checks invite-only events and automatically opens them
 * to the public if they haven't reached minimum player count 2 days before the event.
 */
export class InviteOnlyEventAutoOpenJob {
  private notificationService: NotificationService;
  private logger: Console;

  constructor() {
    this.notificationService = new NotificationService();
    this.logger = console;
  }

  /**
   * Execute the auto-open check
   */
  async execute(): Promise<InviteOnlyJobMetrics> {
    const startTime = Date.now();
    const metrics: InviteOnlyJobMetrics = {
      executionDate: new Date(),
      eventsChecked: 0,
      eventsAutoOpened: 0,
      notificationsSent: 0,
      duration: 0,
      errors: [],
    };

    try {
      // Calculate the threshold: 2 days from now
      const twoDaysFromNow = new Date();
      twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

      // Find all invite-only events that:
      // 1. Are still marked as invite-only
      // 2. Have not been auto-opened yet
      // 3. Start within the next 2 days
      // 4. Have not reached minimum player count
      const inviteOnlyEvents = await prisma.event.findMany({
        where: {
          eligibilityIsInviteOnly: true,
          wasAutoOpenedToPublic: false,
          status: 'active',
          startTime: {
            lte: twoDaysFromNow,
            gte: new Date(), // Only future events
          },
        },
        include: {
          organizer: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          bookings: {
            where: {
              status: 'confirmed',
            },
            select: {
              id: true,
            },
          },
        },
      });

      this.logger.info(`Found ${inviteOnlyEvents.length} invite-only events to check`);

      for (const event of inviteOnlyEvents) {
        metrics.eventsChecked++;

        try {
          // Check if event has reached minimum player count
          const confirmedBookings = event.bookings.length;
          const minimumPlayerCount = event.minimumPlayerCount || 0;

          // If minimum not reached, auto-open the event
          if (confirmedBookings < minimumPlayerCount) {
            await this.autoOpenEvent(event.id, event.organizer);
            metrics.eventsAutoOpened++;
            metrics.notificationsSent++;

            this.logger.info(`Auto-opened event ${event.id} to public`, {
              eventTitle: event.title,
              confirmedBookings,
              minimumPlayerCount,
            });
          }
        } catch (error: any) {
          this.logger.error(`Failed to process event ${event.id}`, {
            error: error.message,
          });
          metrics.errors.push({
            eventId: event.id,
            error: error.message,
          });
        }
      }
    } catch (error: any) {
      this.logger.error('Invite-only auto-open job failed', {
        error: error.message,
      });
      throw error;
    } finally {
      metrics.duration = Date.now() - startTime;
    }

    return metrics;
  }

  /**
   * Auto-open an event to the public
   */
  private async autoOpenEvent(
    eventId: string,
    organizer: { id: string; email: string; firstName: string; lastName: string }
  ): Promise<void> {
    // Update the event to mark it as auto-opened and no longer invite-only
    await prisma.event.update({
      where: { id: eventId },
      data: {
        eligibilityIsInviteOnly: false,
        wasAutoOpenedToPublic: true,
        autoOpenedAt: new Date(),
      },
    });

    // Send notification to organizer
    await this.notificationService.sendEventAutoOpenedNotification(
      organizer.id,
      organizer.email,
      eventId
    );
  }
}
