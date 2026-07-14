"""
Corely AI — FastAPI Backend
Main application with all routes.
"""
import os
import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from models import init_db, SessionLocal
from services.reminders import check_reminders, check_overdue_tasks


# ── Background Task Runner ────────────────────────────
async def _reminder_loop():
    """Run reminder and overdue checks every 60 seconds."""
    while True:
        try:
            db = SessionLocal()
            try:
                reminders = check_reminders(db)
                overdue = check_overdue_tasks(db)
                if reminders or overdue:
                    print(f"🔔 Reminders: {reminders} notifications, Overdue: {overdue} notifications")
            finally:
                db.close()
        except Exception as e:
            print(f"⚠️ Reminder check error: {e}")
        await asyncio.sleep(60)


# ── Lifespan ───────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown events."""
    # Startup: create tables
    init_db()
    print("✅ Database tables created")

    # Start background reminder checker
    task = asyncio.create_task(_reminder_loop())
    print("🔄 Background reminder checker started")

    yield

    # Shutdown: cancel background task
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass
    print("👋 Shutting down")


# ── App ────────────────────────────────────────────────
app = FastAPI(
    title="Corely AI Backend",
    version="1.0.0",
    description="Your all-in-one AI-powered productivity workspace",
    lifespan=lifespan,
)

# ── CORS ───────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://corely-ai.vercel.app",
        "http://localhost:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static files (uploads) ────────────────────────────
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# ── Routes ─────────────────────────────────────────────
from routes.auth import router as auth_router
from routes.tasks import router as tasks_router
from routes.chat import router as chat_router
from routes.documents import router as documents_router
from routes.notifications import router as notifications_router
from routes.workflows import router as workflows_router
from routes.suggestions import router as suggestions_router
from routes.dashboard import router as dashboard_router

app.include_router(auth_router)
app.include_router(tasks_router)
app.include_router(chat_router)
app.include_router(documents_router)
app.include_router(notifications_router)
app.include_router(workflows_router)
app.include_router(suggestions_router)
app.include_router(dashboard_router)


# ── Health ─────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "service": "corely-ai", "version": "1.0.0"}


@app.get("/")
def root():
    return {
        "message": "Corely AI API",
        "docs": "/docs",
        "health": "/health",
        "version": "1.0.0",
    }
