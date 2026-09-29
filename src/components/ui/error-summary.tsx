"use client";

import { useEffect, useRef } from "react";

export type ErrorItem = { message: string; /** id of the element to jump to */ href?: string };

type Props = { title?: string; items: readonly ErrorItem[] };

/** Error summary that receives focus whenever it appears or its contents change. */
export function ErrorSummary({ title = "There is a problem", items }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const signature = items.map((i) => `${i.href ?? ""}:${i.message}`).join("|");

  useEffect(() => {
    if (signature) ref.current?.focus();
  }, [signature]);

  if (items.length === 0) return null;
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="alert"
      aria-labelledby="error-summary-title"
      className="mb-6 rounded-lg border-2 border-danger bg-danger-soft p-4"
    >
      <h2 id="error-summary-title" className="text-base font-semibold text-danger">
        {title}
      </h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {items.map((item, i) => (
          <li key={i}>
            {item.href ? (
              <a
                href={`#${item.href}`}
                className="font-medium text-danger"
                onClick={(e) => {
                  const el = document.getElementById(item.href!);
                  if (el) {
                    e.preventDefault();
                    el.focus();
                    el.scrollIntoView({ block: "center" });
                  }
                }}
              >
                {item.message}
              </a>
            ) : (
              <span className="text-ink">{item.message}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
