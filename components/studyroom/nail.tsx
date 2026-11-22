import styles from "./studyroom.module.css";

type NailProps = {
  className?: string;
};

/** A small forged nail head that fixes paper to the shed's wood
    (place level: paper is nailed here, not taped). Decorative. CSS
    placeholder until the painted nail exists; position it from outside. */
export function Nail({ className = "" }: NailProps) {
  return <span className={`${styles.nail} ${className}`} aria-hidden="true" />;
}
