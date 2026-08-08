# Drizzle ORM

Singleton `postgres-js` client + Drizzle instance, guarded against creating
multiple connections during Next.js dev hot-reload (see `docs/drizzle.md`
at the project root for commands).

Import `db` from `@/lib/db/client` in Server Components, Server Actions, or
Route Handlers only — never in Client Components.

Schema lives in `schema.ts`, colocated with the client rather than in a
top-level `drizzle/` folder, so editors resolve `@/lib/db/schema` alongside
the client that consumes it. Generated SQL migrations are written to
`drizzle/migrations` at the project root by `drizzle-kit generate`.