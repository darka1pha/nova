"use client";

import { useChat } from "@ai-sdk/react";
import React from "react";

export function ChatComponent() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat();

  return (
    <div className="flex flex-col h-[600px] w-full max-w-2xl mx-auto border rounded-xl shadow-sm bg-background">
      <div className="p-4 border-b bg-muted/40 font-medium text-sm flex items-center justify-between">
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Nova AI Assistant
        </span>
        <span className="text-xs text-muted-foreground">Streaming enabled</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-6">
            <p className="text-sm font-medium">No messages yet.</p>
            <p className="text-xs mt-1">Ask a question to start generating real-time streaming responses.</p>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground border shadow-sm"
              }`}
            >
              <div className="text-[10px] opacity-70 mb-1 font-semibold uppercase tracking-wider">
                {m.role === "user" ? "You" : "AI"}
              </div>
              <div className="whitespace-pre-wrap">{m.content}</div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted text-foreground border rounded-lg px-4 py-2 text-sm animate-pulse">
              Generating response...
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-lg text-xs">
            Error: {error.message}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t bg-muted/20 flex gap-2">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask anything..."
          className="flex-1 px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg disabled:opacity-50 transition-opacity hover:opacity-90"
        >
          Send
        </button>
      </form>
    </div>
  );
}
