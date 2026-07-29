# Mailpit (local email development)

This addon configures a small SMTP-based development inbox using Mailpit.

Environment variables:

- SMTP_HOST (default: localhost)
- SMTP_PORT (default: 1025)
- SMTP_USER (optional)
- SMTP_PASSWORD (optional)
- SMTP_FROM (default: noreply@example.com)

Usage:

The generated project includes a small SMTP wrapper at `src/lib/email/mailpit.ts`.
When Mailpit addon is selected, the Docker Compose generator will also include
a `mailpit` service exposing the UI at http://localhost:8025 and SMTP at port 1025.

React Email integration:

If `reactEmail` is enabled, consider calling `sendMail` from server-side code to
render and send transactional emails during development.
