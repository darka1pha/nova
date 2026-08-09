# API Layer

## Why it exists

A single, typed place for all HTTP calls so retries, timeouts, auth headers,
and error shapes are consistent everywhere instead of re-implemented per
fetch call.

## How it works

- `client.ts` - server-only client (Server Components, Server Actions, Route
  Handlers). Reads the access token from an httpOnly cookie.
- `browser-client.ts` - Client Component-safe client. Reads the token from
  in-memory storage and proxies refreshes through `/api/auth/refresh`.
- `interceptors.ts` - register request/response interceptors (e.g. logging,
  analytics) without modifying the client itself.
- `types.ts` - `ApiError`, `ApiRequestConfig`, pagination types shared across
  both clients.

Both clients JSON-serialize `json`, abort via `AbortController` on
`timeoutMs`, retry on network errors and 502/503/504 up to `retries` times
with exponential backoff, and transparently refresh the access token once on
a 401 before retrying the original request.

## Examples

```ts
await api.get("/users", {
  params: { page: 1, pageSize: 20 },
  next: { tags: ["users"], revalidate: 60 },
});

await api.post("/users", { name: "Ava", email: "ava@example.com" }, { retries: 0 });

await api.delete("/users/usr_123", { timeoutMs: 3000 });
```

## How to customize

- Change `DEFAULT_TIMEOUT_MS` / `DEFAULT_RETRIES` per environment.
- Add interceptors for request logging or correlation IDs.
- Swap the error body shape in `parseErrorBody` to match your backend.

## Common pitfalls

- Don't import `client.ts` from a Client Component - it uses `server-only`
  and will fail the build. Use `browser-client.ts` instead.
- If your backend doesn't return `{ message, code }` on errors, adjust
  `ApiError` construction accordingly.
