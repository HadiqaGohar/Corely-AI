"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import { chat, ChatSession, ChatMessage, ApiError } from "@/lib/api";

// ─── Types ───────────────────────────────────────────────────────────
interface AttachedFile {
  name: string;
  preview: string;
}

// ─── Markdown Renderer ───────────────────────────────────────────────
function renderMarkdown(text: string): string {
  let html = text;
  // Code blocks with language
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang: string, code: string) => {
    const escaped = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const langLabel = lang ? `<span class="absolute top-1 right-2 text-[10px] text-gray-400">${lang}</span>` : "";
    return `<div class="relative my-2"><pre class="bg-black/5 dark:bg-white/10 rounded-lg p-3 overflow-x-auto text-xs"><code class="lang-${lang}">${escaped}</code></pre>${langLabel}</div>`;
  });
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-black/5 dark:bg-white/10 rounded px-1.5 py-0.5 text-xs">$1</code>');
  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-base font-bold mt-3 mb-1">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold mt-4 mb-1">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-4 mb-2">$1</h1>');
  // Bold, italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Lists
  html = html.replace(/^[\-\*] (.+)$/gm, '<li class="ml-4 list-disc">$1</li>');
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>');
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-[var(--accent)] underline" target="_blank">$1</a>');
  // Line breaks
  html = html.replace(/\n\n/g, '</p><p class="mt-2">');
  html = html.replace(/\n/g, '<br/>');
  return `<p>${html}</p>`;
}

