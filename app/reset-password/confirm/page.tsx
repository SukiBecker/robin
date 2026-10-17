"use client";

import { Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/button";
import { mapAuthError } from "@/lib/auth/map-auth-error";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password";
import { authCopy } from "@/lib/copy/auth";
import { AuthLayout } from "@/components/auth-layout";
import styles from "../reset-password.module.css";

type LinkStatus = "verifying" | "ready" | "invalid";

const copy = authCopy.newPassword;

export default function ResetPasswordConfirmPage() {
  return (
    <Suspense fallback={<VerifyingCard />}>
      <ResetPasswordConfirmForm />
    </Suspense>
  );
}

function VerifyingCard() {
  return (
    <AuthLayout>
      <p className={styles.body}>{copy.verifying}</p>
    </AuthLayout>
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
      setError(authCopy.validation.passwordsDontMatch);
      return;
    }

    setSubmitting(true);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    setSubmitting(false);

    if (updateError) {
      setError(mapAuthError(updateError, "newPassword"));
      return;
    }

    setSuccess(true);
  }

  if (linkStatus === "verifying") {
    return <VerifyingCard />;
  }

  if (linkStatus === "invalid") {
    return (
      <AuthLayout>
        <h1 className={styles.heading}>{copy.invalid.title}</h1>
        <p className={styles.body}>
          {copy.invalid.body}{" "}
          <Link href="/reset-password">{copy.invalid.primary}</Link>
        </p>
      </AuthLayout>
    );
  }

  if (success) {
    return (
      <AuthLayout>
        <h1 className={styles.heading}>{copy.success.title}</h1>
        <p className={styles.body}>
          {copy.success.body}{" "}
          <Link href="/signin">{authCopy.common.backToSignIn}</Link>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h1 className={styles.heading}>{copy.title}</h1>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="password" className={styles.label}>
            {copy.passwordLabel}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            className={styles.input}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="confirmPassword" className={styles.label}>
            {copy.confirmPasswordLabel}
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            className={styles.input}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
          />
        </div>

        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}

        <Button type="submit" disabled={submitting} className={styles.submitSpacing}>
          {submitting ? copy.submitting : copy.submit}
        </Button>
      </form>
    </AuthLayout>
  );
}

