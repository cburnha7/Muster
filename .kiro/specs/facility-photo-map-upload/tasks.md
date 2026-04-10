# Implementation Tasks

## Task List

- [x] 1. Database schema — add FacilityPhoto model
  - [x] 1.1 Add `FacilityPhoto` model to `server/prisma/schema.prisma` with fields: `id`, `facilityId`, `imageUrl`, `displayOrder`, `createdAt`; add `photos FacilityPhoto[]` relation on `Facility`
  - [x] 1.2 Run `npx prisma migrate dev --name add_facility_photos` to apply the migration
  - [x] 1.3 Add `facilityMapThumbnailUrl` to the `Facility` select in `GET /:id` so it is returned in the API response (it already exists on the model but is not included in the select)

- [x] 2. Server — extend ImageUploadService for photos and PDF maps
  - [x] 2.1 Add `photoStorage` multer disk-storage config (destination: `uploads/facility-photos/:id/`, filename: `photo-<timestamp><ext>`) to `server/src/services/ImageUploadService.ts`
  - [x] 2.2 Add `photoFilter` that accepts only `image/jpeg` and `image/png` (reject others with HTTP 400 message "Only JPEG and PNG images are allowed")
  - [x] 2.3 Export `uploadPhoto` multer instance (uses `photoStorage` + `photoFilter`, 10 MB limit) from `ImageUploadService.ts`
  - [x] 2.4 Update `imageFilter` (used by `uploadMap`) to also accept `application/pdf`; update the 20 MB limit for map uploads; update error message to "Only JPEG, PNG, and PDF files are allowed"
  - [x] 2.5 Export `validatePhotoFile` helper (JPEG/PNG only, ≤ 10 MB) and update `validateImageFile` to cover PDF + 20 MB for maps

- [x] 3. Server — photos API endpoints
  - [x] 3.1 Add `POST /:id/photos` route in `server/src/routes/facilities.ts`: use `uploadPhoto.array('photos', 20)` middleware, validate each file, store each to disk, create `FacilityPhoto` records in DB, return array of `{ id, imageUrl }` with HTTP 201
  - [x] 3.2 Add `DELETE /:id/photos/:photoId` route: verify facility ownership via `x-user-id` header, delete file from disk, delete `FacilityPhoto` record, return HTTP 200
  - [x] 3.3 Update `GET /:id` facility query to `include: { photos: { orderBy: { displayOrder: 'asc' } } }` so the `photos` array is returned in the facility response
  - [x] 3.4 Update the facility `DELETE /:id` handler to also delete all `FacilityPhoto` files from disk and their DB records when a facility is deleted (satisfies Req 7.7)

- [x] 4. Client types and FacilityService
  - [x] 4.1 Add `FacilityPhoto` interface (`id`, `facilityId`, `imageUrl`, `displayOrder`, `createdAt`) to `src/types/index.ts`
  - [x] 4.2 Add `photos?: FacilityPhoto[]` and `facilityMapThumbnailUrl?: string` fields to the `Facility` interface in `src/types/index.ts`
  - [x] 4.3 Add `uploadFacilityPhoto(facilityId: string, image: { uri: string; name: string; type: string }, onProgress?: (p: number) => void): Promise<FacilityPhoto>` method to `FacilityService`
  - [x] 4.4 Add `deleteFacilityPhoto(facilityId: string, photoId: string): Promise<void>` method to `FacilityService`
  - [x] 4.5 Fix the existing `uploadFacilityImages` method — it currently points to the `/map` endpoint; rename it to `uploadFacilityMap` and keep it pointing to `POST /:id/map`; update `deleteFacilityImage` → `deleteFacilityMap` pointing to `DELETE /:id/map`

