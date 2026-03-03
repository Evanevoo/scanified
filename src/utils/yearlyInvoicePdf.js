/**
 * Shared logic for building yearly lease invoice data and PDF.
 * Used by SendYearlyLeaseEmails page and aligned with InvoiceGenerator yearly behavior.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logger from './logger';

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
}

function formatAddress(obj) {
  if (!obj) return '';
  const parts = [
    obj.address || obj.contact_details || obj.address2,
    obj.city,
    obj.province || obj.state,
    obj.postal_code,
  ].filter(Boolean);
  return parts.join(', ');
}

/**
 * Build invoice data for a yearly lease (same logic as InvoiceGenerator yearly branch).
 * @param {Object} customer - { name, CustomerListID, email, ... }
 * @param {Array} rentals - Active rentals for this customer (with rental_amount, etc.)
 * @param {Object} leaseAgreement - { start_date, end_date, annual_amount, billing_frequency, agreement_number }
 * @param {string} invoiceDate - YYYY-MM-DD
 * @param {number} taxRate - e.g. 0.11
 * @returns {Object} { subtotal, taxAmount, taxRate, total, rentalMonths, numBottles, billingPeriodStart, billingPeriodEnd, rentals (with lineTotal, monthlyRate, daysHeld), isYearlyRental: true }
 */
export function buildYearlyInvoiceData(customer, rentals, leaseAgreement, invoiceDate, taxRate = 0.11) {
  if (!rentals || rentals.length === 0) {
    return null;
  }
  const numBottles = rentals.length;
  const defaultRate = 10;
  const monthlyRate =
    numBottles > 0 && rentals.some((r) => parseFloat(r.rental_amount) > 0)
      ? rentals.reduce((sum, r) => sum + (parseFloat(r.rental_amount) || 0), 0) / numBottles
      : defaultRate;

  const leaseStartDate = leaseAgreement?.start_date ? new Date(leaseAgreement.start_date) : null;
  const leaseEndDate = leaseAgreement?.end_date ? new Date(leaseAgreement.end_date) : null;
  const invDate = new Date(invoiceDate);

  let monthsToCharge = 12;
  if (leaseEndDate && invDate) {
    if (invDate > leaseEndDate) {
      monthsToCharge = 12;
    } else if (leaseStartDate && leaseEndDate) {
      const invoiceYear = invDate.getFullYear();
      const invoiceMonth = invDate.getMonth();
      const leaseEndYear = leaseEndDate.getFullYear();
      const leaseEndMonth = leaseEndDate.getMonth();
      let startYear = invoiceYear;
      let startMonth = invoiceMonth + 1;
      if (startMonth > 11) {
        startMonth = 0;
        startYear += 1;
      }
      monthsToCharge = (leaseEndYear - startYear) * 12 + (leaseEndMonth - startMonth) + 1;
      if (monthsToCharge > 12) monthsToCharge = 12;
      if (monthsToCharge < 1) monthsToCharge = 1;
    }
  }

  const subtotal = rentals.reduce((sum, r) => {
    const rate = parseFloat(r.rental_amount) > 0 ? parseFloat(r.rental_amount) : monthlyRate;
    return sum + rate * monthsToCharge;
  }, 0);

  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;

  let displayBillingPeriodStart;
  let displayBillingPeriodEnd;
  if (leaseEndDate && invDate) {
    if (invDate > leaseEndDate) {
      const nextYear = invDate.getFullYear();
      displayBillingPeriodStart = new Date(nextYear, 0, 1);
      displayBillingPeriodEnd = new Date(nextYear, 11, 31);
    } else {
      let billingStartYear = invDate.getFullYear();
      let billingStartMonth = invDate.getMonth() + 1;
      if (billingStartMonth > 11) {
        billingStartMonth = 0;
        billingStartYear += 1;
      }
      displayBillingPeriodStart = new Date(billingStartYear, billingStartMonth, 1);
      let billingEndYear = billingStartYear;
      let billingEndMonth = billingStartMonth + (monthsToCharge - 1);
      while (billingEndMonth > 11) {
        billingEndMonth -= 12;
        billingEndYear += 1;
      }
      displayBillingPeriodEnd = new Date(billingEndYear, billingEndMonth + 1, 0);
    }
  } else {
    displayBillingPeriodStart = new Date(invDate.getFullYear(), invDate.getMonth(), 1);
    displayBillingPeriodEnd = new Date(invDate.getFullYear(), invDate.getMonth() + 12, 0);
  }

  const startDate = displayBillingPeriodStart;
  const endDate = displayBillingPeriodEnd;
  const rentalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

  const rentalsWithTotals = rentals.map((rental) => {
    const rentalStartDate = rental.rental_start_date
      ? new Date(rental.rental_start_date)
      : startDate;
    const actualStartDate = rentalStartDate < startDate ? rentalStartDate : startDate;
    const daysHeld = Math.ceil((endDate - actualStartDate) / (1000 * 60 * 60 * 24)) + 1;
    const rateForLine = parseFloat(rental.rental_amount) > 0 ? parseFloat(rental.rental_amount) : monthlyRate;
    const lineTotal = rateForLine * monthsToCharge;
    return {
      ...rental,
      monthlyRate: rateForLine,
      lineTotal,
      daysHeld,
      product_code: rental.product_code || rental.product_type || 'Cylinder',
    };
  });

  return {
    subtotal,
    taxAmount,
    taxRate,
    total,
    rentalMonths: monthsToCharge,
    rentalDays,
    numBottles,
    monthlyRate,
    isYearlyRental: true,
    billingPeriodStart: displayBillingPeriodStart,
    billingPeriodEnd: displayBillingPeriodEnd,
    rentals: rentalsWithTotals,
  };
}

