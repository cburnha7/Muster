type Listener = () => void;

/** Tiny pub/sub so the header search pill can tell HomeScreen to open the modal. */
class SearchEventBus {
  private listeners: Set<Listener> = new Set();

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(): void {
    this.listeners.forEach((fn) => fn());
  }
}

export const searchEventBus = new SearchEventBus();
