# Court Management API Integration Diagram

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │ ManageGround     │  │ AddCourtScreen   │  │ EditCourt     │ │
│  │ Screen           │  │                  │  │ Modal         │ │
│  │                  │  │                  │  │               │ │
│  │ - Load courts    │  │ - Create form    │  │ - Edit form   │ │
│  │ - Refresh        │  │ - Validation     │  │ - Validation  │ │
│  │ - Navigate       │  │ - Submit         │  │ - Submit      │ │
│  └────────┬─────────┘  └────────┬─────────┘  └───────┬───────┘ │
│           │                     │                     │         │
│           └─────────────────────┼─────────────────────┘         │
│                                 │                               │
│  ┌──────────────────────────────▼─────────────────────────────┐ │
│  │              CourtListManager Component                     │ │
│  │                                                              │ │
│  │  - Display courts list                                      │ │
│  │  - Toggle active/inactive                                   │ │
│  │  - Delete with confirmation                                 │ │
│  │  - Empty state handling                                     │ │
│  └──────────────────────────────┬───────────────────────────────┘ │
│                                 │                               │
└─────────────────────────────────┼───────────────────────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │   CourtService.ts          │
                    │   (Service Layer)          │
                    │                            │
                    │  - getCourts()             │
                    │  - createCourt()           │
                    │  - updateCourt()           │
                    │  - deleteCourt()           │
                    │                            │
                    │  Extends BaseApiService    │
                    └─────────────┬──────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │   BaseApiService           │
                    │                            │
                    │  - HTTP methods            │
                    │  - Auth headers            │
                    │  - Error handling          │
                    └─────────────┬──────────────┘
                                  │
                                  │ HTTP Requests
                                  │
┌─────────────────────────────────▼───────────────────────────────┐
│                        BACKEND LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Express.js Server (index.ts)                  │  │
│  │                                                             │  │
│  │  app.use('/api', courtRoutes)                              │  │
│  └───────────────────────────┬─────────────────────────────────┘  │
│                              │                                   │
│  ┌───────────────────────────▼─────────────────────────────────┐  │
│  │              Court Routes (courts.ts)                       │  │
│  │                                                             │  │
│  │  GET    /api/facilities/:id/courts                         │  │
│  │  POST   /api/facilities/:id/courts                         │  │
│  │  PUT    /api/facilities/:id/courts/:courtId                │  │
│  │  DELETE /api/facilities/:id/courts/:courtId                │  │
│  │                                                             │  │
│  │  - Request validation                                      │  │
│  │  - Business logic                                          │  │
│  │  - Error handling                                          │  │
│  └───────────────────────────┬─────────────────────────────────┘  │
│                              │                                   │
│  ┌───────────────────────────▼─────────────────────────────────┐  │
│  │              Prisma ORM                                     │  │
│  │                                                             │  │
│  │  prisma.facilityCourt.findMany()                           │  │
│  │  prisma.facilityCourt.create()                             │  │
│  │  prisma.facilityCourt.update()                             │  │
│  │  prisma.facilityCourt.delete()                             │  │
│  └───────────────────────────┬─────────────────────────────────┘  │
│                              │                                   │
└──────────────────────────────┼───────────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   PostgreSQL DB     │
                    │                     │
                    │  facility_courts    │
                    │  table              │
                    └─────────────────────┘
```

## Data Flow Examples

### 1. Load Courts (GET)

```
User opens ManageGroundScreen
         │
         ▼
ManageGroundScreen.loadCourts()
         │
         ▼
courtService.getCourts(facilityId)
         │
         ▼
BaseApiService.get('/facilities/:id/courts')
         │
         ▼
HTTP GET → Backend
         │
         ▼
courts.ts: GET handler
         │
         ▼
prisma.facilityCourt.findMany({ where: { facilityId } })
         │
         ▼
PostgreSQL query
         │
         ▼
Return Court[] ← Backend
         │
         ▼
setCourts(data) ← Frontend
         │
         ▼
CourtListManager renders courts
```

### 2. Create Court (POST)

```
User fills AddCourtScreen form
         │
         ▼
User clicks "Create Court"
         │
         ▼
AddCourtScreen.handleSubmit()
         │
         ▼
validate() → Check form fields
         │
         ▼
courtService.createCourt(facilityId, data)
         │
         ▼
BaseApiService.post('/facilities/:id/courts', data)
         │
         ▼
HTTP POST → Backend
         │
         ▼
courts.ts: POST handler
         │
         ├─→ Validate required fields
         ├─→ Check facility exists
         ├─→ Check duplicate name
         │
         ▼
prisma.facilityCourt.create({ data })
         │
         ▼
PostgreSQL INSERT
         │
         ▼
Return created Court ← Backend
         │
         ▼
Alert.alert('Success') ← Frontend
         │
         ▼
navigation.goBack()
         │
         ▼
ManageGroundScreen refreshes list
```

### 3. Update Court (PUT)

```
User clicks "Edit" on court
         │
         ▼
ManageGroundScreen.handleEditCourt(court)
         │
         ▼
EditCourtModal opens with court data
         │
         ▼
User modifies fields
         │
         ▼
User clicks "Update Court"
         │
         ▼
EditCourtModal.handleSubmit()
         │
         ▼
validate() → Check form fields
         │
         ▼
courtService.updateCourt(facilityId, courtId, data)
         │
         ▼
BaseApiService.put('/facilities/:id/courts/:courtId', data)
         │
         ▼
HTTP PUT → Backend
         │
         ▼
courts.ts: PUT handler
         │
         ├─→ Verify court exists
         ├─→ Check duplicate name (if changed)
         │
         ▼
