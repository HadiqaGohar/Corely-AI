"""Workflow routes — CRUD, toggle, execute, templates, history, webhooks."""
import json
import hashlib
import hmac
from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from models import Workflow, WorkflowExecution, Notification, Task, User
from schemas import (
    WorkflowCreate, WorkflowUpdate, WorkflowResponse,
    WorkflowExecuteRequest, WorkflowExecutionResponse,
    WorkflowToggleRequest
)
from auth import get_current_user, get_db

router = APIRouter(prefix="/api/workflows", tags=["workflows"])


# ── Templates ──────────────────────────────────────────
WORKFLOW_TEMPLATES = [
    {
        "name": "Task Reminder",
        "description": "Send notification when a task is overdue",
        "nodes": [
            {"id": "trigger1", "type": "trigger", "label": "Task Overdue", "subType": "task_overdue", "x": 100, "y": 200, "config": {}},
            {"id": "action1", "type": "action", "label": "Send Notification", "subType": "send_notification", "x": 400, "y": 200, "config": {"message": "Task '{{task_title}}' is overdue!"}},
        ],
        "edges": [{"id": "e1", "from": "trigger1", "to": "action1"}],
    },
    {
        "name": "Document Auto-Notify",
        "description": "Notify when a new document is uploaded",
        "nodes": [
            {"id": "trigger1", "type": "trigger", "label": "Document Uploaded", "subType": "document_uploaded", "x": 100, "y": 200, "config": {}},
            {"id": "action1", "type": "action", "label": "Send Notification", "subType": "send_notification", "x": 400, "y": 200, "config": {"message": "New document uploaded: {{doc_name}}"}},
        ],
        "edges": [{"id": "e1", "from": "trigger1", "to": "action1"}],
    },
    {
        "name": "Chat Summarizer",
        "description": "Create a task from chat messages",
        "nodes": [
            {"id": "trigger1", "type": "trigger", "label": "Chat Message", "subType": "chat_message", "x": 100, "y": 200, "config": {}},
            {"id": "action1", "type": "action", "label": "Create Task", "subType": "create_task", "x": 400, "y": 200, "config": {"title": "Follow up from chat"}},
        ],
        "edges": [{"id": "e1", "from": "trigger1", "to": "action1"}],
    },
    {
        "name": "Weekly Report",
        "description": "Generate a weekly productivity summary",
        "nodes": [
            {"id": "trigger1", "type": "trigger", "label": "Manual Trigger", "subType": "manual", "x": 100, "y": 200, "config": {}},
            {"id": "action1", "type": "action", "label": "Send Notification", "subType": "send_notification", "x": 400, "y": 200, "config": {"message": "Weekly report generated!"}},
        ],
        "edges": [{"id": "e1", "from": "trigger1", "to": "action1"}],
    },
]


@router.get("/templates")
def get_templates():
    return WORKFLOW_TEMPLATES


# ── CRUD ───────────────────────────────────────────────

