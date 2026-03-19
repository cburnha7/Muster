/**
 * Performance monitoring and optimization utilities
 */

import { InteractionManager, Platform } from 'react-native';

/**
 * Defer execution until after interactions are complete
 * Useful for non-critical operations that can wait
 */
export function runAfterInteractions<T>(callback: () => T): Promise<T> {
  return new Promise((resolve) => {
    InteractionManager.runAfterInteractions(() => {
      resolve(callback());
    });
  });
}

/**
 * Debounce function to limit how often a function can fire
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function to ensure a function is called at most once in a specified time period
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Measure execution time of a function
 */
export async function measurePerformance<T>(
  name: string,
  fn: () => Promise<T> | T
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    console.log(`[Performance] ${name}: ${duration}ms`);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`[Performance] ${name} failed after ${duration}ms:`, error);
    throw error;
  }
}

/**
 * Batch multiple state updates together
 */
export function batchUpdates(callback: () => void): void {
  // React Native automatically batches updates in event handlers
  // This is a placeholder for potential future optimizations
  callback();
}

/**
 * Check if device is low-end based on platform and available memory
 */
export function isLowEndDevice(): boolean {
  // On Android, we can check for low RAM devices
  if (Platform.OS === 'android') {
    // This would require native module to check actual RAM
    // For now, we'll use a simple heuristic
    return Platform.Version < 28; // Android 9 and below
  }
  
  // On iOS, older devices are typically lower-end
  if (Platform.OS === 'ios') {
    const version = parseInt(Platform.Version as string, 10);
    return version < 13; // iOS 13 and below
  }
  
  return false;
}

/**
 * Get optimal batch size for list rendering based on device capabilities
 */
export function getOptimalBatchSize(): number {
  return isLowEndDevice() ? 5 : 10;
}

/**
 * Get optimal window size for FlatList based on device capabilities
 */
export function getOptimalWindowSize(): number {
  return isLowEndDevice() ? 5 : 10;
}

/**
 * Memoization helper for expensive computations
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T
): (...args: Parameters<T>) => ReturnType<T> {
  const cache = new Map<string, ReturnType<T>>();

  return (...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

/**
 * Clear memoization cache (useful for memory management)
 */
export function clearMemoCache(fn: any): void {
  if (fn.cache) {
    fn.cache.clear();
  }
}

/**
 * Schedule low-priority work to run when the app is idle
 */
export function scheduleIdleWork(callback: () => void, timeout: number = 1000): void {
  setTimeout(() => {
    runAfterInteractions(callback);
  }, timeout);
}

/**
 * Preload data in the background
 */
export async function preloadData<T>(
  loader: () => Promise<T>,
  priority: 'high' | 'low' = 'low'
): Promise<T> {
  if (priority === 'high') {
    return loader();
  }

  return runAfterInteractions(loader);
}

/**
 * Memory-efficient array chunking for batch processing
 */
export function* chunkArray<T>(array: T[], chunkSize: number): Generator<T[]> {
  for (let i = 0; i < array.length; i += chunkSize) {
    yield array.slice(i, i + chunkSize);
  }
}

/**
 * Performance monitoring class for tracking app metrics
 */
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();

  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);
  }

  getAverageMetric(name: string): number {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) {
      return 0;
    }
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  getMetricStats(name: string): { min: number; max: number; avg: number; count: number } {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) {
      return { min: 0, max: 0, avg: 0, count: 0 };
    }

    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: this.getAverageMetric(name),
      count: values.length,
    };
  }

  clearMetrics(name?: string): void {
    if (name) {
      this.metrics.delete(name);
    } else {
      this.metrics.clear();
    }
  }

  getAllMetrics(): Record<string, { min: number; max: number; avg: number; count: number }> {
    const result: Record<string, any> = {};
    this.metrics.forEach((_, name) => {
      result[name] = this.getMetricStats(name);
    });
    return result;
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();
