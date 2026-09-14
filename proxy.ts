/**
 * Staff-area gate (Next.js 16 Proxy, formerly Middleware; runs on the Node.js runtime).
 * /admin/** and /api/admin/** require HTTP Basic credentials matching ADMIN_USER / ADMIN_PASSWORD.
 * Every /api/admin handler re-checks the credentials too (see lib/api/admin-auth.ts).
 */
import { NextResponse, type NextRequest } from "next/server";
import {
  adminApiUnauthorizedResponse,
  adminPageUnauthorizedResponse,
  isAuthorizedAdmin,
} from "@/lib/api/admin-auth";

export function proxy(request: NextRequest) {
  const isApi = request.nextUrl.pathname.startsWith("/api/");

  if (!isAuthorizedAdmin(request)) {
    return isApi ? adminApiUnauthorizedResponse() : adminPageUnauthorizedResponse();
  }

  const response = NextResponse.next();
  // Staff screens hold customer contact details: keep them out of search results.
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
