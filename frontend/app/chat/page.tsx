"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "../../lib/auth";
import { ChatInterface } from "../../components/chat/ChatInterface";

export default function ChatPage() {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) router.replace("/login");
  }, [router]);

  return <ChatInterface />;
}
