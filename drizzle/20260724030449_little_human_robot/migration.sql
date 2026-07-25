CREATE TYPE "notice_category" AS ENUM('emergency', 'maintenance', 'event', 'general');--> statement-breakpoint
ALTER TABLE "notices" ADD COLUMN "category" "notice_category" DEFAULT 'general'::"notice_category" NOT NULL;--> statement-breakpoint
ALTER TABLE "notices" ADD COLUMN "expires_at" timestamp;