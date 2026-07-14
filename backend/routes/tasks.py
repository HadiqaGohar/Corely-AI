"""Task routes — CRUD, subtasks, analytics, NL parsing."""
import re
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

from models import Task, Subtask, User
from schemas import (
    TaskCreate, TaskUpdate, TaskResponse, SubtaskCreate, SubtaskResponse
)
from auth import get_current_user, get_db

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("", response_model=list[TaskResponse])
def list_tasks(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort: Optional[str] = Query("created_at"),
    order: Optional[str] = Query("desc"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Task).filter(Task.user_id == user.id)

    if status:
        q = q.filter(Task.status == status)
    if priority:
        q = q.filter(Task.priority == priority)
    if search:
        q = q.filter(Task.title.ilike(f"%{search}%"))

    # Sorting
    sort_col = getattr(Task, sort, Task.created_at)
    if order == "asc":
        q = q.order_by(sort_col.asc())
    else:
        q = q.order_by(sort_col.desc())

    tasks = q.all()
    # Eagerly load subtasks
    for t in tasks:
        _ = t.subtasks
    return tasks


@router.post("", response_model=TaskResponse)
def create_task(
    req: TaskCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = Task(
        user_id=user.id,
        title=req.title,
        description=req.description,
        status=req.status,
        priority=req.priority,
        due_date=req.due_date,
        reminder_at=req.reminder_at,
        recurrence=req.recurrence,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    _ = task.subtasks
    return task


@router.get("/analytics")
def task_analytics(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    base = db.query(Task).filter(Task.user_id == user.id)

    total = base.count()
    todo = base.filter(Task.status == "todo").count()
    in_progress = base.filter(Task.status == "in_progress").count()
    done = base.filter(Task.status == "done").count()
    high = base.filter(Task.priority == "high").count()
    overdue = base.filter(
        Task.due_date < datetime.now(timezone.utc),
        Task.status != "done"
    ).count()

    completion_rate = round((done / total * 100) if total > 0 else 0, 1)

    return {
        "total": total,
        "todo": todo,
        "in_progress": in_progress,
        "done": done,
        "high_priority": high,
        "overdue": overdue,
        "completion_rate": completion_rate,
    }


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    _ = task.subtasks
    return task


@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    req: TaskUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = req.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(task, key, value)
    task.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(task)
    _ = task.subtasks
    return task


@router.delete("/{task_id}")
def delete_task(
    task_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return {"message": "Task deleted"}


# ── Subtasks ───────────────────────────────────────────

@router.get("/{task_id}/subtasks", response_model=list[SubtaskResponse])
def list_subtasks(
    task_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return db.query(Subtask).filter(Subtask.task_id == task_id).all()


@router.post("/{task_id}/subtasks", response_model=SubtaskResponse)
def create_subtask(
    task_id: int,
    req: SubtaskCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    subtask = Subtask(task_id=task_id, title=req.title)
    db.add(subtask)
    db.commit()
    db.refresh(subtask)
    return subtask


@router.put("/{task_id}/subtasks/{subtask_id}", response_model=SubtaskResponse)
def toggle_subtask(
    task_id: int,
    subtask_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    subtask = db.query(Subtask).filter(
        Subtask.id == subtask_id, Subtask.task_id == task_id
    ).first()
    if not subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")

    subtask.completed = not subtask.completed
    db.commit()
    db.refresh(subtask)
    return subtask


@router.delete("/{task_id}/subtasks/{subtask_id}")
def delete_subtask(
    task_id: int,
    subtask_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    subtask = db.query(Subtask).filter(
        Subtask.id == subtask_id, Subtask.task_id == task_id
    ).first()
    if not subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")

    db.delete(subtask)
    db.commit()
    return {"message": "Subtask deleted"}


# ── Natural Language Task Parsing ──────────────────────

class NLParseRequest(BaseModel):
    text: str


class NLTaskResult(BaseModel):
    action: str  # create_task, mark_complete, list_tasks
    title: Optional[str] = None
    due_date: Optional[str] = None
    description: Optional[str] = None
    task_id: Optional[int] = None  # for mark_complete
    tasks: Optional[list] = None  # for list_tasks
    message: str


# Day-of-week mapping for relative dates
WEEKDAYS = {
    "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
    "friday": 4, "saturday": 5, "sunday": 6,
}
WEEKDAY_NAMES = list(WEEKDAYS.keys())


def _parse_relative_date(text: str) -> Optional[datetime]:
    """Parse relative date expressions from text and return a datetime (UTC).
    Handles combined date+time like 'tomorrow at 3pm'."""
    now = datetime.now(timezone.utc)
    lower = text.lower()

    # First, extract time-of-day if present
    time_hour = 9  # default
    time_minute = 0
    m = re.search(r'at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?', lower)
    if m:
        time_hour = int(m.group(1))
        time_minute = int(m.group(2)) if m.group(2) else 0
        period = m.group(3)
        if period == 'pm' and time_hour < 12:
            time_hour += 12
        elif period == 'am' and time_hour == 12:
            time_hour = 0

    # Now extract the date component
    base_date = None

    # "in X minutes/hours/days"
    mm = re.search(r'in\s+(\d+)\s+minutes?', lower)
    if mm:
        return now + timedelta(minutes=int(mm.group(1)))
    mm = re.search(r'in\s+(\d+)\s+hours?', lower)
    if mm:
        return now + timedelta(hours=int(mm.group(1)))
    mm = re.search(r'in\s+(\d+)\s+days?', lower)
    if mm:
        base_date = now + timedelta(days=int(mm.group(1)))
    else:
        mm = re.search(r'in\s+(\d+)\s+weeks?', lower)
        if mm:
            base_date = now + timedelta(weeks=int(mm.group(1)))

    # "tomorrow"
    if base_date is None and 'tomorrow' in lower:
        base_date = now + timedelta(days=1)

    # "today"
    if base_date is None and 'today' in lower:
        base_date = now

    # "next Monday", "next tuesday", etc.
    if base_date is None:
        for day_name, day_num in WEEKDAYS.items():
            mm = re.search(r'next\s+' + day_name, lower)
            if mm:
                days_ahead = (day_num - now.weekday()) % 7
                if days_ahead == 0:
                    days_ahead = 7
                base_date = now + timedelta(days=days_ahead)
                break

    # "this Friday", etc.
    if base_date is None:
        for day_name, day_num in WEEKDAYS.items():
            mm = re.search(r'this\s+' + day_name, lower)
            if mm:
                days_ahead = (day_num - now.weekday()) % 7
                base_date = now + timedelta(days=days_ahead)
                break

    # If we found a time-of-day but no explicit date, assume today
    if base_date is None and m:  # 'm' is the time regex match
        base_date = now

    if base_date is not None:
        return base_date.replace(hour=time_hour, minute=time_minute, second=0, microsecond=0)

    # "at 3pm" standalone (no date context) — assume today
    if m:
        target = now.replace(hour=time_hour, minute=time_minute, second=0, microsecond=0)
        if target <= now:
            target += timedelta(days=1)
        return target

    # "january 15", "mar 3" — assume current or next year
    month_map = {
        'january': 1, 'february': 2, 'march': 3, 'april': 4,
        'may': 5, 'june': 6, 'july': 7, 'august': 8,
        'september': 9, 'october': 10, 'november': 11, 'december': 12,
        'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'jun': 6,
        'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12,
    }
    mm = re.search(r'(' + '|'.join(month_map.keys()) + r')\s+(\d{1,2})', lower)
    if mm:
        month = month_map[mm.group(1)]
        day = int(mm.group(2))
        year = now.year
        try:
            target = datetime(year, month, day, time_hour, time_minute, 0, tzinfo=timezone.utc)
            if target <= now:
                target = target.replace(year=year + 1)
            return target
        except ValueError:
            pass

    # "Xth", "Xst", "Xnd", "Xrd" — day of current month
    mm = re.search(r'(\d{1,2})(?:st|nd|rd|th)(?:\s|$)', lower)
    if mm:
        day = int(mm.group(1))
        try:
            target = datetime(now.year, now.month, day, time_hour, time_minute, 0, tzinfo=timezone.utc)
            if target <= now:
                if now.month == 12:
                    target = target.replace(year=now.year + 1, month=1)
                else:
                    target = target.replace(month=now.month + 1)
            return target
        except ValueError:
            pass

    return None


def _detect_intent(text: str) -> dict:
    """Detect intent from natural language text."""
    lower = text.lower().strip()

    # Pattern: list/show tasks (check before complete to avoid "list completed" matching complete)
    list_patterns = [
        r'(?:show|list|display|get|what(?:\s+are)?|give me)\s+(?:my\s+)?(?:pending|todo|open|remaining|current|active|overdue|high priority|all|completed|done)?\s*tasks?',
        r'(?:what\s+tasks?\s+(?:do\s+)?(?:I\s+)?(?:have|need))',
        r'(?:show\s+me|list)\s+tasks?',
    ]
    for pattern in list_patterns:
        m = re.search(pattern, lower)
        if m:
            status_filter = None
            if 'pending' in lower or 'todo' in lower or 'open' in lower or 'remaining' in lower:
                status_filter = 'todo'
            elif 'overdue' in lower:
                status_filter = 'overdue'
            elif 'done' in lower or 'completed' in lower or 'finished' in lower:
                status_filter = 'done'
            elif 'active' in lower or 'in progress' in lower:
                status_filter = 'in_progress'
            return {"action": "list_tasks", "status_filter": status_filter}

    # Pattern: mark task complete
    complete_patterns = [
        r'(?:mark|set|move)\s+(?:task\s+)?["\']?(.+?)["\']?\s+(?:as\s+)?(?:done|complete|finished|completed)',
        r'["\']?(.+?)["\']?\s+(?:is\s+)?(?:done|complete|finished|completed)',
        r'(?:finish|complete|done with)\s+["\']?(.+?)["\']?$',
    ]
    for pattern in complete_patterns:
        m = re.match(pattern, lower)
        if m:
            title = m.group(1).strip().rstrip(".,!?")
            if title and len(title) > 1:
                return {"action": "mark_complete", "title": title}

    # Pattern: create task with due date
    create_patterns = [
        r'(?:schedule|create|add|set up?|plan|remind me to?)\s+(.+?)(?:\s+(?:at|by|on|before|tomorrow|next|in|this)\b|$)',
        r'(?:i need to|don.t forget to?|remember to?)\s+(.+?)(?:\s+(?:at|by|on|before|tomorrow|next|in|this)\b|$)',
        r'(?:can you|please)\s+(?:schedule|create|add|set up?|plan)\s+(.+?)(?:\s+(?:at|by|on|before|tomorrow|next|in|this)\b|$)',
    ]
    for pattern in create_patterns:
        m = re.match(pattern, lower)
        if m:
            title = m.group(1).strip().rstrip(".,!?")
            if not title or len(title) < 2:
                continue
            due_date = _parse_relative_date(text)
            due_date_str = due_date.isoformat() if due_date else None
            return {
                "action": "create_task",
                "title": title,
                "due_date": due_date_str,
            }

    # Fallback: try to extract a due date and treat as task creation
    due_date = _parse_relative_date(text)
    if due_date:
        # Try to extract a task title from the text
        cleaned = text
        for noise in ['tomorrow', 'today', 'next week', 'next monday', 'next tuesday',
                       'next wednesday', 'next thursday', 'next friday', 'next saturday',
                       'next sunday', 'in \d+ days?', 'in \d+ hours?', 'in \d+ minutes?',
                       'at \d{1,2}:?\d{0,2}\s*(?:am|pm)?']:
            cleaned = re.sub(noise, '', cleaned, flags=re.IGNORECASE)
        cleaned = cleaned.strip().strip(".,!?")
        if cleaned and len(cleaned) > 2:
            return {
                "action": "create_task",
                "title": cleaned,
                "due_date": due_date.isoformat(),
            }

    # No clear intent — return as-is for the caller to decide
    return {"action": "unknown", "title": text, "message": "Could not parse a clear intent from the text."}


@router.post("/nl-parse", response_model=NLTaskResult)
def nl_parse(
    req: NLParseRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Parse natural language text and return detected tasks/intents."""
    intent = _detect_intent(req.text)
    action = intent["action"]

    if action == "mark_complete":
        # Find matching task by title
        tasks = db.query(Task).filter(
            Task.user_id == user.id,
            Task.status != "done",
            Task.title.ilike(f"%{intent['title']}%")
        ).all()
        if not tasks:
            return NLTaskResult(
                action="mark_complete",
                message=f"No pending task matching '{intent['title']}' found.",
            )
        # Mark the first match as done
        task = tasks[0]
        task.status = "done"
        task.updated_at = datetime.now(timezone.utc)
        db.commit()
        return NLTaskResult(
            action="mark_complete",
            task_id=task.id,
            title=task.title,
            message=f"Marked '{task.title}' as done.",
        )

    elif action == "list_tasks":
        status_filter = intent.get("status_filter")
        q = db.query(Task).filter(Task.user_id == user.id)
        if status_filter == "overdue":
            now = datetime.now(timezone.utc)
            q = q.filter(Task.due_date < now, Task.status != "done")
        elif status_filter:
            q = q.filter(Task.status == status_filter)
        else:
            q = q.filter(Task.status != "done")
        tasks = q.order_by(Task.due_date.asc().nullslast(), Task.created_at.desc()).all()
        task_list = [
            {"id": t.id, "title": t.title, "status": t.status, "due_date": t.due_date.isoformat() if t.due_date else None}
            for t in tasks
        ]
        return NLTaskResult(
            action="list_tasks",
            tasks=task_list,
            message=f"Found {len(task_list)} task(s).",
        )

    elif action == "create_task":
        due_dt = None
        if intent.get("due_date"):
            try:
                due_dt = datetime.fromisoformat(intent["due_date"])
            except (ValueError, TypeError):
                pass
        task = Task(
            user_id=user.id,
            title=intent["title"],
            status="todo",
            priority="normal",
            due_date=due_dt,
        )
        db.add(task)
        db.commit()
        db.refresh(task)
        _ = task.subtasks
        return NLTaskResult(
            action="create_task",
            title=task.title,
            due_date=due_dt.isoformat() if due_dt else None,
            message=f"Task '{task.title}' created" + (f" (due {due_dt.strftime('%Y-%m-%d %H:%M')})" if due_dt else "."),
        )

    else:
        return NLTaskResult(
            action="unknown",
            title=intent.get("title"),
            message="Could not parse a clear task intent. Try 'schedule meeting at 3pm tomorrow', 'meeting done', or 'show pending tasks'.",
        )
