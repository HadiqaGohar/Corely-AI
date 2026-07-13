"use client";

import { useState } from "react";
import AppLayout from "@/components/AppLayout";

const initWfs = [
  { id: 1, name: "Document Auto-Tag", description: "Automatically tag uploaded documents based on content", active: true, nodes: [{ id: "t1", type: "trigger" }, { id: "a1", type: "action" }], edges: [{ from: "t1", to: "a1" }], updated_at: "2026-07-13T06:00:00Z" },
  { id: 2, name: "Task Reminder", description: "Send notifications for overdue tasks every hour", active: true, nodes: [{ id: "t1", type: "trigger" }, { id: "a1", type: "action" }, { id: "a2", type: "action" }], edges: [{ from: "t1", to: "a1" }, { from: "a1", to: "a2" }], updated_at: "2026-07-12T18:00:00Z" },
  { id: 3, name: "Chat Summary", description: "Daily summary of chat sessions", active: false, nodes: [{ id: "t1", type: "trigger" }, { id: "a1", type: "action" }], edges: [{ from: "t1", to: "a1" }], updated_at: "2026-07-11T12:00:00Z" },
];

const templates = [
  { name: "Document Auto-Tag", description: "Auto-tag uploads with AI" },
  { name: "Task Reminder", description: "Remind about overdue tasks" },
  { name: "Chat Summary", description: "Daily chat digest" },
  { name: "Webhook Relay", description: "Forward events via webhook" },
];

export default function WorkflowsPage() {
  const [wfs, setWfs] = useState(initWfs);
  const [selected, setSelected] = useState<any>(wfs[0]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const toggleActive = (id: number) => setWfs(prev => prev.map(w => w.id === id ? { ...w, active: !w.active } : w));
  const deleteWf = (id: number) => { if (confirm("Delete?")) { setWfs(prev => prev.filter(w => w.id !== id)); if (selected?.id === id) setSelected(null); } };

  const runTest = () => {
    setTestResult({ status: "success", steps: [{ action: "Trigger fired", status: "success" }, { action: "Action executed", status: "success" }] });
    setTimeout(() => setTestResult(null), 5000);
  };

  const createFromTemplate = (t: any) => {
    const wf = { id: Date.now(), name: t.name, description: t.description, active: true, nodes: [{ id: "t1", type: "trigger" }, { id: "a1", type: "action" }], edges: [{ from: "t1", to: "a1" }], updated_at: new Date().toISOString() };
    setWfs(prev => [wf, ...prev]);
    setShowTemplates(false);
  };

  return (
    <AppLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold">Workflows</h1><p className="text-sm text-[var(--text-dim)]">{wfs.length} workflows</p></div>
        <div className="flex gap-2">
          <button onClick={() => setShowTemplates(true)} className="btn-ghost rounded-xl px-4 py-2 text-sm">Templates</button>
          <button onClick={() => { const wf = { id: Date.now(), name: "New Workflow", description: "", active: true, nodes: [{ id: "t1", type: "trigger" }], edges: [], updated_at: new Date().toISOString() }; setWfs(prev => [wf, ...prev]); setSelected(wf); }} className="btn-primary rounded-xl px-4 py-2 text-sm font-medium">+ New Workflow</button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3">
          {wfs.map(wf => (
            <div key={wf.id} onClick={() => setSelected(wf)} className={`glass rounded-xl p-4 cursor-pointer transition-all hover:translate-y-[-1px] ${selected?.id === wf.id ? "ring-2 ring-[var(--accent)]" : ""}`}>
              <div className="flex items-start justify-between">
                <div><h3 className="text-sm font-semibold">{wf.name}</h3><p className="mt-1 text-xs text-[var(--text-dim)] line-clamp-2">{wf.description || "No description"}</p></div>
                <button onClick={e => { e.stopPropagation(); toggleActive(wf.id); }} className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium transition ${wf.active ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-500"}`}>{wf.active ? "Active" : "Paused"}</button>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-[var(--text-dim)]">
                <span>{wf.nodes.length} nodes</span><span>·</span><span>{new Date(wf.updated_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-2">
          {selected ? (
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div><h2 className="text-lg font-bold">{selected.name}</h2><p className="text-sm text-[var(--text-dim)]">{selected.description}</p></div>
                <div className="flex gap-2">
                  <button onClick={runTest} className="btn-ghost rounded-xl px-3 py-2 text-xs">Test</button>
                  <button onClick={() => deleteWf(selected.id)} className="text-xs text-red-400 hover:text-red-600 px-2">Delete</button>
                </div>
              </div>

              <div className="mb-6 rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--bg)] p-8 text-center min-h-[200px] flex flex-col items-center justify-center">
                <p className="text-sm text-[var(--text-dim)] mb-2">Workflow Builder</p>
                <div className="mt-4 flex gap-2 flex-wrap justify-center">
                  {selected.nodes.map((n: any) => (
                    <div key={n.id} className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs">
                      <span className="mr-1">{n.type === "trigger" ? "🎯" : "⚡"}</span>{n.type}
                    </div>
                  ))}
                </div>
              </div>

              {testResult && (
                <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm font-medium">✅ Test passed</p>
                  {testResult.steps.map((s: any, i: number) => <p key={i} className="text-xs text-[var(--text-dim)] mt-1">Step {i + 1}: {s.action}</p>)}
                </div>
              )}

              <div>
                <h3 className="mb-3 text-sm font-semibold">Execution History</h3>
                <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] px-4 py-3">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" /><span className="text-sm">success</span>
                  <span className="text-xs text-[var(--text-dim)]">{new Date().toLocaleString()}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass rounded-2xl p-12 text-center"><div className="mb-3 text-4xl">⚡</div><p className="text-sm text-[var(--text-dim)]">Select a workflow</p></div>
          )}
        </div>
      </div>

      {showTemplates && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowTemplates(false)}>
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-bold">Workflow Templates</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {templates.map((t, i) => (
                <div key={i} className="rounded-xl border border-[var(--border)] p-4 hover:bg-[var(--bg-card-hover)] cursor-pointer" onClick={() => createFromTemplate(t)}>
                  <h4 className="text-sm font-semibold">{t.name}</h4><p className="mt-1 text-xs text-[var(--text-dim)]">{t.description}</p>
                </div>
              ))}
            </div>
            <button onClick={() => setShowTemplates(false)} className="mt-4 btn-ghost rounded-xl px-4 py-2 text-sm w-full">Close</button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
