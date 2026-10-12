CREATE TABLE `index_observations` (
	`date` text PRIMARY KEY NOT NULL,
	`score` integer,
	`coverage` integer NOT NULL,
	`event_date` text,
	`method` text NOT NULL,
	`checked_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `source_cache` (
	`key` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`updated_at` text NOT NULL
);
