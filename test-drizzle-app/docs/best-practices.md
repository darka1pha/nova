# Best Practices

- **Server Components by default.** Add `"use client"` only when you need
  interactivity, browser APIs, or hooks like `useState`/`useEffect`.
- **No hardcoded user-facing strings.** Route everything through
  `next-intl`.
- **Services over direct `api` calls** in feature code — keeps the HTTP
  client swappable.
- **One schema per domain concept**, reused across client and server
  validation.
- **Small, composable components.** Prefer composition over prop-explosion
  or inheritance-like patterns.
- **Co-locate feature code** under `features/<name>/` rather than spreading
  it across global folders.
- **Document non-obvious decisions** with a short comment, not with a wall
  of text — the "why", not the "what".
