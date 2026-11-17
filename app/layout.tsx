import type { Metadata } from "next";
import { NavBar } from "@/components/nav-bar";
import { AuthWatcher } from "@/components/auth-watcher";
import { StreakSync } from "@/components/streak-sync";
import { StampDefs } from "@/components/journal/stamp";
import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Robin",
  description: "Gamified Learning App",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={fontVariables}>
        {/* Planned: a TransitionProvider around these, and the cloud-wipe
            overlay as a sibling of <main> — the root layout never remounts
            on navigation, so the overlay can cover the switch to
            /studyroom. Triggers live in components/landing/landing-ctas.tsx
            (and the sign-in redirect). */}
        {/* Shared SVG filters for every Stamp (ink print, plant threshold). */}
        <StampDefs />
        <AuthWatcher />
        <StreakSync />
        <NavBar />
        <main>{children}</main>
      </body>
    </html>
  );
}
