# Tasks: Court Bulk Booking

## Task 1: Prisma Schema — Add bookingSessionId to FacilityRental
- [x] Add nullable `bookingSessionId String?` field to the `FacilityRental` model in `server/prisma/schema.prisma`
- [x] Add `@@index([bookingSessionId])` to the model
- [x] Create and apply migration

## Task 2: Backend — Bulk rental endpoint
- [x] Add `POST /api/rentals/bulk` route in `server/src/routes/rentals.ts`
- [x] Validate `userId` and non-empty `slots` array in request body
- [x] Validate each slot exists, belongs to correct court/facility, and date is not in the past
- [x] In a Prisma transaction: check all slots are available, generate `bookingSessionId` UUID, update slot statuses to `rented`, create `FacilityRental` records
- [x] Return 201 with `{ bookingSessionId, rentals, totalPrice, slotCount }` on success
- [x] Return 409 with `{ conflicts, availableSlots }` when any slot is unavailable

## Task 3: Frontend — Selection cart state in CourtAvailabilityScreen
- [x] Replace `selectedSlots: TimeSlot[]` with `selectionCart: Map<string, CartSlot>` state
- [x] Define `CartSlot` interface with `slotId`, `facilityId`, `courtId`, `courtName`, `date`, `startTime`, `endTime`, `price`
- [x] Update `handleSlotPress` to add/remove from cart map instead of array
- [x] Remove `setSelectedSlots([])` from `handleDateSelect` and `handleCourtSelect` so selections persist across navigation
- [x] Derive `selectedSlots` array for the current court/date from the cart for passing to `TimeSlotGrid`
- [x] Clear cart on screen unmount via `useEffect` cleanup

## Task 4: Frontend — Book the Whole Day toggle
- [x] Add `wholeDayOn` boolean state, defaulting to `false`
- [x] Reset `wholeDayOn` to `false` when `selectedCourt` or `selectedDate` changes
- [x] Render a toggle/switch above the time slot grid labeled "Book the Whole Day"
- [x] On toggle ON: add all available slots for current court+date to the cart
- [x] On toggle OFF: remove all slots for current court+date from the cart
- [x] When a slot is manually deselected while toggle is ON, set toggle to OFF

## Task 5: Frontend — Selection summary footer
- [x] Replace the existing footer with a persistent summary derived from the cart
- [x] Show total slot count, distinct court count, distinct day count, and total price
- [x] Show "Book N Slots" button that triggers the confirmation flow
- [x] Hide the footer when the cart is empty

## Task 6: Frontend — BulkBookingConfirmationModal
- [x] Create `src/components/facilities/BulkBookingConfirmationModal.tsx`
- [x] Accept cart slots grouped by court then by date
- [x] Display each slot with court name, date, time range, and price
- [x] Show grand total price
- [x] Include "Confirm Booking" and "Cancel" buttons
- [x] Wire into CourtAvailabilityScreen replacing the existing `RentalConfirmationModal` for multi-slot bookings

## Task 7: Frontend — Bulk submission and conflict handling
- [x] Implement `handleConfirmBulkBooking` in CourtAvailabilityScreen
- [x] Submit cart to `POST /api/rentals/bulk` with userId and slots array
- [x] On 201 success: clear cart, reload availability, show success alert with slot count
- [x] On 409 conflict: show `BookingConflictModal`

## Task 8: Frontend — BookingConflictModal
- [x] Create `src/components/facilities/BookingConflictModal.tsx`
- [x] List conflict slots with court name, date, and time
- [x] "Book Available Slots" button: remove conflicts from cart and resubmit
- [x] "Cancel" button: dismiss modal, keep cart intact

## Task 9: Frontend — MyReservationsSection grouped display
- [x] Update `MyReservationsSection` to fetch `bookingSessionId` from the API response
- [x] Group reservations by non-null `bookingSessionId`
- [x] Render grouped reservations under a collapsible session header showing booking date, slot count, and total price
- [x] Render individual (null session) reservations as before
- [x] Ensure cancellation still works per-individual rental within a group

## Task 10: Backend — Include bookingSessionId in my-rentals response
- [x] Update `GET /api/rentals/my-rentals` query to include `bookingSessionId` in the response
- [x] Ensure backward compatibility — existing rentals return `bookingSessionId: null`
