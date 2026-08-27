"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./nav-bar.module.css";

const navigation = [
  { href: "/studyroom", label: "Studyroom" },
  { href: "/garden", label: "Garden" },
  { href: "/shop", label: "Shop" },
  { href: "/statistics", label: "Statistics" },
  { href: "/settings", label: "Settings" },
];

// Sign in / sign up are standalone auth screens, not part of the main app
// shell — no point showing nav for sections the user can't reach yet.
const NAV_LESS_ROUTES = ["/signin", "/signup"];

export function NavBar() {
  const pathname = usePathname();

  if (NAV_LESS_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return null;
  }

  return (
    <header className={styles.header}>
      <nav className={styles.nav} aria-label="Main navigation">
        <Link href="/" className={styles.brand}>
          Bloomly
        </Link>

        <div className={styles.links}>
          {navigation.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.link} ${active ? styles.linkActive : ""}`}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
