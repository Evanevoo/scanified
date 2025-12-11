"""
Configuration settings for the FastAPI backend
"""
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # Supabase
    SUPABASE_URL: str
    SUPABASE_KEY: str
    SUPABASE_SERVICE_KEY: str
    
    # Storage
    SUPABASE_STORAGE_BUCKET: str = "invoices"
    
    # Email (SMTP)
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_EMAIL: Optional[str] = None
    SMTP_FROM_NAME: Optional[str] = "Gas Cylinder App"
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"]
    
    # PDF Generation
    PDF_TEMPLATE_DIR: str = "backend/templates"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

