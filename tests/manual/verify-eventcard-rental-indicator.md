# Manual Verification Guide: EventCard Rental Indicator

## Purpose
This guide helps you manually verify that the EventCard rental indicator is working correctly in Task 14.1.

## Prerequisites
- App is running (`npm start`)
- Backend server is running
- Database has facilities with courts
- At least one rental exists with an event created from it

## Test Scenarios

### Scenario 1: Event WITH Rental

**Steps:**
1. Navigate to HomeScreen or any screen showing event cards
2. Find an event that was created from a rental
3. Observe the event card

**Expected Results:**
- ✅ Event card displays normally
- ✅ Below the location (📍), there is a rental indicator badge
- ✅ Badge has a light green background
- ✅ Badge shows a calendar icon (📅)
- ✅ Badge shows the court/field name (e.g., "Court 1")
- ✅ Text is grass green (#3D8C5E)
- ✅ Badge has a subtle green border
- ✅ Badge is compact and doesn't clutter the card

**Visual Check:**
```
┌─────────────────────────────────────┐
│ 🏀 Basketball Game      [INTER]     │
│                                     │
│ Friendly pickup game                │
│                                     │
│ 📅 Mon, Jan 15 at 2:00 PM          │
│ 📍 Downtown Sports Complex          │
│ ┌─────────────────┐                │
│ │ 📅 Court 1      │ ← Should see   │
│ └─────────────────┘                │
│ 👥 5/10 participants                │
│                                     │
│ $10                    5 spots left │
└─────────────────────────────────────┘
```

### Scenario 2: Event WITHOUT Rental

**Steps:**
1. Navigate to HomeScreen or any screen showing event cards
2. Find a regular event (not created from a rental)
3. Observe the event card

**Expected Results:**
- ✅ Event card displays normally
- ✅ NO rental indicator badge appears
- ✅ Location is shown normally
- ✅ Participants row appears directly after location
- ✅ Card layout is unchanged from before

**Visual Check:**
```
┌─────────────────────────────────────┐
│ 🏀 Basketball Game      [INTER]     │
│                                     │
│ Friendly pickup game                │
│                                     │
│ 📅 Mon, Jan 15 at 2:00 PM          │
│ 📍 Downtown Sports Complex          │
│ 👥 5/10 participants                │ ← No badge
│                                     │
│ $10                    5 spots left │
└─────────────────────────────────────┘
```

### Scenario 3: Different Court Names

**Steps:**
1. Create rentals for different courts with various names:
   - "Court 1"
   - "Field A"
   - "Tennis Court 3"
   - "Main Basketball Court"
2. Create events from each rental
3. View the event cards

**Expected Results:**
- ✅ Each event card shows the correct court name
- ✅ All court names are displayed in the badge
- ✅ Long names are truncated with ellipsis if needed
- ✅ Badge styling is consistent across all cards

### Scenario 4: Mixed Event List

**Steps:**
1. Navigate to a screen showing multiple events
2. Ensure the list contains both:
   - Events with rentals
   - Events without rentals
3. Scroll through the list

**Expected Results:**
- ✅ Events with rentals show the badge
- ✅ Events without rentals don't show the badge
- ✅ List scrolls smoothly (no performance issues)
- ✅ Badge appears consistently for all rental events
- ✅ Visual distinction is clear between rental and non-rental events

### Scenario 5: Different Screen Sizes

**Steps:**
1. Test on phone (iOS or Android)
2. Test on tablet (if available)
3. Test on web browser
4. Resize web browser window

**Expected Results:**
- ✅ Badge displays correctly on all screen sizes
- ✅ Badge doesn't overflow or break layout
- ✅ Text remains readable at all sizes
- ✅ Badge scales appropriately

### Scenario 6: Tap Interaction

**Steps:**
1. Find an event card with a rental indicator
2. Tap anywhere on the card (including the badge area)
3. Observe navigation

**Expected Results:**
- ✅ Tapping the card navigates to EventDetailsScreen
- ✅ Tapping the badge area also navigates (badge is not separately interactive)
- ✅ EventDetailsScreen shows full rental information
- ✅ No errors or unexpected behavior

## Visual Design Checklist

### Colors
- [ ] Badge background is light green (#3D8C5E with 10% opacity)
- [ ] Badge border is green (#3D8C5E with 30% opacity)
- [ ] Calendar icon is grass green (#3D8C5E)
- [ ] Text is grass green (#3D8C5E)

### Typography
- [ ] Text size is 12px
- [ ] Text weight is 600 (semi-bold)
- [ ] Text color is readable

### Spacing
- [ ] Badge has 8px horizontal padding
- [ ] Badge has 4px vertical padding
- [ ] Badge has 4px top margin (space from location)
- [ ] Icon has 6px right margin (space from text)

### Layout
- [ ] Badge is positioned after location row
- [ ] Badge is positioned before participants row
- [ ] Badge aligns to the left (alignSelf: flex-start)
- [ ] Badge has rounded corners (8px border radius)

### Accessibility
- [ ] Text is readable (sufficient contrast)
- [ ] Icon is visible and clear
- [ ] Badge doesn't interfere with other elements
- [ ] Card remains tappable

## Common Issues and Solutions

### Issue 1: Badge Not Appearing

**Possible Causes:**
- Event doesn't have rental data
- API not returning rental information
- Conditional rendering logic issue

**Check:**
1. Verify event has `rentalId` in database
2. Check API response includes `rental` object
3. Console log `event.rental` in EventCard component

### Issue 2: Wrong Court Name

**Possible Causes:**
- Database has incorrect court name
- API returning wrong data
- Display logic issue

**Check:**
1. Verify court name in database
2. Check API response for correct court name
3. Verify `event.rental.timeSlot.court.name` path

### Issue 3: Styling Issues

**Possible Causes:**
- Theme colors not imported
- Style conflicts
- Platform-specific rendering differences

**Check:**
1. Verify `colors` is imported from theme
2. Check for style conflicts in StyleSheet
3. Test on different platforms

### Issue 4: Performance Issues

**Possible Causes:**
- Too many re-renders
- Heavy computations in render
- Large event lists

**Check:**
1. Use React DevTools to check re-renders
2. Verify conditional rendering is efficient
3. Test with large event lists (50+ events)

## Success Criteria

All of the following should be true:

- [x] Rental indicator appears for events with rentals
- [x] Rental indicator does NOT appear for events without rentals
- [x] Court/field name is displayed correctly
- [x] Calendar icon is visible
- [x] Colors match brand guidelines (grass green)
- [x] Badge is subtle but noticeable
- [x] Badge doesn't clutter the card
- [x] Layout is responsive on all screen sizes
- [x] No TypeScript errors
- [x] No runtime errors
- [x] Smooth scrolling performance
- [x] Consistent with EventDetailsScreen styling

## Reporting Issues

If you find any issues during manual testing:

1. **Document the issue:**
   - What you expected to see
   - What you actually saw
   - Steps to reproduce
   - Screenshots if possible

2. **Check the implementation:**
   - Review `src/components/ui/EventCard.tsx`
   - Check the rental indicator code
   - Verify styling

3. **Test edge cases:**
   - Different court names
   - Long court names
   - Missing rental data
   - Different screen sizes

## Quick Test Script

For a quick verification, run through this checklist:

1. [ ] Start the app
2. [ ] Navigate to HomeScreen
3. [ ] Find an event with a rental
4. [ ] Verify badge appears with court name
5. [ ] Find an event without a rental
6. [ ] Verify badge does NOT appear
7. [ ] Tap an event card with rental
8. [ ] Verify navigation to EventDetailsScreen
9. [ ] Verify full rental info is shown
10. [ ] Return to event list
11. [ ] Scroll through events
12. [ ] Verify smooth performance

## Conclusion

If all test scenarios pass and the success criteria are met, Task 14.1 is successfully implemented and verified.

The EventCard rental indicator provides users with immediate visual feedback about which events are using pre-booked rental slots, enhancing the overall user experience and making the event-rental integration more transparent.
