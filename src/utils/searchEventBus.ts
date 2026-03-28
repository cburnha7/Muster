type Listener = () => void;
type QueryListener = (query: string) => void;

/** Tiny pub/sub so the header search pill can tell screens to open search. */
class SearchEventBus {
  private listeners: Set<Listener> = new Set();
  private tabListeners: Map<string, Set<Listener>> = new Map();
  private queryListeners: Set<QueryListener> = new Set();
  private closeListeners: Set<Listener> = new Set();

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(): void {
    this.listeners.forEach((fn) => fn());
  }

  subscribeTab(tabName: string, fn: Listener): () => void {
    if (!this.tabListeners.has(tabName)) {
      this.tabListeners.set(tabName, new Set());
    }
    this.tabListeners.get(tabName)!.add(fn);
    return () => this.tabListeners.get(tabName)?.delete(fn);
  }

  emitTab(tabName: string): void {
    this.tabListeners.get(tabName)?.forEach((fn) => fn());
  }

  subscribeQuery(fn: QueryListener): () => void {
    this.queryListeners.add(fn);
    return () => this.queryListeners.delete(fn);
  }

  emitQuery(query: string): void {
    this.queryListeners.forEach((fn) => fn(query));
  }

  /** Subscribe to close-all event (fired on tab press) */
  subscribeClose(fn: Listener): () => void {
    this.closeListeners.add(fn);
    return () => this.closeListeners.delete(fn);
  }

  /** Close all open search modals */
  emitClose(): void {
    this.closeListeners.forEach((fn) => fn());
  }
}

export const searchEventBus = new SearchEventBus();
