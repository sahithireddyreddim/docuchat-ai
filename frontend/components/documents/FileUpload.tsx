"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, File, X, CheckCircle, AlertCircle, Loader2, CloudUpload } from "lucide-react";
import { api } from "../../lib/api";
import { formatFileSize } from "../../lib/utils";
import toast from "react-hot-toast";

interface UploadedFile {
  file: File;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

interface Props {
  onUploadComplete: () => void;
}

const ACCEPTED_TYPES = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "text/plain": [".txt"],
};

export function FileUpload({ onUploadComplete }: Props) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback((accepted: File[]) => {
    const newFiles: UploadedFile[] = accepted.map((f) => ({
      file: f,
      status: "pending",
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxFiles: 10,
    onDropRejected: (rejections) => {
      rejections.forEach((r) => {
        toast.error(`${r.file.name}: ${r.errors[0]?.message}`);
      });
    },
  });

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleUpload() {
    const pendingFiles = files.filter((f) => f.status === "pending");
    if (!pendingFiles.length) return;

    setUploading(true);
    setFiles((prev) =>
      prev.map((f) => (f.status === "pending" ? { ...f, status: "uploading" } : f))
    );

    try {
      const result = await api.documents.upload(pendingFiles.map((f) => f.file));
      setFiles((prev) =>
        prev.map((f) => (f.status === "uploading" ? { ...f, status: "success" } : f))
      );
      toast.success(`${result.uploaded?.length || pendingFiles.length} file(s) uploaded and processing`);
      onUploadComplete();
      // Auto-clear after 3 seconds
      setTimeout(() => setFiles([]), 3000);
    } catch (err: any) {
      setFiles((prev) =>
        prev.map((f) =>
          f.status === "uploading" ? { ...f, status: "error", error: err.message } : f
        )
      );
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const pendingCount = files.filter((f) => f.status === "pending").length;

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
          isDragActive
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
            : "border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800/50"
        }`}
      >
        <input {...getInputProps()} />
        <CloudUpload
          className={`w-12 h-12 mx-auto mb-3 ${
            isDragActive ? "text-blue-500" : "text-gray-400"
          }`}
        />
        {isDragActive ? (
          <p className="text-blue-600 font-medium">Drop files here...</p>
        ) : (
          <>
            <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">
              Drag & drop files here, or{" "}
              <span className="text-blue-600">browse</span>
            </p>
            <p className="text-sm text-gray-400">
              PDF, DOCX, TXT — up to 50MB each — max 10 files
            </p>
          </>
        )}
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
            >
              <File className="w-4 h-4 text-blue-500 flex-shrink-0" />

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                  {f.file.name}
                </p>
                <p className="text-xs text-gray-400">{formatFileSize(f.file.size)}</p>
              </div>

              <div className="flex items-center gap-2">
                {f.status === "pending" && (
                  <button
                    onClick={() => removeFile(i)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {f.status === "uploading" && (
                  <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                )}
                {f.status === "success" && (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
                {f.status === "error" && (
                  <div className="flex items-center gap-1 text-red-500">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-xs">{f.error}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {pendingCount > 0 && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="btn-primary flex items-center gap-2"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? "Uploading..." : `Upload ${pendingCount} file${pendingCount > 1 ? "s" : ""}`}
        </button>
      )}
    </div>
  );
}
