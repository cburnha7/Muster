import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Facility, FacilityFilters, PaginatedResponse } from '../../types';

// Facilities state interface
export interface FacilitiesState {
  facilities: Facility[];
  selectedFacility: Facility | null;
  filters: FacilityFilters;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

// Initial state
const initialState: FacilitiesState = {
  facilities: [],
  selectedFacility: null,
  filters: {},
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
  isLoading: false,
  isLoadingMore: false,
  error: null,
  lastUpdated: null,
};

// Facilities slice
const facilitiesSlice = createSlice({
  name: 'facilities',
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

    // Set facilities (replace all)
    setFacilities: (state, action: PayloadAction<PaginatedResponse<Facility>>) => {
      const { data, pagination } = action.payload;
      state.facilities = data;
      state.pagination = pagination;
      state.isLoading = false;
      state.isLoadingMore = false;
      state.error = null;
      state.lastUpdated = new Date();
    },

    // Append facilities (for pagination)
    appendFacilities: (state, action: PayloadAction<PaginatedResponse<Facility>>) => {
      const { data, pagination } = action.payload;
      state.facilities = [...state.facilities, ...data];
      state.pagination = pagination;
      state.isLoadingMore = false;
      state.error = null;
      state.lastUpdated = new Date();
    },

    // Add single facility
    addFacility: (state, action: PayloadAction<Facility>) => {
      state.facilities.unshift(action.payload);
      state.pagination.total += 1;
    },

    // Update facility
    updateFacility: (state, action: PayloadAction<Facility>) => {
      const index = state.facilities.findIndex(facility => facility.id === action.payload.id);
      if (index !== -1) {
        state.facilities[index] = action.payload;
      }
      
      // Update selected facility if it's the same
      if (state.selectedFacility?.id === action.payload.id) {
        state.selectedFacility = action.payload;
      }
    },

    // Remove facility
    removeFacility: (state, action: PayloadAction<string>) => {
      state.facilities = state.facilities.filter(facility => facility.id !== action.payload);
      state.pagination.total = Math.max(0, state.pagination.total - 1);
      
      // Clear selected facility if it's the removed one
      if (state.selectedFacility?.id === action.payload) {
        state.selectedFacility = null;
      }
    },

    // Set selected facility
    setSelectedFacility: (state, action: PayloadAction<Facility | null>) => {
      state.selectedFacility = action.payload;
    },

    // Set filters
    setFilters: (state, action: PayloadAction<FacilityFilters>) => {
      state.filters = action.payload;
      // Reset pagination when filters change
      state.pagination.page = 1;
    },

    // Update filters (merge with existing)
    updateFilters: (state, action: PayloadAction<Partial<FacilityFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
      // Reset pagination when filters change
      state.pagination.page = 1;
    },

    // Clear filters
    clearFilters: (state) => {
      state.filters = {};
      state.pagination.page = 1;
    },

    // Set pagination
    setPagination: (state, action: PayloadAction<{ page: number; limit: number }>) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },

    // Reset facilities state
    resetFacilities: (state) => {
      state.facilities = [];
      state.selectedFacility = null;
      state.pagination = initialState.pagination;
      state.isLoading = false;
      state.isLoadingMore = false;
      state.error = null;
      state.lastUpdated = null;
    },

    // Update facility rating (after reviews)
    updateFacilityRating: (state, action: PayloadAction<{ facilityId: string; rating: number; reviewCount: number }>) => {
      const { facilityId, rating, reviewCount } = action.payload;
      const facility = state.facilities.find(f => f.id === facilityId);
      if (facility) {
        facility.rating = rating;
        facility.reviewCount = reviewCount;
      }
      
      if (state.selectedFacility?.id === facilityId) {
        state.selectedFacility.rating = rating;
        state.selectedFacility.reviewCount = reviewCount;
      }
    },
  },
});

// Export actions
export const {
  setLoading,
  setLoadingMore,
  setError,
  clearError,
  setFacilities,
  appendFacilities,
  addFacility,
  updateFacility,
  removeFacility,
  setSelectedFacility,
  setFilters,
  updateFilters,
  clearFilters,
  setPagination,
  resetFacilities,
  updateFacilityRating,
} = facilitiesSlice.actions;

// Export reducer
export default facilitiesSlice.reducer;

// Selectors
export const selectFacilities = (state: { facilities: FacilitiesState }) => state.facilities.facilities;
export const selectSelectedFacility = (state: { facilities: FacilitiesState }) => state.facilities.selectedFacility;
export const selectFacilityFilters = (state: { facilities: FacilitiesState }) => state.facilities.filters;
export const selectFacilitiesPagination = (state: { facilities: FacilitiesState }) => state.facilities.pagination;
export const selectFacilitiesLoading = (state: { facilities: FacilitiesState }) => state.facilities.isLoading;
export const selectFacilitiesLoadingMore = (state: { facilities: FacilitiesState }) => state.facilities.isLoadingMore;
export const selectFacilitiesError = (state: { facilities: FacilitiesState }) => state.facilities.error;
export const selectFacilitiesLastUpdated = (state: { facilities: FacilitiesState }) => state.facilities.lastUpdated;