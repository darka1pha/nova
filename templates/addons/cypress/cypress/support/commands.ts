/// <reference types="cypress" />

// Custom command: logs in via the UI and waits for the dashboard redirect.
// Prefer this over repeating the login flow in every spec.
Cypress.Commands.add("login", (email: string, password: string) => {
  cy.visit("/en");
  cy.findByLabelText(/email/i).type(email);
  cy.findByLabelText(/password/i).type(password);
  cy.findByRole("button", { name: /sign in/i }).click();
  cy.url().should("include", "/dashboard");
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>;
    }
  }
}

export {};
