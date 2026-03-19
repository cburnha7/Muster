# Facilities Components

This directory contains reusable components for facility management features.

## CourtListManager

A component that displays a list of courts/fields within a facility with management actions.

### Features

- Displays court details (name, sport type, capacity, indoor/outdoor status)
- Shows active/inactive status with visual badges
- Displays price per hour when available
- Provides quick actions:
  - **Edit**: Navigate to edit court screen
  - **Activate/Deactivate**: Toggle court active status
  - **Delete**: Remove court with confirmation dialog
- Empty state with call-to-action when no courts exist
- Follows Muster brand guidelines (colors, spacing, typography)

### Usage

```tsx
import { CourtListManager } from '../../components/facilities/CourtListManager';

<CourtListManager
  courts={courts}
  facilityId={facilityId}
  onCourtUpdated={loadCourts}
  onEditCourt={handleEditCourt}
  onAddCourt={handleAddCourt}
/>
```

### Props

- `courts: Court[]` - Array of court objects to display
- `facilityId: string` - ID of the facility (for API calls)
- `onCourtUpdated: () => void` - Callback when court is updated/deleted
- `onEditCourt: (court: Court) => void` - Callback when edit button is pressed
- `onAddCourt: () => void` - Callback when add court button is pressed

### Integration

This component is used in `ManageGroundScreen` to display and manage courts within a facility. It integrates with the `CourtService` API for delete and update operations.

### Testing

Unit tests are located in `tests/components/facilities/CourtListManager.test.tsx` and cover:
- Rendering court list with details
- Active/inactive status display
- Price display
- Edit button functionality
- Delete confirmation dialog
- Empty state display
- Activate/deactivate functionality
