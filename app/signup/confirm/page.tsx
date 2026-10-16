"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { authCopy } from "@/lib/copy/auth";
import styles from "../signup.module.css";

type ConfirmStatus = "confirming" | "invalid";

const copy = authCopy.confirmEmail;

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
      <p className={styles.body}>{copy.loadingTitle}</p>
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
        <h1 className={styles.heading}>{copy.invalid.title}</h1>
        <p className={styles.body}>
          {copy.invalid.body}{" "}
          <Link href="/signin">{copy.invalid.primary}</Link>{" "}
          <Link href="/signup">{copy.invalid.secondary}</Link>
        </p>
      </AuthCard>
    );
  }

  return <ConfirmingCard />;
}
