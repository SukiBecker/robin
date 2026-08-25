"use client";

import { useState, type FormEvent } from "react";
import { isAuthApiError, type AuthError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

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
      setError(getResetRequestErrorMessage(resetError));
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <section>
        <h1>Check Your Email</h1>
        <p>
          If an account exists for that email address, we&apos;ve sent a link
          to reset your password.
        </p>
      </section>
    );
  }

  return (
    <section>
      <h1>Reset Password</h1>
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

        {error && <p role="alert">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Sending…" : "Send Reset Link"}
        </button>
      </form>
    </section>
  );
}

/**
 * Maps a resetPasswordForEmail() AuthError to a user-facing English message.
 * Note: Supabase intentionally does not report whether the email exists, to
 * avoid leaking account existence, so this only ever surfaces things like
 * rate limiting or a malformed request.
 */
function getResetRequestErrorMessage(error: AuthError): string {
  if (isAuthApiError(error)) {
    switch (error.code) {
      case "over_email_send_rate_limit":
        return "Too many requests. Please wait a bit before trying again.";
      case "email_address_invalid":
        return "Please enter a valid email address.";
    }
  }

  return "Something went wrong. Please try again.";
}
