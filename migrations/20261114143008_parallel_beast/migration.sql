CREATE TABLE "scs_ai_usage" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'reserved' NOT NULL,
	"error" text,
	"model" text,
	"latency_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scs_beta_seat" (
	"id" text PRIMARY KEY,
	"email" text NOT NULL,
	"user_id" text UNIQUE,
	"reserved_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scs_career_fact" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"category" text NOT NULL,
	"text" text NOT NULL,
	"status" text DEFAULT 'proposed' NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scs_chat_message" (
	"id" text PRIMARY KEY,
	"thread_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scs_chat_thread" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"title" text DEFAULT 'New conversation' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scs_feedback" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"rating" integer NOT NULL,
	"category" text NOT NULL,
	"message" text NOT NULL,
	"page" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scs_linkedin_draft" (
	"user_id" text,
	"section" text,
	"content" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scs_linkedin_draft_pkey" PRIMARY KEY("user_id","section")
);
--> statement-breakpoint
CREATE TABLE "scs_user_state" (
	"user_id" text PRIMARY KEY,
	"ai_consent_at" timestamp with time zone,
	"privacy_ack_at" timestamp with time zone,
	"onboarding_choice" text,
	"onboarded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "scs_ai_usage_user_id_kind_created_at_index" ON "scs_ai_usage" ("user_id","kind","created_at");--> statement-breakpoint
CREATE INDEX "scs_ai_usage_created_at_index" ON "scs_ai_usage" ("created_at");--> statement-breakpoint
CREATE INDEX "scs_beta_seat_reserved_at_index" ON "scs_beta_seat" ("reserved_at");--> statement-breakpoint
CREATE INDEX "scs_career_fact_user_id_status_index" ON "scs_career_fact" ("user_id","status");--> statement-breakpoint
CREATE INDEX "scs_chat_message_thread_id_created_at_index" ON "scs_chat_message" ("thread_id","created_at");--> statement-breakpoint
CREATE INDEX "scs_chat_thread_user_id_updated_at_index" ON "scs_chat_thread" ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "scs_feedback_created_at_index" ON "scs_feedback" ("created_at");--> statement-breakpoint
ALTER TABLE "scs_ai_usage" ADD CONSTRAINT "scs_ai_usage_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "scs_beta_seat" ADD CONSTRAINT "scs_beta_seat_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "scs_career_fact" ADD CONSTRAINT "scs_career_fact_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "scs_chat_message" ADD CONSTRAINT "scs_chat_message_thread_id_scs_chat_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "scs_chat_thread"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "scs_chat_message" ADD CONSTRAINT "scs_chat_message_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "scs_chat_thread" ADD CONSTRAINT "scs_chat_thread_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "scs_feedback" ADD CONSTRAINT "scs_feedback_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "scs_linkedin_draft" ADD CONSTRAINT "scs_linkedin_draft_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "scs_user_state" ADD CONSTRAINT "scs_user_state_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;