# Requirements Document

## Introduction

This feature adds Facility Photo and Facility Map upload capabilities to the Muster grounds management flows. Facility owners can upload one or more photos of their ground (displayed as a horizontally scrollable photo strip at the top of the Grounds detail screen) and a single facility map image (displayed via a "View Map" button that opens a full-screen view). Both uploads are available during ground creation (Screen 1 of the create flow, optional) and in the edit flow (replaceable at any time). All users viewing a ground can see the photos and access the map; only the facility owner can upload or replace them.

The backend already has a `facilityMapUrl` field on the Facility model and a `POST /:id/map` upload endpoint. The `imageUrl` field currently stores a single hero image. This feature extends photo support to multiple images and surfaces both upload controls in the owner-facing UI.

## Glossary

- **Facility_Owner**: The authenticated user whose `id` matches the `ownerId` field of a Facility record.
- **Grounds_Detail_Screen**: The `FacilityDetailsScreen` component that displays full information about a ground to all users.
- **Create_Flow**: The multi-step wizard in `CreateFacilityScreen` used to create a new ground; Screen 1 is `Step1NameSports`.
- **Edit_Flow**: The `EditFacilityScreen` used by the Facility_Owner to modify an existing ground.
- **Photo_Strip**: A horizontally scrollable row of facility photos displayed at the top of the Grounds_Detail_Screen.
- **Facility_Photo**: One image file (JPEG or PNG) uploaded by the Facility_Owner to represent the physical appearance of the ground.
- **Facility_Map**: A single image file (JPEG, PNG) or PDF uploaded by the Facility_Owner representing the layout of the ground (courts, fields, parking, etc.).
- **Photo_Upload_Control**: The UI element that allows the Facility_Owner to select and upload one or more Facility_Photos.
- **Map_Upload_Control**: The UI element that allows the Facility_Owner to select and upload a single Facility_Map file.
- **View_Map_Button**: A tappable button on the Grounds_Detail_Screen that opens the Facility_Map in a full-screen view.
- **Full_Screen_Map_Viewer**: The modal or full-screen component that renders the Facility_Map at maximum size with pinch-to-zoom support.
- **Image_Upload_Service**: The server-side service (`ImageUploadService`) responsible for receiving, validating, processing, and storing uploaded files.
- **FacilityService**: The client-side API service (`src/services/api/FacilityService.ts`) that communicates with the facilities REST API.

---

## Requirements

### Requirement 1: Facility Photo Upload — Owner Controls

**User Story:** As a Facility_Owner, I want to upload one or more photos of my ground, so that visitors can see what the facility looks like before booking.

#### Acceptance Criteria

1. WHEN the Facility_Owner views the Grounds_Detail_Screen for a ground they own, THE Grounds_Detail_Screen SHALL display a Photo_Upload_Control that allows the owner to add Facility_Photos.
2. WHEN the Facility_Owner activates the Photo_Upload_Control, THE Photo_Upload_Control SHALL open the device image library allowing selection of one or more images.
3. WHEN the Facility_Owner selects one or more images, THE FacilityService SHALL upload each selected image to the server via a dedicated photos endpoint.
4. IF an uploaded file is not a JPEG or PNG, THEN THE Photo_Upload_Control SHALL display an error message stating the accepted file types.
5. IF an uploaded image exceeds 10 MB, THEN THE Photo_Upload_Control SHALL display an error message stating the maximum file size.
6. WHEN a Facility_Photo upload succeeds, THE Grounds_Detail_Screen SHALL add the new photo to the Photo_Strip without requiring a full page reload.
7. WHEN the Facility_Owner views the Grounds_Detail_Screen for a ground they own and at least one Facility_Photo exists, THE Grounds_Detail_Screen SHALL display a delete control alongside each photo in the Photo_Strip.
8. WHEN the Facility_Owner activates the delete control for a Facility_Photo, THE FacilityService SHALL send a delete request to the server and THE Grounds_Detail_Screen SHALL remove that photo from the Photo_Strip upon success.

---

### Requirement 2: Facility Photo Display — All Users

**User Story:** As a user viewing a ground, I want to see photos of the facility, so that I can assess the venue before booking.

#### Acceptance Criteria

1. WHEN a user opens the Grounds_Detail_Screen for a ground that has at least one Facility_Photo, THE Grounds_Detail_Screen SHALL display the Photo_Strip at the top of the screen above all other content.
2. WHILE the Photo_Strip is visible, THE Photo_Strip SHALL be horizontally scrollable and display each Facility_Photo at a consistent height of no less than 220 points.
3. WHEN a ground has no Facility_Photos, THE Grounds_Detail_Screen SHALL not render the Photo_Strip.
4. THE Photo_Strip SHALL display photos using the existing `OptimizedImage` component with a fallback placeholder when an individual image fails to load.

---

### Requirement 3: Facility Map Upload — Owner Controls

**User Story:** As a Facility_Owner, I want to upload a map of my ground's layout, so that visitors can understand the court arrangement, parking, and access points.

#### Acceptance Criteria

