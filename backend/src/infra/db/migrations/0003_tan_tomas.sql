CREATE TYPE "public"."board_file_type" AS ENUM('file', 'link');--> statement-breakpoint
CREATE TABLE "board_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"board_id" uuid NOT NULL,
	"uploaded_by" uuid,
	"type" "board_file_type" NOT NULL,
	"encrypted_content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "board_files" ADD CONSTRAINT "board_files_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_files" ADD CONSTRAINT "board_files_uploaded_by_board_members_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."board_members"("id") ON DELETE set null ON UPDATE no action;