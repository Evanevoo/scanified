"""
PDF Generation Service using WeasyPrint and Jinja2
"""
from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import HTML, CSS
from typing import Dict, Any, Optional
import os
import tempfile
from datetime import datetime
from ..config import settings

class PDFService:
    def __init__(self):
        template_dir = os.path.join(os.path.dirname(__file__), '..', 'templates')
        self.env = Environment(
            loader=FileSystemLoader(template_dir),
            autoescape=select_autoescape(['html', 'xml'])
        )
    
    async def generate_pdf(
        self,
        invoice_data: Dict[str, Any],
        template: Dict[str, Any],
        organization_id: str
    ) -> str:
        """Generate PDF from invoice data and template"""
        try:
            layout = template.get('layout_json', {})
            
            # Load Jinja template
            jinja_template = self.env.get_template('invoice.html')
            
            # Prepare template context
            context = {
                'invoice': invoice_data,
                'layout': layout,
                'colors': layout.get('colors', {}),
                'fonts': layout.get('fonts', {}),
                'header': layout.get('header', {}),
                'footer': layout.get('footer', {}),
                'fields': layout.get('fields', {}),
                'columns': sorted(layout.get('columns', []), key=lambda x: x.get('order', 0)),
                'logo_url': layout.get('logo_url'),
                'now': datetime.now()
            }
            
            # Render HTML
            html_content = jinja_template.render(**context)
            
            # Generate CSS
            css_content = self._generate_css(layout)
            
            # Create PDF
            html_doc = HTML(string=html_content)
            css_doc = CSS(string=css_content)
            
            # Save to temp file
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
            html_doc.write_pdf(temp_file.name, stylesheets=[css_doc])
            
            return temp_file.name
            
        except Exception as e:
            print(f"Error generating PDF: {e}")
            raise
    
    def _generate_css(self, layout: Dict[str, Any]) -> str:
        """Generate CSS from layout configuration"""
        colors = layout.get('colors', {})
        fonts = layout.get('fonts', {})
        
        primary_color = colors.get('primary', '#1976d2')
        secondary_color = colors.get('secondary', '#424242')
        heading_font = fonts.get('heading', 'Helvetica, Arial, sans-serif')
        body_font = fonts.get('body', 'Helvetica, Arial, sans-serif')
        
        css = f"""
        @page {{
            size: A4;
            margin: 20mm;
        }}
        
        body {{
            font-family: {body_font};
            font-size: 10pt;
            color: #333;
            line-height: 1.4;
        }}
        
        .header {{
            margin-bottom: 20px;
        }}
        
        .company-info {{
            margin-bottom: 20px;
        }}
        
        .company-name {{
            font-family: {heading_font};
            font-size: 24pt;
            font-weight: bold;
            color: {primary_color};
            margin-bottom: 10px;
        }}
        
        .invoice-title {{
            font-family: {heading_font};
            font-size: 32pt;
            font-weight: bold;
            color: {primary_color};
            text-align: right;
            margin-bottom: 20px;
        }}
        
        .invoice-details {{
            text-align: right;
            margin-bottom: 20px;
        }}
        
        .bill-to {{
            margin-bottom: 20px;
        }}
        
        .bill-to-title {{
            font-family: {heading_font};
            font-size: 12pt;
            font-weight: bold;
            color: {primary_color};
            margin-bottom: 5px;
        }}
        
        .customer-name {{
            font-weight: bold;
            margin-bottom: 5px;
        }}
        
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }}
        
        th {{
            background-color: {primary_color};
            color: white;
            padding: 10px;
            text-align: left;
            font-weight: bold;
        }}
        
        td {{
            padding: 8px;
            border-bottom: 1px solid #ddd;
        }}
        
        tr:nth-child(even) {{
            background-color: #f9f9f9;
        }}
        
        .totals {{
            text-align: right;
            margin-top: 20px;
        }}
        
        .total-row {{
            margin: 5px 0;
        }}
        
        .total-label {{
            display: inline-block;
            width: 150px;
        }}
        
        .total-amount {{
            display: inline-block;
            width: 100px;
            text-align: right;
        }}
        
        .grand-total {{
            font-size: 14pt;
            font-weight: bold;
            color: {primary_color};
            border-top: 2px solid {primary_color};
            padding-top: 10px;
            margin-top: 10px;
        }}
        
        .notes {{
            margin-top: 30px;
            padding: 10px;
            background-color: #f5f5f5;
        }}
        
        .footer {{
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 8pt;
            color: #666;
        }}
        
        .logo {{
            max-width: 200px;
            max-height: 80px;
            margin-bottom: 10px;
        }}
        """
        
        return css
    
    def get_sample_invoice_data(self) -> Dict[str, Any]:
        """Get sample invoice data for preview"""
        return {
            'customer_id': 'CUST001',
            'customer_name': 'Sample Customer',
            'customer_address': '123 Main St, City, State 12345',
            'customer_email': 'customer@example.com',
            'invoice_number': 'INV-000001',
            'invoice_date': datetime.now().date().isoformat(),
            'invoice_period_start': datetime.now().date().isoformat(),
            'invoice_period_end': datetime.now().date().isoformat(),
            'line_items': [
                {
                    'description': 'Oxygen Cylinder 40L',
                    'barcode': 'BC001',
                    'serial_number': 'SN001',
                    'rental_start_date': datetime.now().date().isoformat(),
                    'rental_days': 30,
                    'quantity': 1,
                    'unit_price': 5.00,
                    'total_price': 150.00
                },
                {
                    'description': 'Nitrogen Cylinder 20L',
                    'barcode': 'BC002',
                    'serial_number': 'SN002',
                    'rental_start_date': datetime.now().date().isoformat(),
                    'rental_days': 30,
                    'quantity': 1,
                    'unit_price': 4.00,
                    'total_price': 120.00
                }
            ],
            'subtotal': 270.00,
            'tax_amount': 29.70,
            'tax_rate': 0.11,
            'total_amount': 299.70,
            'organization_name': 'Sample Company',
            'organization_address': '456 Business Ave, City, State 67890',
            'organization_phone': '(555) 123-4567',
            'organization_email': 'info@sample.com',
            'organization_logo_url': None,
            'payment_terms': 'Net 30',
            'invoice_notes': 'Thank you for your business!',
            'invoice_footer': 'This is a sample invoice footer.'
        }

