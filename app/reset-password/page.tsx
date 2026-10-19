"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Button } from "@/components/button";
import { TextField } from "@/components/text-field";
import { Alert } from "@/components/alert";
import { useAuthError } from "@/lib/auth/use-auth-error";
import { authCopy } from "@/lib/copy/auth";
import { AuthLayout } from "@/components/auth-layout";
import styles from "./reset-password.module.css";

const copy = authCopy.resetRequest;

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { error, mood, setFromSupabase, clear } = useAuthError("resetRequest");
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clear();
    setLoading(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password/confirm`,
    });

    setLoading(false);

    if (resetError) {
      setFromSupabase(resetError);
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <AuthLayout robinMood="happy">
        <h1 className={styles.heading}>{copy.success.title}</h1>

        <div className={styles.successText}>
          <p className={styles.body}>{copy.success.body(email)}</p>
          <p className={styles.hint}>{copy.success.hint}</p>
        </div>

        <div className={styles.links}>
          <p>
            <Link href="/signin">{copy.success.link}</Link>
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout robinMood={mood}>
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

        <Alert variant="error">{error}</Alert>

        <Button type="submit" disabled={loading} className={styles.submitSpacing}>
          {loading ? copy.submitting : copy.submit}
        </Button>
      </form>

      <div className={styles.links}>
        <p>
          <Link href="/signin">{copy.footerLink}</Link>
        </p>
      </div>
    </AuthLayout>
  );
}

