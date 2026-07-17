CREATE TABLE `invoice` (
	`id` text PRIMARY KEY NOT NULL,
	`vendor_id` text NOT NULL,
	`invoice_number` text NOT NULL,
	`po_reference` text NOT NULL,
	`amount` real NOT NULL,
	`currency` text NOT NULL,
	`due_date` integer,
	`source_document_path` text,
	`status` text NOT NULL,
	`match_status` text NOT NULL,
	`supersedes_invoice_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`vendor_id`) REFERENCES `vendor`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`supersedes_invoice_id`) REFERENCES `invoice`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_vendor_invoice` ON `invoice` (`vendor_id`,`invoice_number`);