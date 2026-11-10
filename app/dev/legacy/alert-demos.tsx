"use client";

import { useState } from "react";
import { Alert } from "@/components/alert";
import { Button } from "@/components/button";
import styles from "./components.module.css";

/** Interactive Alert demos for the catalog (the page itself is a server
    component). */
export function SavedDemo() {
  const [saved, setSaved] = useState(false);
  return (
    <div className={styles.inlineRow}>
      <Button size="sm" onClick={() => setSaved(true)}>
        Save
      </Button>
      <Alert variant="success" compact autoHideMs={3000} onHide={() => setSaved(false)}>
        {saved ? "Saved." : null}
      </Alert>
    </div>
  );
}

export function AutoHideDemo() {
  const [shown, setShown] = useState(true);
  return (
    <div className={styles.stack}>
      <Alert variant="success" autoHideMs={3000} onHide={() => setShown(false)}>
        {shown ? "Sent! Check your inbox again." : null}
      </Alert>
      <div>
        <Button
          size="sm"
          variant="secondary"
          disabled={shown}
          onClick={() => setShown(true)}
        >
          Show again
        </Button>
      </div>
    </div>
  );
}
