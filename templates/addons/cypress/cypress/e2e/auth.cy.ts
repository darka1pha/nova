describe("Authentication", () => {
  it("shows a validation error for an invalid login", () => {
    cy.intercept("POST", "**/auth/login", { statusCode: 401 }).as("login");

    cy.visit("/en/dashboard");
    cy.findByLabelText(/email/i).type("not-an-email");
    cy.findByLabelText(/password/i).type("short");
    cy.findByRole("button", { name: /sign in/i }).click();

    cy.get("form").should("exist");
  });

  it("mocks a successful login response", () => {
    cy.intercept("POST", "**/auth/login", {
      statusCode: 200,
      body: { accessToken: "test-access", refreshToken: "test-refresh" },
    }).as("login");

    cy.visit("/en/dashboard");
    cy.findByLabelText(/email/i).type("user@example.com");
    cy.findByLabelText(/password/i).type("password123");
    cy.findByRole("button", { name: /sign in/i }).click();
    cy.wait("@login");
  });
});
