"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAuthApiError, type AuthError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

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
      setError(getSignInErrorMessage(signInError));
      return;
    }

    router.push("/");
  }

  return (
    <section>
      <h1>Sign In</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Email</label>
          <br />
          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div>
          <label htmlFor="password">Password</label>
          <br />
          <input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        {error && <p role="alert">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>

      <p>
        <Link href="/reset-password">Forgot password?</Link>
      </p>
      <p>
        Don&apos;t have an account? <Link href="/signup">Sign up</Link>
      </p>
    </section>
  );
}

/**
 * Maps a signInWithPassword() AuthError to a user-facing English message.
 * Prefers the structured `code` (GoTrue error codes); falls back to
 * matching the message text for older/self-hosted GoTrue instances
 * that don't send a code.
 */
function getSignInErrorMessage(error: AuthError): string {
  if (isAuthApiError(error)) {
    switch (error.code) {
      case "invalid_credentials":
        return "Incorrect email or password.";
      case "email_not_confirmed":
        return "Please confirm your email address before signing in.";
    }
  }

  const message = error.message.toLowerCase();
  if (message.includes("invalid login credentials") || message.includes("invalid credentials")) {
    return "Incorrect email or password.";
  }
  if (message.includes("email not confirmed") || message.includes("confirm")) {
    return "Please confirm your email address before signing in.";
  }

  return "Sign in failed. Please try again.";
}
