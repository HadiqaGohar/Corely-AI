"""
Corely AI — Pydantic Schemas
Request/response models for API validation.
"""
from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, EmailStr, Field


# ── Auth ────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6)

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6)
    password: str = Field(..., min_length=6, max_length=128)

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    model_config = {"from_attributes": True}

class AuthResponse(BaseModel):
    token: str
    user: UserResponse


# ── Task ────────────────────────────────────────────────
class SubtaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)

class SubtaskResponse(BaseModel):
    id: int
    task_id: int
    title: str
    completed: bool
    model_config = {"from_attributes": True}

class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str = ""
    status: str = "todo"
    priority: str = "normal"
    due_date: Optional[datetime] = None
    reminder_at: Optional[datetime] = None
    recurrence: Optional[str] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None
    reminder_at: Optional[datetime] = None
    recurrence: Optional[str] = None

class TaskResponse(BaseModel):
    id: int
    user_id: int
    title: str
    description: str
    status: str
    priority: str
    due_date: Optional[datetime] = None
    reminder_at: Optional[datetime] = None
    recurrence: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    subtasks: List[SubtaskResponse] = []
    model_config = {"from_attributes": True}


# ── Chat ────────────────────────────────────────────────
class ChatSessionCreate(BaseModel):
    title: Optional[str] = "New Chat"

class ChatSessionUpdate(BaseModel):
    title: Optional[str] = None
    pinned: Optional[bool] = None

class ChatSessionResponse(BaseModel):
    id: int
    title: str
    pinned: bool
    created_at: datetime
    updated_at: datetime
    message_count: int = 0
    model_config = {"from_attributes": True}

class ChatMessageCreate(BaseModel):
    content: str = Field(..., min_length=1)
    model: Optional[str] = None

class ChatMessageUpdate(BaseModel):
    content: str = Field(..., min_length=1)

class ChatMessageResponse(BaseModel):
    id: int
    session_id: int
    role: str
    content: str
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Document ────────────────────────────────────────────
class DocumentResponse(BaseModel):
    id: int
    user_id: int
    title: str
    filename: str
    file_type: str
    file_size: int
    status: str
    folder_id: Optional[int] = None
    tags: List["TagResponse"] = []
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}

class DocumentMoveRequest(BaseModel):
    folder_id: Optional[int] = None

class DocumentQARequest(BaseModel):
    document_id: Optional[int] = None
    question: str = Field(..., min_length=1)
    cross_document: bool = False

class DocumentQAResponse(BaseModel):
    answer: str
    sources: List[dict] = []

class DocumentSummarizeResponse(BaseModel):
    summary: str
    key_points: List[str] = []


# ── Folder ──────────────────────────────────────────────
class FolderCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    color: str = "#6d5cff"

class FolderResponse(BaseModel):
    id: int
    name: str
    color: str
    document_count: int = 0
    model_config = {"from_attributes": True}


# ── Tag ─────────────────────────────────────────────────
class TagCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    color: str = "#6d5cff"

class TagResponse(BaseModel):
    id: int
    name: str
    color: str
    model_config = {"from_attributes": True}

class TagAssignRequest(BaseModel):
    tag_id: int


# ── Notification ────────────────────────────────────────
class NotificationResponse(BaseModel):
    id: int
    message: str
    type: str
    priority: str
    read: bool
    archived: bool
    snoozed_until: Optional[datetime] = None
    related_type: Optional[str] = None
    related_id: Optional[int] = None
    created_at: datetime
    model_config = {"from_attributes": True}

class NotificationSnoozeRequest(BaseModel):
    hours: int = Field(..., gt=0, le=168)

class NotificationPreferenceResponse(BaseModel):
    notification_type: str
    in_app: bool
    email: bool
    model_config = {"from_attributes": True}

class NotificationPreferenceUpdate(BaseModel):
    in_app: Optional[bool] = None
    email: Optional[bool] = None


# ── Workflow ────────────────────────────────────────────
class WorkflowCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str = ""
    nodes: List[dict] = []
    edges: List[dict] = []

class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    nodes: Optional[List[dict]] = None
    edges: Optional[List[dict]] = None
    active: Optional[bool] = None

class WorkflowResponse(BaseModel):
    id: int
    name: str
    description: str
    active: bool
    nodes: List[dict] = []
    edges: List[dict] = []
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}

class WorkflowExecuteRequest(BaseModel):
    dry_run: bool = False

class WorkflowExecutionResponse(BaseModel):
    id: int
    workflow_id: int
    status: str
    steps: List[dict] = []
    started_at: datetime
    completed_at: Optional[datetime] = None
    model_config = {"from_attributes": True}

class WorkflowToggleRequest(BaseModel):
    active: bool


# ── Suggestion ──────────────────────────────────────────
class SuggestionResponse(BaseModel):
    id: int
    type: str
    title: str
    description: str
    reason: str
    priority: str
    applied: bool
    dismissed: bool
    created_at: datetime
    model_config = {"from_attributes": True}

class SuggestionFeedbackRequest(BaseModel):
    positive: bool


# ── Dashboard ───────────────────────────────────────────
class DashboardStats(BaseModel):
    tasks_total: int = 0
    tasks_todo: int = 0
    tasks_in_progress: int = 0
    tasks_done: int = 0
    documents_total: int = 0
    chat_sessions: int = 0
    chat_messages: int = 0
    notifications_unread: int = 0
    workflows_total: int = 0
    suggestions_active: int = 0

class ProductivityScore(BaseModel):
    score: int = 0
    breakdown: dict = {}

class ActivityItem(BaseModel):
    type: str
    title: str
    timestamp: datetime
    detail: Optional[str] = None


# ── Health ──────────────────────────────────────────────
class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
