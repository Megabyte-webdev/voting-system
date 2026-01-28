CREATE TABLE "abuse_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"matric_no" varchar(50),
	"biometric_hash" varchar(255),
	"biometric_type" varchar(20),
	"device_id" varchar(255),
	"ip_address" varchar(50),
	"user_agent" text,
	"action" varchar(100),
	"occurred_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"position_id" uuid,
	"name" varchar(150) NOT NULL,
	"photo" text,
	"photo_public_id" varchar(255),
	"manifesto" text
);
--> statement-breakpoint
CREATE TABLE "elections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" varchar(255) NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"status" varchar(20) DEFAULT 'upcoming'
);
--> statement-breakpoint
CREATE TABLE "positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"election_id" uuid,
	"name" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"matric_no" varchar(50) NOT NULL,
	"biometric_hash" varchar(255),
	"biometric_type" varchar(20) DEFAULT 'none',
	"device_id" varchar(255),
	"ip_address" varchar(50),
	"user_agent" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "voters_matric_no_unique" UNIQUE("matric_no")
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"matric_no" varchar(50) NOT NULL,
	"biometric_hash" varchar(255),
	"biometric_type" varchar(20) DEFAULT 'none',
	"device_id" varchar(255),
	"candidate_id" uuid,
	"position_id" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_position_id_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_election_id_elections_id_fk" FOREIGN KEY ("election_id") REFERENCES "public"."elections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_position_id_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_vote" ON "votes" USING btree ("matric_no","position_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_biometric" ON "votes" USING btree ("biometric_hash","position_id");