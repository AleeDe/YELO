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
  return PUBLIC_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
