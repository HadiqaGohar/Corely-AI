"use client";

import { useState, useRef, useEffect } from "react";
import AppLayout from "@/components/AppLayout";

const mockSessions = [
  { id: 1, title: "Project Planning", pinned: true },
  { id: 2, title: "API Design Discussion", pinned: false },
  { id: 3, title: "Bug Fix Help", pinned: false },
  { id: 4, title: "Code Review Notes", pinned: false },
];

const mockMessages = [
  { id: 1, role: "user", content: "How do I set up authentication in Next.js?" },
  { id: 2, role: "assistant", content: "You can use NextAuth.js or implement JWT-based auth. Here's a step-by-step guide...\n\n1. Install dependencies\n2. Create API routes\n3. Set up middleware\n4. Configure providers" },
  { id: 3, role: "user", content: "Show me the middleware example" },
  { id: 4, role: "assistant", content: "```js\nimport { NextResponse } from 'next/server';\n\nexport function middleware(request) {\n  const token = request.cookies.get('token');\n  if (!token) return NextResponse.redirect('/login');\n  return NextResponse.next();\n}\n```" },
];

export default function ChatPage() {
  const [sessions] = useState(mockSessions);
  const [activeSession, setActiveSession] = useState(1);
  const [messages, setMessages] = useState(mockMessages);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [model, setModel] = useState("auto");
  const [search, setSearch] = useState("");
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamText]);

  const sendMessage = () => {
    if (!input.trim() || streaming) return;
    const content = input.trim();
    setInput("");
    setMessages(prev => [...prev, { id: Date.now(), role: "user", content }]);

    setStreaming(true);
    setStreamText("");
    const response = "This is a simulated response. Connect to the backend API at localhost:8000 for real AI responses. The multi-provider fallback system supports Gemini → OpenRouter → Ollama.";
    let i = 0;
    const interval = setInterval(() => {
      if (i < response.length) {
        setStreamText(response.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
        setMessages(prev => [...prev, { id: Date.now() + 1, role: "assistant", content: response }]);
        setStreamText("");
        setStreaming(false);
      }
    }, 20);
  };

  const filtered = sessions.filter(s => !search || s.title.toLowerCase().includes(search.toLowerCase()));
  const pinned = filtered.filter(s => s.pinned);
  const others = filtered.filter(s => !s.pinned);

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-64px)] -m-4 lg:-m-6">
        {/* Sessions sidebar */}
        <div className={`${showSidebar ? "w-72" : "w-0"} shrink-0 border-r border-[var(--border)] bg-white flex flex-col transition-all overflow-hidden`}>
          <div className="p-3 border-b border-[var(--border)]">
            <button className="btn-primary w-full rounded-xl py-2.5 text-sm font-medium">+ New Chat</button>
            <input type="text" placeholder="Search chats..." value={search} onChange={e => setSearch(e.target.value)}
              className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]" />
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {pinned.length > 0 && (
              <div className="mb-2">
                <p className="px-2 py-1 text-[10px] font-semibold uppercase text-[var(--text-dim)]">Pinned</p>
                {pinned.map(s => (
                  <button key={s.id} onClick={() => setActiveSession(s.id)}
                    className={`w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition ${s.id === activeSession ? "bg-[#6d5cff]/8 text-[var(--accent)]" : "hover:bg-[var(--bg-card-hover)]"}`}>
                    📌 <span className="flex-1 truncate">{s.title}</span>
                  </button>
                ))}
              </div>
            )}
            {others.map(s => (
              <button key={s.id} onClick={() => setActiveSession(s.id)}
                className={`w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition ${s.id === activeSession ? "bg-[#6d5cff]/8 text-[var(--accent)]" : "hover:bg-[var(--bg-card-hover)]"}`}>
                <span className="flex-1 truncate">{s.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center gap-2 border-b border-[var(--border)] bg-white px-4 py-3">
            <button onClick={() => setShowSidebar(!showSidebar)} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[var(--bg-card-hover)]">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
            <div className="flex-1" />
            <select value={model} onChange={e => setModel(e.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-xs outline-none">
              <option value="auto">Auto</option>
              <option value="fast">Fast</option>
              <option value="smart">Smart</option>
              <option value="free">Free</option>
              <option value="ollama">Ollama</option>
            </select>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
            {messages.map(m => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${m.role === "user" ? "bg-[var(--accent)] text-white" : "glass"}`}>
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              </div>
            ))}
            {streaming && streamText && (
              <div className="flex justify-start">
                <div className="glass max-w-[80%] rounded-2xl px-4 py-3 text-sm">
                  <div className="whitespace-pre-wrap">{streamText}</div>
                </div>
              </div>
            )}
            {streaming && !streamText && (
              <div className="flex justify-start">
                <div className="glass rounded-2xl px-4 py-3 text-sm flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--text-dim)]" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--text-dim)]" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--text-dim)]" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-[var(--border)] bg-white px-4 py-3">
            <div className="flex items-end gap-2">
              <textarea value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Type a message..." rows={1}
                className="flex-1 resize-none rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)] max-h-32" style={{ minHeight: "44px" }} />
              <button onClick={sendMessage} disabled={!input.trim() || streaming}
                className="btn-primary h-11 w-11 shrink-0 rounded-xl flex items-center justify-center disabled:opacity-50">
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
