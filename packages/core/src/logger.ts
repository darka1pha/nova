import * as p from "@clack/prompts";

/**
 * Thin wrapper around @clack/prompts' logging so the rest of Helix (CLI,
 * plugin loader, generators) depends on "@helix/core" instead of importing
 * @clack/prompts directly everywhere. Keeps the underlying log/prompt
 * library swappable behind one seam.
 */
export const logger = {
  info: (msg: string) => p.log.info(msg),
  success: (msg: string) => p.log.success(msg),
  warn: (msg: string) => p.log.warn(msg),
  error: (msg: string) => p.log.error(msg),
  step: (msg: string) => p.log.step(msg),
};
