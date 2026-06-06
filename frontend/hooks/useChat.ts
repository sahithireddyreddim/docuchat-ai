"use client";

import { useState, useCallback, useRef } from "react";
import { streamChat } from "../lib/api";
import toast from "react-hot-toast";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  isStreaming?: boolean;
}

export interface Source {
  document: string;
  document_id: string;
  chunk_index: number;
  score: number;
  preview: string;
}

export function useChat(initialSessionId: number | null = null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(initialSessionId);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState<number[]>([]);
  const abortRef = useRef<boolean>(false);

  const addMessage = useCallback((msg: Message) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      abortRef.current = false;
      setIsLoading(true);

      // Add user message
      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content: content.trim(),
      };
      setMessages((prev) => [...prev, userMsg]);

      // Add placeholder for streaming assistant message
      const assistantId = `assistant-${Date.now()}`;
      const assistantPlaceholder: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        isStreaming: true,
      };
      setMessages((prev) => [...prev, assistantPlaceholder]);

      let currentSources: Source[] = [];

      try {
        await streamChat(
          content,
          sessionId,
          selectedDocIds.length > 0 ? selectedDocIds : null,

          // onToken — append token to streaming message
          (token: string) => {
            if (abortRef.current) return;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + token } : m
              )
            );
          },

          // onSources
          (sources: Source[]) => {
            currentSources = sources;
          },

          // onSessionCreated
          (id: number) => {
            setSessionId(id);
          },

          // onDone
          () => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, isStreaming: false, sources: currentSources }
                  : m
              )
            );
            setIsLoading(false);
          },

          // onError
          (err: string) => {
            toast.error(err || "Something went wrong");
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      content: `Sorry, I encountered an error: ${err}`,
                      isStreaming: false,
                    }
                  : m
              )
            );
            setIsLoading(false);
          }
        );
      } catch (err: any) {
        toast.error("Failed to connect to the server");
        setIsLoading(false);
      }
    },
    [sessionId, isLoading, selectedDocIds]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setSessionId(null);
  }, []);

  const loadSession = useCallback((id: number, msgs: Message[]) => {
    setSessionId(id);
    setMessages(msgs);
  }, []);

  return {
    messages,
    sessionId,
    isLoading,
    selectedDocIds,
    setSelectedDocIds,
    sendMessage,
    clearMessages,
    loadSession,
    addMessage,
  };
}
