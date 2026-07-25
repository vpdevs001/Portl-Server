ALTER TABLE "visitor_requests" ADD COLUMN "pass_code" varchar(6);--> statement-breakpoint
ALTER TABLE "visitor_requests" ADD COLUMN "valid_from" timestamp;--> statement-breakpoint
ALTER TABLE "visitor_requests" ADD COLUMN "valid_until" timestamp;--> statement-breakpoint
ALTER TABLE "visitor_requests" ADD CONSTRAINT "visitor_requests_society_id_pass_code_unique" UNIQUE("society_id","pass_code");