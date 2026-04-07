type Listener = () => void;

/** Tiny pub/sub to trigger a notifications refresh from anywhere (e.g. after debrief submit). */
class NotificationsEventBus {
  private listeners: Set<Listener> = new Set();

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(): void {
    this.listeners.forEach(fn => fn());
  }
}

export const notificationsEventBus = new NotificationsEventBus();
