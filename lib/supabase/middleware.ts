import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Routes reachable without an authenticated session. Prefix-matched, so
 * "/reset-password" also covers "/reset-password/confirm".
 */
const PUBLIC_ROUTES = ["/signin", "/signup", "/reset-password"];

/**
 * Routes an authenticated user should be redirected away from, toward
 * /studyroom, since they don't make sense once signed in.
 */
const AUTH_ROUTES = ["/signin", "/signup"];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

/**
 * Refreshes the Supabase session cookie and enforces route-level auth
 * gating. Call this from the root middleware.ts.
 *
 * Uses getUser() rather than getSession(): getUser() revalidates the token
 * against the Supabase Auth server on every call, while getSession() only
 * reads the (possibly stale or tampered) local cookie. This distinction
 * matters specifically here because it's the check guarding access.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not add logic between createServerClient() and getUser() — this
  // call refreshes the session token and must run on every request for
  // the refresh to actually take effect.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isPublicRoute(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/signin";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (user && AUTH_ROUTES.includes(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/studyroom";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  // IMPORTANT: return supabaseResponse as-is (not a new NextResponse) so
  // the refreshed cookies set above actually reach the browser.
  return supabaseResponse;
}
