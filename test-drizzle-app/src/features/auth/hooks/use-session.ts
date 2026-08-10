"use client";

import { useEffect, useState } from "react";

import type { Session } from "@/features/auth/types";

/**
 * Client-side session hook. Fetches the current session once on mount from
 * a lightweight `/api/auth/session` endpoint (add one backed by your auth
 * provider) and exposes loading state for UI gating.
 */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/auth/session", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setSession(data);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { session, isLoading };
}
