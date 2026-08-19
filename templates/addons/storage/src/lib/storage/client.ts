import fs from "node:fs/promises";
import path from "node:path";
import type { StorageDriver, UploadOptions, UploadResult } from "./types";
import { validateFile } from "./validators";

export class StorageClient {
  private driver: StorageDriver;
  private localDir: string;
  private bucketName: string;

  constructor() {
    this.driver = (process.env.STORAGE_DRIVER as StorageDriver) || "local";
    this.localDir = process.env.STORAGE_LOCAL_DIR || "./public/uploads";
    this.bucketName = process.env.STORAGE_BUCKET_NAME || "app-uploads";
  }

  async upload(file: { name: string; buffer: Buffer; type: string }, options: UploadOptions = {}): Promise<UploadResult> {
    const validation = validateFile({ size: file.buffer.length, type: file.type, name: file.name }, options);
    if (!validation.valid) {
      throw new Error(validation.error || "File validation failed");
    }

    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueName = `${Date.now()}-${sanitizedName}`;
    const folder = options.folder ? options.folder.replace(/[^a-zA-Z0-9_-]/g, "") : "";
    const relativePath = folder ? `${folder}/${uniqueName}` : uniqueName;

    if (this.driver === "local") {
      const targetFolder = path.resolve(this.localDir, folder);
      await fs.mkdir(targetFolder, { recursive: true });
      const targetFilePath = path.join(targetFolder, uniqueName);
      await fs.writeFile(targetFilePath, file.buffer);

      return {
        url: `/uploads/${relativePath}`,
        path: relativePath,
        size: file.buffer.length,
        mimeType: file.type,
        driver: "local",
      };
    }

    return {
      url: `https://storage.example.com/${this.bucketName}/${relativePath}`,
      path: relativePath,
      size: file.buffer.length,
      mimeType: file.type,
      driver: this.driver,
    };
  }

  async delete(filePath: string): Promise<boolean> {
    if (this.driver === "local") {
      const fullPath = path.resolve(this.localDir, filePath);
      try {
        await fs.unlink(fullPath);
        return true;
      } catch {
        return false;
      }
    }
    return true;
  }
}

export const storage = new StorageClient();
