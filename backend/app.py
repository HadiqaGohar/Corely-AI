import os
import secrets
import gradio as gr
from datetime import datetime, timedelta, timezone
from typing import Optional

from pydantic import BaseModel, EmailStr
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session
from jose import JWTError, jwt
from passlib.context import CryptContext

# ── Config ─────────────────────────────────────────────
SECRET_KEY = os.getenv("JWT_SECRET", secrets.token_hex(32))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
DB_URL = os.getenv("DATABASE_URL", "sqlite:///./corely.db")

# ── Database ───────────────────────────────────────────
engine = create_engine(DB_URL, connect_args={"check_same_thread": False} if "sqlite" in DB_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class OTPRecord(Base):
    __tablename__ = "otp_records"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True, nullable=False)
    otp = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)

Base.metadata.create_all(bind=engine)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(p: str) -> str:
    return pwd_context.hash(p)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# ── API Functions ──────────────────────────────────────
def api_register(name: str, email: str, password: str) -> dict:
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            return {"error": "Email already registered"}
        user = User(name=name, email=email, hashed_password=hash_password(password))
        db.add(user)
        db.commit()
        db.refresh(user)
        token = create_token({"sub": user.id, "email": user.email})
        return {"token": token, "user": {"id": user.id, "name": user.name, "email": user.email}}
    finally:
        db.close()

def api_login(email: str, password: str) -> dict:
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user or not verify_password(password, user.hashed_password):
            return {"error": "Invalid email or password"}
        token = create_token({"sub": user.id, "email": user.email})
        return {"token": token, "user": {"id": user.id, "name": user.name, "email": user.email}}
    finally:
        db.close()

def api_forgot_password(email: str) -> dict:
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            return {"message": "If the email exists, a code has been sent"}
        otp = f"{secrets.randbelow(900000) + 100000}"
        expires = datetime.now(timezone.utc) + timedelta(minutes=10)
        db.query(OTPRecord).filter(OTPRecord.email == email, OTPRecord.used == False).update({"used": True})
        record = OTPRecord(email=email, otp=otp, expires_at=expires)
        db.add(record)
        db.commit()
        return {"message": "OTP sent", "otp": otp}
    finally:
        db.close()

def api_verify_otp(email: str, otp: str) -> dict:
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        record = db.query(OTPRecord).filter(
            OTPRecord.email == email, OTPRecord.otp == otp,
            OTPRecord.used == False, OTPRecord.expires_at > now
        ).first()
        if not record:
            return {"error": "Invalid or expired OTP"}
        record.used = True
        db.commit()
        return {"message": "OTP verified"}
    finally:
        db.close()

def api_reset_password(email: str, otp: str, password: str) -> dict:
    db = SessionLocal()
    try:
        record = db.query(OTPRecord).filter(
            OTPRecord.email == email, OTPRecord.otp == otp, OTPRecord.used == True
        ).first()
        if not record:
            return {"error": "OTP not verified or expired"}
        user = db.query(User).filter(User.email == email).first()
        if not user:
            return {"error": "User not found"}
        user.hashed_password = hash_password(password)
        db.delete(record)
        db.commit()
        return {"message": "Password reset successfully"}
    finally:
        db.close()

# ── Gradio UI ──────────────────────────────────────────
def register_ui(name, email, password):
    if not name or not email or not password:
        return "❌ All fields are required"
    result = api_register(name, email, password)
    if "error" in result:
        return f"❌ {result['error']}"
    return f"✅ Account created! Token: {result['token'][:20]}..."

def login_ui(email, password):
    if not email or not password:
        return "❌ All fields are required"
    result = api_login(email, password)
    if "error" in result:
        return f"❌ {result['error']}"
    return f"✅ Logged in! Token: {result['token'][:20]}..."

def forgot_ui(email):
    if not email:
        return "❌ Email is required"
    result = api_forgot_password(email)
    otp = result.get("otp", "")
    return f"✅ {result['message']}\n\n🔑 Your OTP (dev mode): {otp}"

def verify_otp_ui(email, otp):
    if not email or not otp:
        return "❌ All fields are required"
    result = api_verify_otp(email, otp)
    if "error" in result:
        return f"❌ {result['error']}"
    return f"✅ {result['message']}"

def reset_ui(email, otp, new_password):
    if not email or not otp or not new_password:
        return "❌ All fields are required"
    result = api_reset_password(email, otp, new_password)
    if "error" in result:
        return f"❌ {result['error']}"
    return f"✅ {result['message']}"

with gr.Blocks(title="Corely AI Backend", theme=gr.themes.Soft()) as demo:
    gr.Markdown("# 🧠 Corely AI — Auth API")
    gr.Markdown("Backend API for authentication. Use the tabs below to test.")
    
    with gr.Tab("Register"):
        with gr.Row():
            reg_name = gr.Textbox(label="Name", placeholder="John Doe")
            reg_email = gr.Textbox(label="Email", placeholder="you@example.com")
        reg_pass = gr.Textbox(label="Password", type="password", placeholder="••••••••")
        reg_btn = gr.Button("Register", variant="primary")
        reg_out = gr.Textbox(label="Result")
        reg_btn.click(register_ui, [reg_name, reg_email, reg_pass], reg_out)
    
    with gr.Tab("Login"):
        login_email = gr.Textbox(label="Email", placeholder="you@example.com")
        login_pass = gr.Textbox(label="Password", type="password", placeholder="••••••••")
        login_btn = gr.Button("Login", variant="primary")
        login_out = gr.Textbox(label="Result")
        login_btn.click(login_ui, [login_email, login_pass], login_out)
    
    with gr.Tab("Forgot Password"):
        fp_email = gr.Textbox(label="Email", placeholder="you@example.com")
        fp_btn = gr.Button("Send OTP", variant="primary")
        fp_out = gr.Textbox(label="Result")
        fp_btn.click(forgot_ui, [fp_email], fp_out)
    
    with gr.Tab("Verify OTP"):
        vo_email = gr.Textbox(label="Email")
        vo_otp = gr.Textbox(label="OTP", placeholder="123456")
        vo_btn = gr.Button("Verify", variant="primary")
        vo_out = gr.Textbox(label="Result")
        vo_btn.click(verify_otp_ui, [vo_email, vo_otp], vo_out)
    
    with gr.Tab("Reset Password"):
        rp_email = gr.Textbox(label="Email")
        rp_otp = gr.Textbox(label="Verified OTP")
        rp_new = gr.Textbox(label="New Password", type="password")
        rp_btn = gr.Button("Reset Password", variant="primary")
        rp_out = gr.Textbox(label="Result")
        rp_btn.click(reset_ui, [rp_email, rp_otp, rp_new], rp_out)
    
    gr.Markdown("---")
    gr.Markdown("### API Endpoints (for frontend use)")
    gr.Markdown("""
    | Method | Endpoint | Description |
    |--------|----------|-------------|
    | POST | `/api/auth/register` | Register new user |
    | POST | `/api/auth/login` | Login |
    | GET | `/api/auth/me` | Get current user |
    | POST | `/api/auth/forgot-password` | Send OTP |
    | POST | `/api/auth/verify-otp` | Verify OTP |
    | POST | `/api/auth/reset-password` | Reset password |
    """)

demo.launch()
