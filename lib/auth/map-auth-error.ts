import { isAuthRetryableFetchError, type AuthError } from "@supabase/supabase-js";
import { authCopy } from "@/lib/copy/auth";

export type AuthErrorContext = "signIn" | "signUp" | "resetRequest" | "newPassword";

/** Robin's mood for an auth error — a subset of RobinMood. Only errors
    that are a real setback for the user make him sad; transient or
    "try again" errors (rate limit, network, unknown, weak password) and
    validation errors keep him neutral. */
export type AuthErrorMood = "neutral" | "sad";

export type MappedAuthError = {
  message: string;
  mood: AuthErrorMood;
};

const RATE_LIMIT_CODES = new Set([
  "over_request_rate_limit",
  "over_email_send_rate_limit",
  "over_sms_send_rate_limit",
]);

/**
 * Maps a Supabase AuthError to a user-facing message from lib/copy/auth.ts,
 * plus the mood Robin shows next to it.
 * Prefers the structured `code` (GoTrue error codes); for sign in / sign up
 * it falls back to matching the message text for older/self-hosted GoTrue
 * instances that don't send a code.
 */
export function mapAuthError(error: AuthError, context: AuthErrorContext): MappedAuthError {
  const { common, validation, signIn, signUp, newPassword } = authCopy;

  if (isAuthRetryableFetchError(error)) {
    return neutral(common.errors.network);
  }

  if ((error.code && RATE_LIMIT_CODES.has(error.code)) || error.status === 429) {
    return neutral(common.errors.rateLimit);
  }

  const message = error.message.toLowerCase();

  switch (context) {
    case "signIn":
      switch (error.code) {
        case "invalid_credentials":
          return sad(signIn.errors.invalidCredentials);
        case "email_not_confirmed":
          return neutral(signIn.errors.emailNotConfirmed);
      }
      if (message.includes("invalid login credentials") || message.includes("invalid credentials")) {
        return sad(signIn.errors.invalidCredentials);
      }
      if (message.includes("email not confirmed") || message.includes("confirm")) {
        return neutral(signIn.errors.emailNotConfirmed);
      }
      break;

    case "signUp":
      switch (error.code) {
        // With email confirmation on, Supabase doesn't report these; no
        // dedicated copy exists (see docs/auth-copy.md).
        case "user_already_exists":
        case "email_exists":
          return neutral(common.errors.unknown);
        case "weak_password":
          return neutral(signUp.errors.weakPassword);
      }
      if (message.includes("already registered") || message.includes("already exists")) {
        return neutral(common.errors.unknown);
      }
      if (message.includes("password")) {
        return neutral(signUp.errors.weakPassword);
      }
      break;

    case "resetRequest":
      // Supabase intentionally does not report whether the email exists, to
      // avoid leaking account existence.
      if (error.code === "email_address_invalid") {
        return neutral(validation.emailInvalid);
      }
      break;

    case "newPassword":
      switch (error.code) {
        case "weak_password":
          return neutral(newPassword.errors.weakPassword);
        case "same_password":
          return neutral(newPassword.errors.samePassword);
        case "session_not_found":
          return sad(newPassword.errors.sessionExpired);
      }
      break;
  }

  return neutral(common.errors.unknown);
}

function neutral(message: string): MappedAuthError {
  return { message, mood: "neutral" };
}

function sad(message: string): MappedAuthError {
  return { message, mood: "sad" };
}
