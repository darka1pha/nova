# Sentry

Sentry is wired for client, server, and edge runtime error capture.

Add these variables to `.env` and your deployment platform:

```bash
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_TRACES_SAMPLE_RATE=0.1
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_ORG=
SENTRY_PROJECT=
```

Use `src/lib/observability/sentry.ts` for app-level helpers:

```ts
import { captureActionException } from "@/lib/observability/sentry";

try {
  await doWork();
} catch (error) {
  captureActionException(error, { action: "invite-user" });
  return { success: false, error: "Could not invite user." };
}
```

Keep personally identifiable data out of breadcrumbs and extra context unless
your retention policy explicitly allows it.
