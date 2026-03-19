# Sports Booking App

A cross-platform application built with React Native and Expo for booking and managing sporting events including pickup basketball games, soccer clinics, and other recreational sports activities.

**Platforms**: iOS, Android, and Web

## Features

- 🏀 Event discovery and booking
- 🏟️ Facility management
- 👥 Team creation and management
- 📱 Offline functionality
- 🔔 Push notifications
- 🗺️ Map integration
- 🔐 Secure authentication
- 🌐 **Web support** - Run in any modern browser

## Tech Stack

- **Framework**: React Native with Expo SDK 49+
- **Language**: TypeScript
- **Navigation**: React Navigation 6
- **State Management**: Redux Toolkit with RTK Query
- **Local Storage**: AsyncStorage & Expo SQLite
- **Testing**: Jest with React Native Testing Library
- **Property Testing**: fast-check
- **Code Quality**: ESLint, Prettier, TypeScript strict mode
- **Web**: React Native Web for browser support

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio (for Android development)
- Modern web browser (for web development)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Run on specific platforms:
   ```bash
   npm run ios     # iOS simulator
   npm run android # Android emulator
   npm run web     # Web browser
   ```

## Development

### Project Structure

```
/
├── .kiro/                 # Kiro configuration and specs
├── app/                   # Expo Router app directory
├── src/                   # Source code
│   ├── components/        # Reusable UI components
│   ├── screens/          # Screen components
│   ├── services/         # API and business logic
│   ├── store/            # Redux store and slices
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Utility functions
├── tests/                # Test files
├── assets/               # Static assets
└── docs/                 # Documentation
```

### Available Scripts

```bash
npm start          # Start Expo development server
npm run ios        # Run on iOS simulator
npm run android    # Run on Android emulator
npm run web        # Run in web browser
npm test           # Run tests
npm run lint       # Run ESLint
npm run lint:fix   # Fix ESLint issues
npm run type-check # Run TypeScript type checking
```

### Code Quality

- **ESLint**: Configured with TypeScript and React Native rules
- **Prettier**: Code formatting with consistent style
- **TypeScript**: Strict mode enabled for type safety
- **Testing**: Jest with React Native Testing Library and fast-check for property-based testing

## Testing

The app uses a dual testing approach:

- **Unit Tests**: Specific examples and edge cases using Jest
- **Property Tests**: Universal properties using fast-check
- **Integration Tests**: End-to-end flows using Detox (planned)

Run tests:
```bash
npm test              # Run all tests
npm test -- --watch  # Run tests in watch mode
npm test -- --coverage # Run tests with coverage
```

## Contributing

1. Follow the established code style (ESLint + Prettier)
2. Write tests for new functionality
3. Update documentation as needed
4. Follow the project structure conventions

## License

This project is private and proprietary.