import { NextResponse } from "next/server";

export function applySecurityHeaders(response: any) {
  try {
    if (!response || !response.headers) return;

    // Basic secure defaults — keep permissive for development. Projects
    // can customize these values after generation.
    const csp = "default-src 'self'; img-src * data:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';";

    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("Permissions-Policy", "geolocation=()");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("Content-Security-Policy", csp);
  } catch (e) {
    // swallow — middleware should not crash on header application
  }
}
