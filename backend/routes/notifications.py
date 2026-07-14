"""Notification routes — CRUD, read/unread, archive, snooze, preferences."""
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from models import Notification, NotificationPreference, User
from schemas import (
    NotificationResponse, NotificationSnoozeRequest,
    NotificationPreferenceResponse, NotificationPreferenceUpdate
)
from auth import get_current_user, get_db

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

NOTIFICATION_TYPES = ["task", "document", "chat", "workflow", "system"]


@router.get("", response_model=list[NotificationResponse])
def list_notifications(
    unread_only: bool = Query(False),
    priority: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Notification).filter(Notification.user_id == user.id)

    if unread_only:
        q = q.filter(Notification.read == False)
    if priority:
        q = q.filter(Notification.priority == priority)
    if type:
        q = q.filter(Notification.type == type)

    # Filter out snoozed notifications
    now = datetime.now(timezone.utc)
    q = q.filter(
        (Notification.snoozed_until == None) | (Notification.snoozed_until <= now)
    )

    return q.order_by(Notification.created_at.desc()).limit(100).all()


@router.get("/unread-count")
def unread_count(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    count = db.query(Notification).filter(
        Notification.user_id == user.id,
        Notification.read == False,
        Notification.archived == False,
        ((Notification.snoozed_until == None) | (Notification.snoozed_until <= now))
    ).count()
    return {"count": count}


@router.put("/{notif_id}/read")
def mark_read(
    notif_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notif = db.query(Notification).filter(
        Notification.id == notif_id, Notification.user_id == user.id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.read = True
    db.commit()
    return {"message": "Marked as read"}


@router.put("/{notif_id}/unread")
def mark_unread(
    notif_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notif = db.query(Notification).filter(
        Notification.id == notif_id, Notification.user_id == user.id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.read = False
    db.commit()
    return {"message": "Marked as unread"}


@router.put("/read-all")
def mark_all_read(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(Notification).filter(
        Notification.user_id == user.id, Notification.read == False
    ).update({"read": True})
    db.commit()
    return {"message": "All marked as read"}


@router.put("/{notif_id}/archive")
def archive(
    notif_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notif = db.query(Notification).filter(
        Notification.id == notif_id, Notification.user_id == user.id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.archived = True
    db.commit()
    return {"message": "Archived"}


@router.put("/{notif_id}/unarchive")
def unarchive(
    notif_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notif = db.query(Notification).filter(
        Notification.id == notif_id, Notification.user_id == user.id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.archived = False
    db.commit()
    return {"message": "Unarchived"}


@router.put("/{notif_id}/snooze")
def snooze(
    notif_id: int,
    req: NotificationSnoozeRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notif = db.query(Notification).filter(
        Notification.id == notif_id, Notification.user_id == user.id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.snoozed_until = datetime.now(timezone.utc) + timedelta(hours=req.hours)
    db.commit()
    return {"message": f"Snoozed for {req.hours} hours"}


@router.delete("/{notif_id}")
def delete_notification(
    notif_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notif = db.query(Notification).filter(
        Notification.id == notif_id, Notification.user_id == user.id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    db.delete(notif)
    db.commit()
    return {"message": "Deleted"}


# ── Preferences ────────────────────────────────────────

@router.get("/preferences", response_model=list[NotificationPreferenceResponse])
def get_preferences(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    prefs = db.query(NotificationPreference).filter(
        NotificationPreference.user_id == user.id
    ).all()

    # Auto-create defaults if none exist
    if not prefs:
        for ntype in NOTIFICATION_TYPES:
            pref = NotificationPreference(
                user_id=user.id, notification_type=ntype, in_app=True, email=False
            )
            db.add(pref)
        db.commit()
        prefs = db.query(NotificationPreference).filter(
            NotificationPreference.user_id == user.id
        ).all()

    return [
        NotificationPreferenceResponse(
            notification_type=p.notification_type, in_app=p.in_app, email=p.email
        )
        for p in prefs
    ]


@router.put("/preferences", response_model=list[NotificationPreferenceResponse])
def update_preferences(
    updates: list[NotificationPreferenceUpdate],
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # This is a simplified approach — in real app, you'd match by type
    prefs = db.query(NotificationPreference).filter(
        NotificationPreference.user_id == user.id
    ).all()

    for i, pref in enumerate(prefs):
        if i < len(updates):
            u = updates[i]
            if u.in_app is not None:
                pref.in_app = u.in_app
            if u.email is not None:
                pref.email = u.email

    db.commit()
    return [
        NotificationPreferenceResponse(
            notification_type=p.notification_type, in_app=p.in_app, email=p.email
        )
        for p in prefs
    ]
