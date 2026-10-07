import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Serif } from "next/font/google";
import { study } from "@/config/study";
import { SessionBar } from "@/components/server/session-bar";
import "./globals.css";

// Self-hosted at build time by next/font: participants' browsers make no requests to Google.
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
});
const plexSerif = IBM_Plex_Serif({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-plex-serif",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: { default: study.title, template: `%s · ${study.title}` },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// Pages that render an element with [data-wide] (the two-panel scenario screen) widen the header and main.
const WIDTH = "max-w-2xl group-has-[[data-wide]]/body:max-w-[1280px]";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexSerif.variable} ${plexMono.variable}`}>
      <body className="group/body min-h-dvh antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2"
        >
          Skip to main content
        </a>
        <header className="border-b border-line bg-page">
          <div className={`mx-auto flex items-center justify-between gap-4 px-4 py-2 ${WIDTH}`}>
            <p className="font-serif text-[15px] font-semibold text-ink">Research study</p>
            <SessionBar />
          </div>
        </header>
        <main id="main" tabIndex={-1} className={`mx-auto px-4 py-8 focus:outline-none ${WIDTH}`}>
          {children}
        </main>
        <footer className="mx-auto max-w-2xl border-t border-dashed border-line-strong px-4 py-6 text-sm text-muted">
          <p>
            Questions about this study? Contact {study.contact.name}, {study.contact.institution}:{" "}
            <a href={`mailto:${study.contact.email}`}>{study.contact.email}</a>
          </p>
        </footer>
      </body>
    </html>
  );
}
