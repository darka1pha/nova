# Better Auth integration notes

This addon adds `better-auth.ts` (server config) and `better-auth-client.ts`
(React hooks: `useSession`, `signIn`, `signOut`, `signUp`) alongside the
default custom token-rotation system already in this folder.

**Pick one.** If you're using Better Auth, remove `token-store.ts` and
`refresh.ts` usage from `lib/api/client.ts` and replace it with Better
Auth's session cookie handling — Better Auth manages its own httpOnly
session cookie and refresh, so the custom rotation logic becomes redundant.

See `docs/better-auth.md` for adding OAuth providers and protecting routes.
