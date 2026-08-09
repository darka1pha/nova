"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function SupabaseAuthPanel() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        setUserEmail(data.user?.email ?? null);
        setLoading(false);
      });
    } catch {
      setLoading(false);
    }
  }, []);

  return (
    <div className="rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm">
      <h3 className="text-lg font-semibold tracking-tight">Supabase Client & Auth Demo</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        SSR-ready auth, database queries, and storage hooks using <code>@supabase/ssr</code>.
      </p>

      <div className="mt-4 rounded-lg bg-muted/50 p-4">
        <p className="text-sm font-medium">Authentication State:</p>
        {loading ? (
          <p className="text-xs text-muted-foreground">Checking session...</p>
        ) : (
          <p className="text-sm font-mono mt-1 text-primary">
            {userEmail ? `Logged in as: ${userEmail}` : "Not logged in (anonymous session)"}
          </p>
        )}
      </div>

      <div className="mt-4 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick Setup</p>
        <p className="text-xs text-muted-foreground">
          Configure <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in <code>.env</code> to connect to your Supabase project.
        </p>
      </div>
    </div>
  );
}
