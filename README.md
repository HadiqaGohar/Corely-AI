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

### 🔐 Authentication & Users
| Feature | Description |
|---------|-------------|
| User Registration | Email + password with bcrypt hashing |
| User Login | JWT-based authentication (30 min expiry) |
| JWT Token Management | PyJWT + HS256 signing |
| Password Hashing | bcrypt via passlib |
| Route Protection | All API routes require valid JWT |
| Logout | Token removal + redirect |
| Login UI | Glassmorphic dark theme |
| Registration UI | Confirm-password validation |

### 💬 AI Chat
| Feature | Description |
|---------|-------------|
| Chat Sessions | Create, rename, pin/unpin, delete, search |
| AI Message Sending | Non-streaming responses |
| Streaming AI Responses | SSE — token by token delivery |
| Multi-Provider Fallback | Gemini → OpenRouter → Ollama (local) |
| Model Selector | Auto / Fast / Smart / Free / Ollama |
| Auto-Generated Chat Title | AI-powered session naming |
| Chat History Context | Last 20 messages for context |
| Message Editing | Edit + regenerate responses |
| File Attachments | PDF / DOCX / TXT / CSV / MD (5000 chars) |
| Chat Export | Text or JSON format |
| Voice Input | Web Speech API integration |
| Markdown Rendering | GFM, tables, syntax highlighting |
| Pinned Chats | Quick access to important conversations |
| Search Chats | Full-text search across sessions |

### 📋 Natural Language Task Actions
| Feature | Description |
|---------|-------------|
| AI Task Detection | AI + regex based intent recognition |
| Task Creation | "Schedule meeting at 3pm tomorrow" |
| Task Completion | "Meeting done" |
| Task Progress | "Started working on X" |
| Task Pending | "Keep it pending" |
| Task Listing | "Show pending tasks" |
| Relative Date Parsing | "tomorrow", "next Monday" |
| Auto-Reminders | 15 min before due |
| Smart Keyword Matching | Fuzzy stopword removal |
| Quoted Task Matching | "task name" matching |

### ✅ Task Management
| Feature | Description |
|---------|-------------|
| Task CRUD | Title, description, status, priority, due_date |
| Status Workflow | todo → in_progress → done |
| Task Priority | High / Normal / Low |
| Task Filtering | By status, priority, text search |
| Task Sorting | Any field ascending/descending |
| Due Dates | Overdue detection with visual indicators |
| Task Reminders | Background reminder checker |
| Task Recurrence | Daily / Weekly / Monthly + end date |
| Subtasks | Create, toggle, delete + progress bar |
| Kanban Board | Drag-and-drop with @dnd-kit |
| List View | Table-based task management |
| Drag-and-Drop | Status change via drag |
| Task Analytics | Counts, completion rate, weekly trend |
| Analytics Sidebar | Collapsible with charts |
| Task Detail Modal | Full task editing |
| Overdue Detection | Visual indicators |

### 📄 Document Management
| Feature | Description |
|---------|-------------|
| Multi-Format Upload | PDF, DOCX, TXT, CSV, MD (20MB max) |
| Drag-and-Drop Upload | Intuitive file dropping |
| Upload Progress | Real-time progress bar |
| PDF Extraction | pypdf, per-page processing |
| DOCX Extraction | Paragraph-based reading |
| CSV Parsing | Header-aware, 100 rows |
| Text / Markdown Reading | Plain text support |
| Text Chunking | 1000-char intelligent chunks |
| Vector Embeddings | all-MiniLM-L6-v2 (384 dims) |
| pgvector Search | Cosine similarity search |
| Document Folders | Color-coded, create/delete/move |
| Document Tags | Color-coded, create/delete/assign |
| AI Auto-Tagging | 2-4 tags on upload |
| List / Grid Views | Flexible document browsing |
| Content Viewer | Page-by-page reading |
| Preview Panel | Keyword highlighting |
| Status Tracking | Processing / Ready / Failed |

### 🔍 Document Q&A (RAG)
| Feature | Description |
|---------|-------------|
| Single-Document Q&A | Vector similarity search |
| Cross-Document Q&A | Search across all documents |
| Document Comparison | Compare 2+ documents |
| AI Summarization | One-click document summary |
| Key Point Extraction | Numbered key points |
| Relevance Scores | Per chunk / document scoring |
| Q&A History | Stores questions, answers, sources |
| Q&A Export | Text file export |
| Re-Ask Questions | One-click re-ask |
| Source Attribution | Document + page numbers |

### 🤝 Document Sharing
| Feature | Description |
|---------|-------------|
| Share by Email | View / edit permissions |
| Share Management | View / remove shares |
| Shared With Me | View docs shared by others |

### 🔔 Notification System
| Feature | Description |
|---------|-------------|
| Notification CRUD | Message, type, priority |
| Notification Types | Task, document, chat, workflow, system |
| Priority Levels | Urgent / Normal / Low |
| Filtering | Unread / read / archived, priority, type |
| Mark Read / Unread | Toggle individual notifications |
| Mark All Read | Bulk action |
| Archive / Unarchive | Organize notifications |
| Snooze | 1h / 8h / 24h or custom |
| Unread Badge | Polls every 30s |
| Notification Dropdown | Quick access panel |
| Smart Priority Grouping | Intelligent grouping |
| Background Checks | Reminder checks every 60s |
| Related Item Links | Tasks, docs, chats, workflows |

