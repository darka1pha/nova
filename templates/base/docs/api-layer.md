# API Layer

See `src/lib/api/README.md` for the full write-up. Summary:

- Two clients: `client.ts` (server-only) and `browser-client.ts` (Client
  Components), sharing the same `ApiRequestConfig` / `ApiError` shapes from
  `types.ts`.
- Built-in timeout (`AbortController`), retry with backoff on network errors
  and 5xx, and automatic access-token refresh on 401.
- Request/response interceptors registered via `interceptors.ts`.
- Services (`src/services/*`) wrap the client with business-shaped methods -
  features should call services, not the client directly.

## Adding a new endpoint

1. Add a method to the relevant file in `src/services/`.
2. Add response/request types to `src/types/` or the feature's `types/`.
3. Call the service from a Server Component, Server Action, or Route
   Handler (server) - or from a Client Component via a hook that calls the
   browser client.

## Server fetch examples

```ts
import { api } from "@/lib/api/client";
import type { PaginatedResponse } from "@/types/api";

type User = {
  id: string;
  name: string;
  email: string;
};

export async function listUsers(page = 1) {
  return api.get<PaginatedResponse<User>>("/users", {
    params: { page, pageSize: 20 },
    next: { tags: ["users"], revalidate: 60 },
  });
}

export async function updateUser(id: string, input: Partial<User>) {
  return api.patch<User>(`/users/${id}`, input, {
    retries: 0,
    timeoutMs: 5000,
  });
}
```

## Browser fetch examples

```tsx
"use client";

import { useEffect, useState } from "react";

import { browserApi } from "@/lib/api/browser-client";

export function UserCountBadge() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    browserApi
      .get<{ total: number }>("/api/users/summary", { skipAuth: true })
      .then((data) => setCount(data.total))
      .catch(() => setCount(0));
  }, []);

  return <span>{count ?? "..."}</span>;
}
```

## Raw fetch example

Reach for raw `fetch` only when you need behavior the shared client should not
own, such as streaming or a third-party public endpoint.

```ts
export async function getExchangeRates() {
  const response = await fetch("https://api.example.com/rates", {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error("Could not load rates");
  }

  return response.json() as Promise<Record<string, number>>;
}
```
