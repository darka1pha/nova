import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

// Prevents exhausting the DB connection pool from creating a new
// postgres-js client on every hot-reload in development - same guard
// pattern as the Prisma addon's client singleton.
const globalForDb = globalThis as unknown as { queryClient?: ReturnType<typeof postgres> };

const queryClient =
  globalForDb.queryClient ?? postgres(process.env.DATABASE_URL ?? "", { max: 1 });

if (process.env.NODE_ENV !== "production") {
  globalForDb.queryClient = queryClient;
}

export const db = drizzle(queryClient, { schema });