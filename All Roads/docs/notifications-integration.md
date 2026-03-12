# Push Notifications Integration Guide

This document explains how to integrate push notifications into the Sports Booking App.

## Overview

The notification system is built using Expo Notifications and provides:
- Booking confirmations
- Event reminders (1 hour before event)
- Event update notifications
- Event cancellation notifications
- Discovery notifications for new events

## Architecture

### Core Components

1. **NotificationService** - Low-level notification management
   - Permission handling
   - Token registration
   - Notification scheduling
   - Event listeners

2. **NotificationManager** - High-level notification features
   - Booking confirmations
   - Event reminders
   - Update notifications
   - Discovery notifications

3. **BookingNotificationService** - Integration with booking flow
   - Handles booking lifecycle notifications
   - Manages reminder scheduling
   - Respects user preferences

4. **NotificationProvider** - React context provider
   - Initializes notifications on app start
   - Provides notification context to components

## Setup

### 1. Notification Provider

The `NotificationProvider` is already integrated in `app/_layout.tsx`:

```typescript
<AuthProvider>
  <NotificationProvider>
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  </NotificationProvider>
</AuthProvider>
```

### 2. Using Notifications in Components

Use the `useNotifications` hook or `useNotificationContext`:

```typescript
import { useNotifications } from '../hooks/useNotifications';

function MyComponent() {
  const { expoPushToken, isInitialized, scheduleNotification } = useNotifications();
  
  // Use notification functions
}
```

## Integration Examples

### Booking Flow Integration

When a user books an event, integrate notifications:

```typescript
import { BookingNotificationService } from '../services/booking';

async function handleBooking(event: Event, user: User) {
  // 1. Create the booking
  const booking = await eventService.bookEvent(event.id);
  
  // 2. Get user preferences
  const preferences = await userService.getNotificationPreferences();
  
  // 3. Send notifications
  await BookingNotificationService.handleBookingCreated(
    booking,
    event,
    preferences
  );
}
```

### Booking Cancellation

When a user cancels a booking:

```typescript
async function handleCancelBooking(booking: Booking, event: Event) {
  // 1. Cancel the booking
  await eventService.cancelBooking(booking.id);
  
  // 2. Cancel scheduled notifications
  await BookingNotificationService.handleBookingCancelled(booking, event);
}
```

### Event Updates

When an organizer updates an event:

```typescript
async function handleEventUpdate(event: Event, updateMessage: string) {
  // 1. Update the event
  await eventService.updateEvent(event.id, updates);
  
  // 2. Get all bookings for this event
  const bookings = await eventService.getEventBookings(event.id);
  
  // 3. Get user preferences
  const preferences = await userService.getNotificationPreferences();
  
  // 4. Send update notifications
  await BookingNotificationService.handleEventUpdated(
    event,
    bookings,
    updateMessage,
    preferences
  );
}
```

### Event Cancellation

When an organizer cancels an event:

```typescript
async function handleEventCancellation(event: Event, reason?: string) {
  // 1. Cancel the event
  await eventService.cancelEvent(event.id);
  
  // 2. Get all bookings
  const bookings = await eventService.getEventBookings(event.id);
  
  // 3. Get user preferences
  const preferences = await userService.getNotificationPreferences();
  
  // 4. Send cancellation notifications
  await BookingNotificationService.handleEventCancelled(
    event,
    bookings,
    reason,
    preferences
  );
}
```

### Discovery Notifications

When a new event is created that matches user preferences:

```typescript
async function handleNewEvent(event: Event, user: User) {
  // 1. Create the event
  await eventService.createEvent(eventData);
  
  // 2. Find users with matching preferences
  const interestedUsers = await findUsersWithMatchingPreferences(event);
  
  // 3. Send discovery notifications
  for (const user of interestedUsers) {
    const preferences = await userService.getNotificationPreferences(user.id);
    await BookingNotificationService.handleNewEventDiscovery(event, preferences);
  }
}
```

## Notification Types

### 1. Booking Confirmation
- **Trigger**: Immediately after successful booking
- **Title**: "Booking Confirmed! 🎉"
- **Body**: Event details and date
- **Data**: `{ type: 'booking_confirmation', bookingId, eventId }`

