"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { tasks, chat, documents, workflows } from "@/lib/api";

interface SearchResult {
  type: "task" | "chat" | "document" | "workflow";
  id: number;
  title: string;
  subtitle: string;
  icon: string;
  href: string;
}

export function useGlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    const lower = q.toLowerCase();
    const all: SearchResult[] = [];

    try {
      // Search tasks
      const taskRes = await tasks.list({ search: q }).catch(() => []);
      taskRes.forEach((t) => {
        all.push({
          type: "task",
          id: t.id,
          title: t.title,
          subtitle: t.status,
          icon: "📋",
          href: "/tasks",
        });
      });

      // Search chat sessions
      const chatRes = await chat.listSessions(q).catch(() => []);
      chatRes.forEach((s) => {
        all.push({
          type: "chat",
          id: s.id,
          title: s.title || `Chat ${s.id}`,
          subtitle: `${s.message_count || 0} messages`,
          icon: "💬",
          href: "/chat",
        });
      });

      // Search documents
      const docRes = await documents.list({ search: q }).catch(() => []);
      docRes.forEach((d) => {
        all.push({
          type: "document",
          id: d.id,
          title: d.title,
          subtitle: d.filename,
          icon: "📄",
          href: "/documents",
        });
      });

      // Search workflows
      const wfRes = await workflows.list().catch(() => []);
      wfRes.filter((w) => w.name.toLowerCase().includes(lower)).forEach((w) => {
        all.push({
          type: "workflow",
          id: w.id,
          title: w.name,
          subtitle: w.description || "No description",
          icon: "⚡",
          href: "/workflows",
        });
      });
    } catch {}

    setResults(all.slice(0, 10));
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  return { query, setQuery, results, loading, open, setOpen, inputRef };
}
