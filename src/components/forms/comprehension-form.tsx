"use client";

import { useState, type FormEvent } from "react";
import { study } from "@/config/study";
import { RadioGroup, fieldAnchor } from "@/components/ui/radio-group";
import { ErrorSummary, type ErrorItem } from "@/components/ui/error-summary";
import { SubmitButton } from "@/components/ui/submit-button";
import { usePostJson } from "@/components/forms/use-post-json";

const [Q1, Q2] = study.comprehension;

export function ComprehensionForm() {
  const { submit, pending, error } = usePostJson("/api/comprehension");
  const [missing, setMissing] = useState<string[]>([]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const fd = new FormData(e.currentTarget);
    const a1 = fd.get(Q1.id);
    const a2 = fd.get(Q2.id);
    const miss = [Q1, Q2].filter((q) => typeof fd.get(q.id) !== "string").map((q) => q.id);
    setMissing(miss);
    if (miss.length > 0 || typeof a1 !== "string" || typeof a2 !== "string") return;
    void submit({ answers: [a1, a2] });
  }

  const items: ErrorItem[] = [
    ...[Q1, Q2]
      .filter((q) => missing.includes(q.id))
      .map((q) => ({ message: `Answer question ${q === Q1 ? 1 : 2}`, href: fieldAnchor(q.id) })),
    ...(error ? [{ message: error }] : []),
  ];

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-6">
      <ErrorSummary items={items} />
      {[Q1, Q2].map((q, i) => (
        <RadioGroup
          key={q.id}
          name={q.id}
          legend={
            <>
              <span className="text-muted">Question {i + 1} of 2. </span>
              {q.prompt}
            </>
          }
          options={q.options}
          error={missing.includes(q.id) ? `Answer question ${i + 1}` : undefined}
        />
      ))}
      <SubmitButton pending={pending}>Continue to the scenarios</SubmitButton>
    </form>
  );
}
