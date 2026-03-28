type Listener = () => void;
type QueryListener = (query: string) => void;

/** Tiny pub/sub so the header search pill can tell screens to open search. */
class SearchEventBus {
  private listeners: Set<Listener> = new Set();
  private tabListeners: Map<string, Set<Listener>> = new Map();
  private queryListeners: Set<QueryListener> = new Set();

  /** Subscribe to the home search event */
  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Emit the home search event */
  emit(): void {
    this.listeners.forEach((fn) => fn());
  }

  /** Subscribe to a tab-specific search focus event */
  subscribeTab(tabName: string, fn: Listener): () => void {
    if (!this.tabListeners.has(tabName)) {
      this.tabListeners.set(tabName, new Set());
    }
    this.tabListeners.get(tabName)!.add(fn);
    return () => this.tabListeners.get(tabName)?.delete(fn);
  }

  /** Emit a tab-specific search focus event */
  emitTab(tabName: string): void {
    this.tabListeners.get(tabName)?.forEach((fn) => fn());
  }

  /** Subscribe to query changes from the header pill */
  subscribeQuery(fn: QueryListener): () => void {
    this.queryListeners.add(fn);
    return () => this.queryListeners.delete(fn);
  }

  /** Emit a query change */
  emitQuery(query: string): void {
    this.queryListeners.forEach((fn) => fn(query));
  }
}

export const searchEventBus = new SearchEventBus();
