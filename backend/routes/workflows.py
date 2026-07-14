"""Workflow routes — CRUD, toggle, execute, templates, history."""
import json
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
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
