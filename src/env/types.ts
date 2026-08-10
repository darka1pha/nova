export interface EnvVarStatus {
  key: string;
  required: boolean;
  description?: string;
  present: boolean;
  pluginId?: string;
  example?: string;
}

export interface EnvCheckResult {
  ok: boolean;
  totalRequired: number;
  missingRequired: string[];
  totalOptional: number;
  configuredCount: number;
  variables: EnvVarStatus[];
}

export interface EnvSyncResult {
  created: boolean;
  updated: boolean;
  addedKeys: string[];
  existingKeysCount: number;
  envExamplePath: string;
}