prisma.facilityCourt.update({ where: { id }, data })
         │
         ▼
PostgreSQL UPDATE
         │
         ▼
Return updated Court ← Backend
         │
         ▼
Alert.alert('Success') ← Frontend
         │
         ▼
onSuccess() → Close modal
         │
         ▼
ManageGroundScreen refreshes list
```

### 4. Delete Court (DELETE)

```
User clicks "Delete" on court
         │
         ▼
CourtListManager.handleDeleteCourt(court)
         │
         ▼
Alert.alert('Confirm deletion?')
         │
         ▼
User confirms
         │
         ▼
courtService.deleteCourt(facilityId, courtId)
         │
         ▼
BaseApiService.delete('/facilities/:id/courts/:courtId')
         │
         ▼
HTTP DELETE → Backend
         │
         ▼
courts.ts: DELETE handler
         │
         ├─→ Verify court exists
         ├─→ Check for future rentals
         │
         ▼
prisma.facilityCourt.delete({ where: { id } })
         │
         ▼
PostgreSQL DELETE (cascades to related records)
         │
         ▼
Return 204 No Content ← Backend
         │
         ▼
Alert.alert('Success') ← Frontend
         │
         ▼
onCourtUpdated() → Refresh list
```

### 5. Toggle Active Status (PUT)

```
User clicks "Activate/Deactivate"
         │
         ▼
CourtListManager.handleToggleActive(court)
         │
         ▼
courtService.updateCourt(facilityId, courtId, { isActive: !court.isActive })
         │
         ▼
BaseApiService.put('/facilities/:id/courts/:courtId', { isActive })
         │
         ▼
HTTP PUT → Backend
         │
         ▼
courts.ts: PUT handler
         │
         ▼
prisma.facilityCourt.update({ where: { id }, data: { isActive } })
         │
         ▼
PostgreSQL UPDATE
         │
         ▼
Return updated Court ← Backend
         │
         ▼
Alert.alert('Success') ← Frontend
         │
         ▼
onCourtUpdated() → Refresh list
```

## Type Definitions Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Shared Types                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Frontend: src/services/api/CourtService.ts                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ export interface Court {                            │    │
│  │   id: string;                                       │    │
│  │   facilityId: string;                               │    │
│  │   name: string;                                     │    │
│  │   sportType: string;                                │    │
│  │   capacity: number;                                 │    │
│  │   isIndoor: boolean;                                │    │
│  │   isActive: boolean;                                │    │
│  │   pricePerHour?: number;                            │    │
│  │   displayOrder: number;                             │    │
│  │   createdAt: string;                                │    │
│  │   updatedAt: string;                                │    │
│  │ }                                                   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  Backend: Prisma Schema                                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ model FacilityCourt {                               │    │
│  │   id          String   @id @default(uuid())         │    │
│  │   facilityId  String                                │    │
│  │   name        String                                │    │
│  │   sportType   String                                │    │
│  │   capacity    Int      @default(1)                  │    │
│  │   isIndoor    Boolean  @default(false)              │    │
│  │   isActive    Boolean  @default(true)               │    │
│  │   pricePerHour Float?                               │    │
│  │   displayOrder Int     @default(0)                  │    │
│  │   createdAt   DateTime @default(now())              │    │
│  │   updatedAt   DateTime @updatedAt                   │    │
│  │   facility    Facility @relation(...)               │    │
│  │ }                                                   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Error Scenarios                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Validation Error (400)                                   │
│     Backend validates → Returns 400                          │
│     Frontend catches → Alert.alert('Error', message)         │
│                                                               │
│  2. Not Found (404)                                          │
│     Backend checks existence → Returns 404                   │
│     Frontend catches → Alert.alert('Error', 'Not found')     │
│                                                               │
│  3. Duplicate Name (400)                                     │
│     Backend checks duplicates → Returns 400                  │
│     Frontend catches → Alert.alert('Error', 'Name exists')   │
│                                                               │
│  4. Has Rentals (400)                                        │
│     Backend checks rentals → Returns 400                     │
│     Frontend catches → Alert.alert('Error', 'Has rentals')   │
│                                                               │
│  5. Network Error                                            │
│     Request fails → Catch in service                         │
│     Frontend catches → Alert.alert('Error', 'Network error') │
│                                                               │
│  6. Server Error (500)                                       │
│     Backend error → Returns 500                              │
│     Frontend catches → Alert.alert('Error', 'Server error')  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

## State Management

```
┌─────────────────────────────────────────────────────────────┐
│              Component State Flow                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ManageGroundScreen                                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ const [courts, setCourts] = useState<Court[]>([])   │    │
│  │ const [loading, setLoading] = useState(true)        │    │
│  │ const [refreshing, setRefreshing] = useState(false) │    │
│  │ const [editingCourt, setEditingCourt] = useState()  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  AddCourtScreen                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ const [formData, setFormData] = useState({...})     │    │
│  │ const [errors, setErrors] = useState({})            │    │
│  │ const [loading, setLoading] = useState(false)       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  EditCourtModal                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ const [formData, setFormData] = useState({...})     │    │
│  │ const [errors, setErrors] = useState({})            │    │
│  │ const [loading, setLoading] = useState(false)       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

## Summary

This diagram illustrates the complete integration between:
- **Frontend Components** (ManageGroundScreen, AddCourtScreen, EditCourtModal, CourtListManager)
- **Service Layer** (CourtService, BaseApiService)
- **Backend Routes** (courts.ts)
- **Database Layer** (Prisma + PostgreSQL)

All four CRUD operations are fully integrated and working correctly.
