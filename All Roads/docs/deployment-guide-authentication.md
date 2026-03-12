# Authentication System - Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the Muster authentication system to production. Follow these steps carefully to ensure a secure and reliable deployment.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Database Setup](#database-setup)
3. [Environment Configuration](#environment-configuration)
4. [Backend Deployment](#backend-deployment)
5. [Frontend Deployment](#frontend-deployment)
6. [SSO Provider Setup](#sso-provider-setup)
7. [Email Service Setup](#email-service-setup)
8. [Monitoring and Logging](#monitoring-and-logging)
9. [Post-Deployment Verification](#post-deployment-verification)
10. [Rollback Procedures](#rollback-procedures)

---

## Pre-Deployment Checklist

Before deploying, ensure you have completed:

- [ ] All tests pass (unit, integration, property-based)
- [ ] Security review completed
- [ ] Environment variables configured
- [ ] Database migrations tested
- [ ] HTTPS certificates obtained
- [ ] Email service configured
- [ ] SSO providers configured (Apple, Google)
- [ ] Rate limiting configured
- [ ] Monitoring and logging set up
- [ ] Backup procedures in place
- [ ] Rollback plan documented

---

## Database Setup

### 1. Create Production Database

**PostgreSQL on AWS RDS (Recommended)**:

```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier muster-prod-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 14.7 \
  --master-username musteradmin \
  --master-user-password <SECURE_PASSWORD> \
  --allocated-storage 20 \
  --vpc-security-group-ids sg-xxxxxxxx \
  --db-subnet-group-name muster-db-subnet \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00" \
  --preferred-maintenance-window "mon:04:00-mon:05:00" \
  --storage-encrypted \
  --publicly-accessible false
```

**Alternative: Heroku Postgres**:

```bash
heroku addons:create heroku-postgresql:standard-0 --app muster-prod
```

### 2. Configure Database Connection

Get your database connection string:

```bash
# AWS RDS
DATABASE_URL=postgresql://musteradmin:<PASSWORD>@muster-prod-db.xxxxxx.us-east-1.rds.amazonaws.com:5432/muster

# Heroku
heroku config:get DATABASE_URL --app muster-prod
```

### 3. Run Database Migrations

```bash
cd server

# Set production database URL
export DATABASE_URL="postgresql://..."

# Run migrations
npx prisma migrate deploy

# Verify migrations
npx prisma migrate status
```

### 4. Create Database Indexes

Ensure these indexes exist for performance:

```sql
-- User table indexes
CREATE INDEX IF NOT EXISTS idx_user_email ON "User"(email);
CREATE INDEX IF NOT EXISTS idx_user_username ON "User"(username);

-- RefreshToken table indexes
CREATE INDEX IF NOT EXISTS idx_refresh_token_user_id ON "RefreshToken"("userId");
CREATE INDEX IF NOT EXISTS idx_refresh_token_token ON "RefreshToken"(token);
CREATE INDEX IF NOT EXISTS idx_refresh_token_expires_at ON "RefreshToken"("expiresAt");

-- PasswordResetToken table indexes
CREATE INDEX IF NOT EXISTS idx_password_reset_user_id ON "PasswordResetToken"("userId");
CREATE INDEX IF NOT EXISTS idx_password_reset_token ON "PasswordResetToken"(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_expires_at ON "PasswordResetToken"("expiresAt");
```

---

## Environment Configuration

### Backend Environment Variables

Create `server/.env.production`:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Server
PORT=3000
NODE_ENV=production

# JWT Secret (MUST be cryptographically secure, min 32 characters)
JWT_SECRET=<GENERATE_SECURE_RANDOM_STRING>

# SMTP Configuration
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=<SENDGRID_API_KEY>
SMTP_FROM_EMAIL=noreply@muster.app
SMTP_FROM_NAME=Muster

# App URLs
APP_URL=https://muster.app
API_URL=https://api.muster.app

# SSO Configuration
APPLE_CLIENT_ID=com.muster.app
APPLE_TEAM_ID=<YOUR_APPLE_TEAM_ID>
APPLE_KEY_ID=<YOUR_APPLE_KEY_ID>
APPLE_PRIVATE_KEY=<YOUR_APPLE_PRIVATE_KEY>

GOOGLE_CLIENT_ID=<YOUR_GOOGLE_CLIENT_ID>
GOOGLE_CLIENT_SECRET=<YOUR_GOOGLE_CLIENT_SECRET>

# Rate Limiting (Optional - Redis for production)
REDIS_URL=redis://:<PASSWORD>@<HOST>:6379

# Monitoring
SENTRY_DSN=<YOUR_SENTRY_DSN>
LOG_LEVEL=info
```

**Generate Secure JWT Secret**:

```bash
# Generate 64-character random string
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Frontend Environment Variables

Create `.env.production`:

```bash
EXPO_PUBLIC_API_URL=https://api.muster.app/api
EXPO_PUBLIC_ENVIRONMENT=production
```

---

## Backend Deployment

### Option 1: Deploy to Heroku

```bash
# Login to Heroku
heroku login

# Create app
heroku create muster-api-prod

# Set environment variables
heroku config:set NODE_ENV=production --app muster-api-prod
heroku config:set JWT_SECRET=<YOUR_SECRET> --app muster-api-prod
# ... set all other environment variables

# Deploy
git push heroku main

# Run migrations
heroku run npx prisma migrate deploy --app muster-api-prod

# Check logs
heroku logs --tail --app muster-api-prod
```

### Option 2: Deploy to AWS (EC2 + Load Balancer)

```bash
# 1. Create EC2 instance
aws ec2 run-instances \
  --image-id ami-xxxxxxxx \
  --instance-type t3.small \
  --key-name muster-prod-key \
  --security-group-ids sg-xxxxxxxx \
  --subnet-id subnet-xxxxxxxx \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=muster-api-prod}]'

# 2. SSH into instance
ssh -i muster-prod-key.pem ec2-user@<INSTANCE_IP>

# 3. Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# 4. Clone repository
git clone https://github.com/your-org/muster.git
cd muster/server

# 5. Install dependencies
npm ci --production

# 6. Set environment variables
sudo nano /etc/environment
# Add all production environment variables

# 7. Build application
npm run build

# 8. Install PM2 for process management
sudo npm install -g pm2

# 9. Start application
pm2 start dist/index.js --name muster-api
pm2 save
pm2 startup

# 10. Configure nginx as reverse proxy
sudo yum install -y nginx
sudo nano /etc/nginx/conf.d/muster.conf
```

**Nginx Configuration** (`/etc/nginx/conf.d/muster.conf`):

```nginx
server {
    listen 80;
    server_name api.muster.app;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.muster.app;
    
    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/api.muster.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.muster.app/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Proxy to Node.js app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Option 3: Deploy to Docker

**Dockerfile** (`server/Dockerfile`):

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --production

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
```

**Deploy**:

```bash
# Build image
docker build -t muster-api:latest ./server

# Run container
docker run -d \
  --name muster-api \
  -p 3000:3000 \
  --env-file server/.env.production \
  muster-api:latest

# Check logs
docker logs -f muster-api
```

---

## Frontend Deployment

### iOS Deployment

```bash
# 1. Configure app.json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.muster.app",
      "buildNumber": "1.0.0"
    }
  }
}

# 2. Build for App Store
eas build --platform ios --profile production

# 3. Submit to App Store
eas submit --platform ios
```

### Android Deployment

```bash
# 1. Configure app.json
{
  "expo": {
    "android": {
      "package": "com.muster.app",
      "versionCode": 1
    }
  }
}

# 2. Build for Play Store
eas build --platform android --profile production

# 3. Submit to Play Store
eas submit --platform android
```

### Web Deployment

```bash
# 1. Build web version
npm run build:web

# 2. Deploy to Netlify
netlify deploy --prod --dir=web-build

# Or deploy to Vercel
vercel --prod
```

---

## SSO Provider Setup

### Apple Sign In

1. **Create App ID**:
   - Go to Apple Developer Portal
   - Create new App ID with Sign In with Apple capability
   - Note your Team ID and App ID

2. **Create Service ID**:
   - Create Service ID for web authentication
   - Configure return URLs: `https://muster.app/auth/apple/callback`

3. **Create Private Key**:
   - Generate private key for Sign In with Apple
   - Download and store securely
   - Note the Key ID

4. **Configure Environment Variables**:
   ```bash
   APPLE_CLIENT_ID=com.muster.app
   APPLE_TEAM_ID=ABC123DEF4
   APPLE_KEY_ID=XYZ789ABC1
   APPLE_PRIVATE_KEY=<PRIVATE_KEY_CONTENT>
   ```

### Google Sign In

1. **Create OAuth 2.0 Client**:
   - Go to Google Cloud Console
   - Create OAuth 2.0 Client ID
   - Add authorized redirect URIs:
     - `https://muster.app/auth/google/callback`
     - `com.muster.app:/oauth2redirect/google` (mobile)

2. **Configure Environment Variables**:
   ```bash
   GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=<YOUR_CLIENT_SECRET>
   ```

---

## Email Service Setup

### Option 1: SendGrid

```bash
# 1. Create SendGrid account
# 2. Create API key with "Mail Send" permission
# 3. Verify sender email address

# 4. Configure environment variables
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=<SENDGRID_API_KEY>
SMTP_FROM_EMAIL=noreply@muster.app
SMTP_FROM_NAME=Muster
```

### Option 2: AWS SES

```bash
# 1. Verify email address or domain in AWS SES
aws ses verify-email-identity --email-address noreply@muster.app

# 2. Create SMTP credentials
aws iam create-user --user-name muster-ses-smtp
aws iam attach-user-policy \
  --user-name muster-ses-smtp \
  --policy-arn arn:aws:iam::aws:policy/AmazonSESFullAccess

# 3. Create access key
aws iam create-access-key --user-name muster-ses-smtp

# 4. Configure environment variables
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=<ACCESS_KEY_ID>
SMTP_PASSWORD=<SECRET_ACCESS_KEY>
SMTP_FROM_EMAIL=noreply@muster.app
SMTP_FROM_NAME=Muster
```

---

## Monitoring and Logging

### 1. Set Up Logging

**Winston Logger Configuration**:

```typescript
// server/src/utils/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

export default logger;
```

### 2. Set Up Error Tracking (Sentry)

```bash
# Install Sentry
npm install @sentry/node

# Configure Sentry
# server/src/app.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

### 3. Set Up Metrics Dashboard

**CloudWatch (AWS)**:

```bash
# Create CloudWatch dashboard
aws cloudwatch put-dashboard \
  --dashboard-name muster-auth-metrics \
  --dashboard-body file://dashboard.json
```

**Grafana + Prometheus**:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'muster-api'
    static_configs:
      - targets: ['localhost:3000']
```

### 4. Configure Alerts

```bash
# CloudWatch alarm for high error rate
aws cloudwatch put-metric-alarm \
  --alarm-name muster-high-error-rate \
  --alarm-description "Alert when error rate exceeds 5%" \
  --metric-name ErrorRate \
  --namespace Muster/API \
  --statistic Average \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:123456789:muster-alerts
```

---

## Post-Deployment Verification

### 1. Health Check

```bash
# Check API health
curl https://api.muster.app/health

# Expected response
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z",
  "database": "connected"
}
```

### 2. Test Authentication Endpoints

```bash
# Test registration
curl -X POST https://api.muster.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "username": "testuser",
    "password": "TestPass123!",
    "agreedToTerms": true
  }'

# Test login
curl -X POST https://api.muster.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrUsername": "testuser",
    "password": "TestPass123!",
    "rememberMe": false
  }'
```

### 3. Verify SSL Certificate

```bash
# Check SSL certificate
openssl s_client -connect api.muster.app:443 -servername api.muster.app

# Verify certificate expiration
echo | openssl s_client -connect api.muster.app:443 2>/dev/null | openssl x509 -noout -dates
```

### 4. Test Rate Limiting

```bash
# Test login rate limit (should fail after 5 attempts)
for i in {1..6}; do
  curl -X POST https://api.muster.app/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"emailOrUsername":"test","password":"wrong"}'
  echo "\nAttempt $i"
done
```

### 5. Verify Email Delivery

```bash
# Test password reset email
curl -X POST https://api.muster.app/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Check email inbox for reset link
```

---

## Rollback Procedures

### Database Rollback

```bash
# List migrations
npx prisma migrate status

# Rollback last migration
npx prisma migrate resolve --rolled-back <MIGRATION_NAME>

# Apply previous migration
npx prisma migrate deploy
```

### Application Rollback

**Heroku**:

```bash
# List releases
heroku releases --app muster-api-prod

# Rollback to previous release
heroku rollback v123 --app muster-api-prod
```

**AWS/Docker**:

```bash
# Stop current container
docker stop muster-api

# Start previous version
docker run -d \
  --name muster-api \
  -p 3000:3000 \
  --env-file server/.env.production \
  muster-api:v1.0.0
```

**PM2**:

```bash
# Rollback to previous version
cd /path/to/muster/server
git checkout v1.0.0
npm ci --production
npm run build
pm2 restart muster-api
```

---

## Deployment Checklist

Use this checklist for each deployment:

### Pre-Deployment
- [ ] All tests pass
- [ ] Code review completed
- [ ] Security scan completed
- [ ] Database backup created
- [ ] Environment variables verified
- [ ] SSL certificates valid
- [ ] Monitoring configured

### Deployment
- [ ] Database migrations applied
- [ ] Backend deployed
- [ ] Frontend deployed
- [ ] Health checks pass
- [ ] SSL verified
- [ ] Rate limiting tested
- [ ] Email delivery tested
- [ ] SSO tested (Apple and Google)

### Post-Deployment
- [ ] Monitor error rates
- [ ] Monitor response times
- [ ] Check logs for errors
- [ ] Verify user registrations working
- [ ] Verify user logins working
- [ ] Verify password reset working
- [ ] Verify SSO working
- [ ] Update documentation
- [ ] Notify team of deployment

---

## Support

For deployment support:
- **Email**: devops@muster.app
- **Slack**: #deployments
- **On-Call**: +1-555-0123

---

**Last Updated**: January 2024  
**Version**: 1.0
