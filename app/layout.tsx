import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bloomly",
  description: "Gamifizierte Lern-App",
};

const navigation = [
  { href: "/studyroom", label: "Studyroom" },
  { href: "/garden", label: "Garten" },
  { href: "/shop", label: "Shop" },
  { href: "/statistics", label: "Statistiken" },
  { href: "/settings", label: "Einstellungen" },
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body>
        <header>
          <nav aria-label="Hauptnavigation">
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
