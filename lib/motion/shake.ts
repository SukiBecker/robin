/**
 * Short horizontal "nope" shake (~300 ms). Animates the standalone
 * `translate` property, so it composes with any `transform` the element
 * already uses (press, hover lift) instead of overriding it. Callers skip
 * it under prefers-reduced-motion.
 */
export function shake(element: Element | null) {
  element?.animate(
    { translate: ["0", "-6px", "6px", "-4px", "4px", "0"] },
    { duration: 300, easing: "ease-out" }
  );
}
