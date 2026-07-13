const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("corely_token");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.detail || body.error || `Request failed (${res.status})`, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Auth ────────────────────────────────────────
export const auth = {
  login: (email: string, password: string) =>
    request<{ token: string; user: { id: number; name: string; email: string } }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (name: string, email: string, password: string) =>
    request<{ token: string; user: { id: number; name: string; email: string } }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),
};

// ─── Chat ────────────────────────────────────────
export interface ChatSession {
  id: number;
  title: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
  message_count?: number;
}

export interface ChatMessage {
  id: number;
  session_id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export const chat = {
  listSessions: (search?: string) =>
    request<ChatSession[]>(`/api/chat/sessions${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  createSession: (title?: string) =>
    request<ChatSession>("/api/chat/sessions", {
      method: "POST",
      body: JSON.stringify({ title }),
    }),
  renameSession: (id: number, title: string) =>
    request<ChatSession>(`/api/chat/sessions/${id}`, {
      method: "PUT",
      body: JSON.stringify({ title }),
    }),
  togglePin: (id: number, pinned: boolean) =>
    request<ChatSession>(`/api/chat/sessions/${id}`, {
      method: "PUT",
      body: JSON.stringify({ pinned }),
    }),
  deleteSession: (id: number) =>
    request<void>(`/api/chat/sessions/${id}`, { method: "DELETE" }),
  getMessages: (sessionId: number) =>
    request<ChatMessage[]>(`/api/chat/sessions/${sessionId}/messages`),
  sendMessage: (sessionId: number, content: string, model?: string) =>
    request<ChatMessage>(`/api/chat/sessions/${sessionId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content, model }),
    }),
  sendMessageStream: async function* (sessionId: number, content: string, model?: string) {
    const token = getToken();
    const res = await fetch(`${API_BASE}/api/chat/sessions/${sessionId}/messages/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ content, model }),
    });
    if (!res.ok) throw new ApiError("Stream failed", res.status);
    const reader = res.body?.getReader();
    if (!reader) return;
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") return;
          try {
            yield JSON.parse(data);
          } catch {}
        }
      }
    }
  },
  editMessage: (sessionId: number, messageId: number, content: string) =>
    request<ChatMessage>(`/api/chat/sessions/${sessionId}/messages/${messageId}`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    }),
  regenerateMessage: (sessionId: number, messageId: number) =>
    request<ChatMessage>(`/api/chat/sessions/${sessionId}/messages/${messageId}/regenerate`, {
      method: "POST",
    }),
  exportChat: (sessionId: number, format: "text" | "json" = "text") =>
    request<string>(`/api/chat/sessions/${sessionId}/export?format=${format}`),
};

// ─── Tasks ───────────────────────────────────────
export interface Task {
  id: number;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "done";
  priority: "high" | "normal" | "low";
  due_date: string | null;
  reminder_at: string | null;
  recurrence: string | null;
  created_at: string;
  updated_at: string;
  subtasks?: Subtask[];
}

export interface Subtask {
  id: number;
  task_id: number;
  title: string;
  completed: boolean;
}

export const tasks = {
  list: (params?: { status?: string; priority?: string; search?: string; sort?: string; order?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.priority) qs.set("priority", params.priority);
    if (params?.search) qs.set("search", params.search);
    if (params?.sort) qs.set("sort", params.sort);
    if (params?.order) qs.set("order", params.order);
    const q = qs.toString();
    return request<Task[]>(`/api/tasks${q ? `?${q}` : ""}`);
  },
  create: (data: Partial<Task>) =>
    request<Task>("/api/tasks", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Task>) =>
    request<Task>(`/api/tasks/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: number) =>
    request<void>(`/api/tasks/${id}`, { method: "DELETE" }),
  getSubtasks: (taskId: number) =>
    request<Subtask[]>(`/api/tasks/${taskId}/subtasks`),
  createSubtask: (taskId: number, title: string) =>
    request<Subtask>(`/api/tasks/${taskId}/subtasks`, {
      method: "POST",
      body: JSON.stringify({ title }),
    }),
  toggleSubtask: (taskId: number, subtaskId: number) =>
    request<Subtask>(`/api/tasks/${taskId}/subtasks/${subtaskId}`, {
      method: "PUT",
    }),
  deleteSubtask: (taskId: number, subtaskId: number) =>
    request<void>(`/api/tasks/${taskId}/subtasks/${subtaskId}`, {
      method: "DELETE",
    }),
  analytics: () =>
    request<any>("/api/tasks/analytics"),
};

