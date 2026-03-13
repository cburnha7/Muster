# Muster Deployment Guide

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Expo account (for mobile builds)
- Apple Developer account (for iOS)
- Google Play Developer account (for Android)

## Environment Setup

### Frontend (.env)

```bash
# Production API URL
EXPO_PUBLIC_API_URL=https://api.yourdomain.com/api
EXPO_PUBLIC_ENVIRONMENT=production

# Disable mock authentication in production
EXPO_PUBLIC_USE_MOCK_AUTH=false

# Google OAuth credentials
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id
```

### Backend (server/.env)

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/muster_production

# Server
PORT=3000
NODE_ENV=production

# JWT Secret (generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# SMTP Configuration (for emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# CORS (your frontend domains)
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
```

## Database Setup

1. Create production database:
```bash
createdb muster_production
```

2. Run migrations:
```bash
cd server
npx prisma migrate deploy
```

3. (Optional) Seed with initial data:
```bash
npm run seed
```

## Backend Deployment

### Option 1: Traditional Server (VPS, EC2, etc.)

1. Install dependencies:
```bash
cd server
npm install --production
```

2. Build TypeScript:
```bash
npm run build
```

3. Start with PM2:
```bash
npm install -g pm2
pm2 start dist/index.js --name muster-api
pm2 save
pm2 startup
```

### Option 2: Docker

```bash
cd server
docker build -t muster-api .
docker run -p 3000:3000 --env-file .env muster-api
```

### Option 3: Platform as a Service (Heroku, Railway, Render)

1. Connect your repository
2. Set environment variables in platform dashboard
3. Deploy automatically on push to main branch

## Frontend Deployment

### Web Deployment

1. Build for web:
```bash
npm run build:web
```

2. Deploy to hosting service:
   - **Netlify**: Drag and drop `web-build` folder
   - **Vercel**: Connect repository and deploy
   - **AWS S3 + CloudFront**: Upload to S3 bucket

### iOS Deployment

1. Install EAS CLI:
```bash
npm install -g eas-cli
```

2. Configure EAS:
```bash
eas build:configure
```

3. Build for iOS:
```bash
eas build --platform ios
```

4. Submit to App Store:
```bash
eas submit --platform ios
```

### Android Deployment

1. Build for Android:
```bash
eas build --platform android
```

2. Submit to Google Play:
```bash
eas submit --platform android
```

## Post-Deployment Checklist

- [ ] Verify all environment variables are set correctly
- [ ] Test authentication flow (login, registration, logout)
- [ ] Test SSO (Apple, Google) if configured
- [ ] Verify email sending works
- [ ] Test on multiple devices/browsers
- [ ] Set up monitoring and error tracking
- [ ] Configure database backups
- [ ] Set up SSL/TLS certificates
- [ ] Configure CDN for static assets
- [ ] Test rate limiting
- [ ] Review security headers
- [ ] Set up logging and monitoring

## Monitoring & Maintenance

### Recommended Services

- **Error Tracking**: Sentry
- **Performance Monitoring**: New Relic, Datadog
- **Uptime Monitoring**: UptimeRobot, Pingdom
- **Log Management**: Papertrail, Loggly

### Database Backups

Set up automated daily backups:
```bash
# Example cron job for PostgreSQL backup
0 2 * * * pg_dump muster_production > /backups/muster_$(date +\%Y\%m\%d).sql
```

## Rollback Procedure

If deployment fails:

1. Backend:
```bash
pm2 restart muster-api --update-env
# or revert to previous Docker image
```

2. Frontend:
   - Revert to previous build in hosting platform
   - Or rebuild from previous git commit

## Support

For deployment issues, check:
- Server logs: `pm2 logs muster-api`
- Database connectivity
- Environment variables
- Network/firewall settings