### ⚙️ Notification Preferences
| Feature | Description |
|---------|-------------|
| Per-Type Preferences | In-app + email toggles |
| Default Preferences | Auto-creates on first access |
| Settings UI | Modal with toggle switches |

### ⚡ Workflow Automation
| Feature | Description |
|---------|-------------|
| Visual Builder | React Flow drag-and-drop |
| Custom Nodes | Trigger + Action nodes |
| Trigger Types | Document uploaded, task overdue, chat message, manual |
| Action Types | Send notification, create task, call webhook |
| Workflow Templates | 4 pre-built templates |
| Template Variables | Mustache-style: `{{doc_name}}`, `{{task_title}}` |
| Workflow CRUD | Create, read, update, delete |
| Toggle Active/Pause | Enable/disable without deleting |
| Dry Run Testing | Simulate without side effects |
| Real Execution | Actually trigger actions |
| Execution History | Logs with status, steps, timestamps |
| Incoming Webhook | External unauthenticated trigger |
| Outgoing Webhooks | httpx, configurable URL/method/payload |
| Node Configuration | Double-click to configure |
| Test Modal | Dry-run/real with step-by-step results |
| Execution History Panel | Past executions with details |
| Template Gallery | Browse + load pre-built templates |

### 💡 AI Suggestions
| Feature | Description |
|---------|-------------|
| Task-Based Suggestions | Overdue, due today, stale, overload |
| New User Suggestions | Prompt to create first task |
| Manual Generation | Refresh button |
| Apply Suggestions | One-click create/navigate |
| Thumbs Up/Down | Feedback mechanism |
| Dismiss Suggestions | Remove unwanted suggestions |
| Suggestion Stats | Counts + acceptance rate |
| Priority Display | High / Normal / Low with colors |
| Expandable Reason | "Why this suggestion?" |

### 📊 Dashboard
| Feature | Description |
|---------|-------------|
| Unified Stats | Tasks, docs, chat, notifications, Q&A, suggestions, workflows |
| Productivity Score | 0-100 based on metrics |
| Productivity Ring | SVG circular progress chart |
| Task Activity Chart | 7-day bar chart |
| Recent Activity | Latest tasks, docs, chat, notifications |
| Quick Actions | Shortcuts to main features |
| Stat Cards | Clickable with counts |
| Time-Based Greeting | Morning / Afternoon / Evening |
| Footer Stats | Q&A, Chat Messages, Docs, Workflows |

### 🎨 Landing Page & UI
| Feature | Description |
|---------|-------------|
| Landing Page | Hero, feature grid, CTA |
| Collapsible Sidebar | Icons-only mode |
| Mobile Sidebar | Hamburger menu, overlay, auto-close |
| Top Bar | Notification bell + user avatar |
| App Layout | Sidebar + topbar + main content |
| Responsive Design | Mobile-first Tailwind CSS |

### 🏗️ Infrastructure & Deployment
| Feature | Description |
|---------|-------------|
| Health Check | `/health` endpoint |
| Render.com | `render.yaml` config |
| Docker | Python 3.11-slim containerization |
| Nginx Reverse Proxy | SSL, HTTP→HTTPS redirect |
| WebSocket HMR | Next.js hot reload |
| SSE Buffering | `X-Accel-Buffering: no` |
| SSL/TLS | Let's Encrypt certificates |
| CORS | Configurable origins |
| Environment Variables | DATABASE_URL, JWT_SECRET, AI_API_KEY, etc. |
| Background Tasks | FastAPI lifespan management |
| PostgreSQL + pgvector | Semantic search engine |

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

## 📦 Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+ with pgvector extension

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/corely

# Auth
JWT_SECRET=your-super-secret-key
JWT_ALGORITHM=HS256
JWT_EXPIRY_MINUTES=30

# AI Providers
GEMINI_API_KEY=your-gemini-key
OPENROUTER_API_KEY=your-openrouter-key
OLLAMA_BASE_URL=http://localhost:11434

# App
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Backend Setup

```bash
# Install dependencies
pip install -r requirements.txt

# Run database migrations
python -m alembic upgrade head

# Start the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

### Docker Setup

```bash
# Build and run
docker-compose up --build
```

---

## 📁 Project Structure

```
corely-ai/
├── app/                    # Next.js frontend
│   ├── components/         # React components
│   ├── pages/              # Page routes
│   └── styles/             # Global styles
├── backend/                # FastAPI backend
│   ├── routes/             # API endpoints
│   ├── models/             # SQLAlchemy models
│   ├── services/           # Business logic
│   └── utils/              # Helper functions
├── docker/
│   └── Dockerfile          # Container config
├── nginx/
│   └── nginx.conf          # Reverse proxy
├── render.yaml             # Render deployment
└── requirements.txt        # Python dependencies
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

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
