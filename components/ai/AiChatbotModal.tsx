"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Send, X } from "lucide-react";
import { askCopilot } from "@/lib/api";

const MANDATORY_QUESTIONS = [
  "What are my sales today?",
  "What sold most today?",
  "What is my best sales hour?",
  "What should I buy today?",
  "Which products are low stock?",
  "Which products expire soon?",
  "What should I discount?",
  "Why did sales fall?",
  "What products are growing?",
  "What products are declining?",
  "What should I stop buying?",
  "What sells most after 6 PM?",
  "What products are bought together?",
  "What should I focus on today?",
];

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

export function AiChatbotModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "ai",
      text: "Hello! I am Green Quant Retail AI. Ask me any of the store intelligence questions below for real-time answers based on your store data.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async (questionText?: string) => {
    const q = (questionText || input).trim();
    if (!q || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!questionText) setInput("");
    setLoading(true);

    try {
      const res = await askCopilot(q);
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: res.answer || "I don't have enough store data to answer that reliably.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: "I don't have enough store data to answer that reliably.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-brand px-4 py-3 text-white shadow-popover transition-transform hover:bg-brand-strong active:scale-[0.98]"
      >
        <Bot className="h-5 w-5" />
        <span className="text-xs font-semibold">Ask Green Quant</span>
      </button>

      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="fixed bottom-20 right-6 z-50 flex h-[540px] w-full max-w-md flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-popover"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-line bg-elevated px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-soft">
                  <Bot className="h-[18px] w-[18px] text-brand" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold leading-tight text-ink">Retail Copilot</h3>
                  <p className="text-[11px] font-medium text-muted">Answers from your store data</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1.5 text-muted transition-colors hover:bg-subtle hover:text-ink"
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quick questions */}
            <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-line bg-elevated px-3 py-2.5" style={{ scrollbarWidth: "none" }}>
              {MANDATORY_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="shrink-0 whitespace-nowrap rounded-md border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-dim transition-colors hover:border-brand hover:text-brand"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-3 overflow-y-auto bg-canvas p-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2.5 text-xs leading-relaxed ${
                      m.sender === "user"
                        ? "bg-brand text-white"
                        : "border border-line bg-surface text-ink"
                    }`}
                  >
                    <p className="whitespace-pre-line">{m.text}</p>
                    <span
                      className={`mt-1 block text-right text-[10px] ${
                        m.sender === "user" ? "text-white/70" : "text-faint"
                      }`}
                    >
                      {m.timestamp}
                    </span>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2.5 text-xs text-muted">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-brand" />
                    Working on your question…
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2 border-t border-line bg-surface p-3"
            >
              <input
                type="text"
                placeholder="Ask any store analytics question…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="h-9 flex-1 rounded-md border border-line bg-elevated px-3 text-xs text-ink placeholder:text-faint focus:border-brand focus:bg-surface focus:ring-2 focus:ring-brand/20 focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand text-white transition-colors hover:bg-brand-strong disabled:pointer-events-none disabled:opacity-50"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
