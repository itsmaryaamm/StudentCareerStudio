ALTER TABLE "scs_user_state" ADD COLUMN "preferred_name" text;--> statement-breakpoint
ALTER TABLE "scs_user_state" ADD COLUMN "onboarding_step" text;--> statement-breakpoint
ALTER TABLE "scs_user_state" ADD COLUMN "intake" jsonb;