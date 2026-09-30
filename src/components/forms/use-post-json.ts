"use client";

import { useCallback, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type ApiResult = { ok: true; next: string } | { ok: false; error?: string; next?: string };

/** Only follow same-origin, absolute-path redirects from the API. */
function safePath(next: unknown): string | null {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : null;
}

/**
 * POSTs JSON to one of our API routes and follows `next`. Returns a user-facing
 * error message (or null) and a pending flag. Pending stays true after success so
 * the form can't be submitted twice while navigating.
 */
export function usePostJson(url: string) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const go = useCallback(
    (path: string) => {
      // Same path (e.g. /scenario → next scenario): re-render the server page.
      if (path === pathname) router.refresh();
      else router.replace(path);
    },
    [pathname, router],
  );

  const submit = useCallback(
    async (body: unknown) => {
      setPending(true);
      setError(null);
      let res: Response;
      try {
        res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(body),
          credentials: "same-origin",
          cache: "no-store",
        });
      } catch {
        setPending(false);
        setError("We couldn't reach the server. Check your connection and try again.");
        return;
      }

      let data: ApiResult | null = null;
      try {
        data = (await res.json()) as ApiResult;
      } catch {
        data = null;
      }

      if (res.ok && data?.ok) {
        const next = safePath(data.next);
        if (next) {
          go(next);
          return; // keep pending until the new page renders
        }
      }

      const next = safePath(data && !data.ok ? data.next : undefined);
      if (next) {
        go(next);
        return;
      }

      const code = data && !data.ok ? data.error : undefined;
      setPending(false);
      switch (res.status) {
        case 401:
          router.replace("/");
          return;
        case 403:
          if (code === "bad_origin") {
            setError("Your request couldn't be verified. Please reload the page and try again.");
            return;
          }
          setError("This step is no longer available. Taking you to the right page…");
          router.refresh();
          return;
        case 409:
          setError("This has already been saved. Taking you to the next step…");
          router.refresh();
          return;
        case 422:
          setError("Some answers weren't accepted. Please check them and try again.");
          return;
        default:
          setError("Something went wrong while saving. Please try again.");
      }
    },
    [url, go, router],
  );

  return { submit, pending, error };
}
