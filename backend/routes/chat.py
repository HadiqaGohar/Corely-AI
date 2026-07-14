"""Chat routes — Sessions, messages, streaming SSE."""
import json
import os
import httpx
from datetime import datetime, timezone
from typing import Optional, AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from models import ChatSession, ChatMessage, User
from schemas import (
    ChatSessionCreate, ChatSessionUpdate, ChatSessionResponse,
    ChatMessageCreate, ChatMessageUpdate, ChatMessageResponse
)
from auth import get_current_user, get_db

router = APIRouter(prefix="/api/chat", tags=["chat"])

# ── AI Config ──────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

AI_MODELS = {
    "auto": None,
    "fast": "gemini-2.0-flash",
    "smart": "gemini-2.5-pro",
    "free": "openrouter/free",
    "ollama": "llama3.2",
}


# ── AI Provider Chain ──────────────────────────────────
async def call_ai(messages: list[dict], model: str = "auto", stream: bool = False):
    """Try AI providers in order: Gemini → OpenRouter → Ollama."""
    chosen = AI_MODELS.get(model, model)

    # Gemini
    if GEMINI_API_KEY and (chosen in (None, "gemini-2.0-flash", "gemini-2.5-pro")):
        try:
            return await _call_gemini(messages, chosen or "gemini-2.0-flash", stream)
        except Exception as e:
            if not OPENROUTER_API_KEY and not OLLAMA_BASE_URL:
                raise

    # OpenRouter
    if OPENROUTER_API_KEY and (chosen in (None, "openrouter/free")):
        try:
            return await _call_openrouter(messages, stream)
        except Exception:
            pass

    # Ollama (local)
    try:
        return await _call_ollama(messages, stream)
    except Exception:
        pass

    # Fallback: echo response
    if stream:
        return _echo_stream(messages)
    return {"role": "assistant", "content": "AI services are currently unavailable. Please try again later."}


async def _call_gemini(messages: list[dict], model: str, stream: bool):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}"
    contents = []
    for m in messages:
        role = "user" if m["role"] == "user" else "model"
        contents.append({"role": role, "parts": [{"text": m["content"]}]})

    payload = {"contents": contents, "generationConfig": {"temperature": 0.7, "maxOutputTokens": 2048}}

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(url, json=payload)
        resp.raise_for_status()
        data = resp.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        return {"role": "assistant", "content": text}


