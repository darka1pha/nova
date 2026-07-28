import * as p from "@clack/prompts";

/**
 * Asserts that a clack prompt result wasn't a user cancellation, exiting
 * cleanly (code 0) if it was. Centralized here so the CLI and any future
 * plugin-driven prompt flow (e.g. `nova add <plugin>` asking follow-up
 * questions) get identical cancel-handling instead of each reimplementing
 * this check.
 */
export function bail<T>(value: T | symbol): asserts value is T {
  if (p.isCancel(value)) {
    p.cancel("Operation cancelled.");
    process.exit(0);
  }
}

/**
 * Re-exported so consumers can depend on "@nova/core" alone for basic
 * intro/outro/spinner needs without a direct @clack/prompts dependency.
 * This keeps the underlying prompt library swappable in one place later.
 */
export { p as clack };
