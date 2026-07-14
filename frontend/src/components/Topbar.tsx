"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  type Notification,
  getNotifications,
  subscribeNotifications,
  updateNotifications,
  typeIcons,
} from "@/lib/notifications-store";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/chat": "AI Chat",
  "/tasks": "Tasks",
  "/documents": "Documents",
  "/notifications": "Notifications",
  "/workflows": "Workflows",
  "/settings": "Settings",
};

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

export default function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifs, setRecentNotifs] = useState<Notification[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const title = pageTitles[pathname] || "Corely AI";

  const refreshNotifs = useCallback(() => {
    const all = getNotifications();
    const active = all.filter((n) => !n.archived);
    setUnreadCount(active.filter((n) => !n.read).length);
    setRecentNotifs(active.slice(0, 5));
  }, []);

  useEffect(() => {
    refreshNotifs();
    const unsub = subscribeNotifications(refreshNotifs);
    const interval = setInterval(refreshNotifs, 30000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [refreshNotifs]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setShowNotifs(false);
      if (userRef.current && !userRef.current.contains(e.target as Node))
        setShowUser(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markAllRead = () => {
    updateNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    refreshNotifs();
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--border)] bg-white/80 px-4 backdrop-blur-xl lg:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-dim)] hover:bg-[var(--bg-card-hover)] lg:hidden"
          aria-label="Menu"
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
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
        </button>
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Search button */}
        <button
          onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))}
          className="flex h-9 items-center gap-2 rounded-lg border border-[var(--border)] px-3 text-sm text-[var(--text-dim)] hover:bg-[var(--bg-card-hover)]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden rounded border border-gray-200 px-1 py-0.5 text-[10px] text-gray-400 sm:inline">⌘K</kbd>
        </button>

        {/* Notification bell with unread badge */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-dim)] transition-colors hover:bg-[var(--bg-card-hover)]"
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
                d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
              />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-full mt-2 w-80 overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                <span className="text-sm font-semibold">Notifications</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={markAllRead}
                    disabled={unreadCount === 0}
                    className="text-xs text-[var(--accent)] hover:underline disabled:opacity-50"
                  >
                    Mark all read
                  </button>
                  <Link
                    href="/notifications"
                    onClick={() => setShowNotifs(false)}
                    className="text-xs text-[var(--text-dim)] hover:underline"
                  >
                    View all
                  </Link>
                </div>
              </div>
              {recentNotifs.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-[var(--text-dim)]">
                  No new notifications
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  {recentNotifs.map((n) => (
                    <div
                      key={n.id}
                      className={`flex items-start gap-3 border-b border-[var(--border)] px-4 py-3 transition-colors last:border-0 hover:bg-[var(--bg-card-hover)] ${
                        !n.read ? "bg-[var(--accent)]/5" : ""
                      }`}
                    >
                      <span className="shrink-0 text-lg">
                        {typeIcons[n.type]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm">
                          {n.message}
                        </p>
                        <span className="text-[10px] text-[var(--text-dim)]">
                          {timeAgo(n.created_at)}
                        </span>
                      </div>
                      {!n.read && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* User avatar */}
        <div ref={userRef} className="relative">
          <button
            onClick={() => setShowUser(!showUser)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#6d5cff] to-[#38bdf8] text-xs font-bold text-white"
          >
            H
          </button>

          {showUser && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-[var(--border)] bg-white shadow-xl">
              <div className="border-b border-[var(--border)] px-4 py-3">
                <p className="text-sm font-semibold">Hadiqa</p>
                <p className="text-xs text-[var(--text-dim)]">
                  hadiqa@corely.ai
                </p>
              </div>
              <div className="py-1">
                <Link
                  href="/settings"
                  onClick={() => setShowUser(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--text-dim)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text)]"
                >
                  Settings
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
