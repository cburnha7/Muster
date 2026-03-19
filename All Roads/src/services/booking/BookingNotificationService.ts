import { NotificationManager } from '../notifications';
import type { Event, Booking, NotificationPreferences } from '../../types';

/**
 * Service for managing booking-related notifications
 */
export class BookingNotificationService {
  /**
   * Handle notifications after a successful booking
   */
  static async handleBookingCreated(
    booking: Booking,
    event: Event,
    preferences: NotificationPreferences
  ): Promise<void> {
    if (!preferences.pushNotifications) {
      return;
    }

    try {
      // Send immediate confirmation notification
      if (preferences.eventReminders) {
        await NotificationManager.sendBookingConfirmation(booking, event);
      }

      // Schedule reminder notification for 1 hour before event
      if (preferences.eventReminders) {
        try {
          await NotificationManager.scheduleBookingReminder(booking, event);
        } catch (error) {
          // Reminder scheduling might fail if event is too soon
          console.warn('Could not schedule reminder:', error);
        }
      }
    } catch (error) {
      console.error('Error sending booking notifications:', error);
    }
  }

  /**
   * Handle notifications after a booking cancellation
   */
  static async handleBookingCancelled(
    booking: Booking,
    event: Event
  ): Promise<void> {
    try {
      // Cancel any scheduled reminders for this booking
      await NotificationManager.cancelBookingReminders(booking.id);
    } catch (error) {
      console.error('Error cancelling booking notifications:', error);
    }
  }

  /**
   * Handle notifications when an event is updated
   */
  static async handleEventUpdated(
    event: Event,
    bookings: Booking[],
    updateMessage: string,
    preferences: NotificationPreferences
  ): Promise<void> {
    if (!preferences.pushNotifications || !preferences.eventUpdates) {
      return;
    }

    try {
      // Send update notification to all participants
      await NotificationManager.sendEventUpdateNotification(event, updateMessage);

      // Reschedule reminders if event time changed
      await NotificationManager.rescheduleEventReminders(event, bookings);
    } catch (error) {
      console.error('Error sending event update notifications:', error);
    }
  }

  /**
   * Handle notifications when an event is cancelled
   */
  static async handleEventCancelled(
    event: Event,
    bookings: Booking[],
    reason?: string,
    preferences?: NotificationPreferences
  ): Promise<void> {
    if (preferences && (!preferences.pushNotifications || !preferences.eventUpdates)) {
      return;
    }

    try {
      // Send cancellation notification
      await NotificationManager.sendEventCancellationNotification(event, reason);

      // Cancel all scheduled reminders for this event
      for (const booking of bookings) {
        await NotificationManager.cancelBookingReminders(booking.id);
      }
    } catch (error) {
      console.error('Error sending event cancellation notifications:', error);
    }
  }

  /**
   * Send discovery notification for new events matching user preferences
   */
  static async handleNewEventDiscovery(
    event: Event,
    preferences: NotificationPreferences
  ): Promise<void> {
    if (!preferences.pushNotifications || !preferences.newEventAlerts) {
      return;
    }

    try {
      await NotificationManager.sendDiscoveryNotification(event, preferences);
    } catch (error) {
      console.error('Error sending discovery notification:', error);
    }
  }

  /**
   * Check and request notification permissions if needed
   */
  static async ensureNotificationPermissions(): Promise<boolean> {
    const hasPermissions = await NotificationManager.hasNotificationPermissions();
    
    if (!hasPermissions) {
      return await NotificationManager.requestNotificationPermissions();
    }
    
    return true;
  }
}
