"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import {
  type Notification,
  getNotifications,
  updateNotifications,
  subscribeNotifications,
  typeIcons,
  priorityColors,
  relatedItemLabels,
  relatedItemHrefs,
} from "@/lib/notifications-store";

type Priority = "urgent" | "normal" | "low";
const priorityOrder: Record<Priority, number> = { urgent: 0, normal: 1, low: 2 };
const priorityLabels: Record<Priority, string> = {
  urgent: "🔴 Urgent",
  normal: "🔵 Normal",
  low: "⚪ Low",
};

const snoozeOptions = [
  { label: "1 hour", ms: 1 * 60 * 60 * 1000 },
  { label: "8 hours", ms: 8 * 60 * 60 * 1000 },
  { label: "24 hours", ms: 24 * 60 * 60 * 1000 },
];

function useNotifications() {
  const [notifs, setNotifs] = useState<Notification[]>(getNotifications);
  useEffect(() => {
    return subscribeNotifications(() => setNotifs(getNotifications()));
  }, []);
  return notifs;
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationsPage() {
  const notifs = useNotifications();
  const [filter, setFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [snoozeMenuId, setSnoozeMenuId] = useState<number | null>(null);
  const [customSnoozeId, setCustomSnoozeId] = useState<number | null>(null);
  const [customHours, setCustomHours] = useState(1);
  const [customMinutes, setCustomMinutes] = useState(0);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  const snoozeMenuRef = useRef<HTMLDivElement>(null);

  // Close snooze menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (snoozeMenuRef.current && !snoozeMenuRef.current.contains(e.target as Node)) {
        setSnoozeMenuId(null);
        setCustomSnoozeId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = notifs.filter((n) => {
    if (filter === "unread" && (n.read || n.archived)) return false;
    if (filter === "read" && (!n.read || n.archived)) return false;
    if (filter === "archived" && !n.archived) return false;
    if (filter === "active" && n.archived) return false;
    return true;
  });

  // Sort by priority then by created_at desc
  const sorted = [...filtered].sort((a, b) => {
    const pa = priorityOrder[a.priority as Priority] ?? 2;
    const pb = priorityOrder[b.priority as Priority] ?? 2;
    if (pa !== pb) return pa - pb;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Group by priority
  const groups: { priority: Priority; items: Notification[] }[] = [];
  const grouped = new Map<Priority, Notification[]>();
  for (const n of sorted) {
    const p = n.priority as Priority;
    if (!grouped.has(p)) grouped.set(p, []);
    grouped.get(p)!.push(n);
  }
  for (const p of ["urgent", "normal", "low"] as Priority[]) {
    const items = grouped.get(p);
    if (items && items.length > 0) groups.push({ priority: p, items });
  }

  const unreadCount = notifs.filter((n) => !n.read && !n.archived).length;

  const update = useCallback(
    (fn: (prev: Notification[]) => Notification[]) => updateNotifications(fn),
    [],
  );

  const markRead = (id: number) =>
    update((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  const markUnread = (id: number) =>
    update((prev) => prev.map((n) => (n.id === id ? { ...n, read: false } : n)));
  const archive = (id: number) =>
    update((prev) => prev.map((n) => (n.id === id ? { ...n, archived: true } : n)));
  const unarchive = (id: number) =>
    update((prev) => prev.map((n) => (n.id === id ? { ...n, archived: false } : n)));
  const deleteNotif = (id: number) =>
    update((prev) => prev.filter((n) => n.id !== id));
  const markAllRead = () =>
    update((prev) => prev.map((n) => ({ ...n, read: true })));

  const snooze = (id: number, ms: number) => {
    const until = new Date(Date.now() + ms).toISOString();
    update((prev) =>
      prev.map((n) => (n.id === id ? { ...n, snoozedUntil: until, read: true } : n)),
    );
    setSnoozeMenuId(null);
    setCustomSnoozeId(null);
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((n) => n.id)));
    }
  };

  const bulkMarkRead = () => {
    update((prev) =>
      prev.map((n) => (selectedIds.has(n.id) ? { ...n, read: true } : n)),
    );
    setSelectedIds(new Set());
  };

  const bulkArchive = () => {
    update((prev) =>
      prev.map((n) => (selectedIds.has(n.id) ? { ...n, archived: true } : n)),
    );
    setSelectedIds(new Set());
  };

  const bulkDelete = () => {
    update((prev) => prev.filter((n) => !selectedIds.has(n.id)));
    setSelectedIds(new Set());
  };

  const refresh = () => setLastChecked(new Date());

  const now = Date.now();
  const checkedAgo = Math.floor((now - lastChecked.getTime()) / 60000);

  return (
    <AppLayout>
      {/* Header */}
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
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--text-dim)] hover:bg-[var(--bg-card-hover)]"
          >
            🔄 Refresh · {checkedAgo === 0 ? "just now" : `${checkedAgo}m ago`}
          </button>
          <button
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            Mark all read
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        {["all", "unread", "read", "archived"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
              filter === s
                ? "bg-[var(--accent)] text-white"
                : "border-[var(--border)] bg-white text-[var(--text-dim)] hover:bg-[var(--bg-card-hover)]"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-[var(--accent)] bg-[var(--accent)]/5 px-4 py-3">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <button
            onClick={bulkMarkRead}
            className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100"
          >
            Mark read
          </button>
          <button
            onClick={bulkArchive}
            className="rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
          >
            Archive
          </button>
          <button
            onClick={bulkDelete}
            className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
          >
            Delete
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-xs text-[var(--text-dim)] hover:underline"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Notification list */}
      {sorted.length === 0 && filter === "all" && notifs.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <div className="mb-4 text-5xl">📭</div>
          <p className="text-lg font-semibold">No notifications yet</p>
          <p className="mt-1 text-sm text-[var(--text-dim)]">
            When something happens, you&apos;ll see it here.
          </p>
        </div>
      ) : sorted.length === 0 && filter === "unread" ? (
        <div className="glass rounded-2xl p-16 text-center">
          <div className="mb-4 text-5xl">🎉</div>
          <p className="text-lg font-semibold">All caught up!</p>
          <p className="mt-1 text-sm text-[var(--text-dim)]">
            No unread notifications. Nice work.
          </p>
        </div>
      ) : sorted.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <div className="mb-4 text-5xl">🔍</div>
          <p className="text-lg font-semibold">Nothing here</p>
          <p className="mt-1 text-sm text-[var(--text-dim)]">
            No notifications match this filter.
          </p>
        </div>
      ) : (
        groups.map((group) => (
          <div key={group.priority} className="mb-6">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-dim)]">
              {priorityLabels[group.priority]} ({group.items.length})
            </h2>
            <div className="space-y-2">
              {group.items.map((n) => {
                const isExpanded = expandedId === n.id;
                const isSnoozed =
                  n.snoozedUntil && new Date(n.snoozedUntil) > new Date();
                const snoozeMenuOpen = snoozeMenuId === n.id;
                const customOpen = customSnoozeId === n.id;
                return (
                  <div
                    key={n.id}
                    className={`glass rounded-xl transition-all ${
                      !n.read ? "border-l-4 border-l-[var(--accent)]" : ""
                    } ${selectedIds.has(n.id) ? "ring-2 ring-[var(--accent)]" : ""}`}
                  >
                    <div className="flex items-start gap-3 p-4">
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={selectedIds.has(n.id)}
                        onChange={() => toggleSelect(n.id)}
                        className="mt-1 h-4 w-4 cursor-pointer rounded border-gray-300 accent-[var(--accent)]"
                      />

                      {/* Clickable area */}
                      <button
                        onClick={() =>
                          setExpandedId(isExpanded ? null : n.id)
                        }
                        className="flex flex-1 items-start gap-3 text-left"
                      >
                        <span className="shrink-0 text-xl">
                          {typeIcons[n.type]}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${priorityColors[n.priority]}`}
                            >
                              {n.priority}
                            </span>
                            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-600">
                              {n.type}
                            </span>
                            <span className="text-xs text-[var(--text-dim)]">
                              {timeAgo(n.created_at)}
                            </span>
                            {isSnoozed && (
                              <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-medium text-yellow-700">
                                🔕 Snoozed until{" "}
                                {new Date(n.snoozedUntil!).toLocaleString()}
                              </span>
                            )}
                          </div>
                          <p className="text-sm">{n.message}</p>

                          {/* Related item link */}
                          <Link
                            href={relatedItemHrefs[n.type]}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1.5 inline-flex items-center gap-1 text-xs text-[var(--accent)] hover:underline"
                          >
                            {relatedItemLabels[n.type]} →
                          </Link>
                        </div>
                      </button>

                      {/* Action buttons */}
                      <div className="flex shrink-0 items-center gap-1">
                        {/* Snooze button */}
                        <div
                          className="relative"
                          ref={
                            snoozeMenuOpen ? snoozeMenuRef : undefined
                          }
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSnoozeMenuId(
                                snoozeMenuOpen ? null : n.id,
                              );
                              setCustomSnoozeId(null);
                            }}
                            className="rounded-lg px-2 py-1 text-[10px] text-yellow-600 hover:bg-yellow-50"
                            title="Snooze"
                          >
                            🔕
                          </button>
                          {snoozeMenuOpen && (
                            <div className="absolute right-0 top-full z-10 mt-1 w-44 rounded-lg border border-[var(--border)] bg-white shadow-xl">
                              {snoozeOptions.map((opt) => (
                                <button
                                  key={opt.label}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    snooze(n.id, opt.ms);
                                  }}
                                  className="block w-full px-3 py-2 text-left text-xs hover:bg-[var(--bg-card-hover)]"
                                >
                                  {opt.label}
                                </button>
                              ))}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCustomSnoozeId(n.id);
                                }}
                                className="block w-full border-t border-[var(--border)] px-3 py-2 text-left text-xs hover:bg-[var(--bg-card-hover)]"
                              >
                                Custom...
                              </button>
                              {customOpen && (
                                <div className="border-t border-[var(--border)] p-3">
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      min={0}
                                      max={168}
                                      value={customHours}
                                      onChange={(e) =>
                                        setCustomHours(
                                          Number(e.target.value),
                                        )
                                      }
                                      className="w-14 rounded border border-[var(--border)] px-1.5 py-1 text-xs"
                                    />
                                    <span className="text-[10px] text-[var(--text-dim)]">
                                      h
                                    </span>
                                    <input
                                      type="number"
                                      min={0}
                                      max={59}
                                      value={customMinutes}
                                      onChange={(e) =>
                                        setCustomMinutes(
                                          Number(e.target.value),
                                        )
                                      }
                                      className="w-14 rounded border border-[var(--border)] px-1.5 py-1 text-xs"
                                    />
                                    <span className="text-[10px] text-[var(--text-dim)]">
                                      m
                                    </span>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const totalMs =
                                        (customHours * 60 +
                                          customMinutes) *
                                        60 *
                                        1000;
                                      if (totalMs > 0)
                                        snooze(n.id, totalMs);
                                    }}
                                    className="mt-2 w-full rounded bg-[var(--accent)] px-2 py-1 text-[10px] font-medium text-white hover:opacity-90"
                                  >
                                    Set
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {!n.read ? (
                          <button
                            onClick={() => markRead(n.id)}
                            className="rounded-lg px-2 py-1 text-[10px] text-[var(--accent)] hover:bg-[var(--bg-card-hover)]"
                          >
                            Mark read
                          </button>
                        ) : (
                          <button
                            onClick={() => markUnread(n.id)}
                            className="rounded-lg px-2 py-1 text-[10px] text-[var(--text-dim)] hover:bg-[var(--bg-card-hover)]"
                          >
                            Unread
                          </button>
                        )}
                        {!n.archived ? (
                          <button
                            onClick={() => archive(n.id)}
                            className="rounded-lg px-2 py-1 text-[10px] text-[var(--text-dim)] hover:bg-[var(--bg-card-hover)]"
                          >
                            Archive
                          </button>
                        ) : (
                          <button
                            onClick={() => unarchive(n.id)}
                            className="rounded-lg px-2 py-1 text-[10px] text-[var(--text-dim)] hover:bg-[var(--bg-card-hover)]"
                          >
                            Unarchive
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotif(n.id)}
                          className="rounded-lg px-2 py-1 text-[10px] text-red-400 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="border-t border-[var(--border)] bg-[var(--bg-card)]/50 px-4 py-3">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${priorityColors[n.priority]}`}
                          >
                            {n.priority}
                          </span>
                          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-600">
                            {n.type}
                          </span>
                        </div>
                        <p className="mb-2 text-sm text-[var(--text-dim)]">
                          {n.message}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-dim)]">
                          <span>
                            Created:{" "}
                            {new Date(n.created_at).toLocaleString()}
                          </span>
                          {isSnoozed && (
                            <span>
                              Snoozed until:{" "}
                              {new Date(
                                n.snoozedUntil!,
                              ).toLocaleString()}
                            </span>
                          )}
                          <span>
                            Status: {n.read ? "Read" : "Unread"}
                            {n.archived ? " · Archived" : ""}
                          </span>
                        </div>
                        <Link
                          href={relatedItemHrefs[n.type]}
                          className="mt-3 inline-flex items-center gap-1 rounded-lg bg-[var(--accent)]/10 px-3 py-1.5 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent)]/20"
                        >
                          {relatedItemLabels[n.type]} →
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </AppLayout>
  );
}
