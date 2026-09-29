import type { Metadata } from "next";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { getDashboardStats } from "@/lib/admin/stats";

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
    { label: "Comprehension-check failures", value: stats.comprehensionFailures },
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

      <section aria-labelledby="exports-heading" className="mt-8">
        <h2 id="exports-heading" className="text-lg font-semibold">
          CSV exports
        </h2>
        <ul className="mt-3 flex flex-wrap gap-3">
          {[
            { href: "/admin/export/responses.csv", label: "Download responses.csv" },
            { href: "/admin/export/participants.csv", label: "Download participants.csv" },
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
          Completed participants who gave the same answer for every utilitarian and Kantian question.
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
