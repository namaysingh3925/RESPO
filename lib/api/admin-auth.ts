/**
 * HTTP Basic auth for the staff area (/admin and /api/admin/*), checked against ADMIN_USER / ADMIN_PASSWORD.
 *
 * Used by proxy.ts (which runs on the Node.js runtime in Next.js 16, so node:crypto is available) and again
 * inside every /api/admin handler as defence in depth, in case a matcher change ever stops the proxy running.
 * Access is denied outright when either environment variable is missing or empty.
 */
import { createHash, timingSafeEqual } from "node:crypto";
import type { ApiErrorBody } from "@/lib/types";

export const ADMIN_REALM = "Ember House Staff";

/** WWW-Authenticate value that makes browsers show their sign-in prompt. */
export const WWW_AUTHENTICATE = `Basic realm="${ADMIN_REALM}", charset="UTF-8"`;

let warnedMissingConfig = false;

/**
 * Constant-time string comparison. Both sides are hashed first so the comparison always runs over
 * equal-length buffers and never leaks the expected length.
 */
function safeEqual(actual: string, expected: string): boolean {
  const a = createHash("sha256").update(actual, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

/** Parses `Authorization: Basic base64(user:password)`; null when absent or malformed. */
function parseBasicAuth(header: string | null): { user: string; password: string } | null {
  if (!header) return null;
  const match = /^Basic\s+([A-Za-z0-9+/]+={0,2})\s*$/i.exec(header);
  if (!match) return null;

  const decoded = Buffer.from(match[1], "base64").toString("utf8");
  const separator = decoded.indexOf(":");
  if (separator < 0) return null;
  return { user: decoded.slice(0, separator), password: decoded.slice(separator + 1) };
}

/** True only when staff credentials are configured and the request carries matching Basic credentials. */
export function isAuthorizedAdmin(request: Request): boolean {
  const expectedUser = process.env.ADMIN_USER;
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedUser || !expectedPassword) {
    if (!warnedMissingConfig) {
      warnedMissingConfig = true;
      console.warn("[admin-auth] ADMIN_USER / ADMIN_PASSWORD are not set, so all staff access is denied.");
    }
    return false;
  }

  const credentials = parseBasicAuth(request.headers.get("authorization"));
  if (!credentials) return false;

  // Evaluate both comparisons (no short-circuit) so timing doesn't reveal which part was wrong.
  const userMatches = safeEqual(credentials.user, expectedUser);
  const passwordMatches = safeEqual(credentials.password, expectedPassword);
  return userMatches && passwordMatches;
}

/**
 * 401 for /api/admin/* in the standard error shape. No WWW-Authenticate header, so a stale session in the
 * staff dashboard surfaces as an error the UI can handle instead of a browser prompt mid-fetch.
 */
export function adminApiUnauthorizedResponse(): Response {
  const body: ApiErrorBody = {
    error: { code: "UNAUTHORIZED", message: "Staff sign-in is required. Reload the dashboard and sign in again." },
  };
  return Response.json(body, { status: 401, headers: { "Cache-Control": "no-store" } });
}

/** 401 for staff pages; the WWW-Authenticate header triggers the browser's sign-in prompt. */
export function adminPageUnauthorizedResponse(): Response {
  return new Response("Staff sign-in is required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": WWW_AUTHENTICATE,
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

/** Route-handler guard: returns the 401 response to send, or null when the caller is authorised staff. */
export function requireAdmin(request: Request): Response | null {
  return isAuthorizedAdmin(request) ? null : adminApiUnauthorizedResponse();
}
