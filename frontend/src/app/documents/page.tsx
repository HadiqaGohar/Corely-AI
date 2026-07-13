"use client";

import { useEffect, useState, useRef } from "react";
import { documents as docsApi, Document, Folder, Tag } from "@/lib/api";
import AppLayout from "@/components/AppLayout";

type ViewMode = "list" | "grid";

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [activeFolder, setActiveFolder] = useState<number | null>(null);
  const [activeTag, setActiveTag] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>("list");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [showNewTag, setShowNewTag] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [qaQuestion, setQaQuestion] = useState("");
  const [qaAnswer, setQaAnswer] = useState<any>(null);
  const [qaLoading, setQaLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const [d, f, t] = await Promise.all([
        docsApi.list(), docsApi.listFolders(), docsApi.listTags(),
      ]);
      setDocs(d); setFolders(f); setTags(t);
    } catch {}
    setLoading(false);
  };

  const filtered = docs.filter(d => {
    if (activeFolder && d.folder_id !== activeFolder) return false;
    if (activeTag && !d.tags?.some(t => t.id === activeTag)) return false;
    if (search && !d.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      await docsApi.upload(file, activeFolder, setUploadProgress);
      await loadAll();
    } catch (err: any) {
      alert(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      await docsApi.upload(file, activeFolder, setUploadProgress);
      await loadAll();
    } catch (err: any) {
      alert(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const deleteDoc = async (id: number) => {
    if (!confirm("Delete this document?")) return;
    try {
      await docsApi.delete(id);
      setDocs(prev => prev.filter(d => d.id !== id));
      if (selectedDoc?.id === id) setSelectedDoc(null);
    } catch {}
  };

  const askQuestion = async () => {
    if (!qaQuestion.trim()) return;
    setQaLoading(true);
    try {
      const result = selectedDoc
        ? await docsApi.qa(selectedDoc.id, qaQuestion)
        : await docsApi.qaAll(qaQuestion);
      setQaAnswer(result);
    } catch (err: any) {
      setQaAnswer({ answer: "Error: " + (err.message || "Failed") });
    }
    setQaLoading(false);
  };

  const createFolder = async (name: string, color: string) => {
    try {
      const folder = await docsApi.createFolder(name, color);
      setFolders(prev => [...prev, folder]);
      setShowNewFolder(false);
    } catch {}
  };

  const createTag = async (name: string, color: string) => {
    try {
      const tag = await docsApi.createTag(name, color);
      setTags(prev => [...prev, tag]);
      setShowNewTag(false);
    } catch {}
  };

  const fileTypes: Record<string, string> = {
    pdf: "📄", docx: "📝", txt: "📃", csv: "📊", md: "📋",
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-64px)] -m-4 lg:-m-6">
        {/* Left sidebar: Folders & Tags */}
        <div className="w-64 shrink-0 border-r border-[var(--border)] bg-white p-4 overflow-y-auto hidden md:block">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase text-[var(--text-dim)]">Folders</h3>
              <button onClick={() => setShowNewFolder(true)} className="text-xs text-[var(--accent)] hover:underline">+ New</button>
            </div>
            <div className="space-y-1">
              <button onClick={() => setActiveFolder(null)} className={`w-full rounded-lg px-3 py-2 text-sm text-left transition ${!activeFolder ? "bg-[#6d5cff]/8 text-[var(--accent)]" : "hover:bg-[var(--bg-card-hover)]"}`}>
                All Documents
              </button>
              {folders.map(f => (
                <button key={f.id} onClick={() => setActiveFolder(f.id)} className={`w-full rounded-lg px-3 py-2 text-sm text-left flex items-center gap-2 transition ${activeFolder === f.id ? "bg-[#6d5cff]/8 text-[var(--accent)]" : "hover:bg-[var(--bg-card-hover)]"}`}>
                  <span className="h-3 w-3 rounded-full" style={{ background: f.color }} />
                  <span className="flex-1 truncate">{f.name}</span>
                  {f.document_count !== undefined && <span className="text-xs text-[var(--text-dim)]">{f.document_count}</span>}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase text-[var(--text-dim)]">Tags</h3>
              <button onClick={() => setShowNewTag(true)} className="text-xs text-[var(--accent)] hover:underline">+ New</button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tags.map(t => (
                <button key={t.id} onClick={() => setActiveTag(activeTag === t.id ? null : t.id)} className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${activeTag === t.id ? "ring-2 ring-[var(--accent)]" : ""}`} style={{ background: t.color + "20", color: t.color }}>
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Toolbar */}
          <div className="flex items-center gap-3 border-b border-[var(--border)] bg-white px-4 py-3">
            <input ref={fileRef} type="file" className="hidden" accept=".pdf,.docx,.txt,.csv,.md" onChange={handleUpload} />
            <button onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-primary rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50">
              {uploading ? `Uploading ${uploadProgress}%` : "Upload"}
            </button>
            <input type="text" placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]" />
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

          {/* Drop zone */}
          <div className="flex-1 overflow-y-auto p-4" onDragOver={e => e.preventDefault()} onDrop={handleDrop}>
            {view === "list" ? (
              <div className="glass rounded-2xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-dim)]">
                      <th className="px-4 py-3">Document</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Size</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Tags</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(d => (
                      <tr key={d.id} onClick={() => setSelectedDoc(d)} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-card-hover)] cursor-pointer">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{fileTypes[d.file_type] || "📄"}</span>
                            <span className="text-sm font-medium">{d.title}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--text-dim)] uppercase">{d.file_type}</td>
                        <td className="px-4 py-3 text-xs text-[var(--text-dim)]">{(d.file_size / 1024).toFixed(1)} KB</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${d.status === "ready" ? "bg-emerald-100 text-emerald-600" : d.status === "processing" ? "bg-amber-100 text-amber-600" : "bg-red-100 text-red-600"}`}>{d.status}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">{d.tags?.map(t => <span key={t.id} className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: t.color + "20", color: t.color }}>{t.name}</span>)}</div>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={(e) => { e.stopPropagation(); deleteDoc(d.id); }} className="text-xs text-red-400 hover:text-red-600">Delete</button>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-[var(--text-dim)]">
                        {loading ? "Loading..." : "No documents. Drop files here or click Upload."}
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map(d => (
                  <div key={d.id} onClick={() => setSelectedDoc(d)} className="glass rounded-xl p-4 cursor-pointer hover:translate-y-[-2px] transition-all">
                    <div className="mb-3 text-3xl">{fileTypes[d.file_type] || "📄"}</div>
                    <h4 className="text-sm font-medium truncate">{d.title}</h4>
                    <p className="mt-1 text-xs text-[var(--text-dim)]">{(d.file_size / 1024).toFixed(1)} KB</p>
                    <div className="mt-2 flex gap-1">{d.tags?.map(t => <span key={t.id} className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: t.color + "20", color: t.color }}>{t.name}</span>)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Q&A Bar */}
          <div className="border-t border-[var(--border)] bg-white px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-dim)]">🔍</span>
              <input value={qaQuestion} onChange={e => setQaQuestion(e.target.value)} onKeyDown={e => e.key === "Enter" && askQuestion()} placeholder={selectedDoc ? `Ask about ${selectedDoc.title}...` : "Ask across all documents..."} className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]" />
              <button onClick={askQuestion} disabled={qaLoading || !qaQuestion.trim()} className="btn-primary rounded-lg px-4 py-2 text-sm disabled:opacity-50">
                {qaLoading ? "..." : "Ask"}
              </button>
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

      {/* New Folder Modal */}
      {showNewFolder && <ColorModal title="New Folder" onClose={() => setShowNewFolder(false)} onSave={createFolder} />}
      {showNewTag && <ColorModal title="New Tag" onClose={() => setShowNewTag(false)} onSave={createTag} />}
    </AppLayout>
  );
}

function ColorModal({ title, onClose, onSave }: { title: string; onClose: () => void; onSave: (name: string, color: string) => void }) {
  const [name, setName] = useState("");
  const colors = ["#6d5cff", "#38bdf8", "#34d399", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6", "#06b6d4"];
  const [color, setColor] = useState(colors[0]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-80 rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-bold">{title}</h2>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" className="mb-3 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)]" />
        <div className="mb-4 flex gap-2 flex-wrap">
          {colors.map(c => (
            <button key={c} onClick={() => setColor(c)} className={`h-7 w-7 rounded-full transition ${color === c ? "ring-2 ring-offset-2 ring-[var(--accent)]" : ""}`} style={{ background: c }} />
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost rounded-xl px-4 py-2 text-sm">Cancel</button>
          <button onClick={() => name.trim() && onSave(name, color)} disabled={!name.trim()} className="btn-primary rounded-xl px-4 py-2 text-sm disabled:opacity-50">Create</button>
        </div>
      </div>
    </div>
  );
}
