import type { ReactNode } from "react";

export type RadioOption = { value: string; label: string };

/** id of the first radio in a group; error-summary links point here. */
export function fieldAnchor(name: string): string {
  return `${name}-opt-0`;
}

type Props = {
  name: string;
  legend: ReactNode;
  options: readonly RadioOption[];
  hint?: ReactNode;
  error?: string;
  disabled?: boolean;
  /** Lay options out in a row on wider screens (e.g. a 1–5 scale). */
  inline?: boolean;
};

/** Accessible radio group: fieldset/legend, whole-row labels with 44px+ tap targets. */
export function RadioGroup({ name, legend, options, hint, error, disabled, inline }: Props) {
  const hintId = hint ? `${name}-hint` : undefined;
  const errorId = error ? `${name}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <fieldset
      className={`rounded-lg border bg-surface p-4 ${error ? "border-danger" : "border-line"}`}
      aria-describedby={describedBy}
      aria-invalid={error ? true : undefined}
      disabled={disabled}
    >
      <legend className="float-left mb-3 w-full text-base font-semibold text-ink">{legend}</legend>
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
              className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-line px-3 py-2 hover:bg-accent-soft has-[:checked]:border-accent has-[:checked]:bg-accent-soft ${inline ? "sm:flex-1" : ""}`}
            >
              <input
                id={id}
                type="radio"
                name={name}
                value={o.value}
                required
                className="size-5 shrink-0 accent-accent"
              />
              <span>{o.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
