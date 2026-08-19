export type StorageDriver = "local" | "s3" | "supabase";

export interface UploadOptions {
  folder?: string;
  allowedMimeTypes?: string[];
  maxSizeBytes?: number;
  filename?: string;
}

export interface UploadResult {
  url: string;
  path: string;
  size: number;
  mimeType: string;
  driver: StorageDriver;
}

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  lastModified?: number;
}
