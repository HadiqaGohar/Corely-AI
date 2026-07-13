"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import AppLayout from "@/components/AppLayout";

/* ─── Types ─── */

interface WFNode {
  id: string;
  type: "trigger" | "action";
  label: string;
  subType: string;
  x: number;
  y: number;
  config: Record<string, string>;
}

interface WFEdge {
  id: string;
  from: string;
  to: string;
}

interface Workflow {
  id: number;
  name: string;
  description: string;
  active: boolean;
  nodes: WFNode[];
  edges: WFEdge[];
  updated_at: string;
}

interface ExecStep {
  action: string;
  status: "success" | "error" | "pending";
  detail?: string;
  timestamp?: string;
  variables?: Record<string, string>;
}

/* ─── Node definitions ─── */

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

const AVAILABLE_VARIABLES: Record<string, string[]> = {
  trigger: ["{{doc_name}}", "{{doc_type}}", "{{task_title}}", "{{task_due}}", "{{chat_sender}}", "{{chat_text}}"],
  action: ["{{recipient}}", "{{message}}", "{{webhook_url}}", "{{task_title}}", "{{due_date}}"],
};

/* ─── Templates ─── */

const templates = [
  {
    name: "Document Auto-Tag",
    description: "Auto-tag uploads with AI",
    nodes: [
      { id: "t1", type: "trigger" as const, label: "Document Uploaded", subType: "doc_uploaded", x: 120, y: 200, config: {} },
      { id: "a1", type: "action" as const, label: "Send Notification", subType: "send_notification", x: 400, y: 200, config: { message: "New document: {{doc_name}}" } },
    ],
    edges: [{ id: "e1", from: "t1", to: "a1" }],
  },
  {
    name: "Task Reminder",
    description: "Remind about overdue tasks",
    nodes: [
      { id: "t1", type: "trigger" as const, label: "Task Overdue", subType: "task_overdue", x: 120, y: 200, config: {} },
      { id: "a1", type: "action" as const, label: "Send Notification", subType: "send_notification", x: 400, y: 120, config: { message: "Task overdue: {{task_title}}" } },
      { id: "a2", type: "action" as const, label: "Create Task", subType: "create_task", x: 400, y: 280, config: { title: "Follow up: {{task_title}}" } },
    ],
    edges: [{ id: "e1", from: "t1", to: "a1" }, { id: "e2", from: "t1", to: "a2" }],
  },
  {
    name: "Chat Summary",
    description: "Daily chat digest",
    nodes: [
      { id: "t1", type: "trigger" as const, label: "Manual", subType: "manual", x: 120, y: 200, config: {} },
      { id: "a1", type: "action" as const, label: "Call Webhook", subType: "call_webhook", x: 400, y: 200, config: { url: "https://api.example.com/summary" } },
    ],
    edges: [{ id: "e1", from: "t1", to: "a1" }],
  },
  {
    name: "Webhook Relay",
    description: "Forward events via webhook",
    nodes: [
      { id: "t1", type: "trigger" as const, label: "Chat Message", subType: "chat_message", x: 120, y: 200, config: {} },
      { id: "a1", type: "action" as const, label: "Call Webhook", subType: "call_webhook", x: 400, y: 200, config: { url: "https://hooks.example.com/relay" } },
    ],
    edges: [{ id: "e1", from: "t1", to: "a1" }],
  },
];

/* ─── Initial mock workflows ─── */

