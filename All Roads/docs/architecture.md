# Architecture Overview

This document provides a high-level overview of the Sports Booking App architecture.

## System Architecture

The app follows a layered architecture with clear separation of concerns:

1. **Presentation Layer**: React Native components and screens
2. **State Management**: Redux Toolkit with RTK Query
3. **Service Layer**: API services, authentication, offline management
4. **Data Layer**: Local storage (AsyncStorage, SQLite) and remote API

## Key Design Decisions

- **Offline-First**: App works without internet connectivity
- **Type Safety**: TypeScript strict mode for better code quality
- **Modular Structure**: Clear separation between components, services, and utilities
- **Testing Strategy**: Dual approach with unit tests and property-based tests

## Technology Choices

- **Expo**: Rapid development and deployment
- **Redux Toolkit**: Simplified state management
- **React Navigation**: Native navigation patterns
- **TypeScript**: Type safety and better developer experience

For detailed design specifications, see the design document in `.kiro/specs/sports-booking-app/design.md`.