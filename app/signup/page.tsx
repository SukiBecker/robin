"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/button";
import { mapAuthError } from "@/lib/auth/map-auth-error";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password";
import { authCopy } from "@/lib/copy/auth";
import styles from "./signup.module.css";

const copy = authCopy.signUp;

export default function SignupPage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/signup/confirm`,
        data: {
          display_name: displayName,
          timezone,
        },
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(mapAuthError(signUpError, "signUp"));
      return;
    }

    setSuccess(true);
  }

  if (success) {
    return (
      <div className={`${styles.page}`}>
        <div className={styles.glow} aria-hidden="true" />
        <div className={styles.glowSecondary} aria-hidden="true" />

        <section className={styles.card}>
          <h1 className={styles.heading}>{copy.success.title}</h1>
          <p className={styles.body}>{copy.success.body(email)}</p>
        </section>
      </div>
    );
  }

  return (
    <div className={`${styles.page}`}>
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.glowSecondary} aria-hidden="true" />

      <section className={styles.card}>
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
              onChange={(event) => setDisplayName(event.target.value)}
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
              onChange={(event) => setEmail(event.target.value)}
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
              onChange={(event) => setPassword(event.target.value)}
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
      </section>
    </div>
  );
}

