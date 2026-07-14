"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Shortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts() {
  const router = useRouter();

  const shortcuts: Shortcut[] = [
    { key: "k", ctrl: true, action: () => {}, description: "Open search" },
    { key: "1", ctrl: true, action: () => router.push("/dashboard"), description: "Go to Dashboard" },
    { key: "2", ctrl: true, action: () => router.push("/chat"), description: "Go to Chat" },
    { key: "3", ctrl: true, action: () => router.push("/tasks"), description: "Go to Tasks" },
    { key: "4", ctrl: true, action: () => router.push("/documents"), description: "Go to Documents" },
    { key: "5", ctrl: true, action: () => router.push("/workflows"), description: "Go to Workflows" },
    { key: "6", ctrl: true, action: () => router.push("/notifications"), description: "Go to Notifications" },
    { key: "/", ctrl: true, action: () => {}, description: "Focus search" },
    { key: "Escape", action: () => {}, description: "Close modals" },
  ];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

      for (const s of shortcuts) {
        const ctrlMatch = s.ctrl ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey);
        const shiftMatch = s.shift ? e.shiftKey : !e.shiftKey;
        if (e.key.toLowerCase() === s.key.toLowerCase() && ctrlMatch && shiftMatch) {
          e.preventDefault();
          s.action();
          break;
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router]);

  return shortcuts;
}
