"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/button";
import { TextField } from "@/components/text-field";
import { Alert } from "@/components/alert";
import { useAuthError } from "@/lib/auth/use-auth-error";
import { authCopy } from "@/lib/copy/auth";
import { AuthLayout } from "@/components/auth-layout";
import styles from "./signin.module.css";

const copy = authCopy.signIn;

/** How long Robin gets to be happy before we leave the page: his double
    hop runs ~820ms. With reduced motion there's no hop, just the image
    crossfade, so a shorter beat is enough. */
const HAPPY_HOLD_MS = 900;
const HAPPY_HOLD_REDUCED_MS = 400;

export default function SigninPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const { error, mood, setFromSupabase, clear } = useAuthError("signIn");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clear();
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

  return (
    <AuthLayout robinMood={signedIn ? "happy" : mood}>
      <div className={styles.intro}>
        <h1 className={styles.heading}>{copy.title}</h1>
        <p className={styles.subtitle}>{copy.subtitle}</p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
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
          autoComplete="current-password"
        />

        <Alert variant="error">{error}</Alert>

        <Button type="submit" disabled={loading} className={styles.submitSpacing}>
          {loading ? copy.submitting : copy.submit}
        </Button>
      </form>

      <div className={styles.links}>
        <p>
          <Link href="/reset-password">{copy.forgotPassword}</Link>
        </p>
        <p>
          {copy.footerText} <Link href="/signup">{copy.footerLink}</Link>
        </p>
      </div>
    </AuthLayout>
  );
}

