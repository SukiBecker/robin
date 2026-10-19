"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/button";
import { TextField } from "@/components/text-field";
import { Alert } from "@/components/alert";
import { useAuthError } from "@/lib/auth/use-auth-error";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password";
import { authCopy } from "@/lib/copy/auth";
import { AuthLayout } from "@/components/auth-layout";
import styles from "./signup.module.css";

const copy = authCopy.signUp;

/** Supabase allows one signup email per address per minute, so resend
    stays locked for that long — starting right away, since the first
    email has only just gone out. */
const RESEND_COOLDOWN_MS = 60_000;
/** How long "Sent!" stays before it fades out. */
const RESENT_NOTICE_MS = 4000;

function confirmRedirectUrl() {
  return `${window.location.origin}/signup/confirm`;
}

export default function SignupPage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { error, mood, setFromSupabase, setValidation, clear } = useAuthError("signUp");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clear();

    // Checked before anything is sent, so a typo never reaches Supabase.
    if (password !== confirmPassword) {
      setValidation(authCopy.validation.passwordsDontMatch);
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: confirmRedirectUrl(),
        data: {
          display_name: displayName,
          timezone,
        },
      },
    });

    setLoading(false);

    if (signUpError) {
      setFromSupabase(signUpError);
      return;
    }

    setSuccess(true);
  }

  if (success) {
    return <SignupSuccess email={email} />;
  }

  return (
    <AuthLayout robinMood={mood}>
      <div className={styles.intro}>
        <h1 className={styles.heading}>{copy.title}</h1>
        <p className={styles.subtitle}>{copy.subtitle}</p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <TextField
          label={copy.displayNameLabel}
          name="displayName"
          type="text"
          value={displayName}
          onChange={(event) => {
            setDisplayName(event.target.value);
            clear();
          }}
          required
          autoComplete="nickname"
          helpText={copy.displayNameHelp}
        />

        <TextField
          label={copy.emailLabel}
          name="email"
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            clear();
          }}
          required
          autoComplete="email"
          placeholder={copy.emailPlaceholder}
        />

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

        <Alert variant="error">{error}</Alert>

        <Button type="submit" disabled={loading} className={styles.submitSpacing}>
          {loading ? copy.submitting : copy.submit}
        </Button>
      </form>

      <div className={styles.links}>
        <p>
          {copy.footerText} <Link href="/signin">{copy.footerLink}</Link>
        </p>
      </div>
    </AuthLayout>
  );
}

function SignupSuccess({ email }: { email: string }) {
  const [cooldownEnd, setCooldownEnd] = useState(() => Date.now() + RESEND_COOLDOWN_MS);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_MS / 1000);
  const [sending, setSending] = useState(false);
  const [resent, setResent] = useState(false);
  const { error, mood, setFromSupabase, clear } = useAuthError("signUp");

  useEffect(() => {
    const tick = () => {
      const left = Math.max(0, Math.ceil((cooldownEnd - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) clearInterval(id);
    };
    const id = setInterval(tick, 1000);
    tick();
    return () => clearInterval(id);
  }, [cooldownEnd]);

  async function handleResend() {
    clear();
    setResent(false);
    setSending(true);

    const supabase = createClient();
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: confirmRedirectUrl() },
    });

    setSending(false);

    if (resendError) {
      setFromSupabase(resendError);
      return;
    }

    setResent(true);
    setCooldownEnd(Date.now() + RESEND_COOLDOWN_MS);
  }

  return (
    <AuthLayout robinMood={error ? mood : "happy"}>
      <h1 className={styles.heading}>{copy.success.title}</h1>

      <div className={styles.successText}>
        <p className={styles.body}>{copy.success.body(email)}</p>
        <p className={styles.hint}>{copy.success.hint}</p>
      </div>

      <div className={styles.resend}>
        <Button
          variant="secondary"
          loading={sending}
          disabled={secondsLeft > 0}
          onClick={handleResend}
        >
          {secondsLeft > 0 ? copy.success.resendCountdown(secondsLeft) : copy.success.resend}
        </Button>
        {/* Stays mounted (empty) so screen readers pick up "Sent!" when it appears. */}
        <Alert
          variant="success"
          compact
          autoHideMs={RESENT_NOTICE_MS}
          onHide={() => setResent(false)}
          className={styles.status}
        >
          {resent ? copy.success.resent : null}
        </Alert>
        <Alert variant="error" className={styles.resendError}>
          {error}
        </Alert>
      </div>

      <div className={styles.links}>
        <p>
          <Link href="/signin">{copy.success.link}</Link>
        </p>
      </div>
    </AuthLayout>
  );
}
