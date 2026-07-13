"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { chat as chatApi, ChatSession, ChatMessage } from "@/lib/api";
import AppLayout from "@/components/AppLayout";

export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [model, setModel] = useState("auto");
  const [search, setSearch] = useState("");
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load sessions
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const data = await chatApi.listSessions();
      setSessions(data);
    } catch {}
  };

  // Load messages when session changes
  useEffect(() => {
    if (!activeSession) { setMessages([]); return; }
    (async () => {
      try {
        const data = await chatApi.getMessages(activeSession);
        setMessages(data);
      } catch {}
    })();
  }, [activeSession]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamText]);

  const createSession = async () => {
    try {
      const session = await chatApi.createSession("New Chat");
      setSessions(prev => [session, ...prev]);
      setActiveSession(session.id);
    } catch {}
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeSession || streaming) return;
    const content = input.trim();
    setInput("");

    // Optimistic add
    const userMsg: ChatMessage = {
      id: Date.now(), session_id: activeSession, role: "user",
      content, created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);

    // Try streaming
    try {
      setStreaming(true);
      setStreamText("");
      let full = "";
      for await (const chunk of chatApi.sendMessageStream(activeSession, content, model)) {
        if (chunk.content) {
          full += chunk.content;
          setStreamText(full);
        }
      }
      if (full) {
        setMessages(prev => [...prev, {
          id: Date.now() + 1, session_id: activeSession, role: "assistant",
          content: full, created_at: new Date().toISOString(),
        }]);
      }
      setStreamText("");
    } catch {
      // Fallback to non-streaming
      try {
        const reply = await chatApi.sendMessage(activeSession, content, model);
        setMessages(prev => [...prev, reply]);
      } catch {}
    } finally {
      setStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const filteredSessions = sessions.filter(s =>
    !search || s.title.toLowerCase().includes(search.toLowerCase())
  );

  const pinnedSessions = filteredSessions.filter(s => s.pinned);
  const otherSessions = filteredSessions.filter(s => !s.pinned);

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-64px)] -m-4 lg:-m-6">
        {/* Sessions sidebar */}
        <div className={`${showSidebar ? "w-72" : "w-0"} shrink-0 border-r border-[var(--border)] bg-white flex flex-col transition-all overflow-hidden`}>
          <div className="p-3 border-b border-[var(--border)]">
            <button onClick={createSession} className="btn-primary w-full rounded-xl py-2.5 text-sm font-medium">
              + New Chat
            </button>
            <input
              type="text" placeholder="Search chats..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {pinnedSessions.length > 0 && (
              <div className="mb-2">
                <p className="px-2 py-1 text-[10px] font-semibold uppercase text-[var(--text-dim)]">Pinned</p>
                {pinnedSessions.map(s => (
                  <SessionItem key={s.id} session={s} active={s.id === activeSession} onClick={() => setActiveSession(s.id)} />
                ))}
              </div>
            )}
            {otherSessions.map(s => (
              <SessionItem key={s.id} session={s} active={s.id === activeSession} onClick={() => setActiveSession(s.id)} />
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat header */}
          <div className="flex items-center gap-2 border-b border-[var(--border)] bg-white px-4 py-3">
            <button onClick={() => setShowSidebar(!showSidebar)} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[var(--bg-card-hover)]">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
            <div className="flex-1" />
            <select value={model} onChange={(e) => setModel(e.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-xs outline-none">
              <option value="auto">Auto</option>
              <option value="fast">Fast</option>
              <option value="smart">Smart</option>
              <option value="free">Free</option>
              <option value="ollama">Ollama</option>
            </select>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
            {!activeSession ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <div className="mb-4 text-5xl">💬</div>
                  <h2 className="text-lg font-semibold">Start a new conversation</h2>
                  <p className="mt-1 text-sm text-[var(--text-dim)]">Create a new chat or select one from the sidebar</p>
                </div>
              </div>
            ) : messages.length === 0 && !streaming ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <div className="mb-4 text-5xl">✨</div>
                  <h2 className="text-lg font-semibold">How can I help?</h2>
                  <p className="mt-1 text-sm text-[var(--text-dim)]">Ask me anything</p>
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                    m.role === "user"
                      ? "bg-[var(--accent)] text-white"
                      : "glass"
                  }`}>
                    <div className="prose prose-sm max-w-none whitespace-pre-wrap">{m.content}</div>
                  </div>
                </div>
              ))
            )}
            {streaming && streamText && (
              <div className="flex justify-start">
                <div className="glass max-w-[80%] rounded-2xl px-4 py-3 text-sm">
                  <div className="prose prose-sm max-w-none whitespace-pre-wrap">{streamText}</div>
                </div>
              </div>
            )}
            {streaming && !streamText && (
              <div className="flex justify-start">
                <div className="glass rounded-2xl px-4 py-3 text-sm">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--text-dim)]" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--text-dim)]" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--text-dim)]" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-[var(--border)] bg-white px-4 py-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                rows={1}
                className="flex-1 resize-none rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)] max-h-32"
                style={{ minHeight: "44px" }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || streaming}
                className="btn-primary h-11 w-11 shrink-0 rounded-xl flex items-center justify-center disabled:opacity-50"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function SessionItem({ session, active, onClick }: { session: ChatSession; active: boolean; onClick: () => void }) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl px-3 py-2.5 cursor-pointer transition-all ${
        active ? "bg-[#6d5cff]/8 text-[var(--accent)]" : "hover:bg-[var(--bg-card-hover)]"
      }`}
    >
      {session.pinned && <span className="text-xs">📌</span>}
      <span className="flex-1 truncate text-sm">{session.title}</span>
      <button
        onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
        className="h-6 w-6 shrink-0 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 hover:bg-[var(--border)]"
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
        </svg>
      </button>
    </div>
  );
}
