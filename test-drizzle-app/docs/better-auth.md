# Better Auth (optional module)

If selected during generation, `src/lib/auth/better-auth.ts` configures
Better Auth and exposes server/client helpers.

## Adding a provider
```ts
// src/lib/auth/better-auth.ts
export const auth = betterAuth({
  // ...
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },
});
```
Add the corresponding env vars to `.env.example` and `.env`, then restart
the dev server. See the Better Auth docs for the full list of supported
providers and their required credentials.

## Protected routes
Use `src/middleware/with-auth.ts` (merged into the root `middleware.ts`) to
gate routes by session presence, and `getServerSession()` inside Server
Components/Actions to read the current user.
