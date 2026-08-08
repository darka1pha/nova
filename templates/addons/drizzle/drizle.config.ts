import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// Reads DATABASE_URL from process.env - see .env.example / docs/drizzle.md.
export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL as string,
  },
  strict: true,
  verbose: true,
});