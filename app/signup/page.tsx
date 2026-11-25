"use client";

import { useRef, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button as JournalButton } from "@/components/journal/button";
import { TextInput } from "@/components/journal/text-input";
import { PostageStamp } from "@/components/journal/postage-stamp";
import { Stamp } from "@/components/journal/stamp";
import { formatStampDate } from "@/lib/journal/stamp-date";
import { Alert } from "@/components/alert";
import { useAuthError } from "@/lib/auth/use-auth-error";
import { confirmRedirectUrl, useSignupResend } from "@/lib/auth/use-signup-resend";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password";
import { authCopy } from "@/lib/copy/auth";
import { AuthLayout } from "@/components/auth-layout";
import { AuthJournalStory } from "@/components/auth-journal-story";
import journal from "@/components/auth-journal.module.css";
import styles from "./signup.module.css";

const copy = authCopy.signUp;

/** How long "Sent!" stays before it fades out. */
const RESENT_NOTICE_MS = 4000;

/** Sign-up as the first page of Robin's journal (robin-design §2, Journal
    level), the book on the desk: AuthJournalStory on the left, the form on the right with
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
  // Resend lives here, not in the success pages: the book must stay
  // mounted when the pages swap (a fresh book flashes its shadow).
  const { secondsLeft, sending, resent, resend, hideResent, lock } = useSignupResend({
    onError: setFromSupabase,
  });
  // The day of sign-up, fixed once (the Journal later prints the same day).
  const [today] = useState(() => formatStampDate(new Date()));

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

    // The first email has only just gone out, so the cooldown starts now.
    lock();
    setSuccess(true);
  }

  if (success) {
    return (
      <AuthLayout
        robinMood={error ? mood : "happy"}
        left={<SuccessLeft today={today} />}
        right={
          <SuccessRight
            email={email}
            error={error}
            secondsLeft={secondsLeft}
            sending={sending}
            resent={resent}
            onResend={() => {
              clear();
              resend(email);
            }}
            onHideResent={hideResent}
          />
        }
      />
    );
  }

  const right = (
    <div className={journal.formPage}>
      <form className={journal.form} onSubmit={handleSubmit}>
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
          className={journal.submit}
        >
          {copy.submit}
        </JournalButton>
      </form>

      <p className={journal.footer}>
        {copy.footerText}{" "}
        <JournalButton variant="quiet" href="/signin" className={journal.footerLink}>
          {copy.footerLink}
        </JournalButton>
      </p>
    </div>
  );

  return (
    <AuthLayout
      robinMood={confirmError ? "sad" : mood}
      left={<AuthJournalStory />}
      right={right}
    />
  );
}

/** "Check your inbox" in the same book: the first stamp stays on the
    left page and gets the rust "Welcome" postmark pressed over its right
    edge (as on the Journal's empty page), just after Robin's happy hop.
    The text and the resend on the right. */
function SuccessLeft({ today }: { today: string }) {
  return (
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
}

type SuccessRightProps = {
  email: string;
  error: string | null;
  secondsLeft: number;
  sending: boolean;
  resent: boolean;
  onResend: () => void;
  onHideResent: () => void;
};

function SuccessRight({
  email,
  error,
  secondsLeft,
  sending,
  resent,
  onResend,
  onHideResent,
}: SuccessRightProps) {
  return (
    <div className={journal.formPage}>
      <div className={journal.intro}>
        <h1 className={journal.heading}>{copy.success.title}</h1>
        <p className={journal.body}>{copy.success.body(email)}</p>
        <p className={journal.hint}>{copy.success.hint}</p>
      </div>

      <div className={styles.resend}>
        <JournalButton
          variant="secondary"
          loading={sending}
          disabled={secondsLeft > 0}
          onClick={onResend}
        >
          {secondsLeft > 0 ? copy.success.resendCountdown(secondsLeft) : copy.success.resend}
        </JournalButton>
        {/* Stays mounted (empty) so screen readers pick up "Sent!" when it appears. */}
        <Alert
          variant="success"
          compact
          autoHideMs={RESENT_NOTICE_MS}
          onHide={onHideResent}
          className={styles.status}
        >
          {resent ? copy.success.resent : null}
        </Alert>
        <Alert variant="error" className={styles.resendError}>
          {error}
        </Alert>
      </div>

      <p className={styles.links}>
        <JournalButton variant="quiet" href="/signin" className={journal.footerLink}>
          {copy.success.link}
        </JournalButton>
      </p>
    </div>
  );
}
