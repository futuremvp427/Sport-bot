CREATE TABLE `placed_bets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sport` varchar(32) NOT NULL,
	`team` varchar(128) NOT NULL,
	`betType` varchar(64) NOT NULL,
	`odds` int NOT NULL,
	`stake` int NOT NULL,
	`outcome` enum('win','loss','pending') NOT NULL DEFAULT 'pending',
	`profitLoss` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`settledAt` timestamp,
	CONSTRAINT `placed_bets_id` PRIMARY KEY(`id`)
);
