import type { Metadata } from "next";
import { Baloo_2, Quicksand } from "next/font/google";
import { NavBar } from "@/components/nav-bar";
import { AuthWatcher } from "@/components/auth-watcher";
import { StreakSync } from "@/components/streak-sync";
import { StampDefs } from "@/components/journal/stamp";
import "./globals.css";

export const metadata: Metadata = {
  title: "Robin",
  description: "Gamified Learning App",
};

const displayFont = Baloo_2({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
});
const bodyFont = Quicksand({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-body",
});

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${displayFont.variable} ${bodyFont.variable}`}>
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
