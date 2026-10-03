from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime, timezone

from app.core.security import (
    get_password_hash, verify_password, create_access_token, create_refresh_token,
    decode_token, generate_totp_secret, verify_totp
)
from app.db.models import User, Session
# In a real app we'd import get_db from deps, assuming it's available
# from app.deps import get_db
# For skeleton, we'll mock the dependency injection signature
async def get_db():
    yield None

router = APIRouter(prefix="/auth", tags=["auth"])

class SignupRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str

@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(req: SignupRequest, db: AsyncSession = Depends(get_db)):
    # 1. Validation and existence check (No enumeration: return 201 even if exists, but silently drop/email them)
    # 2. Hash password (Argon2id)
    # 3. Save User
    # 4. Send verification email via EmailService
    return {"message": "If the email is valid, a verification link has been sent."}

@router.post("/login", response_model=TokenResponse)
async def login(response: Response, form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    # 1. Look up user by form_data.username (email)
    # 2. Verify password with constant-time comparison via passlib
    # 3. Check if 2FA is required
    # 4. Create Session record in DB
    
    access_token = create_access_token(data={"sub": form_data.username})
    refresh_token = create_refresh_token(data={"sub": form_data.username})
    
    # Secure HTTPOnly cookie for refresh token
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=7 * 24 * 3600
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/refresh")
async def refresh(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token")
        
    try:
        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401)
        email = payload.get("sub")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
        
    # Rotate refresh token
    new_access_token = create_access_token(data={"sub": email})
    new_refresh_token = create_refresh_token(data={"sub": email})
    
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=7 * 24 * 3600
    )
    
    return {"access_token": new_access_token, "token_type": "bearer"}

@router.post("/logout")
async def logout(response: Response, request: Request, db: AsyncSession = Depends(get_db)):
    refresh_token = request.cookies.get("refresh_token")
    if refresh_token:
        # 1. Decode token to find session ID
        # 2. Mark DB session as revoked
        pass
        
    response.delete_cookie(key="refresh_token")
    return {"message": "Logged out successfully"}

@router.post("/forgot-password")
async def forgot_password(email: EmailStr, db: AsyncSession = Depends(get_db)):
    # 1. Check if user exists (prevent enumeration by always returning 200)
    # 2. Generate short-lived token
    # 3. Call EmailService.send_password_reset
    return {"message": "If that email exists, a reset link was sent."}
