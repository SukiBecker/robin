"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { isAuthApiError, type AuthError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type LinkStatus = "verifying" | "ready" | "invalid";

export default function ResetPasswordConfirmPage() {
  return (
    <Suspense fallback={<p>Verifying your reset link…</p>}>
      <ResetPasswordConfirmForm />
    </Suspense>
  );
}

function ResetPasswordConfirmForm() {
  const searchParams = useSearchParams();
  const [linkStatus, setLinkStatus] = useState<LinkStatus>("verifying");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const code = searchParams.get("code");

    if (!code) {
      setLinkStatus("invalid");
      return;
    }

    const supabase = createClient();
    supabase.auth.exchangeCodeForSession(code).then(({ error: exchangeError }) => {
      setLinkStatus(exchangeError ? "invalid" : "ready");
    });
  }, [searchParams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    setSubmitting(false);

    if (updateError) {
      setError(getUpdatePasswordErrorMessage(updateError));
      return;
    }

    setSuccess(true);
  }

  if (linkStatus === "verifying") {
    return <p>Verifying your reset link…</p>;
  }

  if (linkStatus === "invalid") {
    return (
      <section>
        <h1>Link Invalid</h1>
        <p>
          This password reset link is invalid or has expired.{" "}
          <Link href="/reset-password">Request a new one</Link>.
        </p>
      </section>
    );
  }

  if (success) {
    return (
      <section>
        <h1>Password Updated</h1>
        <p>
          Your password has been updated. You can now{" "}
          <Link href="/signin">sign in</Link> with your new password.
        </p>
      </section>
    );
  }

  return (
    <section>
      <h1>Set New Password</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="password">New Password</label>
          <br />
          <input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword">Confirm Password</label>
          <br />
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>

        {error && <p role="alert">{error}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? "Updating…" : "Update Password"}
        </button>
      </form>
    </section>
  );
}

/**
 * Maps an updateUser() AuthError to a user-facing English message.
 * Prefers the structured `code` (GoTrue error codes); falls back to a
 * generic message for older/self-hosted GoTrue instances without one.
 */
function getUpdatePasswordErrorMessage(error: AuthError): string {
  if (isAuthApiError(error)) {
    switch (error.code) {
      case "weak_password":
        return "This password is too weak. Please choose a stronger password.";
      case "same_password":
        return "New password must be different from your current password.";
      case "session_not_found":
        return "Your session has expired. Please request a new reset link.";
    }
  }

  return "Could not update your password. Please try again.";
}
