/**
 * @deprecated This module now just re-exports "@helix/core". Import from
 * "@helix/core" directly instead. Kept as a backward-compatible shim during
 * the Phase 2 core-extraction migration (see
 * docs/migration/phase-2-core-extraction.md) and will be removed once all
 * internal and third-party call sites have moved off it.
 */
export { copyTemplateDir, joinAddon, pathExists } from "@helix/core";
