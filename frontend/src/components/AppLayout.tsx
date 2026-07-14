"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import GlobalSearch from "./GlobalSearch";
import { useKeyboardShortcuts } from "@/lib/shortcuts";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();
  useKeyboardShortcuts();

  useEffect(() => {
    const token = localStorage.getItem("corely_token");
    if (!token) {
      router.push("/login");
    } else {
      setAuthenticated(true);
    }
    setChecking(false);
  }, [router]);

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--bg)]">
        <div className="text-center">
          <div className="mb-4 text-4xl">🔄</div>
          <p className="text-sm text-[var(--text-dim)]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) return null;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <GlobalSearch />
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        unreadCount={0}
      />
      <div className={`transition-all duration-300 ${sidebarCollapsed ? "lg:ml-[68px]" : "lg:ml-[240px]"}`}>
        <Topbar onMenuClick={() => {}} />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
