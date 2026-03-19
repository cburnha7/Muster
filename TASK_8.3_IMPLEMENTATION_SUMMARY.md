# Task 8.3 Implementation Summary

## Task: Implement POST /api/facilities/:id/map endpoint

**Spec**: ground-management  
**Status**: ✅ Completed  
**Date**: March 11, 2026

---

## Overview

Implemented a backend API endpoint for uploading facility map images with automatic image processing, validation, and thumbnail generation.

---

## Implementation Details

### 1. Created ImageUploadService (`server/src/services/ImageUploadService.ts`)

A comprehensive service for handling image uploads with the following features:

#### Key Functions:
- **`uploadMap`**: Multer middleware configured for facility map uploads
- **`validateImageFile()`**: Validates image format, size, and type
- **`generateImageUrl()`**: Generates URL paths for uploaded images
- **`processMapImage()`**: Processes and optimizes images using Sharp
- **`deleteImageFiles()`**: Cleans up old image files

#### Image Processing Features:
- **Format Support**: JPEG, PNG, WebP
- **Size Validation**: Maximum 10MB file size
- **Dimension Validation**: Minimum 800x600px, maximum 4000x4000px
- **Optimization**: Resizes large images to max 4000x4000px at 85% quality
- **Thumbnail Generation**: Creates 300x225px thumbnails at 80% quality
- **Automatic Cleanup**: Deletes original files after processing

### 2. Updated Facilities Route (`server/src/routes/facilities.ts`)

Added two new endpoints:

#### POST /api/facilities/:id/map
- Accepts multipart/form-data with 'image' field
- Validates facility exists
- Processes and optimizes image
- Generates thumbnail
- Deletes old map if exists
- Updates facility record with new URLs
- Returns map and thumbnail URLs

#### DELETE /api/facilities/:id/map
- Validates facility exists
- Deletes map and thumbnail files
- Updates facility record to remove URLs
- Returns success message

### 3. Updated Server Configuration (`server/src/index.ts`)

- Added static file serving for `/uploads` directory
- Images are accessible via HTTP at `/uploads/facility-maps/{facility-id}/...`

### 4. Dependencies Installed

```bash
npm install sharp
npm install --save-dev @types/sharp
```

**Sharp** is a high-performance image processing library for Node.js.

---

## API Specification

### Upload Facility Map

**Endpoint**: `POST /api/facilities/:id/map`  
**Content-Type**: `multipart/form-data`

**Request Parameters**:
- `id` (path): Facility ID (UUID)
- `image` (form-data): Image file (JPEG, PNG, or WebP)

**Success Response (200 OK)**:
```json
{
  "facilityMapUrl": "/uploads/facility-maps/{facility-id}/map-{timestamp}-optimized.jpg",
  "facilityMapThumbnailUrl": "/uploads/facility-maps/{facility-id}/map-{timestamp}-thumb.jpg",
  "message": "Facility map uploaded successfully"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid file format, size, or dimensions
- `404 Not Found`: Facility not found
- `500 Internal Server Error`: Processing error

### Delete Facility Map

**Endpoint**: `DELETE /api/facilities/:id/map`

**Success Response (200 OK)**:
```json
{
  "message": "Facility map deleted successfully"
}
```

**Error Responses**:
- `404 Not Found`: Facility not found or no map to delete
- `500 Internal Server Error`: Deletion error

---

## Validation Rules

| Rule | Value |
|------|-------|
| Allowed Formats | JPEG, PNG, WebP |
| Maximum File Size | 10MB |
| Minimum Dimensions | 800x600px |
| Maximum Dimensions | 4000x4000px (auto-resized) |
| Thumbnail Size | 300x225px |
| Optimization Quality | 85% (main), 80% (thumbnail) |

---

## File Structure

```
server/
├── src/
│   ├── services/
│   │   └── ImageUploadService.ts       # NEW: Image upload service
│   ├── routes/
│   │   └── facilities.ts               # UPDATED: Added map endpoints
│   └── index.ts                        # UPDATED: Added static file serving
├── uploads/
│   └── facility-maps/                  # NEW: Storage directory
│       └── {facility-id}/
│           ├── map-{timestamp}-optimized.jpg
│           └── map-{timestamp}-thumb.jpg
└── test-map-upload.md                  # NEW: Testing guide
```

---

## Database Schema

The endpoint uses existing schema fields:

```prisma
model Facility {
  // ... other fields
  facilityMapUrl          String?  // URL to optimized map image
  facilityMapThumbnailUrl String?  // URL to thumbnail image
  // ... other fields
}
```

No database migrations were required.

---

## Testing

### Manual Testing Guide

See `server/test-map-upload.md` for detailed testing instructions.

**Quick Test**:
```bash
# 1. Get a facility ID
curl http://localhost:3000/api/facilities

