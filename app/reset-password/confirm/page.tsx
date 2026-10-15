"use client";

import { Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { isAuthApiError, type AuthError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/button";
import styles from "../reset-password.module.css";

type LinkStatus = "verifying" | "ready" | "invalid";

export default function ResetPasswordConfirmPage() {
  return (
    <Suspense fallback={<VerifyingCard />}>
      <ResetPasswordConfirmForm />
    </Suspense>
  );
}

// Same page/card shell as signin/signup, shared by every state below.
function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${styles.page}`}>
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.glowSecondary} aria-hidden="true" />
      <section className={styles.card}>{children}</section>
    </div>
  );
}

function VerifyingCard() {
  return (
    <AuthCard>
      <p className={styles.body}>Verifying your reset link…</p>
    </AuthCard>
  );
}

function ResetPasswordConfirmForm() {
  const searchParams = useSearchParams();
  const [linkStatus, setLinkStatus] = useState<LinkStatus>("verifying");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  // The auth code is single-use, so this effect must only ever call
  // exchangeCodeForSession once per code — e.g. under React Strict Mode
  // (which intentionally double-invokes effects in dev) a second call
  // would fail and could flip a genuinely successful confirmation to
  // "invalid". Defensive guard; harmless if the effect only runs once.
  const exchangedRef = useRef(false);

  useEffect(() => {
    const code = searchParams.get("code");

    if (!code) {
      setLinkStatus("invalid");
      return;
    }

    if (exchangedRef.current) {
      return;
    }
    exchangedRef.current = true;

    const supabase = createClient();
    supabase.auth.exchangeCodeForSession(code).then(({ error: exchangeError }) => {
      setLinkStatus(exchangeError ? "invalid" : "ready");
    });
  }, [searchParams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    setSubmitting(false);

    if (updateError) {
      setError(getUpdatePasswordErrorMessage(updateError));
      return;
    }

    setSuccess(true);
  }

  if (linkStatus === "verifying") {
    return <VerifyingCard />;
  }

  if (linkStatus === "invalid") {
    return (
      <AuthCard>
        <h1 className={styles.heading}>Link Invalid</h1>
        <p className={styles.body}>
          This password reset link is invalid or has expired.{" "}
          <Link href="/reset-password">Request a new one</Link>.
        </p>
      </AuthCard>
    );
  }

  if (success) {
    return (
      <AuthCard>
        <h1 className={styles.heading}>Password Updated</h1>
        <p className={styles.body}>
          Your password has been updated. You can now{" "}
          <Link href="/signin">sign in</Link> with your new password.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <h1 className={styles.heading}>Set New Password</h1>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="password" className={styles.label}>
            New Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            className={styles.input}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="confirmPassword" className={styles.label}>
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            className={styles.input}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>

        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}

        <Button type="submit" disabled={submitting} className={styles.submitSpacing}>
          {submitting ? "Updating…" : "Update Password"}
        </Button>
      </form>
    </AuthCard>
  );
}

/**
 * Maps an updateUser() AuthError to a user-facing English message.
 * Prefers the structured `code` (GoTrue error codes); falls back to a
 * generic message for older/self-hosted GoTrue instances without one.
 */
function getUpdatePasswordErrorMessage(error: AuthError): string {
  if (isAuthApiError(error)) {
    switch (error.code) {
      case "weak_password":
        return "This password is too weak. Please choose a stronger password.";
      case "same_password":
        return "New password must be different from your current password.";
      case "session_not_found":
        return "Your session has expired. Please request a new reset link.";
    }
  }

  return "Could not update your password. Please try again.";
}
