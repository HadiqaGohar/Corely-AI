"""Background reminder service — checks for due reminders and overdue tasks."""
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from models import Task, Notification


def check_reminders(db: Session) -> int:
    """Find tasks with reminder_at <= now (and status != done), create notifications.
    Returns the number of notifications created.
    """
    now = datetime.now(timezone.utc)
    tasks = db.query(Task).filter(
        Task.reminder_at != None,
        Task.reminder_at <= now,
        Task.status != "done",
    ).all()

    created = 0
    for task in tasks:
        # Check if a notification already exists for this reminder to avoid duplicates
        existing = db.query(Notification).filter(
            Notification.user_id == task.user_id,
            Notification.related_type == "task",
            Notification.related_id == task.id,
            Notification.type == "task",
            Notification.message.ilike(f"%{task.title}%"),
            Notification.created_at >= task.reminder_at,
        ).first()
        if existing:
            continue

        notif = Notification(
            user_id=task.user_id,
            message=f"Reminder: '{task.title}' is due!",
            type="task",
            priority="normal",
            related_type="task",
            related_id=task.id,
        )
        db.add(notif)
        created += 1

    if created:
        db.commit()
    return created


def check_overdue_tasks(db: Session) -> int:
    """Find tasks past due_date (status != done), create overdue notifications.
    Returns the number of notifications created.
    """
    now = datetime.now(timezone.utc)
    tasks = db.query(Task).filter(
        Task.due_date != None,
        Task.due_date < now,
        Task.status != "done",
    ).all()

    created = 0
    for task in tasks:
        # Avoid duplicate overdue notifications — only create if none exists today
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        existing = db.query(Notification).filter(
            Notification.user_id == task.user_id,
            Notification.related_type == "task",
            Notification.related_id == task.id,
            Notification.message.ilike("%overdue%"),
            Notification.created_at >= today_start,
        ).first()
        if existing:
            continue

        notif = Notification(
            user_id=task.user_id,
            message=f"Overdue: '{task.title}' was due {task.due_date.strftime('%Y-%m-%d %H:%M') if task.due_date else 'unknown'}",
            type="task",
            priority="urgent",
            related_type="task",
            related_id=task.id,
        )
        db.add(notif)
        created += 1

    if created:
        db.commit()
    return created
