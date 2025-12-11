"""
Email Service for sending invoices
"""
import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from typing import Optional, Dict, Any
from ..config import settings

class EmailService:
    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.from_email = settings.SMTP_FROM_EMAIL or settings.SMTP_USER
        self.from_name = settings.SMTP_FROM_NAME
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        body: str,
        pdf_path: Optional[str] = None,
        invoice_number: Optional[str] = None
    ):
        """Send email with optional PDF attachment"""
        if not self.smtp_host:
            raise Exception("SMTP not configured")
        
        try:
            # Create message
            message = MIMEMultipart()
            message['From'] = f"{self.from_name} <{self.from_email}>"
            message['To'] = to_email
            message['Subject'] = subject
            
            # Add body
            message.attach(MIMEText(body, 'html'))
            
            # Attach PDF if provided
            if pdf_path:
                with open(pdf_path, 'rb') as f:
                    part = MIMEBase('application', 'pdf')
                    part.set_payload(f.read())
                    encoders.encode_base64(part)
                    part.add_header(
                        'Content-Disposition',
                        f'attachment; filename="Invoice_{invoice_number or "invoice"}.pdf"'
                    )
                    message.attach(part)
            
            # Send email
            await aiosmtplib.send(
                message,
                hostname=self.smtp_host,
                port=self.smtp_port,
                username=self.smtp_user,
                password=self.smtp_password,
                use_tls=True
            )
            
        except Exception as e:
            print(f"Error sending email: {e}")
            raise
    
    def get_default_email_body(
        self,
        invoice: Dict[str, Any],
        template: Dict[str, Any]
    ) -> str:
        """Generate default email body from invoice and template"""
        layout = template.get('layout_json', {})
        header_text = layout.get('header', {}).get('text', '')
        footer_text = layout.get('footer', {}).get('text', '')
        
        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            {f'<div style="margin-bottom: 20px;">{header_text}</div>' if header_text else ''}
            
            <h2>Invoice {invoice.get('invoice_number', '')}</h2>
            
            <p>Dear {invoice.get('customer_name', 'Customer')},</p>
            
            <p>Please find attached your invoice for the period:</p>
            <p><strong>{invoice.get('invoice_period_start', '')} to {invoice.get('invoice_period_end', '')}</strong></p>
            
            <p><strong>Total Amount: ${float(invoice.get('total_amount', 0)):.2f}</strong></p>
            
            <p>Payment Terms: {invoice.get('payment_terms', 'Net 30')}</p>
            
            <p>If you have any questions, please don't hesitate to contact us.</p>
            
            <p>Thank you for your business!</p>
            
            {f'<div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">{footer_text}</div>' if footer_text else ''}
        </body>
        </html>
        """
        
        return html_body

