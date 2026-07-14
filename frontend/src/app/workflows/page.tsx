"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { workflows as wfApi, Workflow as ApiWorkflow, WorkflowExecution } from "@/lib/api";

interface WFNode { id: string; type: "trigger" | "action"; label: string; subType: string; x: number; y: number; config: Record<string, string> }
interface WFEdge { id: string; from: string; to: string }

const TRIGGER_TYPES = [
  { key: "doc_uploaded", label: "Document Uploaded", icon: "📄" },
  { key: "task_overdue", label: "Task Overdue", icon: "⏰" },
  { key: "chat_message", label: "Chat Message", icon: "💬" },
  { key: "manual", label: "Manual", icon: "👤" },
];
const ACTION_TYPES = [
  { key: "send_notification", label: "Send Notification", icon: "🔔" },
  { key: "create_task", label: "Create Task", icon: "✅" },
  { key: "call_webhook", label: "Call Webhook", icon: "🌐" },
];

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeWf, setActiveWf] = useState<any | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [nodes, setNodes] = useState<WFNode[]>([]);
  const [edges, setEdges] = useState<WFEdge[]>([]);
  const [dragNode, setDragNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [executions, setExecutions] = useState<any[]>([]);
  const [showExecutions, setShowExecutions] = useState(false);
  const [showTest, setShowTest] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [wf, t] = await Promise.all([wfApi.list().catch(() => []), wfApi.getTemplates().catch(() => [])]);
      setWorkflows(wf); setTemplates(t);
    } catch {} finally { setLoading(false); }
  };

  const loadWf = async (id: number) => {
    try {
      const wf = await wfApi.get(id);
      setActiveWf(wf);
      setNodes(wf.nodes || []);
      setEdges(wf.edges || []);
    } catch {}
  };

  const saveWf = async () => {
    if (!activeWf) return;
    try {
      const updated = await wfApi.update(activeWf.id, { nodes, edges });
      setActiveWf(updated);
      setWorkflows((prev) => prev.map((w) => w.id === updated.id ? updated : w));
      setEditMode(false);
    } catch {}
  };

  const createWf = async () => {
    if (!newName.trim()) return;
    try {
      const wf = await wfApi.create({ name: newName, description: newDesc, nodes: [], edges: [] });
      setWorkflows((prev) => [wf, ...prev]);
      setNewName(""); setNewDesc(""); setShowCreate(false);
      loadWf(wf.id);
    } catch {}
  };

  const deleteWf = async (id: number) => {
    if (!confirm("Delete this workflow?")) return;
    try { await wfApi.delete(id); setWorkflows((prev) => prev.filter((w) => w.id !== id)); if (activeWf?.id === id) setActiveWf(null); } catch {}
  };

  const toggleActive = async (id: number, active: boolean) => {
    try {
      const updated = await wfApi.toggleActive(id, active);
      setWorkflows((prev) => prev.map((w) => w.id === id ? updated : w));
      if (activeWf?.id === id) setActiveWf(updated);
    } catch {}
  };

  const executeWf = async (dryRun: boolean) => {
    if (!activeWf) return;
    try {
      const result = await wfApi.execute(activeWf.id, dryRun);
      setTestResult(result);
      if (!dryRun) loadExecutions(activeWf.id);
    } catch {}
  };

  const loadExecutions = async (id: number) => {
    try { const e = await wfApi.getExecutions(id); setExecutions(e); setShowExecutions(true); } catch {}
  };

  const addNode = (type: "trigger" | "action", subType: string) => {
    const types = type === "trigger" ? TRIGGER_TYPES : ACTION_TYPES;
    const def = types.find((t) => t.key === subType);
    const node: WFNode = {
      id: `node_${Date.now()}`,
      type,
      label: def?.label || subType,
      subType,
      x: 100 + nodes.length * 200,
      y: 200,
      config: {},
    };
    setNodes((prev) => [...prev, node]);
    if (nodes.length > 0) {
      const lastNode = nodes[nodes.length - 1];
      setEdges((prev) => [...prev, { id: `e_${Date.now()}`, from: lastNode.id, to: node.id }]);
    }
  };

  const removeNode = (id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setEdges((prev) => prev.filter((e) => e.from !== id && e.to !== id));
  };

  const onCanvasMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setDragNode(nodeId);
    const node = nodes.find((n) => n.id === nodeId);
    if (node) setDragOffset({ x: e.clientX - node.x, y: e.clientY - node.y });
  };

  const onCanvasMouseMove = (e: React.MouseEvent) => {
    if (!dragNode || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setNodes((prev) => prev.map((n) => n.id === dragNode ? { ...n, x, y } : n));
  };

  const onCanvasMouseUp = () => setDragNode(null);

  const updateNodeConfig = (nodeId: string, key: string, value: string) => {
    setNodes((prev) => prev.map((n) => n.id === nodeId ? { ...n, config: { ...n.config, [key]: value } } : n));
  };

  const loadTemplate = (tmpl: any) => {
    setNodes(tmpl.nodes || []);
    setEdges(tmpl.edges || []);
    setNewName(tmpl.name);
    setNewDesc(tmpl.description);
    setShowCreate(true);
  };

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Workflows</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary rounded-xl px-4 py-2 text-sm font-medium">+ New Workflow</button>
      </div>

      {/* Workflow List */}
      {!activeWf && (
        <>
          {loading ? (
            <div className="glass rounded-2xl p-16 text-center text-[var(--text-dim)]">Loading...</div>
          ) : workflows.length === 0 ? (
            <div className="glass rounded-2xl p-16 text-center">
              <div className="mb-4 text-5xl">⚡</div>
              <p className="text-lg font-semibold">No workflows yet</p>
              <p className="mt-1 text-sm text-[var(--text-dim)]">Create your first automation workflow</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {workflows.map((wf) => (
                <div key={wf.id} className="glass rounded-xl p-5 hover:translate-y-[-2px] transition-all cursor-pointer" onClick={() => loadWf(wf.id)}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{wf.name}</h3>
                      <p className="text-xs text-[var(--text-dim)] mt-1">{wf.description || "No description"}</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); toggleActive(wf.id, !wf.active); }}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${wf.active ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-500"}`}>
                      {wf.active ? "Active" : "Paused"}
                    </button>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[var(--text-dim)]">
                    <span>{wf.nodes?.length || 0} nodes</span>
                    <span>{wf.edges?.length || 0} connections</span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); loadWf(wf.id); setEditMode(true); }} className="text-xs text-[var(--accent)] hover:underline">Edit</button>
                    <button onClick={(e) => { e.stopPropagation(); deleteWf(wf.id); }} className="text-xs text-red-400 hover:underline">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Templates */}
          {templates.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-4 text-sm font-semibold">📋 Templates</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {templates.map((t, i) => (
                  <button key={i} onClick={() => loadTemplate(t)} className="glass rounded-xl p-4 text-left hover:translate-y-[-2px] transition-all">
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="mt-1 text-xs text-[var(--text-dim)]">{t.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Modal */}
      {showCreate && !activeWf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="glass rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">New Workflow</h2>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Workflow name" className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm mb-3 outline-none" autoFocus />
            <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description (optional)" rows={2} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm mb-4 outline-none resize-none" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="rounded-lg px-4 py-2 text-sm text-[var(--text-dim)] hover:bg-[var(--bg-card-hover)]">Cancel</button>
              <button onClick={createWf} className="btn-primary rounded-lg px-4 py-2 text-sm font-medium">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Workflow Canvas */}
      {activeWf && (
        <div className="flex flex-col h-[calc(100vh-200px)]">
          {/* Toolbar */}
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => { setActiveWf(null); setEditMode(false); }} className="text-sm text-[var(--accent)] hover:underline">← Back</button>
            <h2 className="font-semibold">{activeWf.name}</h2>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${activeWf.active ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-500"}`}>{activeWf.active ? "Active" : "Paused"}</span>
            <div className="flex-1" />
            {!editMode ? (
              <button onClick={() => setEditMode(true)} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-[var(--bg-card-hover)]">Edit</button>
            ) : (
              <button onClick={saveWf} className="btn-primary rounded-lg px-3 py-1.5 text-xs font-medium">Save</button>
            )}
            <button onClick={() => executeWf(true)} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-[var(--bg-card-hover)]">🧪 Test</button>
            <button onClick={() => executeWf(false)} className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs text-white hover:bg-emerald-600">▶ Run</button>
            <button onClick={() => loadExecutions(activeWf.id)} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-[var(--bg-card-hover)]">📜 History</button>
          </div>

          {/* Node Palette */}
          {editMode && (
            <div className="flex gap-4 mb-4 p-3 glass rounded-xl">
              <div>
                <p className="text-[10px] font-semibold text-[var(--text-dim)] mb-1">TRIGGERS</p>
                <div className="flex gap-1.5">
                  {TRIGGER_TYPES.map((t) => (
                    <button key={t.key} onClick={() => addNode("trigger", t.key)} className="rounded-lg border border-[var(--border)] px-2 py-1.5 text-xs hover:bg-[var(--bg-card-hover)]">
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-[var(--text-dim)] mb-1">ACTIONS</p>
                <div className="flex gap-1.5">
                  {ACTION_TYPES.map((t) => (
                    <button key={t.key} onClick={() => addNode("action", t.key)} className="rounded-lg border border-[var(--border)] px-2 py-1.5 text-xs hover:bg-[var(--bg-card-hover)]">
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Canvas */}
          <div ref={canvasRef} className="flex-1 glass rounded-2xl relative overflow-hidden cursor-crosshair"
            onMouseMove={onCanvasMouseMove} onMouseUp={onCanvasMouseUp} onMouseLeave={onCanvasMouseUp}>
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {edges.map((e) => {
                const from = nodes.find((n) => n.id === e.from);
                const to = nodes.find((n) => n.id === e.to);
                if (!from || !to) return null;
                return <line key={e.id} x1={from.x + 75} y1={from.y + 25} x2={to.x + 75} y2={to.y + 25} stroke="#6d5cff" strokeWidth="2" markerEnd="url(#arrow)" />;
              })}
              <defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#6d5cff" /></marker></defs>
            </svg>
            {nodes.map((n) => (
              <div key={n.id} className={`absolute rounded-xl border-2 p-3 cursor-move select-none ${n.type === "trigger" ? "border-blue-400 bg-blue-50" : "border-emerald-400 bg-emerald-50"} ${selectedNode === n.id ? "ring-2 ring-[var(--accent)]" : ""}`}
                style={{ left: n.x, top: n.y, width: 150 }}
                onMouseDown={(e) => onCanvasMouseDown(e, n.id)} onClick={() => { setSelectedNode(n.id); setShowConfig(true); }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{n.type === "trigger" ? "⚡" : "▶"} {n.label}</span>
                  {editMode && <button onClick={(e) => { e.stopPropagation(); removeNode(n.id); }} className="text-[10px] text-red-400 hover:text-red-600">×</button>}
                </div>
                {n.config && Object.keys(n.config).length > 0 && (
                  <p className="mt-1 text-[10px] text-[var(--text-dim)] truncate">{Object.values(n.config).join(", ")}</p>
                )}
              </div>
            ))}
            {nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-[var(--text-dim)]">
                <p className="text-sm">{editMode ? "Add nodes from the palette above" : "No nodes configured"}</p>
              </div>
            )}
          </div>

          {/* Config Panel */}
          {showConfig && selectedNode && (
            <div className="fixed right-0 top-0 h-full w-80 bg-white border-l border-[var(--border)] shadow-xl z-50 p-4 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm">Node Config</h3>
                <button onClick={() => setShowConfig(false)} className="text-[var(--text-dim)] hover:text-black">×</button>
              </div>
              {(() => {
                const node = nodes.find((n) => n.id === selectedNode);
                if (!node) return null;
                const configFields: Record<string, string[]> = {
                  send_notification: ["message"],
                  create_task: ["title", "description"],
                  call_webhook: ["webhook_url", "method"],
                };
                const fields = configFields[node.subType] || [];
                return (
                  <div className="space-y-3">
                    <div><p className="text-xs text-[var(--text-dim)] mb-1">Type</p><p className="text-sm font-medium">{node.type}: {node.label}</p></div>
                    {fields.map((f) => (
                      <div key={f}>
                        <label className="text-xs text-[var(--text-dim)] mb-1 block">{f.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</label>
                        <input value={node.config[f] || ""} onChange={(e) => updateNodeConfig(node.id, f, e.target.value)}
                          className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm outline-none" placeholder={`Enter ${f.replace(/_/g, " ")}`} />
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Test Result */}
          {testResult && (
            <div className="fixed bottom-4 right-4 w-96 glass rounded-xl shadow-xl z-50 p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">Test Result ({testResult.status})</h3>
                <button onClick={() => setTestResult(null)} className="text-[var(--text-dim)]">×</button>
              </div>
              {(testResult.steps || []).map((s: any, i: number) => (
                <div key={i} className="flex items-center gap-2 py-1 text-xs">
                  <span>{s.status === "success" ? "✅" : s.status === "dry_run" ? "🧪" : "❌"}</span>
                  <span>{s.label}</span>
                  {s.result && <span className="text-[var(--text-dim)] ml-auto">{s.result}</span>}
                </div>
              ))}
            </div>
          )}

          {/* Executions History */}
          {showExecutions && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="glass rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold">Execution History</h2>
                  <button onClick={() => setShowExecutions(false)} className="text-[var(--text-dim)]">×</button>
                </div>
                {executions.length === 0 ? <p className="text-sm text-[var(--text-dim)]">No executions yet</p> : executions.map((e) => (
                  <div key={e.id} className="border border-[var(--border)] rounded-lg p-3 mb-2">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-medium ${e.status === "success" ? "text-emerald-600" : "text-red-600"}`}>{e.status}</span>
                      <span className="text-xs text-[var(--text-dim)]">{new Date(e.started_at).toLocaleString()}</span>
                    </div>
                    {(e.steps || []).map((s: any, i: number) => (
                      <div key={i} className="text-xs mt-1 text-[var(--text-dim)]">{s.status === "success" ? "✅" : "❌"} {s.label}: {s.result || s.status}</div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}
