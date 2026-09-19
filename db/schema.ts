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

export const reports = sqliteTable("reports", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  reportJson: text("report_json").notNull(),
  analyzedAt: integer("analyzed_at").notNull(),
  sourceType: text("source_type").notNull(),
  cached: integer("cached").notNull().default(0),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  index("idx_reports_created_at").on(table.createdAt),
]);

export const apiKeys = sqliteTable("api_keys", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  encryptedKey: text("encrypted_key").notNull(),
  iv: text("iv").notNull(),
  active: integer("active").notNull().default(0),
  createdAt: integer("created_at").notNull(),
});
