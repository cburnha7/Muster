import express from 'express';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { prisma } from './lib/prisma';
import { requestLogger } from './middleware/requestLogger';

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
import availabilityRoutes from './routes/availability';
import scheduleRoutes from './routes/schedule';
import pushTokenRoutes from './routes/push-tokens';
import inviteRoutes from './routes/invites';
import { conversationsRouter, messagesRouter } from './routes/conversations';
import { registerLeagueLockMiddleware } from './middleware/league-lock';

dotenv.config();

/**
 * Validate critical Stripe Connect environment variables on startup.
 * Logs warnings for missing vars — does not crash the server.
 */
function validateStripeEnv(): void {
  const requiredVars = [
    { name: 'STRIPE_SECRET_KEY', hint: 'Required for all Stripe API calls' },
    {
      name: 'STRIPE_WEBHOOK_SECRET',
      hint: 'Required for webhook signature verification',
    },
    {
      name: 'PLATFORM_FEE_RATE',
      hint: 'Required for application fee calculation (e.g. 0.05 for 5%)',
    },
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
      console.warn(
        '⚠️  PLATFORM_FEE_RATE must be a number between 0 and 1 (e.g. 0.05 for 5%)'
      );
    }
  }

  if (missing.length > 0) {
    console.warn(
      `⚠️  ${missing.length} Stripe env var(s) not set — payment features will not work. See server/.env.example for details.`
    );
  } else {
    console.log('✅ Stripe environment variables configured');
  }

  // Test Stripe client initialization
  const { getStripe } = require('./services/stripe-connect');
  const stripeClient = getStripe();
  if (stripeClient) {
    console.log('✅ Stripe client initialized successfully');
  } else {
    console.warn(
      '⚠️  Stripe client failed to initialize — STRIPE_SECRET_KEY may be invalid'
    );
  }
}

validateStripeEnv();

const app = express();
registerLeagueLockMiddleware(prisma);
const PORT = process.env.PORT || 3000;

// Trust proxy when behind a reverse proxy (Railway, Heroku, etc.)
// Required for express-rate-limit to read X-Forwarded-For correctly
app.set('trust proxy', 1);

// CORS configuration
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://muster-ecru.vercel.app',
      'http://localhost:3000',
      'http://localhost:8081',
      'http://localhost:19006',
      'http://localhost:19000',
      ...(process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
        : []),
    ];

    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    // Allow any Vercel preview deployment for this project
    if (
      /^https:\/\/muster[a-z0-9-]*\.vercel\.app$/.test(origin) ||
      /^https:\/\/muster-[a-z0-9-]+-edwinburnham-1336s-projects\.vercel\.app$/.test(
        origin
      )
    ) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Active-User-Id',
    'X-Request-ID',
  ],
  exposedHeaders: ['X-Request-ID'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

// Handle preflight requests explicitly — must come BEFORE other middleware
app.options('*', cors(corsOptions));

// Apply CORS middleware
app.use(cors(corsOptions));

// Stripe webhooks need raw body for signature verification — must come before express.json()
app.use(
  '/api/stripe/webhooks',
  express.raw({ type: 'application/json' }),
  stripeWebhookRoutes
);

app.use(express.json({ limit: '1mb' }));

// Global rate limiter — 100 requests per minute per IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});
app.use('/api', globalLimiter);

// Stricter rate limiter for write endpoints
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});
// Apply to high-value write paths
app.use('/api/events', writeLimiter);
app.use('/api/bookings', writeLimiter);
app.use('/api/rentals', writeLimiter);

// Gzip compress all responses
app.use(compression());

// Structured request logging with correlation IDs
app.use(requestLogger);

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check — verifies database connectivity
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRawUnsafe('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database unreachable',
    });
  }
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
app.use('/api/availability', availabilityRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/push-tokens', pushTokenRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/conversations', conversationsRouter);
app.use('/api/messages', messagesRouter);

// Error handling
app.use(
  async (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error('Error:', err);

    // Log to app_logs table
    try {
      const userId = (req as any).user?.userId || null;
      await prisma.appLog.create({
        data: {
          logType: 'error',
          message: (err.message || 'Internal server error').substring(0, 2000),
          userId,
          screen: (req.headers['x-screen'] as string) || null,
          metadata: {
            method: req.method,
            url: req.originalUrl,
            status: err.status || 500,
            stack:
              process.env.NODE_ENV === 'development' ? err.stack : undefined,
          },
        },
      });
    } catch (logErr) {
      console.error('Failed to write error log:', logErr);
    }

    // Ensure CORS headers are present on error responses
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    res.status(err.status || 500).json({
      error: err.message || 'Internal server error',
    });
  }
);

// Global process error handlers — catch unhandled promise rejections and exceptions
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', error => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start server only when run directly (not when imported by tests)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Muster API server running on http://localhost:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);

    // Initialize cron jobs
    try {
      const { initializeCronJobs } = require('./jobs');
      initializeCronJobs();
      console.log('✅ Cron jobs initialized');
    } catch (cronErr) {
      console.error('⚠️ Failed to initialize cron jobs:', cronErr);
    }
  });
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export { app, prisma };
