"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/button";
import { mapAuthError } from "@/lib/auth/map-auth-error";
import { authCopy } from "@/lib/copy/auth";
import { AuthLayout } from "@/components/auth-layout";
import styles from "./signin.module.css";

const copy = authCopy.signIn;

export default function SigninPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(mapAuthError(signInError, "signIn"));
      return;
    }

    router.push("/");
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
            autoComplete="current-password"
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
          <Link href="/reset-password">{copy.forgotPassword}</Link>
        </p>
        <p>
          {copy.footerText} <Link href="/signup">{copy.footerLink}</Link>
        </p>
      </div>
    </AuthLayout>
  );
}

