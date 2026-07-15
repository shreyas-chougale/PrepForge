import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const resumeSessionsTable = pgTable("resume_sessions", {
  id: serial("id").primaryKey(),
  role: text("role").notNull(),
  company: text("company").notNull(),
  score: integer("score").notNull(),
  atsCompatibility: integer("ats_compatibility").notNull(),
  skills: jsonb("skills").notNull().default([]),
  suggestions: jsonb("suggestions").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertResumeSessionSchema = createInsertSchema(resumeSessionsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertResumeSession = z.infer<typeof insertResumeSessionSchema>;
export type ResumeSession = typeof resumeSessionsTable.$inferSelect;
