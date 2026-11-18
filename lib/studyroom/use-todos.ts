"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type Todo = {
  id: string;
  title: string;
  done: boolean;
  completed_at: string | null;
  created_at: string;
};

const COLUMNS = "id, title, done, completed_at, created_at";

function startOfToday(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** The Studyroom's to-do list (table `todos`, RLS: own rows only).
    Loads every open to-do plus the ones ticked off today — older done
    ones stay in the database (the Journal calendar counts them) but
    leave the list. `done` and `completed_at` are kept in step by the
    handle_todo_completion trigger; ticking one can also advance quests
    server-side (evaluate_quests). Changes show at once and are put back
    if the server says no. */
export function useTodos() {
  const [todos, setTodos] = useState<Todo[] | null>(null);
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
        setError("You must be signed in to see your to-dos.");
        return;
      }

      const { data, error: loadError } = await supabase
        .from("todos")
        .select(COLUMNS)
        .eq("profile_id", user.id)
        .or(`done.eq.false,completed_at.gte.${startOfToday()}`)
        .order("created_at", { ascending: true });

      if (cancelled) return;
      if (loadError) {
        setError(loadError.message);
        return;
      }
      setUserId(user.id);
      setTodos(data);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const add = useCallback(
    async (title: string): Promise<boolean> => {
      const clean = title.trim();
      if (!clean || !userId) return false;

      setError(null);
      const supabase = createClient();
      const { data, error: insertError } = await supabase
        .from("todos")
        .insert({ profile_id: userId, title: clean })
        .select(COLUMNS)
        .single();

      if (insertError) {
        setError(insertError.message);
        return false;
      }
      setTodos((prev) => [...(prev ?? []), data]);
      return true;
    },
    [userId]
  );

  const setDone = useCallback(async (id: string, done: boolean) => {
    setError(null);
    const now = new Date().toISOString();
    const patch = (value: boolean) =>
      setTodos((prev) =>
        prev?.map((t) =>
          t.id === id ? { ...t, done: value, completed_at: value ? now : null } : t
        ) ?? prev
      );

    patch(done);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("todos")
      .update({ done })
      .eq("id", id);

    if (updateError) {
      patch(!done);
      setError(updateError.message);
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    setError(null);
    let removed: Todo | undefined;
    setTodos((prev) => {
      removed = prev?.find((t) => t.id === id);
      return prev?.filter((t) => t.id !== id) ?? prev;
    });

    const supabase = createClient();
    const { error: deleteError } = await supabase.from("todos").delete().eq("id", id);

    if (deleteError) {
      const back = removed;
      if (back) {
        setTodos((prev) =>
          prev
            ? [...prev, back].sort((a, b) => a.created_at.localeCompare(b.created_at))
            : prev
        );
      }
      setError(deleteError.message);
    }
  }, []);

  return { todos, error, add, setDone, remove };
}
