import type { RealtimeEvent } from "./types";

export function formatSSEMessage<T>(event: RealtimeEvent<T>): string {
  return `id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

export function createEvent<T>(type: string, payload: T, channel?: string): RealtimeEvent<T> {
  return {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    type,
    channel,
    payload,
    timestamp: Date.now(),
  };
}
