CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_id` text NOT NULL,
	`actor_type` text NOT NULL,
	`staff_id` text,
	`vendor_id` text,
	`actor_label` text NOT NULL,
	`action` text NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoice`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`vendor_id`) REFERENCES `vendor`(`id`) ON UPDATE no action ON DELETE no action
);
