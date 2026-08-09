# Prisma (optional module)

If selected during generation:

- `prisma/schema.prisma` — starter schema with a `User` model.
- `src/lib/prisma/client.ts` — singleton client, guarded against creating
  multiple instances during Next.js dev hot-reload.
- `prisma/seed.ts` — example seed script (`npm run db:seed`).

## Commands
```bash
npm run db:generate   # regenerate the Prisma client after schema changes
npm run db:migrate    # create + apply a migration in development
npm run db:studio     # open Prisma Studio
```

Set `DATABASE_URL` in `.env` before running any of the above.
