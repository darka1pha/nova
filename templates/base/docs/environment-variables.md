# Environment Variables

See `.env.example` for the full list. Categories:

- **App** — public URL/name, safe to expose via `NEXT_PUBLIC_*`.
- **Database** — `DATABASE_URL`, used by Prisma if enabled.
- **Authentication** — token secrets/TTLs for the custom token rotation
  system, or Better Auth secrets if that module is enabled.
- **External APIs** — base URL/timeout for `src/lib/api`.

Never commit `.env` — only `.env.example` is tracked. Add new variables to
both files together, and to `src/config/env.ts` if they're required for the
app to boot.
