"""
FastAPI Backend for Invoice PDF Generation and Email
"""
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
from datetime import datetime
import uuid

from .routers import invoices, email
from .config import settings

app = FastAPI(title="Gas Cylinder Invoice API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(invoices.router, prefix="/api/invoices", tags=["invoices"])
app.include_router(email.router, prefix="/api/email", tags=["email"])

@app.get("/")
async def root():
    return {"message": "Gas Cylinder Invoice API", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

