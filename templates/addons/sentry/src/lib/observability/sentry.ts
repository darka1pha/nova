import * as Sentry from "@sentry/nextjs";

export function identifyUserForErrors(user: { id: string; email?: string }) {
  Sentry.setUser({ id: user.id, email: user.email });
}

export function captureActionException(error: unknown, context?: Record<string, unknown>) {
  Sentry.captureException(error, {
    contexts: context ? { action: context } : undefined,
  });
}
