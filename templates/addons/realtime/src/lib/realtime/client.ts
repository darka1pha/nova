import type { RealtimeEvent } from "./types";

export type EventCallback<T = unknown> = (event: RealtimeEvent<T>) => void;

export class RealtimeClient {
  private eventSource: EventSource | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private isConnected = false;
  private url: string;

  constructor(url = "/api/realtime") {
    this.url = url;
  }

  connect(): void {
    if (typeof window === "undefined" || this.eventSource) return;

    this.eventSource = new EventSource(this.url);

    this.eventSource.onopen = () => {
      this.isConnected = true;
    };

    this.eventSource.onmessage = (event) => {
      try {
        const parsed: RealtimeEvent = JSON.parse(event.data);
        this.dispatch(parsed.type, parsed);
        this.dispatch("*", parsed);
      } catch {
        // Heartbeat or unparseable event
      }
    };

    this.eventSource.onerror = () => {
      this.isConnected = false;
      this.disconnect();
      setTimeout(() => this.connect(), 5000);
    };
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      this.isConnected = false;
    }
  }

  subscribe<T = unknown>(type: string, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    const set = this.listeners.get(type)!;
    set.add(callback as EventCallback);

    if (!this.eventSource) {
      this.connect();
    }

    return () => {
      set.delete(callback as EventCallback);
      if (set.size === 0) {
        this.listeners.delete(type);
      }
    };
  }

  private dispatch(type: string, event: RealtimeEvent): void {
    const callbacks = this.listeners.get(type);
    if (callbacks) {
      for (const cb of callbacks) {
        cb(event);
      }
    }
  }
}

export const realtime = new RealtimeClient();
