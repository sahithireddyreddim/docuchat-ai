"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send, Plus, Trash2, MessageSquare, Download, Filter, ChevronDown, FolderOpen, Settings,
} from "lucide-react";
import Link from "next/link";
import { MessageBubble } from "./MessageBubble";
import { VoiceInput } from "./VoiceInput";
import { useChat } from "../../hooks/useChat";
import { api } from "../../lib/api";
import { exportChatToPDF } from "../../lib/utils";
import toast from "react-hot-toast";

interface ChatSession {
  id: number;
  title: string;
  created_at: string;
}

interface Document {
  id: number;
  name: string;
  processed: boolean;
}

export function ChatInterface() {
  const {
    messages, sessionId, isLoading, selectedDocIds,
    setSelectedDocIds, sendMessage, clearMessages, loadSession,
  } = useChat();

  const [input, setInput] = useState("");
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [showDocFilter, setShowDocFilter] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    loadSessions();
    loadDocuments();
  }, []);

  async function loadSessions() {
    try {
      const data = await api.chat.sessions();
      setSessions(data);
    } catch {}
  }

  async function loadDocuments() {
    try {
      const data = await api.documents.list();
      setDocuments(data.filter((d: any) => d.processed));
    } catch {}
  }

  async function handleNewChat() {
    clearMessages();
    await loadSessions();
    toast.success("New chat started");
  }

  async function handleLoadSession(id: number) {
    try {
      const data = await api.chat.messages(id);
      const msgs = data.messages.map((m: any) => ({
        id: String(m.id),
        role: m.role,
        content: m.content,
        sources: m.sources,
      }));
      loadSession(id, msgs);
    } catch {
      toast.error("Failed to load session");
    }
  }

  async function handleDeleteSession(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await api.chat.deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (sessionId === id) clearMessages();
      toast.success("Chat deleted");
    } catch {
      toast.error("Failed to delete");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input);
    setInput("");
    setTimeout(loadSessions, 1000);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  }

  function toggleDocFilter(docId: number) {
    setSelectedDocIds((prev: number[]) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="w-64 flex-shrink-0 flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <button
              onClick={handleNewChat}
              className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              New Chat
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider px-2 mb-2">
              Recent Chats
            </p>
            {sessions.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No chats yet</p>
            ) : (
              sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleLoadSession(s.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg mb-1 group flex items-center justify-between transition-colors ${
                    sessionId === s.id
                      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                      : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                    <span className="text-xs truncate">{s.title}</span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteSession(s.id, e)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 flex-shrink-0"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </button>
              ))
            )}
          </div>

          {/* Bottom links */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-800 space-y-1">
            <Link
              href="/documents"
              className="w-full flex items-center gap-2 text-xs text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 py-2 px-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Manage Documents
            </Link>
            <Link
              href="/admin"
              className="w-full flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 py-2 px-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              Admin Panel
            </Link>
            {messages.length > 0 && (
              <button
                onClick={() => exportChatToPDF("Chat Export", messages)}
                className="w-full flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 py-2 px-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export as PDF
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <h1 className="font-semibold text-gray-900 dark:text-white text-sm flex-1">
            {messages.length > 0 ? "DocuChat AI" : "Chat with your Documents"}
          </h1>

          {/* Document filter */}
          <div className="relative">
            <button
              onClick={() => setShowDocFilter(!showDocFilter)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                selectedDocIds.length > 0
                  ? "border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              {selectedDocIds.length > 0 ? `${selectedDocIds.length} doc${selectedDocIds.length > 1 ? "s" : ""}` : "All docs"}
              <ChevronDown className="w-3 h-3" />
            </button>

            {showDocFilter && (
              <div className="absolute right-0 top-full mt-1 w-64 card p-2 z-50 shadow-lg">
                <p className="text-xs font-medium text-gray-500 px-2 py-1">Filter by document</p>
                {documents.length === 0 ? (
                  <p className="text-xs text-gray-400 px-2 py-2">No processed documents yet</p>
                ) : (
                  documents.map((doc) => (
                    <label
                      key={doc.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedDocIds.includes(doc.id)}
                        onChange={() => toggleDocFilter(doc.id)}
                        className="rounded text-blue-600"
                      />
                      <span className="text-xs text-gray-700 dark:text-gray-300 truncate">
                        {doc.name}
                      </span>
                    </label>
                  ))
                )}
                {selectedDocIds.length > 0 && (
                  <button
                    onClick={() => setSelectedDocIds([])}
                    className="w-full text-xs text-red-500 hover:text-red-600 py-1 mt-1 border-t dark:border-gray-700"
                  >
                    Clear filter
                  </button>
                )}
              </div>
            )}
          </div>

          {messages.length > 0 && (
            <button
              onClick={handleNewChat}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="New chat"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md px-4">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Ask anything about your documents
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  Upload PDFs, DOCX, or TXT files via "Manage Documents", then ask questions here.
                </p>
                <div className="grid grid-cols-1 gap-2 text-left">
                  {[
                    "Summarize the key points",
                    "What are the main conclusions?",
                    "Find all mentions of...",
                    "Compare these sections",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setInput(suggestion)}
                      className="text-sm text-left px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-gray-600 dark:text-gray-400"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="px-4 py-6 space-y-6 max-w-4xl mx-auto w-full">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-4">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
            <div className="flex items-end gap-2 bg-gray-100 dark:bg-gray-800 rounded-2xl p-2">
              <VoiceInput
                onTranscript={(text) => setInput((prev) => prev + text)}
                disabled={isLoading}
              />
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question about your documents... (Shift+Enter for new line)"
                rows={1}
                className="flex-1 bg-transparent resize-none outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 max-h-32 py-1.5 px-1"
                style={{ minHeight: "36px" }}
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="flex-shrink-0 w-9 h-9 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-xl flex items-center justify-center transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-400 text-center mt-2">
              AI answers are based on your uploaded documents only.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
