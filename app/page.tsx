import { GardenHero } from "@/components/landing/garden-hero";
import { LandingCtas } from "@/components/landing/landing-ctas";
import styles from "./landing.module.css";

/**
 * Landing page for signed-out visitors. Signed-in users never see it: the
 * middleware (lib/supabase/middleware.ts) redirects "/" to /studyroom
 * server-side before this renders.
 */
export default function LandingPage() {
  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <div className={styles.copy}>
          <p className={styles.brand}>Robin</p>
          <h1 className={styles.headline}>Study. Earn. Watch your garden grow.</h1>
          <p className={styles.subtitle}>
            Every focused minute earns XP and coins — spend them on flowers that bloom while you
            learn.
          </p>
          <LandingCtas />
        </div>

        <GardenHero className={styles.garden} />
      </div>
    </div>
  );
}
