import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// Starter schema mirroring the Prisma addon's example User model, so
// switching between the two ORMs during evaluation doesn't require
// rethinking the example data shape.
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;