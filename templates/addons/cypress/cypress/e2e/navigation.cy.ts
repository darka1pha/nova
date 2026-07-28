describe("Navigation", () => {
  it("switches locale via the locale switcher", () => {
    cy.visit("/en");
    cy.get("select[aria-label='Select language']").select("fa");
    cy.url().should("include", "/fa");
  });

  it("navigates to the dashboard", () => {
    cy.visit("/en");
    cy.contains("a", /dashboard/i).click();
    cy.url().should("include", "/dashboard");
  });
});
