/**
 * LoggingService — centralised client-side logging that flushes to the backend.
 *
 * Log types:
 *   validation  – form validation failure
 *   button      – significant button tap
 *   error       – unhandled / API error
 *   api_error   – failed network request
 */

import TokenStorage from './auth/TokenStorage';

import { API_BASE_URL } from './api/config';
const API_URL = API_BASE_URL;
const FLUSH_INTERVAL = 10_000; // 10 seconds
const MAX_QUEUE = 200;

export interface LogEntry {
  logType: 'validation' | 'button' | 'error' | 'api_error';
  message: string;
  userId?: string | null;
  screen?: string;
  metadata?: Record<string, any>;
}

class LoggingServiceClass {
  private queue: LogEntry[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private userId: string | null = null;

  /** Call once at app startup */
  initialize(): void {
    this.timer = setInterval(() => this.flush(), FLUSH_INTERVAL);

    // Catch unhandled promise rejections
    const origHandler = (globalThis as any).onunhandledrejection;
    (globalThis as any).onunhandledrejection = (e: any) => {
      const reason = e?.reason ?? e;
      this.logError('UnhandledPromiseRejection', 'global', {
        message: reason?.message ?? String(reason),
        stack: reason?.stack,
      });
      if (origHandler) origHandler(e);
    };
  }

  /** Keep userId in sync with auth state */
  setUserId(id: string | null): void {
    this.userId = id;
  }

  // ── Public helpers ──────────────────────────────────────────────

  logValidation(
    screen: string,
    field: string,
    rule: string,
    message: string,
  ): void {
    this.enqueue({
      logType: 'validation',
      message: `Validation failed: ${field} — ${rule}`,
      screen,
      metadata: { field, rule, displayMessage: message },
    });
  }

  logButton(
    buttonName: string,
    screen: string,
    extra?: Record<string, any>,
  ): void {
    this.enqueue({
      logType: 'button',
      message: `Button tapped: ${buttonName}`,
      screen,
      metadata: { buttonName, ...extra },
    });
  }

  logError(
    message: string,
    screen?: string,
    extra?: Record<string, any>,
  ): void {
    this.enqueue({
      logType: 'error',
      message,
      screen,
      metadata: extra,
    });
  }

  logApiError(
    endpoint: string,
    method: string,
    status: number | undefined,
    message: string,
    screen?: string,
  ): void {
    this.enqueue({
      logType: 'api_error',
      message: `API ${method} ${endpoint} failed: ${message}`,
      screen,
      metadata: { endpoint, method, status },
    });
  }

  // ── Internals ───────────────────────────────────────────────────

  private enqueue(entry: LogEntry): void {
    entry.userId = entry.userId ?? this.userId;
    entry.metadata = {
      ...entry.metadata,
      timestamp: new Date().toISOString(),
    };
    this.queue.push(entry);
    if (this.queue.length >= MAX_QUEUE) {
      this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.queue.length === 0) return;
    const batch = this.queue.splice(0, this.queue.length);

    try {
      // Resolve userId from storage if not set
      if (!this.userId) {
        const user = await TokenStorage.getUser();
        if (user?.id) this.userId = user.id;
      }
      // Stamp userId on entries that were queued before it was known
      const stamped = batch.map((e) => ({
        ...e,
        userId: e.userId ?? this.userId,
      }));

      const token = await TokenStorage.getAccessToken();
      await fetch(`${API_URL}/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(stamped),
      });
    } catch {
      // Re-queue on failure (drop if over limit to avoid memory leak)
      if (this.queue.length < MAX_QUEUE) {
        this.queue.unshift(...batch);
      }
    }
  }

  destroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.flush();
  }
}

export const loggingService = new LoggingServiceClass();
