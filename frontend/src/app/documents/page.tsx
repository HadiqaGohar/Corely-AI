"use client";

import { useState } from "react";
import AppLayout from "@/components/AppLayout";

const initDocs = [
  { id: 1, title: "Project Requirements", filename: "requirements.pdf", file_type: "pdf", file_size: 245000, status: "ready", folder_id: 1, tags: [{ id: 1, name: "Design", color: "#6d5cff" }] },
  { id: 2, title: "API Documentation", filename: "api-docs.md", file_type: "md", file_size: 18200, status: "ready", folder_id: 2, tags: [{ id: 2, name: "Backend", color: "#38bdf8" }] },
  { id: 3, title: "Meeting Notes July", filename: "meeting-notes.docx", file_type: "docx", file_size: 52000, status: "ready", folder_id: 1, tags: [] },
  { id: 4, title: "Budget Report Q3", filename: "budget.csv", file_type: "csv", file_size: 8900, status: "ready", folder_id: null, tags: [{ id: 3, name: "Finance", color: "#34d399" }] },
  { id: 5, title: "User Research Data", filename: "research.pdf", file_type: "pdf", file_size: 1200000, status: "ready", folder_id: 1, tags: [{ id: 1, name: "Design", color: "#6d5cff" }] },
  { id: 6, title: "Sprint Retrospective", filename: "retro.md", file_type: "md", file_size: 4500, status: "ready", folder_id: null, tags: [] },
];

const initFolders = [
  { id: 1, name: "Design", color: "#6d5cff", document_count: 3 },
  { id: 2, name: "Backend", color: "#38bdf8", document_count: 1 },
  { id: 3, name: "Finance", color: "#34d399", document_count: 1 },
];

const initTags = [
  { id: 1, name: "Design", color: "#6d5cff" },
  { id: 2, name: "Backend", color: "#38bdf8" },
  { id: 3, name: "Finance", color: "#34d399" },
];

const fileIcons: Record<string, string> = { pdf: "📄", docx: "📝", txt: "📃", csv: "📊", md: "📋" };

