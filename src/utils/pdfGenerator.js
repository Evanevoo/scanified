import { jsPDF } from 'jspdf';

export const generateInvoicePDF = (invoice, customer, rentals) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Header
  doc.setFontSize(20);
  doc.text('INVOICE', pageWidth / 2, 20, { align: 'center' });
  
  // Company Info
  doc.setFontSize(10);
  doc.text('Gas Cylinder Rental Company', 20, 40);
  doc.text('123 Business Street', 20, 45);
  doc.text('City, State 12345', 20, 50);
  doc.text('Phone: (555) 123-4567', 20, 55);
  
  // Invoice Details
  doc.setFontSize(12);
  doc.text(`Invoice Number: ${invoice.id}`, pageWidth - 60, 40);
  doc.text(`Date: ${new Date(invoice.invoice_date).toLocaleDateString()}`, pageWidth - 60, 45);
  
  // Customer Info
  doc.setFontSize(12);
  doc.text('Bill To:', 20, 70);
  doc.setFontSize(10);
  doc.text(customer.name, 20, 75);
  doc.text(`Customer #: ${customer.customer_number}`, 20, 80);
  doc.text(customer.contact_details || '', 20, 85);
  
  // Table Header
  const tableTop = 100;
  doc.setFillColor(240, 240, 240);
  doc.rect(20, tableTop - 5, pageWidth - 40, 10, 'F');
  doc.setFontSize(10);
  doc.text('Cylinder', 25, tableTop);
  doc.text('Gas Type', 65, tableTop);
  doc.text('Rental Type', 105, tableTop);
  doc.text('Period', 145, tableTop);
  doc.text('Amount', pageWidth - 35, tableTop, { align: 'right' });
  
  // Table Content
  let yPos = tableTop + 10;
  let total = 0;
  
  rentals.forEach((rental, index) => {
    if (yPos > 250) {
      // Add new page if content exceeds page height
      doc.addPage();
      yPos = 20;
    }
    
    doc.text(rental.cylinder.serial_number, 25, yPos);
    doc.text(rental.cylinder.gas_type, 65, yPos);
    doc.text(rental.rental_type, 105, yPos);
    doc.text(`${rental.rental_start_date} - ${rental.rental_end_date || 'Current'}`, 145, yPos);
    doc.text(`$${rental.amount.toFixed(2)}`, pageWidth - 35, yPos, { align: 'right' });
    
    total += rental.amount;
    yPos += 10;
  });
  
  // Total
  yPos += 10;
  doc.setFillColor(240, 240, 240);
  doc.rect(pageWidth - 80, yPos - 5, 60, 10, 'F');
  doc.setFontSize(12);
  doc.text(`Total: $${total.toFixed(2)}`, pageWidth - 35, yPos, { align: 'right' });
  
  // Footer
  doc.setFontSize(10);
  const footerText = 'Thank you for your business!';
  doc.text(footerText, pageWidth / 2, doc.internal.pageSize.height - 20, { align: 'center' });
  
  return doc;
};

export const calculateRentalAmount = (rental) => {
  const start = new Date(rental.rental_start_date);
  const end = rental.rental_end_date ? new Date(rental.rental_end_date) : new Date();
  const monthsDiff = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
  
  // Base rates (you can adjust these)
  const monthlyRate = 50;
  const yearlyRate = 500;
  
  if (rental.rental_type === 'monthly') {
    return monthlyRate * (monthsDiff || 1); // Minimum 1 month
  } else {
    return yearlyRate * (Math.ceil(monthsDiff / 12) || 1); // Minimum 1 year
  }
}; 