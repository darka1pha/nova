export class NovaGeneratorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NovaGeneratorError";
  }
}

export class InvalidProjectNameError extends NovaGeneratorError {
  constructor(name: string) {
    super(`Invalid project name "${name}". Use only letters, numbers, dashes, or underscores.`);
    this.name = "InvalidProjectNameError";
  }
}

export class DirectoryNotEmptyError extends NovaGeneratorError {
  constructor(name: string) {
    super(`Directory "${name}" already exists and is not empty.`);
    this.name = "DirectoryNotEmptyError";
  }
}

export class UnknownPluginError extends NovaGeneratorError {
  constructor(name: string) {
    super(`Unknown plugin/feature: "${name}".`);
    this.name = "UnknownPluginError";
  }
}

export class PluginConflictError extends NovaGeneratorError {
  constructor(a: string, b: string) {
    super(`Plugin "${a}" conflicts with plugin "${b}". Disable one of them and try again.`);
    this.name = "PluginConflictError";
  }
}

export class MissingPluginDependencyError extends NovaGeneratorError {
  constructor(plugin: string, requires: string) {
    super(`Plugin "${plugin}" requires "${requires}" to also be enabled.`);
    this.name = "MissingPluginDependencyError";
  }
}

export class MissingTemplateError extends NovaGeneratorError {
  constructor(templatePath: string) {
    super(`Template directory not found: "${templatePath}".`);
    this.name = "MissingTemplateError";
  }
}

export class OperationExecutionError extends NovaGeneratorError {
  public readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "OperationExecutionError";
    this.cause = cause;
  }
}

/**
 * Thrown when one or more enabled plugins' own `validate(ctx)` self-check
 * returns `{ ok: false, errors: [...] }` (see `PluginValidationResult` in
 * `src/plugin/types.ts`). Raised before any file is written - `validate()`
 * is a plugin's chance to reject a selection based on things
 * `requires`/`conflicts` can't express (Node version, OS, cross-field
 * checks on its own prompt answers, etc.) - see `src/plugin/validate.ts`.
 */
export class PluginValidationError extends NovaGeneratorError {
  public readonly issues: { plugin: string; errors: string[] }[];

  constructor(issues: { plugin: string; errors: string[] }[]) {
    const message = issues
      .map((issue) => `${issue.plugin}:\n  - ${issue.errors.join("\n  - ")}`)
      .join("\n");
    super(`Plugin validation failed:\n${message}`);
    this.name = "PluginValidationError";
    this.issues = issues;
  }
}