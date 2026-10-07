"use client";

import { useState, type FormEvent } from "react";
import { CHOICE_OPTIONS, CONFIDENCE_SCALE } from "@/config/study";
import { Choice } from "@/lib/schemas";
import { RadioGroup, fieldAnchor, type RadioOption } from "@/components/ui/radio-group";
import { ErrorSummary, type ErrorItem } from "@/components/ui/error-summary";
import { SubmitButton } from "@/components/ui/submit-button";
import { usePostJson } from "@/components/forms/use-post-json";
import { RulebookViewer } from "@/components/scenario/rulebook-viewer";

type Field = "utilitarian" | "own" | "confidence";

type Props = {
  scenarioId: string;
  askOwnChoice: boolean;
  askConfidence: boolean;
  isLast: boolean;
};

const MESSAGES: Record<Field, string> = {
  utilitarian: "Choose what the car should do under utilitarian ethics",
  own: "Choose what you think the car should actually do",
  confidence: "Choose how confident you are",
};

const CONFIDENCE_OPTIONS: RadioOption[] = Array.from(
  { length: CONFIDENCE_SCALE.max - CONFIDENCE_SCALE.min + 1 },
  (_, i) => {
    const n = CONFIDENCE_SCALE.min + i;
    const suffix =
      n === CONFIDENCE_SCALE.min
        ? ` (${CONFIDENCE_SCALE.minLabel})`
        : n === CONFIDENCE_SCALE.max
          ? ` (${CONFIDENCE_SCALE.maxLabel})`
          : "";
    return { value: String(n), label: `${n}${suffix}` };
  },
);

export function ScenarioForm({ scenarioId, askOwnChoice, askConfidence, isLast }: Props) {
  const { submit, pending, error } = usePostJson("/api/responses");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Field, string>>>({});

  const fields: Field[] = [
    "utilitarian",
    ...(askOwnChoice ? ["own" as const] : []),
    ...(askConfidence ? ["confidence" as const] : []),
  ];

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const fd = new FormData(e.currentTarget);
    const errs: Partial<Record<Field, string>> = {};
    const pick = (f: "utilitarian" | "own") => {
      const r = Choice.safeParse(fd.get(f));
      if (!r.success) errs[f] = MESSAGES[f];
      return r.success ? r.data : undefined;
    };
    const utilitarian = pick("utilitarian");
    const own = askOwnChoice ? pick("own") : undefined;
    let confidence: number | undefined;
    if (askConfidence) {
      const n = Number(fd.get("confidence"));
      if (Number.isInteger(n) && n >= CONFIDENCE_SCALE.min && n <= CONFIDENCE_SCALE.max) confidence = n;
      else errs.confidence = MESSAGES.confidence;
    }
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0 || !utilitarian) return;
    void submit({
      scenarioId,
      utilitarian,
      ...(own ? { own } : {}),
      ...(confidence !== undefined ? { confidence } : {}),
    });
  }

  const items: ErrorItem[] = [
    ...fields.filter((f) => fieldErrors[f]).map((f) => ({ message: fieldErrors[f]!, href: fieldAnchor(f) })),
    ...(error ? [{ message: error }] : []),
  ];

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-4">
      <ErrorSummary items={items} />
      <RadioGroup
        name="utilitarian"
        legend={
          <>
            <span className="mb-2 block font-mono text-xs tracking-wide text-util">UTILITARIAN RULEBOOK</span>
            Under <strong className="font-semibold">utilitarian</strong> ethics, the car should…
          </>
        }
        options={CHOICE_OPTIONS}
        error={fieldErrors.utilitarian}
        tone="util"
        size="lg"
      />
      <RulebookViewer />
      {askOwnChoice && (
        <RadioGroup
          name="own"
          legend="In your own view, what should the car actually do?"
          options={CHOICE_OPTIONS}
          error={fieldErrors.own}
          size="lg"
        />
      )}
      {askConfidence && (
        <RadioGroup
          name="confidence"
          legend="How confident are you in your answers to this scenario?"
          options={CONFIDENCE_OPTIONS}
          error={fieldErrors.confidence}
          inline
          size="lg"
        />
      )}
      <p className="text-[13px] italic text-muted">
        Answers are final once saved. You can&apos;t go back to change them.
      </p>
      <div className="border-t border-dashed border-line-strong pt-5 sm:text-right">
        <SubmitButton pending={pending}>{isLast ? "Save and finish" : "Save and continue"}</SubmitButton>
      </div>
    </form>
  );
}
