CREATE TYPE "complaint_category" AS ENUM('plumbing', 'electrical', 'security', 'cleanliness', 'general');--> statement-breakpoint
ALTER TABLE "complaints" ADD COLUMN "title" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "complaints" ADD COLUMN "photo_url" varchar(2048);--> statement-breakpoint
ALTER TABLE "complaints" ADD COLUMN "admin_comments" text;--> statement-breakpoint
ALTER TABLE "complaints" ALTER COLUMN "category" SET DATA TYPE "complaint_category" USING "category"::"complaint_category";--> statement-breakpoint
ALTER TABLE "complaints" ALTER COLUMN "category" SET DEFAULT 'general'::"complaint_category";