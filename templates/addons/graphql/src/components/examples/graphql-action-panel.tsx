"use client";

import { useEffect, useState } from "react";
import { graphqlClient } from "@/lib/graphql/client";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function GraphQLActionPanel() {
  const [greeting, setGreeting] = useState<string>("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await graphqlClient.request<{ hello: string; users: User[] }>(/* GraphQL */ `
          query InitialData {
            hello(name: "Nova Developer")
            users {
              id
              name
              email
              role
            }
          }
        `);
        setGreeting(data.hello);
        setUsers(data.users);
      } catch (err) {
        console.error("GraphQL request failed", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <div className="rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm">
      <h3 className="text-lg font-semibold tracking-tight">GraphQL Yoga & Client Demo</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Production-ready GraphQL endpoint with GraphiQL IDE at <code>/api/graphql</code>.
      </p>

      <div className="mt-4 rounded-lg bg-muted/50 p-4">
        <p className="text-sm font-medium">Hello Query:</p>
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading GraphQL query...</p>
        ) : (
          <p className="text-sm text-primary font-mono mt-1">{greeting}</p>
        )}
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Users</p>
        <div className="mt-2 space-y-2">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between rounded border border-border/50 bg-background/50 px-3 py-2 text-xs">
              <div>
                <span className="font-medium text-foreground">{u.name}</span>
                <span className="ml-2 text-muted-foreground">({u.email})</span>
              </div>
              <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary uppercase">{u.role}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
