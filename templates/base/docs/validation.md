# Validation

All schemas live under `src/lib/validations/`. Conventions:

- One file per domain (`auth.ts`, `user.ts`, `common.ts`).
- Error messages are **translation keys** (e.g. `"validation.required"`),
  never hardcoded English strings — resolve them with `t()` at render time.
- Reuse building blocks (`emailSchema`, `passwordSchema`) instead of
  redefining validation rules per form.
- The same schema is used for both client-side (React Hook Form resolver)
  and server-side (Server Action) validation — one source of truth.
