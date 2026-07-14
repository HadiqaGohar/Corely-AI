"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { tasks as tasksApi, Task as ApiTask, Subtask as ApiSubtask } from "@/lib/api";

/* ── Types ─────────────────────────────────────────────── */

type Subtask = { id: number; text: string; done: boolean };
type Recurrence = "none" | "daily" | "weekly" | "monthly";
type TaskStatus = "todo" | "in_progress" | "done";
type Priority = "high" | "normal" | "low";

interface Task {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  due_date: string | null;
  subtasks: Subtask[];
  recurrence: Recurrence;
}

type SortField = "date" | "priority" | "title" | "status";
type SortDir = "asc" | "desc";

/* ── Constants ─────────────────────────────────────────── */

const columns: { key: TaskStatus; label: string; color: string }[] = [
  { key: "todo", label: "To Do", color: "bg-gray-400" },
  { key: "in_progress", label: "In Progress", color: "bg-amber-400" },
  { key: "done", label: "Done", color: "bg-emerald-400" },
];

const priorityOrder: Record<Priority, number> = { high: 0, normal: 1, low: 2 };

const statusOrder: Record<TaskStatus, number> = { todo: 0, in_progress: 1, done: 2 };

const priorityColors: Record<Priority, string> = {
  high: "bg-red-100 text-red-600",
  normal: "bg-blue-100 text-blue-600",
  low: "bg-gray-100 text-gray-500",
};

const recurrenceLabels: Record<Recurrence, string> = {
  none: "",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

const recurrenceIcons: Record<Recurrence, string> = {
  none: "",
  daily: "🔁",
  weekly: "🔄",
  monthly: "🔃",
};

const priorityPct: Record<Priority, string> = {
  high: "bg-red-400",
  normal: "bg-blue-400",
  low: "bg-gray-400",
};

const statusPct: Record<TaskStatus, string> = {
  todo: "bg-gray-400",
  in_progress: "bg-amber-400",
  done: "bg-emerald-400",
};

/* ── Helpers ───────────────────────────────────────────── */

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

function subtaskProgress(task: Task): { done: number; total: number } {
  const done = task.subtasks.filter((s) => s.done).length;
  return { done, total: task.subtasks.length };
}

function apiTaskToLocal(t: ApiTask): Task {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status as TaskStatus,
    priority: t.priority as Priority,
    due_date: t.due_date,
    subtasks: (t.subtasks || []).map((s) => ({ id: s.id, text: s.title, done: s.completed })),
    recurrence: (t.recurrence || "none") as Recurrence,
  };
}

