import type { Metadata } from "next";
import { Baloo_2, Quicksand } from "next/font/google";
import { NavBar } from "@/components/nav-bar";
import { StreakSync } from "@/components/streak-sync";
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
        <StreakSync />
        <NavBar />
        <main>{children}</main>
      </body>
    </html>
  );
}
