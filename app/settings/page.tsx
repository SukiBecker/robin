"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSignOut } from "@/lib/supabase/use-sign-out";
import { Alert } from "@/components/alert";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { PageShell } from "@/components/page-shell";
import { TextField } from "@/components/text-field";
import styles from "./settings.module.css";


export default function SettingsPage() {
  const { signOut, loading: signOutLoading, error: signOutError } = useSignOut();

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
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
      setEmail(user.email ?? null);
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
    <PageShell title="Settings" width="narrow">
      {loading && <p className={styles.body}>Loading…</p>}
      <Alert variant="error">{error}</Alert>

      {!loading && userId !== null && (
        <Card>
          <Card.Section label="Profile">
            <form className={styles.form} onSubmit={handleSubmit}>
              <TextField
                id="displayName"
                label="Display name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                required
              />

              <div className={styles.saveRow}>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </Button>
                <Alert
                  variant="success"
                  compact
                  autoHideMs={2500}
                  onHide={() => setSaved(false)}
                >
                  {saved ? "Saved." : ""}
                </Alert>
              </div>
            </form>
          </Card.Section>

          <Card.Divider />

          <Card.Section label="Account" className={styles.accountSection}>
            {email && (
              <div className={styles.emailRow}>
                <span className={styles.emailLabel}>Email</span>
                <span className={styles.email}>{email}</span>
              </div>
            )}
            <Button variant="secondary" onClick={signOut} disabled={signOutLoading}>
              {signOutLoading ? "Logging out…" : "Log out"}
            </Button>
            <Alert variant="error" compact>
              {signOutError ? "Couldn't log you out. Please try again." : null}
            </Alert>
          </Card.Section>
        </Card>
      )}
    </PageShell>
  );
}
