import { BaseApiService } from './BaseApiService';
import { apiConfig, API_ENDPOINTS } from './config';
import { Booking } from '../../types';

export interface DebriefParticipant {
  id: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
  saluted: boolean;
}

export interface DebriefDetails {
  event: {
    id: string;
    title: string;
    sportType: string;
    startTime: Date;
    endTime: Date;
    facilityId?: string;
    facility?: { id: string; name: string; rating: number };
  };
  participants: DebriefParticipant[];
  salutedUserIds: string[];
  facilityRating: number | null;
  debriefSubmitted: boolean;
}

class DebriefServiceClass extends BaseApiService {
  constructor() {
    super(apiConfig);
  }

  async getDebriefEvents(): Promise<{ data: Booking[] }> {
    return this.get<{ data: Booking[] }>(API_ENDPOINTS.DEBRIEF.BASE, {
      cacheOptions: { skipCache: true },
    });
  }

  async getDebriefDetails(eventId: string): Promise<DebriefDetails> {
    return this.get<DebriefDetails>(API_ENDPOINTS.DEBRIEF.BY_EVENT(eventId));
  }

  async submitDebrief(
    eventId: string,
    salutedUserIds: string[],
    facilityRating?: number
  ): Promise<{ success: boolean }> {
    return this.post<{ success: boolean }>(
      API_ENDPOINTS.DEBRIEF.SUBMIT(eventId),
      {
        salutedUserIds,
        facilityRating: facilityRating || null,
      }
    );
  }
}

export const debriefService = new DebriefServiceClass();
