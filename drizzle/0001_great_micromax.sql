CREATE TABLE `analytics_views` (
	`day` text NOT NULL,
	`section` text NOT NULL,
	`views` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`day`, `section`)
);