# 2. Upload a map image
curl -X POST http://localhost:3000/api/facilities/{facility-id}/map \
  -F "image=@path/to/image.jpg"

# 3. Verify the upload
curl http://localhost:3000/api/facilities/{facility-id}
```

### Test Cases Covered

✅ Valid image upload (JPEG, PNG, WebP)  
✅ Invalid file format rejection  
✅ File size validation (10MB limit)  
✅ Dimension validation (min 800x600px)  
✅ Image optimization and resizing  
✅ Thumbnail generation  
✅ Old image cleanup on re-upload  
✅ Facility not found error  
✅ Map deletion  
✅ Static file serving  

---

## Security Considerations

1. **File Type Validation**: Only allows image formats (JPEG, PNG, WebP)
2. **Size Limits**: 10MB maximum to prevent abuse
3. **Dimension Validation**: Ensures images meet minimum quality standards
4. **Path Sanitization**: Uses facility ID to prevent directory traversal
5. **Error Handling**: Cleans up files on processing errors
6. **Authorization**: Should be added to verify facility ownership (future enhancement)

---

## Performance Considerations

1. **Image Optimization**: Reduces file size while maintaining quality
2. **Thumbnail Generation**: Provides fast-loading preview images
3. **Async Processing**: Uses Sharp's async API for non-blocking operations
4. **Cleanup**: Automatically removes old images to save storage

---

## Future Enhancements

1. **Authorization**: Add middleware to verify facility ownership
2. **Cloud Storage**: Integrate with S3/CloudFront for production
3. **Image Validation**: Add content-based validation (detect actual image data)
4. **Progress Tracking**: Add upload progress for large files
5. **Multiple Images**: Support uploading multiple facility images
6. **Image Cropping**: Allow users to crop/adjust images before saving
7. **CDN Integration**: Serve images through CDN for better performance

---

## Integration with Frontend

The frontend `MapImageUploader` component (Task 8.2) can now use this endpoint:

```typescript
// Example usage
const formData = new FormData();
formData.append('image', imageFile);

const response = await fetch(`/api/facilities/${facilityId}/map`, {
  method: 'POST',
  body: formData,
});

const data = await response.json();
// data.facilityMapUrl - URL to optimized image
// data.facilityMapThumbnailUrl - URL to thumbnail
```

---

## Related Tasks

- ✅ **Task 8.1**: Create FacilityMapEditorScreen.tsx
- ✅ **Task 8.2**: Create MapImageUploader component
- ✅ **Task 8.3**: Implement POST /api/facilities/:id/map endpoint (THIS TASK)
- ⏳ **Task 8.4**: Add image validation (size, format, dimensions)
- ⏳ **Task 8.5**: Display uploaded map in facility details

---

## Notes

- The server must be running for the endpoint to work
- Images are stored locally in development (should use cloud storage in production)
- The `facilityMapUrl` field already exists in the Prisma schema
- Sharp library is cross-platform and works on Windows, macOS, and Linux
- The endpoint automatically handles image format conversion to JPEG

---

## Verification

✅ Server starts without errors  
✅ Endpoint accepts multipart/form-data  
✅ Image validation works correctly  
✅ Image processing and optimization works  
✅ Thumbnail generation works  
✅ Database updates correctly  
✅ Old images are cleaned up  
✅ Static file serving works  
✅ Error handling is comprehensive  

---

## Conclusion

Task 8.3 has been successfully implemented. The POST /api/facilities/:id/map endpoint is fully functional with comprehensive validation, image processing, and error handling. The endpoint is ready for integration with the frontend MapImageUploader component.
