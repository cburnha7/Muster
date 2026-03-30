/**
 * Dependent Account Type Definitions (Server)
 *
 * Server-side types for guardian-managed dependent accounts: creation,
 * updates, profile display, and account transfer to independent status.
 *
 * Requirements: 1.1, 4.1, 8.1
 */

/**
 * Input data for creating a new dependent account.
 * The dependent must be under 18 at time of creation.
 */
export interface CreateDependentInput {
  firstName: string;
  lastName: string;
  dateOfBirth: string; // ISO 8601 date
  sportPreferences: string[];
  profileImage?: string;
  gender?: string;
}

/**
 * Input data for updating an existing dependent's profile.
 * All fields are optional — only provided fields are updated.
 * If dateOfBirth is changed, the new value must still yield age < 18.
 */
export interface UpdateDependentInput {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  sportPreferences?: string[];
  profileImage?: string;
  gender?: string;
}

/**
 * Credentials provided during account transfer when a dependent turns 18.
 * These become the dependent's login credentials as an independent user.
 */
export interface TransferCredentials {
  email: string;
  password: string;
}

/**
 * Summary view of a dependent, used in list responses.
 */
export interface DependentSummary {
  id: string;
  firstName: string;
  lastName: string;
  profileImage: string | null;
  dateOfBirth: string;
}

/**
 * Full dependent profile including activity history and stats.
 * Extends DependentSummary with detailed data scoped to the dependent.
 */
export interface DependentProfile extends DependentSummary {
  sportPreferences: string[];
  sportRatings: any[];
  eventHistory: any[];
  salutesReceived: number;
  rosterMemberships: any[];
  leagueMemberships: any[];
}
