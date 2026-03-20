import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

// Stage flags — enable one at a time to isolate the crash
const STAGES = {
  FONTS: true,
  REDUX: true,
  AUTH: true,
  NOTIFICATIONS: true,
  NAVIGATION: true,
};

// Track what loaded
const loadLog: string[] = [];
function log(msg: string) {
  loadLog.push(`${new Date().toISOString().slice(11, 19)} ${msg}`);
  console.log(`[App Boot] ${msg}`);
}

// Conditional imports with error catching
let useFontsHook: any = null;
let colorsModule: any = null;
let ReduxProvider: any = null;
let AuthProvider: any = null;
let NotificationProvider: any = null;
let NavigationContainer: any = null;
let RootNavigator: any = null;
let StatusBar: any = null;

try { useFontsHook = require('./src/hooks/useFonts').useFonts; log('✅ useFonts'); } catch (e: any) { log(`❌ useFonts: ${e.message}`); }
try { colorsModule = require('./src/theme').colors; log('✅ colors'); } catch (e: any) { log(`❌ colors: ${e.message}`); }
try { StatusBar = require('expo-status-bar').StatusBar; log('✅ StatusBar'); } catch (e: any) { log(`❌ StatusBar: ${e.message}`); }

if (STAGES.REDUX) {
  try { ReduxProvider = require('./src/store/Provider').ReduxProvider; log('✅ ReduxProvider'); } catch (e: any) { log(`❌ ReduxProvider: ${e.message}`); }
}
if (STAGES.AUTH) {
  try { AuthProvider = require('./src/context/AuthContext').AuthProvider; log('✅ AuthProvider'); } catch (e: any) { log(`❌ AuthProvider: ${e.message}`); }
}
if (STAGES.NOTIFICATIONS) {
  try { NotificationProvider = require('./src/services/notifications').NotificationProvider; log('✅ NotificationProvider'); } catch (e: any) { log(`❌ NotificationProvider: ${e.message}`); }
}
if (STAGES.NAVIGATION) {
  try { NavigationContainer = require('@react-navigation/native').NavigationContainer; log('✅ NavigationContainer'); } catch (e: any) { log(`❌ NavigationContainer: ${e.message}`); }
  try { RootNavigator = require('./src/navigation/RootNavigator').RootNavigator; log('✅ RootNavigator'); } catch (e: any) { log(`❌ RootNavigator: ${e.message}`); }
}

function DebugScreen({ extra }: { extra?: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Muster Boot Log</Text>
      {extra && <Text style={styles.extra}>{extra}</Text>}
      <ScrollView style={styles.logBox}>
        {loadLog.map((line, i) => (
          <Text key={i} style={line.includes('❌') ? styles.logError : styles.logLine}>{line}</Text>
        ))}
      </ScrollView>
    </View>
  );
}

function AppContent(): JSX.Element {
  const [stage, setStage] = useState('init');

  useEffect(() => {
    log(`Rendering AppContent, stage: ${stage}`);
  }, [stage]);

  // Font loading
  const fonts = useFontsHook ? useFontsHook() : { fontsLoaded: true, error: null };
  
  if (!fonts.fontsLoaded) {
    return <DebugScreen extra="⏳ Loading fonts..." />;
  }
  if (fonts.error) {
    log(`⚠️ Font error: ${fonts.error.message}`);
  }

  // Build the component tree incrementally
  let content: JSX.Element = (
    <View style={{ flex: 1 }}>
      {NavigationContainer && RootNavigator ? (
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      ) : (
        <DebugScreen extra="Navigation not loaded" />
      )}
      {StatusBar && <StatusBar style="auto" />}
    </View>
  );

  // Wrap with notifications
  if (NotificationProvider) {
    content = <NotificationProvider>{content}</NotificationProvider>;
  }

  // Wrap with auth
  if (AuthProvider) {
    content = <AuthProvider>{content}</AuthProvider>;
  }

  return content;
}

export default function App(): JSX.Element {
  log('App() render');

  if (!ReduxProvider) {
    return <DebugScreen extra="ReduxProvider not loaded — check log" />;
  }

  return (
    <ReduxProvider>
      <AppContent />
    </ReduxProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 80,
    paddingHorizontal: 20,
    backgroundColor: '#EEEBE3',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2D5F3F',
    marginBottom: 8,
  },
  extra: {
    fontSize: 16,
    color: '#C0392B',
    marginBottom: 12,
  },
  logBox: {
    flex: 1,
    backgroundColor: '#1B2A4A',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  logLine: {
    fontSize: 13,
    color: '#EEEBE3',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  logError: {
    fontSize: 13,
    color: '#C0392B',
    fontFamily: 'monospace',
    marginBottom: 4,
    fontWeight: '700',
  },
});
