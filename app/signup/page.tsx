"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { isAuthApiError, type AuthError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/button";
import styles from "./signup.module.css";


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
      setError(getSignUpErrorMessage(signUpError));
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
          <h1 className={styles.heading}>Account Created</h1>
          <p className={styles.body}>
            Please confirm your email address using the link we sent you.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className={`${styles.page}`}>
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.glowSecondary} aria-hidden="true" />

      <section className={styles.card}>
        <h1 className={styles.heading}>Sign Up</h1>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="displayName" className={styles.label}>
              Display Name
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
              Email
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
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className={styles.input}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}

          <Button type="submit" disabled={loading} className={styles.submitSpacing}>
            {loading ? "Creating account…" : "Create Account"}
          </Button>
        </form>

        <div className={styles.links}>
          <p>
            Already have an account? <Link href="/signin">Sign in</Link>
          </p>
        </div>
      </section>
    </div>
  );
}

/**
 * Maps a signUp() AuthError to a user-facing English message.
 * Prefers the structured `code` (GoTrue error codes); falls back to
 * matching the message text for older/self-hosted GoTrue instances
 * that don't send a code.
 */
function getSignUpErrorMessage(error: AuthError): string {
  if (isAuthApiError(error)) {
    switch (error.code) {
      case "user_already_exists":
      case "email_exists":
        return "An account with this email address already exists.";
      case "weak_password":
        return "This password is too weak. Please choose a stronger password.";
    }
  }

  const message = error.message.toLowerCase();
  if (message.includes("already registered") || message.includes("already exists")) {
    return "An account with this email address already exists.";
  }
  if (message.includes("password")) {
    return "This password is too weak. Please choose a stronger password.";
  }

  return "Sign up failed. Please try again.";
}
