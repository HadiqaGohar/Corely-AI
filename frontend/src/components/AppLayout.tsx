"use client";

import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import GlobalSearch from "./GlobalSearch";
import { useKeyboardShortcuts } from "@/lib/shortcuts";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  useKeyboardShortcuts();

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
