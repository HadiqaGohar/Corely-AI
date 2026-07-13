"use client";

import { useEffect, useState } from "react";
import { workflows as workflowsApi, Workflow, WorkflowExecution } from "@/lib/api";
import AppLayout from "@/components/AppLayout";

export default function WorkflowsPage() {
  const [wfs, setWfs] = useState<Workflow[]>([]);
  const [selected, setSelected] = useState<Workflow | null>(null);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => { loadWorkflows(); }, []);

  const loadWorkflows = async () => {
    try {
      const data = await workflowsApi.list();
      setWfs(data);
    } catch {}
    setLoading(false);
  };

  const selectWorkflow = async (wf: Workflow) => {
    setSelected(wf);
    try {
      const execs = await workflowsApi.getExecutions(wf.id);
      setExecutions(execs);
    } catch {}
  };

  const toggleActive = async (wf: Workflow) => {
    try {
      const updated = await workflowsApi.toggleActive(wf.id, !wf.active);
      setWfs(prev => prev.map(w => w.id === wf.id ? updated : w));
      if (selected?.id === wf.id) setSelected(updated);
    } catch {}
  };

  const deleteWorkflow = async (id: number) => {
    if (!confirm("Delete this workflow?")) return;
    try {
      await workflowsApi.delete(id);
      setWfs(prev => prev.filter(w => w.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch {}
  };

  const executeWorkflow = async (wf: Workflow, dryRun: boolean) => {
    try {
      const result = await workflowsApi.execute(wf.id, dryRun);
      setTestResult(result);
      if (!dryRun) {
        const execs = await workflowsApi.getExecutions(wf.id);
        setExecutions(execs);
      }
    } catch (err: any) {
      setTestResult({ status: "failed", error: err.message });
    }
  };

  const loadTemplates = async () => {
    try {
      const data = await workflowsApi.getTemplates();
      setTemplates(data);
      setShowTemplates(true);
    } catch {}
  };

  const createFromTemplate = async (template: any) => {
    try {
      const wf = await workflowsApi.create({
        name: template.name,
        description: template.description,
        nodes: template.nodes,
        edges: template.edges,
      });
      setWfs(prev => [wf, ...prev]);
      setShowTemplates(false);
    } catch {}
  };

  const createWorkflow = async (name: string, description: string) => {
    try {
      const wf = await workflowsApi.create({
        name, description,
        nodes: [{ id: "trigger-1", type: "trigger", position: { x: 100, y: 200 }, data: { triggerType: "manual" } }],
        edges: [],
      });
      setWfs(prev => [wf, ...prev]);
      setShowCreate(false);
    } catch {}
  };

  return (
    <AppLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workflows</h1>
          <p className="text-sm text-[var(--text-dim)]">{wfs.length} workflows</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadTemplates} className="btn-ghost rounded-xl px-4 py-2 text-sm">Templates</button>
          <button onClick={() => setShowCreate(true)} className="btn-primary rounded-xl px-4 py-2 text-sm font-medium">+ New Workflow</button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Workflow list */}
        <div className="space-y-3">
          {wfs.map(wf => (
            <div key={wf.id} onClick={() => selectWorkflow(wf)} className={`glass rounded-xl p-4 cursor-pointer transition-all hover:translate-y-[-1px] ${selected?.id === wf.id ? "ring-2 ring-[var(--accent)]" : ""}`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold">{wf.name}</h3>
                  <p className="mt-1 text-xs text-[var(--text-dim)] line-clamp-2">{wf.description || "No description"}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); toggleActive(wf); }} className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium transition ${wf.active ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-500"}`}>
                  {wf.active ? "Active" : "Paused"}
                </button>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-[var(--text-dim)]">
                <span>{wf.nodes?.length || 0} nodes</span>
                <span>·</span>
                <span>{new Date(wf.updated_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
          {wfs.length === 0 && !loading && (
            <div className="glass rounded-2xl p-8 text-center">
              <div className="mb-3 text-4xl">⚡</div>
              <p className="text-sm text-[var(--text-dim)]">No workflows yet. Create one or use a template.</p>
            </div>
          )}
        </div>

        {/* Workflow detail */}
        <div className="lg:col-span-2">
          {selected ? (
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold">{selected.name}</h2>
                  <p className="text-sm text-[var(--text-dim)]">{selected.description}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => executeWorkflow(selected, true)} className="btn-ghost rounded-xl px-3 py-2 text-xs">Test</button>
                  <button onClick={() => executeWorkflow(selected, false)} className="btn-primary rounded-xl px-3 py-2 text-xs">Run</button>
                  <button onClick={() => deleteWorkflow(selected.id)} className="text-xs text-red-400 hover:text-red-600 px-2">Delete</button>
                </div>
              </div>

              {/* Visual builder placeholder */}
              <div className="mb-6 rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--bg)] p-8 text-center min-h-[200px] flex flex-col items-center justify-center">
                <p className="text-sm text-[var(--text-dim)] mb-2">Workflow Builder</p>
                <p className="text-xs text-[var(--text-dim)]">
                  {selected.nodes?.length || 0} nodes · {selected.edges?.length || 0} connections
                </p>
                <div className="mt-4 flex gap-2 flex-wrap justify-center">
                  {(selected.nodes || []).map((node: any) => (
                    <div key={node.id} className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs">
                      <span className="mr-1">{node.type === "trigger" ? "🎯" : "⚡"}</span>
                      {node.data?.triggerType || node.data?.actionType || node.type}
                    </div>
                  ))}
                </div>
              </div>

              {/* Test result */}
              {testResult && (
                <div className={`mb-6 rounded-xl border p-4 ${testResult.status === "success" ? "border-emerald-200 bg-emerald-50" : testResult.status === "failed" ? "border-red-200 bg-red-50" : "border-[var(--border)] bg-[var(--bg)]"}`}>
                  <p className="text-sm font-medium">{testResult.status === "success" ? "✅ Execution successful" : testResult.status === "failed" ? "❌ Execution failed" : "⏳ Running..."}</p>
                  {testResult.steps && (
                    <div className="mt-2 space-y-1">
                      {testResult.steps.map((s: any, i: number) => (
                        <p key={i} className="text-xs text-[var(--text-dim)]">Step {i + 1}: {s.status} — {s.message || s.action}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Execution history */}
              <div>
                <h3 className="mb-3 text-sm font-semibold">Execution History</h3>
                {executions.length === 0 ? (
                  <p className="text-xs text-[var(--text-dim)]">No executions yet</p>
                ) : (
                  <div className="space-y-2">
                    {executions.map(ex => (
                      <div key={ex.id} className="flex items-center gap-3 rounded-lg border border-[var(--border)] px-4 py-3">
                        <span className={`h-2 w-2 rounded-full ${ex.status === "success" ? "bg-emerald-400" : ex.status === "failed" ? "bg-red-400" : "bg-amber-400"}`} />
                        <span className="text-sm">{ex.status}</span>
                        <span className="text-xs text-[var(--text-dim)]">{new Date(ex.started_at).toLocaleString()}</span>
                        {ex.completed_at && <span className="text-xs text-[var(--text-dim)]">({((new Date(ex.completed_at).getTime() - new Date(ex.started_at).getTime()) / 1000).toFixed(1)}s)</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="glass rounded-2xl p-12 text-center">
              <div className="mb-3 text-4xl">⚡</div>
              <p className="text-sm text-[var(--text-dim)]">Select a workflow to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && <CreateWorkflowModal onClose={() => setShowCreate(false)} onSave={createWorkflow} />}

      {/* Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowTemplates(false)}>
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-bold">Workflow Templates</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {templates.map((t, i) => (
                <div key={i} className="rounded-xl border border-[var(--border)] p-4 hover:bg-[var(--bg-card-hover)] cursor-pointer" onClick={() => createFromTemplate(t)}>
                  <h4 className="text-sm font-semibold">{t.name}</h4>
                  <p className="mt-1 text-xs text-[var(--text-dim)]">{t.description}</p>
                </div>
              ))}
              {templates.length === 0 && <p className="col-span-2 text-center text-sm text-[var(--text-dim)] py-8">No templates available</p>}
            </div>
            <button onClick={() => setShowTemplates(false)} className="mt-4 btn-ghost rounded-xl px-4 py-2 text-sm w-full">Close</button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function CreateWorkflowModal({ onClose, onSave }: { onClose: () => void; onSave: (name: string, desc: string) => void }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-bold">New Workflow</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)]" placeholder="My Workflow" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)]" placeholder="What does this workflow do?" />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost rounded-xl px-4 py-2 text-sm">Cancel</button>
          <button onClick={() => name.trim() && onSave(name, desc)} disabled={!name.trim()} className="btn-primary rounded-xl px-4 py-2 text-sm disabled:opacity-50">Create</button>
        </div>
      </div>
    </div>
  );
}
