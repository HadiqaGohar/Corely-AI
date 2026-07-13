"use client";

import { useState } from "react";
import AppLayout from "@/components/AppLayout";

const initTasks = [
  { id: 1, title: "Design new dashboard layout", description: "Create wireframes and mockups", status: "todo", priority: "high", due_date: "2026-07-15" },
  { id: 2, title: "Implement user authentication", description: "JWT-based auth with refresh tokens", status: "in_progress", priority: "high", due_date: "2026-07-14" },
  { id: 3, title: "Write API documentation", description: "Swagger/OpenAPI spec", status: "todo", priority: "normal", due_date: "2026-07-18" },
  { id: 4, title: "Set up CI/CD pipeline", description: "GitHub Actions workflow", status: "todo", priority: "normal", due_date: null },
  { id: 5, title: "Fix navigation bug", description: "Sidebar doesn't close on mobile", status: "in_progress", priority: "high", due_date: "2026-07-13" },
  { id: 6, title: "Review pull requests", description: "Review 3 open PRs", status: "done", priority: "normal", due_date: "2026-07-12" },
  { id: 7, title: "Update dependencies", description: "npm audit fix", status: "done", priority: "low", due_date: null },
  { id: 8, title: "Deploy to production", description: "Final testing and deployment", status: "todo", priority: "high", due_date: "2026-07-20" },
];

const columns = [
  { key: "todo" as const, label: "To Do", color: "bg-gray-400" },
  { key: "in_progress" as const, label: "In Progress", color: "bg-amber-400" },
  { key: "done" as const, label: "Done", color: "bg-emerald-400" },
];

const priorityColors: Record<string, string> = {
  high: "bg-red-100 text-red-600", normal: "bg-blue-100 text-blue-600", low: "bg-gray-100 text-gray-500",
};

export default function TasksPage() {
  const [tasks, setTasks] = useState(initTasks);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [filter, setFilter] = useState({ status: "", priority: "", search: "" });
  const [showCreate, setShowCreate] = useState(false);
  const [editTask, setEditTask] = useState<any>(null);

  const filtered = tasks.filter(t => {
    if (filter.status && t.status !== filter.status) return false;
    if (filter.priority && t.priority !== filter.priority) return false;
    if (filter.search && !t.title.toLowerCase().includes(filter.search.toLowerCase())) return false;
    return true;
  });

  const updateStatus = (id: number, status: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
  };

  const deleteTask = (id: number) => {
    if (confirm("Delete this task?")) setTasks(prev => prev.filter(t => t.id !== id));
  };

  const createTask = (data: any) => {
    setTasks(prev => [{ id: Date.now(), ...data, status: "todo" }, ...prev]);
    setShowCreate(false);
  };

  const updateTask = (id: number, data: any) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
    setEditTask(null);
  };

  return (
    <AppLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-sm text-[var(--text-dim)]">{tasks.length} total tasks</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-[var(--border)] bg-white p-0.5">
            <button onClick={() => setView("kanban")} className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${view === "kanban" ? "bg-[var(--accent)] text-white" : "text-[var(--text-dim)]"}`}>Board</button>
            <button onClick={() => setView("list")} className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${view === "list" ? "bg-[var(--accent)] text-white" : "text-[var(--text-dim)]"}`}>List</button>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary rounded-xl px-4 py-2 text-sm font-medium">+ New Task</button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <input type="text" placeholder="Search tasks..." value={filter.search} onChange={e => setFilter({ ...filter, search: e.target.value })}
          className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]" />
        <select value={filter.status} onChange={e => setFilter({ ...filter, status: e.target.value })} className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none">
          <option value="">All Status</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
        </select>
        <select value={filter.priority} onChange={e => setFilter({ ...filter, priority: e.target.value })} className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none">
          <option value="">All Priority</option>
          <option value="high">High</option>
          <option value="normal">Normal</option>
          <option value="low">Low</option>
        </select>
      </div>

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
                    <div key={task.id} className="glass rounded-xl p-4 cursor-pointer group" onClick={() => setEditTask(task)}>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-medium">{task.title}</h4>
                        <button onClick={e => { e.stopPropagation(); deleteTask(task.id); }} className="shrink-0 text-xs text-red-400 opacity-0 group-hover:opacity-100">✕</button>
                      </div>
                      {task.description && <p className="mt-1 text-xs text-[var(--text-dim)] line-clamp-2">{task.description}</p>}
                      <div className="mt-3 flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${priorityColors[task.priority]}`}>{task.priority}</span>
                        {task.due_date && <span className="text-[10px] text-[var(--text-dim)]">{new Date(task.due_date).toLocaleDateString()}</span>}
                      </div>
                      <div className="mt-2 flex gap-1">
                        {columns.map(c => (
                          <button key={c.key} onClick={e => { e.stopPropagation(); updateStatus(task.id, c.key); }}
                            className={`rounded-md px-2 py-0.5 text-[10px] transition ${task.status === c.key ? "bg-[var(--accent)] text-white" : "bg-[var(--bg)] text-[var(--text-dim)] hover:bg-[var(--bg-card-hover)]"}`}>
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "list" && (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-dim)]">
                <th className="px-4 py-3">Task</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Priority</th><th className="px-4 py-3">Due</th><th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(task => (
                <tr key={task.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-card-hover)]">
                  <td className="px-4 py-3"><p className="text-sm font-medium">{task.title}</p></td>
                  <td className="px-4 py-3">
                    <select value={task.status} onChange={e => updateStatus(task.id, e.target.value)} className="rounded-lg border border-[var(--border)] bg-white px-2 py-1 text-xs outline-none">
                      <option value="todo">To Do</option><option value="in_progress">In Progress</option><option value="done">Done</option>
                    </select>
                  </td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityColors[task.priority]}`}>{task.priority}</span></td>
                  <td className="px-4 py-3 text-xs text-[var(--text-dim)]">{task.due_date ? new Date(task.due_date).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3"><button onClick={() => deleteTask(task.id)} className="text-xs text-red-500 hover:underline">Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && <Modal onClose={() => setShowCreate(false)} onSave={createTask} />}
      {editTask && <Modal task={editTask} onClose={() => setEditTask(null)} onSave={(d: any) => updateTask(editTask.id, d)} />}
    </AppLayout>
  );
}

function Modal({ task, onClose, onSave }: { task?: any; onClose: () => void; onSave: (d: any) => void }) {
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [status, setStatus] = useState(task?.status || "todo");
  const [priority, setPriority] = useState(task?.priority || "normal");
  const [dueDate, setDueDate] = useState(task?.due_date || "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-bold">{task ? "Edit Task" : "New Task"}</h2>
        <div className="space-y-4">
          <div><label className="mb-1 block text-sm font-medium">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)]" /></div>
          <div><label className="mb-1 block text-sm font-medium">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)]" /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="mb-1 block text-sm font-medium">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm outline-none">
                <option value="todo">To Do</option><option value="in_progress">In Progress</option><option value="done">Done</option></select></div>
            <div><label className="mb-1 block text-sm font-medium">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm outline-none">
                <option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option></select></div>
            <div><label className="mb-1 block text-sm font-medium">Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm outline-none" /></div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost rounded-xl px-4 py-2 text-sm">Cancel</button>
          <button onClick={() => title.trim() && onSave({ title, description, status, priority, due_date: dueDate })} disabled={!title.trim()} className="btn-primary rounded-xl px-4 py-2 text-sm disabled:opacity-50">{task ? "Save" : "Create"}</button>
        </div>
      </div>
    </div>
  );
}
