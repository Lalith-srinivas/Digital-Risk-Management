import json
import base64
import time
import uuid
from typing import Optional, Dict, Any
from fastapi import Header, HTTPException, status
import httpx
from app.config import settings


def decode_jwt_unverified_payload(token: str) -> Optional[Dict[str, Any]]:
    """
    Safely decode JWT payload from standard base64url encoding.
    """
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        payload_b64 = parts[1]
        # Fix padding
        padding = 4 - (len(payload_b64) % 4)
        if padding != 4:
            payload_b64 += "=" * padding
        payload_bytes = base64.urlsafe_b64decode(payload_b64)
        return json.loads(payload_bytes.decode("utf-8"))
    except Exception:
        return None


def get_user_from_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Extract verified or validated user identity from a Supabase JWT token.
    Checks expiration and extracts the user id (sub) and email.
    """
    if not token:
        return None

    clean_token = token.strip()
    if clean_token.lower().startswith("bearer "):
        clean_token = clean_token[7:].strip()

    payload = decode_jwt_unverified_payload(clean_token)
    if not payload:
        return None

    # Check expiration
    exp = payload.get("exp")
    if exp and time.time() > exp:
        return None

    user_sub = payload.get("sub")
    if not user_sub:
        return None

    try:
        user_uuid = uuid.UUID(str(user_sub))
    except (ValueError, TypeError):
        return None

    email = payload.get("email") or payload.get("user_metadata", {}).get("email") or ""
    user_metadata = payload.get("user_metadata") or {}

    return {
        "id": user_uuid,
        "email": email,
        "metadata": user_metadata,
        "token": clean_token,
    }


def get_optional_user(
    authorization: Optional[str] = Header(None, description="Supabase Bearer Token"),
) -> Optional[Dict[str, Any]]:
    """
    Dependency that returns the authenticated user if a valid Bearer token is provided,
    otherwise returns None (for guest operations).
    """
    if not authorization:
        return None
    return get_user_from_token(authorization)


def get_current_user(
    authorization: Optional[str] = Header(None, description="Supabase Bearer Token"),
) -> Dict[str, Any]:
    """
    Dependency requiring a valid authenticated user token.
    Raises 401 Unauthorized if missing or invalid.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required. Please sign in.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = get_user_from_token(authorization)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user
