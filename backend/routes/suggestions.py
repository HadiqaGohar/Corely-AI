"""Suggestion routes — List, apply, dismiss, feedback, stats."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from models import Suggestion, Task, User
from schemas import SuggestionResponse, SuggestionFeedbackRequest
from auth import get_current_user, get_db

router = APIRouter(prefix="/api/suggestions", tags=["suggestions"])


def _generate_suggestions(user_id: int, db: Session) -> list[dict]:
    """Generate smart suggestions based on user data."""
    suggestions = []
    now = datetime.now(timezone.utc)

    # Overdue tasks
    overdue = db.query(Task).filter(
        Task.user_id == user_id,
        Task.status != "done",
        Task.due_date < now,
    ).all()
    for task in overdue[:3]:
        suggestions.append({
            "type": "task_overdue",
            "title": f"Complete '{task.title}'",
            "description": f"This task was due on {task.due_date.strftime('%b %d')}",
            "reason": "Overdue tasks reduce productivity. Consider completing or rescheduling.",
            "priority": "high",
        })

    # Tasks due today
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start.replace(hour=23, minute=59, second=59)
    due_today = db.query(Task).filter(
        Task.user_id == user_id,
        Task.status != "done",
        Task.due_date.between(today_start, today_end),
    ).all()
    for task in due_today[:2]:
        suggestions.append({
            "type": "task_due_today",
            "title": f"Focus on '{task.title}'",
            "description": "This task is due today",
            "reason": "Prioritizing today's tasks helps maintain momentum.",
            "priority": "normal",
        })

    # Tasks with no due date
    no_date = db.query(Task).filter(
        Task.user_id == user_id,
        Task.status == "todo",
        Task.due_date == None,
    ).count()
    if no_date > 3:
        suggestions.append({
            "type": "task_no_date",
            "title": "Set due dates for your tasks",
            "description": f"You have {no_date} tasks without due dates",
            "reason": "Tasks with due dates are more likely to be completed on time.",
            "priority": "low",
        })

    # New user - no tasks
    total_tasks = db.query(Task).filter(Task.user_id == user_id).count()
    if total_tasks == 0:
        suggestions.append({
            "type": "new_user",
            "title": "Create your first task",
            "description": "Start organizing your work with tasks",
            "reason": "Tasks help you track and prioritize your work effectively.",
            "priority": "high",
        })

    # Too many in-progress tasks
    in_progress = db.query(Task).filter(
        Task.user_id == user_id, Task.status == "in_progress"
    ).count()
    if in_progress > 5:
        suggestions.append({
            "type": "task_overload",
            "title": "Focus on finishing tasks",
            "description": f"You have {in_progress} tasks in progress",
            "reason": "Working on too many tasks simultaneously can reduce quality and increase stress.",
            "priority": "normal",
        })

    return suggestions


@router.get("", response_model=list[SuggestionResponse])
def list_suggestions(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Get existing non-dismissed suggestions
    existing = db.query(Suggestion).filter(
        Suggestion.user_id == user.id,
        Suggestion.dismissed == False,
    ).order_by(Suggestion.created_at.desc()).limit(20).all()

    # If no suggestions, generate fresh ones
    if not existing:
        generated = _generate_suggestions(user.id, db)
        for g in generated:
            s = Suggestion(
                user_id=user.id,
                type=g["type"],
                title=g["title"],
                description=g["description"],
                reason=g["reason"],
                priority=g["priority"],
            )
            db.add(s)
        db.commit()
        existing = db.query(Suggestion).filter(
            Suggestion.user_id == user.id,
            Suggestion.dismissed == False,
        ).order_by(Suggestion.created_at.desc()).limit(20).all()

    return existing


@router.post("/{sug_id}/apply", response_model=SuggestionResponse)
def apply_suggestion(
    sug_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sug = db.query(Suggestion).filter(
        Suggestion.id == sug_id, Suggestion.user_id == user.id
    ).first()
    if not sug:
        raise HTTPException(status_code=404, detail="Suggestion not found")

    sug.applied = True
    db.commit()
    db.refresh(sug)
    return sug


@router.post("/{sug_id}/dismiss")
def dismiss_suggestion(
    sug_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sug = db.query(Suggestion).filter(
        Suggestion.id == sug_id, Suggestion.user_id == user.id
    ).first()
    if not sug:
        raise HTTPException(status_code=404, detail="Suggestion not found")

    sug.dismissed = True
    db.commit()
    return {"message": "Suggestion dismissed"}


@router.post("/{sug_id}/feedback")
def feedback_suggestion(
    sug_id: int,
    req: SuggestionFeedbackRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sug = db.query(Suggestion).filter(
        Suggestion.id == sug_id, Suggestion.user_id == user.id
    ).first()
    if not sug:
        raise HTTPException(status_code=404, detail="Suggestion not found")

    sug.feedback_positive = req.positive
    db.commit()
    return {"message": "Feedback recorded"}


@router.get("/stats")
def suggestion_stats(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    total = db.query(Suggestion).filter(Suggestion.user_id == user.id).count()
    applied = db.query(Suggestion).filter(
        Suggestion.user_id == user.id, Suggestion.applied == True
    ).count()
    dismissed = db.query(Suggestion).filter(
        Suggestion.user_id == user.id, Suggestion.dismissed == True
    ).count()
    positive = db.query(Suggestion).filter(
        Suggestion.user_id == user.id, Suggestion.feedback_positive == True
    ).count()

    return {
        "total": total,
        "applied": applied,
        "dismissed": dismissed,
        "acceptance_rate": round((applied / total * 100) if total > 0 else 0, 1),
        "positive_feedback": positive,
    }
