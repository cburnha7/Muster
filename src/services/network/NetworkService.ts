import { useState, useEffect } from 'react';
import { Platform } from 'react-native';

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean;
}

class NetworkService {
  private listeners: ((state: NetworkState) => void)[] = [];
  private currentState: NetworkState = {
    isConnected: true,
    isInternetReachable: true,
  };
  private monitoringStarted = false;
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private onlineHandler: (() => void) | null = null;
  private offlineHandler: (() => void) | null = null;

  constructor() {
    // No work at construction. Network monitoring boots lazily on the
    // first subscribe() call. Keeps cold launch off of window event
    // registration and the 30s polling timer until something actually
    // needs the network state. Pattern matches the Tier 1 lazy-init
    // refactor of AuthService.
  }

  private ensureMonitoring(): void {
    if (this.monitoringStarted) return;
    this.monitoringStarted = true;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      this.onlineHandler = () => {
        this.updateNetworkState({
          isConnected: true,
          isInternetReachable: true,
        });
      };
      this.offlineHandler = () => {
        this.updateNetworkState({
          isConnected: false,
          isInternetReachable: false,
        });
      };
      window.addEventListener('online', this.onlineHandler);
      window.addEventListener('offline', this.offlineHandler);
    }

    // Initial state probe
    this.checkNetworkStatus();

    // Periodic recheck (existing 30s cadence)
    this.intervalHandle = setInterval(() => {
      this.checkNetworkStatus();
    }, 30000);
  }

  public teardown(): void {
    if (!this.monitoringStarted) return;

    if (this.intervalHandle !== null) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      this.onlineHandler &&
      this.offlineHandler
    ) {
      window.removeEventListener('online', this.onlineHandler);
      window.removeEventListener('offline', this.offlineHandler);
      this.onlineHandler = null;
      this.offlineHandler = null;
    }

    this.monitoringStarted = false;
  }

  private async checkNetworkStatus() {
    try {
      const isOnline =
        typeof navigator !== 'undefined' ? navigator.onLine : true;

      if (!isOnline) {
        this.updateNetworkState({
          isConnected: false,
          isInternetReachable: false,
        });
        return;
      }

      this.updateNetworkState({
        isConnected: true,
        isInternetReachable: true,
      });
    } catch (error) {
      this.updateNetworkState({
        isConnected: true,
        isInternetReachable: true,
      });
    }
  }

  private updateNetworkState(newState: NetworkState) {
    const stateChanged =
      this.currentState.isConnected !== newState.isConnected ||
      this.currentState.isInternetReachable !== newState.isInternetReachable;

    if (stateChanged) {
      this.currentState = newState;
      this.notifyListeners();
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentState));
  }

  public subscribe(listener: (state: NetworkState) => void): () => void {
    this.ensureMonitoring();
    this.listeners.push(listener);

    // Immediately call with current state
    listener(this.currentState);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
      // If no more consumers, tear down to free the interval.
      if (this.listeners.length === 0) {
        this.teardown();
      }
    };
  }

  public getCurrentState(): NetworkState {
    this.ensureMonitoring();
    return { ...this.currentState };
  }
}

// Create singleton instance
export const networkService = new NetworkService();

// React hook for using network state
export function useNetworkState(): NetworkState {
  const [networkState, setNetworkState] = useState<NetworkState>(
    networkService.getCurrentState()
  );

  useEffect(() => {
    const unsubscribe = networkService.subscribe(setNetworkState);
    return unsubscribe;
  }, []);

  return networkState;
}
