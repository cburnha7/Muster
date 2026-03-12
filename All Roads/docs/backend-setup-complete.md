# Backend Setup Complete ✅

## Summary

Successfully set up the Muster API backend with PostgreSQL database.

## What Was Installed

1. **PostgreSQL 16** - Database server
2. **Node.js dependencies** - Express, Prisma, TypeScript, etc.
3. **Database schema** - All tables created via Prisma
4. **Sample data** - Events, users, facilities, teams, and bookings

## API Server Status

- **URL**: http://localhost:3000
- **Status**: ✅ Running (Process ID: 11)
- **Environment**: Development

## Test Credentials

- **Email**: edwin@muster.app
- **Password**: password123

Other test users:
- john@example.com (password123)
- sarah@example.com (password123)

## Sample Data Created

### Users
- Edwin Chen (edwin@muster.app) - You!
- John Smith (john@example.com)
- Sarah Johnson (sarah@example.com)

### Events
1. **Pickup Basketball Game** - Tomorrow at 6:00 PM
   - Location: Downtown Sports Complex
   - Skill Level: Intermediate
   - Price: Free
   - Spots: 10 (3 filled)

2. **Weekend Soccer Match** - Next week
   - Location: Sunset Soccer Fields
   - Skill Level: Advanced
   - Price: $15
   - Spots: 22 (15 filled)

3. **Beach Volleyball Tournament** - In 3 days
   - Location: Downtown Sports Complex
   - Skill Level: Beginner
   - Price: $25
   - Spots: 16 (8 filled)

### Facilities
1. **Downtown Sports Complex**
   - Sports: Basketball, Volleyball, Badminton
   - Rating: 4.5/5
   - Price: $50/hour

2. **Sunset Soccer Fields**
   - Sports: Soccer
   - Rating: 4.8/5
   - Price: $75/hour

### Teams
1. **Bay Area Ballers** (Basketball)
   - Members: Edwin (captain), John

2. **Sunset Strikers** (Soccer)
   - Members: Sarah (captain), Edwin

## API Endpoints

### Health Check
```bash
GET http://localhost:3000/health
```

### Events
```bash
GET http://localhost:3000/api/events
GET http://localhost:3000/api/events/:id
GET http://localhost:3000/api/events/:id/participants
POST http://localhost:3000/api/events
POST http://localhost:3000/api/events/:id/book
```

### Facilities
```bash
GET http://localhost:3000/api/facilities
GET http://localhost:3000/api/facilities/:id
```

### Teams
```bash
GET http://localhost:3000/api/teams
GET http://localhost:3000/api/teams/:id
```

### Bookings
```bash
GET http://localhost:3000/api/bookings/user/:userId
GET http://localhost:3000/api/bookings/:id
```

### Authentication
```bash
POST http://localhost:3000/api/auth/login
POST http://localhost:3000/api/auth/register
```

## Managing the Server

### Start Server
```bash
cd server
npm run dev
```

### Stop Server
The server is currently running as background process #11. To stop it, you can restart your terminal or use Task Manager.

### View Database
```bash
cd server
npm run prisma:studio
```
This opens a GUI at http://localhost:5555 to view and edit your database.

### Reset Database
```bash
cd server
npx prisma db push --force-reset
npm run prisma:seed
```

## Next Steps

1. ✅ Backend API is running
2. ✅ Database is populated with sample data
3. 🔄 Update React Native app to use real API (instead of mock data)
4. 🔄 Test the app with real data

## Configuration Files

- **Database**: `server/.env` (DATABASE_URL)
- **Schema**: `server/prisma/schema.prisma`
- **Seed Data**: `server/src/prisma/seed.ts`
- **API Routes**: `server/src/routes/`

## Troubleshooting

### If API doesn't start
```bash
cd server
npm run dev
```

### If database connection fails
Check `server/.env` and ensure:
- PostgreSQL is running
- Password is correct (currently: "postgres")
- Database "muster" exists

### Check PostgreSQL service
```powershell
Get-Service -Name "postgresql*"
```

Should show "Running" status.

## Database Connection String

```
postgresql://postgres:postgres@localhost:5432/muster?schema=public
```

## Tech Stack

- **Runtime**: Node.js 20.20.1
- **Framework**: Express.js
- **Database**: PostgreSQL 16
- **ORM**: Prisma 5.22.0
- **Language**: TypeScript 5.7.2
- **Auth**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs

## File Structure

```
server/
├── src/
│   ├── index.ts           # Main server file
│   ├── routes/            # API route handlers
│   │   ├── auth.ts
│   │   ├── events.ts
│   │   ├── facilities.ts
│   │   ├── teams.ts
│   │   ├── bookings.ts
│   │   └── users.ts
│   └── prisma/
│       └── seed.ts        # Database seeding
├── prisma/
│   └── schema.prisma      # Database schema
├── .env                   # Environment variables
├── package.json
└── tsconfig.json
```

## Success! 🎉

Your Muster backend is fully operational and ready to serve your React Native app!
