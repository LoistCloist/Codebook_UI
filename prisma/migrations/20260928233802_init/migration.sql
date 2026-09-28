-- CreateEnum
CREATE TYPE "choice" AS ENUM ('maintain', 'swerve_left', 'swerve_right');

-- CreateEnum
CREATE TYPE "question_order" AS ENUM ('U_first', 'K_first');

-- CreateEnum
CREATE TYPE "age_range" AS ENUM ('18_24', '25_34', '35_44', '45_54', '55_64', '65_plus', 'prefer_not_to_say');

-- CreateEnum
CREATE TYPE "yes_no_pnts" AS ENUM ('yes', 'no', 'prefer_not_to_say');

-- CreateEnum
CREATE TYPE "ethics_coursework" AS ENUM ('none', 'some', 'substantial', 'prefer_not_to_say');

-- CreateTable
CREATE TABLE "participants" (
    "id" TEXT NOT NULL,
    "participant_hash" TEXT NOT NULL,
    "consented_at" TIMESTAMPTZ(3) NOT NULL,
    "started_at" TIMESTAMPTZ(3) NOT NULL,
    "age_range" "age_range",
    "country" TEXT,
    "drives" "yes_no_pnts",
    "ethics_coursework" "ethics_coursework",
    "demographics_at" TIMESTAMPTZ(3),
    "comprehension_answers" JSONB,
    "comprehension_passed" BOOLEAN,
    "primer_completed_at" TIMESTAMPTZ(3),
    "scenario_order" TEXT[],
    "completed_at" TIMESTAMPTZ(3),

    CONSTRAINT "participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "responses" (
    "id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "scenario_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "question_order" "question_order" NOT NULL,
    "utilitarian_choice" "choice",
    "kantian_choice" "choice",
    "own_choice" "choice",
    "confidence" INTEGER,
    "first_served_at" TIMESTAMPTZ(3) NOT NULL,
    "served_at" TIMESTAMPTZ(3) NOT NULL,
    "answered_at" TIMESTAMPTZ(3),

    CONSTRAINT "responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "participants_participant_hash_key" ON "participants"("participant_hash");

-- CreateIndex
CREATE UNIQUE INDEX "responses_participant_id_scenario_id_key" ON "responses"("participant_id", "scenario_id");

-- CreateIndex
CREATE UNIQUE INDEX "responses_participant_id_position_key" ON "responses"("participant_id", "position");

-- AddForeignKey
ALTER TABLE "responses" ADD CONSTRAINT "responses_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Integrity checks (hand-written; not expressible in schema.prisma)
ALTER TABLE "responses" ADD CONSTRAINT "responses_position_nonnegative" CHECK ("position" >= 0);
ALTER TABLE "responses" ADD CONSTRAINT "responses_confidence_range" CHECK ("confidence" IS NULL OR "confidence" BETWEEN 1 AND 5);
ALTER TABLE "responses" ADD CONSTRAINT "responses_answered_has_choices" CHECK ("answered_at" IS NULL OR ("utilitarian_choice" IS NOT NULL AND "kantian_choice" IS NOT NULL));
