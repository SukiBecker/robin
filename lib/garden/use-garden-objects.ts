"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type GardenObject = {
  id: string;
  pos_x: number;
  pos_y: number;
  /** Logical grid cell (top-left corner of the item's footprint) — the
      collision-authoritative position enforced server-side by
      place_garden_object(). pos_x/pos_y stay the purely visual offset
      inside that cell; see robin_garden_grid_migration.sql. */
  grid_x: number;
  grid_y: number;
  /** How many grid cells this placed object occupies (item_catalog's
      footprint, resolved client-side alongside category/name below) —
      needed to test a hover-preview footprint for overlap against this
      object without a server round-trip. */
  footprint_width: number;
  footprint_height: number;
  growth_percent: number | null;
  /** Manual per-object resize multiplier — layers on top of the
      category+growth size, see lib/garden/item-visuals.ts. */
  scale: number;
  /** Degrees, 0-360 (garden_objects.rotation) — set by the player at
      placement time (see app/garden/page.tsx's rotate control) and
      applied as a CSS transform in GardenView. Mainly meaningful for
      path tiles (a Kurve/Ende piece only has art for one orientation,
      the other 3 come from rotating this value), but not restricted to
      them — place_garden_object() accepts it for any item. */
  rotation: number;
  /** Resolved client-side from item_catalog (see loadObjects below) —
      v_garden_objects_with_progress itself doesn't expose these. Null
      only if that lookup somehow fails; GardenView falls back to a
      sane default size/shape rather than breaking. */
  category: string | null;
  item_name: string | null;
  /** True for path-shape items (item_catalog.attributes.path_shape set —
      see bloomly_path_items_migration.sql). GardenView must never apply
      its depth-based size scaling to these: two path tiles at different
      pos_y need to render at the exact same size, or their edges never
      line up regardless of how good the art is. */
  isPathTile: boolean;
};

type UseGardenObjectsResult = {
  userId: string | null;
  worldId: number | null;
  /** Grid dimensions of this world (public.worlds.grid_width/height) —
      needed to translate a click position into a grid_x/grid_y cell for
      place_garden_object(). Null until the world lookup resolves. */
  gridWidth: number | null;
  gridHeight: number | null;
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
  const [gridWidth, setGridWidth] = useState<number | null>(null);
  const [gridHeight, setGridHeight] = useState<number | null>(null);
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
        .select(
          "id, pos_x, pos_y, grid_x, grid_y, growth_percent, scale, rotation, item_id"
        )
        .eq("profile_id", profileId)
        .eq("world_id", world);

      if (objectsError) {
        setError(objectsError.message);
        return;
      }

      // v_garden_objects_with_progress doesn't expose item_catalog's
      // category/name, so those are resolved with a second, separate
      // query rather than a schema change — item_catalog is small and
      // publicly readable, so fetching it whole and joining client-side
      // is simpler than embedding through a view. See
      // lib/garden/item-visuals.ts for how category/name feed sizing.
      const itemIds = [...new Set(data.map((row) => row.item_id))];
      const catalogById = new Map<
        string,
        {
          category: string;
          name: string;
          footprint_width: number;
          footprint_height: number;
          isPathTile: boolean;
        }
      >();

      if (itemIds.length > 0) {
        const { data: catalogRows, error: catalogError } = await supabase
          .from("item_catalog")
          .select(
            "id, category, name, footprint_width, footprint_height, attributes"
          )
          .in("id", itemIds);

        if (catalogError) {
          setError(catalogError.message);
          return;
        }

        for (const row of catalogRows) {
          catalogById.set(row.id, {
            category: row.category,
            name: row.name,
            footprint_width: row.footprint_width,
            footprint_height: row.footprint_height,
            // See bloomly_path_items_migration.sql — path-shape items carry
            // attributes.path_shape ('straight'/'corner'/'end'). Nothing
            // else in the catalog sets this key, so presence alone is a
            // reliable "is this a path tile" check.
            isPathTile: Boolean(
              (row.attributes as { path_shape?: string } | null)?.path_shape
            ),
          });
        }
      }

      setObjects(
        data.map((row) => ({
          id: row.id,
          pos_x: row.pos_x,
          pos_y: row.pos_y,
          grid_x: row.grid_x,
          grid_y: row.grid_y,
          // Falls back to 1x1 (the column default) in the unexpected case
          // the catalog lookup above didn't cover this item_id, rather
          // than propagating undefined into the overlap-check math.
          footprint_width: catalogById.get(row.item_id)?.footprint_width ?? 1,
          footprint_height: catalogById.get(row.item_id)?.footprint_height ?? 1,
          growth_percent: row.growth_percent,
          scale: row.scale,
          rotation: row.rotation,
          category: catalogById.get(row.item_id)?.category ?? null,
          item_name: catalogById.get(row.item_id)?.name ?? null,
          isPathTile: catalogById.get(row.item_id)?.isPathTile ?? false,
        }))
      );
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
        .select("id, grid_width, grid_height")
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
      setGridWidth(world.grid_width);
      setGridHeight(world.grid_height);

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

  return {
    userId,
    worldId,
    gridWidth,
    gridHeight,
    objects,
    loading,
    error,
    reload,
  };
}
