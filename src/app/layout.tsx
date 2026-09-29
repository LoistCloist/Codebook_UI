import type { Metadata, Viewport } from "next";
import { study } from "@/config/study";
import { SessionBar } from "@/components/server/session-bar";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: study.title, template: `%s · ${study.title}` },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2"
        >
          Skip to main content
        </a>
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-2">
            <p className="text-sm font-semibold text-ink">Research study</p>
            <SessionBar />
          </div>
        </header>
        <main id="main" tabIndex={-1} className="mx-auto max-w-2xl px-4 py-8 focus:outline-none">
          {children}
        </main>
        <footer className="mx-auto max-w-2xl border-t border-line px-4 py-6 text-sm text-muted">
          <p>
            Questions about this study? Contact {study.contact.name}, {study.contact.institution}:{" "}
            <a href={`mailto:${study.contact.email}`}>{study.contact.email}</a>
          </p>
        </footer>
      </body>
    </html>
  );
}
