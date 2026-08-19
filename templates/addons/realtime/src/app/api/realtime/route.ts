import { formatSSEMessage, createEvent } from "@/lib/realtime/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      const initialEvent = createEvent("connected", { message: "Realtime connected" });
      controller.enqueue(encoder.encode(formatSSEMessage(initialEvent)));

      // Keepalive heartbeat
      const interval = setInterval(() => {
        try {
          const heartbeat = createEvent("ping", { time: Date.now() });
          controller.enqueue(encoder.encode(formatSSEMessage(heartbeat)));
        } catch {
          clearInterval(interval);
        }
      }, 15000);

      // Clean up on stream cancel
      return () => {
        clearInterval(interval);
      };
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
