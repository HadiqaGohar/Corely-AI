"use client";

import { useEffect, useState } from "react";
import { notifications as notifApi, Notification } from "@/lib/api";
import AppLayout from "@/components/AppLayout";

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [filter, setFilter] = useState({ status: "all", priority: "", type: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadNotifs(); }, []);

  const loadNotifs = async () => {
    try {
      const data = await notifApi.list();
      setNotifs(data);
    } catch {}
    setLoading(false);
  };

  const filtered = notifs.filter(n => {
    if (filter.status === "unread" && n.read) return false;
    if (filter.status === "read" && !n.read) return false;
    if (filter.status === "archived" && !n.archived) return false;
    if (filter.status === "active" && n.archived) return false;
    if (filter.priority && n.priority !== filter.priority) return false;
    if (filter.type && n.type !== filter.type) return false;
    return true;
  });

  const markRead = async (id: number) => {
    try { await notifApi.markRead(id); setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n)); } catch {}
  };

  const markUnread = async (id: number) => {
    try { await notifApi.markUnread(id); setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: false } : n)); } catch {}
  };

  const archive = async (id: number) => {
    try { await notifApi.archive(id); setNotifs(prev => prev.map(n => n.id === id ? { ...n, archived: true } : n)); } catch {}
  };

  const unarchive = async (id: number) => {
    try { await notifApi.unarchive(id); setNotifs(prev => prev.map(n => n.id === id ? { ...n, archived: false } : n)); } catch {}
  };

  const markAllRead = async () => {
    try { await notifApi.markAllRead(); setNotifs(prev => prev.map(n => ({ ...n, read: true }))); } catch {}
  };

  const snooze = async (id: number, hours: number) => {
    try { await notifApi.snooze(id, hours); } catch {}
  };

  const deleteNotif = async (id: number) => {
    try { await notifApi.delete(id); setNotifs(prev => prev.filter(n => n.id !== id)); } catch {}
  };

  const unreadCount = notifs.filter(n => !n.read && !n.archived).length;

  const typeIcons: Record<string, string> = {
    task: "✅", document: "📄", chat: "💬", workflow: "⚡", system: "⚙️",
  };

  const priorityColors: Record<string, string> = {
    urgent: "bg-red-100 text-red-600", normal: "bg-blue-100 text-blue-600", low: "bg-gray-100 text-gray-500",
  };

  return (
    <AppLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-[var(--text-dim)]">{unreadCount} unread</p>
        </div>
        <button onClick={markAllRead} disabled={unreadCount === 0} className="btn-ghost rounded-xl px-4 py-2 text-sm disabled:opacity-50">
          Mark all read
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        {["all", "unread", "read", "archived"].map(s => (
          <button key={s} onClick={() => setFilter({ ...filter, status: s })} className={`rounded-lg px-3 py-2 text-xs font-medium transition ${filter.status === s ? "bg-[var(--accent)] text-white" : "bg-white border border-[var(--border)] text-[var(--text-dim)] hover:bg-[var(--bg-card-hover)]"}`}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        <select value={filter.priority} onChange={e => setFilter({ ...filter, priority: e.target.value })} className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs outline-none">
          <option value="">All Priority</option>
          <option value="urgent">Urgent</option>
          <option value="normal">Normal</option>
          <option value="low">Low</option>
        </select>
        <select value={filter.type} onChange={e => setFilter({ ...filter, type: e.target.value })} className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs outline-none">
          <option value="">All Types</option>
          <option value="task">Task</option>
          <option value="document">Document</option>
          <option value="chat">Chat</option>
          <option value="workflow">Workflow</option>
          <option value="system">System</option>
        </select>
      </div>

      {/* Notification list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <div className="mb-3 text-4xl">🔔</div>
            <p className="text-sm text-[var(--text-dim)]">{loading ? "Loading..." : "No notifications"}</p>
          </div>
        ) : (
          filtered.map(n => (
            <div key={n.id} className={`glass rounded-xl p-4 transition-all ${!n.read ? "border-l-4 border-l-[var(--accent)]" : ""}`}>
              <div className="flex items-start gap-3">
                <span className="text-xl shrink-0">{typeIcons[n.type] || "🔔"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${priorityColors[n.priority]}`}>{n.priority}</span>
                    <span className="text-xs text-[var(--text-dim)]">{n.type}</span>
                    <span className="text-xs text-[var(--text-dim)]">· {new Date(n.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm">{n.message}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!n.read ? (
                    <button onClick={() => markRead(n.id)} className="rounded-lg px-2 py-1 text-[10px] text-[var(--accent)] hover:bg-[var(--bg-card-hover)]">Mark read</button>
                  ) : (
                    <button onClick={() => markUnread(n.id)} className="rounded-lg px-2 py-1 text-[10px] text-[var(--text-dim)] hover:bg-[var(--bg-card-hover)]">Mark unread</button>
                  )}
                  {!n.archived ? (
                    <button onClick={() => archive(n.id)} className="rounded-lg px-2 py-1 text-[10px] text-[var(--text-dim)] hover:bg-[var(--bg-card-hover)]">Archive</button>
                  ) : (
                    <button onClick={() => unarchive(n.id)} className="rounded-lg px-2 py-1 text-[10px] text-[var(--text-dim)] hover:bg-[var(--bg-card-hover)]">Unarchive</button>
                  )}
                  <button onClick={() => deleteNotif(n.id)} className="rounded-lg px-2 py-1 text-[10px] text-red-400 hover:bg-red-50">Delete</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </AppLayout>
  );
}
