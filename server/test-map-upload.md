# Testing the Facility Map Upload Endpoint

## Endpoint
`POST /api/facilities/:id/map`

## Test Steps

### 1. Using cURL (Command Line)

```bash
# Replace {facility-id} with an actual facility ID from your database
curl -X POST http://localhost:3000/api/facilities/{facility-id}/map \
  -F "image=@/path/to/your/image.jpg" \
  -H "Content-Type: multipart/form-data"
```

### 2. Using Postman

1. Create a new POST request to `http://localhost:3000/api/facilities/{facility-id}/map`
2. Go to the "Body" tab
3. Select "form-data"
4. Add a key named "image" and set type to "File"
5. Choose an image file (JPEG, PNG, or WebP)
6. Send the request

### 3. Expected Response

**Success (200 OK):**
```json
{
  "facilityMapUrl": "/uploads/facility-maps/{facility-id}/map-{timestamp}-optimized.jpg",
  "facilityMapThumbnailUrl": "/uploads/facility-maps/{facility-id}/map-{timestamp}-thumb.jpg",
  "message": "Facility map uploaded successfully"
}
```

**Error (400 Bad Request):**
```json
{
  "error": "No image file provided"
}
```
or
```json
{
  "error": "File must be JPEG, PNG, or WebP"
}
```
or
```json
{
  "error": "File size must not exceed 10MB"
}
```
or
```json
{
  "error": "Image dimensions must be at least 800x600px"
}
```

**Error (404 Not Found):**
```json
{
  "error": "Facility not found"
}
```

## Validation Rules

- **Allowed formats**: JPEG, PNG, WebP
- **Maximum file size**: 10MB
- **Minimum dimensions**: 800x600px
- **Maximum dimensions**: 4000x4000px (images larger than this will be resized)

## Image Processing

The endpoint automatically:
1. Validates the image file
2. Checks minimum dimensions (800x600px)
3. Creates an optimized version (max 4000x4000px, 85% quality)
4. Creates a thumbnail (300x225px, 80% quality)
5. Deletes the original uploaded file
6. Updates the facility record with the new URLs

## Testing with a Real Facility

1. First, get a facility ID:
```bash
curl http://localhost:3000/api/facilities
```

2. Use the ID from the response to upload a map:
```bash
curl -X POST http://localhost:3000/api/facilities/{facility-id}/map \
  -F "image=@test-image.jpg"
```

3. Verify the upload by fetching the facility:
```bash
curl http://localhost:3000/api/facilities/{facility-id}
```

The response should include `facilityMapUrl` and `facilityMapThumbnailUrl` fields.

## Deleting a Facility Map

To delete an uploaded map:

```bash
curl -X DELETE http://localhost:3000/api/facilities/{facility-id}/map
```

**Success Response (200 OK):**
```json
{
  "message": "Facility map deleted successfully"
}
```

## Notes

- Uploading a new map will automatically delete the old one
- The images are stored in `server/uploads/facility-maps/{facility-id}/`
- Images are served as static files from `/uploads/` path
- In production, these should be stored in cloud storage (S3, CloudFront, etc.)
