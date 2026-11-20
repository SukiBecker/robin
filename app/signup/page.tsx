"use client";

import { useRef, useState, type CSSProperties, type FormEvent } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button as JournalButton } from "@/components/journal/button";
import { TextInput } from "@/components/journal/text-input";
import { PostageStamp } from "@/components/journal/postage-stamp";
import { Stamp } from "@/components/journal/stamp";
import { Label } from "@/components/journal/label";
import { formatStampDate } from "@/lib/journal/stamp-date";
import { Alert } from "@/components/alert";
import { useAuthError } from "@/lib/auth/use-auth-error";
import { confirmRedirectUrl, useSignupResend } from "@/lib/auth/use-signup-resend";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password";
import { authCopy } from "@/lib/copy/auth";
import { AuthLayout } from "@/components/auth-layout";
import styles from "./signup.module.css";

const copy = authCopy.signUp;

/** How long "Sent!" stays before it fades out. */
const RESENT_NOTICE_MS = 4000;

/** Sign-up as the first page of Robin's journal (robin-design §2, Journal
    level), the book on the desk: the story and the core loop as a collage
    (a rose growing, then pressed) on the left, the form on the right with
    the Journal's main action (Button ink). Below 48rem book width one
    page, the left content compact above the form. */
export default function SignupPage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  // The form's own check, shown at the confirm line (not in the alert).
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const confirmRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const { error, mood, setFromSupabase, clear } = useAuthError("signUp");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clear();

    // Checked before anything is sent, so a typo never reaches Supabase.
    if (password !== confirmPassword) {
      setConfirmError(authCopy.validation.passwordsDontMatch);
      confirmRef.current?.focus();
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

  const left = (
    <div className={styles.story}>
      <div className={styles.storyText}>
        <h1 className={styles.heading}>{copy.title}</h1>
        <p className={styles.storyLine}>{copy.story}</p>
      </div>
      <GrowthCollage />
    </div>
  );

  const right = (
    <div className={styles.formPage}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <TextInput
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
          hint={copy.displayNameHelp}
        />

        <TextInput
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

        <TextInput
          label={copy.passwordLabel}
          name="password"
          type="password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setConfirmError(null);
            clear();
          }}
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          hint={copy.passwordHelp(MIN_PASSWORD_LENGTH)}
        />

        <TextInput
          ref={confirmRef}
          label={copy.confirmPasswordLabel}
          name="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(event) => {
            setConfirmPassword(event.target.value);
            setConfirmError(null);
            clear();
          }}
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          error={confirmError}
        />

        <Alert variant="error">{error}</Alert>

        <JournalButton
          type="submit"
          variant="ink"
          loading={loading}
          className={styles.submit}
        >
          {copy.submit}
        </JournalButton>
      </form>

      <p className={styles.footer}>
        {copy.footerText}{" "}
        <JournalButton variant="quiet" href="/signin" className={styles.footerLink}>
          {copy.footerLink}
        </JournalButton>
      </p>
    </div>
  );

  return (
    <AuthLayout
      robinMood={confirmError ? "sad" : mood}
      left={left}
      right={right}
    />
  );
}

/* The collage's small tilts: alternating, at most ±2° (robin-design §4,
   album exception — pictures stuck in, no controls). */
const GROWTH_TILTS = [1.5, -1, 2] as const;
const PRESSED_TILT = -1.5;
const TAPES = ["/ui/tape-long-1.webp", "/ui/tape-long-2.webp", "/ui/tape-long-3.webp"] as const;

/** The core loop on the first page: one rose in its three stages, stuck
    in with tape, each with a small label, then the pressed bloom the
    journal keeps. One image for screen readers (the labels alone would
    not make sense). */
function GrowthCollage() {
  return (
    <div className={styles.collage} role="img" aria-label={copy.growth.label}>
      {copy.growth.stages.map((stage, index) => (
        <div key={stage} className={styles.growthStage}>
          <span
            className={styles.cutting}
            style={{ "--tilt": `${GROWTH_TILTS[index]}deg` } as CSSProperties}
          >
            <Image
              className={styles.plant}
              src={`/garden/items/rose-${index + 1}.png`}
              width={400}
              height={400}
              alt=""
              sizes="80px"
              draggable={false}
            />
            <span
              className={styles.tape}
              style={{ backgroundImage: `url("${TAPES[index]}")` }}
            />
          </span>
          <Label className={styles.stageLabel}>{stage}</Label>
        </div>
      ))}
      <span
        className={`${styles.cutting} ${styles.pressed}`}
        style={{ "--tilt": `${PRESSED_TILT}deg` } as CSSProperties}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- small SVG placeholder */}
        <img className={styles.plant} src="/ui/pressed-bloom.svg" alt="" draggable={false} />
        <span className={styles.tape} style={{ backgroundImage: `url("${TAPES[1]}")` }} />
      </span>
    </div>
  );
}

/** "Check your inbox" in the same book: the first stamp stays on the
    left page and gets the rust "Welcome" postmark pressed over its right
    edge (as on the Journal's empty page), just after Robin's happy hop.
    The text and the resend on the right. */
function SignupSuccess({ email }: { email: string }) {
  const { error, mood, setFromSupabase, clear } = useAuthError("signUp");
  // The first email has only just gone out, so the cooldown starts now.
  const { secondsLeft, sending, resent, resend, hideResent } = useSignupResend({
    lockedAtStart: true,
    onError: setFromSupabase,
  });
  // The day of sign-up, fixed once (the Journal later prints the same day).
  const [today] = useState(() => formatStampDate(new Date()));

  function handleResend() {
    clear();
    resend(email);
  }

  const left = (
    <div className={styles.welcomePage}>
      <div className={styles.welcomeStamp}>
        <PostageStamp place="The Garden" unlockLevel={1} showLevel={false} />
        <Stamp
          className={styles.welcome}
          top="The Garden"
          center="Welcome"
          bottom={today}
          color="rust"
          size="sm"
          rotate={-2}
          animate
        />
      </div>
    </div>
  );

  const right = (
    <div className={styles.formPage}>
      <div className={styles.successText}>
        <h1 className={styles.heading}>{copy.success.title}</h1>
        <p className={styles.body}>{copy.success.body(email)}</p>
        <p className={styles.hint}>{copy.success.hint}</p>
      </div>

      <div className={styles.resend}>
        <JournalButton
          variant="secondary"
          loading={sending}
          disabled={secondsLeft > 0}
          onClick={handleResend}
        >
          {secondsLeft > 0 ? copy.success.resendCountdown(secondsLeft) : copy.success.resend}
        </JournalButton>
        {/* Stays mounted (empty) so screen readers pick up "Sent!" when it appears. */}
        <Alert
          variant="success"
          compact
          autoHideMs={RESENT_NOTICE_MS}
          onHide={hideResent}
          className={styles.status}
        >
          {resent ? copy.success.resent : null}
        </Alert>
        <Alert variant="error" className={styles.resendError}>
          {error}
        </Alert>
      </div>

      <p className={styles.links}>
        <JournalButton variant="quiet" href="/signin" className={styles.footerLink}>
          {copy.success.link}
        </JournalButton>
      </p>
    </div>
  );

  return <AuthLayout robinMood={error ? mood : "happy"} left={left} right={right} />;
}
