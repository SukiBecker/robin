import { createClient } from "@supabase/supabase-js";
import { fileStorage } from "./.tmp-file-storage.mjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(url, anonKey, {
  auth: {
    storage: fileStorage,
    persistSession: true,
    detectSessionInUrl: false,
    // @supabase/ssr's createBrowserClient (used by the real app) defaults
    // to 'pkce', unlike plain createClient which defaults to 'implicit'.
    // Match it, or this script tests an entirely different auth flow.
    flowType: "pkce",
  },
});

const email = process.argv[2];
if (!email) {
  console.error("Usage: node .tmp-request-reset.mjs <email>");
  process.exit(1);
}

console.log("DEBUG flowType:", supabase.auth.flowType);

// Matches app/reset-password/page.tsx exactly: redirectTo -> /reset-password/confirm
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: "http://localhost:3000/reset-password/confirm",
});

console.log("resetPasswordForEmail error:", error ? { message: error.message, code: error.code, status: error.status } : null);
console.log(error ? "FAILED" : "Requested — check the inbox for the reset link.");
