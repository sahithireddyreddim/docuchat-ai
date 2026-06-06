"use client";

import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Square } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export function VoiceInput({ onTranscript, disabled }: Props) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check for browser support
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join("");

      if (event.results[event.results.length - 1].isFinal) {
        onTranscript(transcript);
        setIsListening(false);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      toast.error("Voice input error. Please try again.");
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
  }, [onTranscript]);

  function toggleListening() {
    const recognition = recognitionRef.current;

    if (!recognition) {
      toast.error("Voice input is not supported in your browser. Try Chrome.");
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
      toast("Listening... speak now", { icon: "🎙️", duration: 2000 });
    }
  }

  return (
    <button
      type="button"
      onClick={toggleListening}
      disabled={disabled}
      title={isListening ? "Stop listening" : "Voice input"}
      className={`p-2 rounded-lg transition-all ${
        isListening
          ? "bg-red-500 text-white animate-pulse"
          : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {isListening ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
    </button>
  );
}