async def _call_openrouter(messages: list[dict], stream: bool):
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {"Authorization": f"Bearer {OPENROUTER_API_KEY}"}
    payload = {
        "model": "mistralai/mistral-7b-instruct:free",
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 2048,
    }

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(url, json=payload, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        text = data["choices"][0]["message"]["content"]
        return {"role": "assistant", "content": text}


async def _call_ollama(messages: list[dict], stream: bool):
    url = f"{OLLAMA_BASE_URL}/api/chat"
    payload = {"model": "llama3.2", "messages": messages, "stream": stream}

    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(url, json=payload)
        resp.raise_for_status()
        data = resp.json()
        text = data["message"]["content"]
        return {"role": "assistant", "content": text}


async def _echo_stream(messages: list[dict]) -> AsyncGenerator[str, None]:
    """Fallback echo when no AI provider is available."""
    last_msg = messages[-1]["content"] if messages else "Hello!"
    response = f"I'm currently offline. You said: {last_msg}"
    for word in response.split():
        yield f"data: {json.dumps({'content': word + ' '})}\n\n"
    yield "data: [DONE]\n\n"


# ── Session Routes ─────────────────────────────────────

@router.get("/sessions", response_model=list[ChatSessionResponse])
def list_sessions(
    search: Optional[str] = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(ChatSession).filter(ChatSession.user_id == user.id)
    if search:
        q = q.filter(ChatSession.title.ilike(f"%{search}%"))
    sessions = q.order_by(ChatSession.updated_at.desc()).all()
    # Ensure message_count is computed
    result = []
    for s in sessions:
        count = db.query(ChatMessage).filter(ChatMessage.session_id == s.id).count()
        result.append(ChatSessionResponse(
            id=s.id, title=s.title, pinned=s.pinned,
            created_at=s.created_at, updated_at=s.updated_at,
            message_count=count,
        ))
    return result


@router.post("/sessions", response_model=ChatSessionResponse)
def create_session(
    req: ChatSessionCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = ChatSession(user_id=user.id, title=req.title or "New Chat")
    db.add(session)
    db.commit()
    db.refresh(session)
    return ChatSessionResponse(
        id=session.id, title=session.title, pinned=session.pinned,
        created_at=session.created_at, updated_at=session.updated_at,
        message_count=0,
    )


@router.put("/sessions/{session_id}", response_model=ChatSessionResponse)
def update_session(
    session_id: int,
    req: ChatSessionUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id, ChatSession.user_id == user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if req.title is not None:
        session.title = req.title
    if req.pinned is not None:
        session.pinned = req.pinned
    session.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(session)
    count = db.query(ChatMessage).filter(ChatMessage.session_id == session.id).count()
    return ChatSessionResponse(
        id=session.id, title=session.title, pinned=session.pinned,
        created_at=session.created_at, updated_at=session.updated_at,
        message_count=count,
    )


@router.delete("/sessions/{session_id}")
def delete_session(
    session_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id, ChatSession.user_id == user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(session)
    db.commit()
    return {"message": "Session deleted"}


# ── Message Routes ─────────────────────────────────────

@router.get("/sessions/{session_id}/messages", response_model=list[ChatMessageResponse])
def get_messages(
    session_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id, ChatSession.user_id == user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id
    ).order_by(ChatMessage.created_at.asc()).all()


@router.post("/sessions/{session_id}/messages", response_model=ChatMessageResponse)
def send_message(
    session_id: int,
    req: ChatMessageCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id, ChatSession.user_id == user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Save user message
    user_msg = ChatMessage(
        session_id=session_id, role="user", content=req.content, model=req.model
    )
    db.add(user_msg)
    db.commit()
    db.refresh(user_msg)

    # Get chat history for context
    history = db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id
    ).order_by(ChatMessage.created_at.desc()).limit(20).all()
    history.reverse()

    messages = [{"role": m.role, "content": m.content} for m in history]

    # Call AI (synchronous fallback)
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # We're in an async context, use a thread
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                result = pool.submit(asyncio.run, call_ai(messages, req.model or "auto")).result()
        else:
            result = loop.run_until_complete(call_ai(messages, req.model or "auto"))
    except RuntimeError:
        result = asyncio.run(call_ai(messages, req.model or "auto"))

    # Save assistant message
    assistant_msg = ChatMessage(
        session_id=session_id,
        role="assistant",
        content=result.get("content", "Sorry, I couldn't process that."),
        model=req.model,
    )
    db.add(assistant_msg)

    # Auto-generate title if first message
    if db.query(ChatMessage).filter(ChatMessage.session_id == session_id).count() <= 2:
        session.title = req.content[:50] + ("..." if len(req.content) > 50 else "")

    session.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(assistant_msg)
    return assistant_msg


@router.post("/sessions/{session_id}/messages/stream")
async def send_message_stream(
    session_id: int,
    req: ChatMessageCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id, ChatSession.user_id == user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Save user message
    user_msg = ChatMessage(
        session_id=session_id, role="user", content=req.content, model=req.model
    )
    db.add(user_msg)
    db.commit()

    # Get history
    history = db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id
    ).order_by(ChatMessage.created_at.desc()).limit(20).all()
    history.reverse()
    messages = [{"role": m.role, "content": m.content} for m in history]

    async def generate():
        full_content = []
        try:
            # Try streaming from providers
            async for chunk in _stream_ai(messages, req.model or "auto"):
                full_content.append(chunk)
                yield f"data: {json.dumps({'content': chunk})}\n\n"
        except Exception:
            # Fallback to non-streaming
            result = await call_ai(messages, req.model or "auto")
            text = result.get("content", "Sorry, I couldn't process that.")
            full_content.append(text)
            yield f"data: {json.dumps({'content': text})}\n\n"

        # Save assistant message
        content = "".join(full_content)
        db_local = SessionLocal()
        try:
            assistant_msg = ChatMessage(
                session_id=session_id, role="assistant", content=content, model=req.model
            )
            db_local.add(assistant_msg)
            if db_local.query(ChatMessage).filter(ChatMessage.session_id == session_id).count() <= 2:
                sess = db_local.query(ChatSession).filter(ChatSession.id == session_id).first()
                if sess:
                    sess.title = req.content[:50] + ("..." if len(req.content) > 50 else "")
                    sess.updated_at = datetime.now(timezone.utc)
            db_local.commit()
        finally:
            db_local.close()

        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


async def _stream_ai(messages: list[dict], model: str):
    """Stream AI response token by token."""
    chosen = AI_MODELS.get(model, model)

    if GEMINI_API_KEY and chosen in (None, "gemini-2.0-flash", "gemini-2.5-pro"):
        async for token in _stream_gemini(messages, chosen or "gemini-2.0-flash"):
            yield token
        return

    if OPENROUTER_API_KEY and chosen in (None, "openrouter/free"):
        async for token in _stream_openrouter(messages):
            yield token
        return

    # Ollama streaming
    async for token in _stream_ollama(messages):
        yield token


async def _stream_gemini(messages: list[dict], model: str):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?key={GEMINI_API_KEY}&alt=sse"
    contents = []
    for m in messages:
        role = "user" if m["role"] == "user" else "model"
        contents.append({"role": role, "parts": [{"text": m["content"]}]})

    payload = {"contents": contents, "generationConfig": {"temperature": 0.7, "maxOutputTokens": 2048}}

    async with httpx.AsyncClient(timeout=60) as client:
        async with client.stream("POST", url, json=payload) as resp:
            async for line in resp.aiter_lines():
                if line.startswith("data: "):
                    try:
                        data = json.loads(line[6:])
                        text = data["candidates"][0]["content"]["parts"][0]["text"]
                        yield text
                    except (json.JSONDecodeError, KeyError, IndexError):
                        pass


async def _stream_openrouter(messages: list[dict]):
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {"Authorization": f"Bearer {OPENROUTER_API_KEY}"}
    payload = {
        "model": "mistralai/mistral-7b-instruct:free",
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 2048,
        "stream": True,
    }

    async with httpx.AsyncClient(timeout=60) as client:
        async with client.stream("POST", url, json=payload, headers=headers) as resp:
            async for line in resp.aiter_lines():
                if line.startswith("data: ") and line != "data: [DONE]":
                    try:
                        data = json.loads(line[6:])
                        delta = data["choices"][0].get("delta", {})
                        if "content" in delta:
                            yield delta["content"]
                    except (json.JSONDecodeError, KeyError, IndexError):
                        pass


async def _stream_ollama(messages: list[dict]):
    url = f"{OLLAMA_BASE_URL}/api/chat"
    payload = {"model": "llama3.2", "messages": messages, "stream": True}

    async with httpx.AsyncClient(timeout=120) as client:
        async with client.stream("POST", url, json=payload) as resp:
            async for line in resp.aiter_lines():
                if line:
                    try:
                        data = json.loads(line)
                        if "message" in data:
                            yield data["message"].get("content", "")
                    except json.JSONDecodeError:
                        pass


@router.put("/sessions/{session_id}/messages/{message_id}", response_model=ChatMessageResponse)
def edit_message(
    session_id: int,
    message_id: int,
    req: ChatMessageUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id, ChatSession.user_id == user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    msg = db.query(ChatMessage).filter(
        ChatMessage.id == message_id, ChatMessage.session_id == session_id
    ).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    msg.content = req.content
    db.commit()
    db.refresh(msg)
    return msg


@router.post("/sessions/{session_id}/messages/{message_id}/regenerate", response_model=ChatMessageResponse)
def regenerate_message(
    session_id: int,
    message_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id, ChatSession.user_id == user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Find the message and delete it + all after it
    msg = db.query(ChatMessage).filter(
        ChatMessage.id == message_id, ChatMessage.session_id == session_id
    ).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    # Delete this and all subsequent messages
    db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id,
        ChatMessage.id >= message_id,
    ).delete()
    db.commit()

    # Get remaining history
    history = db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id
    ).order_by(ChatMessage.created_at.desc()).limit(20).all()
    history.reverse()

    if not history:
        raise HTTPException(status_code=400, detail="No messages to regenerate from")

    messages = [{"role": m.role, "content": m.content} for m in history]

    # Call AI
    import asyncio
    try:
        result = asyncio.run(call_ai(messages, "auto"))
    except RuntimeError:
        result = {"role": "assistant", "content": "Could not regenerate response."}

    assistant_msg = ChatMessage(
        session_id=session_id,
        role="assistant",
        content=result.get("content", ""),
    )
    db.add(assistant_msg)
    session.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(assistant_msg)
    return assistant_msg


@router.get("/sessions/{session_id}/export")
def export_chat(
    session_id: int,
    format: str = Query("text"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id, ChatSession.user_id == user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id
    ).order_by(ChatMessage.created_at.asc()).all()

    if format == "json":
        return {
            "session": {"id": session.id, "title": session.title},
            "messages": [
                {"role": m.role, "content": m.content, "created_at": m.created_at.isoformat()}
                for m in messages
            ],
        }

    # Text format
    lines = [f"# {session.title}\n"]
    for m in messages:
        prefix = "You" if m.role == "user" else "AI"
        lines.append(f"\n**{prefix}:** {m.content}")
    return "\n".join(lines)


# Need this for stream endpoint
from models import SessionLocal
