// Safety layout for Expo Router.
// The real entry point is index.js → App.tsx via registerRootComponent.
// If Expo Router activates, this layout renders children via Slot.
import React from 'react';

let Slot: React.ComponentType<any>;
try {
  Slot = require('expo-router').Slot;
} catch {
  // expo-router not available — render children directly
  Slot = ({ children }: any) => children ?? null;
}

export default function RootLayout() {
  return <Slot />;
}
