import { Caveat, Courier_Prime, Fraunces } from "next/font/google";

/* Candidate fonts for the journal roles (checkliste B1). Loaded only on
   /dev/components for now — the rest of the app keeps Baloo 2 / Quicksand
   until the switch happens in its own step. Own variable names on purpose,
   so nothing collides with the global --font-display; the role variables
   (--font-display, --font-label, --font-hand) are mapped on .page. */

export const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal"],
  display: "swap",
  variable: "--font-fraunces",
});

export const courierPrime = Courier_Prime({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal"],
  display: "swap",
  variable: "--font-courier-prime",
});

export const caveat = Caveat({
  subsets: ["latin"],
  weight: ["500"],
  display: "swap",
  variable: "--font-caveat",
});

export const fontVariables = [fraunces.variable, courierPrime.variable, caveat.variable].join(" ");
