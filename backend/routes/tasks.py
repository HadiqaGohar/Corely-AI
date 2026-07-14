"""Task routes — CRUD, subtasks, analytics."""
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

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