// ─── Documents ───────────────────────────────────
export interface Document {
  id: number;
  title: string;
  filename: string;
  file_type: string;
  file_size: number;
  status: "processing" | "ready" | "failed";
  folder_id: number | null;
  tags: Tag[];
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
}

export interface Folder {
  id: number;
  name: string;
  color: string;
  document_count?: number;
}

export const documents = {
  list: (params?: { folder_id?: number; tag_id?: number; search?: string; sort?: string; view?: string }) => {
    const qs = new URLSearchParams();
    if (params?.folder_id) qs.set("folder_id", String(params.folder_id));
    if (params?.tag_id) qs.set("tag_id", String(params.tag_id));
    if (params?.search) qs.set("search", params.search);
    if (params?.sort) qs.set("sort", params.sort);
    if (params?.view) qs.set("view", params.view);
    const q = qs.toString();
    return request<Document[]>(`/api/documents${q ? `?${q}` : ""}`);
  },
  upload: (file: File, folder_id: number | null, onProgress?: (p: number) => void) => {
    const token = getToken();
    const formData = new FormData();
    formData.append("file", file);
    if (folder_id !== null) formData.append("folder_id", String(folder_id));

    return new Promise<Document>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API_BASE}/api/documents`);
      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new ApiError("Upload failed", xhr.status));
        }
      };
      xhr.onerror = () => reject(new ApiError("Upload failed", 0));
      xhr.send(formData);
    });
  },
  get: (id: number) => request<Document>(`/api/documents/${id}`),
  delete: (id: number) => request<void>(`/api/documents/${id}`, { method: "DELETE" }),
  move: (id: number, folderId: number | null) =>
    request<Document>(`/api/documents/${id}/move`, {
      method: "PUT",
      body: JSON.stringify({ folder_id: folderId }),
    }),
  getChunks: (id: number) => request<any[]>(`/api/documents/${id}/chunks`),
  qa: (documentId: number, question: string) =>
    request<any>("/api/documents/qa", {
      method: "POST",
      body: JSON.stringify({ document_id: documentId, question }),
    }),
  qaAll: (question: string) =>
    request<any>("/api/documents/qa", {
      method: "POST",
      body: JSON.stringify({ question, cross_document: true }),
    }),
  summarize: (id: number) =>
    request<any>(`/api/documents/${id}/summarize`, { method: "POST" }),
  // Folders
  listFolders: () => request<Folder[]>("/api/folders"),
  createFolder: (name: string, color: string) =>
    request<Folder>("/api/folders", { method: "POST", body: JSON.stringify({ name, color }) }),
  deleteFolder: (id: number) =>
    request<void>(`/api/folders/${id}`, { method: "DELETE" }),
  // Tags
  listTags: () => request<Tag[]>("/api/tags"),
  createTag: (name: string, color: string) =>
    request<Tag>("/api/tags", { method: "POST", body: JSON.stringify({ name, color }) }),
  deleteTag: (id: number) =>
    request<void>(`/api/tags/${id}`, { method: "DELETE" }),
  assignTag: (docId: number, tagId: number) =>
    request<void>(`/api/documents/${docId}/tags`, {
      method: "POST",
      body: JSON.stringify({ tag_id: tagId }),
    }),
  removeTag: (docId: number, tagId: number) =>
    request<void>(`/api/documents/${docId}/tags/${tagId}`, { method: "DELETE" }),
};

// ─── Notifications ───────────────────────────────
export interface Notification {
  id: number;
  message: string;
  type: "task" | "document" | "chat" | "workflow" | "system";
  priority: "urgent" | "normal" | "low";
  read: boolean;
  archived: boolean;
  snoozed_until: string | null;
  related_type: string | null;
  related_id: number | null;
  created_at: string;
}

export const notifications = {
  list: (params?: { unread_only?: boolean; priority?: string; type?: string }) => {
    const qs = new URLSearchParams();
    if (params?.unread_only) qs.set("unread_only", "true");
    if (params?.priority) qs.set("priority", params.priority);
    if (params?.type) qs.set("type", params.type);
    const q = qs.toString();
    return request<Notification[]>(`/api/notifications${q ? `?${q}` : ""}`);
  },
  getUnreadCount: () => request<{ count: number }>("/api/notifications/unread-count"),
  markRead: (id: number) =>
    request<void>(`/api/notifications/${id}/read`, { method: "PUT" }),
  markUnread: (id: number) =>
    request<void>(`/api/notifications/${id}/unread`, { method: "PUT" }),
  markAllRead: () =>
    request<void>("/api/notifications/read-all", { method: "PUT" }),
  archive: (id: number) =>
    request<void>(`/api/notifications/${id}/archive`, { method: "PUT" }),
  unarchive: (id: number) =>
    request<void>(`/api/notifications/${id}/unarchive`, { method: "PUT" }),
  snooze: (id: number, hours: number) =>
    request<void>(`/api/notifications/${id}/snooze`, {
      method: "PUT",
      body: JSON.stringify({ hours }),
    }),
  delete: (id: number) =>
    request<void>(`/api/notifications/${id}`, { method: "DELETE" }),
  getPreferences: () => request<any>("/api/notifications/preferences"),
  updatePreferences: (prefs: any) =>
    request<any>("/api/notifications/preferences", {
      method: "PUT",
      body: JSON.stringify(prefs),
    }),
};

// ─── Workflows ───────────────────────────────────
export interface Workflow {
  id: number;
  name: string;
  description: string;
  active: boolean;
  nodes: any[];
  edges: any[];
  created_at: string;
  updated_at: string;
}

export interface WorkflowExecution {
  id: number;
  workflow_id: number;
  status: "running" | "success" | "failed";
  steps: any[];
  started_at: string;
  completed_at: string | null;
}

export const workflows = {
  list: () => request<Workflow[]>("/api/workflows"),
  get: (id: number) => request<Workflow>(`/api/workflows/${id}`),
  create: (data: Partial<Workflow>) =>
    request<Workflow>("/api/workflows", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Workflow>) =>
    request<Workflow>(`/api/workflows/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: number) =>
    request<void>(`/api/workflows/${id}`, { method: "DELETE" }),
  toggleActive: (id: number, active: boolean) =>
    request<Workflow>(`/api/workflows/${id}/toggle`, {
      method: "PUT",
      body: JSON.stringify({ active }),
    }),
  execute: (id: number, dryRun = false) =>
    request<WorkflowExecution>(`/api/workflows/${id}/execute`, {
      method: "POST",
      body: JSON.stringify({ dry_run: dryRun }),
    }),
  getExecutions: (id: number) =>
    request<WorkflowExecution[]>(`/api/workflows/${id}/executions`),
  getTemplates: () => request<any[]>("/api/workflows/templates"),
};

// ─── Dashboard ───────────────────────────────────
export const dashboard = {
  getStats: () => request<any>("/api/dashboard/stats"),
  getActivity: () => request<any>("/api/dashboard/activity"),
  getProductivity: () => request<any>("/api/dashboard/productivity"),
};

// ─── Suggestions ─────────────────────────────────
export interface Suggestion {
  id: number;
  type: string;
  title: string;
  description: string;
  reason: string;
  priority: "high" | "normal" | "low";
  applied: boolean;
  dismissed: boolean;
  created_at: string;
}

export const suggestions = {
  list: () => request<Suggestion[]>("/api/suggestions"),
  apply: (id: number) =>
    request<Suggestion>(`/api/suggestions/${id}/apply`, { method: "POST" }),
  dismiss: (id: number) =>
    request<void>(`/api/suggestions/${id}/dismiss`, { method: "POST" }),
  feedback: (id: number, positive: boolean) =>
    request<void>(`/api/suggestions/${id}/feedback`, {
      method: "POST",
      body: JSON.stringify({ positive }),
    }),
  getStats: () => request<any>("/api/suggestions/stats"),
};

export { ApiError };
