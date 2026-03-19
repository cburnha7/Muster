# Muster API Server

Backend API for the Muster sports booking application.

## Tech Stack

- Node.js + Express
- PostgreSQL
- Prisma ORM
- TypeScript
- JWT Authentication

## Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- npm or yarn

## Setup

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Setup PostgreSQL Database

Install PostgreSQL if you haven't already:

**Windows:**
- Download from https://www.postgresql.org/download/windows/
- Or use Chocolatey: `choco install postgresql`

**Mac:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Linux:**
```bash
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 3. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE muster;

# Exit psql
\q
```

### 4. Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env and update DATABASE_URL with your PostgreSQL credentials
# DATABASE_URL="postgresql://postgres:your_password@localhost:5432/muster?schema=public"
```

### 5. Run Migrations

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 6. Seed Database

```bash
npm run prisma:seed
```

This will create:
- 3 test users (edwin@muster.app, john@example.com, sarah@example.com)
- 2 facilities
- 3 events
- 2 teams
- Sample bookings

All test users have password: `password123`

## Development

Start the development server:

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Events
- `GET /api/events` - List all events
- `GET /api/events/:id` - Get event details
- `GET /api/events/:id/participants` - Get event participants
- `POST /api/events` - Create event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event
- `POST /api/events/:id/book` - Book event
- `DELETE /api/events/:id/book/:bookingId` - Cancel booking

### Facilities
- `GET /api/facilities` - List all facilities
- `GET /api/facilities/:id` - Get facility details
- `POST /api/facilities` - Create facility

### Teams
- `GET /api/teams` - List all teams
- `GET /api/teams/:id` - Get team details
- `POST /api/teams` - Create team

### Bookings
- `GET /api/bookings/user/:userId` - Get user bookings
- `GET /api/bookings/:id` - Get booking details

### Users
- `GET /api/users/:id` - Get user profile
- `PUT /api/users/:id` - Update user profile

## Database Management

### Prisma Studio
View and edit your database with a GUI:

```bash
npm run prisma:studio
```

### Create Migration
After changing the schema:

```bash
npm run prisma:migrate
```

### Reset Database
To reset and reseed:

```bash
npx prisma migrate reset
npm run prisma:seed
```

## Production Build

```bash
npm run build
npm start
```

## Testing the API

You can test the API using:

1. **cURL**
```bash
# Health check
curl http://localhost:3000/health

# Get events
curl http://localhost:3000/api/events

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"edwin@muster.app","password":"password123"}'
```

2. **Postman** - Import the endpoints and test

3. **Your React Native app** - Update the API URL in `src/services/api/config.ts`

## Troubleshooting

### PostgreSQL Connection Issues

1. Check if PostgreSQL is running:
```bash
# Windows
pg_ctl status

# Mac/Linux
brew services list  # Mac
sudo systemctl status postgresql  # Linux
```

2. Verify connection string in `.env`

3. Check PostgreSQL logs for errors

### Port Already in Use

If port 3000 is already in use, change it in `.env`:
```
PORT=3001
```

### Migration Errors

If you get migration errors, try:
```bash
npx prisma migrate reset
npx prisma generate
npm run prisma:seed
```

## Next Steps

1. Add authentication middleware to protect routes
2. Add input validation with Zod
3. Add rate limiting
4. Add file upload for images
5. Add email notifications
6. Add payment processing
7. Add real-time features with WebSockets
