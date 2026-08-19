"use client";

import React, { useState, useRef } from "react";
import { Upload, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileUploadProps {
  onSuccess?: (url: string, path: string) => void;
  folder?: string;
  maxSizeBytes?: number;
  accept?: string;
}

export function FileUpload({ onSuccess, folder = "uploads", maxSizeBytes = 10 * 1024 * 1024, accept = "image/*,application/pdf" }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSizeBytes) {
      setError(`File exceeds maximum size of ${Math.round(maxSizeBytes / (1024 * 1024))}MB`);
      return;
    }

    setError(null);
    setIsUploading(true);
    setProgress("Uploading...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setProgress("Upload complete!");
      if (onSuccess) {
        onSuccess(data.file.url, data.file.path);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg border-muted hover:border-primary/50 transition-colors">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />
      <Upload className="w-8 h-8 text-muted-foreground mb-2" />
      <p className="text-sm font-medium mb-1">Click or drag file to upload</p>
      <p className="text-xs text-muted-foreground mb-4">Max file size: {Math.round(maxSizeBytes / (1024 * 1024))}MB</p>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
      >
        {isUploading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {progress}
          </>
        ) : (
          "Select File"
        )}
      </Button>

      {error && (
        <div className="flex items-center text-xs text-destructive mt-3">
          <AlertCircle className="w-3.5 h-3.5 mr-1" />
          {error}
        </div>
      )}
      {!error && progress && !isUploading && (
        <div className="flex items-center text-xs text-green-600 dark:text-green-400 mt-3">
          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
          {progress}
        </div>
      )}
    </div>
  );
}
