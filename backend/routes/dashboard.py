"""Dashboard routes — Stats, activity, productivity."""
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from models import (
    Task, ChatSession, ChatMessage, Document, Notification,
    Suggestion, Workflow, User
)
from schemas import DashboardStats, ProductivityScore, ActivityItem
from auth import get_current_user, get_db

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
def get_stats(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    uid = user.id
    return DashboardStats(
        tasks_total=db.query(Task).filter(Task.user_id == uid).count(),
        tasks_todo=db.query(Task).filter(Task.user_id == uid, Task.status == "todo").count(),
        tasks_in_progress=db.query(Task).filter(Task.user_id == uid, Task.status == "in_progress").count(),
        tasks_done=db.query(Task).filter(Task.user_id == uid, Task.status == "done").count(),
        documents_total=db.query(Document).filter(Document.user_id == uid).count(),
        chat_sessions=db.query(ChatSession).filter(ChatSession.user_id == uid).count(),
        chat_messages=db.query(ChatMessage).join(ChatSession).filter(ChatSession.user_id == uid).count(),
        notifications_unread=db.query(Notification).filter(
            Notification.user_id == uid, Notification.read == False
        ).count(),
        workflows_total=db.query(Workflow).filter(Workflow.user_id == uid).count(),
        suggestions_active=db.query(Suggestion).filter(
            Suggestion.user_id == uid, Suggestion.dismissed == False
        ).count(),
    )


@router.get("/activity")
def get_activity(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    uid = user.id
    activities = []

    # Recent tasks
    tasks = db.query(Task).filter(Task.user_id == uid).order_by(Task.updated_at.desc()).limit(5).all()
    for t in tasks:
        activities.append({
            "type": "task",
            "title": f"Task: {t.title}",
            "timestamp": t.updated_at.isoformat() if t.updated_at else t.created_at.isoformat(),
            "detail": f"Status: {t.status}",
        })

    # Recent documents
    docs = db.query(Document).filter(Document.user_id == uid).order_by(Document.created_at.desc()).limit(5).all()
    for d in docs:
        activities.append({
            "type": "document",
            "title": f"Document: {d.title}",
            "timestamp": d.created_at.isoformat(),
            "detail": f"Type: {d.file_type}",
        })

    # Recent chat messages
    msgs = db.query(ChatMessage).join(ChatSession).filter(
        ChatSession.user_id == uid
    ).order_by(ChatMessage.created_at.desc()).limit(5).all()
    for m in msgs:
        activities.append({
            "type": "chat",
            "title": f"Chat: {m.content[:50]}...",
            "timestamp": m.created_at.isoformat(),
            "detail": f"Role: {m.role}",
        })

    # Recent notifications
    notifs = db.query(Notification).filter(Notification.user_id == uid).order_by(Notification.created_at.desc()).limit(5).all()
    for n in notifs:
        activities.append({
            "type": "notification",
            "title": n.message[:50],
            "timestamp": n.created_at.isoformat(),
            "detail": f"Type: {n.type}",
        })

    # Sort by timestamp
    activities.sort(key=lambda x: x["timestamp"], reverse=True)
    return activities[:20]


@router.get("/productivity", response_model=ProductivityScore)
def get_productivity(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    uid = user.id
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)

    # Metrics
    total_tasks = db.query(Task).filter(Task.user_id == uid).count()
    done_tasks = db.query(Task).filter(Task.user_id == uid, Task.status == "done").count()
    recent_done = db.query(Task).filter(
        Task.user_id == uid, Task.status == "done", Task.updated_at >= week_ago
    ).count()
    total_docs = db.query(Document).filter(Document.user_id == uid).count()
    total_chats = db.query(ChatSession).filter(ChatSession.user_id == uid).count()

    # Score calculation (0-100)
    task_score = min(40, (done_tasks / max(total_tasks, 1)) * 40)
    activity_score = min(30, recent_done * 6)
    doc_score = min(15, total_docs * 3)
    chat_score = min(15, total_chats * 3)

    score = round(task_score + activity_score + doc_score + chat_score)

    breakdown = {
        "task_completion": round(task_score, 1),
        "weekly_activity": round(activity_score, 1),
        "document_usage": round(doc_score, 1),
        "chat_engagement": round(chat_score, 1),
    }

    return ProductivityScore(score=min(100, score), breakdown=breakdown)
