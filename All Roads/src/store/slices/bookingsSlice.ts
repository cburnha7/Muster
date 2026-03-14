import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Booking, BookingStatus, PaginatedResponse } from '../../types';

// Bookings state interface
export interface BookingsState {
  bookings: Booking[];
  upcomingBookings: Booking[];
  pastBookings: Booking[];
  selectedBooking: Booking | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  // Store counts separately to avoid issues with filtered data
  totalCounts: {
    upcoming: number;
    past: number;
    cancelled: number;
    all: number;
  };
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

// Initial state
const initialState: BookingsState = {
  bookings: [],
  upcomingBookings: [],
  pastBookings: [],
  selectedBooking: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
  totalCounts: {
    upcoming: 0,
    past: 0,
    cancelled: 0,
    all: 0,
  },
  isLoading: false,
  isLoadingMore: false,
  error: null,
  lastUpdated: null,
};

// Helper function to categorize bookings
const categorizeBookings = (bookings: Booking[]) => {
  const now = new Date();
  const upcoming: Booking[] = [];
  const past: Booking[] = [];
  
  bookings.forEach(booking => {
    // Cancelled bookings are excluded from both upcoming and past — they only appear in the cancelled filter
    if (booking.status === BookingStatus.CANCELLED) {
      return;
    }
    // Also exclude bookings whose event was cancelled
    if (booking.event && (booking.event as any).status === 'cancelled') {
      return;
    }
    if (booking.status === BookingStatus.COMPLETED) {
      past.push(booking);
    } else if (booking.event && new Date(booking.event.startTime) > now) {
      upcoming.push(booking);
    } else {
      past.push(booking);
    }
  });
  
  return { upcoming, past };
};

// Bookings slice
const bookingsSlice = createSlice({
  name: 'bookings',
  initialState,
  reducers: {
    // Set loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
      if (action.payload) {
        state.error = null;
      }
    },

    // Set loading more state (for pagination)
    setLoadingMore: (state, action: PayloadAction<boolean>) => {
      state.isLoadingMore = action.payload;
    },

    // Set error state
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isLoading = false;
      state.isLoadingMore = false;
    },

    // Clear error
    clearError: (state) => {
      state.error = null;
    },

    // Set bookings (replace all)
    setBookings: (state, action: PayloadAction<PaginatedResponse<Booking>>) => {
      const { data, pagination } = action.payload;
      state.bookings = data;
      state.pagination = pagination;
      
      // Categorize bookings
      const { upcoming, past } = categorizeBookings(data);
      state.upcomingBookings = upcoming;
      state.pastBookings = past;
      
      state.isLoading = false;
      state.isLoadingMore = false;
      state.error = null;
      state.lastUpdated = new Date();
    },

    // Append bookings (for pagination)
    appendBookings: (state, action: PayloadAction<PaginatedResponse<Booking>>) => {
      const { data, pagination } = action.payload;
      state.bookings = [...state.bookings, ...data];
      state.pagination = pagination;
      
      // Re-categorize all bookings
      const { upcoming, past } = categorizeBookings(state.bookings);
      state.upcomingBookings = upcoming;
      state.pastBookings = past;
      
      state.isLoadingMore = false;
      state.error = null;
      state.lastUpdated = new Date();
    },

    // Add single booking
    addBooking: (state, action: PayloadAction<Booking>) => {
      const booking = action.payload;
      state.bookings.unshift(booking);
      state.pagination.total += 1;
      
      // Add to appropriate category
      if (booking.event && new Date(booking.event.startTime) > new Date()) {
        state.upcomingBookings.unshift(booking);
      } else {
        state.pastBookings.unshift(booking);
      }
    },

    // Update booking
    updateBooking: (state, action: PayloadAction<Booking>) => {
      const updatedBooking = action.payload;
      const index = state.bookings.findIndex(booking => booking.id === updatedBooking.id);
      
      if (index !== -1) {
        state.bookings[index] = updatedBooking;
        
        // Re-categorize bookings
        const { upcoming, past } = categorizeBookings(state.bookings);
        state.upcomingBookings = upcoming;
        state.pastBookings = past;
      }
      
      // Update selected booking if it's the same
      if (state.selectedBooking?.id === updatedBooking.id) {
        state.selectedBooking = updatedBooking;
      }
    },

    // Remove booking
    removeBooking: (state, action: PayloadAction<string>) => {
      const bookingId = action.payload;
      state.bookings = state.bookings.filter(booking => booking.id !== bookingId);
      state.upcomingBookings = state.upcomingBookings.filter(booking => booking.id !== bookingId);
      state.pastBookings = state.pastBookings.filter(booking => booking.id !== bookingId);
      state.pagination.total = Math.max(0, state.pagination.total - 1);
      
      // Clear selected booking if it's the removed one
      if (state.selectedBooking?.id === bookingId) {
        state.selectedBooking = null;
      }
    },

    // Cancel booking (update status)
    cancelBooking: (state, action: PayloadAction<{ bookingId: string; cancellationReason?: string }>) => {
      const { bookingId, cancellationReason } = action.payload;
      const booking = state.bookings.find(b => b.id === bookingId);
      
      if (booking) {
        booking.status = BookingStatus.CANCELLED;
        booking.cancelledAt = new Date();
        if (cancellationReason) {
          booking.cancellationReason = cancellationReason;
        }
        
        // Remove from upcoming bookings
        state.upcomingBookings = state.upcomingBookings.filter(b => b.id !== bookingId);
        
        // Add to past bookings if not already there
        const existsInPast = state.pastBookings.some(b => b.id === bookingId);
        if (!existsInPast) {
          state.pastBookings.unshift(booking);
        }
      }
      
      // Update selected booking if it's the same
      if (state.selectedBooking?.id === bookingId) {
        state.selectedBooking.status = BookingStatus.CANCELLED;
        state.selectedBooking.cancelledAt = new Date();
        if (cancellationReason) {
          state.selectedBooking.cancellationReason = cancellationReason;
        }
      }
    },

    // Set selected booking
    setSelectedBooking: (state, action: PayloadAction<Booking | null>) => {
      state.selectedBooking = action.payload;
    },

    // Set pagination
    setPagination: (state, action: PayloadAction<{ page: number; limit: number }>) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },

    // Reset bookings state
    resetBookings: (state) => {
      state.bookings = [];
      state.upcomingBookings = [];
      state.pastBookings = [];
      state.selectedBooking = null;
      state.pagination = initialState.pagination;
      state.isLoading = false;
      state.isLoadingMore = false;
      state.error = null;
      state.lastUpdated = null;
    },

    // Update booking payment status
    updateBookingPaymentStatus: (state, action: PayloadAction<{ bookingId: string; paymentStatus: string; paymentId?: string }>) => {
      const { bookingId, paymentStatus, paymentId } = action.payload;
      const booking = state.bookings.find(b => b.id === bookingId);
      
      if (booking) {
        booking.paymentStatus = paymentStatus as any;
        if (paymentId) {
          booking.paymentId = paymentId;
        }
      }
      
      // Update selected booking if it's the same
      if (state.selectedBooking?.id === bookingId) {
        state.selectedBooking.paymentStatus = paymentStatus as any;
        if (paymentId) {
          state.selectedBooking.paymentId = paymentId;
        }
      }
    },

    // Refresh booking categories (useful for time-based updates)
    refreshBookingCategories: (state) => {
      const { upcoming, past } = categorizeBookings(state.bookings);
      state.upcomingBookings = upcoming;
      state.pastBookings = past;
    },
  },
});

// Export actions
export const {
  setLoading,
  setLoadingMore,
  setError,
  clearError,
  setBookings,
  appendBookings,
  addBooking,
  updateBooking,
  removeBooking,
  cancelBooking,
  setSelectedBooking,
  setPagination,
  resetBookings,
  updateBookingPaymentStatus,
  refreshBookingCategories,
} = bookingsSlice.actions;

// Export reducer
export default bookingsSlice.reducer;

// Selectors
export const selectBookings = (state: { bookings: BookingsState }) => state.bookings.bookings;
export const selectUpcomingBookings = (state: { bookings: BookingsState }) => state.bookings.upcomingBookings;
export const selectPastBookings = (state: { bookings: BookingsState }) => state.bookings.pastBookings;
export const selectSelectedBooking = (state: { bookings: BookingsState }) => state.bookings.selectedBooking;
export const selectBookingsPagination = (state: { bookings: BookingsState }) => state.bookings.pagination;
export const selectBookingsLoading = (state: { bookings: BookingsState }) => state.bookings.isLoading;
export const selectBookingsLoadingMore = (state: { bookings: BookingsState }) => state.bookings.isLoadingMore;
export const selectBookingsError = (state: { bookings: BookingsState }) => state.bookings.error;
export const selectBookingsLastUpdated = (state: { bookings: BookingsState }) => state.bookings.lastUpdated;