const initWfs: Workflow[] = [
  {
    id: 1, name: "Document Auto-Tag", description: "Automatically tag uploaded documents based on content", active: true,
    nodes: [
      { id: "t1", type: "trigger", label: "Document Uploaded", subType: "doc_uploaded", x: 100, y: 180, config: {} },
      { id: "a1", type: "action", label: "Send Notification", subType: "send_notification", x: 380, y: 180, config: { message: "Tagged: {{doc_name}}" } },
    ],
    edges: [{ id: "e1", from: "t1", to: "a1" }],
    updated_at: "2026-07-13T06:00:00Z",
  },
  {
    id: 2, name: "Task Reminder", description: "Send notifications for overdue tasks every hour", active: true,
    nodes: [
      { id: "t1", type: "trigger", label: "Task Overdue", subType: "task_overdue", x: 100, y: 180, config: {} },
      { id: "a1", type: "action", label: "Send Notification", subType: "send_notification", x: 380, y: 100, config: { message: "Overdue: {{task_title}}" } },
      { id: "a2", type: "action", label: "Create Task", subType: "create_task", x: 380, y: 260, config: { title: "Reminder: {{task_title}}" } },
    ],
    edges: [{ id: "e1", from: "t1", to: "a1" }, { id: "e2", from: "t1", to: "a2" }],
    updated_at: "2026-07-12T18:00:00Z",
  },
  {
    id: 3, name: "Chat Summary", description: "Daily summary of chat sessions", active: false,
    nodes: [
      { id: "t1", type: "trigger", label: "Manual", subType: "manual", x: 100, y: 180, config: {} },
      { id: "a1", type: "action", label: "Call Webhook", subType: "call_webhook", x: 380, y: 180, config: { url: "https://api.example.com/summary" } },
    ],
    edges: [{ id: "e1", from: "t1", to: "a1" }],
    updated_at: "2026-07-11T12:00:00Z",
  },
];

/* ─── Helper: generate unique ID ─── */

let _idCounter = 1000;
function uid(): string {
  return `n${++_idCounter}`;
}
function eid(): string {
  return `e${++_idCounter}`;
}

/* ─── Canvas Node component ─── */

