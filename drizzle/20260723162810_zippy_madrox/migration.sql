ALTER TABLE "resident_entry_logs" ADD COLUMN "society_id" uuid;--> statement-breakpoint
ALTER TABLE "staff_entry_logs" ADD COLUMN "society_id" uuid;--> statement-breakpoint
UPDATE "resident_entry_logs" rel
SET "society_id" = u."society_id"
FROM "user" u
WHERE rel."user_id" = u."id" AND rel."society_id" IS NULL;--> statement-breakpoint
UPDATE "staff_entry_logs" sel
SET "society_id" = sd."society_id"
FROM "staff_directory" sd
WHERE sel."staff_id" = sd."id" AND sel."society_id" IS NULL;--> statement-breakpoint
ALTER TABLE "resident_entry_logs" ALTER COLUMN "society_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "staff_entry_logs" ALTER COLUMN "society_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "resident_entry_logs" ADD CONSTRAINT "resident_entry_logs_society_id_societies_id_fkey" FOREIGN KEY ("society_id") REFERENCES "societies"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "staff_entry_logs" ADD CONSTRAINT "staff_entry_logs_society_id_societies_id_fkey" FOREIGN KEY ("society_id") REFERENCES "societies"("id") ON DELETE CASCADE;
