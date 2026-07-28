# Cypress E2E tests

- `e2e/home.cy.ts` — smoke test for the landing page.
- `e2e/navigation.cy.ts` — locale switching and internal navigation.
- `e2e/auth.cy.ts` — form validation + mocked API login flow via
  `cy.intercept`.
- `support/commands.ts` — custom `cy.login()` command.

These specs use `@testing-library/cypress`-style queries
(`findByLabelText`, `findByRole`) — add
`@testing-library/cypress` to devDependencies and import it in
`support/e2e.ts` if you want those queries (`cy.findBy...`); otherwise swap
them for `cy.get('[data-testid=...]')` selectors.

Run with `npm run cy:open` (interactive) or `npm run cy:run` (headless).
