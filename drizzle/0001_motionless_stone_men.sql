CREATE TABLE `vendor` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`passcode_hash` text NOT NULL,
	`contact_email` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vendor_name_unique` ON `vendor` (`name`);