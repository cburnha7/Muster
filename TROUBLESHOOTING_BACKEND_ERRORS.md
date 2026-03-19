# Troubleshooting Backend Errors

## Current Errors

### 1. "Unexpected token '<', "<!DOCTYPE "... is not valid JSON"
This error means the API is returning an HTML page instead of JSON data.

### 2. "Unexpected text node: . A text node cannot be a child of a <View>"
This is a React Native error - there's text directly in a View without a Text wrapper.

## Root Cause

The backend server is either:
1. **Not running** (most likely)
2. Returning HTML error pages
3. CORS issues preventing requests

## Solution Steps

### Step 1: Check if Backend Server is Running

Open a terminal and check if the server is running:

```bash
# Check if port 3000 is in use (Windows)
netstat -ano | findstr :3000

# Or try to access the health endpoint
curl http://localhost:3000/health
```

If you get "Connection refused" or no response, the server isn't running.

### Step 2: Start the Backend Server

```bash
cd server
npm run dev
```

You should see:
```
🚀 Muster API server running on http://localhost:3000
📊 Environment: development
```

### Step 3: Verify Database Connection

Make sure your database is running and the connection string is correct:

**File:** `server/.env`
```
DATABASE_URL="postgresql://user:password@localhost:5432/muster"
PORT=3000
NODE_ENV=development
```

### Step 4: Test API Endpoints

Once the server is running, test the endpoints:

```bash
# Test health endpoint
curl http://localhost:3000/health

# Test facilities endpoint
curl http://localhost:3000/api/facilities

# Test courts endpoint (replace {facilityId} with actual ID)
curl http://localhost:3000/api/facilities/{facilityId}/courts
```

### Step 5: Check Frontend Configuration

Verify the frontend is pointing to the correct API URL:

**File:** `.env` (in project root)
```
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

### Step 6: Restart Frontend

After starting the backend, restart the frontend:

```bash
# Stop the current dev server (Ctrl+C)
# Clear cache and restart
npm start -- --clear
```

## Common Issues and Fixes

### Issue: "Cannot find module" errors in backend

**Solution:**
```bash
cd server
npm install
```

### Issue: Database connection errors

**Solution:**
```bash
cd server
# Run migrations
npx prisma migrate dev
# Seed database
npm run seed:facilities
```

### Issue: Port 3000 already in use

**Solution:**
```bash
# Windows: Find and kill process on port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or change the port in server/.env
PORT=3001
```

Then update frontend `.env`:
```
EXPO_PUBLIC_API_URL=http://localhost:3001/api
```

### Issue: CORS errors

**Solution:** Check `server/src/index.ts` has correct CORS configuration:
```typescript
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:8081',
  credentials: true,
}));
```

## Verification Checklist

After following the steps above, verify:

- [ ] Backend server is running on http://localhost:3000
- [ ] Health endpoint returns: `{"status":"ok","timestamp":"..."}`
- [ ] Can access http://localhost:3000/api/facilities
- [ ] Can access http://localhost:3000/api/facilities/{id}/courts
- [ ] Frontend `.env` has correct `EXPO_PUBLIC_API_URL`
- [ ] Frontend dev server is running
- [ ] No CORS errors in browser console
- [ ] No "Unexpected token '<'" errors

## Testing the Courts Endpoint

Once the backend is running, test with a real facility ID from your database:

```bash
# Get list of facilities first
curl http://localhost:3000/api/facilities

# Copy a facility ID from the response, then:
curl http://localhost:3000/api/facilities/YOUR_FACILITY_ID/courts
```

Expected response:
```json
[
  {
    "id": "court-id",
    "facilityId": "facility-id",
    "name": "Court 1",
    "sportType": "basketball",
    "capacity": 10,
    "isIndoor": true,
    "isActive": true,
    "pricePerHour": 60,
    "displayOrder": 0,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

## Quick Start Script

Create a file `start-dev.sh` (or `start-dev.bat` for Windows):

```bash
#!/bin/bash

# Start backend
cd server
npm run dev &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

# Start frontend
cd ..
npm start

# Cleanup on exit
trap "kill $BACKEND_PID" EXIT
```

For Windows (`start-dev.bat`):
```batch
@echo off
start cmd /k "cd server && npm run dev"
timeout /t 5
npm start
```

## Still Having Issues?

If you're still seeing errors after following these steps:

1. **Check the backend console** for error messages
2. **Check the browser console** for detailed error messages
3. **Verify the facility ID** you're using exists in the database
4. **Check database** has courts for that facility:
   ```sql
   SELECT * FROM "FacilityCourt" WHERE "facilityId" = 'your-facility-id';
   ```

## Summary

The main issue is that the backend server needs to be running for the frontend to fetch data. Always ensure:

1. Backend server is running (`cd server && npm run dev`)
2. Database is accessible
3. Frontend `.env` points to correct API URL
4. Both servers are running simultaneously

Once both servers are running, the "Unexpected token '<'" error should disappear and courts should load properly.
