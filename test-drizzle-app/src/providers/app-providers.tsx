import type { ReactNode } from "react";

import { ThemeProvider } from "@/components/providers/theme-provider";

/**
 * Single composition root for every client-side provider.
 * Add new providers here (query client, auth context, etc.) instead of
 * nesting them ad hoc across the app.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider disableTransitionOnChange>
      {children}
    </ThemeProvider>
  );
}
