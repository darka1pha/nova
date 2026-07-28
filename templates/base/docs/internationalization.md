# Internationalization

See `src/i18n/README.md`. Quick reference:

| Need                          | Use                                      |
|-------------------------------|-------------------------------------------|
| Translate in a Server Component | `getTranslations()` from `next-intl/server` |
| Translate in a Client Component | `useTranslations()` from `next-intl`        |
| Localized `<Link>`/`useRouter`  | `@/i18n/navigation`                        |
| Localized `generateMetadata`    | `getTranslations({ locale, namespace })`   |
| RTL layout                      | `dir` is set automatically in `[locale]/layout.tsx` |

Never hardcode user-facing strings in components — add a key to
`src/messages/<locale>/<namespace>.json` instead.
