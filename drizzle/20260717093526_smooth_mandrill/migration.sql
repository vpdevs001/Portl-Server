CREATE TYPE "approver_type" AS ENUM('resident', 'admin');--> statement-breakpoint
CREATE TYPE "booking_status" AS ENUM('pending', 'confirmed', 'cancelled');--> statement-breakpoint
CREATE TYPE "complaint_status" AS ENUM('open', 'in_progress', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "due_status" AS ENUM('pending', 'paid', 'overdue');--> statement-breakpoint
CREATE TYPE "payment_confirmation_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "user_role" AS ENUM('resident', 'security_guard', 'society_admin');--> statement-breakpoint
CREATE TYPE "visitor_source" AS ENUM('guard_request', 'pre_approval', 'admin_initiated');--> statement-breakpoint
CREATE TYPE "visitor_status" AS ENUM('pending', 'approved', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "visitor_type" AS ENUM('guest', 'delivery', 'cab', 'service_staff', 'admin_visitor');--> statement-breakpoint
CREATE TABLE "account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL UNIQUE,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"society_id" uuid,
	"flat_id" uuid,
	"role" "user_role",
	"phone" varchar(20),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"society_id" uuid NOT NULL,
	"tower_id" uuid NOT NULL,
	"flat_number" varchar(20) NOT NULL,
	"floor" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "societies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(255) NOT NULL,
	"address" text NOT NULL,
	"city" varchar(100) NOT NULL,
	"state" varchar(100) NOT NULL,
	"pincode" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "towers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"society_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cab_details" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"visitor_request_id" uuid NOT NULL,
	"provider_name" varchar(150) NOT NULL,
	"vehicle_number" varchar(30),
	"driver_name" varchar(150),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_details" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"visitor_request_id" uuid NOT NULL,
	"company_name" varchar(150) NOT NULL,
	"order_id" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_staff_details" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"visitor_request_id" uuid NOT NULL,
	"service_type" varchar(100) NOT NULL,
	"company_name" varchar(150),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visitor_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"society_id" uuid NOT NULL,
	"flat_id" uuid,
	"visitor_type" "visitor_type" NOT NULL,
	"approver_type" "approver_type" NOT NULL,
	"name" varchar(150) NOT NULL,
	"phone" varchar(20),
	"photo" text,
	"purpose" text,
	"status" "visitor_status" DEFAULT 'pending'::"visitor_status" NOT NULL,
	"source" "visitor_source" NOT NULL,
	"created_by" uuid NOT NULL,
	"approved_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resident_entry_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"entry_time" timestamp,
	"exit_time" timestamp,
	"entry_marked_by" uuid,
	"exit_marked_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_directory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"society_id" uuid NOT NULL,
	"name" varchar(150) NOT NULL,
	"role_title" varchar(100) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"photo" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_entry_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"staff_id" uuid NOT NULL,
	"entry_time" timestamp,
	"exit_time" timestamp,
	"entry_marked_by" uuid,
	"exit_marked_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visitor_entry_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"visitor_request_id" uuid NOT NULL,
	"entry_time" timestamp,
	"exit_time" timestamp,
	"entry_marked_by" uuid,
	"exit_marked_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "complaints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"society_id" uuid NOT NULL,
	"flat_id" uuid NOT NULL,
	"raised_by" uuid NOT NULL,
	"category" varchar(100) NOT NULL,
	"description" text NOT NULL,
	"status" "complaint_status" DEFAULT 'open'::"complaint_status" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"society_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poll_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"poll_id" uuid NOT NULL,
	"option_text" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poll_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"poll_id" uuid NOT NULL,
	"poll_option_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "polls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"society_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"question" text NOT NULL,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "amenities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"society_id" uuid NOT NULL,
	"name" varchar(150) NOT NULL,
	"description" text,
	"capacity" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "amenity_bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"amenity_id" uuid NOT NULL,
	"flat_id" uuid NOT NULL,
	"booked_by" uuid NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"status" "booking_status" DEFAULT 'pending'::"booking_status" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_dues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"society_id" uuid NOT NULL,
	"flat_id" uuid NOT NULL,
	"period" varchar(20) NOT NULL,
	"amount" numeric(10,2) NOT NULL,
	"due_date" date NOT NULL,
	"status" "due_status" DEFAULT 'pending'::"due_status" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_confirmations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"due_id" uuid NOT NULL,
	"flat_id" uuid NOT NULL,
	"raised_by" uuid NOT NULL,
	"amount" numeric(10,2) NOT NULL,
	"screenshot" text NOT NULL,
	"upi_ref" varchar(100),
	"status" "payment_confirmation_status" DEFAULT 'pending'::"payment_confirmation_status" NOT NULL,
	"reviewed_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" ("identifier");--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_society_id_societies_id_fkey" FOREIGN KEY ("society_id") REFERENCES "societies"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_flat_id_flats_id_fkey" FOREIGN KEY ("flat_id") REFERENCES "flats"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "flats" ADD CONSTRAINT "flats_society_id_societies_id_fkey" FOREIGN KEY ("society_id") REFERENCES "societies"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "flats" ADD CONSTRAINT "flats_tower_id_towers_id_fkey" FOREIGN KEY ("tower_id") REFERENCES "towers"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "towers" ADD CONSTRAINT "towers_society_id_societies_id_fkey" FOREIGN KEY ("society_id") REFERENCES "societies"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cab_details" ADD CONSTRAINT "cab_details_visitor_request_id_visitor_requests_id_fkey" FOREIGN KEY ("visitor_request_id") REFERENCES "visitor_requests"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "delivery_details" ADD CONSTRAINT "delivery_details_visitor_request_id_visitor_requests_id_fkey" FOREIGN KEY ("visitor_request_id") REFERENCES "visitor_requests"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "service_staff_details" ADD CONSTRAINT "service_staff_details_FfdVLZSapiAo_fkey" FOREIGN KEY ("visitor_request_id") REFERENCES "visitor_requests"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "visitor_requests" ADD CONSTRAINT "visitor_requests_society_id_societies_id_fkey" FOREIGN KEY ("society_id") REFERENCES "societies"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "visitor_requests" ADD CONSTRAINT "visitor_requests_flat_id_flats_id_fkey" FOREIGN KEY ("flat_id") REFERENCES "flats"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "visitor_requests" ADD CONSTRAINT "visitor_requests_created_by_user_id_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "visitor_requests" ADD CONSTRAINT "visitor_requests_approved_by_user_id_fkey" FOREIGN KEY ("approved_by") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "resident_entry_logs" ADD CONSTRAINT "resident_entry_logs_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "resident_entry_logs" ADD CONSTRAINT "resident_entry_logs_entry_marked_by_user_id_fkey" FOREIGN KEY ("entry_marked_by") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "resident_entry_logs" ADD CONSTRAINT "resident_entry_logs_exit_marked_by_user_id_fkey" FOREIGN KEY ("exit_marked_by") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "staff_directory" ADD CONSTRAINT "staff_directory_society_id_societies_id_fkey" FOREIGN KEY ("society_id") REFERENCES "societies"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "staff_entry_logs" ADD CONSTRAINT "staff_entry_logs_staff_id_staff_directory_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff_directory"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "staff_entry_logs" ADD CONSTRAINT "staff_entry_logs_entry_marked_by_user_id_fkey" FOREIGN KEY ("entry_marked_by") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "staff_entry_logs" ADD CONSTRAINT "staff_entry_logs_exit_marked_by_user_id_fkey" FOREIGN KEY ("exit_marked_by") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "visitor_entry_logs" ADD CONSTRAINT "visitor_entry_logs_visitor_request_id_visitor_requests_id_fkey" FOREIGN KEY ("visitor_request_id") REFERENCES "visitor_requests"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "visitor_entry_logs" ADD CONSTRAINT "visitor_entry_logs_entry_marked_by_user_id_fkey" FOREIGN KEY ("entry_marked_by") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "visitor_entry_logs" ADD CONSTRAINT "visitor_entry_logs_exit_marked_by_user_id_fkey" FOREIGN KEY ("exit_marked_by") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_society_id_societies_id_fkey" FOREIGN KEY ("society_id") REFERENCES "societies"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_flat_id_flats_id_fkey" FOREIGN KEY ("flat_id") REFERENCES "flats"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_raised_by_user_id_fkey" FOREIGN KEY ("raised_by") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "notices" ADD CONSTRAINT "notices_society_id_societies_id_fkey" FOREIGN KEY ("society_id") REFERENCES "societies"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "notices" ADD CONSTRAINT "notices_created_by_user_id_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "poll_options" ADD CONSTRAINT "poll_options_poll_id_polls_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "polls"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_poll_id_polls_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "polls"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_poll_option_id_poll_options_id_fkey" FOREIGN KEY ("poll_option_id") REFERENCES "poll_options"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "polls" ADD CONSTRAINT "polls_society_id_societies_id_fkey" FOREIGN KEY ("society_id") REFERENCES "societies"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "polls" ADD CONSTRAINT "polls_created_by_user_id_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "amenities" ADD CONSTRAINT "amenities_society_id_societies_id_fkey" FOREIGN KEY ("society_id") REFERENCES "societies"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "amenity_bookings" ADD CONSTRAINT "amenity_bookings_amenity_id_amenities_id_fkey" FOREIGN KEY ("amenity_id") REFERENCES "amenities"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "amenity_bookings" ADD CONSTRAINT "amenity_bookings_flat_id_flats_id_fkey" FOREIGN KEY ("flat_id") REFERENCES "flats"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "amenity_bookings" ADD CONSTRAINT "amenity_bookings_booked_by_user_id_fkey" FOREIGN KEY ("booked_by") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "maintenance_dues" ADD CONSTRAINT "maintenance_dues_society_id_societies_id_fkey" FOREIGN KEY ("society_id") REFERENCES "societies"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "maintenance_dues" ADD CONSTRAINT "maintenance_dues_flat_id_flats_id_fkey" FOREIGN KEY ("flat_id") REFERENCES "flats"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "payment_confirmations" ADD CONSTRAINT "payment_confirmations_due_id_maintenance_dues_id_fkey" FOREIGN KEY ("due_id") REFERENCES "maintenance_dues"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "payment_confirmations" ADD CONSTRAINT "payment_confirmations_flat_id_flats_id_fkey" FOREIGN KEY ("flat_id") REFERENCES "flats"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "payment_confirmations" ADD CONSTRAINT "payment_confirmations_raised_by_user_id_fkey" FOREIGN KEY ("raised_by") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "payment_confirmations" ADD CONSTRAINT "payment_confirmations_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "user"("id");