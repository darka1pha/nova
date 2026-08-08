# Folder Structure

```
src/
├── app/ # App Router routes, grouped under [locale]
├── actions/ # Cross-cutting Server Actions not tied to one feature
├── components/
│ ├── ui/ # shadcn/ui-style primitives (button, input, card...)
│ ├── common/ # Small generic UI (spinner, empty-state)
│ ├── layout/ # Header, footer, theme/locale switchers
│ ├── forms/ # Form wrapper, field, error components
│ └── providers/ # Client-side provider wrappers (theme, etc)
├── features/ # Feature-first modules (auth, dashboard, profile...)
│ └── <feature>/
│ ├── components/
│ ├── hooks/
│ ├── actions/
│ ├── schemas/
│ └── types/
├── hooks/ # App-wide reusable hooks
├── lib/
│ ├── api/ # Type-safe fetch client(s) + interceptors
│ ├── auth/ # Token rotation, session helpers
│ ├── prisma/ # Prisma client singleton (if enabled)
│ ├── db/ # Drizzle client + schema (if enabled instead of Prisma)
│ ├── validations/ # Shared zod schemas
│ ├── constants/ # App-wide constants
│ ├── helpers/ # cn() and other small helpers
│ └── cache/ # Cache tag registry
├── services/ # Business-shaped API calls, built on lib/api
├── utils/ # Pure utility functions (formatting, arrays, strings)
├── config/ # Site config, validated env
├── providers/ # Composition root for all client providers
├── styles/ # Global CSS
├── types/ # Shared TypeScript types
├── messages/ # next-intl translation JSON per locale
└── i18n/ # next-intl routing/navigation/request config
```

## Rule of thumb
- **`features/`** owns anything specific to one product area — start here
  for new work.
- **`lib/`** owns cross-cutting infrastructure (HTTP, auth, DB).
- **`components/`** owns UI with no business logic.
- **`services/`** is the only place allowed to call `lib/api` directly for
  business data; features call services, not `api`, so the transport can
  change independently.
