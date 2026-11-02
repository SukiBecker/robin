/**
 * Which routes need a session — shared by the middleware (server-side
 * gate) and AuthWatcher (client-side reaction to a sign-out in another
 * tab), so both always agree.
 */

/**
 * Routes reachable without an authenticated session. Prefix-matched, so
 * "/reset-password" also covers "/reset-password/confirm".
 */
const PUBLIC_ROUTES = ["/signin", "/signup", "/reset-password"];

/** The landing page. Exact match only — as a prefix "/" would make every
    route public. Signed-in users skip it (see updateSession). */
export const LANDING_ROUTE = "/";

/**
 * Routes an authenticated user should be redirected away from, toward
 * /studyroom, since they don't make sense once signed in.
 */
export const AUTH_ROUTES = ["/signin", "/signup"];

export function isPublicRoute(pathname: string): boolean {
  if (pathname === LANDING_ROUTE) return true;
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}
