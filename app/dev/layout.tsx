import { notFound } from "next/navigation";
import type { ReactNode } from "react";

/** Everything under /dev is a local playground — 404 in production. */
export default function DevLayout({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound();
  return children;
}
