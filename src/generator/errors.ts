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