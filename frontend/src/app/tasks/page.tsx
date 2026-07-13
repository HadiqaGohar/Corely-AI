"use client";

import { useEffect, useState } from "react";
import { tasks as tasksApi, Task } from "@/lib/api";
import AppLayout from "@/components/AppLayout";

type ViewMode = "kanban" | "list";

const columns = [
  { key: "todo" as const, label: "To Do", color: "bg-gray-400" },
  { key: "in_progress" as const, label: "In Progress", color: "bg-amber-400" },
  { key: "done" as const, label: "Done", color: "bg-emerald-400" },
];

const priorityColors: Record<string, string> = {
  high: "bg-red-100 text-red-600",
  normal: "bg-blue-100 text-blue-600",
  low: "bg-gray-100 text-gray-500",
};

export default function TasksPage() {
  const [taskList, setTaskList] = useState<Task[]>([]);
  const [view, setView] = useState<ViewMode>("kanban");
  const [filter, setFilter] = useState({ status: "", priority: "", search: "" });
  const [showCreate, setShowCreate] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadTasks(); }, []);

  const loadTasks = async () => {
    try {
      const data = await tasksApi.list();
      setTaskList(data);
    } catch {}
    setLoading(false);
  };

  const filtered = taskList.filter(t => {
    if (filter.status && t.status !== filter.status) return false;
    if (filter.priority && t.priority !== filter.priority) return false;
    if (filter.search && !t.title.toLowerCase().includes(filter.search.toLowerCase())) return false;
    return true;
  });

  const updateStatus = async (taskId: number, newStatus: Task["status"]) => {
    try {
      await tasksApi.update(taskId, { status: newStatus });
      setTaskList(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    } catch {}
  };

  const deleteTask = async (id: number) => {
    if (!confirm("Delete this task?")) return;
    try {
      await tasksApi.delete(id);
      setTaskList(prev => prev.filter(t => t.id !== id));
    } catch {}
  };

  const createTask = async (data: Partial<Task>) => {
    try {
      const task = await tasksApi.create(data);
      setTaskList(prev => [task, ...prev]);
      setShowCreate(false);
    } catch {}
  };

  const updateTask = async (id: number, data: Partial<Task>) => {
    try {
      const updated = await tasksApi.update(id, data);
      setTaskList(prev => prev.map(t => t.id === id ? updated : t));
      setEditTask(null);
    } catch {}
  };

  return (
    <AppLayout>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-sm text-[var(--text-dim)]">{taskList.length} total tasks</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-[var(--border)] bg-white p-0.5">
            <button onClick={() => setView("kanban")} className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${view === "kanban" ? "bg-[var(--accent)] text-white" : "text-[var(--text-dim)]"}`}>
              Board
            </button>
            <button onClick={() => setView("list")} className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${view === "list" ? "bg-[var(--accent)] text-white" : "text-[var(--text-dim)]"}`}>
              List
            </button>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary rounded-xl px-4 py-2 text-sm font-medium">
            + New Task
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        <input
          type="text" placeholder="Search tasks..." value={filter.search}
          onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
        <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })} className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none">
          <option value="">All Status</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
        </select>
        <select value={filter.priority} onChange={(e) => setFilter({ ...filter, priority: e.target.value })} className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none">
          <option value="">All Priority</option>
          <option value="high">High</option>
          <option value="normal">Normal</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Kanban Board */}
      {view === "kanban" && (
        <div className="grid gap-4 md:grid-cols-3">
          {columns.map(col => {
            const colTasks = filtered.filter(t => t.status === col.key);
            return (
              <div key={col.key} className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4">
                <div className="mb-4 flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${col.color}`} />
                  <h3 className="text-sm font-semibold">{col.label}</h3>
                  <span className="ml-auto text-xs text-[var(--text-dim)]">{colTasks.length}</span>
                </div>
                <div className="space-y-3 min-h-[200px]">
                  {colTasks.map(task => (
                    <TaskCard key={task.id} task={task} onStatusChange={updateStatus} onEdit={setEditTask} onDelete={deleteTask} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {view === "list" && (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-dim)]">
                <th className="px-4 py-3">Task</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(task => (
                <tr key={task.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-card-hover)]">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium">{task.title}</p>
                    {task.description && <p className="text-xs text-[var(--text-dim)] truncate max-w-xs">{task.description}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <select value={task.status} onChange={(e) => updateStatus(task.id, e.target.value as Task["status"])} className="rounded-lg border border-[var(--border)] bg-white px-2 py-1 text-xs outline-none">
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="done">Done</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityColors[task.priority]}`}>{task.priority}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--text-dim)]">
                    {task.due_date ? new Date(task.due_date).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => deleteTask(task.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-[var(--text-dim)]">No tasks found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && <TaskModal onClose={() => setShowCreate(false)} onSave={createTask} />}
      {editTask && <TaskModal task={editTask} onClose={() => setEditTask(null)} onSave={(data) => updateTask(editTask.id, data)} />}
    </AppLayout>
  );
}

function TaskCard({ task, onStatusChange, onEdit, onDelete }: {
  task: Task; onStatusChange: (id: number, s: Task["status"]) => void;
  onEdit: (t: Task) => void; onDelete: (id: number) => void;
}) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "done";

  return (
    <div className="glass rounded-xl p-4 cursor-pointer group" onClick={() => onEdit(task)}>
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium">{task.title}</h4>
        <button onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} className="shrink-0 text-xs text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-600">✕</button>
      </div>
      {task.description && <p className="mt-1 text-xs text-[var(--text-dim)] line-clamp-2">{task.description}</p>}
      <div className="mt-3 flex items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${priorityColors[task.priority]}`}>{task.priority}</span>
        {task.due_date && (
          <span className={`text-[10px] ${isOverdue ? "text-red-500 font-medium" : "text-[var(--text-dim)]"}`}>
            {new Date(task.due_date).toLocaleDateString()}
          </span>
        )}
      </div>
      <div className="mt-2 flex gap-1">
        {columns.map(c => (
          <button
            key={c.key}
            onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, c.key); }}
            className={`rounded-md px-2 py-0.5 text-[10px] transition ${task.status === c.key ? "bg-[var(--accent)] text-white" : "bg-[var(--bg)] text-[var(--text-dim)] hover:bg-[var(--bg-card-hover)]"}`}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function TaskModal({ task, onClose, onSave }: { task?: Task; onClose: () => void; onSave: (data: Partial<Task>) => void }) {
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [status, setStatus] = useState<Task["status"]>(task?.status || "todo");
  const [priority, setPriority] = useState<Task["priority"]>(task?.priority || "normal");
  const [dueDate, setDueDate] = useState(task?.due_date ? task.due_date.split("T")[0] : "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-bold">{task ? "Edit Task" : "New Task"}</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)]" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)]" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as Task["status"])} className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm outline-none">
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value as Task["priority"])} className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm outline-none">
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm outline-none" />
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost rounded-xl px-4 py-2 text-sm">Cancel</button>
          <button onClick={() => onSave({ title, description, status, priority, due_date: dueDate || null })} disabled={!title.trim()} className="btn-primary rounded-xl px-4 py-2 text-sm disabled:opacity-50">
            {task ? "Save" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
