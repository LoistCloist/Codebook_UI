-- The Kantian question is no longer asked: answered rows only need a utilitarian choice.
ALTER TABLE "responses" DROP CONSTRAINT "responses_answered_has_choices";
ALTER TABLE "responses" ADD CONSTRAINT "responses_answered_has_choices" CHECK ("answered_at" IS NULL OR "utilitarian_choice" IS NOT NULL);
