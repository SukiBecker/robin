"use client";

import { Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/button";
import { TextField } from "@/components/text-field";
import { Alert } from "@/components/alert";
import { useAuthError } from "@/lib/auth/use-auth-error";
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
      <p role="status" className={styles.body}>
        {copy.verifying}
      </p>
    </AuthLayout>
  );
}

function ResetPasswordConfirmForm() {
  const searchParams = useSearchParams();
  const [linkStatus, setLinkStatus] = useState<LinkStatus>("verifying");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { error, errorKey, mood, setFromSupabase, setValidation, clear } =
    useAuthError("newPassword");
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
    clear();

    if (password !== confirmPassword) {
      setValidation(authCopy.validation.passwordsDontMatch);
      return;
    }

    setSubmitting(true);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    setSubmitting(false);

    if (updateError) {
      setFromSupabase(updateError);
      return;
    }

    setSuccess(true);
  }

  if (linkStatus === "verifying") {
    return <VerifyingCard />;
  }

  if (linkStatus === "invalid") {
    return (
      <AuthLayout robinMood="sad">
        <h1 className={styles.heading}>{copy.invalid.title}</h1>
        <p className={styles.body}>{copy.invalid.body}</p>
        <Button href="/reset-password">{copy.invalid.primary}</Button>
        <div className={styles.links}>
          <p>
            <Link href="/signin">{copy.invalid.secondary}</Link>
          </p>
        </div>
      </AuthLayout>
    );
  }

  if (success) {
    return (
      <AuthLayout robinMood="happy">
        <h1 className={styles.heading}>{copy.success.title}</h1>
        <p className={styles.body}>{copy.success.body}</p>
        <Button href="/studyroom">{copy.success.primary}</Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout robinMood={mood}>
      <div className={styles.intro}>
        <h1 className={styles.heading}>{copy.title}</h1>
        <p className={styles.subtitle}>{copy.subtitle}</p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <TextField
          label={copy.passwordLabel}
          name="password"
          type="password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            clear();
          }}
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          helpText={copy.passwordHelp(MIN_PASSWORD_LENGTH)}
        />

        <TextField
          label={copy.confirmPasswordLabel}
          name="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(event) => {
            setConfirmPassword(event.target.value);
            clear();
          }}
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
        />

        <Alert
          variant="error"
          action={
            errorKey === "sessionExpired" ? (
              <Button href="/reset-password" size="sm" variant="secondary">
                {copy.errors.sessionExpiredAction}
              </Button>
            ) : undefined
          }
        >
          {error}
        </Alert>

        <Button type="submit" disabled={submitting} className={styles.submitSpacing}>
          {submitting ? copy.submitting : copy.submit}
        </Button>
      </form>
    </AuthLayout>
  );
}

