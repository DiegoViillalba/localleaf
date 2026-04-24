import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useAppStore } from "../../../store/useAppStore";
import ReactMarkdown from "react-markdown";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export function AiChatPanel() {
  const { 
    aiConfig, 
    content: documentContent,
    aiChatMessages: messages,
    setAiChatMessages: setMessages,
    appendAiChatMessage,
    updateLastAiChatMessage,
    pendingAiPrompt,
    setPendingAiPrompt
  } = useAppStore();
  
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendPrompt = async (text: string) => {
    if (!text.trim() || isTyping) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const updatedMessages = [...messages, userMsg];
    appendAiChatMessage(userMsg);
    setInput("");
    setIsTyping(true);

    // Prepare assistant message placeholder
    appendAiChatMessage({ role: "assistant", content: "" });

    let unlistenToken: () => void;
    let unlistenDone: () => void;

    try {
      unlistenToken = await listen<string>("ai-token", (event) => {
        updateLastAiChatMessage(event.payload);
      });

      unlistenDone = await listen("ai-done", () => {
        setIsTyping(false);
        if (unlistenToken) unlistenToken();
        if (unlistenDone) unlistenDone();
      });

      // Invoke backend
      await invoke("stream_ai_assist", {
        request: {
          config: aiConfig,
          document_context: documentContent,
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
        },
      });
    } catch (err) {
      console.error(err);
      updateLastAiChatMessage(`\n\n❌ Error: ${err}`);
      setIsTyping(false);
      if (unlistenToken!) unlistenToken();
      if (unlistenDone!) unlistenDone();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendPrompt(input);
  };

  useEffect(() => {
    if (pendingAiPrompt && !isTyping) {
      sendPrompt(pendingAiPrompt);
      setPendingAiPrompt(null);
    }
  }, [pendingAiPrompt, isTyping]);

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Header */}
      <div className="shrink-0 border-b border-zinc-800 px-3 py-2.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
          Asistente IA
        </span>
        <button
          onClick={() => setMessages([])}
          title="Limpiar chat"
          className="text-zinc-500 hover:text-zinc-300"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>

      {/* Warning banner if missing API key and using external provider */}
      {!aiConfig.api_key && !aiConfig.provider_url.includes("localhost") && !aiConfig.provider_url.includes("127.0.0.1") && (
        <div className="p-3 bg-amber-900/20 border-b border-amber-900/40">
          <p className="text-xs text-amber-500 text-center">
            Aviso: No has configurado una API Key. Esto solo funcionará si usas un proveedor local como LM Studio.
          </p>
        </div>
      )}

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-2">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
              <path d="M12 12 2.1 7.1" />
              <path d="M12 12l9.9 4.9" />
            </svg>
            <p className="text-xs text-center max-w-[200px]">
              Pregunta lo que sea sobre tu documento o pide ayuda con LaTeX.
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
              <span className="text-[10px] text-zinc-500 mb-1 px-1 uppercase tracking-wider">
                {msg.role === "user" ? "Tú" : "Asistente"}
              </span>
              <div
                className={`max-w-[95%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-emerald-600/20 text-emerald-100 border border-emerald-500/30"
                    : "bg-zinc-800/60 text-zinc-200 border border-zinc-700/50"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="font-sans break-words">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-2 leading-relaxed text-[11px]">{children}</p>,
                        pre: ({ children }) => (
                          <pre className="bg-zinc-950 border border-zinc-800 rounded p-2 my-2 overflow-x-auto text-[10px] text-zinc-300 font-mono">
                            {children}
                          </pre>
                        ),
                        code: ({ className, children, ...props }) => {
                          const match = /language-(\w+)/.exec(className || "");
                          const isInline = !match && !className;
                          return isInline ? (
                            <code className="bg-zinc-800/80 text-emerald-300 px-1 py-0.5 rounded text-[10px] font-mono" {...props}>
                              {children}
                            </code>
                          ) : (
                            <code className="text-zinc-300 font-mono text-[10px]" {...props}>
                              {children}
                            </code>
                          );
                        },
                        ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1 text-[11px]">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1 text-[11px]">{children}</ol>,
                        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                      }}
                    >
                      {msg.content || "..."}
                    </ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 p-3 border-t border-zinc-800 bg-zinc-900/50">
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Pregunta sobre el documento..."
            disabled={isTyping || !aiConfig.provider_url.trim()}
            className="w-full bg-zinc-950 border border-zinc-700 rounded-md p-2 text-sm text-zinc-200 outline-none focus:border-emerald-500 transition-colors resize-none disabled:opacity-50 min-h-[60px]"
          />
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-zinc-600">
              Usa Shift+Enter para nueva línea
            </span>
            <button
              type="submit"
              disabled={isTyping || !input.trim() || !aiConfig.provider_url.trim()}
              className="px-3 py-1 bg-emerald-600 text-white text-xs font-medium rounded hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Enviar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
