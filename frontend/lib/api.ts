/**
 * API client — all backend calls go through here.
 * Automatically attaches auth token and handles errors.
 */

import { getToken, clearAuth } from "./auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    clearAuth();
    window.location.href = "/login";
    throw new ApiError(401, "Session expired");
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new ApiError(res.status, error.detail || "Request failed");
  }

  if (res.status === 204) return {} as T;
  return res.json();
}

// --- Auth ---
export const api = {
  auth: {
    signup: (data: { email: string; username: string; password: string }) =>
      request<{ access_token: string; user: any }>("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    login: (data: { email: string; password: string }) =>
      request<{ access_token: string; user: any }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    me: () => request<any>("/api/auth/me"),
  },

  // --- Documents ---
  documents: {
    list: () => request<any[]>("/api/documents/"),

    upload: (files: File[]) => {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));

      const token = getToken();
      return fetch(`${BASE_URL}/api/documents/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      }).then((r) => r.json());
    },

    delete: (id: number) =>
      request(`/api/documents/${id}`, { method: "DELETE" }),

    status: (id: number) => request<any>(`/api/documents/${id}/status`),

    stats: () => request<any>("/api/documents/stats/summary"),
  },

  // --- Chat ---
  chat: {
    sessions: () => request<any[]>("/api/chat/sessions"),

    newSession: () => request<any>("/api/chat/sessions/new", { method: "POST" }),

    messages: (sessionId: number) =>
      request<any>(`/api/chat/sessions/${sessionId}/messages`),

    deleteSession: (sessionId: number) =>
      request(`/api/chat/sessions/${sessionId}`, { method: "DELETE" }),
  },

  // --- Admin ---
  admin: {
    stats: () => request<any>("/api/admin/stats"),
    users: () => request<any[]>("/api/admin/users"),
    documents: () => request<any[]>("/api/admin/documents"),
    toggleUser: (userId: number) =>
      request<any>(`/api/admin/users/${userId}/toggle-active`, { method: "PATCH" }),
  },
};

/**
 * Stream a chat response using Server-Sent Events.
 * Calls onToken for each streamed token, onSources for source citations.
 */
export async function streamChat(
  message: string,
  sessionId: number | null,
  documentIds: number[] | null,
  onToken: (token: string) => void,
  onSources: (sources: any[]) => void,
  onSessionCreated: (id: number) => void,
  onDone: () => void,
  onError: (err: string) => void
): Promise<void> {
  const token = getToken();

  const res = await fetch(`${BASE_URL}/api/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      message,
      session_id: sessionId,
      document_ids: documentIds?.length ? documentIds : null,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Stream failed" }));
    onError(err.detail || "Failed to connect to AI");
    return;
  }

  const reader = res.body?.getReader();
  const decoder = new TextDecoder();
  if (!reader) return;

  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (!raw) continue;

      try {
        const event = JSON.parse(raw);
        if (event.type === "session") onSessionCreated(event.session_id);
        else if (event.type === "sources") onSources(event.data);
        else if (event.type === "token") onToken(event.content);
        else if (event.type === "done") onDone();
        else if (event.type === "error") onError(event.message);
      } catch {
        // Ignore malformed SSE data
      }
    }
  }
}
