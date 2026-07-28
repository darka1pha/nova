# Prisma

Singleton client guarded against multiple instances during Next.js dev
hot-reload (see `docs/prisma.md` at the project root for commands).

Import `prisma` from `@/lib/prisma/client` in Server Components, Server
Actions, or Route Handlers only — never in Client Components.
