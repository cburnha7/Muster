# Design Document: Insurance, Booking & Escrow

## Overview

This design extends Muster with three interconnected capabilities:

1. **Insurance Document Management** — Users upload and manage proof-of-insurance documents on their Profile Screen. A nightly cron job expires stale documents and sends 30-day warning notifications.
2. **Ground Insurance Requirement & Reservation Approval** — Ground owners toggle a `requiresInsurance` flag on their facility. When enabled, renters must attach a valid insurance document to their reservation, which enters a `pending_approval` state until the ground owner approves or denies it.
3. **Escrow-Based Rental Fee Charging** — Join fees from event participants are held via Stripe manual-capture PaymentIntents. When the reservation enters the cancellation window, a cron job captures escrowed funds to cover the rental fee, pays out surplus to the host, or charges the host for any shortfall.

All payment flows use Stripe Connect — the platform never holds funds. Idempotency keys follow the existing format in `server/src/utils/idempotency.ts`.

## Architecture

```mermaid
flowchart TD
    subgraph Frontend ["React Native (Expo)"]
        PS[Profile Screen]
        CFS[Create/Edit Facility Screen]
        HS[Home Screen]
        FDS[Facility Details Screen]
        IDS[InsuranceDocumentsSection]
        IDF[InsuranceDocumentForm]
        ISel[InsuranceDocumentSelector]
        PRS[PendingReservationsSection]
        ETL[EscrowTransactionLog]
    end

    subgraph Backend ["Express.js API"]
        IDR["/api/insurance-documents"]
        RAR["/api/reservation-approvals"]
        RR["/api/rentals (extended)"]
        FR["/api/facilities (extended)"]
        SWH["/api/stripe/webhooks (extended)"]
    end

    subgraph Services
        IDSS[InsuranceDocumentService]
        ETSS[EscrowTransactionService]
        ES[EscrowService (extended)]
        NS[NotificationService (extended)]
        IUS[ImageUploadService (extended)]
    end

    subgraph Jobs
        IEJ[insurance-expiry job]
        RFCJ[rental-fee-charge job]
    end

    subgraph External
        Stripe[Stripe Connect]
        DB[(PostgreSQL / Prisma)]
    end

    PS --> IDS --> IDR
    PS --> IDF --> IDR
    CFS --> FR
    HS --> PRS --> RAR
    FDS --> ISel --> RR
    FDS --> ETL --> ETSS

    IDR --> IDSS --> DB
    IDR --> IUS
    RAR --> NS
    RAR --> DB
    RR --> ES --> Stripe
    RR --> ETSS --> DB
    SWH --> ETSS
    IEJ --> IDSS
    IEJ --> NS
    RFCJ --> ES
    RFCJ --> ETSS
```

### Key Architectural Decisions

1. **Insurance documents stored as files on disk (dev) / S3 (prod)** — Reuses the existing `DocumentService` multer pattern for PDF/JPEG/PNG uploads with a 10 MB limit.
2. **Reservation approval is a status transition on `FacilityRental`** — Adding `pending_approval` to the existing `status` field avoids a separate approval table. The time slot is marked `rented` immediately to hold it.
3. **Escrow for join fees uses the existing `escrow.ts` pattern** — New `EscrowTransactionService` logs every financial event to a dedicated `EscrowTransaction` table for auditability.
4. **Two new cron jobs** — `insurance-expiry` (nightly) and `rental-fee-charge` (every 15 minutes) follow the `node-cron` pattern in `server/src/jobs/index.ts`.
5. **RTK Query for frontend data fetching** — New `insuranceDocumentsApi.ts` slice follows the existing pattern in `src/store/api/`.

## Components and Interfaces

### Backend Routes

#### `POST /api/insurance-documents` — Upload insurance document
- Accepts multipart form: `file` (PDF/JPEG/PNG, ≤10 MB), `policyName` (string), `expiryDate` (ISO date string)
- Validates file type, size, required fields, and that expiry date is in the future
- Creates `InsuranceDocument` record with status `active`
- Returns the created document

#### `GET /api/insurance-documents` — List user's insurance documents
- Query param: `userId` (required), `status` (optional: `active` | `expired`)
- Returns all documents for the user, ordered by `createdAt` desc

#### `GET /api/insurance-documents/:id` — Get single document
- Returns document record including `documentUrl` for viewing

#### `DELETE /api/insurance-documents/:id` — Delete insurance document
- Only the owning user can delete
- Removes file from storage and deletes DB record

