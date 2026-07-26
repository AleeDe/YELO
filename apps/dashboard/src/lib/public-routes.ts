/**
 * Routes reachable without signing in.
 *
 * Both the auth provider (which redirects signed-out visitors) and the app
 * shell (which hides the dashboard chrome) need this list. They previously
 * kept separate copies, and they drifted: /legal was public to the shell but
 * not to the provider, so clicking "Privacy & Terms" from the sign-in page
 * bounced straight back to sign-in.
 */
export const PUBLIC_ROUTE_PREFIXES = [
  "/auth",
  "/capture",
  "/legal",
] as const;

export function isPublicRoute(pathname: string): boolean {
  // "/" is public: in production it is the plain-HTML landing page, and in
  // dev it is only a stub that forwards to /dashboard, where the auth guard
  // takes over. Without this, the guard races the stub and sends signed-out
  // visitors to /auth/sign-in?next=%2F instead of ?next=%2Fdashboard.
  if (pathname === "/") return true;
  return PUBLIC_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
