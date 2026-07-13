"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import AppLayout from "@/components/AppLayout";

// ─── Types ───────────────────────────────────────────────────────────
interface Session {
  id: number;
  title: string;
  pinned: boolean;
}

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  attachments?: string[];
}

interface AttachedFile {
  name: string;
  preview: string;
}

// ─── Mock Data ───────────────────────────────────────────────────────
const initialSessions: Session[] = [
  { id: 1, title: "Project Planning", pinned: true },
  { id: 2, title: "API Design Discussion", pinned: false },
  { id: 3, title: "Bug Fix Help", pinned: false },
  { id: 4, title: "Code Review Notes", pinned: false },
];

const initialMessages: Record<number, Message[]> = {
  1: [
    { id: 1, role: "user", content: "How do I set up authentication in Next.js?" },
    {
      id: 2,
      role: "assistant",
      content:
        "You can use NextAuth.js or implement JWT-based auth. Here's a step-by-step guide...\n\n1. Install dependencies\n2. Create API routes\n3. Set up middleware\n4. Configure providers",
    },
    { id: 3, role: "user", content: "Show me the middleware example" },
    {
      id: 4,
      role: "assistant",
      content:
        "```js\nimport { NextResponse } from 'next/server';\n\nexport function middleware(request) {\n  const token = request.cookies.get('token');\n  if (!token) return NextResponse.redirect('/login');\n  return NextResponse.next();\n}\n```",
    },
  ],
  2: [
    { id: 10, role: "user", content: "What's the best REST API structure?" },
    { id: 11, role: "assistant", content: "Use resource-based URLs like `/api/v1/users`. Group by domain, not by HTTP method." },
  ],
  3: [
    { id: 20, role: "user", content: "My app crashes on startup" },
    { id: 21, role: "assistant", content: "Check your `next.config.js` for syntax errors and make sure all environment variables are set." },
  ],
  4: [
    { id: 30, role: "user", content: "Can you review my component?" },
    { id: 31, role: "assistant", content: "Sure! Paste your code and I'll review it for performance, readability, and best practices." },
  ],
};

