import { Caveat, Courier_Prime, Fraunces } from "next/font/google";

/* The three journal font roles, loaded app-wide from the root layout.
   Own variable names on purpose; the role variables (--font-display,
   --font-body, --font-label, --font-hand) are mapped on body in globals.css. */

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
