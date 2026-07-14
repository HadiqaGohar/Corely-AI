"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import { notifications as notifsApi, Notification } from "@/lib/api";

type Priority = "urgent" | "normal" | "low";
const priorityOrder: Record<Priority, number> = { urgent: 0, normal: 1, low: 2 };
const priorityLabels: Record<Priority, string> = { urgent: "🔴 Urgent", normal: "🔵 Normal", low: "⚪ Low" };
const typeIcons: Record<string, string> = { task: "📋", document: "📄", chat: "💬", workflow: "⚡", system: "🔔" };
const priorityColors: Record<string, string> = { urgent: "bg-red-100 text-red-600", normal: "bg-blue-100 text-blue-600", low: "bg-gray-100 text-gray-500" };

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => { loadNotifs(); }, []);

  const loadNotifs = async () => {
    setLoading(true);
    try {
      const data = await notifsApi.list();
      setNotifs(data);
    } catch {} finally { setLoading(false); }
  };

  const filtered = notifs.filter((n) => {
    if (filter === "unread" && n.read) return false;
    if (filter === "archived" && !n.archived) return false;
    if (filter === "active" && n.archived) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const pa = priorityOrder[a.priority as Priority] ?? 2;
    const pb = priorityOrder[b.priority as Priority] ?? 2;
    if (pa !== pb) return pa - pb;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const unreadCount = notifs.filter((n) => !n.read && !n.archived).length;

  const markRead = async (id: number) => { try { await notifsApi.markRead(id); setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n)); } catch {} };
  const markUnread = async (id: number) => { try { await notifsApi.markUnread(id); setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read: false } : n)); } catch {} };
  const archive = async (id: number) => { try { await notifsApi.archive(id); setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, archived: true } : n)); } catch {} };
  const deleteNotif = async (id: number) => { try { await notifsApi.delete(id); setNotifs((prev) => prev.filter((n) => n.id !== id)); } catch {} };
  const markAllRead = async () => { try { await notifsApi.markAllRead(); setNotifs((prev) => prev.map((n) => ({ ...n, read: true }))); } catch {} };
  const snooze = async (id: number, hours: number) => { try { await notifsApi.snooze(id, hours); loadNotifs(); } catch {} };

  const toggleSelect = (id: number) => setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <AppLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <span className="relative flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-[var(--accent)] px-2 text-xs font-bold text-white">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-75" />
              <span className="relative">{unreadCount}</span>
            </span>
          )}
        </div>
        <button onClick={markAllRead} disabled={unreadCount === 0} className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">Mark all read</button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {["all", "unread", "archived", "active"].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${filter === s ? "bg-[var(--accent)] text-white" : "border-[var(--border)] bg-white text-[var(--text-dim)] hover:bg-[var(--bg-card-hover)]"}`}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="glass rounded-2xl p-16 text-center text-[var(--text-dim)]">Loading...</div>
      ) : sorted.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <div className="mb-4 text-5xl">{filter === "unread" ? "🎉" : "📭"}</div>
          <p className="text-lg font-semibold">{filter === "unread" ? "All caught up!" : "No notifications"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((n) => (
            <div key={n.id} className={`glass rounded-xl transition-all ${!n.read ? "border-l-4 border-l-[var(--accent)]" : ""}`}>
              <div className="flex items-start gap-3 p-4">
                <input type="checkbox" checked={selectedIds.has(n.id)} onChange={() => toggleSelect(n.id)} className="mt-1 h-4 w-4 rounded border-gray-300 accent-[var(--accent)]" />
                <button onClick={() => setExpandedId(expandedId === n.id ? null : n.id)} className="flex flex-1 items-start gap-3 text-left">
                  <span className="shrink-0 text-xl">{typeIcons[n.type] || "🔔"}</span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${priorityColors[n.priority] || ""}`}>{n.priority}</span>
                      <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-600">{n.type}</span>
                      <span className="text-xs text-[var(--text-dim)]">{timeAgo(n.created_at)}</span>
                    </div>
                    <p className="text-sm">{n.message}</p>
                  </div>
                </button>
                <div className="flex shrink-0 items-center gap-1">
                  <button onClick={() => snooze(n.id, 1)} className="rounded-lg px-2 py-1 text-[10px] text-yellow-600 hover:bg-yellow-50" title="Snooze 1h">🔕</button>
                  {!n.read ? <button onClick={() => markRead(n.id)} className="rounded-lg px-2 py-1 text-[10px] text-[var(--accent)] hover:bg-[var(--bg-card-hover)]">Read</button> : <button onClick={() => markUnread(n.id)} className="rounded-lg px-2 py-1 text-[10px] text-[var(--text-dim)] hover:bg-[var(--bg-card-hover)]">Unread</button>}
                  {!n.archived ? <button onClick={() => archive(n.id)} className="rounded-lg px-2 py-1 text-[10px] text-[var(--text-dim)]">Archive</button> : null}
                  <button onClick={() => deleteNotif(n.id)} className="rounded-lg px-2 py-1 text-[10px] text-red-400 hover:bg-red-50">Delete</button>
                </div>
              </div>
              {expandedId === n.id && (
                <div className="border-t border-[var(--border)] px-4 py-3 text-xs text-[var(--text-dim)]">
                  Created: {new Date(n.created_at).toLocaleString()} · Status: {n.read ? "Read" : "Unread"}{n.archived ? " · Archived" : ""}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
