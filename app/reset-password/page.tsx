"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/button";
import { mapAuthError } from "@/lib/auth/map-auth-error";
import { authCopy } from "@/lib/copy/auth";
import { AuthLayout } from "@/components/auth-layout";
import styles from "./reset-password.module.css";

const copy = authCopy.resetRequest;

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password/confirm`,
    });

    setLoading(false);

    if (resetError) {
      setError(mapAuthError(resetError, "resetRequest"));
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <AuthLayout>
        <h1 className={styles.heading}>{copy.success.title}</h1>
        <p className={styles.body}>{copy.success.body(email)}</p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h1 className={styles.heading}>{copy.title}</h1>

      <form className={styles.form} onSubmit={handleSubmit}>
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

        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}

        <Button type="submit" disabled={loading} className={styles.submitSpacing}>
          {loading ? copy.submitting : copy.submit}
        </Button>
      </form>
    </AuthLayout>
  );
}

