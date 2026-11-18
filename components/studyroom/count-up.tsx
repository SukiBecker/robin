"use client";

import { useEffect, useState } from "react";
import { AnimatedCounter } from "@/components/animated-counter";

/** A number that counts up from 0 when it appears (the reward moment).
    AnimatedCounter starts at its value on purpose; this one starts at 0
    and then moves to it. With reduced motion it simply shows the number. */
export function CountUp({ value, duration = 900 }: { value: number; duration?: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    setShown(value);
  }, [value]);
  return <AnimatedCounter value={shown} duration={duration} />;
}
