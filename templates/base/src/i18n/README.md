# Internationalization

## Why it exists
Every user-facing string must be translatable. Hardcoded text is a linting
violation in this project (see `eslint.config.mjs` and code review checklist
in `docs/best-practices.md`).

## How it works
- `routing.ts` — declares supported locales and default locale.
- `navigation.ts` — locale-aware `Link`/`useRouter`/`redirect`; always import
  navigation primitives from here, not `next/navigation`.
- `request.ts` — loads the right message bundles per request/locale.
- `locale.ts` — cookie-based locale persistence for use outside the
  `[locale]` route segment (e.g. Server Actions).

Messages live in `src/messages/<locale>/<namespace>.json`. Add a new
namespace by creating the JSON file for every locale and importing it in
`request.ts`.

## How to customize
- Add a locale: add it to `routing.ts` locales, then create
  `messages/<locale>/*.json` for every existing namespace.
- RTL: `app/[locale]/layout.tsx` sets `dir` based on locale — extend the
  `direction` map for additional RTL locales.

## Common pitfalls
- Forgetting to add a new namespace to every locale causes a runtime import
  error — keep namespace files in sync across locales.
