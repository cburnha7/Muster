// Safety index for Expo Router.
// The real entry point is index.js → App.tsx via registerRootComponent.
// If Expo Router activates, this renders the full App.
import React from 'react';
import App from '../App';

export default function Index() {
  return <App />;
}
