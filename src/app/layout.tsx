// Placeholder from Agent 0. Owner: Agent 4.
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Research study",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
