"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type ConfirmStatus = "confirming" | "invalid";

export default function SignupConfirmPage() {
  return (
    <Suspense fallback={<p>Confirming your email…</p>}>
      <SignupConfirmHandler />
    </Suspense>
  );
}

function SignupConfirmHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<ConfirmStatus>("confirming");

  useEffect(() => {
    const code = searchParams.get("code");

    if (!code) {
      setStatus("invalid");
      return;
    }

    const supabase = createClient();
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        setStatus("invalid");
        return;
      }

      router.push("/");
    });
  }, [searchParams, router]);

  if (status === "invalid") {
    return (
      <section>
        <h1>Link Invalid</h1>
        <p>
          This confirmation link is invalid or has expired. If you still need
          to confirm your account, try{" "}
          <Link href="/signup">signing up again</Link> to get a new link, or{" "}
          <Link href="/signin">sign in</Link> if you&apos;ve already
          confirmed.
        </p>
      </section>
    );
  }

  return <p>Confirming your email…</p>;
}