@router.get("", response_model=list[WorkflowResponse])
def list_workflows(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(Workflow).filter(Workflow.user_id == user.id).order_by(Workflow.updated_at.desc()).all()


@router.post("", response_model=WorkflowResponse)
def create_workflow(
    req: WorkflowCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    wf = Workflow(
        user_id=user.id,
        name=req.name,
        description=req.description,
        nodes=req.nodes,
        edges=req.edges,
    )
    db.add(wf)
    db.commit()
    db.refresh(wf)
    return wf


@router.get("/{wf_id}", response_model=WorkflowResponse)
def get_workflow(
    wf_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    wf = db.query(Workflow).filter(Workflow.id == wf_id, Workflow.user_id == user.id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return wf


@router.put("/{wf_id}", response_model=WorkflowResponse)
def update_workflow(
    wf_id: int,
    req: WorkflowUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    wf = db.query(Workflow).filter(Workflow.id == wf_id, Workflow.user_id == user.id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")

    for key, val in req.model_dump(exclude_unset=True).items():
        setattr(wf, key, val)
    wf.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(wf)
    return wf


@router.delete("/{wf_id}")
def delete_workflow(
    wf_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    wf = db.query(Workflow).filter(Workflow.id == wf_id, Workflow.user_id == user.id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    db.delete(wf)
    db.commit()
    return {"message": "Workflow deleted"}


@router.put("/{wf_id}/toggle", response_model=WorkflowResponse)
def toggle_workflow(
    wf_id: int,
    req: WorkflowToggleRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    wf = db.query(Workflow).filter(Workflow.id == wf_id, Workflow.user_id == user.id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    wf.active = req.active
    wf.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(wf)
    return wf


# ── Execute ────────────────────────────────────────────

@router.post("/{wf_id}/execute", response_model=WorkflowExecutionResponse)
def execute_workflow(
    wf_id: int,
    req: WorkflowExecuteRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    wf = db.query(Workflow).filter(Workflow.id == wf_id, Workflow.user_id == user.id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")

    execution = WorkflowExecution(
        workflow_id=wf_id,
        status="running",
        steps=[],
    )
    db.add(execution)
    db.commit()
    db.refresh(execution)

    steps = []
    nodes = wf.nodes or []

    for node in nodes:
        step = {
            "node_id": node.get("id"),
            "label": node.get("label"),
            "type": node.get("type"),
            "subType": node.get("subType"),
            "status": "success" if not req.dry_run else "dry_run",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        if not req.dry_run:
            # Actually execute the action
            sub_type = node.get("subType", "")
            config = node.get("config", {})

            if sub_type == "send_notification" and node.get("type") == "action":
                notif = Notification(
                    user_id=user.id,
                    message=config.get("message", "Workflow triggered"),
                    type="workflow",
                    priority="normal",
                )
                db.add(notif)
                step["result"] = "Notification created"

            elif sub_type == "create_task" and node.get("type") == "action":
                task = Task(
                    user_id=user.id,
                    title=config.get("title", "Workflow task"),
                    description=config.get("description", ""),
                    status="todo",
                    priority="normal",
                )
                db.add(task)
                step["result"] = "Task created"

            # Outgoing webhook — if node config has webhook_url, POST to it
            webhook_url = config.get("webhook_url")
            if webhook_url:
                webhook_payload = {
                    "event": "workflow.execute",
                    "workflow_id": wf_id,
                    "node_id": node.get("id"),
                    "node_label": node.get("label"),
                    "node_type": node.get("type"),
                    "node_sub_type": sub_type,
                    "result": step.get("result", ""),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
                # Fire-and-forget with httpx (sync)
                try:
                    import httpx as _httpx
                    with _httpx.Client(timeout=5.0) as client:
                        resp = client.post(webhook_url, json=webhook_payload)
                        step["webhook_status"] = resp.status_code
                except Exception as e:
                    step["webhook_error"] = str(e)

        steps.append(step)

    execution.steps = steps
    execution.status = "success"
    execution.completed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(execution)

    return execution


@router.get("/{wf_id}/executions", response_model=list[WorkflowExecutionResponse])
def get_executions(
    wf_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    wf = db.query(Workflow).filter(Workflow.id == wf_id, Workflow.user_id == user.id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")

    return db.query(WorkflowExecution).filter(
        WorkflowExecution.workflow_id == wf_id
    ).order_by(WorkflowExecution.started_at.desc()).limit(50).all()


# ── Incoming Webhook ──────────────────────────────────

class WebhookPayload(BaseModel):
    data: dict = {}
    event: str = "webhook"


@router.post("/{wf_id}/webhook")
def workflow_webhook(
    wf_id: int,
    payload: WebhookPayload,
    request: Request,
):
    """Incoming webhook endpoint — no auth required, uses workflow_id as identifier."""
    # Open a fresh DB session (no auth dependency)
    from models import SessionLocal
    db = SessionLocal()
    try:
        wf = db.query(Workflow).filter(Workflow.id == wf_id).first()
        if not wf:
            raise HTTPException(status_code=404, detail="Workflow not found")

        if not wf.active:
            return {"message": "Workflow is inactive, webhook ignored"}

        # Create an execution record
        execution = WorkflowExecution(
            workflow_id=wf_id,
            status="running",
            steps=[],
        )
        db.add(execution)
        db.commit()
        db.refresh(execution)

        steps = []
        nodes = wf.nodes or []

        for node in nodes:
            step = {
                "node_id": node.get("id"),
                "label": node.get("label"),
                "type": node.get("type"),
                "subType": node.get("subType"),
                "status": "success",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

            sub_type = node.get("subType", "")
            config = node.get("config", {})

            if sub_type == "send_notification" and node.get("type") == "action":
                # Use webhook data in notification message
                msg = config.get("message", "Webhook triggered")
                for key, val in (payload.data or {}).items():
                    msg = msg.replace(f"{{{{{key}}}}}", str(val))
                notif = Notification(
                    user_id=wf.user_id,
                    message=msg,
                    type="workflow",
                    priority="normal",
                )
                db.add(notif)
                step["result"] = "Notification created"

            elif sub_type == "create_task" and node.get("type") == "action":
                title = config.get("title", "Webhook task")
                for key, val in (payload.data or {}).items():
                    title = title.replace(f"{{{{{key}}}}}", str(val))
                task = Task(
                    user_id=wf.user_id,
                    title=title,
                    description=config.get("description", ""),
                    status="todo",
                    priority="normal",
                )
                db.add(task)
                step["result"] = "Task created"

            steps.append(step)

        execution.steps = steps
        execution.status = "success"
        execution.completed_at = datetime.now(timezone.utc)
        db.commit()

        return {
            "message": "Webhook processed",
            "execution_id": execution.id,
            "workflow_id": wf_id,
            "steps_completed": len(steps),
        }
    finally:
        db.close()


# ── Outgoing Webhook Helper ───────────────────────────

async def _send_outgoing_webhook(url: str, payload: dict, secret: str = None):
    """POST JSON to an outgoing webhook URL with optional HMAC signature."""
    headers = {"Content-Type": "application/json"}
    body = json.dumps(payload)
    if secret:
        signature = hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()
        headers["X-Webhook-Signature"] = signature
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, content=body, headers=headers)
            return {"status": resp.status_code, "ok": resp.status_code < 400}
    except Exception as e:
        return {"status": 0, "ok": False, "error": str(e)}
