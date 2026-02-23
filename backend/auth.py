"""
Authentication utilities for FastAPI
"""
import os
from typing import Optional
import jwt
from fastapi import HTTPException

SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "")

def verify_token(authorization: Optional[str]) -> Optional[str]:
    """
    Verify JWT token from Supabase.
    Returns user_id if valid, None otherwise.
    """
    if not authorization:
        return None

    try:
        token = authorization.replace("Bearer ", "")

        if not SUPABASE_JWT_SECRET:
            raise HTTPException(
                status_code=500,
                detail="SUPABASE_JWT_SECRET is not configured"
            )

        decoded = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return decoded.get("sub")

    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
    except Exception:
        return None

