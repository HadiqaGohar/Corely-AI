"use client";

export interface Notification {
  id: number;
  message: string;
  type: "task" | "document" | "chat" | "workflow" | "system";
  priority: "urgent" | "normal" | "low";
  read: boolean;
  archived: boolean;
  created_at: string;
  snoozedUntil?: string | null;
}

type Listener = () => void;

const initial: Notification[] = [
  { id: 1, message: "Task 'Design dashboard' is overdue", type: "task", priority: "urgent", read: false, archived: false, created_at: "2026-07-13T06:00:00Z" },
  { id: 2, message: "Document 'API Docs' uploaded successfully", type: "document", priority: "normal", read: false, archived: false, created_at: "2026-07-13T05:30:00Z" },
  { id: 3, message: "New message in Project Planning chat", type: "chat", priority: "normal", read: false, archived: false, created_at: "2026-07-13T04:15:00Z" },
  { id: 4, message: "Workflow 'Auto-Tag' executed successfully", type: "workflow", priority: "low", read: true, archived: false, created_at: "2026-07-12T22:00:00Z" },
  { id: 5, message: "System maintenance scheduled for tonight", type: "system", priority: "normal", read: true, archived: false, created_at: "2026-07-12T18:00:00Z" },
  { id: 6, message: "3 tasks due tomorrow", type: "task", priority: "normal", read: false, archived: false, created_at: "2026-07-12T12:00:00Z" },
  { id: 7, message: "Document 'Budget Report' shared with team", type: "document", priority: "low", read: true, archived: true, created_at: "2026-07-11T10:00:00Z" },
];

let notifs: Notification[] = [...initial];
const listeners: Set<Listener> = new Set();

export function getNotifications(): Notification[] {
  return notifs;
}

export function updateNotifications(fn: (prev: Notification[]) => Notification[]) {
  notifs = fn(notifs);
  listeners.forEach((l) => l());
}

export function subscribeNotifications(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const typeIcons: Record<string, string> = {
  task: "✅",
  document: "📄",
  chat: "💬",
  workflow: "⚡",
  system: "⚙️",
};

export const priorityColors: Record<string, string> = {
  urgent: "bg-red-100 text-red-600",
  normal: "bg-blue-100 text-blue-600",
  low: "bg-gray-100 text-gray-500",
};

export const relatedItemLabels: Record<string, string> = {
  task: "View Task",
  document: "View Document",
  chat: "Open Chat",
  workflow: "View Workflow",
  system: "View System Log",
};

export const relatedItemHrefs: Record<string, string> = {
  task: "/tasks",
  document: "/documents",
  chat: "/chat",
  workflow: "/workflows",
  system: "/settings",
};
