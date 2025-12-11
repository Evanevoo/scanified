"""
Email Router for Sending Invoices
"""
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, EmailStr
from typing import Optional

from ..services.email_service import EmailService
from ..services.supabase_service import SupabaseService
from ..services.pdf_service import PDFService
from ..auth import verify_token

router = APIRouter()

class SendEmailRequest(BaseModel):
    invoice_id: str
    customer_id: str
    template_id: Optional[str] = None
    organization_id: str
    to_email: Optional[EmailStr] = None
    subject: Optional[str] = None
    message: Optional[str] = None

@router.post("/send-invoice")
async def send_invoice(
    request: SendEmailRequest,
    authorization: str = Header(None)
):
    """
    Send invoice email with PDF attachment
    """
    try:
        user_id = verify_token(authorization)
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        supabase_service = SupabaseService()
        pdf_service = PDFService()
        email_service = EmailService()
        
        # Get invoice data
        invoice = await supabase_service.get_invoice_by_id(
            invoice_id=request.invoice_id,
            organization_id=request.organization_id
        )
        
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        # Get template
        template_id = request.template_id or invoice.get('template_id')
        template = await supabase_service.get_template(
            organization_id=request.organization_id,
            template_id=template_id
        )
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Generate PDF if not exists
        pdf_path = None
        if invoice.get('pdf_url'):
            # Download existing PDF
            pdf_path = await supabase_service.download_pdf(invoice['pdf_url'])
        else:
            # Generate new PDF
            invoice_data = await supabase_service.get_invoice_data_from_id(
                invoice_id=request.invoice_id,
                organization_id=request.organization_id
            )
            pdf_path = await pdf_service.generate_pdf(
                invoice_data=invoice_data,
                template=template,
                organization_id=request.organization_id
            )
        
        # Get customer email
        customer_email = request.to_email or invoice.get('customer_email')
        if not customer_email:
            raise HTTPException(status_code=400, detail="Customer email not found")
        
        # Prepare email content
        subject = request.subject or f"Invoice {invoice.get('invoice_number', '')}"
        message = request.message or email_service.get_default_email_body(invoice, template)
        
        # Send email
        await email_service.send_email(
            to_email=customer_email,
            subject=subject,
            body=message,
            pdf_path=pdf_path,
            invoice_number=invoice.get('invoice_number', '')
        )
        
        # Update invoice status
        await supabase_service.update_invoice_status(
            invoice_id=request.invoice_id,
            status='sent'
        )
        
        return {"message": "Email sent successfully", "to": customer_email}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error sending email: {str(e)}")

