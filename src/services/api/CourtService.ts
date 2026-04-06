import { BaseApiService } from './BaseApiService';
import { apiConfig } from './config';

export interface Court {
  id: string;
  facilityId: string;
  name: string;
  sportType: string;
  capacity: number;
  isIndoor: boolean;
  isActive: boolean;
  boundaryCoordinates?: any;
  pricePerHour?: number;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCourtData {
  name: string;
  sportType: string;
  capacity?: number;
  isIndoor?: boolean;
  boundaryCoordinates?: any;
  pricePerHour?: number;
  displayOrder?: number;
  minimumBookingMinutes?: number;
}

export interface UpdateCourtData extends Partial<CreateCourtData> {
  isActive?: boolean;
}

export interface TimeSlot {
  id: string;
  courtId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'available' | 'blocked' | 'rented';
  blockReason?: string;
  price: number;
  createdAt: string;
  updatedAt: string;
}

export interface Rental {
  id: string;
  userId: string;
  timeSlotId: string;
  status: 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  totalPrice: number;
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'failed';
  cancelledAt?: string;
  cancellationReason?: string;
  refundAmount?: number;
  createdAt: string;
  updatedAt: string;
  timeSlot?: TimeSlot & { court?: Court };
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

class CourtService extends BaseApiService {
  constructor() {
    super(apiConfig);
  }

  // Court Management
  async getCourts(
    facilityId: string,
    skipCache: boolean = false
  ): Promise<Court[]> {
    return this.get<Court[]>(`/facilities/${facilityId}/courts`, {
      cacheOptions: { skipCache },
    });
  }

  async getCourt(facilityId: string, courtId: string): Promise<Court> {
    return this.get<Court>(`/facilities/${facilityId}/courts/${courtId}`);
  }

  async createCourt(facilityId: string, data: CreateCourtData): Promise<Court> {
    return this.post<Court>(`/facilities/${facilityId}/courts`, data);
  }

  async updateCourt(
    facilityId: string,
    courtId: string,
    data: UpdateCourtData
  ): Promise<Court> {
    return this.put<Court>(`/facilities/${facilityId}/courts/${courtId}`, data);
  }

  async deleteCourt(facilityId: string, courtId: string): Promise<void> {
    await this.delete(`/facilities/${facilityId}/courts/${courtId}`);
  }

  // Time Slot Management
  async getTimeSlots(
    facilityId: string,
    courtId: string,
    params?: { startDate?: string; endDate?: string; status?: string }
  ): Promise<TimeSlot[]> {
    const tzOffset = new Date().getTimezoneOffset();
    return this.get<TimeSlot[]>(
      `/facilities/${facilityId}/courts/${courtId}/slots`,
      { params: { ...params, tzOffset } }
    );
  }

  async blockTimeSlot(
    facilityId: string,
    courtId: string,
    data: {
      date: string;
      startTime: string;
      endTime: string;
      blockReason?: string;
    }
  ): Promise<TimeSlot> {
    return this.post<TimeSlot>(
      `/facilities/${facilityId}/courts/${courtId}/slots/block`,
      data
    );
  }

  async unblockTimeSlot(
    facilityId: string,
    courtId: string,
    slotId: string
  ): Promise<TimeSlot> {
    return this.delete<TimeSlot>(
      `/facilities/${facilityId}/courts/${courtId}/slots/${slotId}/unblock`
    );
  }

  async checkAvailability(
    facilityId: string,
    courtId: string,
    date: string
  ): Promise<{
    date: string;
    courtId: string;
    courtName: string;
    totalSlots: number;
    availableSlots: number;
    slots: TimeSlot[];
  }> {
    const tzOffset = new Date().getTimezoneOffset();
    return this.get(
      `/facilities/${facilityId}/courts/${courtId}/availability`,
      { params: { date, tzOffset } }
    );
  }

  // Rental Management
  async rentTimeSlot(
    facilityId: string,
    courtId: string,
    slotId: string,
    userId: string
  ): Promise<Rental> {
    return this.post<Rental>(
      `/facilities/${facilityId}/courts/${courtId}/slots/${slotId}/rent`,
      { userId }
    );
  }

  async cancelRental(
    rentalId: string,
    userId: string,
    cancellationReason?: string
  ): Promise<Rental> {
    return this.delete<Rental>(`/rentals/${rentalId}`, {
      data: { userId, cancellationReason },
    });
  }

  async getMyRentals(
    userId: string,
    params?: { status?: string; upcoming?: boolean }
  ): Promise<Rental[]> {
    return this.get<Rental[]>('/rentals/my-rentals', {
      params: { userId, ...params },
    });
  }

  async getFacilityRentals(
    facilityId: string,
    params?: { status?: string; startDate?: string; endDate?: string }
  ): Promise<Rental[]> {
    return this.get<Rental[]>(`/facilities/${facilityId}/rentals`, { params });
  }
}

export const courtService = new CourtService();
