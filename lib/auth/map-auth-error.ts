import { isAuthRetryableFetchError, type AuthError } from "@supabase/supabase-js";
import { authCopy } from "@/lib/copy/auth";

export type AuthErrorContext = "signIn" | "signUp" | "resetRequest" | "newPassword";

const RATE_LIMIT_CODES = new Set([
  "over_request_rate_limit",
  "over_email_send_rate_limit",
  "over_sms_send_rate_limit",
]);

/**
 * Maps a Supabase AuthError to a user-facing message from lib/copy/auth.ts.
 * Prefers the structured `code` (GoTrue error codes); for sign in / sign up
 * it falls back to matching the message text for older/self-hosted GoTrue
 * instances that don't send a code.
 */
export function mapAuthError(error: AuthError, context: AuthErrorContext): string {
  const { common, validation, signIn, signUp, newPassword } = authCopy;

  if (isAuthRetryableFetchError(error)) {
    return common.errors.network;
  }

  if ((error.code && RATE_LIMIT_CODES.has(error.code)) || error.status === 429) {
    return common.errors.rateLimit;
  }

  const message = error.message.toLowerCase();

  switch (context) {
    case "signIn":
      switch (error.code) {
        case "invalid_credentials":
          return signIn.errors.invalidCredentials;
        case "email_not_confirmed":
          return signIn.errors.emailNotConfirmed;
      }
      if (message.includes("invalid login credentials") || message.includes("invalid credentials")) {
        return signIn.errors.invalidCredentials;
      }
      if (message.includes("email not confirmed") || message.includes("confirm")) {
        return signIn.errors.emailNotConfirmed;
      }
      break;

    case "signUp":
      switch (error.code) {
        // With email confirmation on, Supabase doesn't report these; no
        // dedicated copy exists (see docs/auth-copy.md).
        case "user_already_exists":
        case "email_exists":
          return common.errors.unknown;
        case "weak_password":
          return signUp.errors.weakPassword;
      }
      if (message.includes("already registered") || message.includes("already exists")) {
        return common.errors.unknown;
      }
      if (message.includes("password")) {
        return signUp.errors.weakPassword;
      }
      break;

    case "resetRequest":
      // Supabase intentionally does not report whether the email exists, to
      // avoid leaking account existence.
      if (error.code === "email_address_invalid") {
        return validation.emailInvalid;
      }
      break;

    case "newPassword":
      switch (error.code) {
        case "weak_password":
          return newPassword.errors.weakPassword;
        case "same_password":
          return newPassword.errors.samePassword;
        case "session_not_found":
          return newPassword.errors.sessionExpired;
      }
      break;
  }

  return common.errors.unknown;
}
