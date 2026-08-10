# tRPC Integration

This project includes a production-ready **tRPC** setup configured for the Next.js App Router.

## Architecture

- **`src/app/api/trpc/[trpc]/route.ts`**: The App Router HTTP handler using `@trpc/server/adapters/fetch`.
- **`src/lib/trpc/server.ts`**: Procedure helpers (`publicProcedure`), context initialization (`createTRPCContext`), and superjson transformer.
- **`src/lib/trpc/root.ts`**: Root application router (`AppRouter`) and server-side caller factory (`createCaller`).
- **`src/lib/trpc/routers/`**: Sub-routers organizing procedures by domain.
- **`src/lib/trpc/client.ts`**: Client configuration and `createTRPCReact<AppRouter>()` hook creator.
- **`src/lib/trpc/provider.tsx`**: `TRPCProvider` wrapping React Query.

## Writing a New Router

1. Create a router in `src/lib/trpc/routers/`:

```ts
import { z } from "zod";
import { publicProcedure, router } from "../server";

export const postsRouter = router({
  list: publicProcedure.query(async () => {
    return [{ id: 1, title: "First Post" }];
  }),

  create: publicProcedure
    .input(z.object({ title: z.string().min(1) }))
    .mutation(async ({ input }) => {
      return { id: 2, title: input.title };
    }),
});
```

2. Register it in `src/lib/trpc/root.ts`:

```ts
import { postsRouter } from "./routers/posts";

export const appRouter = router({
  example: exampleRouter,
  posts: postsRouter,
});
```

## Client Component Usage

```tsx
"use client";

import { trpc } from "@/lib/trpc/client";

export function PostList() {
  const { data, isLoading } = trpc.posts.list.useQuery();

  if (isLoading) return <div>Loading...</div>;

  return (
    <ul>
      {data?.map((p) => <li key={p.id}>{p.title}</li>)}
    </ul>
  );
}
```

## Server Component & Server Action Usage

You can call procedures directly without HTTP overhead using `createCaller`:

```tsx
import { createCaller } from "@/lib/trpc/root";
import { createTRPCContext } from "@/lib/trpc/server";
import { headers } from "next/headers";

export default async function Page() {
  const ctx = await createTRPCContext({ headers: await headers() });
  const caller = createCaller(ctx);
  const posts = await caller.posts.list();

  return <div>{posts.length} posts</div>;
}
```
