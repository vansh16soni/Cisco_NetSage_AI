# auth.py
# NetSage AI Authentication & Role-Based Authorization
# Uses PBKDF2-HMAC-SHA256 (standard library) and HMAC-SHA256 tokens.

import os
import time
import json
import base64
import hmac
import hashlib
import secrets
from datetime import datetime
from typing import Optional
from fastapi import Request, HTTPException, Depends
from bson import ObjectId

SECRET_KEY = os.getenv("JWT_SECRET", "netsage_ai_secure_token_secret_salt_2026_key")

def hash_password(password: str) -> str:
    """Hash a password using salted PBKDF2-HMAC-SHA256."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), bytes.fromhex(salt), 100000)
    return f"{salt}${key.hex()}"

def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against a stored salt$hash string."""
    try:
        if not hashed or '$' not in hashed:
            return False
        salt, key_hex = hashed.split('$')
        computed = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), bytes.fromhex(salt), 100000)
        return hmac.compare_digest(computed.hex(), key_hex)
    except Exception:
        return False

def create_access_token(user_id: str, email: str, role: str, name: str) -> str:
    """Generate a signed URL-safe token valid for 7 days."""
    payload = {
        "sub": str(user_id),
        "email": email.strip().lower(),
        "role": role,
        "name": name,
        "exp": int(time.time()) + 7 * 24 * 3600
    }
    header_b64 = base64.urlsafe_b64encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode()).decode().rstrip("=")
    payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    signing_input = f"{header_b64}.{payload_b64}"
    sig = hmac.new(SECRET_KEY.encode(), signing_input.encode(), hashlib.sha256).digest()
    sig_b64 = base64.urlsafe_b64encode(sig).decode().rstrip("=")
    return f"{signing_input}.{sig_b64}"

def decode_access_token(token: str) -> Optional[dict]:
    """Verify signature and expiration of an access token."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header_b64, payload_b64, sig_b64 = parts
        signing_input = f"{header_b64}.{payload_b64}"
        expected_sig = base64.urlsafe_b64encode(hmac.new(SECRET_KEY.encode(), signing_input.encode(), hashlib.sha256).digest()).decode().rstrip("=")
        if not hmac.compare_digest(expected_sig, sig_b64):
            return None
            
        rem = len(payload_b64) % 4
        padded = payload_b64 + ("=" * (4 - rem) if rem > 0 else "")
        data = json.loads(base64.urlsafe_b64decode(padded.encode()).decode())
        
        if "exp" in data and time.time() > data["exp"]:
            return None
        return data
    except Exception:
        return None

def extract_token_from_request(request: Request) -> Optional[str]:
    """Extract Bearer token from Authorization header."""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:].strip()
    return None

def get_optional_user(request: Request, db) -> Optional[dict]:
    """Retrieve user if token is valid, else None."""
    token = extract_token_from_request(request)
    if not token:
        return None
    data = decode_access_token(token)
    if not data or "sub" not in data:
        return None
    try:
        user = db["users"].find_one({"_id": ObjectId(data["sub"])})
        if not user or user.get("status") == "suspended":
            return None
        return user
    except Exception:
        return None

def get_current_user_dep(request: Request, db):
    """FastAPI dependency requiring valid authentication and active status."""
    token = extract_token_from_request(request)
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required. Please log in.")
    data = decode_access_token(token)
    if not data or "sub" not in data:
        raise HTTPException(status_code=401, detail="Invalid or expired session. Please log in again.")
    user = db["users"].find_one({"_id": ObjectId(data["sub"])})
    if not user:
        raise HTTPException(status_code=401, detail="User account not found.")
    if user.get("status") == "suspended":
        raise HTTPException(status_code=403, detail="Your account has been suspended by an administrator.")
    return user

def require_admin_dep(request: Request, db):
    """FastAPI dependency requiring admin role."""
    user = get_current_user_dep(request, db)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin permissions required for this action.")
    return user

def log_activity(db, user_or_id, action: str, details: str):
    """Log an action performed by a user to user_activity collection."""
    try:
        user_id = None
        user_email = "Anonymous"
        user_name = "Anonymous"
        if isinstance(user_or_id, dict):
            user_id = user_or_id.get("_id")
            user_email = user_or_id.get("email", "Anonymous")
            user_name = user_or_id.get("name", user_email)
        elif isinstance(user_or_id, (str, ObjectId)):
            user_id = ObjectId(user_or_id) if ObjectId.is_valid(str(user_or_id)) else None
            u = db["users"].find_one({"_id": user_id}) if user_id else None
            if u:
                user_email = u.get("email", "")
                user_name = u.get("name", user_email)

        doc = {
            "userId": user_id,
            "userEmail": user_email,
            "userName": user_name,
            "action": action,
            "details": details,
            "timestamp": datetime.utcnow()
        }
        db["user_activity"].insert_one(doc)
    except Exception as e:
        print(f"[ActivityLog] Error logging activity: {e}")

def seed_default_admin(db):
    """Ensure the default administrator exists in the database."""
    admin_email = "admin@net"
    existing = db["users"].find_one({"email": admin_email})
    if not existing:
        admin_doc = {
            "email": admin_email,
            "passwordHash": hash_password("admin@netsage"),
            "name": "Admin NetSage",
            "role": "admin",
            "status": "active",
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        db["users"].insert_one(admin_doc)
        print(f"[auth] Created default admin account: {admin_email}")
    else:
        # Ensure role is admin, status is active, and password is up-to-date
        db["users"].update_one(
            {"email": admin_email},
            {"$set": {
                "role": "admin",
                "status": "active",
                "passwordHash": hash_password("admin@netsage"),
                "updatedAt": datetime.utcnow()
            }}
        )
