"use client";

import React, { useEffect, useState } from "react";
import { Bell, Check, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { realtime } from "@/lib/realtime/client";
import type { RealtimeEvent, NotificationPayload } from "@/lib/realtime/types";

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<RealtimeEvent<NotificationPayload>[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = realtime.subscribe<NotificationPayload>("notification", (event) => {
      setNotifications((prev) => [event, ...prev].slice(0, 20));
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <div className="relative inline-block">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {notifications.length > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full animate-pulse" />
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-popover text-popover-foreground border rounded-lg shadow-lg z-50 p-4">
          <div className="flex items-center justify-between pb-3 border-b mb-3">
            <div className="flex items-center space-x-2">
              <Radio className="w-4 h-4 text-green-500 animate-pulse" />
              <span className="font-semibold text-sm">Live Notifications</span>
            </div>
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setNotifications([])}
              >
                Clear all
              </Button>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2">
            {notifications.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No live notifications yet</p>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="p-2.5 rounded-md bg-muted/50 text-xs flex flex-col space-y-1">
                  <div className="font-medium text-foreground">{n.payload.title}</div>
                  <div className="text-muted-foreground">{n.payload.message}</div>
                  <div className="text-[10px] text-muted-foreground/60">
                    {new Date(n.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
