# Playwright

Playwright is included for cross-browser end-to-end tests.

```bash
npm run pw:install
npm run pw:test
```

Useful commands:

- `pw:test` runs the E2E suite.
- `pw:ui` opens the interactive Playwright runner.
- `pw:install` downloads browser binaries after dependency installation.

Tests live in `tests/e2e`. Prefer user-facing locators such as roles, labels,
and visible text instead of CSS selectors.
