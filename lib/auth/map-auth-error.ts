import {
  isAuthRetryableFetchError,
  isAuthSessionMissingError,
  type AuthError,
} from "@supabase/supabase-js";
import { authCopy } from "@/lib/copy/auth";

export type AuthErrorContext = "signIn" | "signUp" | "resetRequest" | "newPassword";

/** Robin's mood for an auth error — a subset of RobinMood. Only errors
    that are a real setback for the user make him sad; transient or
    "try again" errors (rate limit, network, unknown, weak password) and
    validation errors keep him neutral. */
export type AuthErrorMood = "neutral" | "sad";

/** Which error this is, so a page can react to a specific one (e.g. offer
    "Request a new link" for sessionExpired) without matching message text. */
export type AuthErrorKey =
  | "network"
  | "rateLimit"
  | "unknown"
  | "invalidCredentials"
  | "emailNotConfirmed"
  | "weakPassword"
  | "emailInvalid"
  | "samePassword"
  | "sessionExpired";

export type MappedAuthError = {
  message: string;
  mood: AuthErrorMood;
  key: AuthErrorKey;
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
    return neutral(common.errors.network, "network");
  }

  if ((error.code && RATE_LIMIT_CODES.has(error.code)) || error.status === 429) {
    return neutral(common.errors.rateLimit, "rateLimit");
  }

  const message = error.message.toLowerCase();

  switch (context) {
    case "signIn":
      switch (error.code) {
        case "invalid_credentials":
          return sad(signIn.errors.invalidCredentials, "invalidCredentials");
        case "email_not_confirmed":
          return neutral(signIn.errors.emailNotConfirmed, "emailNotConfirmed");
      }
      if (message.includes("invalid login credentials") || message.includes("invalid credentials")) {
        return sad(signIn.errors.invalidCredentials, "invalidCredentials");
      }
      if (message.includes("email not confirmed") || message.includes("confirm")) {
        return neutral(signIn.errors.emailNotConfirmed, "emailNotConfirmed");
      }
      break;

    case "signUp":
      switch (error.code) {
        // With email confirmation on, Supabase doesn't report these; no
        // dedicated copy exists (see docs/auth-copy.md).
        case "user_already_exists":
        case "email_exists":
          return neutral(common.errors.unknown, "unknown");
        case "weak_password":
          return neutral(signUp.errors.weakPassword, "weakPassword");
      }
      if (message.includes("already registered") || message.includes("already exists")) {
        return neutral(common.errors.unknown, "unknown");
      }
      if (message.includes("password")) {
        return neutral(signUp.errors.weakPassword, "weakPassword");
      }
      break;

    case "resetRequest":
      // Supabase intentionally does not report whether the email exists, to
      // avoid leaking account existence.
      if (error.code === "email_address_invalid") {
        return neutral(validation.emailInvalid, "emailInvalid");
      }
      break;

    case "newPassword":
      // supabase-js turns a session_not_found response into an
      // AuthSessionMissingError without a code, so the case below alone
      // never matches for updateUser().
      if (isAuthSessionMissingError(error)) {
        return sad(newPassword.errors.sessionExpired, "sessionExpired");
      }
      switch (error.code) {
        case "weak_password":
          return neutral(newPassword.errors.weakPassword, "weakPassword");
        case "same_password":
          return neutral(newPassword.errors.samePassword, "samePassword");
        case "session_not_found":
          return sad(newPassword.errors.sessionExpired, "sessionExpired");
      }
      break;
  }

  return neutral(common.errors.unknown, "unknown");
}

function neutral(message: string, key: AuthErrorKey): MappedAuthError {
  return { message, mood: "neutral", key };
}

function sad(message: string, key: AuthErrorKey): MappedAuthError {
  return { message, mood: "sad", key };
}
