ALTER TABLE "calendar_events" ADD COLUMN "start_at" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD COLUMN "end_at" timestamp;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD COLUMN "notify_start_days_before" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD COLUMN "notify_repeat_daily" boolean DEFAULT false NOT NULL;