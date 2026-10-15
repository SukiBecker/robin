"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import styles from "../signup.module.css";

type ConfirmStatus = "confirming" | "invalid";

export default function SignupConfirmPage() {
  return (
    <Suspense fallback={<ConfirmingCard />}>
      <SignupConfirmHandler />
    </Suspense>
  );
}

// Same page/card shell as signin/signup.
function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${styles.page}`}>
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.glowSecondary} aria-hidden="true" />
      <section className={styles.card}>{children}</section>
    </div>
  );
}

function ConfirmingCard() {
  return (
    <AuthCard>
      <p className={styles.body}>Confirming your email…</p>
    </AuthCard>
  );
}

function SignupConfirmHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<ConfirmStatus>("confirming");
  // The auth code is single-use, so this effect must only ever call
  // exchangeCodeForSession once per code — e.g. under React Strict Mode
  // (which intentionally double-invokes effects in dev) a second call
  // would fail and could flip a genuinely successful confirmation to
  // "invalid". Defensive guard; harmless if the effect only runs once.
  const exchangedRef = useRef(false);

  useEffect(() => {
    const code = searchParams.get("code");

    if (!code) {
      setStatus("invalid");
      return;
    }

    if (exchangedRef.current) {
      return;
    }
    exchangedRef.current = true;

    const supabase = createClient();
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        setStatus("invalid");
        return;
      }

      router.push("/");
    });
  }, [searchParams, router]);

  if (status === "invalid") {
    return (
      <AuthCard>
        <h1 className={styles.heading}>Link Invalid</h1>
        <p className={styles.body}>
          This confirmation link is invalid or has expired. If you still need
          to confirm your account, try{" "}
          <Link href="/signup">signing up again</Link> to get a new link, or{" "}
          <Link href="/signin">sign in</Link> if you&apos;ve already
          confirmed.
        </p>
      </AuthCard>
    );
  }

  return <ConfirmingCard />;
}
