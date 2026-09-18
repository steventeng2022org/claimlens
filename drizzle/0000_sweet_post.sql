CREATE TABLE `analysis_cache` (
	`cache_key` text PRIMARY KEY NOT NULL,
	`input_url` text NOT NULL,
	`response_json` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_analysis_cache_expires_at` ON `analysis_cache` (`expires_at`);--> statement-breakpoint
CREATE TABLE `daily_usage` (
	`ip_hash` text NOT NULL,
	`day` text NOT NULL,
	`request_count` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`ip_hash`, `day`)
);
