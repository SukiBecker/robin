import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bloomly",
  description: "Gamified Learning App",
};

const navigation = [
  { href: "/studyroom", label: "Studyroom" },
  { href: "/garden", label: "Garden" },
  { href: "/shop", label: "Shop" },
  { href: "/statistics", label: "Statistics" },
  { href: "/settings", label: "Settings" },
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header>
          <nav aria-label="Main navigation">
            <Link href="/">Bloomly</Link>
            {navigation.map((item) => (
              <Link href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
