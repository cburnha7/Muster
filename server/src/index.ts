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
import debriefRoutes from './routes/debrief';
import searchRoutes from './routes/search';
import logRoutes from './routes/logs';
import subscriptionRoutes from './routes/subscriptions';
import stripeWebhookRoutes from './routes/stripe-webhooks';
import connectOnboardingRoutes from './routes/connect-onboarding';
import stripeConnectUserRoutes from './routes/stripe-connect-user';
import gameChallengeRoutes from './routes/game-challenges';
import publicEventRoutes from './routes/public-events';
import playerDuesRoutes from './routes/player-dues';
import leagueDuesRoutes from './routes/league-dues';
import dependentRoutes from './routes/dependents';
import promoCodeRoutes from './routes/promo-codes';
import cancelRequestRoutes from './routes/cancel-requests';
import insuranceDocumentRoutes from './routes/insurance-documents';
import reservationApprovalRoutes from './routes/reservation-approvals';
import escrowTransactionRoutes from './routes/escrow-transactions';
import waiverRoutes from './routes/waivers';
import { registerLeagueLockMiddleware } from './middleware/league-lock';

dotenv.config();

/**
 * Validate critical Stripe Connect environment variables on startup.
 * Logs warnings for missing vars — does not crash the server.
 */
function validateStripeEnv(): void {
  const requiredVars = [
    { name: 'STRIPE_SECRET_KEY', hint: 'Required for all Stripe API calls' },
    { name: 'STRIPE_WEBHOOK_SECRET', hint: 'Required for webhook signature verification' },
    { name: 'PLATFORM_FEE_RATE', hint: 'Required for application fee calculation (e.g. 0.05 for 5%)' },
  ];

  const missing: string[] = [];

  for (const { name, hint } of requiredVars) {
    if (!process.env[name]) {
      missing.push(name);
      console.warn(`⚠️  Missing env var: ${name} — ${hint}`);
    }
  }

  if (process.env.PLATFORM_FEE_RATE) {
    const rate = parseFloat(process.env.PLATFORM_FEE_RATE);
    if (isNaN(rate) || rate < 0 || rate > 1) {
      console.warn('⚠️  PLATFORM_FEE_RATE must be a number between 0 and 1 (e.g. 0.05 for 5%)');
    }
  }

  if (missing.length > 0) {
    console.warn(`⚠️  ${missing.length} Stripe env var(s) not set — payment features will not work. See server/.env.example for details.`);
  } else {
    console.log('✅ Stripe environment variables configured');
  }
}

validateStripeEnv();

const app = express();
const prisma = new PrismaClient();
registerLeagueLockMiddleware(prisma);
const PORT = process.env.PORT || 3000;

// Trust proxy when behind a reverse proxy (Railway, Heroku, etc.)
// Required for express-rate-limit to read X-Forwarded-For correctly
app.set('trust proxy', 1);

// CORS configuration
const corsOptions: cors.CorsOptions = {
  origin: [
    'https://muster-ecru.vercel.app',
    'http://localhost:3000',
    'http://localhost:19006',
    ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()) : [])
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id', 'x-user-id', 'X-Active-User-Id', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Handle preflight requests explicitly — must come BEFORE other middleware
app.options('*', cors(corsOptions));

// Apply CORS middleware
app.use(cors(corsOptions));

// Stripe webhooks need raw body for signature verification — must come before express.json()
app.use('/api/stripe/webhooks', express.raw({ type: 'application/json' }), stripeWebhookRoutes);

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
app.use('/api/debrief', debriefRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/connect', connectOnboardingRoutes);
app.use('/api/stripe/connect', stripeConnectUserRoutes);
app.use('/api/game-challenges', gameChallengeRoutes);
app.use('/api/public-events', publicEventRoutes);
app.use('/api/player-dues', playerDuesRoutes);
app.use('/api/league-dues', leagueDuesRoutes);
app.use('/api/dependents', dependentRoutes);
app.use('/api/promo-codes', promoCodeRoutes);
app.use('/api/cancel-requests', cancelRequestRoutes);
app.use('/api/insurance-documents', insuranceDocumentRoutes);
app.use('/api/reservation-approvals', reservationApprovalRoutes);
app.use('/api/escrow-transactions', escrowTransactionRoutes);
app.use('/api/waivers', waiverRoutes);

// Error handling
app.use(async (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);

  // Log to app_logs table
  try {
    const userId = (req as any).user?.userId || req.headers['x-user-id'] as string || null;
    await prisma.appLog.create({
      data: {
        logType: 'error',
        message: (err.message || 'Internal server error').substring(0, 2000),
        userId,
        screen: req.headers['x-screen'] as string || null,
        metadata: {
          method: req.method,
          url: req.originalUrl,
          status: err.status || 500,
          stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        },
      },
    });
  } catch (logErr) {
    console.error('Failed to write error log:', logErr);
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Global process error handlers — catch unhandled promise rejections and exceptions
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start server only when run directly (not when imported by tests)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Muster API server running on http://localhost:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);

    // Initialize cron jobs (requires: npm install node-cron @types/node-cron)
    // Uncomment the following lines after installing node-cron:
    // import { initializeCronJobs } from './jobs';
    // initializeCronJobs();
  });
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export { app, prisma };
