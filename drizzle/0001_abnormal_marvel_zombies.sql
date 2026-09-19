CREATE TABLE `api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`encrypted_key` text NOT NULL,
	`iv` text NOT NULL,
	`active` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`report_json` text NOT NULL,
	`analyzed_at` integer NOT NULL,
	`source_type` text NOT NULL,
	`cached` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_reports_created_at` ON `reports` (`created_at`);