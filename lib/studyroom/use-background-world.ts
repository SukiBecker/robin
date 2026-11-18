"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** The place the player picked for the Studyroom, stored in
    study_room_settings.background_world_id (one row per profile, created
    with the profile; RLS allows select and update of the own row only).
    `worldId` is null until it is loaded, and also when nothing was ever
    picked. Locking by level is the caller's job (the worlds list knows
    each unlock_level). */
export function useBackgroundWorld() {
  const [worldId, setWorldId] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (cancelled) return;
      if (userError || !user) {
        setError("You must be signed in to pick a place.");
        return;
      }

      const { data, error: loadError } = await supabase
        .from("study_room_settings")
        .select("background_world_id")
        .eq("profile_id", user.id)
        .maybeSingle();

      if (cancelled) return;
      if (loadError) {
        setError(loadError.message);
        return;
      }
      setUserId(user.id);
      setWorldId(data?.background_world_id ?? null);
      setLoaded(true);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Shows the pick at once and saves it; puts the old one back if the
      save fails. */
  const select = useCallback(
    async (next: number) => {
      if (!userId) return;
      setError(null);
      const previous = worldId;
      setWorldId(next);

      const supabase = createClient();
      const { data, error: updateError } = await supabase
        .from("study_room_settings")
        .update({ background_world_id: next })
        .eq("profile_id", userId)
        .select("profile_id");

      if (updateError || !data || data.length === 0) {
        setWorldId(previous);
        setError(updateError?.message ?? "Couldn't save your place.");
      }
    },
    [userId, worldId]
  );

  return { worldId, loaded, error, select };
}
