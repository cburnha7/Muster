import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';

// Routes
import authRoutes from './routes/auth';
import eventRoutes from './routes/events';
import facilityRoutes from './routes/facilities';
import teamRoutes from './routes/teams';
import bookingRoutes from './routes/bookings';
import userRoutes from './routes/users';
import adminRoutes from './routes/admin';
import courtRoutes from './routes/courts';
import rentalRoutes from './routes/rentals';
import eligibleLocationsRoutes from './routes/eligible-locations';
import leagueRoutes from './routes/leagues';
import matchRoutes from './routes/matches';
import seasonRoutes from './routes/seasons';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://muster-ecru.vercel.app',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id', 'x-user-id', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID'],
}));
app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/facilities', facilityRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', courtRoutes);
app.use('/api', rentalRoutes);
app.use('/api', eligibleLocationsRoutes);
app.use('/api/leagues', leagueRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/seasons', seasonRoutes);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Muster API server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Initialize cron jobs (requires: npm install node-cron @types/node-cron)
  // Uncomment the following lines after installing node-cron:
  // import { initializeCronJobs } from './jobs';
  // initializeCronJobs();
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export { prisma };
