/**
 * Crash Reporting Service
 * Handles error logging and crash reporting
 * In production, this would integrate with services like Sentry, Bugsnag, or Firebase Crashlytics
 */

import { ErrorInfo } from 'react';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import Constants from 'expo-constants';

export interface CrashReport {
  error: Error;
  errorInfo?: ErrorInfo;
  timestamp: Date;
  deviceInfo: DeviceInfo;
  appInfo: AppInfo;
  userInfo?: UserInfo;
  breadcrumbs?: Breadcrumb[];
}

export interface DeviceInfo {
  brand: string | null;
  manufacturer: string | null;
  modelName: string | null;
  osName: string | null;
  osVersion: string | null;
  platformApiLevel: number | null;
  deviceYearClass: number | null;
  totalMemory: number | null;
}

export interface AppInfo {
  appVersion: string | null;
  buildVersion: string | null;
  bundleId: string | null;
  expoVersion: string;
}

export interface UserInfo {
  userId?: string;
  email?: string;
  username?: string;
}

export interface Breadcrumb {
  timestamp: Date;
  category: string;
  message: string;
  level: 'debug' | 'info' | 'warning' | 'error';
  data?: Record<string, any>;
}

class CrashReportingServiceClass {
  private breadcrumbs: Breadcrumb[] = [];
  private maxBreadcrumbs = 50;
  private userInfo: UserInfo | null = null;
  private isEnabled = true;

  /**
   * Initialize the crash reporting service
   */
  async initialize(): Promise<void> {
    console.log('[CrashReporting] Service initialized');
    
    // In production, initialize your crash reporting SDK here
    // Example: Sentry.init({ dsn: 'your-dsn' });
  }

  /**
   * Enable or disable crash reporting
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    console.log(`[CrashReporting] Service ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Set user information for crash reports
   */
  setUser(userInfo: UserInfo | null): void {
    this.userInfo = userInfo;
    console.log('[CrashReporting] User info updated');
  }

  /**
   * Add a breadcrumb for debugging
   */
  addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'>): void {
    if (!this.isEnabled) return;

    const fullBreadcrumb: Breadcrumb = {
      ...breadcrumb,
      timestamp: new Date(),
    };

    this.breadcrumbs.push(fullBreadcrumb);

    // Keep only the most recent breadcrumbs
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }

    console.log('[CrashReporting] Breadcrumb added:', breadcrumb.message);
  }

  /**
   * Report a caught error
   */
  async reportError(error: Error, errorInfo?: ErrorInfo): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const crashReport = await this.createCrashReport(error, errorInfo);
      
      // Log to console in development
      if (__DEV__) {
        console.error('[CrashReporting] Error reported:', crashReport);
      }

      // In production, send to crash reporting service
      // Example: Sentry.captureException(error, { extra: crashReport });
      
      // For now, just log it
      this.logCrashReport(crashReport);
    } catch (err) {
      console.error('[CrashReporting] Failed to report error:', err);
    }
  }

  /**
   * Report a fatal crash
   */
  async reportCrash(error: Error, errorInfo?: ErrorInfo): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const crashReport = await this.createCrashReport(error, errorInfo);
      
      // Mark as fatal
      (crashReport as any).fatal = true;

      // Log to console
      console.error('[CrashReporting] Fatal crash reported:', crashReport);

      // In production, send to crash reporting service with high priority
      // Example: Sentry.captureException(error, { level: 'fatal', extra: crashReport });
      
      this.logCrashReport(crashReport);
    } catch (err) {
      console.error('[CrashReporting] Failed to report crash:', err);
    }
  }

  /**
   * Create a crash report with device and app info
   */
  private async createCrashReport(
    error: Error,
    errorInfo?: ErrorInfo
  ): Promise<CrashReport> {
    const deviceInfo = await this.getDeviceInfo();
    const appInfo = this.getAppInfo();

    return {
      error,
      errorInfo,
      timestamp: new Date(),
      deviceInfo,
      appInfo,
      userInfo: this.userInfo || undefined,
      breadcrumbs: [...this.breadcrumbs],
    };
  }

  /**
   * Get device information
   */
  private async getDeviceInfo(): Promise<DeviceInfo> {
    return {
      brand: Device.brand,
      manufacturer: Device.manufacturer,
      modelName: Device.modelName,
      osName: Device.osName,
      osVersion: Device.osVersion,
      platformApiLevel: Device.platformApiLevel,
      deviceYearClass: Device.deviceYearClass,
      totalMemory: Device.totalMemory,
    };
  }

  /**
   * Get app information
   */
  private getAppInfo(): AppInfo {
    return {
      appVersion: Application.nativeApplicationVersion,
      buildVersion: Application.nativeBuildVersion,
      bundleId: Application.applicationId,
      expoVersion: Constants.expoVersion || 'unknown',
    };
  }

  /**
   * Log crash report (for development/debugging)
   */
  private logCrashReport(report: CrashReport): void {
    console.group('[CrashReporting] Crash Report');
    console.log('Timestamp:', report.timestamp.toISOString());
    console.log('Error:', report.error.message);
    console.log('Stack:', report.error.stack);
    
    if (report.errorInfo) {
      console.log('Component Stack:', report.errorInfo.componentStack);
    }
    
    console.log('Device:', report.deviceInfo);
    console.log('App:', report.appInfo);
    
    if (report.userInfo) {
      console.log('User:', report.userInfo);
    }
    
    if (report.breadcrumbs && report.breadcrumbs.length > 0) {
      console.log('Breadcrumbs:', report.breadcrumbs);
    }
    
    console.groupEnd();
  }

  /**
   * Clear all breadcrumbs
   */
  clearBreadcrumbs(): void {
    this.breadcrumbs = [];
    console.log('[CrashReporting] Breadcrumbs cleared');
  }

  /**
   * Get current breadcrumbs
   */
  getBreadcrumbs(): Breadcrumb[] {
    return [...this.breadcrumbs];
  }
}

// Export singleton instance
export const crashReportingService = new CrashReportingServiceClass();
