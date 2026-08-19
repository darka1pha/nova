import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("x-webhook-signature") || request.headers.get("stripe-signature");
    const body = await request.text();

    if (!body) {
      return NextResponse.json({ error: "Empty webhook payload" }, { status: 400 });
    }

    // In production: verify signature against process.env.PAYMENTS_WEBHOOK_SECRET
    let event: { type?: string; data?: unknown };
    try {
      event = JSON.parse(body);
    } catch {
      event = { type: "mock.event" };
    }

    switch (event.type) {
      case "checkout.session.completed":
      case "subscription.created":
      case "subscription.updated":
      case "subscription.canceled":
        // Handle billing event transitions
        break;
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook handler failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
