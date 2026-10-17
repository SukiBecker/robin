"use client";

import { useCallback, useState } from "react";
import type { AuthError } from "@supabase/supabase-js";
import { mapAuthError, type AuthErrorContext, type AuthErrorMood } from "./map-auth-error";

type AuthErrorState = {
  message: string | null;
  mood: AuthErrorMood;
};

const CLEARED: AuthErrorState = { message: null, mood: "neutral" };

/**
 * Error message + Robin's mood for an auth form, kept together so they
 * can't drift apart (a standing error next to a content Robin, or the
 * other way round).
 *
 * - setFromSupabase: a Supabase AuthError, via mapAuthError (may be sad)
 * - setValidation:   the form's own validation message (always neutral)
 * - clear:           call on submit and on every keystroke after an error
 */
export function useAuthError(context: AuthErrorContext) {
  const [state, setState] = useState<AuthErrorState>(CLEARED);

  const setFromSupabase = useCallback(
    (error: AuthError) => setState(mapAuthError(error, context)),
    [context]
  );
  const setValidation = useCallback(
    (message: string) => setState({ message, mood: "neutral" }),
    []
  );
  // Same object every time, so clearing an already-clear state (i.e. most
  // keystrokes) doesn't re-render.
  const clear = useCallback(() => setState(CLEARED), []);

  return {
    error: state.message,
    mood: state.mood,
    setFromSupabase,
    setValidation,
    clear,
  };
}
