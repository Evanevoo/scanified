"""
Invoice PDF Generation Router
"""
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import date
import uuid

from ..services.pdf_service import PDFService
from ..services.supabase_service import SupabaseService
from ..auth import verify_token

router = APIRouter()

class GeneratePDFRequest(BaseModel):
    invoice_id: Optional[str] = None
    customer_id: str
    invoice_period_start: date
    invoice_period_end: date
    template_id: Optional[str] = None
    organization_id: str

class GeneratePDFResponse(BaseModel):
    pdf_url: str
    invoice_id: str
    invoice_number: str
    total_amount: float

@router.post("/generate-pdf")
async def generate_pdf(
    request: GeneratePDFRequest,
    authorization: str = Header(None)
):
    """
    Generate PDF invoice using a template
    """
    try:
        # Verify authentication
        user_id = verify_token(authorization)
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        # Initialize services
        supabase_service = SupabaseService()
        pdf_service = PDFService()
        
        # Fetch invoice data
        invoice_data = await supabase_service.get_invoice_data(
            organization_id=request.organization_id,
            customer_id=request.customer_id,
            period_start=request.invoice_period_start,
            period_end=request.invoice_period_end
        )
        
        if not invoice_data:
            raise HTTPException(status_code=404, detail="No invoice data found")
        
        # Fetch template
        template = await supabase_service.get_template(
            organization_id=request.organization_id,
            template_id=request.template_id
        )
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Generate PDF
        pdf_path = await pdf_service.generate_pdf(
            invoice_data=invoice_data,
            template=template,
            organization_id=request.organization_id
        )
        
        # Upload to Supabase Storage
        pdf_url = await supabase_service.upload_pdf(
            file_path=pdf_path,
            organization_id=request.organization_id,
            invoice_number=invoice_data.get('invoice_number', f"INV-{uuid.uuid4().hex[:8]}")
        )
        
        # Create or update invoice record
        invoice_id = await supabase_service.save_invoice(
            organization_id=request.organization_id,
            invoice_data=invoice_data,
            template_id=request.template_id,
            pdf_url=pdf_url,
            user_id=user_id
        )
        
        return GeneratePDFResponse(
            pdf_url=pdf_url,
            invoice_id=invoice_id,
            invoice_number=invoice_data.get('invoice_number', ''),
            total_amount=invoice_data.get('total_amount', 0)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating PDF: {str(e)}")

@router.get("/preview/{template_id}")
async def preview_template(
    template_id: str,
    organization_id: str,
    authorization: str = Header(None)
):
    """
    Preview a template with sample data
    """
    try:
        user_id = verify_token(authorization)
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        supabase_service = SupabaseService()
        pdf_service = PDFService()
        
        # Get template
        template = await supabase_service.get_template(
            organization_id=organization_id,
            template_id=template_id
        )
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Generate sample invoice data
        sample_data = pdf_service.get_sample_invoice_data()
        
        # Generate preview PDF
        pdf_path = await pdf_service.generate_pdf(
            invoice_data=sample_data,
            template=template,
            organization_id=organization_id
        )
        
        return FileResponse(
            pdf_path,
            media_type="application/pdf",
            filename="template_preview.pdf"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating preview: {str(e)}")

