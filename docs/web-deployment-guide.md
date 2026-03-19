# Web Deployment Guide

**Sports Booking App - Web Version Deployment**

## Overview

This guide covers how to build and deploy the web version of the Sports Booking App to various hosting platforms.

## Building for Production

### 1. Build the Web App

```bash
# Build optimized production bundle
npm run build:web
```

This creates a `web-build/` directory with static files ready for deployment.

### 2. Test Production Build Locally

```bash
# Serve the production build locally
npm run serve:web
```

Visit `http://localhost:5000` to test the production build.

## Deployment Options

### Option 1: Vercel (Recommended)

**Why Vercel:**
- ✅ Zero configuration
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Free tier available
- ✅ Automatic deployments from Git

**Steps:**

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   # First time
   vercel
   
   # Production deployment
   vercel --prod
   ```

4. Configure custom domain (optional):
   ```bash
   vercel domains add yourdomain.com
   ```

**Automatic Deployments:**

Create `vercel.json`:
```json
{
  "buildCommand": "expo export:web",
  "outputDirectory": "web-build",
  "devCommand": "expo start --web",
  "framework": null,
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

Connect your Git repository in Vercel dashboard for automatic deployments.

### Option 2: Netlify

**Why Netlify:**
- ✅ Easy setup
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Free tier available
- ✅ Form handling and serverless functions

**Steps:**

1. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```

2. Login to Netlify:
   ```bash
   netlify login
   ```

3. Initialize:
   ```bash
   netlify init
   ```

4. Deploy:
   ```bash
   # Build and deploy
   npm run build:web
   netlify deploy --prod --dir=web-build
   ```

**Automatic Deployments:**

Create `netlify.toml`:
```toml
[build]
  command = "expo export:web"
  publish = "web-build"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

Connect your Git repository in Netlify dashboard.

### Option 3: GitHub Pages

**Why GitHub Pages:**
- ✅ Free hosting
- ✅ Integrated with GitHub
- ✅ Custom domain support
- ✅ HTTPS included

**Steps:**

1. Install gh-pages:
   ```bash
   npm install --save-dev gh-pages
   ```

2. Add deploy script to `package.json`:
   ```json
   {
     "scripts": {
       "deploy:gh-pages": "expo export:web && gh-pages -d web-build"
     }
   }
   ```

3. Deploy:
   ```bash
   npm run deploy:gh-pages
   ```

4. Configure GitHub Pages:
   - Go to repository Settings > Pages
   - Select `gh-pages` branch
   - Save

**Custom Domain:**

Create `web-build/CNAME` file:
```
yourdomain.com
```

### Option 4: AWS S3 + CloudFront

**Why AWS:**
- ✅ Highly scalable
- ✅ Global CDN
- ✅ Full control
- ✅ Integration with other AWS services

**Steps:**

1. Create S3 bucket:
   ```bash
   aws s3 mb s3://your-bucket-name
   ```

2. Configure bucket for static hosting:
   ```bash
   aws s3 website s3://your-bucket-name \
     --index-document index.html \
     --error-document index.html
   ```

3. Build and upload:
   ```bash
   npm run build:web
   aws s3 sync web-build/ s3://your-bucket-name --delete
   ```

4. Set bucket policy:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::your-bucket-name/*"
       }
     ]
   }
   ```

5. Create CloudFront distribution:
   - Origin: Your S3 bucket
   - Default root object: `index.html`
   - Error pages: 404 → /index.html (for SPA routing)

### Option 5: Firebase Hosting

**Why Firebase:**
- ✅ Fast global CDN
- ✅ Free SSL
- ✅ Easy rollbacks
- ✅ Integration with Firebase services

**Steps:**

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login:
   ```bash
   firebase login
   ```

3. Initialize:
   ```bash
   firebase init hosting
   ```

   Select:
   - Public directory: `web-build`
   - Single-page app: Yes
   - GitHub integration: Optional

4. Build and deploy:
   ```bash
   npm run build:web
   firebase deploy --only hosting
   ```

**firebase.json:**
```json
{
  "hosting": {
    "public": "web-build",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

### Option 6: Docker + Any Cloud

**Why Docker:**
- ✅ Consistent environments
- ✅ Deploy anywhere
- ✅ Easy scaling
- ✅ Works with any cloud provider

**Dockerfile:**
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build:web

FROM nginx:alpine
COPY --from=builder /app/web-build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**nginx.conf:**
```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Build and run:**
```bash
docker build -t sports-booking-web .
docker run -p 80:80 sports-booking-web
```

## Environment Configuration

### Environment Variables

Create environment-specific files:

**.env.production:**
```bash
EXPO_PUBLIC_API_URL=https://api.yourdomain.com
EXPO_PUBLIC_GOOGLE_MAPS_KEY=your-production-key
EXPO_PUBLIC_ENVIRONMENT=production
```

**.env.staging:**
```bash
EXPO_PUBLIC_API_URL=https://staging-api.yourdomain.com
EXPO_PUBLIC_GOOGLE_MAPS_KEY=your-staging-key
EXPO_PUBLIC_ENVIRONMENT=staging
```

### Build with Environment

```bash
# Production
EXPO_PUBLIC_ENV=production npm run build:web

# Staging
EXPO_PUBLIC_ENV=staging npm run build:web
```

## Custom Domain Setup

### 1. DNS Configuration

Add DNS records:

**For Apex Domain (yourdomain.com):**
```
A     @     <hosting-provider-ip>
```

**For Subdomain (www.yourdomain.com):**
```
CNAME www   <hosting-provider-domain>
```

### 2. SSL Certificate

Most hosting providers (Vercel, Netlify, Firebase) provide automatic SSL.

For custom setup:
- Use Let's Encrypt (free)
- Or purchase SSL certificate
- Configure in hosting provider

### 3. Verify Setup

```bash
# Check DNS propagation
nslookup yourdomain.com

# Test HTTPS
curl -I https://yourdomain.com
```

## Performance Optimization

### 1. Enable Compression

Most hosting providers enable gzip/brotli automatically.

For custom servers, configure compression:

**nginx:**
```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1000;
```

### 2. Cache Headers

Set appropriate cache headers:

```nginx
# Cache static assets for 1 year
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# Don't cache HTML
location ~* \.html$ {
    expires -1;
    add_header Cache-Control "no-cache, no-store, must-revalidate";
}
```

### 3. CDN Configuration

Use CDN for global distribution:
- Vercel/Netlify: Built-in CDN
- AWS: CloudFront
- Custom: Cloudflare

### 4. Bundle Size Optimization

```bash
# Analyze bundle size
npx expo export:web --analyze

# Check bundle composition
npx source-map-explorer web-build/static/js/*.js
```

## Monitoring and Analytics

### 1. Error Tracking

Add error tracking service:

```typescript
// src/services/monitoring/ErrorTracking.ts
import * as Sentry from '@sentry/react';

if (process.env.EXPO_PUBLIC_ENVIRONMENT === 'production') {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    environment: process.env.EXPO_PUBLIC_ENVIRONMENT,
  });
}
```

### 2. Analytics

Add analytics:

```typescript
// src/services/analytics/Analytics.ts
import ReactGA from 'react-ga4';

if (process.env.EXPO_PUBLIC_ENVIRONMENT === 'production') {
  ReactGA.initialize(process.env.EXPO_PUBLIC_GA_ID);
}
```

### 3. Performance Monitoring

Monitor web vitals:

```typescript
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

## CI/CD Pipeline

### GitHub Actions Example

**.github/workflows/deploy-web.yml:**
```yaml
name: Deploy Web

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build web
        run: npm run build:web
        env:
          EXPO_PUBLIC_API_URL: ${{ secrets.API_URL }}
          
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./web-build
```

## Rollback Strategy

### Vercel/Netlify

Both platforms keep deployment history:

```bash
# Vercel - rollback to previous deployment
vercel rollback

# Netlify - restore previous deploy
netlify deploy --restore <deploy-id>
```

### Manual Rollback

Keep previous builds:

```bash
# Tag builds
mv web-build web-build-$(date +%Y%m%d-%H%M%S)

# Rollback
rm -rf web-build
mv web-build-20260309-120000 web-build
```

## Troubleshooting

### Build Fails

```bash
# Clear cache
rm -rf node_modules .expo web-build
npm install
npm run build:web
```

### Routing Issues

Ensure hosting provider redirects all routes to `index.html`:

**Vercel:** Use `vercel.json` rewrites
**Netlify:** Use `_redirects` or `netlify.toml`
**S3/CloudFront:** Configure error pages

### Environment Variables Not Working

- Ensure variables start with `EXPO_PUBLIC_`
- Rebuild after changing environment variables
- Check hosting provider's environment variable settings

## Security Checklist

- [ ] HTTPS enabled
- [ ] Environment variables secured
- [ ] API keys not exposed in client code
- [ ] Content Security Policy configured
- [ ] CORS properly configured on backend
- [ ] Rate limiting enabled
- [ ] Authentication tokens secured
- [ ] Regular security updates

## Post-Deployment

### 1. Verify Deployment

```bash
# Check if site is live
curl -I https://yourdomain.com

# Test API connectivity
curl https://yourdomain.com/api/health
```

### 2. Monitor Performance

- Check loading times
- Monitor error rates
- Review analytics
- Test on different browsers

### 3. Update Documentation

- Document deployment process
- Update team on new URL
- Share access credentials securely

## Support

For deployment issues:
1. Check hosting provider documentation
2. Review build logs
3. Test locally with production build
4. Contact hosting provider support

---

**Last Updated:** March 9, 2026
**Version:** 1.0.0
