// Study copy and flags. Safe to import from client components: no answers live here.
// PLACEHOLDER text: the researcher replaces everything marked [PLACEHOLDER].
// Correct comprehension answers are in ./comprehension-answers.ts (server-only).

import type { AgeRange, Choice, EthicsCoursework, YesNoPnts } from "@/lib/schemas";

type Option<V extends string> = { value: V; label: string };

export const study = {
  title: "[PLACEHOLDER] Self-driving car dilemmas and ethical theories",

  /** Optional per-scenario questions (spec: default off). */
  askOwnChoice: false,
  askConfidence: false,

  contact: {
    name: "[PLACEHOLDER] Researcher name",
    email: "researcher@example.org",
    institution: "[PLACEHOLDER] Institution",
  },

  consent: {
    purpose:
      "[PLACEHOLDER] This study asks how people apply utilitarian and Kantian ethics to dilemmas faced by self-driving cars.",
    estimatedMinutes: 15,
    anonymity:
      "[PLACEHOLDER] Your responses are anonymous. We sign you in with Google only to make sure each person responds once; we do not store your email address, name or profile picture.",
    rightToStop:
      "[PLACEHOLDER] Taking part is voluntary. You may stop at any time without giving a reason.",
    eligibility: "You must be 18 or older to take part.",
    checkboxLabel: "I am 18 or older, I have read the information above, and I consent to take part.",
  },

  primer: {
    utilitarianism:
      "[PLACEHOLDER] Utilitarianism holds that the right action is the one that produces the best overall consequences, typically the greatest well-being for the greatest number.",
    kantianEthics:
      "[PLACEHOLDER] Kantian ethics holds that some actions are right or wrong in themselves, regardless of consequences. Persons must always be treated as ends, never merely as means.",
  },

  /** Exactly 2 questions (ComprehensionInput is a 2-tuple). Answers are submitted by option value. */
  comprehension: [
    {
      id: "q1",
      prompt: "[PLACEHOLDER] According to utilitarianism, what makes an action right?",
      options: [
        { value: "consequences", label: "Its overall consequences" },
        { value: "duty", label: "Whether it follows a moral rule or duty" },
        { value: "character", label: "Whether a virtuous person would do it" },
      ],
    },
    {
      id: "q2",
      prompt: "[PLACEHOLDER] According to Kantian ethics, may a person be used merely as a means to an end?",
      options: [
        { value: "yes_if_better", label: "Yes, if it leads to better outcomes" },
        { value: "never", label: "No, never merely as a means" },
        { value: "if_consent_unknown", label: "Only if their wishes are unknown" },
      ],
    },
  ],

  debrief: {
    heading: "Thank you for taking part",
    explanation:
      "[PLACEHOLDER] This study examines how well people can apply utilitarian and Kantian reasoning to autonomous-vehicle dilemmas. Your answers help us understand how these theories are interpreted in practice.",
  },

  completedMessage: "You've already completed this study, thank you.",
} as const;

export const CHOICE_OPTIONS: readonly Option<Choice>[] = [
  { value: "maintain", label: "Maintain course" },
  { value: "swerve_left", label: "Swerve left" },
  { value: "swerve_right", label: "Swerve right" },
];

export const AGE_RANGE_OPTIONS: readonly Option<AgeRange>[] = [
  { value: "age_18_24", label: "18–24" },
  { value: "age_25_34", label: "25–34" },
  { value: "age_35_44", label: "35–44" },
  { value: "age_45_54", label: "45–54" },
  { value: "age_55_64", label: "55–64" },
  { value: "age_65_plus", label: "65 or older" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export const DRIVES_OPTIONS: readonly Option<YesNoPnts>[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export const ETHICS_COURSEWORK_OPTIONS: readonly Option<EthicsCoursework>[] = [
  { value: "none", label: "None" },
  { value: "some", label: "Some" },
  { value: "substantial", label: "Substantial" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export const CONFIDENCE_SCALE = { min: 1, max: 5, minLabel: "Not at all confident", maxLabel: "Very confident" } as const;
