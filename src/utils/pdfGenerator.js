import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const generateInvoicePDF = async (invoice, lineItems, settings, organization) => {
  try {
    // Create new PDF document
    const doc = new jsPDF();
    
    // Colors from settings or defaults
    const primaryColor = settings?.primary_color || '#1976d2';
    const secondaryColor = settings?.secondary_color || '#424242';
    
    // Convert hex to RGB
    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 25, g: 118, b: 210 };
    };
    
    const primaryRgb = hexToRgb(primaryColor);
    const secondaryRgb = hexToRgb(secondaryColor);
    
    // Company info
    const companyName = settings?.company_name || organization?.name || 'Your Company';
    const companyAddress = settings?.company_address || '';
    const companyPhone = settings?.company_phone || '';
    const companyEmail = settings?.company_email || '';
    
    // Set font
    doc.setFont('helvetica');
    
    // Header - Company Name
    doc.setFontSize(20);
    doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
    doc.setFont('helvetica', 'bold');
    doc.text(companyName, 20, 20);
    
    // Company details
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    let yPos = 27;
    if (companyAddress) {
      doc.text(companyAddress, 20, yPos);
      yPos += 5;
    }
    if (companyPhone) {
      doc.text(`Phone: ${companyPhone}`, 20, yPos);
      yPos += 5;
    }
    if (companyEmail) {
      doc.text(`Email: ${companyEmail}`, 20, yPos);
      yPos += 5;
    }
    
    // INVOICE title (right side)
    doc.setFontSize(28);
    doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', 140, 20);
    
    // Invoice details (right side)
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.text(`Invoice #: ${invoice.invoice_number}`, 140, 30);
    doc.text(`Date: ${new Date(invoice.invoice_date).toLocaleDateString()}`, 140, 36);
    doc.text(`Period: ${new Date(invoice.invoice_period_start).toLocaleDateString()} - ${new Date(invoice.invoice_period_end).toLocaleDateString()}`, 140, 42);
    
    // Status badge
    const statusY = 48;
    const statusX = 140;
    let statusColor;
    switch (invoice.status) {
      case 'paid':
        statusColor = [76, 175, 80];
        break;
      case 'sent':
        statusColor = [33, 150, 243];
        break;
      case 'draft':
        statusColor = [158, 158, 158];
        break;
      default:
        statusColor = [158, 158, 158];
    }
    doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.roundedRect(statusX, statusY - 4, 30, 6, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(invoice.status.toUpperCase(), statusX + 15, statusY, { align: 'center' });
    
    // Bill To section
    doc.setFontSize(12);
    doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
    doc.setFont('helvetica', 'bold');
    doc.text('BILL TO:', 20, 60);
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(invoice.customer_name, 20, 67);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    yPos = 73;
    if (invoice.customer_address) {
      doc.text(invoice.customer_address, 20, yPos);
      yPos += 5;
    }
    if (invoice.customer_email) {
      doc.text(invoice.customer_email, 20, yPos);
      yPos += 5;
    }
    
    // Line items table
    const tableStartY = Math.max(yPos + 10, 90);
    
    const tableData = lineItems.map(item => {
      let description = item.description;
      if (item.rental_days) {
        description += `\n(${item.rental_days} days)`;
      }
      return [
        description,
        item.quantity.toString(),
        `$${parseFloat(item.unit_price).toFixed(2)}`,
        `$${parseFloat(item.total_price).toFixed(2)}`
      ];
    });
    
    doc.autoTable({
      startY: tableStartY,
      head: [['Description', 'Qty', 'Unit Price', 'Total']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [primaryRgb.r, primaryRgb.g, primaryRgb.b],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 10
      },
      styles: {
        fontSize: 9,
        cellPadding: 5
      },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 35, halign: 'right' }
      },
      margin: { left: 20, right: 20 }
    });
    
    // Totals
    const finalY = doc.lastAutoTable.finalY + 10;
    const totalsX = 140;
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    
    // Subtotal
    doc.text('Subtotal:', totalsX, finalY);
    doc.text(`$${parseFloat(invoice.subtotal).toFixed(2)}`, 190, finalY, { align: 'right' });
    
    // Tax
    const taxRate = ((invoice.tax_amount / invoice.subtotal) * 100).toFixed(1);
    doc.text(`Tax (${taxRate}%):`, totalsX, finalY + 6);
    doc.text(`$${parseFloat(invoice.tax_amount).toFixed(2)}`, 190, finalY + 6, { align: 'right' });
    
    // Line above total
    doc.setDrawColor(200, 200, 200);
    doc.line(totalsX, finalY + 9, 190, finalY + 9);
    
    // Total
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
    doc.text('Total:', totalsX, finalY + 16);
    doc.text(`$${parseFloat(invoice.total_amount).toFixed(2)}`, 190, finalY + 16, { align: 'right' });
    
    // Notes
    if (invoice.notes) {
      const notesY = finalY + 25;
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'bold');
      doc.text('Notes:', 20, notesY);
      doc.setFont('helvetica', 'normal');
      
      const notesLines = doc.splitTextToSize(invoice.notes, 170);
      doc.text(notesLines, 20, notesY + 5);
    }
    
    // Footer
    const pageHeight = doc.internal.pageSize.height;
    const footerY = pageHeight - 30;
    
    // Payment terms
    if (settings?.payment_terms) {
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      const termsText = `Payment Terms: ${settings.payment_terms}`;
      doc.text(termsText, 105, footerY, { align: 'center' });
    }
    
    // Invoice footer
    if (settings?.invoice_footer) {
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.setFont('helvetica', 'italic');
      const footerLines = doc.splitTextToSize(settings.invoice_footer, 170);
      doc.text(footerLines, 105, footerY + 6, { align: 'center' });
    }
    
    // Page number
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'normal');
    doc.text(`Page 1 of 1`, 105, pageHeight - 10, { align: 'center' });
    
    // Save the PDF
    doc.save(`Invoice_${invoice.invoice_number}.pdf`);
    
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};
