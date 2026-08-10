# Auth Feature (Reference Implementation)

## Why it exists
Demonstrates the recommended feature-folder architecture: colocated
components, actions, schemas, types, and hooks, wired to Server Actions,
localization, and the shared validation layer.

## How it works
- `actions/login-action.ts` — Server Action, validated with the shared
  `loginSchema`, calls the backend, persists tokens via `lib/auth`.
- `components/login-form.tsx` — Client Component using `useActionState` for
  progressive enhancement (works without JS, enhanced with it).
- `hooks/use-session.ts` — client hook for reading the current session.
- `schemas/`, `types/` — feature-local validation and TypeScript types.

## How to customize
Copy this folder's shape for new features (`features/dashboard`,
`features/profile`, ...). Keep business logic in `actions/`, not in
components.

## Best practices
- Server Actions for mutations; Server Components for data fetching.
- Validate on both client (fast feedback) and server (source of truth) using
  the same zod schema.

## Common pitfalls
- Don't fetch data in `useEffect` when a Server Component could fetch it
  directly — reserve client fetching for data that changes after the
  initial render.
