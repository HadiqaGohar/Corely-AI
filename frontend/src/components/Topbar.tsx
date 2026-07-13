"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/chat": "AI Chat",
  "/tasks": "Tasks",
  "/documents": "Documents",
  "/notifications": "Notifications",
  "/workflows": "Workflows",
  "/settings": "Settings",
};

export default function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const title = pageTitles[pathname] || "Corely AI";

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifs(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setShowUser(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--border)] bg-white/80 backdrop-blur-xl px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-dim)] hover:bg-[var(--bg-card-hover)] lg:hidden"
          aria-label="Menu"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-dim)] hover:bg-[var(--bg-card-hover)] transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-[var(--border)] bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                <span className="text-sm font-semibold">Notifications</span>
                <Link href="/notifications" onClick={() => setShowNotifs(false)} className="text-xs text-[var(--accent)] hover:underline">View all</Link>
              </div>
              <div className="px-4 py-8 text-center text-sm text-[var(--text-dim)]">No new notifications</div>
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
                <p className="text-xs text-[var(--text-dim)]">hadiqa@corely.ai</p>
              </div>
              <div className="py-1">
                <Link href="/settings" onClick={() => setShowUser(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--text-dim)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text)]">
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