/**
 * Build yearly invoice PDF (minimal layout: header, bill to, period, LEASE SUMMARY, amount due).
 * @returns {Object} jsPDF document (call doc.output('base64') for email).
 */
export function buildYearlyInvoicePdf(customer, rentals, leaseAgreement, organization, invoiceTemplate, invoiceData, invoiceNumber, invoiceDateStr) {
  const doc = new jsPDF();
  const primaryColor = invoiceTemplate?.primary_color || '#000000';
  const colorRgb = primaryColor.startsWith('#')
    ? [
        parseInt(primaryColor.slice(1, 3), 16),
        parseInt(primaryColor.slice(3, 5), 16),
        parseInt(primaryColor.slice(5, 7), 16),
      ]
    : [0, 0, 0];

  doc.setFillColor(colorRgb[0], colorRgb[1], colorRgb[2]);
  doc.rect(0, 0, 210, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text('INVOICE DATE', 15, 10);
  doc.setFontSize(12);
  doc.text(formatDate(invoiceDateStr), 15, 18);
  doc.setFontSize(10);
  doc.text('INVOICE NUMBER', 85, 10);
  doc.setFontSize(12);
  doc.text(invoiceNumber, 85, 18);
  doc.setFontSize(10);
  doc.text('AMOUNT DUE', 155, 10);
  doc.setFontSize(12);
  doc.text(`$${invoiceData.total.toFixed(2)}`, 155, 18);
  doc.setTextColor(0, 0, 0);

  let y = 35;
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text(organization.name, 15, y);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  y += 7;
  const companyAddress = formatAddress(organization);
  if (companyAddress) {
    doc.text(companyAddress, 15, y);
    y += 5;
  }
  if (organization.phone) {
    doc.text(`Phone: ${organization.phone}`, 15, y);
    y += 5;
  }
  if (organization.email) {
    doc.text(`Email: ${organization.email}`, 15, y);
    y += 5;
  }
  y += 10;

  doc.setFont(undefined, 'bold');
  doc.text('BILL TO:', 15, y);
  doc.setFont(undefined, 'normal');
  doc.text(customer.name, 15, y + 7);
  const customerAddress = formatAddress(customer);
  if (customerAddress) {
    doc.text(customerAddress, 15, y + 14);
  }
  y += 30;

  const periodStart = invoiceData.billingPeriodStart instanceof Date
    ? invoiceData.billingPeriodStart.toISOString().split('T')[0]
    : invoiceData.billingPeriodStart;
  const periodEnd = invoiceData.billingPeriodEnd instanceof Date
    ? invoiceData.billingPeriodEnd.toISOString().split('T')[0]
    : invoiceData.billingPeriodEnd;

  autoTable(doc, {
    startY: y,
    head: [['RENTAL PERIOD', 'BILL TO ACCT #', 'TERMS', 'DUE DATE']],
    body: [[
      `${formatDate(periodStart)} - ${formatDate(periodEnd)} (Yearly lease)`,
      customer.CustomerListID || '',
      invoiceTemplate?.payment_terms || 'Net 30',
      formatDate(new Date(new Date(invoiceDateStr).getTime() + 30 * 24 * 60 * 60 * 1000)),
    ]],
    theme: 'plain',
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
  });
  y = doc.lastAutoTable.finalY + 10;

  const leaseNumber = leaseAgreement?.agreement_number || `L${(invoiceNumber || '').replace(/[^0-9]/g, '').slice(-6).padStart(6, '0')}`;
  const monthsCharged = invoiceData.rentalMonths || 12;
  const ratePerCylinderPerMonth = invoiceData.numBottles > 0
    ? invoiceData.subtotal / invoiceData.numBottles / monthsCharged
    : 0;

  autoTable(doc, {
    startY: y,
    head: [['LEASE SUMMARY']],
    body: [],
    theme: 'plain',
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
  });
  y = doc.lastAutoTable.finalY + 5;
  autoTable(doc, {
    startY: y,
    head: [['TYPE', 'NUMBER', 'DATE', 'DURATION', 'ASSETS', 'RATE (per cyl/mo)', 'TOTAL']],
    body: [[
      'Lease',
      leaseNumber,
      formatDate(invoiceDateStr),
      `${monthsCharged} Months`,
      `${invoiceData.numBottles} Industrial Cylinder${invoiceData.numBottles !== 1 ? 's' : ''}`,
      `$${ratePerCylinderPerMonth.toFixed(2)}`,
      `$${invoiceData.subtotal.toFixed(2)}`,
    ]],
    theme: 'plain',
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
    styles: { fontSize: 10 },
  });
  y = doc.lastAutoTable.finalY + 10;

  const summaryX = 140;
  doc.setFontSize(10);
  doc.text('Subtotal:', summaryX, y);
  doc.text(`$${invoiceData.subtotal.toFixed(2)}`, 180, y, { align: 'right' });
  y += 7;
  doc.text('Tax:', summaryX, y);
  doc.text(`$${invoiceData.taxAmount.toFixed(2)}`, 180, y, { align: 'right' });
  y += 7;
  doc.setFillColor(colorRgb[0], colorRgb[1], colorRgb[2]);
  doc.rect(summaryX - 5, y - 5, 55, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, 'bold');
  doc.text('AMOUNT DUE', summaryX, y);
  doc.text(`$${invoiceData.total.toFixed(2)}`, 180, y, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, 'normal');

  return doc;
}
