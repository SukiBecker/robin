"use client";

import { useRef, useState, type CSSProperties, type FormEvent } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button as JournalButton } from "@/components/journal/button";
import { TextInput } from "@/components/journal/text-input";
import { PostageStamp } from "@/components/journal/postage-stamp";
import { Stamp } from "@/components/journal/stamp";
import { Label } from "@/components/journal/label";
import { RobinNote } from "@/components/journal/robin-note";
import { GameIcon } from "@/components/journal/game-icon";
import { InkArrow } from "@/components/journal/ink";
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
    level), the book on the desk: Robin's note, a small photo album of the
    places and the core loop (Study → Earn → Grow) on the left, the form on the right with
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

  const left = (
    <div className={styles.story}>
      <h1 className={styles.heading}>{copy.title}</h1>
      <RobinNote className={styles.note}>{copy.note}</RobinNote>
      <PlaceAlbum />
      <LoopRow />
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

/* The places of the journey as small photos stuck into the album
   (robin-design §4, album exception: small, alternating tilts up to ±2°,
   no controls). Level order from §9. Kept small on purpose — the worlds'
   painting styles differ a little; together they fill the page. The
   labels carry the meaning, the photos are alt="". Narrow: only
   garden-1, Beach and Mountains (data-narrow). */
type AlbumPhoto = { src: string; tilt: number; tape: string; narrow: boolean };

const TAPE = ["/ui/tape-long-1.webp", "/ui/tape-long-2.webp", "/ui/tape-long-3.webp"] as const;

const ALBUM: { label: string; level?: number; photos: AlbumPhoto[] }[] = [
  {
    label: copy.places.garden,
    photos: [
      { src: "/ui/auth/garden-1.webp", tilt: 1.5, tape: TAPE[0], narrow: true },
      { src: "/ui/auth/garden-2.webp", tilt: -1, tape: TAPE[1], narrow: false },
    ],
  },
  { label: copy.places.beach, level: 10, photos: [{ src: "/ui/auth/beach.webp", tilt: 2, tape: TAPE[2], narrow: true }] },
  { label: copy.places.mountains, level: 20, photos: [{ src: "/ui/auth/mountains.webp", tilt: -1.5, tape: TAPE[0], narrow: true }] },
  { label: copy.places.desert, level: 30, photos: [{ src: "/ui/auth/desert.webp", tilt: 1, tape: TAPE[1], narrow: false }] },
  {
    label: copy.places.japaneseGarden,
    level: 60,
    photos: [{ src: "/ui/auth/japanese-garden.webp", tilt: -2, tape: TAPE[2], narrow: false }],
  },
];

function PlaceAlbum() {
  return (
    <ul className={styles.album} aria-label={copy.places.label}>
      {ALBUM.map((place) => (
        <li
          key={place.label}
          className={styles.place}
          data-pair={place.photos.length > 1 || undefined}
          data-narrow={place.photos.some((photo) => photo.narrow) || undefined}
        >
          <span className={styles.photos}>
            {place.photos.map((photo) => (
              <span
                key={photo.src}
                className={styles.photo}
                data-narrow={photo.narrow || undefined}
                style={{ "--tilt": `${photo.tilt}deg` } as CSSProperties}
              >
                {/* The window is hatched pencil underneath: if a photo is
                    missing, alt="" shows nothing and the hatching stays. */}
                <span className={styles.window}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- small, pre-sized WebP */}
                  <img src={photo.src} alt="" width={256} height={192} draggable={false} />
                </span>
                <span className={styles.tape} style={{ backgroundImage: `url("${photo.tape}")` }} />
              </span>
            ))}
          </span>
          {/* Wide: a framed tag. Narrow: the same text without the frame
              (three framed tags don't fit side by side there). Only one
              is ever displayed, so screen readers hear it once. */}
          <Label className={`${styles.placeLabel} ${styles.labelWide}`}>
            <PlaceText label={place.label} level={place.level} />
          </Label>
          <Label variant="inline" className={`${styles.placeLabel} ${styles.labelNarrow}`}>
            <PlaceText label={place.label} level={place.level} />
          </Label>
        </li>
      ))}
    </ul>
  );
}

function PlaceText({ label, level }: { label: string; level?: number }) {
  return (
    <>
      <span className={styles.placeName}>{label}</span>
      {level !== undefined && (
        <span className={styles.placeLevel}>{copy.places.level(level)}</span>
      )}
    </>
  );
}

/** The core loop in three steps with drawn ink arrows between them:
    Study (the Studyroom's pocket watch) → Earn (XP seed and coin) → Grow
    (the rose in full bloom). The words carry it; icons and arrows are
    decorative. */
function LoopRow() {
  return (
    <ol className={styles.loop} aria-label={copy.loop.label}>
      <li className={styles.step}>
        <span className={styles.stepIcons}>
          <GameIcon name="studyroom" size={48} className={styles.iconLarge} />
        </span>
        <span className={styles.stepWord}>{copy.loop.study}</span>
      </li>
      <li className={styles.arrow} aria-hidden="true">
        <InkArrow className={styles.inkArrow} />
      </li>
      <li className={styles.step}>
        <span className={styles.stepIcons}>
          <GameIcon name="xp" size={24} className={styles.iconSmall} />
          <GameIcon name="coin" size={24} className={styles.iconSmall} />
        </span>
        <span className={styles.stepWord}>{copy.loop.earn}</span>
      </li>
      <li className={styles.arrow} aria-hidden="true">
        <InkArrow className={styles.inkArrow} />
      </li>
      <li className={styles.step}>
        <span className={styles.stepIcons}>
          <Image
            className={styles.rose}
            src="/garden/items/rose-3.png"
            width={398}
            height={400}
            alt=""
            sizes="48px"
            draggable={false}
          />
        </span>
        <span className={styles.stepWord}>{copy.loop.grow}</span>
      </li>
    </ol>
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
        <JournalButton variant="quiet" href="/signin" className={styles.footerLink}>
          {copy.success.link}
        </JournalButton>
      </p>
    </div>
  );
}