// ─── Markdown Renderer (no external deps) ────────────────────────────
function renderMarkdown(text: string): string {
  let html = text;

  // Code blocks (```...```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang: string, code: string) => {
    const escaped = code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return `<pre class="bg-black/5 dark:bg-white/10 rounded-lg p-3 my-2 overflow-x-auto text-xs"><code class="lang-${lang}">${escaped}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-black/5 dark:bg-white/10 rounded px-1.5 py-0.5 text-xs">$1</code>');

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-base font-bold mt-3 mb-1">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold mt-4 mb-1">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-4 mb-2">$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Unordered lists
  html = html.replace(/^[\-\*] (.+)$/gm, '<li class="ml-4 list-disc">$1</li>');
  html = html.replace(/(<li[^>]*>.*<\/li>\n?)+/g, (match) => `<ul class="my-1">${match}</ul>`);

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>');
  // Only wrap consecutive <li> that aren't already in a <ul>
  html = html.replace(/(?<!<\/ul>)(<li class="ml-4 list-decimal">[^<]*(?:<\/li>\n?<li class="ml-4 list-decimal">[^<]*)*)<\/li>/g, (match) => {
    if (match.includes("</ul>")) return match;
    return `<ol class="my-1">${match}</ol>`;
  });

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-[var(--accent)] underline" target="_blank" rel="noopener noreferrer">$1</a>');

  // Line breaks (preserve double newlines as paragraphs)
  html = html.replace(/\n\n/g, '</p><p class="mt-2">');
  html = html.replace(/\n/g, '<br/>');

  return `<p>${html}</p>`;
}

// ─── Component ───────────────────────────────────────────────────────
export default function ChatPage() {
  // Sessions
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [activeSession, setActiveSession] = useState(1);

  // Messages per session
  const [allMessages, setAllMessages] = useState<Record<number, Message[]>>(initialMessages);
  const messages = allMessages[activeSession] ?? [];

  // Input
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");

  // Model & search
  const [model, setModel] = useState("auto");
  const [search, setSearch] = useState("");

  // Sidebar
  const [showSidebar, setShowSidebar] = useState(true);

  // File attachments
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);

  // Voice input
  const [voiceActive, setVoiceActive] = useState(false);
  const recognitionRef = useRef<InstanceType<SpeechRecognitionConstructor> | null>(null);

  // Message actions
  const [hoveredMsg, setHoveredMsg] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [editingMsg, setEditingMsg] = useState<number | null>(null);
  const [editText, setEditText] = useState("");

  // Chat rename
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameText, setRenameText] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Export menu
  const [showExportMenu, setShowExportMenu] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamText]);

  // Focus rename input when it appears
  useEffect(() => {
    if (renamingId !== null) {
      setTimeout(() => renameInputRef.current?.focus(), 50);
    }
  }, [renamingId]);

  // ─── Send Message ────────────────────────────────────────────────
  const sendMessage = useCallback(() => {
    if (!input.trim() || streaming) return;
    const content = input.trim();
    const attachmentNames = attachedFiles.map((f) => f.name);
    setInput("");
    setAttachedFiles([]);

    const userMsg: Message = {
      id: Date.now(),
      role: "user",
      content,
      attachments: attachmentNames.length > 0 ? attachmentNames : undefined,
    };

    setAllMessages((prev) => ({
      ...prev,
      [activeSession]: [...(prev[activeSession] ?? []), userMsg],
    }));

    setStreaming(true);
    setStreamText("");
    const response =
      "This is a simulated response. Connect to the backend API at localhost:8000 for real AI responses. The multi-provider fallback system supports Gemini → OpenRouter → Ollama.";
    let i = 0;
    const interval = setInterval(() => {
      if (i < response.length) {
        setStreamText(response.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
        const assistantMsg: Message = {
          id: Date.now() + 1,
          role: "assistant",
          content: response,
        };
        setAllMessages((prev) => ({
          ...prev,
          [activeSession]: [...(prev[activeSession] ?? []), assistantMsg],
        }));
        setStreamText("");
        setStreaming(false);
      }
    }, 20);
  }, [input, streaming, attachedFiles, activeSession]);

  // ─── File Attachments ────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const allowed = [".pdf", ".docx", ".txt", ".csv", ".md"];
    const newFiles: AttachedFile[] = [];

    Array.from(files).forEach((file) => {
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      if (!allowed.includes(ext)) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = (ev.target?.result as string) ?? "";
        const preview = text.slice(0, 5000);
        setAttachedFiles((prev) => [...prev, { name: file.name, preview }]);
      };
      reader.readAsText(file);
    });

    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (idx: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  // ─── Voice Input ─────────────────────────────────────────────────
  const toggleVoice = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (voiceActive) {
      recognitionRef.current?.stop();
      setVoiceActive(false);
      return;
    }

    const win = window as unknown as Record<string, SpeechRecognitionConstructor | undefined>;
    const SpeechRecognitionCtor = win.SpeechRecognition ?? win.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent | Event) => {
      const e = event as SpeechRecognitionEvent;
      let transcript = "";
      for (let i = 0; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      setInput(transcript);
    };

    recognition.onerror = () => {
      setVoiceActive(false);
    };

    recognition.onend = () => {
      setVoiceActive(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setVoiceActive(true);
  };

  // ─── Message Actions ─────────────────────────────────────────────
  const copyMessage = (content: string, msgId: number) => {
    navigator.clipboard.writeText(content);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const startEdit = (msg: Message) => {
    setEditingMsg(msg.id);
    setEditText(msg.content);
  };

  const saveEdit = (msgId: number) => {
    if (!editText.trim()) return;
    setAllMessages((prev) => ({
      ...prev,
      [activeSession]: (prev[activeSession] ?? []).map((m) =>
        m.id === msgId ? { ...m, content: editText.trim() } : m
      ),
    }));
    setEditingMsg(null);
    setEditText("");
  };

  const regenerate = (msgId: number) => {
    // Find the assistant message and remove it + everything after
    setAllMessages((prev) => {
      const msgs = prev[activeSession] ?? [];
      const idx = msgs.findIndex((m) => m.id === msgId);
      if (idx === -1) return prev;
      return {
        ...prev,
        [activeSession]: msgs.slice(0, idx),
      };
    });
    // Trigger a new simulated response
    setStreaming(true);
    setStreamText("");
    const response = "Regenerated response: Here is an updated answer based on the conversation context.";
    let i = 0;
    const interval = setInterval(() => {
      if (i < response.length) {
        setStreamText(response.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
        setAllMessages((prev) => ({
          ...prev,
          [activeSession]: [
            ...(prev[activeSession] ?? []),
            { id: Date.now(), role: "assistant", content: response },
          ],
        }));
        setStreamText("");
        setStreaming(false);
      }
    }, 20);
  };

  const exportMessage = (msg: Message) => {
    const text = `[${msg.role.toUpperCase()}]\n${msg.content}`;
    navigator.clipboard.writeText(text);
    setCopiedId(msg.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // ─── Chat Export ─────────────────────────────────────────────────
  const exportChat = (format: "text" | "json") => {
    const session = sessions.find((s) => s.id === activeSession);
    const msgs = allMessages[activeSession] ?? [];

    if (format === "text") {
      const text = `Chat: ${session?.title ?? "Untitled"}\n${"=".repeat(40)}\n\n${msgs.map((m) => `[${m.role.toUpperCase()}]\n${m.content}\n`).join("\n")}`;
      const blob = new Blob([text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${session?.title ?? "chat"}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const json = JSON.stringify({ session: session?.title, messages: msgs }, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${session?.title ?? "chat"}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setShowExportMenu(false);
  };

  // ─── Chat Rename ─────────────────────────────────────────────────
  const startRename = (session: Session) => {
    setRenamingId(session.id);
    setRenameText(session.title);
  };

  const saveRename = (sessionId: number) => {
    if (!renameText.trim()) {
      setRenamingId(null);
      return;
    }
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, title: renameText.trim() } : s))
    );
    setRenamingId(null);
    setRenameText("");
  };

  // ─── Delete Session ──────────────────────────────────────────────
  const confirmDelete = (sessionId: number) => {
    setConfirmDeleteId(sessionId);
  };

  const deleteSession = (sessionId: number) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    setAllMessages((prev) => {
      const copy = { ...prev };
      delete copy[sessionId];
      return copy;
    });
    if (activeSession === sessionId) {
      setActiveSession(sessions.find((s) => s.id !== sessionId)?.id ?? 1);
    }
    setConfirmDeleteId(null);
  };

  // ─── New Chat ────────────────────────────────────────────────────
  const newChat = () => {
    const id = Date.now();
    setSessions((prev) => [{ id, title: "New Chat", pinned: false }, ...prev]);
    setAllMessages((prev) => ({ ...prev, [id]: [] }));
    setActiveSession(id);
  };

  // ─── Filtered sessions ──────────────────────────────────────────
  const filtered = sessions.filter(
    (s) => !search || s.title.toLowerCase().includes(search.toLowerCase())
  );
  const pinned = filtered.filter((s) => s.pinned);
  const others = filtered.filter((s) => !s.pinned);

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-64px)] -m-4 lg:-m-6">
        {/* Sessions sidebar */}
        <div
          className={`${
            showSidebar ? "w-72" : "w-0"
          } shrink-0 border-r border-[var(--border)] bg-white flex flex-col transition-all overflow-hidden`}
        >
          <div className="p-3 border-b border-[var(--border)]">
            <button
              onClick={newChat}
              className="btn-primary w-full rounded-xl py-2.5 text-sm font-medium"
            >
              + New Chat
            </button>
            <input
              type="text"
              placeholder="Search chats..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {pinned.length > 0 && (
              <div className="mb-2">
                <p className="px-2 py-1 text-[10px] font-semibold uppercase text-[var(--text-dim)]">
                  Pinned
                </p>
                {pinned.map((s) => (
                  <div key={s.id} className="relative group">
                    {confirmDeleteId === s.id ? (
                      <div className="flex items-center gap-1 rounded-xl bg-red-50 px-3 py-2.5 text-sm">
                        <span className="flex-1 text-red-600 truncate">Delete?</span>
                        <button
                          onClick={() => deleteSession(s.id)}
                          className="text-xs font-medium text-red-600 hover:text-red-800"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-xs font-medium text-gray-500 hover:text-gray-700"
                        >
                          No
                        </button>
                      </div>
                    ) : renamingId === s.id ? (
                      <input
                        ref={renameInputRef}
                        value={renameText}
                        onChange={(e) => setRenameText(e.target.value)}
                        onBlur={() => saveRename(s.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveRename(s.id);
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                        className="w-full rounded-xl border border-[var(--accent)] bg-white px-3 py-2.5 text-sm outline-none"
                      />
                    ) : (
                      <button
                        onClick={() => setActiveSession(s.id)}
                        onDoubleClick={() => startRename(s)}
                        className={`w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                          s.id === activeSession
                            ? "bg-[#6d5cff]/8 text-[var(--accent)]"
                            : "hover:bg-[var(--bg-card-hover)]"
                        }`}
                      >
                        📌{" "}
                        <span className="flex-1 truncate">{s.title}</span>
                      </button>
                    )}
                    {!confirmDeleteId && !renamingId && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmDelete(s.id);
                        }}
                        className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex h-6 w-6 items-center justify-center rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500"
                        title="Delete session"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {others.map((s) => (
              <div key={s.id} className="relative group">
                {confirmDeleteId === s.id ? (
                  <div className="flex items-center gap-1 rounded-xl bg-red-50 px-3 py-2.5 text-sm">
                    <span className="flex-1 text-red-600 truncate">Delete?</span>
                    <button
                      onClick={() => deleteSession(s.id)}
                      className="text-xs font-medium text-red-600 hover:text-red-800"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-xs font-medium text-gray-500 hover:text-gray-700"
                    >
                      No
                    </button>
                  </div>
                ) : renamingId === s.id ? (
                  <input
                    ref={renameInputRef}
                    value={renameText}
                    onChange={(e) => setRenameText(e.target.value)}
                    onBlur={() => saveRename(s.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveRename(s.id);
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    className="w-full rounded-xl border border-[var(--accent)] bg-white px-3 py-2.5 text-sm outline-none"
                  />
                ) : (
                  <button
                    onClick={() => setActiveSession(s.id)}
                    onDoubleClick={() => startRename(s)}
                    className={`w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                      s.id === activeSession
                        ? "bg-[#6d5cff]/8 text-[var(--accent)]"
                        : "hover:bg-[var(--bg-card-hover)]"
                    }`}
                  >
                    <span className="flex-1 truncate">{s.title}</span>
                  </button>
                )}
                {!confirmDeleteId && !renamingId && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmDelete(s.id);
                    }}
                    className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex h-6 w-6 items-center justify-center rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500"
                    title="Delete session"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-[var(--border)] bg-white px-4 py-3">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[var(--bg-card-hover)]"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
            </button>

            {/* Session title */}
            <span className="text-sm font-medium truncate">
              {sessions.find((s) => s.id === activeSession)?.title ?? "Chat"}
            </span>

            <div className="flex-1" />

            {/* Model selector */}
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-xs outline-none"
            >
              <option value="auto">Auto</option>
              <option value="fast">Fast</option>
              <option value="smart">Smart</option>
              <option value="free">Free</option>
              <option value="ollama">Ollama</option>
            </select>

            {/* Export button */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[var(--bg-card-hover)]"
                title="Export chat"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              </button>
              {showExportMenu && (
                <div className="absolute right-0 top-full mt-1 w-40 rounded-xl border border-[var(--border)] bg-white shadow-lg z-50 py-1">
                  <button
                    onClick={() => exportChat("text")}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--bg-card-hover)]"
                  >
                    Export as Text
                  </button>
                  <button
                    onClick={() => exportChat("json")}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--bg-card-hover)]"
                  >
                    Export as JSON
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
            onClick={() => {
              setShowExportMenu(false);
              if (hoveredMsg) setHoveredMsg(null);
            }}
          >
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                onMouseEnter={() => setHoveredMsg(m.id)}
                onMouseLeave={() => setHoveredMsg(null)}
              >
                <div className="relative max-w-[80%] group">
                  {/* Message bubble */}
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm ${
                      m.role === "user"
                        ? "bg-[var(--accent)] text-white"
                        : "glass"
                    }`}
                  >
                    {editingMsg === m.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          rows={3}
                          className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-black outline-none resize-none"
                          autoFocus
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setEditingMsg(null)}
                            className="rounded-lg px-3 py-1 text-xs text-gray-500 hover:bg-gray-100"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => saveEdit(m.id)}
                            className="rounded-lg px-3 py-1 text-xs bg-[var(--accent)] text-white hover:opacity-90"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : m.role === "assistant" ? (
                      <div
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }}
                      />
                    ) : (
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    )}

                    {/* Attachments */}
                    {m.attachments && m.attachments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {m.attachments.map((name, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-xs"
                          >
                            📎 {name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Hover actions */}
                  {hoveredMsg === m.id && editingMsg !== m.id && (
                    <div
                      className={`absolute top-0 ${
                        m.role === "user" ? "-left-20" : "-right-20"
                      } flex items-center gap-0.5 rounded-lg border border-[var(--border)] bg-white px-1 py-0.5 shadow-sm`}
                    >
                      {/* Copy */}
                      <button
                        onClick={() => copyMessage(m.content, m.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-[var(--bg-card-hover)]"
                        title="Copy"
                      >
                        {copiedId === m.id ? (
                          <svg className="h-3.5 w-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        ) : (
                          <svg className="h-3.5 w-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                          </svg>
                        )}
                      </button>

                      {/* Edit (user msgs only) */}
                      {m.role === "user" && (
                        <button
                          onClick={() => startEdit(m)}
                          className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-[var(--bg-card-hover)]"
                          title="Edit"
                        >
                          <svg className="h-3.5 w-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                          </svg>
                        </button>
                      )}

                      {/* Regenerate (assistant msgs only) */}
                      {m.role === "assistant" && (
                        <button
                          onClick={() => regenerate(m.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-[var(--bg-card-hover)]"
                          title="Regenerate"
                        >
                          <svg className="h-3.5 w-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                          </svg>
                        </button>
                      )}

                      {/* Export */}
                      <button
                        onClick={() => exportMessage(m)}
                        className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-[var(--bg-card-hover)]"
                        title="Copy to clipboard"
                      >
                        <svg className="h-3.5 w-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Streaming response */}
            {streaming && streamText && (
              <div className="flex justify-start">
                <div className="glass max-w-[80%] rounded-2xl px-4 py-3 text-sm">
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(streamText) }}
                  />
                </div>
              </div>
            )}

            {/* Loading dots */}
            {streaming && !streamText && (
              <div className="flex justify-start">
                <div className="glass rounded-2xl px-4 py-3 text-sm flex gap-1">
                  <span
                    className="h-2 w-2 animate-bounce rounded-full bg-[var(--text-dim)]"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="h-2 w-2 animate-bounce rounded-full bg-[var(--text-dim)]"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="h-2 w-2 animate-bounce rounded-full bg-[var(--text-dim)]"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-[var(--border)] bg-white px-4 py-3">
            {/* Attached files display */}
            {attachedFiles.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {attachedFiles.map((f, i) => (
                  <div
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[var(--bg)] border border-[var(--border)] px-3 py-1 text-xs"
                  >
                    📎 <span className="truncate max-w-[120px]">{f.name}</span>
                    <button
                      onClick={() => removeAttachment(i)}
                      className="ml-0.5 text-gray-400 hover:text-red-500"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-end gap-2">
              {/* File attach button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] hover:bg-[var(--bg-card-hover)] transition"
                title="Attach file (PDF, DOCX, TXT, CSV, MD)"
              >
                <span className="text-lg">📎</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.csv,.md"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Voice input button */}
              <button
                onClick={toggleVoice}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition ${
                  voiceActive
                    ? "border-red-400 bg-red-50 text-red-500"
                    : "border-[var(--border)] hover:bg-[var(--bg-card-hover)]"
                }`}
                title={voiceActive ? "Stop recording" : "Voice input"}
              >
                <span className="relative">
                  🎤
                  {voiceActive && (
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                    </span>
                  )}
                </span>
              </button>

              {/* Text input */}
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Type a message..."
                rows={1}
                className="flex-1 resize-none rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)] max-h-32"
                style={{ minHeight: "44px" }}
              />

              {/* Send button */}
              <button
                onClick={sendMessage}
                disabled={!input.trim() || streaming}
                className="btn-primary h-11 w-11 shrink-0 rounded-xl flex items-center justify-center disabled:opacity-50"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
