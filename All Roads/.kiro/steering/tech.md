# Technology Stack

This document outlines the technical foundation for Muster - a sports booking and event management platform.

## Build System
- **Package Manager**: npm
- **Build Tool**: Expo (Metro bundler)
- **Platforms**: iOS, Android, Web

## Tech Stack

### Frontend
- **Framework**: React Native (Expo SDK 55)
- **Language**: TypeScript
- **UI Library**: React Native core components + custom components
- **Navigation**: React Navigation (Stack, Tab, Native Stack)
- **State Management**: Redux Toolkit with RTK Query
- **Styling**: StyleSheet API with theme system

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **API**: RESTful API

### Key Libraries & Services
- **Maps**: react-native-maps (iOS/Android), Leaflet (Web)
- **Notifications**: expo-notifications
- **Image Handling**: expo-image-picker, OptimizedImage component
- **Offline Support**: Custom OfflineService with SyncManager
- **Performance**: Custom monitoring services
- **Error Tracking**: Custom ErrorBoundary and CrashReportingService

### Development Tools
- **Package Manager**: npm
- **Linter**: ESLint
- **Formatter**: Prettier
- **Testing Framework**: Jest + React Native Testing Library
- **Property Testing**: fast-check
- **Type Checking**: TypeScript

## Common Commands

```bash
# Install dependencies
npm install

# Start development server (choose platform)
npm start              # Start Expo dev server
npm run ios            # Run on iOS simulator
npm run android        # Run on Android emulator
npm run web            # Run in web browser

# Backend server
cd server
npm install
npm run dev            # Start backend server with hot reload

# Database operations
cd server
npx prisma migrate dev # Run database migrations
npx prisma studio      # Open Prisma Studio GUI
npm run seed           # Seed database with mock data

# Run tests
npm test               # Run all tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Run tests with coverage report

# Build for production
npm run build:web      # Build web version
eas build --platform ios     # Build iOS (requires EAS)
eas build --platform android # Build Android (requires EAS)

# Lint and format code
npm run lint           # Run ESLint
npm run format         # Run Prettier
```

## Project Architecture

### Frontend Structure
- **src/screens/**: Screen components organized by feature
- **src/components/**: Reusable UI components (ui/, forms/, navigation/)
- **src/services/**: Business logic and API services
- **src/store/**: Redux store configuration and slices
- **src/navigation/**: Navigation configuration
- **src/theme/**: Design system (colors, typography, spacing)
- **src/types/**: TypeScript type definitions
- **src/utils/**: Utility functions and helpers
- **src/hooks/**: Custom React hooks

### Backend Structure
- **server/src/routes/**: API route handlers
- **server/src/services/**: Business logic services
- **server/src/prisma/**: Database schema and migrations
- **server/src/scripts/**: Utility scripts

## Development Workflow

### Branching Strategy
- **main**: Production-ready code
- **develop**: Integration branch for features
- **feature/***: Feature development branches
- **bugfix/***: Bug fix branches

### Code Review Process
1. Create feature branch from develop
2. Implement feature with tests
3. Run linter and tests locally
4. Create pull request with description
5. Address review comments
6. Merge to develop after approval

### Testing Requirements
- Unit tests for services and utilities
- Component tests for UI components
- Integration tests for API endpoints
- Property-based tests for validation logic
- Minimum 80% code coverage for critical paths

### Deployment Process
- **Development**: Expo Go app for testing
- **Staging**: EAS Build for internal testing
- **Production**: App Store (iOS) and Google Play (Android)
- **Web**: Static hosting (Netlify, Vercel, or similar)

## Environment Configuration

### Frontend (.env)
```bash
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_ENVIRONMENT=development
```

### Backend (server/.env)
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/muster
PORT=3000
NODE_ENV=development
JWT_SECRET=your-secret-key
```

## Platform-Specific Notes

### iOS
- Requires Xcode for native builds
- Uses CocoaPods for native dependencies
- Minimum iOS version: 13.0

### Android
- Requires Android Studio for native builds
- Uses Gradle for build configuration
- Minimum Android version: 21 (Android 5.0)

### Web
- Uses Webpack for bundling
- Responsive design with platform-specific components
- Fallback implementations for native-only features

## Performance Optimization
- Image optimization with OptimizedImage component
- Lazy loading for screens and heavy components
- Memoization for expensive computations
- Virtual lists for long scrollable content
- Network request caching with CacheService
- Offline support with queue management

## Monitoring & Analytics
- Custom PerformanceMonitoringService for metrics
- CrashReportingService for error tracking
- Network monitoring with NetworkService
- User analytics (ready for integration)

## Security Best Practices
- JWT-based authentication
- Secure storage for sensitive data
- Input validation on client and server
- SQL injection prevention with Prisma
- HTTPS for all API communications
- Environment variables for secrets