# Authentication & Token Rotation

Full details in `src/lib/auth/README.md`. This project ships a
provider-agnostic token rotation system out of the box:

- httpOnly, secure cookies for both access and refresh tokens.
- Automatic refresh on 401 with in-flight request coalescing.
- Logout-on-refresh-failure to avoid silent broken sessions.

If you selected **Better Auth** during generation, see
`docs/better-auth.md` — it replaces the custom token store with Better
Auth's session management while keeping the same `lib/api` integration
points.
