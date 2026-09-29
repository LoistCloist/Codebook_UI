"use client";

import { useState, type FormEvent } from "react";
import { AGE_RANGE_OPTIONS, DRIVES_OPTIONS, ETHICS_COURSEWORK_OPTIONS } from "@/config/study";
import { COUNTRIES, PREFER_NOT_TO_SAY } from "@/config/countries";
import { DemographicsInput } from "@/lib/schemas";
import { RadioGroup, fieldAnchor } from "@/components/ui/radio-group";
import { ErrorSummary, type ErrorItem } from "@/components/ui/error-summary";
import { SubmitButton } from "@/components/ui/submit-button";
import { usePostJson } from "@/components/forms/use-post-json";

type Field = "ageRange" | "country" | "drives" | "ethicsCoursework";

const MESSAGES: Record<Field, string> = {
  ageRange: "Select your age range",
  country: "Select your country",
  drives: "Select whether you drive",
  ethicsCoursework: "Select your prior ethics coursework",
};
const ORDER: Field[] = ["ageRange", "country", "drives", "ethicsCoursework"];

export function DemographicsForm() {
  const { submit, pending, error } = usePostJson("/api/demographics");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Field, string>>>({});

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const fd = new FormData(e.currentTarget);
    const raw = Object.fromEntries(ORDER.map((f) => [f, fd.get(f) || undefined]));
    const parsed = DemographicsInput.safeParse(raw);
    if (!parsed.success) {
      const errs: Partial<Record<Field, string>> = {};
      for (const issue of parsed.error.issues) {
        const f = issue.path[0] as Field;
        if (f in MESSAGES) errs[f] = MESSAGES[f];
      }
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    void submit(parsed.data);
  }

  const items: ErrorItem[] = [
    ...ORDER.filter((f) => fieldErrors[f]).map((f) => ({
      message: fieldErrors[f]!,
      href: f === "country" ? "country" : fieldAnchor(f),
    })),
    ...(error ? [{ message: error }] : []),
  ];

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-6">
      <ErrorSummary items={items} />

      <RadioGroup name="ageRange" legend="What is your age range?" options={AGE_RANGE_OPTIONS} error={fieldErrors.ageRange} />

      <div className={`rounded-lg border bg-surface p-4 ${fieldErrors.country ? "border-danger" : "border-line"}`}>
        <label htmlFor="country" className="mb-3 block text-base font-semibold text-ink">
          Which country do you live in?
        </label>
        {fieldErrors.country && (
          <p id="country-error" className="mb-3 text-sm font-medium text-danger">
            <span className="sr-only">Error: </span>
            {fieldErrors.country}
          </p>
        )}
        <select
          id="country"
          name="country"
          required
          defaultValue=""
          aria-invalid={fieldErrors.country ? true : undefined}
          aria-describedby={fieldErrors.country ? "country-error" : undefined}
          className="min-h-11 w-full rounded-md border border-line bg-surface px-3 py-2 text-base text-ink"
        >
          <option value="" disabled>
            Select a country
          </option>
          <option value={PREFER_NOT_TO_SAY}>Prefer not to say</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <RadioGroup name="drives" legend="Do you drive?" options={DRIVES_OPTIONS} error={fieldErrors.drives} />

      <RadioGroup
        name="ethicsCoursework"
        legend="How much prior coursework in ethics or moral philosophy have you taken?"
        options={ETHICS_COURSEWORK_OPTIONS}
        error={fieldErrors.ethicsCoursework}
      />

      <SubmitButton pending={pending}>Continue</SubmitButton>
    </form>
  );
}
