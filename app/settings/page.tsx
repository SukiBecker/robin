"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSignOut } from "@/lib/supabase/use-sign-out";

export default function SettingsPage() {
  const { signOut, loading: signOutLoading } = useSignOut();

  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
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
          setError("You must be signed in to view settings.");
        }
        return;
      }

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();

      if (cancelled) return;

      setLoading(false);

      if (profileError) {
        setError(profileError.message);
        return;
      }

      setUserId(user.id);
      setDisplayName(data.display_name);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (userId === null) return;

    setError(null);
    setSaved(false);
    setSaving(true);

    const supabase = createClient();

    // display_name is the only editable profile field here — xp/coins/
    // streak are protected server-side by a trigger, never touched from
    // this form. Pomodoro mode (focus/break minutes) lives on the
    // Studyroom page now, not here.
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ display_name: displayName })
      .eq("id", userId);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSaved(true);
  }

  return (
    <section>
      <h1>Settings</h1>

      {loading && <p>Loading…</p>}
      {error && <p role="alert">{error}</p>}

      {!loading && userId !== null && (
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="displayName">Display name</label>
            <br />
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              required
            />
          </div>

          <button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
          {saved && <span> Saved.</span>}
        </form>
      )}

      <button type="button" onClick={signOut} disabled={signOutLoading}>
        {signOutLoading ? "Signing out…" : "Sign out"}
      </button>
    </section>
  );
}
