# Real-time Events & Streaming

Nova includes native Server-Sent Events (SSE) and event broadcasting abstraction for live updates, notifications, and telemetry.

## Using Realtime in Client Components

```tsx
import { useEffect } from "react";
import { realtime } from "@/lib/realtime/client";

export function LiveFeed() {
  useEffect(() => {
    const unsubscribe = realtime.subscribe("order:updated", (event) => {
      console.log("Order updated:", event.payload);
    });

    return () => unsubscribe();
  }, []);

  return <div>Listening for live updates...</div>;
}
```
