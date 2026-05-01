ALTER TABLE "user" RENAME COLUMN "phone" TO "phone_number";
--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_phone_number_unique" UNIQUE ("phone_number");
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "phone_number_verified" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE TABLE "attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"date" date NOT NULL,
	"status" text NOT NULL,
	"marked_by" text NOT NULL,
	"marked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text,
	CONSTRAINT "attendance_student_date_unique" UNIQUE("student_id","date")
);
--> statement-breakpoint
CREATE TABLE "notification_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel" text NOT NULL,
	"template_key" text NOT NULL,
	"recipient_phone" text NOT NULL,
	"recipient_parent_id" uuid,
	"status" text NOT NULL,
	"provider" text,
	"provider_message_id" text,
	"error_message" text,
	"related_entity_type" text,
	"related_entity_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "announcement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sent_by" text NOT NULL,
	"audience_type" text NOT NULL,
	"audience_ref" jsonb,
	"body" text NOT NULL,
	"recipient_count" integer NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "otp_attempt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_student_id_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_section_id_section_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."section"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_marked_by_user_id_fk" FOREIGN KEY ("marked_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_recipient_parent_id_parent_id_fk" FOREIGN KEY ("recipient_parent_id") REFERENCES "public"."parent"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "announcement" ADD CONSTRAINT "announcement_sent_by_user_id_fk" FOREIGN KEY ("sent_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_attendance_section_date" ON "attendance" USING btree ("section_id","date");
--> statement-breakpoint
CREATE INDEX "idx_attendance_student_date" ON "attendance" USING btree ("student_id","date");
--> statement-breakpoint
CREATE INDEX "idx_notif_log_phone_created" ON "notification_log" USING btree ("recipient_phone","created_at");
--> statement-breakpoint
CREATE INDEX "idx_notif_log_related" ON "notification_log" USING btree ("related_entity_type","related_entity_id");
--> statement-breakpoint
CREATE INDEX "idx_announcement_sent_at" ON "announcement" USING btree ("sent_at");
--> statement-breakpoint
CREATE INDEX "idx_otp_attempt_phone_time" ON "otp_attempt" USING btree ("phone","attempted_at");
