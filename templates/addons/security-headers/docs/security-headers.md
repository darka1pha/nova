# Security Headers addon

Adds a small helper at `src/lib/security-headers` and patches the
application middleware to apply basic security headers.

Defaults include:
- Content-Security-Policy (conservative default)
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy
- X-Frame-Options: DENY

Developers should review and customize the CSP for their chosen UI and
3rd-party scripts. The generator patches `src/middleware.ts` to call the
helper; changes are idempotent.
