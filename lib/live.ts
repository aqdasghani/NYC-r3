/**
 * Tiny framework-free pub/sub for backend WebSocket events.
 * The LiveProvider opens `/ws/dashboard` and forwards each message here;
 * pages subscribe (e.g. to refetch after `inventory_updated`).
 */
export interface LiveEvent {
  type: string;
  payload: Record<string, unknown>;
}

type Listener = (event: LiveEvent) => void;

const listeners = new Set<Listener>();

export function subscribeLive(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitLive(event: LiveEvent): void {
  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      // A misbehaving listener must not kill the others.
    }
  }
}
