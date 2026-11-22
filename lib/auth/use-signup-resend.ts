"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AuthError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

/** Supabase allows one signup email per address per minute, so resend
    stays locked for that long after each email. */
const RESEND_COOLDOWN_MS = 60_000;

export function confirmRedirectUrl() {
  return `${window.location.origin}/signup/confirm`;
}

type UseSignupResendOptions = {
  /** Start with the cooldown running — on /signup the first email has
      only just gone out. */
  lockedAtStart?: boolean;
  /** Called with the Supabase error when a resend fails. */
  onError: (error: AuthError) => void;
};

/**
 * Re-sends the signup confirmation email, with the 60 s cooldown between
 * sends. Used by the /signup success screen and the "email not confirmed"
 * error on /signin.
 *
 * - secondsLeft: > 0 while locked; show copy.resendCountdown(secondsLeft)
 * - sending:     true during the request (Button loading)
 * - resent:      true after a successful send until hideResent() — pair
 *                with an auto-hiding compact success Alert
 */
export function useSignupResend({ lockedAtStart = false, onError }: UseSignupResendOptions) {
  const [cooldownEnd, setCooldownEnd] = useState(() =>
    lockedAtStart ? Date.now() + RESEND_COOLDOWN_MS : 0
  );
  const [secondsLeft, setSecondsLeft] = useState(
    lockedAtStart ? RESEND_COOLDOWN_MS / 1000 : 0
  );
  const [sending, setSending] = useState(false);
  const [resent, setResent] = useState(false);

  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  });

  useEffect(() => {
    const tick = () => {
      const left = Math.max(0, Math.ceil((cooldownEnd - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) clearInterval(id);
    };
    const id = setInterval(tick, 1000);
    tick();
    return () => clearInterval(id);
  }, [cooldownEnd]);

  const resend = useCallback(async (email: string) => {
    setResent(false);
    setSending(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: confirmRedirectUrl() },
    });

    setSending(false);

    if (error) {
      onErrorRef.current(error);
      return;
    }

    setResent(true);
    setCooldownEnd(Date.now() + RESEND_COOLDOWN_MS);
  }, []);

  const hideResent = useCallback(() => setResent(false), []);

  /** Starts the cooldown now (the first email has just gone out). */
  const lock = useCallback(() => setCooldownEnd(Date.now() + RESEND_COOLDOWN_MS), []);

  return { secondsLeft, sending, resent, resend, hideResent, lock };
}
