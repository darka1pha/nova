"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";

export function TRPCActionPanel() {
  const [name, setName] = useState("Developer");
  const helloQuery = trpc.example.hello.useQuery({ name });
  const itemsQuery = trpc.example.listItems.useQuery();

  return (
    <div className="rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm">
      <h3 className="text-lg font-semibold tracking-tight">tRPC Type-Safe API Demo</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Live data fetching powered by Next.js App Router and TanStack Query.
      </p>

      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          className="flex h-9 w-full max-w-xs rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      <div className="mt-4 rounded-lg bg-muted/50 p-4">
        <p className="text-sm font-medium">Server Response:</p>
        {helloQuery.isLoading ? (
          <p className="text-xs text-muted-foreground">Loading response...</p>
        ) : (
          <p className="text-sm text-primary font-mono mt-1">
            {helloQuery.data?.greeting ?? "No response"}
          </p>
        )}
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Features</p>
        <ul className="mt-2 space-y-1">
          {itemsQuery.data?.map((item) => (
            <li key={item.id} className="flex items-center text-xs text-foreground/80">
              <span className="mr-2 text-green-500">✓</span> {item.title}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
