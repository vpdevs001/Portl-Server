CREATE TYPE "invite_status" AS ENUM('pending', 'accepted', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TABLE "push_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"expo_push_token" varchar(255) NOT NULL,
	"device_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "push_tokens_user_id_expo_push_token_unique" UNIQUE("user_id","expo_push_token")
);
--> statement-breakpoint
CREATE TABLE "society_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"society_id" uuid NOT NULL,
	"invited_user_id" uuid NOT NULL,
	"invited_by" uuid NOT NULL,
	"role" "user_role" NOT NULL,
	"flat_id" uuid,
	"status" "invite_status" DEFAULT 'pending'::"invite_status" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "visitor_requests" ADD COLUMN "vehicle_number" varchar(30);--> statement-breakpoint
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "society_invites" ADD CONSTRAINT "society_invites_society_id_societies_id_fkey" FOREIGN KEY ("society_id") REFERENCES "societies"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "society_invites" ADD CONSTRAINT "society_invites_invited_user_id_user_id_fkey" FOREIGN KEY ("invited_user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "society_invites" ADD CONSTRAINT "society_invites_invited_by_user_id_fkey" FOREIGN KEY ("invited_by") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "society_invites" ADD CONSTRAINT "society_invites_flat_id_flats_id_fkey" FOREIGN KEY ("flat_id") REFERENCES "flats"("id") ON DELETE CASCADE;