"""Auth routes — Register, Login, OTP, Password Reset."""
from datetime import datetime, timedelta, timezone
import secrets

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from models import User, OTPRecord
from schemas import (
    RegisterRequest, LoginRequest, ForgotPasswordRequest,
    VerifyOTPRequest, ResetPasswordRequest, AuthResponse, UserResponse
)
from auth import hash_password, verify_password, create_token, get_db, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse)
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

    token = create_token({"sub": str(user.id), "email": user.email})
    return AuthResponse(
        token=token,
        user=UserResponse(id=user.id, name=user.name, email=user.email),
    )


@router.post("/login", response_model=AuthResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_token({"sub": str(user.id), "email": user.email})
    return AuthResponse(
        token=token,
        user=UserResponse(id=user.id, name=user.name, email=user.email),
    )


@router.get("/me", response_model=UserResponse)
def get_me(user: User = Depends(get_current_user)):
    return UserResponse(id=user.id, name=user.name, email=user.email)


@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        # Always return success to prevent email enumeration
        return {"message": "If the email exists, a code has been sent"}

    otp = f"{secrets.randbelow(900000) + 100000}"
    expires = datetime.now(timezone.utc) + timedelta(minutes=10)

    # Invalidate old OTPs
    db.query(OTPRecord).filter(
        OTPRecord.email == req.email, OTPRecord.used == False
    ).update({"used": True})

    record = OTPRecord(email=req.email, otp=otp, expires_at=expires)
    db.add(record)
    db.commit()

    # TODO: Send email with OTP — for now return it in response
    return {"message": "OTP sent", "otp": otp}


@router.post("/verify-otp")
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
    return {"message": "OTP verified"}


@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    record = db.query(OTPRecord).filter(
        OTPRecord.email == req.email,
        OTPRecord.otp == req.otp,
        OTPRecord.used == True,
    ).first()

    if not record:
        raise HTTPException(status_code=400, detail="OTP not verified or expired")

    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = hash_password(req.password)
    db.delete(record)
    db.commit()
    return {"message": "Password reset successfully"}
