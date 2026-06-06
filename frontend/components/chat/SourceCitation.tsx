"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, FileText, ExternalLink } from "lucide-react";
import type { Source } from "../../hooks/useChat";

interface Props {
  sources: Source[];
}

export function SourceCitation({ sources }: Props) {
  const [open, setOpen] = useState(false);

  if (!sources?.length) return null;

  return (
    <div className="mt-3 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
            {sources.length} source{sources.length > 1 ? "s" : ""} cited
          </span>
        </div>
        {open ? (
          <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
        )}
      </button>

      {open && (
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {sources.map((source, i) => (
            <div key={i} className="px-3 py-2.5 bg-white dark:bg-gray-900">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate max-w-[200px]">
                  {source.document}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Chunk {source.chunk_index + 1}</span>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: source.score > 0.7 ? "#dcfce7" : source.score > 0.5 ? "#fef9c3" : "#fee2e2",
                      color: source.score > 0.7 ? "#166534" : source.score > 0.5 ? "#854d0e" : "#991b1b",
                    }}
                  >
                    {(source.score * 100).toFixed(0)}% match
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-3">
                {source.preview}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
