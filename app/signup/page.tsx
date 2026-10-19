"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/button";
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
const RESENT_NOTICE_MS = 4000;

function confirmRedirectUrl() {
  return `${window.location.origin}/signup/confirm`;
}

export default function SignupPage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { error, mood, setFromSupabase, clear } = useAuthError("signUp");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clear();
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
      <h1 className={styles.heading}>{copy.title}</h1>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="displayName" className={styles.label}>
            {copy.displayNameLabel}
          </label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            className={styles.input}
            value={displayName}
            onChange={(event) => {
              setDisplayName(event.target.value);
              clear();
            }}
            required
            autoComplete="nickname"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="email" className={styles.label}>
            {copy.emailLabel}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className={styles.input}
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              clear();
            }}
            required
            autoComplete="email"
            placeholder={copy.emailPlaceholder}
          />
        </div>

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
            onChange={(event) => {
              setPassword(event.target.value);
              clear();
            }}
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

  useEffect(() => {
    if (!resent) return;
    const id = setTimeout(() => setResent(false), RESENT_NOTICE_MS);
    return () => clearTimeout(id);
  }, [resent]);

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
        {/* Always mounted so screen readers pick up the message when it appears. */}
        <p role="status" className={styles.status}>
          {resent ? copy.success.resent : ""}
        </p>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
      </div>

      <div className={styles.links}>
        <p>
          <Link href="/signin">{copy.success.link}</Link>
        </p>
      </div>
    </AuthLayout>
  );
}
