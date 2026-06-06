"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "../../lib/auth";
import { Navbar } from "../../components/Navbar";
import { FileUpload } from "../../components/documents/FileUpload";
import { DocumentList } from "../../components/documents/DocumentList";
import { FolderOpen } from "lucide-react";

export default function DocumentsPage() {
  const router = useRouter();
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    if (!isAuthenticated()) router.replace("/login");
  }, [router]);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Documents</h1>
              <p className="text-sm text-gray-500">Upload and manage your knowledge base</p>
            </div>
          </div>

          {/* Upload section */}
          <div className="card p-6 mb-6">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wider">
              Upload Documents
            </h2>
            <FileUpload onUploadComplete={() => setRefreshTick((t) => t + 1)} />
          </div>

          {/* Document list */}
          <div className="card p-6">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wider">
              Your Documents
            </h2>
            <DocumentList refresh={refreshTick} />
          </div>
        </div>
      </main>
    </div>
  );
}
