import { Button } from "@/components/button";
import styles from "./landing-ctas.module.css";

/**
 * The landing page's two ways in. Kept in one place on purpose: the
 * planned cloud-wipe transition will swap these plain links for a call
 * into the root layout's transition provider — only this file changes.
 */
export function LandingCtas() {
  return (
    <div className={styles.ctas}>
      <Button href="/signup" variant="primary" className={styles.cta}>
        Get started
      </Button>
      <Button href="/signin" variant="secondary" className={styles.cta}>
        Sign in
      </Button>
    </div>
  );
}
