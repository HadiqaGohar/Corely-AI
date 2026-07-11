import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
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

# ── Password hashing ───────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

# ── JWT ────────────────────────────────────────────────
def create_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(authorization.split(" ")[1])
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == payload.get("sub")).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    finally:
        db.close()

# ── Schemas ────────────────────────────────────────────
class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str

class AuthResponse(BaseModel):
    token: str
    user: UserResponse

# ── App ────────────────────────────────────────────────
app = FastAPI(title="Corely AI Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ── Health ─────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "service": "corely-ai"}

@app.get("/")
def root():
    return {"message": "Corely AI API", "docs": "/docs"}

# ── Auth: Register ─────────────────────────────────────
@app.post("/api/auth/register", response_model=AuthResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        name=req.name,
        email=req.email,
        hashed_password=hash_password(req.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    token = create_token({"sub": user.id, "email": user.email})
    return AuthResponse(
        token=token,
        user=UserResponse(id=user.id, name=user.name, email=user.email),
    )

# ── Auth: Login ────────────────────────────────────────
@app.post("/api/auth/login", response_model=AuthResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_token({"sub": user.id, "email": user.email})
    return AuthResponse(
        token=token,
        user=UserResponse(id=user.id, name=user.name, email=user.email),
    )

# ── Auth: Get Current User ─────────────────────────────
@app.get("/api/auth/me", response_model=UserResponse)
def get_me(user: User = Depends(get_current_user)):
    return UserResponse(id=user.id, name=user.name, email=user.email)

# ── Auth: Forgot Password (send OTP) ───────────────────
@app.post("/api/auth/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    # Always return success to prevent email enumeration
    if not user:
        return {"message": "If the email exists, a code has been sent"}
    
    # Generate 6-digit OTP
    otp = f"{secrets.randbelow(900000) + 100000}"
    expires = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    # Invalidate old OTPs
    db.query(OTPRecord).filter(
        OTPRecord.email == req.email, OTPRecord.used == False
    ).update({"used": True})
    
    record = OTPRecord(email=req.email, otp=otp, expires_at=expires)
    db.add(record)
    db.commit()
    
    # TODO: Send email with OTP here
    print(f"[OTP] {req.email} -> {otp}")  # Development: print OTP
    
    return {"message": "If the email exists, a code has been sent", "otp": otp}

# ── Auth: Verify OTP ───────────────────────────────────
@app.post("/api/auth/verify-otp")
def verify_otp(req: VerifyOTPRequest, db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    record = db.query(OTPRecord).filter(
        OTPRecord.email == req.email,
        OTPRecord.otp == req.otp,
        OTPRecord.used == False,
        OTPRecord.expires_at > now,
    ).first()
    
    if not record:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    
    record.used = True
    db.commit()
    
    return {"message": "OTP verified successfully"}

# ── Auth: Reset Password ───────────────────────────────
@app.post("/api/auth/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    record = db.query(OTPRecord).filter(
        OTPRecord.email == req.email,
        OTPRecord.otp == req.otp,
        OTPRecord.used == True,  # Must be already verified
    ).first()
    
    if not record:
        raise HTTPException(status_code=400, detail="OTP not verified or expired")
    
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.hashed_password = hash_password(req.password)
    db.delete(record)  # Clean up OTP
    db.commit()
    
    return {"message": "Password reset successfully"}
