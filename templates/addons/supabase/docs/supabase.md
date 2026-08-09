# Supabase Integration

This project includes an official **Supabase** setup configured for Next.js App Router using [`@supabase/ssr`](https://supabase.com/docs/guides/auth/server-side/nextjs).

## Architecture

- **`src/lib/supabase/client.ts`**: Browser client for Client Components (`createBrowserClient`).
- **`src/lib/supabase/server.ts`**: Server client for Server Components, Route Handlers, and Server Actions (`createServerClient` with `next/headers` cookies).
- **`src/lib/supabase/middleware.ts`**: Session refresh helper (`updateSession`).
- **`src/lib/supabase/types.ts`**: TypeScript definitions for your database schema.

## Environment Variables

Add to your `.env` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... # Server-only operations
```

## Server Component Usage

```tsx
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: profiles } = await supabase.from("profiles").select("*");

  return (
    <div>
      {profiles?.map((p) => (
        <p key={p.id}>{p.username}</p>
      ))}
    </div>
  );
}
```

## Client Component Usage

```tsx
"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export function UserGreeting() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  return <div>{email ? `Hello, ${email}` : "Not logged in"}</div>;
}
```

## Generating Types

To generate TypeScript types from your live database schema:

```bash
npx supabase gen types typescript --project-id <your-project-id> > src/lib/supabase/types.ts
```

## Interactions with Other Plugins

- **Prisma & Drizzle**: You can connect Prisma or Drizzle directly to your Supabase PostgreSQL database by placing the connection pooler URL into `DATABASE_URL`, while utilizing the Supabase JS SDK for Storage, Realtime, and Auth.
- **Better Auth**: If you choose Better Auth for session handling, you can use Supabase purely for PostgreSQL database storage and object storage.
