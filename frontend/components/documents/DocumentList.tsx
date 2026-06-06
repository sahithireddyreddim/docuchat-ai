"use client";

import { useEffect, useState, useCallback } from "react";
import {
  FileText, File, Trash2, RefreshCw, CheckCircle, Clock, AlertCircle, Loader2,
} from "lucide-react";
import { api } from "../../lib/api";
import { formatFileSize, formatDate } from "../../lib/utils";
import toast from "react-hot-toast";

interface Document {
  id: number;
  name: string;
  type: string;
  size: number;
  chunks: number;
  processed: boolean;
  error: string | null;
  created_at: string;
}

interface Props {
  refresh?: number;  // Increment to trigger refresh
}

function FileIcon({ type }: { type: string }) {
  const colors: Record<string, string> = {
    ".pdf": "text-red-500",
    ".docx": "text-blue-500",
    ".txt": "text-gray-500",
  };
  return <FileText className={`w-5 h-5 ${colors[type] || "text-gray-400"}`} />;
}

function StatusBadge({ doc }: { doc: Document }) {
  if (doc.error) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400">
        <AlertCircle className="w-3 h-3" />
        Error
      </span>
    );
  }
  if (doc.processed) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400">
        <CheckCircle className="w-3 h-3" />
        Ready ({doc.chunks} chunks)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
      <Loader2 className="w-3 h-3 animate-spin" />
      Processing...
    </span>
  );
}

export function DocumentList({ refresh }: Props) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadDocuments = useCallback(async () => {
    try {
      const data = await api.documents.list();
      setDocuments(data);
    } catch {
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [refresh, loadDocuments]);

  // Poll for processing status every 3 seconds if any doc is processing
  useEffect(() => {
    const hasProcessing = documents.some((d) => !d.processed && !d.error);
    if (!hasProcessing) return;

    const interval = setInterval(loadDocuments, 3000);
    return () => clearInterval(interval);
  }, [documents, loadDocuments]);

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Delete "${name}"? This will remove it from the AI knowledge base.`)) return;

    setDeletingId(id);
    try {
      await api.documents.delete(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      toast.success("Document deleted");
    } catch {
      toast.error("Failed to delete document");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <File className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400 font-medium">No documents yet</p>
        <p className="text-sm text-gray-400 mt-1">Upload PDF, DOCX, or TXT files above</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">{documents.length} document{documents.length !== 1 ? "s" : ""}</p>
        <button
          onClick={loadDocuments}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {documents.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
        >
          <FileIcon type={doc.type} />

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
              {doc.name}
            </p>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-gray-400">{formatFileSize(doc.size)}</span>
              <span className="text-xs text-gray-300 dark:text-gray-600">•</span>
              <span className="text-xs text-gray-400">{formatDate(doc.created_at)}</span>
            </div>
            {doc.error && (
              <p className="text-xs text-red-500 mt-1 truncate" title={doc.error}>
                {doc.error}
              </p>
            )}
          </div>

          <StatusBadge doc={doc} />

          <button
            onClick={() => handleDelete(doc.id, doc.name)}
            disabled={deletingId === doc.id}
            className="text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
            title="Delete document"
          >
            {deletingId === doc.id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        </div>
      ))}
    </div>
  );
}
