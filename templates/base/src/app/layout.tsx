import type { ReactNode } from "react";

// Root layout is intentionally minimal: locale-aware layout lives in
// app/[locale]/layout.tsx. This file exists so Next.js has a single HTML
// shell, per the official App Router + next-intl integration guide.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