/* ── Page Component ────────────────────────────────────── */

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [filter, setFilter] = useState({ status: "", priority: "", search: "" });
  const [sort, setSort] = useState<{ field: SortField; dir: SortDir }>({ field: "date", dir: "desc" });
  const [showCreate, setShowCreate] = useState(false);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [analyticsOpen, setAnalyticsOpen] = useState(true);
  const [dragId, setDragId] = useState<number | null>(null);

  // Load tasks from API
  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filter.status) params.status = filter.status;
      if (filter.priority) params.priority = filter.priority;
      if (filter.search) params.search = filter.search;
      const data = await tasksApi.list(params);
      setTasks(data.map(apiTaskToLocal));
    } catch (e) {
      console.error("Failed to load tasks:", e);
    } finally {
      setLoading(false);
    }
  };

  // Reload on filter change
  useEffect(() => {
    const timer = setTimeout(() => loadTasks(), 300);
    return () => clearTimeout(timer);
  }, [filter.status, filter.priority, filter.search]);

  /* ── Derived data ──────────────────────────────────── */

  const overdueTasks = tasks.filter((t) => isOverdue(t.due_date));
  const overdueIds = new Set(overdueTasks.map((t) => t.id));

  const filtered = tasks
    .filter((t) => {
      if (filter.status && t.status !== filter.status) return false;
      if (filter.priority && t.priority !== filter.priority) return false;
      if (filter.search && !t.title.toLowerCase().includes(filter.search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      switch (sort.field) {
        case "date": {
          const aT = a.due_date ? new Date(a.due_date).getTime() : Infinity;
          const bT = b.due_date ? new Date(b.due_date).getTime() : Infinity;
          return (aT - bT) * dir;
        }
        case "priority":
          return (priorityOrder[a.priority] - priorityOrder[b.priority]) * dir;
        case "title":
          return a.title.localeCompare(b.title) * dir;
        case "status":
          return (statusOrder[a.status] - statusOrder[b.status]) * dir;
        default:
          return 0;
      }
    });

  /* ── Analytics ─────────────────────────────────────── */

  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "done").length;
  const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const statusCounts: Record<TaskStatus, number> = { todo: 0, in_progress: 0, done: 0 };
  const priorityCounts: Record<Priority, number> = { high: 0, normal: 0, low: 0 };
  tasks.forEach((t) => {
    statusCounts[t.status]++;
    priorityCounts[t.priority]++;
  });

  /* ── Actions ────────────────────────────────────────── */

  const updateStatus = useCallback(async (id: number, status: TaskStatus) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    try { await tasksApi.update(id, { status }); } catch { loadTasks(); }
  }, []);

  const deleteTask = useCallback(async (id: number) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
    try { await tasksApi.delete(id); } catch { loadTasks(); }
  }, []);

  const createTask = useCallback(async (data: Omit<Task, "id" | "status">) => {
    try {
      const created = await tasksApi.create({
        title: data.title,
        description: data.description,
        priority: data.priority,
        due_date: data.due_date || undefined,
        recurrence: data.recurrence !== "none" ? data.recurrence : undefined,
      });
      setTasks((prev) => [apiTaskToLocal(created), ...prev]);
    } catch { loadTasks(); }
    setShowCreate(false);
  }, []);

  const updateTask = useCallback(async (id: number, data: Partial<Task>) => {
    try {
      const updated = await tasksApi.update(id, {
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        due_date: data.due_date || undefined,
      });
      setTasks((prev) => prev.map((t) => (t.id === id ? apiTaskToLocal(updated) : t)));
    } catch { loadTasks(); }
    setDetailTask(null);
  }, []);

  const toggleSelect = useCallback((id: number) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((t) => t.id)));
    }
  }, [selected.size, filtered]);

  const bulkDelete = useCallback(async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} task(s)?`)) return;
    const ids = Array.from(selected);
    setTasks((prev) => prev.filter((t) => !selected.has(t.id)));
    setSelected(new Set());
    for (const id of ids) { try { await tasksApi.delete(id); } catch {} }
  }, [selected]);

  const bulkStatus = useCallback(async (status: TaskStatus) => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    setTasks((prev) => prev.map((t) => (selected.has(t.id) ? { ...t, status } : t)));
    setSelected(new Set());
    for (const id of ids) { try { await tasksApi.update(id, { status }); } catch {} }
  }, [selected]);

  /* ── Drag & Drop ────────────────────────────────────── */

  const onDragStart = useCallback((e: React.DragEvent, taskId: number) => {
    e.dataTransfer.setData("text/plain", String(taskId));
    e.dataTransfer.effectAllowed = "move";
    setDragId(taskId);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback((e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    const taskId = Number(e.dataTransfer.getData("text/plain"));
    if (taskId) updateStatus(taskId, status);
    setDragId(null);
  }, [updateStatus]);

  const onDragEnd = useCallback(() => setDragId(null), []);

  /* ── Render ──────────────────────────────────────────── */

  const hasSelection = selected.size > 0;

  return (
    <AppLayout>
      <div className="flex">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold">Tasks</h1>
              <p className="text-sm text-[var(--text-dim)]">{tasks.length} total tasks</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAnalyticsOpen(!analyticsOpen)}
                className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs font-medium text-[var(--text-dim)] hover:bg-[var(--bg-card-hover)] transition"
              >
                {analyticsOpen ? "✕ Analytics" : "📊 Analytics"}
              </button>
              <div className="flex rounded-lg border border-[var(--border)] bg-white p-0.5">
                <button
                  onClick={() => setView("kanban")}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${view === "kanban" ? "bg-[var(--accent)] text-white" : "text-[var(--text-dim)]"}`}
                >
                  Board
                </button>
                <button
                  onClick={() => setView("list")}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${view === "list" ? "bg-[var(--accent)] text-white" : "text-[var(--text-dim)]"}`}
                >
                  List
                </button>
              </div>
              <button onClick={() => setShowCreate(true)} className="btn-primary rounded-xl px-4 py-2 text-sm font-medium">
                + New Task
              </button>
            </div>
          </div>

          {/* Filters + Sort + Bulk */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Search tasks..."
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
            <select
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
              className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none"
            >
              <option value="">All Status</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>
            <select
              value={filter.priority}
              onChange={(e) => setFilter({ ...filter, priority: e.target.value })}
              className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none"
            >
              <option value="">All Priority</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
            <select
              value={`${sort.field}-${sort.dir}`}
              onChange={(e) => {
                const [field, dir] = e.target.value.split("-");
                setSort({ field: field as SortField, dir: dir as SortDir });
              }}
              className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none"
            >
              <option value="date-desc">Due Date (newest)</option>
              <option value="date-asc">Due Date (oldest)</option>
              <option value="priority-asc">Priority (high→low)</option>
              <option value="priority-desc">Priority (low→high)</option>
              <option value="title-asc">Title A→Z</option>
              <option value="title-desc">Title Z→A</option>
              <option value="status-asc">Status (todo→done)</option>
              <option value="status-desc">Status (done→todo)</option>
            </select>
            {/* Bulk actions */}
            {hasSelection && (
              <>
                <span className="text-xs text-[var(--text-dim)]">{selected.size} selected</span>
                <button onClick={() => bulkStatus("todo")} className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs hover:bg-[var(--bg-card-hover)]">→ To Do</button>
                <button onClick={() => bulkStatus("in_progress")} className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs hover:bg-[var(--bg-card-hover)]">→ In Progress</button>
                <button onClick={() => bulkStatus("done")} className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs hover:bg-[var(--bg-card-hover)]">→ Done</button>
                <button onClick={bulkDelete} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 hover:bg-red-100">🗑 Delete</button>
              </>
            )}
          </div>

          {/* Kanban */}
          {view === "kanban" && (
            <div className="grid gap-4 md:grid-cols-3">
              {columns.map((col) => {
                const colTasks = filtered.filter((t) => t.status === col.key);
                return (
                  <div
                    key={col.key}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4"
                    onDragOver={onDragOver}
                    onDrop={(e) => onDrop(e, col.key)}
                  >
                    <div className="mb-4 flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-full ${col.color}`} />
                      <h3 className="text-sm font-semibold">{col.label}</h3>
                      <span className="ml-auto text-xs text-[var(--text-dim)]">{colTasks.length}</span>
                    </div>
                    <div className="space-y-3 min-h-[200px]">
                      {colTasks.map((task) => {
                        const overdue = overdueIds.has(task.id);
                        const { done: subDone, total: subTotal } = subtaskProgress(task);
                        return (
                          <div
                            key={task.id}
                            draggable
                            onDragStart={(e) => onDragStart(e, task.id)}
                            onDragEnd={onDragEnd}
                            onClick={() => setDetailTask(task)}
                            className={`glass rounded-xl p-4 cursor-pointer group relative ${dragId === task.id ? "opacity-40" : ""} ${overdue ? "border-2 border-red-400" : ""}`}
                          >
                            <div className="flex items-start gap-2">
                              <input
                                type="checkbox"
                                checked={selected.has(task.id)}
                                onChange={(e) => { e.stopPropagation(); toggleSelect(task.id); }}
                                className="mt-0.5 h-3.5 w-3.5 rounded shrink-0"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="text-sm font-medium">{task.title}</h4>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                                    className="shrink-0 text-xs text-red-400 opacity-0 group-hover:opacity-100"
                                  >
                                    ✕
                                  </button>
                                </div>
                                {task.description && (
                                  <p className="mt-1 text-xs text-[var(--text-dim)] line-clamp-2">{task.description}</p>
                                )}
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${priorityColors[task.priority]}`}>
                                    {task.priority}
                                  </span>
                                  {task.due_date && (
                                    <span className={`text-[10px] ${overdue ? "font-semibold text-red-500" : "text-[var(--text-dim)]"}`}>
                                      {overdue && "⚠ "}
                                      {new Date(task.due_date).toLocaleDateString()}
                                    </span>
                                  )}
                                  {task.recurrence !== "none" && (
                                    <span className="text-[10px] text-[var(--text-dim)]" title={recurrenceLabels[task.recurrence]}>
                                      {recurrenceIcons[task.recurrence]} {recurrenceLabels[task.recurrence]}
                                    </span>
                                  )}
                                </div>
                                {overdue && (
                                  <span className="mt-2 inline-block rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                                    Overdue
                                  </span>
                                )}
                                {subTotal > 0 && (
                                  <div className="mt-2">
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                                        <div
                                          className="h-full rounded-full bg-emerald-500 transition-all"
                                          style={{ width: `${Math.round((subDone / subTotal) * 100)}%` }}
                                        />
                                      </div>
                                      <span className="text-[10px] text-[var(--text-dim)]">{subDone}/{subTotal}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="mt-2 flex gap-1 ml-5">
                              {columns.map((c) => (
                                <button
                                  key={c.key}
                                  onClick={(e) => { e.stopPropagation(); updateStatus(task.id, c.key); }}
                                  className={`rounded-md px-2 py-0.5 text-[10px] transition ${task.status === c.key ? "bg-[var(--accent)] text-white" : "bg-[var(--bg)] text-[var(--text-dim)] hover:bg-[var(--bg-card-hover)]"}`}
                                >
                                  {c.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* List */}
          {view === "list" && (
            <div className="glass rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-dim)]">
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={filtered.length > 0 && selected.size === filtered.length}
                        onChange={selectAll}
                        className="h-3.5 w-3.5 rounded"
                      />
                    </th>
                    <th className="px-4 py-3">Task</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Due</th>
                    <th className="px-4 py-3">Subtasks</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((task) => {
                    const overdue = overdueIds.has(task.id);
                    const { done: subDone, total: subTotal } = subtaskProgress(task);
                    return (
                      <tr
                        key={task.id}
                        onClick={() => setDetailTask(task)}
                        className={`border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-card-hover)] cursor-pointer ${overdue ? "bg-red-50/50" : ""}`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selected.has(task.id)}
                            onChange={(e) => { e.stopPropagation(); toggleSelect(task.id); }}
                            className="h-3.5 w-3.5 rounded"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{task.title}</p>
                            {overdue && <span className="inline-block rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">Overdue</span>}
                            {task.recurrence !== "none" && <span className="text-[10px]">{recurrenceIcons[task.recurrence]}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={task.status}
                            onChange={(e) => { e.stopPropagation(); updateStatus(task.id, e.target.value as TaskStatus); }}
                            className="rounded-lg border border-[var(--border)] bg-white px-2 py-1 text-xs outline-none"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="todo">To Do</option>
                            <option value="in_progress">In Progress</option>
                            <option value="done">Done</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityColors[task.priority]}`}>{task.priority}</span>
                        </td>
                        <td className={`px-4 py-3 text-xs ${overdue ? "font-semibold text-red-500" : "text-[var(--text-dim)]"}`}>
                          {task.due_date ? new Date(task.due_date).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {subTotal > 0 ? (
                            <span className="text-xs text-[var(--text-dim)]">{subDone}/{subTotal}</span>
                          ) : (
                            <span className="text-xs text-[var(--text-dim)]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                            className="text-xs text-red-500 hover:underline"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Analytics Sidebar */}
        {analyticsOpen && (
          <aside className="ml-4 w-64 shrink-0 hidden lg:block">
            <div className="glass rounded-2xl p-5 sticky top-4 space-y-5">
              <h3 className="text-sm font-bold">Analytics</h3>

              {/* Total & Completion */}
              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-2xl font-bold">{total}</span>
                  <span className="text-xs text-[var(--text-dim)]">tasks</span>
                </div>
                <div className="mb-1 flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${completionPct}%` }} />
                  </div>
                  <span className="text-xs font-medium">{completionPct}%</span>
                </div>
                <p className="text-[10px] text-[var(--text-dim)]">Completion rate</p>
              </div>

              {/* By Status */}
              <div>
                <h4 className="text-xs font-semibold mb-2">By Status</h4>
                <div className="space-y-2">
                  {columns.map((col) => {
                    const count = statusCounts[col.key];
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={col.key}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs text-[var(--text-dim)]">{col.label}</span>
                          <span className="text-xs font-medium">{count}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                          <div className={`h-full rounded-full ${statusPct[col.key]}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* By Priority */}
              <div>
                <h4 className="text-xs font-semibold mb-2">By Priority</h4>
                <div className="space-y-2">
                  {(["high", "normal", "low"] as const).map((p) => {
                    const count = priorityCounts[p];
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={p}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs text-[var(--text-dim)] capitalize">{p}</span>
                          <span className="text-xs font-medium">{count}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                          <div className={`h-full rounded-full ${priorityPct[p]}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Overdue */}
              <div className={`rounded-xl p-3 ${overdueTasks.length > 0 ? "bg-red-50 border border-red-200" : "bg-gray-50"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-red-600">⚠ Overdue</span>
                  <span className="text-lg font-bold text-red-600">{overdueTasks.length}</span>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onSave={createTask} />}

      {/* Detail Modal */}
      {detailTask && <DetailModal task={detailTask} onClose={() => setDetailTask(null)} onSave={updateTask} onDelete={deleteTask} />}
    </AppLayout>
  );
}

/* ── Create Modal ──────────────────────────────────────── */

function CreateModal({ onClose, onSave }: { onClose: () => void; onSave: (d: Omit<Task, "id" | "status">) => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [dueDate, setDueDate] = useState("");
  const [recurrence, setRecurrence] = useState<Recurrence>("none");
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [subInput, setSubInput] = useState("");

  const addSubtask = () => {
    const text = subInput.trim();
    if (!text) return;
    setSubtasks((prev) => [...prev, { id: Date.now(), text, done: false }]);
    setSubInput("");
  };

  const toggleSubtask = (id: number) => {
    setSubtasks((prev) => prev.map((s) => (s.id === id ? { ...s, done: !s.done } : s)));
  };

  const deleteSubtask = (id: number) => {
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-bold">New Task</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm outline-none"
              >
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Recurrence</label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as Recurrence)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm outline-none"
              >
                <option value="none">None</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>
          {/* Subtasks */}
          <div>
            <label className="mb-1 block text-sm font-medium">Subtasks</label>
            <div className="flex gap-2">
              <input
                value={subInput}
                onChange={(e) => setSubInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSubtask()}
                placeholder="Add subtask..."
                className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              />
              <button onClick={addSubtask} className="rounded-xl bg-[var(--accent)] px-3 py-2 text-sm text-white">+</button>
            </div>
            {subtasks.length > 0 && (
              <ul className="mt-2 space-y-1">
                {subtasks.map((s) => (
                  <li key={s.id} className="flex items-center gap-2 rounded-lg bg-[var(--bg)] px-3 py-1.5 text-sm">
                    <input type="checkbox" checked={s.done} onChange={() => toggleSubtask(s.id)} className="h-3.5 w-3.5 rounded" />
                    <span className={s.done ? "text-[var(--text-dim)] line-through" : ""}>{s.text}</span>
                    <button onClick={() => deleteSubtask(s.id)} className="ml-auto text-xs text-red-400">✕</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost rounded-xl px-4 py-2 text-sm">Cancel</button>
          <button
            onClick={() => title.trim() && onSave({ title, description, priority, due_date: dueDate || null, subtasks, recurrence })}
            disabled={!title.trim()}
            className="btn-primary rounded-xl px-4 py-2 text-sm disabled:opacity-50"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Detail Modal ──────────────────────────────────────── */

function DetailModal({ task, onClose, onSave, onDelete }: { task: Task; onClose: () => void; onSave: (id: number, d: Partial<Task>) => void; onDelete: (id: number) => void }) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [dueDate, setDueDate] = useState(task.due_date || "");
  const [recurrence, setRecurrence] = useState<Recurrence>(task.recurrence);
  const [subtasks, setSubtasks] = useState<Subtask[]>(task.subtasks);
  const [subInput, setSubInput] = useState("");

  const addSubtask = () => {
    const text = subInput.trim();
    if (!text) return;
    setSubtasks((prev) => [...prev, { id: Date.now(), text, done: false }]);
    setSubInput("");
  };

  const toggleSubtask = (id: number) => {
    setSubtasks((prev) => prev.map((s) => (s.id === id ? { ...s, done: !s.done } : s)));
  };

  const deleteSubtask = (id: number) => {
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
  };

  const save = () => {
    onSave(task.id, { title, description, status, priority, due_date: dueDate || null, subtasks, recurrence });
  };

  const overdue = isOverdue(dueDate || null);
  const { done: subDone, total: subTotal } = subtaskProgress({ ...task, subtasks });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Task Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>

        {overdue && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600 font-medium">
            ⚠ This task is overdue
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)]" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)]" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm outline-none">
                <option value="todo">To Do</option><option value="in_progress">In Progress</option><option value="done">Done</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm outline-none">
                <option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Due Date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm outline-none" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Recurrence</label>
            <select value={recurrence} onChange={(e) => setRecurrence(e.target.value as Recurrence)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm outline-none">
              <option value="none">None</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
            </select>
          </div>
          {/* Subtasks */}
          <div>
            <label className="mb-1 block text-sm font-medium">Subtasks {subTotal > 0 && <span className="text-xs text-[var(--text-dim)]">({subDone}/{subTotal} completed)</span>}</label>
            {subTotal > 0 && (
              <div className="mb-2 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.round((subDone / subTotal) * 100)}%` }} />
              </div>
            )}
            <div className="flex gap-2">
              <input value={subInput} onChange={(e) => setSubInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addSubtask()} placeholder="Add subtask..." className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]" />
              <button onClick={addSubtask} className="rounded-xl bg-[var(--accent)] px-3 py-2 text-sm text-white">+</button>
            </div>
            {subtasks.length > 0 && (
              <ul className="mt-2 space-y-1">
                {subtasks.map((s) => (
                  <li key={s.id} className="flex items-center gap-2 rounded-lg bg-[var(--bg)] px-3 py-1.5 text-sm">
                    <input type="checkbox" checked={s.done} onChange={() => toggleSubtask(s.id)} className="h-3.5 w-3.5 rounded" />
                    <span className={s.done ? "text-[var(--text-dim)] line-through" : ""}>{s.text}</span>
                    <button onClick={() => deleteSubtask(s.id)} className="ml-auto text-xs text-red-400">✕</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-between">
          <button onClick={() => { if (confirm("Delete this task?")) { onDelete(task.id); onClose(); } }} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600 hover:bg-red-100">
            🗑 Delete
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-ghost rounded-xl px-4 py-2 text-sm">Cancel</button>
            <button onClick={save} disabled={!title.trim()} className="btn-primary rounded-xl px-4 py-2 text-sm disabled:opacity-50">Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}
