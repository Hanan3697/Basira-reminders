CREATE TABLE `analytics_owner` (
	`key` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `analytics_sections` (
	`session` text NOT NULL,
	`section` text NOT NULL,
	PRIMARY KEY(`session`, `section`)
);
--> statement-breakpoint
CREATE TABLE `analytics_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`visitor` text NOT NULL,
	`day` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `analytics_day_idx` ON `analytics_sessions` (`day`);--> statement-breakpoint
CREATE INDEX `analytics_visitor_idx` ON `analytics_sessions` (`visitor`);