<div align="center">

# 🧠 Corely AI

**Your all-in-one AI-powered productivity workspace**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql)](https://www.postgresql.org/)
[![pgvector](https://img.shields.io/badge/pgvector-Semantic%20Search-FF6B6B)](https://github.com/pgvector/pgvector)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

[Live Demo](https://corely-ai.onrender.com) · [Report Bug](https://github.com/HadiqaGohar/Corely-AI/issues) · [Request Feature](https://github.com/HadiqaGohar/Corely-AI/issues)

</div>

---

## ✨ Overview

Corely AI is a comprehensive productivity platform that combines AI chat, task management, document processing with RAG, workflow automation, and smart notifications — all in one beautifully designed interface.

Built with **Next.js 14**, **FastAPI**, **PostgreSQL + pgvector**, and powered by multiple AI providers for maximum reliability.

---

## 🚀 Features (~165 Features)

### 🔐 Authentication & Users (8)
- User Registration (email + password, bcrypt hashing)
- User Login (JWT-based, 30 min expiry)
- JWT Token Management (PyJWT + HS256)
- Password Hashing (bcrypt via passlib)
- Route Protection (all API routes require JWT)
- Logout (token removal + redirect)
- Login UI (glassmorphic dark theme)
- Registration UI (confirm-password validation)

### 💬 AI Chat (17)
- Chat Sessions (create, rename, pin/unpin, delete, search)
- AI Message Sending (non-streaming)
- Streaming AI Responses (SSE - token by token)
- Multi-Provider AI Fallback (Gemini → OpenRouter → Ollama local)
- Model Selector (Auto/Fast/Smart/Free/Ollama)
- Auto-Generated Chat Title
- Chat History Context (last 20 messages)
- Message Editing (edit + regenerate)
- Message Regeneration (delete + redo)
- File Attachments (PDF/DOCX/TXT/CSV/MD, 5000 chars)
- Chat Export (text or JSON)
- Voice Input (Web Speech API)
- Copy Messages
- Markdown Rendering (GFM, tables, syntax highlighting)
- Pinned Chats
- Search Chats
- Streaming Content Display

### 📋 Natural Language Task Actions (10)
- AI Task Detection (AI + regex based)
- Task Creation ("Schedule meeting at 3pm tomorrow")
- Task Completion ("Meeting done")
- Task Progress ("Started working on X")
- Task Pending ("Keep it pending")
- Task Listing ("Show pending tasks")
- Relative Date Parsing ("tomorrow", "next Monday")
- Auto-Reminders (15 min before due)
- Smart Keyword Matching (fuzzy stopword removal)
- Quoted Task Matching ("task name")

### ✅ Task Management (16)
- Task CRUD (title, description, status, priority, due_date)
- Task Status Workflow (todo → in_progress → done)
- Task Priority (high/normal/low)
- Task Filtering (status, priority, text search)
- Task Sorting (any field asc/desc)
- Task Due Dates (overdue detection)
- Task Reminders (reminder_at with background checker)
- Task Recurrence (daily/weekly/monthly + end date)
- Subtasks (create, toggle, delete + progress bar)
- Kanban Board View (drag-and-drop with @dnd-kit)
- List View (table-based)
- Drag-and-Drop Status Change
- Task Analytics (counts, completion rate, weekly trend)
- Analytics Sidebar (collapsible with charts)
- Task Detail Modal
- Overdue Detection (visual indicators)

### 📄 Document Management (17)
- Multi-Format Upload (PDF, DOCX, TXT, CSV, MD, 20MB max)
- Drag-and-Drop Upload
- Upload Progress Tracking (real-time bar)
- PDF Text Extraction (pypdf, per-page)
- DOCX Text Extraction (paragraph-based)
- CSV Parsing (header-aware, 100 rows)
- Plain Text / Markdown Reading
- Text Chunking (1000-char chunks)
- Vector Embeddings (all-MiniLM-L6-v2, 384 dims)
- pgvector Similarity Search (cosine)
- Document Folders (color-coded, create/delete/move)
- Document Tags (color-coded, create/delete/assign)
- AI Auto-Tagging (2-4 tags on upload)
- Document List/Search/Sort (list + grid views)
- Document Content Viewer (page-by-page)
- Document Preview Panel (keyword highlighting)
- Document Status Tracking (processing/ready/failed)

### 🔍 Document Q&A - RAG (10)
- Single-Document Q&A (vector similarity search)
- Cross-Document Q&A (search all docs)
- Document Comparison (2+ docs)
- AI Summarization (one-click)
- Key Point Extraction (numbered points)
- Relevance Scores (per chunk/document)
- Q&A History (stores questions, answers, sources)
- Q&A History Export (text file)
- Re-Ask Questions (one-click re-ask)
- Source Attribution (document + page numbers)

### 🤝 Document Sharing (3)
- Share by Email (view/edit permissions)
- Share Management (view/remove shares)
- Shared With Me (view docs shared by others)

### 🔔 Notification System (13)
- Notification CRUD (message, type, priority)
- Notification Types (task, document, chat, workflow, system)
- Notification Priority (urgent/normal/low)
- Filtering (unread/read/archived, priority, type)
- Mark Read/Unread
- Mark All Read (bulk)
- Archive/Unarchive
- Snooze (1/8/24 hours or custom)
- Unread Count Badge (polls every 30s)
- Notification Dropdown (quick access)
- Smart Priority Grouping
- Background Reminder Checks (every 60s)
- Related Item Links (tasks/documents/chats/workflows)

### ⚙️ Notification Preferences (3)
- Per-Type Preferences (in-app + email toggles)
- Default Preferences (auto-creates on first access)
- Settings UI (modal with toggle switches)

### ⚡ Workflow Automation (17)
- Visual Workflow Builder (React Flow drag-and-drop)
- Custom Nodes (Trigger + Action nodes)
- Trigger Types (document uploaded, task overdue, chat message, manual)
- Action Types (send notification, create task, call webhook)
- Workflow Templates (4 pre-built templates)
- Template Variables (mustache-style: {{doc_name}}, {{task_title}})
- Workflow CRUD (create, read, update, delete)
- Toggle Active/Pause (enable/disable without deleting)
- Dry Run Testing (simulate without side effects)
- Real Execution (actually trigger actions)
- Execution History (logs with status, steps, timestamps)
- Incoming Webhook (external unauthenticated trigger)
- Outgoing Webhooks (httpx, configurable URL/method/payload)
- Node Configuration (double-click to configure)
- Test Modal (dry-run/real with step-by-step results)
- Execution History Panel (past executions with details)
- Template Gallery (browse + load pre-built templates)

### 💡 AI Suggestions (9)
- Task-Based Suggestions (overdue, due today, stale, overload)
- New User Suggestions (prompt to create first task)
- Manual Generation (refresh button)
- Apply Suggestions (one-click create/navigate)
- Thumbs Up/Down (feedback mechanism)
- Dismiss Suggestions
- Suggestion Stats (counts + acceptance rate)
- Priority Display (high/normal/low with colors)
- Expandable Reason ("Why this suggestion?")

### 📊 Dashboard (9)
- Unified Stats Overview (tasks, docs, chat, notifications, Q&A, suggestions, workflows)
- Productivity Score (0-100 based on metrics)
- Productivity Ring Chart (SVG circular progress)
- Task Activity Chart (7-day bar chart)
- Recent Activity Lists (latest tasks, docs, chat, notifications)
- Quick Actions Panel (shortcuts to main features)
- Stat Cards (clickable with counts)
- Time-Based Greeting (Morning/Afternoon/Evening)
- Footer Stats Row (Q&A, Chat Messages, Docs, Workflows)

### 🎨 Landing Page & UI (6)
- Landing Page (hero, feature grid, CTA)
- Collapsible Sidebar (icons-only mode)
- Mobile Sidebar (hamburger menu, overlay, auto-close)
- Top Bar (notification bell + user avatar)
- App Layout (sidebar + topbar + main content)
- Responsive Design (mobile-first Tailwind CSS)

### 🏗️ Infrastructure & Deployment (11)
- Health Check endpoint
- Render.com Deployment (render.yaml config)
- Docker Containerization (Python 3.11-slim)
- Nginx Reverse Proxy (SSL, HTTP→HTTPS redirect)
- WebSocket HMR Support (Next.js hot reload)
- SSE Buffering Disabled (X-Accel-Buffering: no)
- SSL/TLS (Let's Encrypt)
- CORS Configuration
- Environment Variables (DATABASE_URL, JWT_SECRET, AI_API_KEY, etc.)
- Background Task Lifecycle (FastAPI lifespan)
- PostgreSQL + pgvector (semantic search)

### 🗄️ Database Schema (16 Models)

```
User ─┬─ Task ──── Subtask
      ├─ ChatSession ── ChatMessage
      ├─ Document ─┬─ DocumentChunk
      │             ├─ DocumentQA
      │             └─ DocumentShare
      ├─ Folder
      ├─ Tag
      ├─ Notification ── NotificationPreference
      ├─ Suggestion
      └─ Workflow ── WorkflowExecution
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14, React, TypeScript, Tailwind CSS |
| **UI Components** | ShadCN UI, React Flow, @dnd-kit |
| **Backend** | FastAPI (Python) |
| **Database** | PostgreSQL 15 + pgvector |
| **Auth** | JWT (PyJWT + HS256), bcrypt |
| **AI Providers** | Google Gemini, OpenRouter, Ollama (local) |
| **Embeddings** | all-MiniLM-L6-v2 (sentence-transformers) |
| **Document Processing** | pypdf, python-docx, pandas |
| **Webhooks** | httpx |
| **Deployment** | Docker, Render.com, Nginx |

---

## 📦 Project Structure

```
corely-ai/
├── frontend/           # Next.js 14 frontend
│   ├── src/
│   │   ├── app/        # App router pages
│   │   ├── components/ # React components
│   │   ├── lib/        # Utilities & API client
│   │   └── styles/     # Global styles (Tailwind)
│   └── package.json
├── backend/            # FastAPI backend
│   ├── routes/         # API endpoints
│   ├── models/         # SQLAlchemy models
│   ├── services/       # Business logic
│   ├── utils/          # Helper functions
│   └── requirements.txt
├── docker/
│   └── Dockerfile
├── nginx/
│   └── nginx.conf
├── render.yaml
└── README.md
```

---

## 📦 Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+ with pgvector extension

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:***@localhost:5432/corely

# Auth
JWT_SECRET=your-secret-key
JWT_ALGORITHM=HS256
JWT_EXPIRY_MINUTES=30

# AI Providers
GEMINI_API_KEY=***
OPENROUTER_API_KEY=***
OLLAMA_BASE_URL=http://localhost:11434

# App
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
python -m alembic upgrade head
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Docker Setup

```bash
docker-compose up --build
```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 👩‍💻 Author

**Hadiqa Gohar** — [GitHub](https://github.com/HadiqaGohar)

---

<div align="center">

**Built with ❤️ using Next.js, FastAPI, and AI**

</div>
