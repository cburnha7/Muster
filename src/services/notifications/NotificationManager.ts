import * as Notifications from 'expo-notifications';
import { NotificationService, NotificationData } from './NotificationService';
import type { Event, Booking, NotificationPreferences } from '../../types';

/**
 * High-level notification manager for app-specific notification features
 */
class NotificationManagerClass {
  /**
   * Send booking confirmation notification
   */
  async sendBookingConfirmation(booking: Booking, event: Event): Promise<string> {
    const data: NotificationData = {
      type: 'booking_confirmation',
      bookingId: booking.id,
      eventId: event.id,
    };

    return await NotificationService.scheduleNotification(
      'Booking Confirmed! 🎉',
      `Your booking for "${event.title}" has been confirmed. See you on ${new Date(event.startTime).toLocaleDateString()}!`,
      data
    );
  }

  /**
   * Schedule booking reminder notification
   * Sends reminder 1 hour before event start time
   */
  async scheduleBookingReminder(booking: Booking, event: Event): Promise<string> {
    const eventStartTime = new Date(event.startTime);
    const reminderTime = new Date(eventStartTime.getTime() - 60 * 60 * 1000); // 1 hour before
    
    // Don't schedule if event is in the past or less than 1 hour away
    const now = new Date();
    if (reminderTime <= now) {
      throw new Error('Cannot schedule reminder for past events or events starting soon');
    }

    const data: NotificationData = {
      type: 'booking_reminder',
      bookingId: booking.id,
      eventId: event.id,
    };

    const trigger: Notifications.NotificationTriggerInput = {
      date: reminderTime,
    };

    return await NotificationService.scheduleNotification(
      'Event Starting Soon! ⏰',
      `"${event.title}" starts in 1 hour at ${event.facility?.name || event.locationName || 'the venue'}. Get ready!`,
      data,
      trigger
    );
  }

  /**
   * Send event update notification to all participants
   */
  async sendEventUpdateNotification(event: Event, updateMessage: string): Promise<void> {
    const data: NotificationData = {
      type: 'event_update',
      eventId: event.id,
    };

    await NotificationService.scheduleNotification(
      `Event Update: ${event.title}`,
      updateMessage,
      data
    );
  }

  /**
   * Send event cancellation notification
   */
  async sendEventCancellationNotification(event: Event, reason?: string): Promise<void> {
    const data: NotificationData = {
      type: 'event_cancelled',
      eventId: event.id,
    };

    const message = reason 
      ? `"${event.title}" has been cancelled. Reason: ${reason}. You will receive a full refund.`
      : `"${event.title}" has been cancelled. You will receive a full refund.`;

    await NotificationService.scheduleNotification(
      'Event Cancelled ❌',
      message,
      data
    );
  }

  /**
   * Send discovery notification for new events matching user preferences
   */
  async sendDiscoveryNotification(
    event: Event,
    preferences: NotificationPreferences
  ): Promise<void> {
    // Only send if user has enabled new event alerts
    if (!preferences.newEventAlerts || !preferences.pushNotifications) {
      return;
    }

    const data: NotificationData = {
      type: 'discovery',
      eventId: event.id,
    };

    await NotificationService.scheduleNotification(
      'New Event Available! 🏀',
      `Check out "${event.title}" - ${event.sportType} at ${event.facility?.name || event.locationName || 'a nearby venue'}`,
      data
    );
  }

  /**
   * Cancel all reminders for a specific booking
   */
  async cancelBookingReminders(bookingId: string): Promise<void> {
    const scheduledNotifications = await NotificationService.getScheduledNotifications();
    
    // Find and cancel notifications related to this booking
    const bookingNotifications = scheduledNotifications.filter(
      (notification) => {
        const data = notification.content.data as NotificationData;
        return data.bookingId === bookingId;
      }
    );

    for (const notification of bookingNotifications) {
      await NotificationService.cancelNotification(notification.identifier);
    }
  }

  /**
   * Reschedule reminders for an updated event
   */
  async rescheduleEventReminders(event: Event, bookings: Booking[]): Promise<void> {
    // Cancel existing reminders
    for (const booking of bookings) {
      await this.cancelBookingReminders(booking.id);
    }

    // Schedule new reminders with updated event time
    for (const booking of bookings) {
      try {
        await this.scheduleBookingReminder(booking, event);
      } catch (error) {
        console.error(`Failed to reschedule reminder for booking ${booking.id}:`, error);
      }
    }
  }

  /**
   * Send batch notifications (useful for event updates to multiple participants)
   */
  async sendBatchNotifications(
    title: string,
    body: string,
    data: NotificationData,
    count: number
  ): Promise<void> {
    // For local notifications, we just send one notification
    // In a real app, this would send to multiple device tokens via a backend service
    await NotificationService.scheduleNotification(title, body, data);
  }

  /**
   * Check if user has notification permissions
   */
  async hasNotificationPermissions(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Request notification permissions
   */
  async requestNotificationPermissions(): Promise<boolean> {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }
}

export const NotificationManager = new NotificationManagerClass();
