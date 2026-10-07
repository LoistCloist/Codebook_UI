// Study copy and flags. Safe to import from client components: no answers live here.
// PLACEHOLDER text: the researcher replaces everything marked [PLACEHOLDER].
// Correct comprehension answers are in ./comprehension-answers.ts (server-only).

import type { Choice } from "@/lib/schemas";

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
    // [PLACEHOLDER] confirm against a pilot run.
    estimatedMinutes: 10,
    anonymity:
      "[PLACEHOLDER] Your responses are anonymous. We sign you in with Google only to make sure each person responds once; we do not store your email address, name or profile picture.",
    rightToStop: "[PLACEHOLDER] Taking part is voluntary. You may stop at any time without giving a reason.",
    eligibility: "You must be 18 or older to take part.",
    checkboxLabel: "I am 18 or older, I have read the information above, and I consent to take part.",
  },

  /** Utilitarianism summarised as big rule boxes on the primer page. */
  primer: {
    rules: [
      {
        title: "Judge by consequences",
        body: "An action is right or wrong only because of its outcomes, not because of intentions or fixed rules.",
      },
      {
        title: "Everyone counts equally",
        body: "Each person's well-being counts the same. No one's safety matters more than anyone else's.",
      },
      {
        title: "Choose the greatest overall good",
        body: "Pick the action that produces the best total outcome, for example the one that harms the fewest people.",
      },
    ],
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
      prompt:
        "A utilitarian self-driving car must choose between harming 1 person or harming 3 people. What should it do?",
      options: [
        { value: "fewer", label: "Harm 1 person, so fewer people are harmed" },
        { value: "follow_rule", label: "Stay on its course, whatever happens" },
        {
          value: "protect_passenger",
          label: "Always protect its own passenger first",
        },
      ],
    },
  ],

  /** Rulebook, linked from the primer and embedded on every scenario (public/rulebook.pdf). */
  rulebookPdf: "/rulebook.pdf",

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

export const CONFIDENCE_SCALE = {
  min: 1,
  max: 5,
  minLabel: "Not at all confident",
  maxLabel: "Very confident",
} as const;