1. WHEN the Facility_Owner views the Grounds_Detail_Screen for a ground they own, THE Grounds_Detail_Screen SHALL display a Map_Upload_Control that allows the owner to upload a Facility_Map.
2. WHEN the Facility_Owner activates the Map_Upload_Control, THE Map_Upload_Control SHALL open the device file picker allowing selection of a single JPEG, PNG, or PDF file.
3. WHEN the Facility_Owner selects a file, THE FacilityService SHALL upload the file to the existing `POST /:id/map` endpoint.
4. IF an uploaded file is not a JPEG, PNG, or PDF, THEN THE Map_Upload_Control SHALL display an error message stating the accepted file types.
5. IF an uploaded file exceeds 20 MB, THEN THE Map_Upload_Control SHALL display an error message stating the maximum file size.
6. WHEN a Facility_Map upload succeeds, THE Grounds_Detail_Screen SHALL display the updated Facility_Map thumbnail and the View_Map_Button without requiring a full page reload.
7. WHEN a Facility_Map already exists and the Facility_Owner uploads a new file, THE Image_Upload_Service SHALL replace the existing Facility_Map and THE Grounds_Detail_Screen SHALL reflect the updated map.
8. WHEN the Facility_Owner views the Grounds_Detail_Screen for a ground they own and a Facility_Map exists, THE Grounds_Detail_Screen SHALL display a remove control for the Facility_Map.
9. WHEN the Facility_Owner activates the remove control for the Facility_Map, THE FacilityService SHALL send a delete request to the `DELETE /:id/map` endpoint and THE Grounds_Detail_Screen SHALL hide the View_Map_Button upon success.

---

### Requirement 4: Facility Map Display — All Users

**User Story:** As a user viewing a ground, I want to view the facility map, so that I can navigate the venue when I arrive.

#### Acceptance Criteria

1. WHEN a user opens the Grounds_Detail_Screen for a ground that has a Facility_Map, THE Grounds_Detail_Screen SHALL display the View_Map_Button in the facility map section.
2. WHEN a user taps the View_Map_Button, THE Full_Screen_Map_Viewer SHALL open and display the Facility_Map at maximum available screen width.
3. WHILE the Full_Screen_Map_Viewer is open, THE Full_Screen_Map_Viewer SHALL support pinch-to-zoom with a maximum zoom scale of 3x.
4. WHILE the Full_Screen_Map_Viewer is open, THE Full_Screen_Map_Viewer SHALL display a close control that dismisses the viewer.
5. WHEN a ground has no Facility_Map, THE Grounds_Detail_Screen SHALL not display the View_Map_Button.
6. IF the Facility_Map image fails to load in the Full_Screen_Map_Viewer, THEN THE Full_Screen_Map_Viewer SHALL display a fallback message indicating the map is unavailable.

---

### Requirement 5: Photo and Map Upload in the Edit Flow

**User Story:** As a Facility_Owner, I want to update or replace my facility photos and map from the edit screen, so that I can keep the ground's media current.

#### Acceptance Criteria

1. WHEN the Facility_Owner opens the Edit_Flow for a ground, THE Edit_Flow SHALL display the Photo_Upload_Control showing any existing Facility_Photos.
2. WHEN the Facility_Owner opens the Edit_Flow for a ground, THE Edit_Flow SHALL display the Map_Upload_Control showing the current Facility_Map thumbnail if one exists.
3. WHEN the Facility_Owner adds, removes, or replaces Facility_Photos in the Edit_Flow, THE FacilityService SHALL apply each change immediately via the corresponding API endpoint without waiting for the main save action.
4. WHEN the Facility_Owner uploads or removes the Facility_Map in the Edit_Flow, THE FacilityService SHALL apply the change immediately via the corresponding API endpoint without waiting for the main save action.
5. IF a photo or map upload fails in the Edit_Flow, THEN THE Edit_Flow SHALL display an inline error message and preserve the previously saved media state.

---

### Requirement 6: Photo and Map Upload in the Create Flow

**User Story:** As a Facility_Owner, I want to optionally add facility photos and a map during ground creation, so that the ground is fully presented from the moment it goes live.

#### Acceptance Criteria

1. THE Create_Flow Screen 1 SHALL display an optional Photo_Upload_Control below the sport type selector.
2. THE Create_Flow Screen 1 SHALL display an optional Map_Upload_Control below the Photo_Upload_Control.
3. WHEN the Facility_Owner leaves the Photo_Upload_Control and Map_Upload_Control empty on Screen 1, THE Create_Flow SHALL allow progression to Screen 2 without displaying a validation error.
4. WHEN the Facility_Owner selects Facility_Photos on Screen 1, THE Create_Flow SHALL store the selected image references in the create flow state for upload after the facility record is created.
5. WHEN the Facility_Owner selects a Facility_Map on Screen 1, THE Create_Flow SHALL store the selected file reference in the create flow state for upload after the facility record is created.
6. WHEN the Create_Flow successfully creates the facility record, THE Create_Flow SHALL upload any pending Facility_Photos and Facility_Map before navigating to the success screen.
7. IF a photo or map upload fails after facility creation, THEN THE Create_Flow SHALL display an error message and navigate to the success screen so the owner can add media via the Edit_Flow.

---

### Requirement 7: Server-Side Photo Storage and Retrieval

**User Story:** As a Facility_Owner, I want my uploaded photos to be stored reliably and served efficiently, so that all users see accurate and fast-loading images.

#### Acceptance Criteria

1. THE Image_Upload_Service SHALL accept multipart/form-data POST requests containing one or more image files for the photos endpoint.
2. WHEN a Facility_Photo is uploaded, THE Image_Upload_Service SHALL validate the file type and reject files that are not JPEG or PNG with an HTTP 400 response.
3. WHEN a Facility_Photo is uploaded, THE Image_Upload_Service SHALL validate the file size and reject files exceeding 10 MB with an HTTP 400 response.
4. WHEN a valid Facility_Photo is uploaded, THE Image_Upload_Service SHALL store the file and return a publicly accessible URL.
5. THE facilities API SHALL expose a `GET /:id` response that includes an array of Facility_Photo URLs under a `photos` field.
6. WHEN a Facility_Photo is deleted via the API, THE Image_Upload_Service SHALL remove the file from storage and THE facilities API SHALL return an HTTP 200 response.
7. WHEN a facility is deleted, THE Image_Upload_Service SHALL delete all associated Facility_Photos and the Facility_Map from storage.
