# How to Add a New Feature

1. Create `src/features/<name>/` with `components/`, `actions/`,
   `schemas/`, `types/`, and optionally `hooks/` — mirror
   `src/features/auth/`.
2. Add zod schemas in `schemas/` (or reuse `lib/validations` for shared
   rules).
3. Add Server Actions in `actions/` for mutations; call services
   (`src/services/`) for reads, adding a new service file if one doesn't
   exist for this resource yet.
4. Add translation namespaces: `src/messages/<locale>/<name>.json` for
   every supported locale, then import them in `src/i18n/request.ts`.
5. Add a route under `src/app/[locale]/<name>/` that renders your feature's
   components.
6. Write a short `README.md` in the feature folder explaining why it exists
   and any non-obvious decisions, following the pattern in
   `src/features/auth/README.md`.
