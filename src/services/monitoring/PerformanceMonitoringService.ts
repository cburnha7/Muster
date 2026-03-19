/**
 * Performance Monitoring Service
 * Tracks app performance metrics and reports them
 * In production, this would integrate with services like Firebase Performance or New Relic
 */

import { InteractionManager } from 'react-native';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count';
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ScreenLoadMetric {
  screenName: string;
  loadTime: number;
  timestamp: Date;
}

export interface APICallMetric {
  endpoint: string;
  method: string;
  duration: number;
  statusCode?: number;
  success: boolean;
  timestamp: Date;
}

class PerformanceMonitoringServiceClass {
  private metrics: PerformanceMetric[] = [];
  private screenLoadMetrics: ScreenLoadMetric[] = [];
  private apiCallMetrics: APICallMetric[] = [];
  private maxMetrics = 100;
  private isEnabled = true;

  /**
   * Initialize the performance monitoring service
   */
  async initialize(): Promise<void> {
    console.log('[PerformanceMonitoring] Service initialized');
    
    // In production, initialize your performance monitoring SDK here
    // Example: firebase.perf().setPerformanceCollectionEnabled(true);
  }

  /**
   * Enable or disable performance monitoring
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    console.log(`[PerformanceMonitoring] Service ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Record a custom metric
   */
  recordMetric(metric: Omit<PerformanceMetric, 'timestamp'>): void {
    if (!this.isEnabled) return;

    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: new Date(),
    };

    this.metrics.push(fullMetric);

    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    console.log(`[PerformanceMonitoring] Metric recorded: ${metric.name} = ${metric.value}${metric.unit}`);
  }

  /**
   * Start tracking screen load time
   */
  startScreenLoad(screenName: string): () => void {
    if (!this.isEnabled) return () => {};

    const startTime = Date.now();

    return () => {
      const loadTime = Date.now() - startTime;
      this.recordScreenLoad(screenName, loadTime);
    };
  }

  /**
   * Record screen load time
   */
  private recordScreenLoad(screenName: string, loadTime: number): void {
    const metric: ScreenLoadMetric = {
      screenName,
      loadTime,
      timestamp: new Date(),
    };

    this.screenLoadMetrics.push(metric);

    // Keep only the most recent metrics
    if (this.screenLoadMetrics.length > this.maxMetrics) {
      this.screenLoadMetrics.shift();
    }

    console.log(`[PerformanceMonitoring] Screen load: ${screenName} took ${loadTime}ms`);

    // Record as a general metric too
    this.recordMetric({
      name: `screen_load_${screenName}`,
      value: loadTime,
      unit: 'ms',
      metadata: { screenName },
    });
  }

  /**
   * Start tracking API call duration
   */
  startAPICall(endpoint: string, method: string): (statusCode?: number, success?: boolean) => void {
    if (!this.isEnabled) return () => {};

    const startTime = Date.now();

    return (statusCode?: number, success: boolean = true) => {
      const duration = Date.now() - startTime;
      this.recordAPICall(endpoint, method, duration, statusCode, success);
    };
  }

  /**
   * Record API call metrics
   */
  private recordAPICall(
    endpoint: string,
    method: string,
    duration: number,
    statusCode?: number,
    success: boolean = true
  ): void {
    const metric: APICallMetric = {
      endpoint,
      method,
      duration,
      statusCode,
      success,
      timestamp: new Date(),
    };

    this.apiCallMetrics.push(metric);

    // Keep only the most recent metrics
    if (this.apiCallMetrics.length > this.maxMetrics) {
      this.apiCallMetrics.shift();
    }

    console.log(
      `[PerformanceMonitoring] API call: ${method} ${endpoint} took ${duration}ms (${success ? 'success' : 'failed'})`
    );

    // Record as a general metric too
    this.recordMetric({
      name: `api_call_${method}_${endpoint}`,
      value: duration,
      unit: 'ms',
      metadata: { endpoint, method, statusCode, success },
    });
  }

  /**
   * Track interaction completion time
   */
  trackInteraction(name: string, callback: () => void | Promise<void>): void {
    if (!this.isEnabled) {
      callback();
      return;
    }

    const startTime = Date.now();

    InteractionManager.runAfterInteractions(async () => {
      try {
        await callback();
        const duration = Date.now() - startTime;
        
        this.recordMetric({
          name: `interaction_${name}`,
          value: duration,
          unit: 'ms',
          metadata: { interactionName: name },
        });
      } catch (error) {
        console.error(`[PerformanceMonitoring] Interaction ${name} failed:`, error);
      }
    });
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get screen load metrics
   */
  getScreenLoadMetrics(): ScreenLoadMetric[] {
    return [...this.screenLoadMetrics];
  }

  /**
   * Get API call metrics
   */
  getAPICallMetrics(): APICallMetric[] {
    return [...this.apiCallMetrics];
  }

  /**
   * Get average metric value by name
   */
  getAverageMetric(name: string): number {
    const matchingMetrics = this.metrics.filter((m) => m.name === name);
    if (matchingMetrics.length === 0) return 0;

    const sum = matchingMetrics.reduce((acc, m) => acc + m.value, 0);
    return sum / matchingMetrics.length;
  }

  /**
   * Get average screen load time
   */
  getAverageScreenLoadTime(screenName?: string): number {
    const metrics = screenName
      ? this.screenLoadMetrics.filter((m) => m.screenName === screenName)
      : this.screenLoadMetrics;

    if (metrics.length === 0) return 0;

    const sum = metrics.reduce((acc, m) => acc + m.loadTime, 0);
    return sum / metrics.length;
  }

  /**
   * Get average API call duration
   */
  getAverageAPICallDuration(endpoint?: string): number {
    const metrics = endpoint
      ? this.apiCallMetrics.filter((m) => m.endpoint === endpoint)
      : this.apiCallMetrics;

    if (metrics.length === 0) return 0;

    const sum = metrics.reduce((acc, m) => acc + m.duration, 0);
    return sum / metrics.length;
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
    this.screenLoadMetrics = [];
    this.apiCallMetrics = [];
    console.log('[PerformanceMonitoring] All metrics cleared');
  }

  /**
   * Generate performance report
   */
  generateReport(): {
    totalMetrics: number;
    averageScreenLoadTime: number;
    averageAPICallDuration: number;
    slowestScreens: Array<{ screenName: string; loadTime: number }>;
    slowestAPICalls: Array<{ endpoint: string; duration: number }>;
  } {
    // Get slowest screens
    const slowestScreens = [...this.screenLoadMetrics]
      .sort((a, b) => b.loadTime - a.loadTime)
      .slice(0, 5)
      .map((m) => ({ screenName: m.screenName, loadTime: m.loadTime }));

    // Get slowest API calls
    const slowestAPICalls = [...this.apiCallMetrics]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5)
      .map((m) => ({ endpoint: m.endpoint, duration: m.duration }));

    return {
      totalMetrics: this.metrics.length,
      averageScreenLoadTime: this.getAverageScreenLoadTime(),
      averageAPICallDuration: this.getAverageAPICallDuration(),
      slowestScreens,
      slowestAPICalls,
    };
  }
}

// Export singleton instance
export const performanceMonitoringService = new PerformanceMonitoringServiceClass();
