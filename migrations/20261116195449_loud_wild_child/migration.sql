CREATE TABLE "scs_mission" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"mission_id" text NOT NULL,
	"name" text NOT NULL,
	"answers" jsonb DEFAULT '{}' NOT NULL,
	"prompt" text NOT NULL,
	"template_version" integer DEFAULT 1 NOT NULL,
	"selected_fact_ids" jsonb DEFAULT '[]' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "scs_mission_user_id_updated_at_index" ON "scs_mission" ("user_id","updated_at");--> statement-breakpoint
ALTER TABLE "scs_mission" ADD CONSTRAINT "scs_mission_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;