"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button as JournalButton } from "@/components/journal/button";
import { TextInput } from "@/components/journal/text-input";
import { Alert } from "@/components/alert";
import { useAuthError } from "@/lib/auth/use-auth-error";
import { useSignupResend } from "@/lib/auth/use-signup-resend";
import { authCopy } from "@/lib/copy/auth";
import { AuthLayout } from "@/components/auth-layout";
import { AuthJournalStory } from "@/components/auth-journal-story";
import journal from "@/components/auth-journal.module.css";
import styles from "./signin.module.css";

const copy = authCopy.signIn;

/** How long Robin gets to be happy before we leave the page: his double
    hop runs ~820ms. With reduced motion there's no hop, just the image
    crossfade, so a shorter beat is enough. */
const HAPPY_HOLD_MS = 900;
const HAPPY_HOLD_REDUCED_MS = 400;
/** How long "Sent!" stays before it fades out (same as /signup). */
const RESENT_NOTICE_MS = 4000;

export default function SigninPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const { error, errorKey, mood, setFromSupabase, clear } = useAuthError("signIn");
  // Resend failures get their own message, so the "confirm your email"
  // error (and the button in it) stays put for another try.
  const resendError = useAuthError("signUp");
  const { secondsLeft, sending, resent, resend, hideResent } = useSignupResend({
    onError: resendError.setFromSupabase,
  });

  function clearErrors() {
    clear();
    resendError.clear();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearErrors();
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setLoading(false);
      setFromSupabase(signInError);
      return;
    }

    // Let Robin celebrate before redirecting. The button stays in its
    // "Signing in…" state meanwhile; prefetching makes the hand-off
    // instant once the beat is over.
    setSignedIn(true);
    router.prefetch("/studyroom");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTimeout(() => router.push("/studyroom"), reducedMotion ? HAPPY_HOLD_REDUCED_MS : HAPPY_HOLD_MS);
  }

  const right = (
    <div className={journal.formPage}>
      <div className={journal.intro}>
        <h1 className={journal.heading}>{copy.title}</h1>
        <p className={journal.body}>{copy.subtitle}</p>
      </div>

      <form className={journal.form} onSubmit={handleSubmit}>
        <TextInput
          label={copy.emailLabel}
          name="email"
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            clearErrors();
          }}
          required
          autoComplete="email"
          placeholder={copy.emailPlaceholder}
        />

        <TextInput
          label={copy.passwordLabel}
          name="password"
          type="password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            clearErrors();
          }}
          required
          autoComplete="current-password"
        />

        {error && (
          <div className={styles.errorGroup}>
            <Alert
              variant="error"
              action={
                errorKey === "emailNotConfirmed" ? (
                  <JournalButton
                    variant="secondary"
                    loading={sending}
                    disabled={secondsLeft > 0}
                    onClick={() => {
                      resendError.clear();
                      resend(email);
                    }}
                  >
                    {secondsLeft > 0
                      ? authCopy.signUp.success.resendCountdown(secondsLeft)
                      : copy.resend}
                  </JournalButton>
                ) : undefined
              }
            >
              {error}
            </Alert>
            {/* Stays mounted (empty) while the error shows, so screen
                readers pick up "Sent!" when it appears. */}
            <Alert
              variant="success"
              compact
              autoHideMs={RESENT_NOTICE_MS}
              onHide={hideResent}
              className={styles.notice}
            >
              {resent ? authCopy.signUp.success.resent : null}
            </Alert>
            <Alert variant="error" compact className={styles.notice}>
              {resendError.error}
            </Alert>
          </div>
        )}

        <JournalButton
          type="submit"
          variant="ink"
          loading={loading}
          className={journal.submit}
        >
          {copy.submit}
        </JournalButton>
      </form>

      <div className={styles.links}>
        <p className={journal.footer}>
          <JournalButton variant="quiet" href="/reset-password" className={journal.footerLink}>
            {copy.forgotPassword}
          </JournalButton>
        </p>
        <p className={journal.footer}>
          {copy.footerText}{" "}
          <JournalButton variant="quiet" href="/signup" className={journal.footerLink}>
            {copy.footerLink}
          </JournalButton>
        </p>
      </div>
    </div>
  );

  return (
    <AuthLayout
      robinMood={signedIn ? "happy" : mood}
      left={<AuthJournalStory headingAs="p" />}
      right={right}
    />
  );
}
