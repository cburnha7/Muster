import { BaseApiService } from './BaseApiService';
import { apiConfig, API_ENDPOINTS } from './config';
import { Booking, PaginatedResponse, PaginationParams } from '../../types';

export class BookingService extends BaseApiService {
  constructor() {
    super(apiConfig);
  }

  /**
   * Get user's bookings
   */
  async getUserBookings(pagination?: PaginationParams): Promise<PaginatedResponse<Booking>> {
    const params = pagination || {};
    return this.get<PaginatedResponse<Booking>>(API_ENDPOINTS.BOOKINGS.BASE, { params });
  }

  /**
   * Get a specific booking by ID
   */
  async getBooking(id: string): Promise<Booking> {
    return this.get<Booking>(API_ENDPOINTS.BOOKINGS.BY_ID(id));
  }

  /**
   * Create a new booking
   */
  async createBooking(bookingData: {
    eventId: string;
    participants: number;
  }): Promise<Booking> {
    return this.post<Booking>(API_ENDPOINTS.BOOKINGS.BASE, bookingData);
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(id: string): Promise<void> {
    return this.delete<void>(API_ENDPOINTS.BOOKINGS.BY_ID(id));
  }
}

// Create and export singleton instance
export const bookingService = new BookingService();
