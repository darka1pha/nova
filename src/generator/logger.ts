export type LogLevel = "debug" | "verbose" | "info" | "success" | "warn" | "error";

export interface Logger {
  debug(message: string): void;
  verbose(message: string): void;
  info(message: string): void;
  success(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  /** Reports a coarse-grained generation step, e.g. for a CLI spinner. */
  step(message: string): void;
}

export interface CreateLoggerOptions {
  /** When true, suppresses debug/verbose output (CI-friendly). */
  ci?: boolean;
  /** When true, also emits debug output. */
  verbose?: boolean;
  /** Forwarded every time `step()` is called - e.g. to update a spinner. */
  onStep?: (step: string) => void;
  /** Override the underlying sink, mainly for tests. */
  write?: (level: LogLevel, message: string) => void;
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  verbose: 1,
  info: 2,
  success: 2,
  warn: 3,
  error: 4,
};

/**
 * Small dependency-free structured logger. Centralizing this means every
 * part of the generator (planner, writers, patchers, plugin validation)
 * reports through one consistent surface instead of scattering
 * `console.log` calls, and CI mode can suppress noisy levels in one place.
 */
export function createLogger(options: CreateLoggerOptions = {}): Logger {
  const { ci = false, verbose = false, onStep, write } = options;
  const minLevel = verbose ? LEVEL_ORDER.debug : ci ? LEVEL_ORDER.info : LEVEL_ORDER.verbose;

  function emit(level: LogLevel, message: string) {
    if (LEVEL_ORDER[level] < minLevel) return;

    if (write) {
      write(level, message);
      return;
    }

    switch (level) {
      case "error":
        console.error(`[nova] ${message}`);
        break;
      case "warn":
        console.warn(`[nova] ${message}`);
        break;
      default:
        console.log(`[nova] ${message}`);
    }
  }

  return {
    debug: (message) => emit("debug", message),
    verbose: (message) => emit("verbose", message),
    info: (message) => emit("info", message),
    success: (message) => emit("success", message),
    warn: (message) => emit("warn", message),
    error: (message) => emit("error", message),
    step: (message) => {
      emit("info", message);
      onStep?.(message);
    },
  };
}