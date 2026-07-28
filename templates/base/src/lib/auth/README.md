# Authentication Token Rotation

## Why it exists
Access tokens should be short-lived; refresh tokens keep the user logged in
without re-entering credentials. This module centralizes that rotation so
no feature code has to reason about token lifetimes directly.

## How it works
1. `token-store.ts` persists both tokens as httpOnly, secure, sameSite
   cookies (never readable by client JS).
2. `refresh.ts` exposes `refreshAccessToken()`, which coalesces concurrent
   refresh attempts (via a shared in-flight promise) so a burst of parallel
   401s triggers exactly one call to the backend's `/auth/refresh`.
3. `lib/api/client.ts` calls `refreshAccessToken()` automatically on a 401,
   retries the original request once with the new token, and clears tokens
   (effectively logging the user out) if the refresh itself fails.
4. `client-token-store.ts` mirrors the access token in memory for Client
   Components, updated via `/api/auth/refresh`.

## Flow
```
request -> 401 -> refreshAccessToken() -> success -> retry original request
                                        -> failure -> clearTokens() -> redirect to login
```

## How to customize
- Point `refresh.ts` at your real auth backend's refresh endpoint.
- Adjust cookie `maxAge` via `AUTH_ACCESS_TOKEN_TTL` / `AUTH_REFRESH_TOKEN_TTL`.
- If using Better Auth, this module can be replaced by its session helpers —
  see `docs/better-auth.md`.

## Backend integration
Your backend should expose:
- `POST /auth/login` → `{ accessToken, refreshToken }`
- `POST /auth/refresh` → `{ accessToken, refreshToken }` given a valid
  refresh token, `401` otherwise.

## Common pitfalls
- Never store the refresh token in `localStorage` or client-readable
  storage — that defeats the point of httpOnly cookies.
- Multiple simultaneous refresh calls will race unless you use the
  in-flight coalescing already implemented here — don't remove it.
