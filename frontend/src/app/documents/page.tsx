"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import { documents as docsApi, Document, Folder, Tag, DocumentQA } from "@/lib/api";

const fileIcons: Record<string, string> = { pdf: "📄", docx: "📝", txt: "📃", csv: "📊", md: "📋" };

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [tagsList, setTags] = useState<Tag[]>([]);
  const [activeFolder, setActiveFolder] = useState<number | null>(null);
  const [activeTag, setActiveTag] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"list" | "grid">("list");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [qaQuestion, setQaQuestion] = useState("");
  const [qaAnswer, setQaAnswer] = useState<DocumentQA | null>(null);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [showNewTag, setShowNewTag] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [d, f, t] = await Promise.all([docsApi.list(), docsApi.listFolders(), docsApi.listTags()]);
      setDocs(d); setFolders(f); setTags(t);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(async () => {
      const params: any = {};
      if (activeFolder) params.folder_id = activeFolder;
      if (activeTag) params.tag_id = activeTag;
      if (search) params.search = search;
      const d = await docsApi.list(params);
      setDocs(d);
    }, 300);
    return () => clearTimeout(timer);
  }, [activeFolder, activeTag, search]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setUploadProgress(0);
    try {
      const doc = await docsApi.upload(file, activeFolder, (p) => setUploadProgress(p));
      setDocs((prev) => [doc, ...prev]);
    } catch (e) { console.error(e); }
    setUploading(false); setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const deleteDoc = async (id: number) => {
    if (!confirm("Delete this document?")) return;
    try { await docsApi.delete(id); setDocs((prev) => prev.filter((d) => d.id !== id)); } catch {}
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const f = await docsApi.createFolder(newFolderName, "#6d5cff");
      setFolders((prev) => [...prev, f]);
      setNewFolderName(""); setShowNewFolder(false);
    } catch {}
  };

  const deleteFolder = async (id: number) => {
    if (!confirm("Delete folder? Documents will be moved to root.")) return;
    try { await docsApi.deleteFolder(id); setFolders((prev) => prev.filter((f) => f.id !== id)); } catch {}
  };

  const createTag = async () => {
    if (!newTagName.trim()) return;
    try {
      const t = await docsApi.createTag(newTagName, "#6d5cff");
      setTags((prev) => [...prev, t]);
      setNewTagName(""); setShowNewTag(false);
    } catch {}
  };

  const deleteTag = async (id: number) => {
    if (!confirm("Delete tag?")) return;
    try { await docsApi.deleteTag(id); setTags((prev) => prev.filter((t) => t.id !== id)); } catch {}
  };

  const askQuestion = async () => {
    if (!qaQuestion.trim()) return;
    try {
      const res = selectedDoc
        ? await docsApi.qa(selectedDoc.id, qaQuestion)
        : await docsApi.qaAll(qaQuestion);
      setQaAnswer(res);
    } catch (e) { console.error(e); }
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-64px)] -m-4 lg:-m-6">
        {/* Sidebar */}
        <div className="w-64 shrink-0 border-r border-[var(--border)] bg-white p-4 overflow-y-auto hidden md:block">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase text-[var(--text-dim)]">Folders</h3>
              <button onClick={() => setShowNewFolder(!showNewFolder)} className="text-xs text-[var(--accent)] hover:underline">+ New</button>
            </div>
            {showNewFolder && (
              <div className="flex gap-1 mb-2">
                <input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createFolder()}
                  placeholder="Folder name" className="flex-1 rounded-lg border border-[var(--border)] px-2 py-1 text-xs outline-none" autoFocus />
                <button onClick={createFolder} className="text-xs text-[var(--accent)]">✓</button>
              </div>
            )}
            <div className="space-y-1">
              <button onClick={() => setActiveFolder(null)} className={`w-full rounded-lg px-3 py-2 text-sm text-left transition ${!activeFolder ? "bg-[#6d5cff]/8 text-[var(--accent)]" : "hover:bg-[var(--bg-card-hover)]"}`}>All Documents</button>
              {folders.map((f) => (
                <button key={f.id} onClick={() => setActiveFolder(f.id)}
                  className={`w-full rounded-lg px-3 py-2 text-sm text-left flex items-center gap-2 transition ${activeFolder === f.id ? "bg-[#6d5cff]/8 text-[var(--accent)]" : "hover:bg-[var(--bg-card-hover)]"}`}>
                  <span className="h-3 w-3 rounded-full shrink-0" style={{ background: f.color }} />
                  <span className="flex-1 truncate">{f.name}</span>
                  <span className="text-xs text-[var(--text-dim)]">{f.document_count}</span>
                  <button onClick={(e) => { e.stopPropagation(); deleteFolder(f.id); }} className="text-[10px] text-gray-400 hover:text-red-500">×</button>
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase text-[var(--text-dim)]">Tags</h3>
              <button onClick={() => setShowNewTag(!showNewTag)} className="text-xs text-[var(--accent)] hover:underline">+ New</button>
            </div>
            {showNewTag && (
              <div className="flex gap-1 mb-2">
                <input value={newTagName} onChange={(e) => setNewTagName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createTag()}
                  placeholder="Tag name" className="flex-1 rounded-lg border border-[var(--border)] px-2 py-1 text-xs outline-none" autoFocus />
                <button onClick={createTag} className="text-xs text-[var(--accent)]">✓</button>
              </div>
            )}
            <div className="flex flex-wrap gap-1.5">
              {tagsList.map((t) => (
                <button key={t.id} onClick={() => setActiveTag(activeTag === t.id ? null : t.id)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${activeTag === t.id ? "ring-2 ring-[var(--accent)]" : ""}`}
                  style={{ background: t.color + "20", color: t.color }}>
                  {t.name}
                  <span onClick={(e) => { e.stopPropagation(); deleteTag(t.id); }} className="ml-1 hover:text-red-500">×</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center gap-3 border-b border-[var(--border)] bg-white px-4 py-3">
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="btn-primary rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50">
              {uploading ? `Uploading ${uploadProgress}%` : "Upload"}
            </button>
            <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt,.csv,.md" onChange={handleUpload} className="hidden" />
            <input type="text" placeholder="Search documents..." value={search} onChange={(e) => setSearch(e.target.value)}
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
            {loading ? (
              <div className="text-center py-12 text-[var(--text-dim)]">Loading documents...</div>
            ) : view === "list" ? (
              <div className="glass rounded-2xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-dim)]">
                      <th className="px-4 py-3">Document</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Size</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Tags</th><th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {docs.map((d) => (
                      <tr key={d.id} onClick={() => setSelectedDoc(d)} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-card-hover)] cursor-pointer">
                        <td className="px-4 py-3"><div className="flex items-center gap-2"><span className="text-lg">{fileIcons[d.file_type] || "📄"}</span><span className="text-sm font-medium">{d.title}</span></div></td>
                        <td className="px-4 py-3 text-xs text-[var(--text-dim)] uppercase">{d.file_type}</td>
                        <td className="px-4 py-3 text-xs text-[var(--text-dim)]">{(d.file_size / 1024).toFixed(1)} KB</td>
                        <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${d.status === "ready" ? "bg-emerald-100 text-emerald-600" : d.status === "processing" ? "bg-amber-100 text-amber-600" : "bg-red-100 text-red-600"}`}>{d.status}</span></td>
                        <td className="px-4 py-3"><div className="flex gap-1">{d.tags.map((t) => <span key={t.id} className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: t.color + "20", color: t.color }}>{t.name}</span>)}</div></td>
                        <td className="px-4 py-3"><button onClick={(e) => { e.stopPropagation(); deleteDoc(d.id); }} className="text-xs text-gray-400 hover:text-red-500">🗑️</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {docs.map((d) => (
                  <div key={d.id} onClick={() => setSelectedDoc(d)} className="glass rounded-xl p-4 cursor-pointer hover:translate-y-[-2px] transition-all">
                    <div className="mb-3 text-3xl">{fileIcons[d.file_type] || "📄"}</div>
                    <h4 className="text-sm font-medium truncate">{d.title}</h4>
                    <p className="mt-1 text-xs text-[var(--text-dim)]">{(d.file_size / 1024).toFixed(1)} KB</p>
                    <div className="mt-2 flex gap-1">{d.tags.map((t) => <span key={t.id} className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: t.color + "20", color: t.color }}>{t.name}</span>)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Q&A Bar */}
          <div className="border-t border-[var(--border)] bg-white px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-dim)]">🔍</span>
              <input value={qaQuestion} onChange={(e) => setQaQuestion(e.target.value)} onKeyDown={(e) => e.key === "Enter" && askQuestion()}
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
                      <p key={i} className="text-xs text-[var(--text-dim)]">📄 {s.document_title} — Chunk {s.chunk_index + 1} ({(s.relevance * 100).toFixed(0)}%)</p>
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
