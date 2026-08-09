"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Send, Loader2, Database, ShieldAlert, Cpu, CheckCircle2, Bot, Clock, ArrowLeft } from "lucide-react";
import { askCopilot } from "@/lib/api";
import { Card, CardHeader, Button, Input, Badge } from "@/components/ui";

type CopilotResponse = {
  answer: string;
  evidence_used: string[];
  confidence: number;
  data_quality: string;
  fallback_used: boolean;
  model_used: string;
};

type Message = {
  id: string;
  role: "user" | "ai";
  content: string;
  metadata?: CopilotResponse;
};

const SUGGESTED_QUESTIONS = [
  "What should I buy today?",
  "Why did sales drop?",
  "What sells at 6pm?",
  "Which products are at risk?",
  "What should I discount?",
  "What sells this weekend?",
];

export default function CopilotPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "ai",
      content: "Hello! I am your Green Quant AI Copilot. I analyze your store's live data to give you actionable insights. What can I help you with today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeAiMessage = [...messages].reverse().find((m) => m.role === "ai" && m.metadata);
  const metadata = activeAiMessage?.metadata;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = async (e?: React.FormEvent, presetQuestion?: string) => {
    e?.preventDefault();
    const questionText = presetQuestion || input.trim();
    if (!questionText || isLoading) return;

    setInput("");
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: questionText };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await askCopilot(questionText);
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: res.answer,
        metadata: res,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "ai",
          content: "Sorry, I encountered an error while analyzing your data.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderFormattedAnswer = (text: string, confidence?: number) => {
    const sections = text.split(/(WHAT I SEE:|WHY IT MATTERS:|WHAT TO DO:)/i).filter(Boolean);

    if (sections.length <= 1) {
      return <div className="text-sm whitespace-pre-wrap text-ink">{text}</div>;
    }

    let currentSection = "";
    const parsed: { title: string; content: string }[] = [];

    for (const part of sections) {
      const p = part.trim().toUpperCase();
      if (p === "WHAT I SEE:" || p === "WHY IT MATTERS:" || p === "WHAT TO DO:") {
        currentSection = part.replace(":", "");
      } else {
        if (currentSection) {
          parsed.push({ title: currentSection, content: part.trim() });
        }
      }
    }

    return (
      <div className="space-y-3">
        {parsed.map((sec, i) => (
          <div key={i}>
            {sec.title && <div className="text-[11px] font-bold text-brand uppercase tracking-wider mb-0.5">{sec.title}</div>}
            <div className="text-sm text-dim whitespace-pre-wrap leading-relaxed">{sec.content}</div>
          </div>
        ))}
        {confidence !== undefined && (
          <Badge tone="success" className="mt-2 inline-flex items-center gap-1.5">
            <ShieldAlert className="w-3 h-3" /> DATA CONFIDENCE: {confidence}%
          </Badge>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Header Navigation Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/intelligence"
            className="p-2 rounded-lg bg-surface border border-line text-muted hover:text-ink transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-ink flex items-center gap-2">
              <Bot className="w-5 h-5 text-brand" /> AI Store Copilot
            </h1>
            <p className="mt-0.5 text-sm text-muted">Ask natural language business questions backed by pure database context</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 bg-surface p-1 rounded-lg border border-line self-start md:self-auto text-xs font-semibold">
          <Link href="/dashboard/intelligence" className="px-3 py-1.5 rounded-md text-muted hover:text-ink hover:bg-subtle transition-colors">
            Overview
          </Link>
          <Link href="/dashboard/intelligence/copilot" className="px-3 py-1.5 rounded-md bg-brand text-white shadow-sm flex items-center gap-1.5">
            <Bot className="w-3.5 h-3.5 text-white" /> AI Copilot
          </Link>
          <Link href="/dashboard/intelligence/heatmap" className="px-3 py-1.5 rounded-md text-muted hover:text-ink hover:bg-subtle flex items-center gap-1.5 transition-colors">
            <Clock className="w-3.5 h-3.5 text-warning" /> 24H Heatmap
          </Link>
        </div>
      </div>

      {/* Main Container */}
      <div className="h-[calc(100vh-13rem)] flex flex-col md:flex-row gap-6">
        {/* LEFT PANEL: Chat (65%) */}
        <div className="flex-1 flex flex-col bg-surface border border-line shadow-card overflow-hidden rounded-lg relative">
          {/* Chat Header */}
          <div className="p-3 border-b border-line bg-subtle/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-brand" />
              <h2 className="text-xs font-semibold text-ink">Live Q&A Session</h2>
            </div>
            <div className="text-[11px] text-muted flex items-center gap-1.5 font-medium">
              <div className="w-2 h-2 rounded-full bg-brand animate-pulse" />
              Anti-Hallucination Guard Active
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m) => (
              <div key={m.id} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                <div
                  className={`
                    max-w-[85%] rounded-xl p-3.5 text-sm
                    ${m.role === "user"
                      ? "bg-brand text-white font-medium rounded-tr-none shadow-sm"
                      : "bg-subtle border border-line text-ink rounded-tl-none"}
                  `}
                >
                  {m.role === "ai" ? renderFormattedAnswer(m.content, m.metadata?.confidence) : m.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start">
                <div className="max-w-[85%] rounded-xl rounded-tl-none p-3.5 bg-subtle border border-line text-dim flex items-center gap-3">
                  <Loader2 className="w-4 h-4 text-brand animate-spin" />
                  <span className="text-sm font-medium">Analyzing database context & running math engine...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-subtle/50 border-t border-line space-y-3">
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <Button
                  key={q}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSubmit(undefined, q)}
                  disabled={isLoading}
                  className="text-xs h-8 px-3"
                >
                  {q}
                </Button>
              ))}
            </div>
            <form onSubmit={handleSubmit} className="relative">
              <Input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                placeholder="Ask a question about sales, inventory, or product velocity..."
                className="w-full h-10 pr-12"
              />
              <Button
                type="submit"
                disabled={!input.trim() || isLoading}
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                aria-label="Send"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>

        {/* RIGHT PANEL: Evidence Inspector (35%) */}
        <div className="w-full md:w-[360px] bg-surface border border-line shadow-card rounded-lg p-4 flex flex-col space-y-4">
          <div className="flex items-center gap-2 border-b border-line pb-3">
            <Database className="w-4 h-4 text-brand" />
            <h3 className="text-xs font-semibold text-ink">Evidence Inspector</h3>
          </div>

          {!metadata ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-muted space-y-2">
              <Cpu className="w-8 h-8 text-faint" />
              <p className="text-xs font-medium">Ask any question to inspect the underlying database evidence parameters used by the AI model.</p>
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              <Card className="p-3">
                <div className="text-[10px] font-bold text-muted uppercase tracking-wider">Model Executed</div>
                <div className="font-mono text-ink font-semibold">{metadata.model_used || "Gemini Pro"}</div>
              </Card>

              <Card className="p-3">
                <div className="text-[10px] font-bold text-muted uppercase tracking-wider">Data Quality Tier</div>
                <div className="font-semibold text-brand flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {metadata.data_quality}
                </div>
              </Card>

              <Card className="p-3">
                <div className="text-[10px] font-bold text-muted uppercase tracking-wider">Evidence Sources</div>
                <div className="space-y-1 mt-2">
                  {metadata.evidence_used?.map((e, idx) => (
                    <div key={idx} className="bg-surface px-2.5 py-1.5 rounded border border-line text-[11px] font-mono text-dim">
                      {e}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}