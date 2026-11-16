ALTER TABLE "scs_user_state" ADD COLUMN "referral_code" text;--> statement-breakpoint
ALTER TABLE "scs_user_state" ADD COLUMN "referred_by" text;--> statement-breakpoint
ALTER TABLE "scs_user_state" ADD CONSTRAINT "scs_user_state_referral_code_key" UNIQUE("referral_code");--> statement-breakpoint
ALTER TABLE "scs_user_state" ADD CONSTRAINT "scs_user_state_referred_by_user_id_fkey" FOREIGN KEY ("referred_by") REFERENCES "user"("id") ON DELETE SET NULL;