import type { ReactNode } from "react";

export type RadioOption = { value: string; label: string };

/** id of the first radio in a group; error-summary links point here. */
export function fieldAnchor(name: string): string {
  return `${name}-opt-0`;
}

/** Colour-coding for the two ethical theories (utilitarian green, Kantian indigo). */
export type Tone = "util" | "kant";

const TONES: Record<Tone | "neutral", { block: string; option: string }> = {
  neutral: {
    block: "",
    option: "has-[:checked]:border-ink has-[:checked]:bg-accent-soft",
  },
  util: {
    block: "border-l-4 border-l-util",
    option: "has-[:checked]:border-util has-[:checked]:bg-util-soft",
  },
  kant: {
    block: "border-l-4 border-l-kant",
    option: "has-[:checked]:border-kant has-[:checked]:bg-kant-soft",
  },
};

type Props = {
  name: string;
  legend: ReactNode;
  options: readonly RadioOption[];
  hint?: ReactNode;
  error?: string;
  disabled?: boolean;
  /** Lay options out in a row on wider screens (e.g. a 1–5 scale). */
  inline?: boolean;
  tone?: Tone;
  /** Larger question and option text (study questions). */
  size?: "lg";
};

/** Accessible radio group: fieldset/legend, whole-row labels with 44px+ tap targets. */
export function RadioGroup({ name, legend, options, hint, error, disabled, inline, tone, size }: Props) {
  const hintId = hint ? `${name}-hint` : undefined;
  const errorId = error ? `${name}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  const t = TONES[tone ?? "neutral"];
  const lg = size === "lg";
  return (
    <fieldset
      className={`rounded border bg-surface px-5 py-5 ${error ? "border-danger" : "border-line"} ${t.block}`}
      aria-describedby={describedBy}
      aria-invalid={error ? true : undefined}
      disabled={disabled}
    >
      <legend className={`float-left mb-4 w-full font-medium leading-snug text-ink ${lg ? "text-xl" : "text-base"}`}>
        {legend}
      </legend>
      {hint && (
        <p id={hintId} className="clear-left mb-3 text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="clear-left mb-3 text-sm font-medium text-danger">
          <span className="sr-only">Error: </span>
          {error}
        </p>
      )}
      <div className={`clear-left flex gap-2 ${inline ? "flex-col sm:flex-row" : "flex-col"}`}>
        {options.map((o, i) => {
          const id = `${name}-opt-${i}`;
          return (
            <label
              key={o.value}
              htmlFor={id}
              className={`flex min-h-11 cursor-pointer items-center gap-3 rounded border border-line-strong bg-white px-3.5 py-2.5 ${lg ? "text-[17px]" : "text-[15px]"} transition-colors hover:bg-page ${t.option} ${inline ? "sm:flex-1" : ""}`}
            >
              <input id={id} type="radio" name={name} value={o.value} required className="size-4 shrink-0 accent-ink" />
              <span>{o.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