- [x] 5. FacilityDetailsScreen — photo strip (all users) + owner upload controls
  - [x] 5.1 Add local state `photos: FacilityPhoto[]` initialised from `facility.photos ?? []` in `FacilityDetailsScreen`
  - [x] 5.2 Render a `PhotoStrip` component (horizontal `ScrollView`, height ≥ 220 pt) at the top of the scroll content when `photos.length > 0`; each item uses `OptimizedImage` with a fallback placeholder; render above the hero image section (Req 2.1–2.4)
  - [x] 5.3 When `isOwner`, render an "Add photos" `TouchableOpacity` below the photo strip (or in its place when empty) that calls `expo-image-picker` `launchImageLibraryAsync` with `allowsMultipleSelection: true`, `mediaTypes: Images`, `quality: 0.9`
  - [x] 5.4 On image selection, call `facilityService.uploadFacilityPhoto` for each selected image; on success append to local `photos` state; on error show inline error text (Req 1.3, 1.6)
  - [x] 5.5 When `isOwner` and `photos.length > 0`, render a delete icon overlay on each photo in the strip; on press call `facilityService.deleteFacilityPhoto` and remove from local state on success (Req 1.7, 1.8)
  - [x] 5.6 When `isOwner`, render a `MapUploadControl` in the "Facility map" section: if no map exists show an "Upload map" button; if map exists show a "Replace map" button and a "Remove map" button
  - [x] 5.7 Map upload button calls `expo-document-picker` `getDocumentAsync` with `type: ['image/jpeg','image/png','application/pdf']`; on selection call `facilityService.uploadFacilityMap`; on success update local `facilityMapUrl` / `facilityMapThumbnailUrl` state (Req 3.2, 3.3, 3.6)
  - [x] 5.8 "Remove map" button calls `facilityService.deleteFacilityMap`; on success clear local map URL state so the View Map button disappears (Req 3.8, 3.9)
  - [x] 5.9 Display inline error messages (not Alert) for type/size validation failures on both photo and map uploads (Req 1.4, 1.5, 3.4, 3.5)

- [x] 6. EditFacilityScreen — photo and map upload sections
  - [x] 6.1 Load `facility.photos` when `loadFacilityData` runs; store in local `photos` state
  - [x] 6.2 Add a "Photos" section above the existing "Basic Information" section: render existing photos in a horizontal scroll with delete controls; render an "Add photos" button that opens the image picker (same logic as task 5.3–5.5 but applied immediately via API — Req 5.1, 5.3)
  - [x] 6.3 Add a "Facility map" section below the "Photos" section: show current map thumbnail if present; render "Upload map" / "Replace map" and "Remove map" controls (same logic as task 5.6–5.8 — Req 5.2, 5.4)
  - [x] 6.4 All photo/map changes in EditFacilityScreen apply immediately via API (do not wait for the main Save button); show inline error and preserve previous state on failure (Req 5.3, 5.4, 5.5)

- [x] 7. Create flow — Step1NameSports optional media fields
  - [x] 7.1 Add `pendingPhotos: Array<{ uri: string; name: string; type: string }>` and `pendingMapFile: { uri: string; name: string; type: string } | null` to `FacilityWizardState` in `src/screens/facilities/create-flow/types.ts`; initialise both to empty/null in `createInitialFacilityState`
  - [x] 7.2 Add `SET_PENDING_PHOTOS` and `SET_PENDING_MAP` action types to `FacilityWizardAction` and handle them in `facilityWizardReducer` in `CreateFacilityContext.tsx`
  - [x] 7.3 In `Step1NameSports.tsx`, add an optional "Photos" picker below the sport type grid: tapping it opens the image picker (multi-select); selected images are dispatched via `SET_PENDING_PHOTOS`; show selected image count as confirmation text (Req 6.1, 6.4)
  - [x] 7.4 In `Step1NameSports.tsx`, add an optional "Facility map" picker below the photos picker: tapping it opens the document picker (JPEG/PNG/PDF); selected file is dispatched via `SET_PENDING_MAP`; show selected filename as confirmation text (Req 6.2, 6.5)
  - [x] 7.5 Both pickers are optional — leaving them empty must not block progression to Step 2 (Req 6.3)

- [x] 8. CreateFacilityScreen — upload pending media after facility creation
  - [x] 8.1 After `facilityService.createFacility` succeeds in `CreateFacilityScreen`, iterate `state.pendingPhotos` and call `facilityService.uploadFacilityPhoto` for each (Req 6.6)
  - [x] 8.2 If `state.pendingMapFile` is set, call `facilityService.uploadFacilityMap` after photos are uploaded (Req 6.6)
  - [x] 8.3 If any upload fails, catch the error, show an `Alert` explaining that the facility was created but media upload failed and they can add it via the Edit screen, then proceed to `SUBMIT_SUCCESS` (Req 6.7)
