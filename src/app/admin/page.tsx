import type { Metadata } from "next";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { getDashboardStats } from "@/lib/admin/stats";
import { CHOICE_OPTIONS } from "@/config/study";

/** Fixed decimals, or an em dash when the value can't be computed yet (NaN). */
const fmt = (n: number, digits: number) => (Number.isFinite(n) ? n.toFixed(digits) : "—");
const choiceLabel = (c: string | null) => CHOICE_OPTIONS.find((o) => o.value === c)?.label ?? "—";

export const metadata: Metadata = {
  title: "Admin dashboard",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  // Admin data must never be prerendered into static HTML at build time.
  await connection();
  await requireAdmin();
  const stats = await getDashboardStats();

  const counts = [
    { label: "Started", value: stats.started },
    { label: "Completed", value: stats.completed },
    { label: "In progress", value: stats.inProgress },
    {
      label: "Comprehension-check failures",
      value: stats.comprehensionFailures,
    },
    { label: "Duplicate groups", value: stats.duplicateGroups.length },
    { label: "Straight-liners", value: stats.straightLiners.length },
  ];

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 text-neutral-900">
      <h1 className="text-2xl font-semibold">Admin dashboard</h1>

      <section aria-labelledby="counts-heading" className="mt-6">
        <h2 id="counts-heading" className="text-lg font-semibold">
          Counts
        </h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {counts.map((c) => (
            <div key={c.label} className="rounded border border-neutral-300 p-3">
              <dt className="text-sm text-neutral-700">{c.label}</dt>
              <dd className="text-2xl font-semibold tabular-nums">{c.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="rel-heading" className="mt-8">
        <h2 id="rel-heading" className="text-lg font-semibold">
          Inter-rater reliability (utilitarian question)
        </h2>
        <p className="mt-1 text-sm text-neutral-700">
          Participants are the raters and scenarios the items, using every answer saved so far. 1 means
          perfect agreement and 0 means chance level; Krippendorff&apos;s α ≥ 0.800 is commonly treated as
          reliable and ≥ 0.667 as tentative. “Excluding flagged” leaves out duplicate groups,
          straight-liners and comprehension-check failures. A dash means there aren&apos;t yet 2 answers
          for any scenario.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-400">
                <th scope="col" className="py-2 pr-4">
                  Responses
                </th>
                <th scope="col" className="py-2 pr-4">
                  Krippendorff&apos;s α
                </th>
                <th scope="col" className="py-2 pr-4">
                  Fleiss&apos; κ
                </th>
                <th scope="col" className="py-2 pr-4">
                  % agreement
                </th>
                <th scope="col" className="py-2 pr-4">
                  Participants
                </th>
                <th scope="col" className="py-2 pr-4">
                  Scenarios
                </th>
                <th scope="col" className="py-2">
                  Ratings
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "All answered", g: stats.reliability.all },
                { label: "Excluding flagged", g: stats.reliability.unflagged },
              ].map(({ label, g }) => (
                <tr key={label} className="border-b border-neutral-200 tabular-nums">
                  <th scope="row" className="py-2 pr-4 font-medium">
                    {label}
                  </th>
                  <td className="py-2 pr-4 text-base font-semibold">{fmt(g.alpha, 3)}</td>
                  <td className="py-2 pr-4">{fmt(g.kappa, 3)}</td>
                  <td className="py-2 pr-4">{fmt(g.percentAgreement, 1)}</td>
                  <td className="py-2 pr-4">{g.participants}</td>
                  <td className="py-2 pr-4">{g.units}</td>
                  <td className="py-2">{g.ratings}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="mt-6 font-semibold">Agreement by scenario</h3>
        <p className="mt-1 text-sm text-neutral-700">
          All answered responses, lowest agreement first. % agreement is the share of participant pairs who
          chose the same action.
        </p>
        {stats.reliability.scenarios.length === 0 ? (
          <p className="mt-3">No answers yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-400">
                  <th scope="col" className="py-2 pr-4">
                    Scenario
                  </th>
                  <th scope="col" className="py-2 pr-4">
                    Ratings
                  </th>
                  <th scope="col" className="py-2 pr-4">
                    % agreement
                  </th>
                  <th scope="col" className="py-2 pr-4">
                    Most common answer
                  </th>
                  <th scope="col" className="py-2">
                    Matches key
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.reliability.scenarios.map((s) => (
                  <tr key={s.scenarioId} className="border-b border-neutral-200 align-top tabular-nums">
                    <td className="py-2 pr-4">
                      <span className="font-mono">{s.scenarioId}</span>
                      {s.title !== s.scenarioId && <span className="block text-neutral-700">{s.title}</span>}
                    </td>
                    <td className="py-2 pr-4">{s.n}</td>
                    <td className="py-2 pr-4">{fmt(s.pairwisePct, 1)}</td>
                    <td className="py-2 pr-4">
                      {choiceLabel(s.mode)} ({fmt(s.modeShare, 0)}%)
                    </td>
                    <td className="py-2">
                      {s.modeMatchesKey === null ? "—" : s.modeMatchesKey ? "Yes" : "No"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="exports-heading" className="mt-8">
        <h2 id="exports-heading" className="text-lg font-semibold">
          CSV exports
        </h2>
        <ul className="mt-3 flex flex-wrap gap-3">
          {[
            {
              href: "/admin/export/responses.csv",
              label: "Download responses.csv",
            },
            {
              href: "/admin/export/participants.csv",
              label: "Download participants.csv",
            },
          ].map((l) => (
            <li key={l.href}>
              {/* Plain <a>: file downloads must not go through client-side navigation. */}
              <a
                href={l.href}
                download
                className="inline-flex min-h-11 items-center rounded border border-neutral-800 px-4 font-medium underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="dup-heading" className="mt-8">
        <h2 id="dup-heading" className="text-lg font-semibold">
          Duplicate answer strings
        </h2>
        <p className="mt-1 text-sm text-neutral-700">
          Completed participants whose answers exactly match another completed participant&apos;s.
        </p>
        {stats.duplicateGroups.length === 0 ? (
          <p className="mt-3">None.</p>
        ) : (
          <table className="mt-3 w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-400">
                <th scope="col" className="py-2 pr-4">
                  Group
                </th>
                <th scope="col" className="py-2">
                  Participant IDs
                </th>
              </tr>
            </thead>
            <tbody>
              {stats.duplicateGroups.map((g) => (
                <tr key={g.groupId} className="border-b border-neutral-200 align-top">
                  <td className="py-2 pr-4 font-mono">{g.groupId}</td>
                  <td className="py-2 font-mono break-all">{g.participantIds.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section aria-labelledby="sl-heading" className="mt-8">
        <h2 id="sl-heading" className="text-lg font-semibold">
          Straight-liners
        </h2>
        <p className="mt-1 text-sm text-neutral-700">
          Completed participants who gave the same answer for every question.
        </p>
        {stats.straightLiners.length === 0 ? (
          <p className="mt-3">None.</p>
        ) : (
          <ul className="mt-3 list-disc pl-6 font-mono text-sm">
            {stats.straightLiners.map((id) => (
              <li key={id}>{id}</li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