function CanvasNode({
  node,
  selectedId,
  onDragStart,
  onDrag,
  onDragEnd,
  onSelect,
  onDoubleClick,
  onDelete,
  onPortMouseDown,
  onPortMouseUp,
  connecting,
}: {
  node: WFNode;
  selectedId: string | null;
  onDragStart: (e: React.MouseEvent, id: string) => void;
  onDrag: (e: React.MouseEvent, id: string) => void;
  onDragEnd: () => void;
  onSelect: (id: string) => void;
  onDoubleClick: (id: string) => void;
  onDelete: (id: string) => void;
  onPortMouseDown: (e: React.MouseEvent, nodeId: string) => void;
  onPortMouseUp: (e: React.MouseEvent, nodeId: string) => void;
  connecting: boolean;
}) {
  const isTrigger = node.type === "trigger";
  const isSelected = selectedId === node.id;
  const borderCol = isTrigger ? "#8b5cf6" : "#38bdf8";
  const bgCol = isTrigger ? "#f5f0ff" : "#f0f9ff";

  return (
    <div
      style={{
        position: "absolute",
        left: node.x,
        top: node.y,
        width: 180,
        zIndex: isSelected ? 20 : 10,
        cursor: "grab",
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        onSelect(node.id);
        onDragStart(e, node.id);
      }}
      onMouseMove={(e) => onDrag(e, node.id)}
      onMouseUp={() => onDragEnd()}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick(node.id);
      }}
    >
      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(node.id);
        }}
        style={{
          position: "absolute",
          top: -8,
          right: -8,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#ef4444",
          color: "#fff",
          fontSize: 11,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "2px solid #fff",
          zIndex: 30,
          cursor: "pointer",
          lineHeight: 1,
        }}
      >
        ✕
      </button>

      {/* Input port (left side) */}
      <div
        onMouseUp={(e) => onPortMouseUp(e, node.id)}
        style={{
          position: "absolute",
          left: -7,
          top: "50%",
          transform: "translateY(-50%)",
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: connecting ? "#34d399" : "#d1d5db",
          border: `2px solid ${connecting ? "#059669" : "#9ca3af"}`,
          zIndex: 25,
          cursor: connecting ? "pointer" : "default",
        }}
      />

      {/* Output port (right side) — only for triggers or chained actions */}
      <div
        onMouseDown={(e) => onPortMouseDown(e, node.id)}
        style={{
          position: "absolute",
          right: -7,
          top: "50%",
          transform: "translateY(-50%)",
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: "#d1d5db",
          border: "2px solid #9ca3af",
          zIndex: 25,
          cursor: "pointer",
        }}
      />

      {/* Card */}
      <div
        style={{
          background: bgCol,
          border: `2px solid ${isSelected ? borderCol : "rgba(0,0,0,0.08)"}`,
          borderRadius: 12,
          padding: "12px 14px",
          boxShadow: isSelected
            ? `0 0 0 3px ${borderCol}33, 0 4px 12px rgba(0,0,0,0.08)`
            : "0 2px 8px rgba(0,0,0,0.06)",
          transition: "box-shadow 0.15s, border-color 0.15s",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <span style={{ fontSize: 16 }}>{isTrigger ? "🎯" : "⚡"}</span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: isTrigger ? "#7c3aed" : "#0284c7",
            }}
          >
            {node.type}
          </span>
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e", marginBottom: 2 }}>
          {node.label}
        </div>
        {Object.keys(node.config).length > 0 && (
          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
            {Object.entries(node.config)
              .slice(0, 2)
              .map(([k, v]) => (
                <div key={k} style={{ maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <span style={{ opacity: 0.6 }}>{k}:</span> {v}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Config Modal ─── */

function ConfigModal({
  node,
  onSave,
  onClose,
}: {
  node: WFNode;
  onSave: (config: Record<string, string>, label: string) => void;
  onClose: () => void;
}) {
  const [config, setConfig] = useState<Record<string, string>>({ ...node.config });
  const [label, setLabel] = useState(node.label);
  const isTrigger = node.type === "trigger";
  const types = isTrigger ? TRIGGER_TYPES : ACTION_TYPES;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold">Configure {node.type === "trigger" ? "Trigger" : "Action"}</h2>
            <p className="text-xs text-[var(--text-dim)] mt-0.5">Double-click a node to configure</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>

        {/* Type selector */}
        <label className="block mb-3">
          <span className="text-xs font-medium text-[var(--text-dim)]">Type</span>
          <select
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            value={node.subType}
            onChange={(e) => {
              const t = types.find((x) => x.key === e.target.value);
              if (t) setLabel(t.label);
            }}
          >
            {types.map((t) => (
              <option key={t.key} value={t.key}>
                {t.icon} {t.label}
              </option>
            ))}
          </select>
        </label>

        {/* Label */}
        <label className="block mb-3">
          <span className="text-xs font-medium text-[var(--text-dim)]">Label</span>
          <input
            className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </label>

        {/* Action-specific config */}
        {!isTrigger && (
          <>
            {node.subType === "send_notification" && (
              <label className="block mb-3">
                <span className="text-xs font-medium text-[var(--text-dim)]">Notification Message</span>
                <textarea
                  className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  rows={3}
                  value={config.message || ""}
                  onChange={(e) => setConfig({ ...config, message: e.target.value })}
                  placeholder="e.g. New document: {{doc_name}}"
                />
              </label>
            )}
            {node.subType === "create_task" && (
              <label className="block mb-3">
                <span className="text-xs font-medium text-[var(--text-dim)]">Task Title</span>
                <input
                  className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  value={config.title || ""}
                  onChange={(e) => setConfig({ ...config, title: e.target.value })}
                  placeholder="e.g. Follow up: {{task_title}}"
                />
              </label>
            )}
            {node.subType === "call_webhook" && (
              <label className="block mb-3">
                <span className="text-xs font-medium text-[var(--text-dim)]">Webhook URL</span>
                <input
                  className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  value={config.url || ""}
                  onChange={(e) => setConfig({ ...config, url: e.target.value })}
                  placeholder="https://api.example.com/hook"
                />
              </label>
            )}
          </>
        )}

        {/* Trigger conditions */}
        {isTrigger && (
          <label className="block mb-3">
            <span className="text-xs font-medium text-[var(--text-dim)]">Condition (optional)</span>
            <input
              className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              value={config.condition || ""}
              onChange={(e) => setConfig({ ...config, condition: e.target.value })}
              placeholder='e.g. doc_type == "pdf"'
            />
          </label>
        )}

        {/* Template variables */}
        <div className="mb-4 rounded-lg bg-gray-50 p-3">
          <p className="text-xs font-medium text-[var(--text-dim)] mb-2">Template Variables</p>
          <div className="flex flex-wrap gap-1.5">
            {(AVAILABLE_VARIABLES[node.type] || []).map((v) => (
              <span
                key={v}
                className="inline-block rounded-md bg-purple-100 px-2 py-0.5 text-[11px] font-mono text-purple-700 cursor-pointer hover:bg-purple-200"
                onClick={() => {
                  const field = node.type === "action" && (node.subType === "send_notification" || node.subType === "create_task") ? (node.subType === "send_notification" ? "message" : "title") : "condition";
                  setConfig((prev) => ({ ...prev, [field]: (prev[field] || "") + " " + v }));
                }}
                title="Click to insert"
              >
                {v}
              </span>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost rounded-xl px-4 py-2 text-sm">Cancel</button>
          <button
            onClick={() => onSave(config, label)}
            className="btn-primary rounded-xl px-4 py-2 text-sm font-medium"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Test Modal ─── */

function TestModal({
  workflow,
  onClose,
}: {
  workflow: Workflow;
  onClose: () => void;
}) {
  const [steps, setSteps] = useState<ExecStep[]>([]);
  const [running, setRunning] = useState(false);
  const [dryRun, setDryRun] = useState(false);

  const runTest = (isDry: boolean) => {
    setDryRun(isDry);
    setRunning(true);
    setSteps([]);

    const allSteps: ExecStep[] = workflow.nodes.map((n, i) => ({
      action: `${n.type === "trigger" ? "🎯" : "⚡"} ${n.label}`,
      status: "pending" as const,
      detail: isDry ? "(dry run)" : undefined,
      timestamp: undefined,
      variables: n.type === "trigger"
        ? { "{{doc_name}}": "report.pdf", "{{task_title}}": "Review Q3 report" }
        : undefined,
    }));

    // Simulate step-by-step execution
    let i = 0;
    const interval = setInterval(() => {
      if (i >= allSteps.length) {
        clearInterval(interval);
        setRunning(false);
        return;
      }
      allSteps[i] = {
        ...allSteps[i],
        status: "success",
        timestamp: new Date().toLocaleTimeString(),
        detail: isDry ? "Dry run — no action taken" : "Executed successfully",
      };
      setSteps([...allSteps]);
      i++;
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold">Test Workflow</h2>
            <p className="text-xs text-[var(--text-dim)]">{workflow.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>

        <div className="flex gap-2 mb-5">
          <button
            onClick={() => runTest(true)}
            disabled={running}
            className="btn-ghost rounded-xl px-4 py-2 text-sm disabled:opacity-50"
          >
            🧪 Dry Run
          </button>
          <button
            onClick={() => runTest(false)}
            disabled={running}
            className="btn-primary rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            ▶ Run Now
          </button>
        </div>

        {steps.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-[var(--text-dim)] mb-2">
              Step-by-step results {dryRun && "(dry run)"}
            </p>
            {steps.map((s, i) => (
              <div
                key={i}
                className={`rounded-lg border px-4 py-3 transition-all ${
                  s.status === "success"
                    ? "border-emerald-200 bg-emerald-50"
                    : s.status === "error"
                    ? "border-red-200 bg-red-50"
                    : "border-gray-200 bg-gray-50 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      {s.status === "success" ? "✅" : s.status === "error" ? "❌" : "⏳"}
                    </span>
                    <span className="text-sm font-medium">{s.action}</span>
                  </div>
                  {s.timestamp && <span className="text-xs text-[var(--text-dim)]">{s.timestamp}</span>}
                </div>
                {s.detail && <p className="text-xs text-[var(--text-dim)] mt-1 ml-6">{s.detail}</p>}
                {s.variables && (
                  <div className="mt-2 ml-6 flex flex-wrap gap-1">
                    {Object.entries(s.variables).map(([k, v]) => (
                      <span key={k} className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-mono text-purple-700">
                        {k} = {v}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {!running && (
              <div className="text-center text-sm font-medium text-emerald-600 mt-3">
                {dryRun ? "🧪 Dry run completed" : "✅ All steps completed successfully"}
              </div>
            )}
          </div>
        )}

        <button onClick={onClose} className="mt-5 btn-ghost rounded-xl px-4 py-2 text-sm w-full">Close</button>
      </div>
    </div>
  );
}

/* ─── Template Gallery Modal ─── */

function TemplateGallery({ onSelect, onClose }: { onSelect: (t: typeof templates[0]) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-bold">Workflow Templates</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {templates.map((t, i) => (
            <div
              key={i}
              className="rounded-xl border border-[var(--border)] p-4 hover:bg-[var(--bg-card-hover)] cursor-pointer transition-all hover:translate-y-[-1px]"
              onClick={() => onSelect(t)}
            >
              <h4 className="text-sm font-semibold mb-1">{t.name}</h4>
              <p className="text-xs text-[var(--text-dim)] mb-3">{t.description}</p>
              {/* Mini preview */}
              <div className="relative bg-gray-50 rounded-lg p-3" style={{ height: 80 }}>
                {t.nodes.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      position: "absolute",
                      left: (n.x / 500) * 100 + "%",
                      top: (n.y / 400) * 100 + "%",
                      transform: "scale(0.5)",
                      transformOrigin: "top left",
                    }}
                  >
                    <div
                      className="rounded-md px-2 py-1 text-[10px] font-medium whitespace-nowrap"
                      style={{
                        background: n.type === "trigger" ? "#f5f0ff" : "#f0f9ff",
                        border: `1px solid ${n.type === "trigger" ? "#8b5cf6" : "#38bdf8"}`,
                        color: n.type === "trigger" ? "#7c3aed" : "#0284c7",
                      }}
                    >
                      {n.type === "trigger" ? "🎯" : "⚡"} {n.label}
                    </div>
                  </div>
                ))}
                {/* Mini SVG edges */}
                <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
                  {t.edges.map((e) => {
                    const from = t.nodes.find((n) => n.id === e.from);
                    const to = t.nodes.find((n) => n.id === e.to);
                    if (!from || !to) return null;
                    const sx = (from.x / 500) * 100 + 10;
                    const sy = (from.y / 400) * 100 + 8;
                    const ex = (to.x / 500) * 100;
                    const ey = (to.y / 400) * 100 + 8;
                    return (
                      <line
                        key={e.id}
                        x1={`${sx}%`} y1={`${sy}%`}
                        x2={`${ex}%`} y2={`${ey}%`}
                        stroke="#d1d5db" strokeWidth="1.5"
                      />
                    );
                  })}
                </svg>
              </div>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="mt-4 btn-ghost rounded-xl px-4 py-2 text-sm w-full">Close</button>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */

export default function WorkflowsPage() {
  const [wfs, setWfs] = useState<Workflow[]>(initWfs);
  const [selected, setSelected] = useState<Workflow | null>(wfs[0]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [configNode, setConfigNode] = useState<WFNode | null>(null);
  const [testWorkflow, setTestWorkflow] = useState<Workflow | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [expandedHistory, setExpandedHistory] = useState<number | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Drag state
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);

  const toggleActive = (id: number) =>
    setWfs((prev) =>
      prev.map((w) => (w.id === id ? { ...w, active: !w.active } : w))
    );

  const deleteWf = (id: number) => {
    if (confirm("Delete this workflow?")) {
      setWfs((prev) => prev.filter((w) => w.id !== id));
      if (selected?.id === id) setSelected(null);
    }
  };

  /* ─── Canvas: drag handlers ─── */

  const handleDragStart = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      if (!selected) return;
      const node = selected.nodes.find((n) => n.id === nodeId);
      if (!node || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      dragRef.current = {
        id: nodeId,
        offsetX: e.clientX - rect.left - node.x,
        offsetY: e.clientY - rect.top - node.y,
      };
    },
    [selected]
  );

  const handleDrag = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      if (!dragRef.current || !canvasRef.current || !selected) return;
      if (dragRef.current.id !== nodeId) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = Math.max(0, e.clientX - rect.left - dragRef.current.offsetX);
      const y = Math.max(0, e.clientY - rect.top - dragRef.current.offsetY);
      setWfs((prev) =>
        prev.map((w) =>
          w.id === selected.id
            ? {
                ...w,
                nodes: w.nodes.map((n) =>
                  n.id === nodeId ? { ...n, x, y } : n
                ),
              }
            : w
        )
      );
    },
    [selected]
  );

  const handleDragEnd = useCallback(() => {
    dragRef.current = null;
  }, []);

  /* ─── Canvas: node select, delete, configure ─── */

  const handleSelect = useCallback((id: string) => {
    setSelectedNodeId(id);
  }, []);

  const handleDelete = useCallback(
    (nodeId: string) => {
      if (!selected) return;
      const newNodes = selected.nodes.filter((n) => n.id !== nodeId);
      const newEdges = selected.edges.filter(
        (e) => e.from !== nodeId && e.to !== nodeId
      );
      const updated = { ...selected, nodes: newNodes, edges: newEdges };
      setSelected(updated);
      setWfs((prev) => prev.map((w) => (w.id === selected.id ? updated : w)));
      if (selectedNodeId === nodeId) setSelectedNodeId(null);
    },
    [selected, selectedNodeId]
  );

  const handleDoubleClick = useCallback(
    (nodeId: string) => {
      if (!selected) return;
      const node = selected.nodes.find((n) => n.id === nodeId);
      if (node) setConfigNode({ ...node });
    },
    [selected]
  );

  /* ─── Canvas: connection handling ─── */

  const handlePortMouseDown = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();
      e.preventDefault();
      setConnecting(true);
      setConnectFrom(nodeId);
    },
    []
  );

  const handlePortMouseUp = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();
      if (!connecting || !connectFrom || !selected) return;
      if (connectFrom === nodeId) {
        setConnecting(false);
        setConnectFrom(null);
        return;
      }
      // Check no duplicate
      const exists = selected.edges.some(
        (ed) => ed.from === connectFrom && ed.to === nodeId
      );
      if (!exists) {
        const newEdge: WFEdge = { id: eid(), from: connectFrom, to: nodeId };
        const updated = {
          ...selected,
          edges: [...selected.edges, newEdge],
        };
        setSelected(updated);
        setWfs((prev) => prev.map((w) => (w.id === selected.id ? updated : w)));
      }
      setConnecting(false);
      setConnectFrom(null);
    },
    [connecting, connectFrom, selected]
  );

  const handleCanvasClick = useCallback(() => {
    setSelectedNodeId(null);
    if (connecting) {
      setConnecting(false);
      setConnectFrom(null);
    }
  }, [connecting]);

  /* ─── Drop from palette ─── */

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const nodeType = e.dataTransfer.getData("nodeType") as "trigger" | "action";
      if (!nodeType || !selected || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - 90;
      const y = e.clientY - rect.top - 30;
      const defaults =
        nodeType === "trigger" ? TRIGGER_TYPES : ACTION_TYPES;
      const newNode: WFNode = {
        id: uid(),
        type: nodeType,
        label: defaults[0].label,
        subType: defaults[0].key,
        x: Math.max(0, x),
        y: Math.max(0, y),
        config: {},
      };
      const updated = {
        ...selected,
        nodes: [...selected.nodes, newNode],
      };
      setSelected(updated);
      setWfs((prev) => prev.map((w) => (w.id === selected.id ? updated : w)));
    },
    [selected]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  /* ─── Save node config ─── */

  const saveNodeConfig = useCallback(
    (config: Record<string, string>, label: string) => {
      if (!selected || !configNode) return;
      const updatedNodes = selected.nodes.map((n) =>
        n.id === configNode.id ? { ...n, config, label } : n
      );
      const updated = { ...selected, nodes: updatedNodes };
      setSelected(updated);
      setWfs((prev) => prev.map((w) => (w.id === selected.id ? updated : w)));
      setConfigNode(null);
    },
    [selected, configNode]
  );

  /* ─── Create from template ─── */

  const createFromTemplate = useCallback(
    (t: typeof templates[0]) => {
      const newNodes: WFNode[] = t.nodes.map((n) => ({
        id: uid(),
        type: n.type as "trigger" | "action",
        label: n.label,
        subType: n.subType,
        x: n.x,
        y: n.y,
        config: { ...n.config } as Record<string, string>,
      }));
      const idMap: Record<string, string> = {};
      t.nodes.forEach((old, i) => {
        idMap[old.id] = newNodes[i].id;
      });
      const newEdges: WFEdge[] = t.edges.map((e) => ({
        id: eid(),
        from: idMap[e.from] || e.from,
        to: idMap[e.to] || e.to,
      }));
      const wf: Workflow = {
        id: Date.now(),
        name: t.name,
        description: t.description,
        active: true,
        nodes: newNodes,
        edges: newEdges,
        updated_at: new Date().toISOString(),
      };
      setWfs((prev) => [wf, ...prev]);
      setSelected(wf);
      setShowTemplates(false);
    },
    []
  );

  /* ─── Mock execution history ─── */

  const execHistory = selected
    ? [
        {
          id: 1,
          status: "success" as const,
          time: "2026-07-13 06:15:22",
          duration: "1.2s",
          steps: selected.nodes.map((n) => ({
            action: n.label,
            status: "success" as const,
            detail: `Completed ${n.type} step`,
          })),
        },
        {
          id: 2,
          status: "success" as const,
          time: "2026-07-12 18:30:05",
          duration: "0.8s",
          steps: selected.nodes.map((n) => ({
            action: n.label,
            status: "success" as const,
            detail: `Completed ${n.type} step`,
          })),
        },
        {
          id: 3,
          status: "error" as const,
          time: "2026-07-11 12:45:10",
          duration: "3.1s",
          steps: selected.nodes.map((n, i) => ({
            action: n.label,
            status: (i === selected.nodes.length - 1 ? "error" : "success") as "success" | "error",
            detail: i === selected.nodes.length - 1 ? "Webhook returned 500" : `Completed ${n.type} step`,
          })),
        },
      ]
    : [];

  /* ─── Sync selected from wfs state ─── */

  useEffect(() => {
    if (selected) {
      const fresh = wfs.find((w) => w.id === selected.id);
      if (fresh && JSON.stringify(fresh) !== JSON.stringify(selected)) {
        setSelected(fresh);
      }
    }
  }, [wfs, selected]);

  /* ─── Render SVG connection lines ─── */

  const renderEdges = () => {
    if (!selected) return null;
    const nodeW = 180;
    const nodeH = 80;

    return selected.edges.map((edge) => {
      const fromNode = selected.nodes.find((n) => n.id === edge.from);
      const toNode = selected.nodes.find((n) => n.id === edge.to);
      if (!fromNode || !toNode) return null;

      const sx = fromNode.x + nodeW;
      const sy = fromNode.y + nodeH / 2;
      const ex = toNode.x;
      const ey = toNode.y + nodeH / 2;

      const dx = Math.abs(ex - sx) * 0.5;
      const path = `M ${sx} ${sy} C ${sx + dx} ${sy}, ${ex - dx} ${ey}, ${ex} ${ey}`;

      return (
        <svg
          key={edge.id}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 5,
          }}
        >
          <path
            d={path}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2"
            strokeDasharray="none"
          />
          {/* Arrow head */}
          <circle cx={ex} cy={ey} r="4" fill="#94a3b8" />
        </svg>
      );
    });
  };

  return (
    <AppLayout>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workflows</h1>
          <p className="text-sm text-[var(--text-dim)]">{wfs.length} workflows</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTemplates(true)}
            className="btn-ghost rounded-xl px-4 py-2 text-sm"
          >
            Templates
          </button>
          <button
            onClick={() => {
              const wf: Workflow = {
                id: Date.now(),
                name: "New Workflow",
                description: "",
                active: true,
                nodes: [{ id: uid(), type: "trigger", label: "Manual", subType: "manual", x: 100, y: 180, config: {} }],
                edges: [],
                updated_at: new Date().toISOString(),
              };
              setWfs((prev) => [wf, ...prev]);
              setSelected(wf);
            }}
            className="btn-primary rounded-xl px-4 py-2 text-sm font-medium"
          >
            + New Workflow
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Workflow list */}
        <div className="space-y-3">
          {wfs.map((wf) => (
            <div
              key={wf.id}
              onClick={() => { setSelected(wf); setSelectedNodeId(null); }}
              className={`glass rounded-xl p-4 cursor-pointer transition-all hover:translate-y-[-1px] ${
                selected?.id === wf.id ? "ring-2 ring-[var(--accent)]" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold">{wf.name}</h3>
                  <p className="mt-1 text-xs text-[var(--text-dim)] line-clamp-2">
                    {wf.description || "No description"}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleActive(wf.id);
                  }}
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium transition ${
                    wf.active
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {wf.active ? "Active" : "Paused"}
                </button>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-[var(--text-dim)]">
                <span>{wf.nodes.length} nodes</span>
                <span>·</span>
                <span>{new Date(wf.updated_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-2">
          {selected ? (
            <div className="glass rounded-2xl p-6">
              {/* Toolbar */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold">{selected.name}</h2>
                  <p className="text-sm text-[var(--text-dim)]">{selected.description}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTestWorkflow(selected)}
                    className="btn-ghost rounded-xl px-3 py-2 text-xs"
                  >
                    🧪 Test
                  </button>
                  <button
                    onClick={() => deleteWf(selected.id)}
                    className="text-xs text-red-400 hover:text-red-600 px-2"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Palette + Canvas */}
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-medium text-[var(--text-dim)]">Drag to add:</span>
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("nodeType", "trigger");
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 cursor-grab hover:bg-purple-100 transition"
                  >
                    🎯 Trigger
                  </div>
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("nodeType", "action");
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 cursor-grab hover:bg-sky-100 transition"
                  >
                    ⚡ Action
                  </div>
                </div>

                {/* Canvas */}
                <div
                  ref={canvasRef}
                  className="relative rounded-xl border-2 border-dashed overflow-hidden"
                  style={{
                    minHeight: 400,
                    background: "repeating-conic-gradient(rgba(0,0,0,0.02) 0% 25%, transparent 0% 50%) 50% / 20px 20px",
                    backgroundColor: "#fafbfd",
                    borderColor: connecting ? "#34d399" : "var(--border)",
                  }}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={handleCanvasClick}
                >
                  {/* Grid overlay */}
                  <div className="absolute inset-0 grid-bg pointer-events-none" />

                  {/* SVG edges */}
                  {renderEdges()}

                  {/* Nodes */}
                  {selected.nodes.map((node) => (
                    <CanvasNode
                      key={node.id}
                      node={node}
                      selectedId={selectedNodeId}
                      onDragStart={handleDragStart}
                      onDrag={handleDrag}
                      onDragEnd={handleDragEnd}
                      onSelect={handleSelect}
                      onDoubleClick={handleDoubleClick}
                      onDelete={handleDelete}
                      onPortMouseDown={handlePortMouseDown}
                      onPortMouseUp={handlePortMouseUp}
                      connecting={connecting}
                    />
                  ))}

                  {/* Empty state */}
                  {selected.nodes.length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--text-dim)]">
                      <div className="text-4xl mb-3">⚡</div>
                      <p className="text-sm font-medium">Drag nodes here to build your workflow</p>
                      <p className="text-xs mt-1">Or start from a template</p>
                    </div>
                  )}

                  {/* Connecting indicator */}
                  {connecting && (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 z-30">
                      Click a target node&apos;s input port to connect
                    </div>
                  )}
                </div>
              </div>

              {/* Execution History */}
              <div>
                <h3 className="mb-3 text-sm font-semibold">Execution History</h3>
                <div className="space-y-2">
                  {execHistory.map((run) => (
                    <div key={run.id} className="rounded-lg border border-[var(--border)] overflow-hidden">
                      <button
                        className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-[var(--bg-card-hover)] transition"
                        onClick={() => setExpandedHistory(expandedHistory === run.id ? null : run.id)}
                      >
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ background: run.status === "success" ? "#34d399" : "#f87171" }} />
                        <span className="text-sm font-medium">{run.status === "success" ? "Success" : "Failed"}</span>
                        <span className="text-xs text-[var(--text-dim)]">{run.time}</span>
                        <span className="text-xs text-[var(--text-dim)]">({run.duration})</span>
                        <span className="ml-auto text-xs text-[var(--text-dim)]">
                          {expandedHistory === run.id ? "▾" : "▸"} {run.steps.length} steps
                        </span>
                      </button>
                      {expandedHistory === run.id && (
                        <div className="border-t border-[var(--border)] bg-gray-50 px-4 py-3 space-y-1.5">
                          {run.steps.map((step, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <span>{step.status === "success" ? "✅" : "❌"}</span>
                              <span className="font-medium">{step.action}</span>
                              <span className="text-[var(--text-dim)]">— {step.detail}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass rounded-2xl p-12 text-center">
              <div className="mb-3 text-4xl">⚡</div>
              <p className="text-sm text-[var(--text-dim)]">Select a workflow</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showTemplates && (
        <TemplateGallery
          onSelect={createFromTemplate}
          onClose={() => setShowTemplates(false)}
        />
      )}
      {configNode && (
        <ConfigModal
          node={configNode}
          onSave={saveNodeConfig}
          onClose={() => setConfigNode(null)}
        />
      )}
      {testWorkflow && (
        <TestModal
          workflow={testWorkflow}
          onClose={() => setTestWorkflow(null)}
        />
      )}
    </AppLayout>
  );
}
