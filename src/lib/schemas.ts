// Shared zod schemas. Safe to import from client components (no server-only deps).
import { z } from "zod";
import type * as PrismaEnums from "@/generated/prisma/enums";
import { COUNTRY_VALUES } from "@/config/countries";

export const Choice = z.enum(["maintain", "swerve_left", "swerve_right"]);
export type Choice = z.infer<typeof Choice>;

// Values match the Prisma enum identifiers (the DB stores "18_24" etc. via @map).
export const AgeRange = z.enum([
  "age_18_24",
  "age_25_34",
  "age_35_44",
  "age_45_54",
  "age_55_64",
  "age_65_plus",
  "prefer_not_to_say",
]);
export type AgeRange = z.infer<typeof AgeRange>;

export const YesNoPnts = z.enum(["yes", "no", "prefer_not_to_say"]);
export type YesNoPnts = z.infer<typeof YesNoPnts>;

export const EthicsCoursework = z.enum(["none", "some", "substantial", "prefer_not_to_say"]);
export type EthicsCoursework = z.infer<typeof EthicsCoursework>;

export const QuestionOrder = z.enum(["U_first", "K_first"]);
export type QuestionOrder = z.infer<typeof QuestionOrder>;

// ISO-3166 alpha-2 code or "prefer_not_to_say"
export const Country = z.enum(COUNTRY_VALUES);
export type Country = z.infer<typeof Country>;

export const DemographicsInput = z.object({
  ageRange: AgeRange,
  country: Country,
  drives: YesNoPnts,
  ethicsCoursework: EthicsCoursework,
});
export type DemographicsInput = z.infer<typeof DemographicsInput>;

export const ComprehensionInput = z.object({
  answers: z.tuple([z.string(), z.string()]),
});
export type ComprehensionInput = z.infer<typeof ComprehensionInput>;

// own/confidence required iff the matching config flag is on (checked in the route)
export const ResponseInput = z.object({
  scenarioId: z.string(),
  utilitarian: Choice,
  kantian: Choice,
  own: Choice.optional(),
  confidence: z.number().int().min(1).max(5).optional(),
});
export type ResponseInput = z.infer<typeof ResponseInput>;

// Compile-time guard: these enums must stay identical to the Prisma schema.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Assert<T extends true> = T;
export type EnumsMatchPrisma = [
  Assert<Same<Choice, PrismaEnums.Choice>>,
  Assert<Same<AgeRange, PrismaEnums.AgeRange>>,
  Assert<Same<YesNoPnts, PrismaEnums.YesNoPnts>>,
  Assert<Same<EthicsCoursework, PrismaEnums.EthicsCoursework>>,
  Assert<Same<QuestionOrder, PrismaEnums.QuestionOrder>>,
];
