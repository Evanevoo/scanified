"""
Authentication utilities for FastAPI
"""
from typing import Optional
import jwt
from fastapi import HTTPException

def verify_token(authorization: Optional[str]) -> Optional[str]:
    """
    Verify JWT token from Supabase
    Returns user_id if valid, None otherwise
    """
    if not authorization:
        return None
    
    try:
        # Extract token from "Bearer <token>"
        token = authorization.replace("Bearer ", "")
        
        # For now, we'll decode without verification
        # In production, verify with Supabase JWT secret
        # You should get the JWT secret from Supabase project settings
        decoded = jwt.decode(token, options={"verify_signature": False})
        return decoded.get("sub")  # Supabase uses "sub" for user ID
        
    except Exception as e:
        return None

