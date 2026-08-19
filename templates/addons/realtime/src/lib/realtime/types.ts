export interface RealtimeEvent<T = unknown> {
  id: string;
  type: string;
  channel?: string;
  payload: T;
  timestamp: number;
}

export interface PresenceState {
  userId: string;
  status: "online" | "away" | "offline";
  lastSeen: number;
}

export interface NotificationPayload {
  title: string;
  message: string;
  level?: "info" | "success" | "warning" | "error";
  link?: string;
}
