describe("Home page", () => {
  it("renders the hero and CTA", () => {
    cy.visit("/en");
    cy.get("h1").should("be.visible");
    cy.findByRole("button").should("be.visible");
  });
});
