"use client";

import { useState } from "react";
import AppLayout from "@/components/AppLayout";

const initNotifs = [
  { id: 1, message: "Task 'Design dashboard' is overdue", type: "task", priority: "urgent", read: false, archived: false, created_at: "2026-07-13T06:00:00Z" },
  { id: 2, message: "Document 'API Docs' uploaded successfully", type: "document", priority: "normal", read: false, archived: false, created_at: "2026-07-13T05:30:00Z" },
  { id: 3, message: "New message in Project Planning chat", type: "chat", priority: "normal", read: false, archived: false, created_at: "2026-07-13T04:15:00Z" },
  { id: 4, message: "Workflow 'Auto-Tag' executed successfully", type: "workflow", priority: "low", read: true, archived: false, created_at: "2026-07-12T22:00:00Z" },
  { id: 5, message: "System maintenance scheduled for tonight", type: "system", priority: "normal", read: true, archived: false, created_at: "2026-07-12T18:00:00Z" },
  { id: 6, message: "3 tasks due tomorrow", type: "task", priority: "normal", read: false, archived: false, created_at: "2026-07-12T12:00:00Z" },
  { id: 7, message: "Document 'Budget Report' shared with team", type: "document", priority: "low", read: true, archived: true, created_at: "2026-07-11T10:00:00Z" },
];

const typeIcons: Record<string, string> = { task: "✅", document: "📄", chat: "💬", workflow: "⚡", system: "⚙️" };
const priorityColors: Record<string, string> = { urgent: "bg-red-100 text-red-600", normal: "bg-blue-100 text-blue-600", low: "bg-gray-100 text-gray-500" };

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState(initNotifs);
  const [filter, setFilter] = useState("all");

  const filtered = notifs.filter(n => {
    if (filter === "unread" && n.read) return false;
    if (filter === "read" && !n.read) return false;
    if (filter === "archived" && !n.archived) return false;
    if (filter === "active" && n.archived) return false;
    return true;
  });

  const markRead = (id: number) => setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  const markUnread = (id: number) => setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: false } : n));
  const archive = (id: number) => setNotifs(prev => prev.map(n => n.id === id ? { ...n, archived: true } : n));
  const unarchive = (id: number) => setNotifs(prev => prev.map(n => n.id === id ? { ...n, archived: false } : n));
  const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  const deleteNotif = (id: number) => setNotifs(prev => prev.filter(n => n.id !== id));

  const unreadCount = notifs.filter(n => !n.read && !n.archived).length;

  return (
    <AppLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold">Notifications</h1><p className="text-sm text-[var(--text-dim)]">{unreadCount} unread</p></div>
        <button onClick={markAllRead} disabled={unreadCount === 0} className="btn-ghost rounded-xl px-4 py-2 text-sm disabled:opacity-50">Mark all read</button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {["all", "unread", "read", "archived"].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`rounded-lg px-3 py-2 text-xs font-medium transition ${filter === s ? "bg-[var(--accent)] text-white" : "bg-white border border-[var(--border)] text-[var(--text-dim)] hover:bg-[var(--bg-card-hover)]"}`}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center"><div className="mb-3 text-4xl">🔔</div><p className="text-sm text-[var(--text-dim)]">No notifications</p></div>
        ) : filtered.map(n => (
          <div key={n.id} className={`glass rounded-xl p-4 transition-all ${!n.read ? "border-l-4 border-l-[var(--accent)]" : ""}`}>
            <div className="flex items-start gap-3">
              <span className="text-xl shrink-0">{typeIcons[n.type]}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${priorityColors[n.priority]}`}>{n.priority}</span>
                  <span className="text-xs text-[var(--text-dim)]">{n.type}</span>
                  <span className="text-xs text-[var(--text-dim)]">· {new Date(n.created_at).toLocaleString()}</span>
                </div>
                <p className="text-sm">{n.message}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!n.read ? <button onClick={() => markRead(n.id)} className="rounded-lg px-2 py-1 text-[10px] text-[var(--accent)] hover:bg-[var(--bg-card-hover)]">Mark read</button> : <button onClick={() => markUnread(n.id)} className="rounded-lg px-2 py-1 text-[10px] text-[var(--text-dim)] hover:bg-[var(--bg-card-hover)]">Unread</button>}
                {!n.archived ? <button onClick={() => archive(n.id)} className="rounded-lg px-2 py-1 text-[10px] text-[var(--text-dim)] hover:bg-[var(--bg-card-hover)]">Archive</button> : <button onClick={() => unarchive(n.id)} className="rounded-lg px-2 py-1 text-[10px] text-[var(--text-dim)] hover:bg-[var(--bg-card-hover)]">Unarchive</button>}
                <button onClick={() => deleteNotif(n.id)} className="rounded-lg px-2 py-1 text-[10px] text-red-400 hover:bg-red-50">Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