#### `GET /api/reservation-approvals` — List pending reservations for ground owner
- Query param: `ownerId` (required)
- Returns all `FacilityRental` records with status `pending_approval` across the owner's facilities, including renter info, court, time slot, and attached insurance document

#### `POST /api/reservation-approvals/:rentalId/approve` — Approve reservation
- Transitions rental status from `pending_approval` to `confirmed`
- Sends confirmation notification to renter

#### `POST /api/reservation-approvals/:rentalId/deny` — Deny reservation
- Transitions rental status from `pending_approval` to `cancelled`
- Releases the held time slot (sets it back to `available`)
- Sends denial notification to renter
- No payment is created or captured

### Backend Services

#### `InsuranceDocumentService`
```typescript
class InsuranceDocumentService {
  async create(userId: string, file: Express.Multer.File, policyName: string, expiryDate: Date): Promise<InsuranceDocument>;
  async listByUser(userId: string, status?: string): Promise<InsuranceDocument[]>;
  async getById(id: string): Promise<InsuranceDocument | null>;
  async delete(id: string, userId: string): Promise<void>;
  async processExpiry(): Promise<{ expired: number; notified: number }>;
  async validateForAttachment(documentId: string): Promise<boolean>;
}
```

#### `EscrowTransactionService`
```typescript
class EscrowTransactionService {
  async logTransaction(data: {
    rentalId: string;
    type: 'authorization' | 'capture' | 'surplus_payout' | 'shortfall_charge' | 'refund';
    amount: number;
    stripePaymentIntentId?: string;
    status: 'pending' | 'completed' | 'failed';
  }): Promise<EscrowTransaction>;
  async getByRental(rentalId: string): Promise<EscrowTransaction[]>;
  async chargeRentalFee(rentalId: string): Promise<void>;
}
```

### Extended Rental Route (`server/src/routes/rentals.ts`)

The existing `POST /facilities/:facilityId/courts/:courtId/slots/:slotId/rent` route is extended:
- If `facility.requiresInsurance` is `true`:
  - Requires `insuranceDocumentId` in request body
  - Validates the document is `active` and belongs to the renter
  - Creates rental with status `pending_approval` instead of `confirmed`
  - Stores `attachedInsuranceDocumentId` on the rental record
- If `facility.requiresInsurance` is `false`:
  - Existing flow unchanged

### Extended Facility Routes (`server/src/routes/facilities.ts`)

The existing `POST /` and `PUT /:id` routes accept `requiresInsurance` (boolean) in the request body and persist it to the facility record.

### Frontend Components

#### `InsuranceDocumentsSection` (`src/components/profile/InsuranceDocumentsSection.tsx`)
- Renders inside `ProfileScreen` below existing sections
- Lists all user insurance documents with status badges
- Expired documents shown grayed out with "Expired" label
- "Add Insurance Document" button opens `InsuranceDocumentForm`

#### `InsuranceDocumentForm` (`src/components/profile/InsuranceDocumentForm.tsx`)
- Modal/screen with file picker, policy name input, expiry date picker
- Client-side validation for required fields and future expiry date
- Calls `POST /api/insurance-documents`

#### `InsuranceDocumentSelector` (`src/components/bookings/InsuranceDocumentSelector.tsx`)
- Shown during reservation flow when `facility.requiresInsurance` is `true`
- Lists only `active` documents
- If no active documents, shows blocking message with link to Profile Screen
- Selected document ID is sent with the rental request

#### `PendingReservationsSection` (`src/components/home/PendingReservationsSection.tsx`)
- Shown on Home Screen for users who own facilities
- Lists pending reservations with renter name, court, date/time
- Tap to view details and attached insurance document
- Approve/Deny buttons

#### `EscrowTransactionLog` (`src/components/facilities/EscrowTransactionLog.tsx`)
- Shown on ground management screen for each reservation
- Lists all escrow transactions: type, amount, timestamp, status
- Only visible to the ground owner

### RTK Query API (`src/store/api/insuranceDocumentsApi.ts`)
- `useGetInsuranceDocumentsQuery({ userId, status? })`
- `useUploadInsuranceDocumentMutation()`
- `useDeleteInsuranceDocumentMutation()`
- `useGetPendingReservationsQuery({ ownerId })`
- `useApproveReservationMutation()`
- `useDenyReservationMutation()`
- `useGetEscrowTransactionsQuery({ rentalId })`

