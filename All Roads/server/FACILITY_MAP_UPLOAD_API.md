# Facility Map Upload API

## Quick Reference

### Upload Map
```bash
POST /api/facilities/:id/map
Content-Type: multipart/form-data

# Body:
image: <file>
```

### Delete Map
```bash
DELETE /api/facilities/:id/map
```

## Implementation Files

- **Service**: `server/src/services/ImageUploadService.ts`
- **Route**: `server/src/routes/facilities.ts` (lines 528-650)
- **Storage**: `server/uploads/facility-maps/{facility-id}/`

## Features

✅ Image validation (format, size, dimensions)  
✅ Automatic optimization (max 4000x4000px, 85% quality)  
✅ Thumbnail generation (300x225px, 80% quality)  
✅ Old image cleanup on re-upload  
✅ Static file serving via `/uploads/` path  

## Validation

| Rule | Value |
|------|-------|
| Formats | JPEG, PNG, WebP |
| Max Size | 10MB |
| Min Dimensions | 800x600px |
| Max Dimensions | 4000x4000px |

## Response Format

```json
{
  "facilityMapUrl": "/uploads/facility-maps/{id}/map-{timestamp}-optimized.jpg",
  "facilityMapThumbnailUrl": "/uploads/facility-maps/{id}/map-{timestamp}-thumb.jpg",
  "message": "Facility map uploaded successfully"
}
```

## Error Codes

- `400`: Invalid file (format, size, dimensions)
- `404`: Facility not found
- `500`: Processing error

## Dependencies

- `multer`: File upload handling
- `sharp`: Image processing and optimization

## Testing

See `server/test-map-upload.md` for detailed testing instructions.

## Production Considerations

⚠️ **Important**: In production, replace local file storage with cloud storage (S3, CloudFront, etc.)

Current implementation stores files locally at:
```
server/uploads/facility-maps/{facility-id}/
```

For production:
1. Update `ImageUploadService.ts` to use S3 SDK
2. Configure CDN for image delivery
3. Add proper authorization middleware
4. Implement rate limiting
5. Add virus scanning for uploaded files
