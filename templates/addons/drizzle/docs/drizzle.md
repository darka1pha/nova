# Drizzle ORM (optional module)

If selected during generation, this project uses [Drizzle](https://orm.drizzle.team)
instead of Prisma for database access. The two are mutually exclusive —
Nova will refuse to generate (or `nova add`) a project with both enabled,
since they'd both try to own `DATABASE_URL`-backed schema and migrations,
and would contribute colliding `db:*` scripts.

## Why Drizzle here

Drizzle is included as the lightweight alternative to Prisma's more
opinionated, code-generation-heavy client: it compiles to plain SQL,
has no separate generated client step, and its schema is just TypeScript
you can read top to bottom. Choose Drizzle when you want closer-to-SQL
control and a smaller runtime; choose Prisma when you want Prisma Studio,
a larger ecosystem of examples, or you're already relying on its migration
tooling elsewhere.

## What's included

- `drizzle.config.ts` — `drizzle-kit` configuration, reading `schema.ts`
  and `DATABASE_URL`.
- `src/lib/db/schema.ts` — starter schema with a `users` table.
- `src/lib/db/client.ts` — singleton `postgres-js` client + Drizzle
  instance, guarded against creating multiple connections during
  Next.js dev hot-reload.

## Commands

```bash
npm run db:generate   # generate SQL migrations from schema.ts
npm run db:migrate    # apply pending migrations
npm run db:push       # push schema directly to the database (dev convenience)
npm run db:studio     # open Drizzle Studio
```

These scripts call `drizzle-kit` directly, so they work identically
whichever package manager you selected (npm, pnpm, yarn, or bun) — replace
`npm run` with your package manager's run command, e.g. `pnpm db:generate`.

Set `DATABASE_URL` in `.env` before running any of the above.

## Switching drivers

The default driver is `postgres` (postgres-js). To target MySQL or SQLite
instead:

1. Swap the `postgres`/`drizzle-orm/postgres-js` imports in
   `src/lib/db/client.ts` for the equivalent driver (`mysql2`,
   `drizzle-orm/mysql2`, or `better-sqlite3`, `drizzle-orm/better-sqlite3`).
2. Update `dialect` in `drizzle.config.ts` to match (`"mysql"` or
   `"sqlite"`).
3. Update `pgTable` calls in `schema.ts` to the matching table helper
   (`mysqlTable` / `sqliteTable`) and column types.

## Usage

```ts
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

export async function listUsers() {
  return db.select().from(users);
}
```

## Common pitfalls

- Don't import `src/lib/db/client.ts` from a Client Component — it uses
  `server-only` and will fail the build.
- `db:push` is a development convenience that skips migration files —
  prefer `db:generate` + `db:migrate` for anything you intend to commit
  and replay in other environments.