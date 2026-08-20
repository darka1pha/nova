import type { InfrastructureValidationResult } from "../../types.js";

export function validateTerraformFiles(files: Record<string, string>): InfrastructureValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const [filename, content] of Object.entries(files)) {
    if (!content || !content.trim()) {
      errors.push(`Terraform file "${filename}" is empty.`);
      continue;
    }

    // Check brace balance
    const openBraces = (content.match(/{/g) || []).length;
    const closeBraces = (content.match(/}/g) || []).length;
    if (openBraces !== closeBraces) {
      errors.push(`Terraform file "${filename}" has unmatched braces (${openBraces} open, ${closeBraces} closed).`);
    }

    if (filename === "main.tf") {
      if (!content.includes("terraform {")) {
        warnings.push("main.tf is missing a explicit 'terraform' block with required_version.");
      }
      if (!content.includes("provider \"")) {
        warnings.push("main.tf does not define an explicit provider block.");
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}
