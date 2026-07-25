CREATE TYPE "flat_type" AS ENUM('1bhk', '2bhk', '3bhk', '4bhk', '5bhk', 'other');--> statement-breakpoint
ALTER TABLE "flats" ADD COLUMN "flat_type" "flat_type" DEFAULT '1bhk'::"flat_type" NOT NULL;--> statement-breakpoint
ALTER TABLE "flats" ADD COLUMN "monthly_amount" numeric(10,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "maintenance_dues" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "maintenance_dues" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
DROP TYPE "due_status";--> statement-breakpoint
CREATE TYPE "due_status" AS ENUM('pending', 'review', 'paid');--> statement-breakpoint
ALTER TABLE "maintenance_dues" ALTER COLUMN "status" SET DATA TYPE "due_status" USING "status"::"due_status";--> statement-breakpoint
ALTER TABLE "maintenance_dues" ALTER COLUMN "status" SET DEFAULT 'pending'::"due_status";--> statement-breakpoint
ALTER TABLE "maintenance_dues" DROP COLUMN "due_date";--> statement-breakpoint
ALTER TABLE "maintenance_dues" ALTER COLUMN "period" SET DATA TYPE varchar(7) USING "period"::varchar(7);--> statement-breakpoint
ALTER TABLE "maintenance_dues" ADD CONSTRAINT "maintenance_dues_flat_period_unique" UNIQUE("flat_id","period");