// ─── Component ───────────────────────────────────────────────────────
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [voiceActive, setVoiceActive] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [hoveredMsg, setHoveredMsg] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [editingMsg, setEditingMsg] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameText, setRenameText] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ─── Load sessions on mount ─────────────────────────────────────
  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamText]);

  useEffect(() => {
    if (renamingId !== null) setTimeout(() => renameInputRef.current?.focus(), 50);
  }, [renamingId]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const data = await chat.listSessions(search || undefined);
      setSessions(data);
      if (data.length > 0 && activeSession === null) {
        setActiveSession(data[0].id);
        loadMessages(data[0].id);
      }
    } catch (e: any) {
      setError(e.message || "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (sessionId: number) => {
    try {
      const data = await chat.getMessages(sessionId);
      setMessages(data);
    } catch (e: any) {
      setMessages([]);
    }
  };

  // Reload sessions when search changes
  useEffect(() => {
    const timer = setTimeout(() => loadSessions(), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // ─── Send Message (with real streaming) ─────────────────────────
  const sendMessage = useCallback(async () => {
    if (!input.trim() || streaming || !activeSession) return;
    const content = input.trim();
    const attachmentNames = attachedFiles.map((f) => f.name);
    setInput("");
    setAttachedFiles([]);

    // Add user message optimistically
    const userMsg: ChatMessage = {
      id: Date.now(),
      session_id: activeSession,
      role: "user",
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setStreaming(true);
    setStreamText("");

    try {
      // Try streaming first
      let fullContent = "";
      try {
        for await (const chunk of chat.sendMessageStream(activeSession, content, model)) {
          fullContent += chunk.content || "";
          setStreamText(fullContent);
        }
      } catch {
        // Fallback to non-streaming
        const response = await chat.sendMessage(activeSession, content, model);
        fullContent = response.content;
      }

      // Add assistant message
      const assistantMsg: ChatMessage = {
        id: Date.now() + 1,
        session_id: activeSession,
        role: "assistant",
        content: fullContent,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setStreamText("");

      // Reload sessions to get updated title
      loadSessions();
    } catch (e: any) {
      setError(e.message || "Failed to send message");
    } finally {
      setStreaming(false);
    }
  }, [input, streaming, attachedFiles, activeSession, model]);

  // ─── File Attachments ──────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = (ev.target?.result as string) ?? "";
        setAttachedFiles((prev) => [...prev, { name: file.name, preview: text.slice(0, 5000) }]);
      };
      reader.readAsText(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ─── Voice Input ───────────────────────────────────────────────
  const toggleVoice = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("Speech recognition not supported in this browser.");
      return;
    }
    if (voiceActive) {
      recognitionRef.current?.stop();
      setVoiceActive(false);
      return;
    }
    const win = window as any;
    const SpeechRecognitionCtor = win.SpeechRecognition ?? win.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;
    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) transcript += event.results[i][0].transcript;
      setInput(transcript);
    };
    recognition.onerror = () => setVoiceActive(false);
    recognition.onend = () => setVoiceActive(false);
    recognitionRef.current = recognition;
    recognition.start();
    setVoiceActive(true);
  };

  // ─── Message Actions ───────────────────────────────────────────
  const copyMessage = (content: string, msgId: number) => {
    navigator.clipboard.writeText(content);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const startEdit = (msg: ChatMessage) => {
    setEditingMsg(msg.id);
    setEditText(msg.content);
  };

  const saveEdit = async (msgId: number) => {
    if (!editText.trim() || !activeSession) return;
    try {
      await chat.editMessage(activeSession, msgId, editText.trim());
      setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, content: editText.trim() } : m)));
    } catch {}
    setEditingMsg(null);
    setEditText("");
  };

  const regenerate = async (msgId: number) => {
    if (!activeSession) return;
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
    try {
      const response = await chat.regenerateMessage(activeSession, msgId);
      setMessages((prev) => [...prev, response]);
    } catch {}
  };

  const exportMessage = (msg: ChatMessage) => {
    navigator.clipboard.writeText(`[${msg.role.toUpperCase()}]\n${msg.content}`);
    setCopiedId(msg.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // ─── Chat Export ───────────────────────────────────────────────
  const exportChat = async (format: "text" | "json") => {
    if (!activeSession) return;
    try {
      const data = await chat.exportChat(activeSession, format);
      const blob = new Blob([typeof data === "string" ? data : JSON.stringify(data, null, 2)], {
        type: format === "text" ? "text/plain" : "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chat.${format === "text" ? "txt" : "json"}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
    setShowExportMenu(false);
  };

  // ─── Session Actions ──────────────────────────────────────────
  const newChat = async () => {
    try {
      const session = await chat.createSession("New Chat");
      setSessions((prev) => [session, ...prev]);
      setActiveSession(session.id);
      setMessages([]);
    } catch {}
  };

  const saveRename = async (sessionId: number) => {
    if (!renameText.trim()) { setRenamingId(null); return; }
    try {
      await chat.renameSession(sessionId, renameText.trim());
      setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, title: renameText.trim() } : s)));
    } catch {}
    setRenamingId(null);
  };

  const deleteSession = async (sessionId: number) => {
    try {
      await chat.deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSession === sessionId) {
        const remaining = sessions.filter((s) => s.id !== sessionId);
        setActiveSession(remaining[0]?.id ?? null);
        if (remaining[0]) loadMessages(remaining[0].id);
      }
    } catch {}
    setConfirmDeleteId(null);
  };

  const togglePin = async (sessionId: number, pinned: boolean) => {
    try {
      await chat.togglePin(sessionId, pinned);
      setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, pinned } : s)));
    } catch {}
  };

  const selectSession = (id: number) => {
    setActiveSession(id);
    loadMessages(id);
  };

  // ─── Filtered sessions ────────────────────────────────────────
  const pinned = sessions.filter((s) => s.pinned);
  const others = sessions.filter((s) => !s.pinned);

  // ─── Render ────────────────────────────────────────────────────
  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-64px)] -m-4 lg:-m-6">
        {/* Sessions sidebar */}
        <div className={`${showSidebar ? "w-72" : "w-0"} shrink-0 border-r border-[var(--border)] bg-white flex flex-col transition-all overflow-hidden`}>
          <div className="p-3 border-b border-[var(--border)]">
            <button onClick={newChat} className="btn-primary w-full rounded-xl py-2.5 text-sm font-medium">+ New Chat</button>
            <input type="text" placeholder="Search chats..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]" />
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {pinned.length > 0 && (
              <div className="mb-2">
                <p className="px-2 py-1 text-[10px] font-semibold uppercase text-[var(--text-dim)]">Pinned</p>
                {pinned.map((s) => (
                  <SessionItem key={s.id} s={s} activeSession={activeSession} confirmDeleteId={confirmDeleteId} renamingId={renamingId}
                    renameText={renameText} renameInputRef={renameInputRef} setRenameText={setRenameText}
                    onSelect={selectSession} onStartRename={(s: ChatSession) => { setRenamingId(s.id); setRenameText(s.title); }}
                    onSaveRename={saveRename} onConfirmDelete={setConfirmDeleteId} onDelete={deleteSession}
                    onCancelDelete={() => setConfirmDeleteId(null)} onCancelRename={() => setRenamingId(null)}
                    onTogglePin={togglePin} />
                ))}
              </div>
            )}
            {others.map((s) => (
              <SessionItem key={s.id} s={s} activeSession={activeSession} confirmDeleteId={confirmDeleteId} renamingId={renamingId}
                renameText={renameText} renameInputRef={renameInputRef} setRenameText={setRenameText}
                onSelect={selectSession} onStartRename={(s: ChatSession) => { setRenamingId(s.id); setRenameText(s.title); }}
                onSaveRename={saveRename} onConfirmDelete={setConfirmDeleteId} onDelete={deleteSession}
                onCancelDelete={() => setConfirmDeleteId(null)} onCancelRename={() => setRenamingId(null)}
                onTogglePin={togglePin} />
            ))}
            {sessions.length === 0 && !loading && (
              <p className="text-center text-xs text-[var(--text-dim)] py-8">No chats yet. Start a new one!</p>
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-[var(--border)] bg-white px-4 py-3">
            <button onClick={() => setShowSidebar(!showSidebar)} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[var(--bg-card-hover)]">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
            <span className="text-sm font-medium truncate">{sessions.find((s) => s.id === activeSession)?.title ?? "Chat"}</span>
            <div className="flex-1" />
            <select value={model} onChange={(e) => setModel(e.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-xs outline-none">
              <option value="auto">Auto</option>
              <option value="fast">Fast</option>
              <option value="smart">Smart</option>
              <option value="free">Free</option>
              <option value="ollama">Ollama</option>
            </select>
            <div className="relative">
              <button onClick={() => setShowExportMenu(!showExportMenu)} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[var(--bg-card-hover)]" title="Export">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              </button>
              {showExportMenu && (
                <div className="absolute right-0 top-full mt-1 w-40 rounded-xl border border-[var(--border)] bg-white shadow-lg z-50 py-1">
                  <button onClick={() => exportChat("text")} className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--bg-card-hover)]">Export as Text</button>
                  <button onClick={() => exportChat("json")} className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--bg-card-hover)]">Export as JSON</button>
                </div>
              )}
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mx-4 mt-2 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700 flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">×</button>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4" onClick={() => { setShowExportMenu(false); setHoveredMsg(null); }}>
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                onMouseEnter={() => setHoveredMsg(m.id)} onMouseLeave={() => setHoveredMsg(null)}>
                <div className="relative max-w-[80%] group">
                  <div className={`rounded-2xl px-4 py-3 text-sm ${m.role === "user" ? "bg-[var(--accent)] text-white" : "glass"}`}>
                    {editingMsg === m.id ? (
                      <div className="space-y-2">
                        <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={3}
                          className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-black outline-none resize-none" autoFocus />
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setEditingMsg(null)} className="rounded-lg px-3 py-1 text-xs text-gray-500 hover:bg-gray-100">Cancel</button>
                          <button onClick={() => saveEdit(m.id)} className="rounded-lg px-3 py-1 text-xs bg-[var(--accent)] text-white">Save</button>
                        </div>
                      </div>
                    ) : m.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }} />
                    ) : (
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    )}
                  </div>

                  {hoveredMsg === m.id && editingMsg !== m.id && (
                    <div className={`absolute top-0 ${m.role === "user" ? "-left-20" : "-right-20"} flex items-center gap-0.5 rounded-lg border border-[var(--border)] bg-white px-1 py-0.5 shadow-sm`}>
                      <button onClick={() => copyMessage(m.content, m.id)} className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-[var(--bg-card-hover)]" title="Copy">
                        {copiedId === m.id ? "✓" : "📋"}
                      </button>
                      {m.role === "user" && (
                        <button onClick={() => startEdit(m)} className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-[var(--bg-card-hover)]" title="Edit">✏️</button>
                      )}
                      {m.role === "assistant" && (
                        <button onClick={() => regenerate(m.id)} className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-[var(--bg-card-hover)]" title="Regenerate">🔄</button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {streaming && streamText && (
              <div className="flex justify-start">
                <div className="glass max-w-[80%] rounded-2xl px-4 py-3 text-sm">
                  <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdown(streamText) }} />
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

          {/* Input area */}
          <div className="border-t border-[var(--border)] bg-white px-4 py-3">
            {attachedFiles.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {attachedFiles.map((f, i) => (
                  <div key={i} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--bg)] border border-[var(--border)] px-3 py-1 text-xs">
                    📎 <span className="truncate max-w-[120px]">{f.name}</span>
                    <button onClick={() => setAttachedFiles((prev) => prev.filter((_, j) => j !== i))} className="ml-0.5 text-gray-400 hover:text-red-500">×</button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2">
              <button onClick={() => fileInputRef.current?.click()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] hover:bg-[var(--bg-card-hover)] transition" title="Attach file">📎</button>
              <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt,.csv,.md" multiple onChange={handleFileSelect} className="hidden" />
              <button onClick={toggleVoice} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition ${voiceActive ? "border-red-400 bg-red-50 text-red-500" : "border-[var(--border)] hover:bg-[var(--bg-card-hover)]"}`} title={voiceActive ? "Stop" : "Voice"}>
                🎤{voiceActive && <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" /></span>}
              </button>
              <textarea value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Type a message..." rows={1}
                className="flex-1 resize-none rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)] max-h-32"
                style={{ minHeight: "44px" }} />
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

// ─── Session Item Component ──────────────────────────────────────────
function SessionItem({ s, activeSession, confirmDeleteId, renamingId, renameText, renameInputRef, setRenameText, onSelect, onStartRename, onSaveRename, onConfirmDelete, onDelete, onCancelDelete, onCancelRename, onTogglePin }: any) {
  return (
    <div className="relative group">
      {confirmDeleteId === s.id ? (
        <div className="flex items-center gap-1 rounded-xl bg-red-50 px-3 py-2.5 text-sm">
          <span className="flex-1 text-red-600 truncate">Delete?</span>
          <button onClick={() => onDelete(s.id)} className="text-xs font-medium text-red-600 hover:text-red-800">Yes</button>
          <button onClick={onCancelDelete} className="text-xs font-medium text-gray-500">No</button>
        </div>
      ) : renamingId === s.id ? (
        <input ref={renameInputRef} value={renameText} onChange={(e) => setRenameText(e.target.value)}
          onBlur={() => onSaveRename(s.id)}
          onKeyDown={(e) => { if (e.key === "Enter") onSaveRename(s.id); if (e.key === "Escape") onCancelRename(); }}
          className="w-full rounded-xl border border-[var(--accent)] bg-white px-3 py-2.5 text-sm outline-none" />
      ) : (
        <button onClick={() => onSelect(s.id)} onDoubleClick={() => onStartRename(s)}
          className={`w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition ${s.id === activeSession ? "bg-[#6d5cff]/8 text-[var(--accent)]" : "hover:bg-[var(--bg-card-hover)]"}`}>
          {s.pinned && <span>📌</span>}
          <span className="flex-1 truncate">{s.title}</span>
          <span className="text-[10px] text-[var(--text-dim)]">{s.message_count || 0}</span>
        </button>
      )}
      {!confirmDeleteId && !renamingId && (
        <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex gap-0.5">
          <button onClick={(e) => { e.stopPropagation(); onTogglePin(s.id, !s.pinned); }}
            className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-[var(--bg-card-hover)] text-xs" title={s.pinned ? "Unpin" : "Pin"}>
            {s.pinned ? "📌" : "📍"}
          </button>
          <button onClick={(e) => { e.stopPropagation(); onConfirmDelete(s.id); }}
            className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500" title="Delete">🗑️</button>
        </div>
      )}
    </div>
  );
}
