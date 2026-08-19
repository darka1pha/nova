import mime from "mime-types";

export const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const DEFAULT_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/json",
];

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFile(
  file: { size: number; type: string; name: string },
  options: { maxSizeBytes?: number; allowedMimeTypes?: string[] } = {},
): ValidationResult {
  const maxSize = options.maxSizeBytes ?? DEFAULT_MAX_FILE_SIZE;
  const allowedTypes = options.allowedMimeTypes ?? DEFAULT_ALLOWED_MIME_TYPES;

  if (file.size > maxSize) {
    const maxMb = Math.round(maxSize / (1024 * 1024));
    return { valid: false, error: `File size exceeds maximum allowed size of ${maxMb}MB.` };
  }

  const resolvedType = file.type || mime.lookup(file.name) || "application/octet-stream";
  if (!allowedTypes.includes(resolvedType)) {
    return { valid: false, error: `File type "${resolvedType}" is not permitted.` };
  }

  if (file.name.includes("..") || file.name.includes("/") || file.name.includes("\\")) {
    return { valid: false, error: "Invalid characters in filename." };
  }

  return { valid: true };
}
