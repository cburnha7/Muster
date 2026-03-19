/**
 * Public Event API Service
 *
 * Handles API calls for the public event flow where roster managers
 * create events at facilities and charge attendees a per-person fee.
 */

import { BaseApiService, defaultApiConfig } from './BaseApiService';

export interface CreatePublicEventData {
  userId: string;
  rosterId: string;
  facilityId: string;
  courtId: string;
  timeSlotId: string;
  perPersonPrice: number;
  minAttendeeCount: number;
}

export interface PublicEventParticipant {
  id: string;
  rosterId: string;
  role: 'host' | 'participant';
  escrowAmount: number;
  paymentStatus: string;
  confirmedAt?: string | null;
}

export interface PublicEventResponse {
  id: string;
  status: string;
  bookingType: string;
  totalPrice: number;
  perPersonPrice: number;
  minAttendeeCount: number;
  bookingHostType: string;
  bookingHostId: string;
  facility: { id: string; name: string; street: string; city: string };
  court: { id: string; name: string; sportType: string };
  participants: PublicEventParticipant[];
  timeSlot: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    price: number;
  };
  roster: { id: string; name: string };
}

export interface PublicEventListResponse {
  data: PublicEventResponse[];
  total: number;
  limit: number;
  offset: number;
}

export interface RegisterPublicEventData {
  userId: string;
}

export interface RegisterPublicEventResponse {
  participantId: string;
  clientSecret: string;
  escrowAmount: number;
  currency: string;
}

class PublicEventService extends BaseApiService {
  constructor() {
    super(defaultApiConfig);
  }

  /** Create a new public event */
  async createEvent(data: CreatePublicEventData): Promise<PublicEventResponse> {
    return this.post<PublicEventResponse>('/public-events', data);
  }

  /** Get a public event by booking ID */
  async getEvent(bookingId: string): Promise<PublicEventResponse> {
    return this.get<PublicEventResponse>(`/public-events/${bookingId}`, {
      cacheOptions: { ttl: 15000 },
    });
  }

  /** List public events for browsing */
  async listEvents(params?: { status?: string; limit?: number; offset?: number }): Promise<PublicEventListResponse> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    const qs = query.toString();
    return this.get<PublicEventListResponse>(`/public-events${qs ? `?${qs}` : ''}`, {
      cacheOptions: { ttl: 30000 },
    });
  }
  /** Register (Join Up) an attendee for a public event */
  async registerForEvent(bookingId: string, data: RegisterPublicEventData): Promise<RegisterPublicEventResponse> {
    return this.post<RegisterPublicEventResponse>(`/public-events/${bookingId}/register`, data);
  }
}

export const publicEventService = new PublicEventService();