export default function DocumentsPage() {
  const [docs] = useState(initDocs);
  const [folders] = useState(initFolders);
  const [tags] = useState(initTags);
  const [activeFolder, setActiveFolder] = useState<number | null>(null);
  const [activeTag, setActiveTag] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"list" | "grid">("list");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [qaQuestion, setQaQuestion] = useState("");
  const [qaAnswer, setQaAnswer] = useState<any>(null);

  const filtered = docs.filter(d => {
    if (activeFolder && d.folder_id !== activeFolder) return false;
    if (activeTag && !d.tags.some(t => t.id === activeTag)) return false;
    if (search && !d.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleUpload = () => {
    setUploading(true);
    setUploadProgress(0);
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 30;
      if (p >= 100) { setUploadProgress(100); setUploading(false); clearInterval(interval); }
      else setUploadProgress(Math.round(p));
    }, 200);
  };

  const askQuestion = () => {
    if (!qaQuestion.trim()) return;
    setQaAnswer({
      answer: `Based on the documents, here's what I found regarding "${qaQuestion}":\n\nThis is a simulated RAG response. Connect to the backend API for real document Q&A with vector similarity search and source attribution.`,
      sources: [{ document: "Project Requirements.pdf", page: 3, relevance: 0.92 }, { document: "API Documentation.md", page: 1, relevance: 0.85 }]
    });
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-64px)] -m-4 lg:-m-6">
        {/* Sidebar */}
        <div className="w-64 shrink-0 border-r border-[var(--border)] bg-white p-4 overflow-y-auto hidden md:block">
          <div className="mb-6">
            <h3 className="mb-3 text-xs font-semibold uppercase text-[var(--text-dim)]">Folders</h3>
            <div className="space-y-1">
              <button onClick={() => setActiveFolder(null)} className={`w-full rounded-lg px-3 py-2 text-sm text-left transition ${!activeFolder ? "bg-[#6d5cff]/8 text-[var(--accent)]" : "hover:bg-[var(--bg-card-hover)]"}`}>All Documents</button>
              {folders.map(f => (
                <button key={f.id} onClick={() => setActiveFolder(f.id)} className={`w-full rounded-lg px-3 py-2 text-sm text-left flex items-center gap-2 transition ${activeFolder === f.id ? "bg-[#6d5cff]/8 text-[var(--accent)]" : "hover:bg-[var(--bg-card-hover)]"}`}>
                  <span className="h-3 w-3 rounded-full shrink-0" style={{ background: f.color }} />
                  <span className="flex-1 truncate">{f.name}</span>
                  <span className="text-xs text-[var(--text-dim)]">{f.document_count}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase text-[var(--text-dim)]">Tags</h3>
            <div className="flex flex-wrap gap-1.5">
              {tags.map(t => (
                <button key={t.id} onClick={() => setActiveTag(activeTag === t.id ? null : t.id)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${activeTag === t.id ? "ring-2 ring-[var(--accent)]" : ""}`}
                  style={{ background: t.color + "20", color: t.color }}>{t.name}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center gap-3 border-b border-[var(--border)] bg-white px-4 py-3">
            <button onClick={handleUpload} disabled={uploading} className="btn-primary rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50">
              {uploading ? `Uploading ${uploadProgress}%` : "Upload"}
            </button>
            <input type="text" placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)}
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]" />
            <div className="flex rounded-lg border border-[var(--border)] bg-white p-0.5">
              <button onClick={() => setView("list")} className={`rounded-md px-2 py-1 text-xs ${view === "list" ? "bg-[var(--accent)] text-white" : "text-[var(--text-dim)]"}`}>☰</button>
              <button onClick={() => setView("grid")} className={`rounded-md px-2 py-1 text-xs ${view === "grid" ? "bg-[var(--accent)] text-white" : "text-[var(--text-dim)]"}`}>⊞</button>
            </div>
          </div>

          {uploading && (
            <div className="px-4 py-2">
              <div className="h-2 rounded-full bg-[var(--border)] overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-[#6d5cff] to-[#38bdf8] transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4">
            {view === "list" ? (
              <div className="glass rounded-2xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-dim)]">
                      <th className="px-4 py-3">Document</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Size</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Tags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(d => (
                      <tr key={d.id} onClick={() => setSelectedDoc(d)} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-card-hover)] cursor-pointer">
                        <td className="px-4 py-3"><div className="flex items-center gap-2"><span className="text-lg">{fileIcons[d.file_type] || "📄"}</span><span className="text-sm font-medium">{d.title}</span></div></td>
                        <td className="px-4 py-3 text-xs text-[var(--text-dim)] uppercase">{d.file_type}</td>
                        <td className="px-4 py-3 text-xs text-[var(--text-dim)]">{(d.file_size / 1024).toFixed(1)} KB</td>
                        <td className="px-4 py-3"><span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-emerald-100 text-emerald-600">{d.status}</span></td>
                        <td className="px-4 py-3"><div className="flex gap-1">{d.tags.map(t => <span key={t.id} className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: t.color + "20", color: t.color }}>{t.name}</span>)}</div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map(d => (
                  <div key={d.id} onClick={() => setSelectedDoc(d)} className="glass rounded-xl p-4 cursor-pointer hover:translate-y-[-2px] transition-all">
                    <div className="mb-3 text-3xl">{fileIcons[d.file_type] || "📄"}</div>
                    <h4 className="text-sm font-medium truncate">{d.title}</h4>
                    <p className="mt-1 text-xs text-[var(--text-dim)]">{(d.file_size / 1024).toFixed(1)} KB</p>
                    <div className="mt-2 flex gap-1">{d.tags.map(t => <span key={t.id} className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: t.color + "20", color: t.color }}>{t.name}</span>)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Q&A Bar */}
          <div className="border-t border-[var(--border)] bg-white px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-dim)]">🔍</span>
              <input value={qaQuestion} onChange={e => setQaQuestion(e.target.value)} onKeyDown={e => e.key === "Enter" && askQuestion()}
                placeholder={selectedDoc ? `Ask about ${selectedDoc.title}...` : "Ask across all documents..."}
                className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]" />
              <button onClick={askQuestion} disabled={!qaQuestion.trim()} className="btn-primary rounded-lg px-4 py-2 text-sm disabled:opacity-50">Ask</button>
            </div>
            {qaAnswer && (
              <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4">
                <p className="text-sm whitespace-pre-wrap">{qaAnswer.answer}</p>
                {qaAnswer.sources?.length > 0 && (
                  <div className="mt-3 border-t border-[var(--border)] pt-3">
                    <p className="text-xs font-semibold text-[var(--text-dim)] mb-1">Sources:</p>
                    {qaAnswer.sources.map((s: any, i: number) => (
                      <p key={i} className="text-xs text-[var(--text-dim)]">📄 {s.document} — Page {s.page} ({(s.relevance * 100).toFixed(0)}%)</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
