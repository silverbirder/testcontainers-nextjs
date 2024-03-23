CREATE TABLE `testcontainers-nextjs_post` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`name` varchar(256),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `testcontainers-nextjs_post_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `name_idx` ON `testcontainers-nextjs_post` (`name`);