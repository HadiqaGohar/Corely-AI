"use client";

import { useRouter } from "next/navigation";
import { useGlobalSearch } from "@/lib/search";

export default function GlobalSearch() {
  const { query, setQuery, results, loading, open, setOpen, inputRef } = useGlobalSearch();
  const router = useRouter();

  if (!open) return null;

  const typeColors: Record<string, string> = {
    task: "bg-violet-100 text-violet-600",
    chat: "bg-emerald-100 text-emerald-600",
    document: "bg-blue-100 text-blue-600",
    workflow: "bg-amber-100 text-amber-600",
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" onClick={() => setOpen(false)}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
          <span className="text-gray-400">🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks, chats, documents, workflows..."
            className="flex-1 bg-transparent text-sm outline-none"
          />
          <kbd className="rounded border border-gray-200 px-1.5 py-0.5 text-[10px] text-gray-400">ESC</kbd>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {loading && (
            <div className="p-8 text-center text-sm text-gray-400">Searching...</div>
          )}

          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="p-8 text-center text-sm text-gray-400">No results found</div>
          )}

          {!loading && results.length > 0 && (
            <div className="p-2">
              {results.map((r, i) => (
                <button
                  key={`${r.type}-${r.id}`}
                  onClick={() => {
                    router.push(r.href);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="text-lg">{r.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.title}</p>
                    <p className="text-xs text-gray-400 truncate">{r.subtitle}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${typeColors[r.type]}`}>
                    {r.type}
                  </span>
                </button>
              ))}
            </div>
          )}

          {!loading && query.length < 2 && (
            <div className="p-6 text-center text-xs text-gray-400">
              <p>Type at least 2 characters to search</p>
              <p className="mt-2">Search across tasks, chats, documents, and workflows</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
