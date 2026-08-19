# Payments & Billing Architecture

Nova provides a payment provider abstraction architecture for subscriptions, one-time checkout sessions, and webhook processing.

## Client Usage

```typescript
import { payments } from "@/lib/payments/client";

const session = await payments.createCheckoutSession({
  planId: "pro",
  billingCycle: "monthly",
  successUrl: "https://example.com/dashboard?payment=success",
  cancelUrl: "https://example.com/pricing",
});

window.location.href = session.checkoutUrl;
```
