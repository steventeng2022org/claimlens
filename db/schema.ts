import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const dailyUsage = sqliteTable("daily_usage", {
  ipHash: text("ip_hash").notNull(),
  day: text("day").notNull(),
  requestCount: integer("request_count").notNull().default(0),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  primaryKey({ columns: [table.ipHash, table.day] }),
]);

export const analysisCache = sqliteTable("analysis_cache", {
  cacheKey: text("cache_key").primaryKey(),
  inputUrl: text("input_url").notNull(),
  responseJson: text("response_json").notNull(),
  createdAt: integer("created_at").notNull(),
  expiresAt: integer("expires_at").notNull(),
}, (table) => [
  index("idx_analysis_cache_expires_at").on(table.expiresAt),
]);
