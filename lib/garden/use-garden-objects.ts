"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type GardenObject = {
  id: string;
  pos_x: number;
  pos_y: number;
  growth_percent: number | null;
};

type UseGardenObjectsResult = {
  userId: string | null;
  worldId: number | null;
  objects: GardenObject[] | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

/**
 * Loads the current user's placed garden objects (with growth progress)
 * for a world, looked up by slug. Shared by the Garden page (which also
 * layers placement/removal on top) and the Studyroom page's background
 * view, so both render from the exact same query.
 */
export function useGardenObjects(worldSlug = "garden"): UseGardenObjectsResult {
  const [userId, setUserId] = useState<string | null>(null);
  const [worldId, setWorldId] = useState<number | null>(null);
  const [objects, setObjects] = useState<GardenObject[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadObjects = useCallback(
    async (
      supabase: ReturnType<typeof createClient>,
      profileId: string,
      world: number
    ) => {
      const { data, error: objectsError } = await supabase
        .from("v_garden_objects_with_progress")
        .select("id, pos_x, pos_y, growth_percent")
        .eq("profile_id", profileId)
        .eq("world_id", world);

      if (objectsError) {
        setError(objectsError.message);
        return;
      }

      setObjects(data);
    },
    []
  );

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setError(null);
      setLoading(true);

      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        if (!cancelled) {
          setLoading(false);
          setError("You must be signed in to view your garden.");
        }
        return;
      }

      // V1 ships exactly one world (Garden). Looked up by slug rather than
      // assumed to be id 1, since worlds.id is a plain serial.
      const { data: world, error: worldError } = await supabase
        .from("worlds")
        .select("id")
        .eq("slug", worldSlug)
        .single();

      if (worldError || !world) {
        if (!cancelled) {
          setLoading(false);
          setError(worldError?.message ?? "Garden world not found.");
        }
        return;
      }

      if (cancelled) return;

      setUserId(user.id);
      setWorldId(world.id);

      await loadObjects(supabase, user.id, world.id);

      if (!cancelled) setLoading(false);
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [worldSlug, loadObjects]);

  const reload = useCallback(async () => {
    if (userId === null || worldId === null) return;
    await loadObjects(createClient(), userId, worldId);
  }, [userId, worldId, loadObjects]);

  return { userId, worldId, objects, loading, error, reload };
}
