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

  constructor() {
    this.setupNetworkMonitoring();
  }

  private setupNetworkMonitoring() {
    // Use browser's online/offline events for better detection (web only)
    if (Platform.OS === 'web') {
      window.addEventListener('online', () => {
        this.updateNetworkState({
          isConnected: true,
          isInternetReachable: true,
        });
      });

      window.addEventListener('offline', () => {
        this.updateNetworkState({
          isConnected: false,
          isInternetReachable: false,
        });
      });
    }

    // Initial check
    this.checkNetworkStatus();

    // Periodic checks (less frequent since we have event listeners)
    setInterval(() => {
      this.checkNetworkStatus();
    }, 30000); // Check every 30 seconds instead of 5
  }

  private async checkNetworkStatus() {
    try {
      // Check if we're online using the browser's navigator.onLine
      // This is more reliable and doesn't cause CORS issues
      const isOnline =
        typeof navigator !== 'undefined' ? navigator.onLine : true;

      if (!isOnline) {
        const newState: NetworkState = {
          isConnected: false,
          isInternetReachable: false,
        };
        this.updateNetworkState(newState);
        return;
      }

      // If online, assume internet is reachable
      // We'll rely on API call failures to detect actual connectivity issues
      const newState: NetworkState = {
        isConnected: true,
        isInternetReachable: true,
      };

      this.updateNetworkState(newState);
    } catch (error) {
      // Fallback: assume we're online
      const newState: NetworkState = {
        isConnected: true,
        isInternetReachable: true,
      };

      this.updateNetworkState(newState);
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
    this.listeners.push(listener);

    // Immediately call with current state
    listener(this.currentState);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  public getCurrentState(): NetworkState {
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