### 2. Booking Reminder
- **Trigger**: 1 hour before event start time
- **Title**: "Event Starting Soon! ⏰"
- **Body**: Event name and location
- **Data**: `{ type: 'booking_reminder', bookingId, eventId }`

### 3. Event Update
- **Trigger**: When event details change
- **Title**: "Event Update: {event.title}"
- **Body**: Update message
- **Data**: `{ type: 'event_update', eventId }`

### 4. Event Cancellation
- **Trigger**: When event is cancelled
- **Title**: "Event Cancelled ❌"
- **Body**: Cancellation reason and refund info
- **Data**: `{ type: 'event_cancelled', eventId }`

### 5. Discovery Notification
- **Trigger**: New event matching user preferences
- **Title**: "New Event Available! 🏀"
- **Body**: Event details
- **Data**: `{ type: 'discovery', eventId }`

## User Preferences

Users can control notifications in the Notification Preferences screen:

- **Push Notifications**: Master switch for all notifications
- **Event Reminders**: Booking confirmations and reminders
- **Event Updates**: Changes to booked events
- **New Event Alerts**: Discovery notifications
- **Marketing Emails**: Promotional content

## Permission Handling

### Requesting Permissions

```typescript
import { BookingNotificationService } from '../services/booking';

async function requestNotifications() {
  const granted = await BookingNotificationService.ensureNotificationPermissions();
  
  if (!granted) {
    Alert.alert(
      'Notifications Disabled',
      'Enable notifications in settings to receive event reminders and updates.'
    );
  }
}
```

### Checking Permissions

```typescript
import { NotificationManager } from '../services/notifications';

const hasPermissions = await NotificationManager.hasNotificationPermissions();
```

## Testing Notifications

### Local Testing

1. Run the app on a physical device (notifications don't work in simulator)
2. Grant notification permissions when prompted
3. Book an event to receive confirmation
4. Schedule an event within 2 hours to test reminders

### Testing Scheduled Notifications

```typescript
import { NotificationService } from '../services/notifications';

// Schedule a test notification for 10 seconds from now
const trigger = {
  seconds: 10,
};

await NotificationService.scheduleNotification(
  'Test Notification',
  'This is a test',
  { type: 'discovery' },
  trigger
);
```

## Backend Integration

### Registering Device Tokens

When the app initializes, send the Expo push token to your backend:

```typescript
// In NotificationProvider.tsx
if (token) {
  // Send to backend
  await api.post('/notifications/register', {
    token,
    userId: currentUser.id,
    platform: Platform.OS,
  });
}
```

### Sending Push Notifications from Backend

Use the Expo Push Notification API:

```typescript
// Backend code example
const messages = [{
  to: userToken,
  sound: 'default',
  title: 'Event Update',
  body: 'Your event has been updated',
  data: { type: 'event_update', eventId: '123' },
}];

await fetch('https://exp.host/--/api/v2/push/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(messages),
});
```

## Troubleshooting

### Notifications Not Appearing

1. Check device permissions in Settings
2. Verify push notifications are enabled in user preferences
3. Check that the app is running on a physical device
4. Verify Expo push token is registered

### Reminders Not Scheduling

1. Ensure event is more than 1 hour in the future
2. Check that event start time is valid
3. Verify notification permissions are granted

### Badge Count Issues (iOS)

```typescript
import { NotificationService } from '../services/notifications';

// Reset badge count
await NotificationService.setBadgeCount(0);
```

## Best Practices

1. **Always check user preferences** before sending notifications
2. **Handle permission denials gracefully** with helpful messages
3. **Cancel scheduled notifications** when bookings are cancelled
4. **Reschedule reminders** when event times change
5. **Test on physical devices** - simulators don't support push notifications
6. **Respect user preferences** - don't spam users with unwanted notifications
7. **Provide clear notification content** - users should understand what the notification is about
8. **Handle notification taps** - navigate users to relevant screens

## Requirements Validation

This implementation satisfies the following requirements:

- **Requirement 9.1**: Event reminder notifications (1 hour before)
- **Requirement 9.2**: Event cancellation/modification notifications
- **Requirement 9.3**: Discovery notifications for matching events
- **Requirement 9.4**: User-customizable notification preferences
- **Requirement 9.5**: Booking confirmation notifications
- **Requirement 9.6**: Proper permission handling and device settings respect
