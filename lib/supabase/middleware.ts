import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_ROUTES, LANDING_ROUTE, isPublicRoute } from "@/lib/auth/routes";

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
    return redirectPreservingSession(redirectUrl, supabaseResponse);
  }

  if (user && (AUTH_ROUTES.includes(pathname) || pathname === LANDING_ROUTE)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/studyroom";
    redirectUrl.search = "";
    return redirectPreservingSession(redirectUrl, supabaseResponse);
  }

  // Signed-in pages must never come back from the browser's back/forward
  // cache after a logout: no-store forces a fresh request on Back, which
  // this middleware then redirects to /signin.
  if (!isPublicRoute(pathname)) {
    supabaseResponse.headers.set("Cache-Control", "private, no-store");
  }

  // IMPORTANT: return supabaseResponse as-is (not a new NextResponse) so
  // the refreshed cookies set above actually reach the browser.
  return supabaseResponse;
}

/**
 * Builds a redirect response that still carries the (possibly just
 * rotated) session cookies from `supabaseResponse`.
 *
 * NextResponse.redirect() creates a brand-new response with none of
 * supabaseResponse's Set-Cookie headers. If getUser() had refreshed an
 * expired access token — rotating the refresh token in the process — and
 * we returned that bare redirect, the rotated cookies would be silently
 * dropped: the browser would keep the now-invalidated refresh token, and
 * the very next request would fail to refresh, signing the user out.
 * This is what caused "logged out after a browser restart" even with a
 * previously valid session.
 */
function redirectPreservingSession(url: URL, supabaseResponse: NextResponse): NextResponse {
  const redirectResponse = NextResponse.redirect(url);
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });
  return redirectResponse;
}
