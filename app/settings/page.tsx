"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSignOut } from "@/lib/supabase/use-sign-out";
import { Button } from "@/components/button";
import styles from "./settings.module.css";


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
    <div className={`${styles.page}`}>
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.glowSecondary} aria-hidden="true" />

      <div className={styles.shell}>
        <h1 className={styles.heading}>Settings</h1>

        {loading && <p className={styles.body}>Loading…</p>}
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}

        {!loading && userId !== null && (
          <div className={styles.card}>
            <div className={styles.profileGroup}>
              <span className={styles.sectionLabel}>Profile</span>

              <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.field}>
                  <label htmlFor="displayName" className={styles.label}>
                    Display name
                  </label>
                  <input
                    id="displayName"
                    type="text"
                    className={styles.input}
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    required
                  />
                </div>

                <div className={styles.saveRow}>
                  <Button type="submit" disabled={saving}>
                    {saving ? "Saving…" : "Save"}
                  </Button>
                  {saved && <span className={styles.saved}>Saved.</span>}
                </div>
              </form>
            </div>

            <hr className={styles.divider} />

            <div className={styles.accountSection}>
              <span className={styles.sectionLabel}>Account</span>
              <Button variant="secondary" onClick={signOut} disabled={signOutLoading}>
                {signOutLoading ? "Signing out…" : "Sign out"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
