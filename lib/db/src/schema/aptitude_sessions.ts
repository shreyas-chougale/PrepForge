import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const aptitudeSessionsTable = pgTable("aptitude_sessions", {
  id: serial("id").primaryKey(),
  company: text("company").notNull(),
  category: text("category").notNull(),
  score: integer("score").notNull(),
  total: integer("total").notNull(),
  percentage: real("percentage").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAptitudeSessionSchema = createInsertSchema(aptitudeSessionsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertAptitudeSession = z.infer<typeof insertAptitudeSessionSchema>;
export type AptitudeSession = typeof aptitudeSessionsTable.$inferSelect;
