import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box,
  Typography, TextField, FormControlLabel, Checkbox, Alert,
  CircularProgress, Grid, IconButton, Chip
} from '@mui/material';
import { 
  Email as EmailIcon, 
  Download as DownloadIcon,
  Settings as SettingsIcon,
  Visibility as PreviewIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/client';
import logger from '../utils/logger';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import InvoiceTemplateManager from './InvoiceTemplateManager';

export default function InvoiceGenerator({ open, onClose, customer, rentals }) {
  const { organization, user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [invoiceTemplate, setInvoiceTemplate] = useState(null);
  const [templateManagerOpen, setTemplateManagerOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState({
    invoice_date: new Date().toISOString().split('T')[0],
    period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    period_end: new Date().toISOString().split('T')[0],
    send_email: true,
    email: customer?.email || '',
    custom_message: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [locationTaxRate, setLocationTaxRate] = useState(null);

  useEffect(() => {
    if (open && organization) {
      // Load invoice template
      try {
        const savedTemplate = localStorage.getItem(`invoiceTemplate_${organization.id}`);
        if (savedTemplate) {
          setInvoiceTemplate(JSON.parse(savedTemplate));
        } else {
          // Default template
          setInvoiceTemplate({
            primary_color: '#000000',
            secondary_color: '#666666',
            show_bill_to: true,
            show_ship_to: true,
            show_rental_period: true,
            show_account_numbers: true,
            show_terms: true,
            show_due_date: true,
            show_rental_summary: true,
            show_serialized_assets: true,
            tax_rate: 0.11,
            payment_terms: 'CREDIT CARD',
            invoice_footer: '',
            email_subject: `Your Invoice from ${organization.name}`,
            email_body: 'Please find your invoice attached.'
          });
        }
      } catch (error) {
        logger.error('Error loading invoice template:', error);
      }

      // Pre-populate customer email and address
      if (customer) {
        setFormData(prev => ({
          ...prev,
          email: customer.email || prev.email
        }));
      }

      // Fetch tax rate from location
      if (rentals && rentals.length > 0) {
        const fetchLocationTaxRate = async () => {
          try {
            // Get location from first rental (assuming all rentals for a customer are from same location)
            const rentalLocation = rentals[0]?.location;
            if (rentalLocation) {
              const { data: locationData, error: locationError } = await supabase
                .from('locations')
                .select('total_tax_rate')
                .eq('name', rentalLocation)
                .eq('organization_id', organization.id)
                .single();

              if (!locationError && locationData) {
                // Convert percentage to decimal (e.g., 11.0% -> 0.11)
                setLocationTaxRate(locationData.total_tax_rate / 100);
              } else {
                logger.warn('Could not fetch tax rate for location:', rentalLocation);
                setLocationTaxRate(null);
              }
            }
          } catch (error) {
            logger.error('Error fetching location tax rate:', error);
            setLocationTaxRate(null);
          }
        };

        fetchLocationTaxRate();
      }
    }
  }, [open, organization, customer, rentals]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  };

  const formatAddress = (obj) => {
    if (!obj) return '';
    const parts = [
      obj.address || obj.contact_details,
      obj.city,
      obj.province || obj.state,
      obj.postal_code
    ].filter(Boolean);
    return parts.join(', ');
  };

  const calculateInvoiceData = () => {
    if (!rentals || rentals.length === 0) return null;

    const startDate = new Date(formData.period_start);
    const endDate = new Date(formData.period_end);
    
    // Calculate number of days in billing period (for display purposes)
    const rentalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    
    // Calculate number of months in billing period (for monthly billing)
    // Monthly billing is flat per month, not based on days
    const startMonth = startDate.getMonth();
    const startYear = startDate.getFullYear();
    const endMonth = endDate.getMonth();
    const endYear = endDate.getFullYear();
    
    // Calculate months difference (e.g., Nov 1 - Nov 30 = 1 month)
    const rentalMonths = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
    
    // Calculate subtotal using MONTHLY rate (matching QuickBooks export logic)
    // Monthly billing is flat - charge monthly rate × number of months in billing period
    const monthlyRate = 10; // Default monthly rate per bottle
    const numBottles = rentals.length;
    
    // Calculate base cost: number of bottles × monthly rate × number of months in billing period
    const subtotal = numBottles * monthlyRate * rentalMonths;
    
    // Use tax rate from location (priority), then rental record, then template, then default to 11%
    const taxRate = locationTaxRate !== null 
      ? locationTaxRate 
      : (rentals[0]?.tax_rate || invoiceTemplate?.tax_rate || 0.11);
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount;

    return {
      subtotal,
      taxAmount,
      taxRate,
      total,
      rentalDays, // Days in billing period
      rentalMonths,
      monthlyRate,
      numBottles,
      rentals: rentals.map(rental => ({
        ...rental,
        monthlyRate: monthlyRate,
        lineTotal: monthlyRate * rentalMonths,
        daysHeld: rental.bottles?.days_at_location || rental.bottle?.days_at_location || rental.days_at_location || 0,
        product_code: rental.product_code || rental.bottles?.product_code || rental.bottle?.product_code || rental.product_type || rental.bottles?.product_type || rental.bottle?.product_type
      }))
    };
  };

  const generatePDF = (invoiceNumberOverride = null) => {
    try {
      if (!customer || !rentals || !invoiceTemplate) {
        logger.error('Cannot generate PDF: missing required data', { customer: !!customer, rentals: !!rentals, invoiceTemplate: !!invoiceTemplate });
        return null;
      }

      const invoiceData = calculateInvoiceData();
      if (!invoiceData) {
        logger.error('Cannot generate PDF: invoiceData is null');
        return null;
      }

      const doc = new jsPDF();
      // Use provided invoice number or generate a preview one
      const invoiceNumber = invoiceNumberOverride || `W${String(Date.now()).slice(-6)}`;

    // Header - Black bar
    doc.setFillColor(invoiceTemplate.primary_color);
    doc.rect(0, 0, 210, 25, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text('INVOICE DATE', 15, 10);
    doc.setFontSize(12);
    doc.text(formatDate(formData.invoice_date), 15, 18);
    
    doc.setFontSize(10);
    doc.text('INVOICE NUMBER', 85, 10);
    doc.setFontSize(12);
    doc.text(invoiceNumber, 85, 18);
    
    doc.setFontSize(10);
    doc.text('AMOUNT DUE', 155, 10);
    doc.setFontSize(12);
    doc.text(`$${invoiceData.total.toFixed(2)}`, 155, 18);

    // Reset text color
    doc.setTextColor(0, 0, 0);
    
    let y = 35;

    // Company info
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(organization.name, 15, y);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
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

    // Bill To / Ship To
    const leftX = 15;
    const rightX = 110;
    
    if (invoiceTemplate.show_bill_to) {
      doc.setFont(undefined, 'bold');
      doc.text('BILL TO:', leftX, y);
      doc.setFont(undefined, 'normal');
      doc.text(customer.name, leftX, y + 7);
      const customerAddress = formatAddress(customer);
      if (customerAddress) {
        doc.text(customerAddress, leftX, y + 14);
      }
    }

    if (invoiceTemplate.show_ship_to) {
      doc.setFont(undefined, 'bold');
      doc.text('SHIP TO:', rightX, y);
      doc.setFont(undefined, 'normal');
      doc.text(customer.name, rightX, y + 7);
      const customerAddress = formatAddress(customer);
      if (customerAddress) {
        doc.text(customerAddress, rightX, y + 14);
      }
    }

    y += 30;

    // Rental Period Table
    if (invoiceTemplate.show_rental_period) {
      autoTable(doc, {
        startY: y,
        head: [['RENTAL PERIOD', 'BILL TO ACCT #', 'SHIP TO ACCT #', 'TERMS', 'DUE DATE']],
        body: [[
          `${formatDate(formData.period_start)} - ${formatDate(formData.period_end)}`,
          customer.CustomerListID,
          customer.CustomerListID,
          invoiceTemplate.payment_terms,
          formatDate(new Date(new Date(formData.invoice_date).getTime() + 30 * 24 * 60 * 60 * 1000))
        ]],
        theme: 'plain',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
      });

      y = doc.lastAutoTable.finalY + 10;
    }

    // Rental Summary Table
    if (invoiceTemplate.show_rental_summary) {
      const rentalsData = invoiceData.rentals.map((rental, index) => [
        rental.product_code || rental.product_type || rental.description || rental.gas_type || rental.size || `Cylinder ${index + 1}`,
        1, // Start count
        0, // Ship
        0, // Return
        1, // End count
        invoiceData.rentalMonths, // Number of months in billing period
        `$${invoiceData.monthlyRate.toFixed(2)}/mo`,
        `$${rental.lineTotal.toFixed(2)}`
      ]);

      autoTable(doc, {
        startY: y,
        head: [['ITEM', 'START COUNT', 'SHIP', 'RTN', 'END COUNT', 'MONTHS', 'RENT RATE', 'TOTAL']],
        body: rentalsData,
        theme: 'plain',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
      });

      y = doc.lastAutoTable.finalY + 10;
    }

    // Financial Summary
    const summaryX = 140;
    doc.setFontSize(10);
    doc.text('Subtotal:', summaryX, y);
    doc.text(`$${invoiceData.subtotal.toFixed(2)}`, 180, y, { align: 'right' });
    y += 7;
    
    doc.text('Tax:', summaryX, y);
    doc.text(`$${invoiceData.taxAmount.toFixed(2)}`, 180, y, { align: 'right' });
    y += 7;

    // Amount Due - Black bar
    doc.setFillColor(invoiceTemplate.primary_color);
    doc.rect(summaryX - 5, y - 5, 55, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.text('AMOUNT DUE', summaryX, y);
    doc.text(`$${invoiceData.total.toFixed(2)}`, 180, y, { align: 'right' });
    
    // Reset
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    y += 15;

    // Serialized Asset Balance Table
    if (invoiceTemplate.show_serialized_assets && rentals.length > 0) {
      const assetsData = invoiceData.rentals.map(rental => [
        'Industrial Cylinders',
        rental.product_code || rental.product_type || rental.size || rental.gas_type || 'Cylinder',
        formatDate(rental.rental_start_date || formData.period_start),
        rental.daysHeld || 0, // Use days_at_location from the rental object
        rental.bottle_barcode || rental.barcode_number || rental.bottles?.barcode_number || 'N/A',
        rental.serial_number || rental.bottles?.serial_number || 'N/A'
      ]);

      autoTable(doc, {
        startY: y,
        head: [['RENTAL CLASS', 'ASSET TYPE', 'DELIVERED', 'DAYS HELD', 'BARCODE', 'SERIAL NUMBER']],
        body: assetsData,
        theme: 'plain',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        styles: { fontSize: 8 }
      });

      y = doc.lastAutoTable.finalY + 10;
    }

      // Footer
      if (invoiceTemplate.invoice_footer) {
        doc.setFontSize(9);
        doc.text(invoiceTemplate.invoice_footer, 105, y, { align: 'center' });
      }

      return doc;
    } catch (error) {
      logger.error('Error in generatePDF:', error);
      return null;
    }
  };

  const handleDownload = () => {
    try {
      const doc = generatePDF();
      if (doc) {
        doc.save(`Invoice_${customer.CustomerListID}_${formData.invoice_date}.pdf`);
        setSuccess('Invoice downloaded successfully!');
      }
    } catch (error) {
      logger.error('Error generating PDF:', error);
      setError('Failed to generate PDF: ' + error.message);
    }
  };

  const handleEmailInvoice = async () => {
    if (!formData.email) {
      setError('Please provide an email address');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const invoiceData = calculateInvoiceData();
      
      // Generate invoice number using invoice_settings (like QuickBooks export)
      let invoiceNumber;
      try {
        // Get invoice settings for this organization
        let { data: invoiceSettings, error: settingsError } = await supabase
          .from('invoice_settings')
          .select('invoice_prefix, next_invoice_number')
          .eq('organization_id', organization.id)
          .single();

        // If no settings exist, create default settings with 'W' prefix
        if (settingsError && settingsError.code === 'PGRST116') {
          const { data: newSettings, error: createError } = await supabase
            .from('invoice_settings')
            .insert({
              organization_id: organization.id,
              invoice_prefix: 'W',
              next_invoice_number: 1
            })
            .select()
            .single();
          
          if (!createError && newSettings) {
            invoiceSettings = newSettings;
            settingsError = null;
          }
        }

        if (!settingsError && invoiceSettings) {
          const prefix = invoiceSettings.invoice_prefix || 'W';
          const nextNumber = invoiceSettings.next_invoice_number || 1;
          invoiceNumber = `${prefix}${String(nextNumber).padStart(5, '0')}`;
          
          // Increment the next invoice number
          await supabase
            .from('invoice_settings')
            .update({ next_invoice_number: nextNumber + 1 })
            .eq('organization_id', organization.id);
        } else {
          // Fallback: use timestamp-based number
          logger.warn('Could not get/create invoice settings, using fallback');
          invoiceNumber = `W${String(Date.now()).slice(-6)}`;
        }
      } catch (error) {
        logger.warn('Error getting invoice settings, using fallback:', error);
        invoiceNumber = `W${String(Date.now()).slice(-6)}`;
      }

      // Generate PDF with the actual invoice number
      const doc = generatePDF(invoiceNumber);
      if (!doc) {
        logger.error('generatePDF returned null', { 
          customer: !!customer, 
          rentals: rentals?.length, 
          invoiceTemplate: !!invoiceTemplate,
          invoiceData: !!calculateInvoiceData()
        });
        throw new Error('Failed to generate PDF. Please ensure all invoice data is available.');
      }
      
      // Validate doc object has output method
      if (typeof doc.output !== 'function') {
        logger.error('PDF doc object is invalid - missing output method');
        throw new Error('PDF generation failed: invalid document object');
      }

      // Save/update customer email if provided
      if (formData.email && formData.email.trim() && formData.email !== customer.email) {
        try {
          const { error: customerUpdateError } = await supabase
            .from('customers')
            .update({ email: formData.email.trim() })
            .eq('CustomerListID', customer.CustomerListID)
            .eq('organization_id', organization.id);

          if (customerUpdateError) {
            logger.warn('Could not update customer email:', customerUpdateError);
            // Non-critical error, continue with invoice generation
          } else {
            logger.log('Customer email updated successfully');
          }
        } catch (error) {
          logger.error('Error updating customer email:', error);
          // Non-critical error, continue
        }
      }

      // Save invoice to database
      const { data: invoiceRecord, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          organization_id: organization.id,
          customer_id: customer.CustomerListID,
          customer_name: customer.name,
          customer_email: formData.email,
          invoice_number: invoiceNumber,
          invoice_date: formData.invoice_date,
          period_start: formData.period_start,
          period_end: formData.period_end,
          subtotal: invoiceData.subtotal,
          tax_amount: invoiceData.taxAmount,
          total_amount: invoiceData.total,
          rental_days: invoiceData.rentalDays,
          cylinders_count: rentals.length,
          email_sent: false // Will be set to true when email is actually sent
        })
        .select()
        .single();

      if (invoiceError) {
        logger.error('Error saving invoice:', invoiceError);
        throw new Error('Failed to save invoice: ' + invoiceError.message);
      }

      // Save line items
      const lineItems = invoiceData.rentals.map((rental, index) => ({
        invoice_id: invoiceRecord.id,
        item_description: rental.product_code || rental.product_type || rental.description || rental.gas_type || `Cylinder ${index + 1}`,
        barcode: rental.bottle_barcode || rental.barcode_number,
        serial_number: rental.serial_number,
        quantity: 1,
        rental_days: invoiceData.rentalDays,
        daily_rate: rental.monthlyRate / 30, // Store monthly rate equivalent for reference
        line_total: rental.lineTotal
      }));

      const { error: lineItemsError } = await supabase
        .from('invoice_line_items')
        .insert(lineItems);

      if (lineItemsError) {
        logger.error('Error saving line items:', lineItemsError);
        // Non-critical, continue
      }

      // Get PDF as base64 for email attachment
      let pdfBase64;
      try {
        // Ensure doc is valid before calling output
        if (!doc) {
          throw new Error('PDF document object is null or undefined');
        }
        
        if (typeof doc.output !== 'function') {
          logger.error('PDF doc missing output method', { docType: typeof doc, docKeys: Object.keys(doc || {}) });
          throw new Error('PDF document object is invalid - missing output method');
        }
        
        logger.log('Attempting to get PDF base64 output...');
        
        // Try to get base64 output directly first
        let base64Result = null;
        try {
          base64Result = doc.output('base64');
          logger.log('Direct base64 output result type:', typeof base64Result, 'length:', base64Result?.length);
        } catch (outputError) {
          logger.warn('Direct base64 output threw error:', outputError);
        }
        
        // If direct base64 failed, try blob conversion
        if (!base64Result || base64Result === null || base64Result === undefined) {
          logger.log('Direct base64 failed, trying blob conversion...');
          try {
            const blob = doc.output('blob');
            logger.log('Blob output result:', { hasBlob: !!blob, blobType: typeof blob, blobSize: blob?.size });
            
            if (!blob || blob.size === 0) {
              throw new Error('PDF blob output is empty or invalid');
            }
            
            // Convert blob to base64
            pdfBase64 = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                try {
                  const result = reader.result;
                  if (!result) {
                    reject(new Error('FileReader result is empty'));
                    return;
                  }
                  // Remove data:application/pdf;base64, prefix if present
                  const base64String = typeof result === 'string' && result.includes(',') 
                    ? result.split(',')[1] 
                    : result;
                  logger.log('Blob converted to base64, length:', base64String?.length);
                  resolve(base64String);
                } catch (err) {
                  reject(err);
                }
              };
              reader.onerror = (error) => {
                logger.error('FileReader error:', error);
                reject(new Error('Failed to read PDF blob: ' + error));
              };
              reader.readAsDataURL(blob);
            });
          } catch (blobError) {
            logger.error('Blob conversion failed:', blobError);
            throw new Error('Both base64 and blob output failed. Blob error: ' + blobError.message);
          }
        } else {
          pdfBase64 = base64Result;
        }
        
        // Final validation
        if (pdfBase64 === null || pdfBase64 === undefined) {
          throw new Error('PDF output returned null or undefined after all attempts');
        }
        
        if (typeof pdfBase64 !== 'string') {
          throw new Error(`PDF output is not a string. Type: ${typeof pdfBase64}`);
        }
        
        if (pdfBase64.length === 0) {
          throw new Error('PDF output is an empty string');
        }
        
        logger.log('PDF base64 generated successfully, length:', pdfBase64.length);
      } catch (pdfError) {
        logger.error('Error generating PDF base64:', pdfError);
        logger.error('PDF doc object details:', { 
          hasDoc: !!doc, 
          hasOutput: typeof doc?.output === 'function',
          docType: typeof doc,
          docConstructor: doc?.constructor?.name,
          docKeys: doc ? Object.keys(doc).slice(0, 20) : []
        });
        throw new Error('Failed to generate PDF content for email attachment: ' + pdfError.message);
      }
      
      const pdfFileName = `Invoice_${invoiceNumber}_${formData.invoice_date}.pdf`;

      // Upload PDF to Supabase Storage
      let pdfUrl = null;
      try {
        const pdfBlob = doc.output('blob');
        if (!pdfBlob) {
          throw new Error('Failed to generate PDF blob');
        }
        
        const storagePath = `${organization.id}/${invoiceNumber}.pdf`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('invoices')
          .upload(storagePath, pdfBlob, {
            contentType: 'application/pdf',
            upsert: true
          });

        if (!uploadError && uploadData) {
          const { data: urlData } = supabase.storage
            .from('invoices')
            .getPublicUrl(storagePath);
          pdfUrl = urlData?.publicUrl;
          
          // Update invoice with PDF URL
          await supabase
            .from('invoices')
            .update({ pdf_url: pdfUrl })
            .eq('id', invoiceRecord.id);
        }
      } catch (uploadErr) {
        logger.warn('Could not upload PDF to storage:', uploadErr);
        // Non-critical, continue with email
      }

      // Send email with PDF attachment
      try {
        const emailSubject = (invoiceTemplate?.email_subject || `Invoice ${invoiceNumber} from ${organization.name}`)
          .replace('{company_name}', organization.name);
        
        const emailBody = (invoiceTemplate?.email_body || 'Please find your invoice attached.')
          .replace('{company_name}', organization.name)
          .replace('{invoice_number}', invoiceNumber)
          .replace('{customer_name}', customer.name)
          .replace('{total_amount}', `$${invoiceData.total.toFixed(2)}`)
          + (formData.custom_message ? `<br/><br/>${formData.custom_message.replace(/\n/g, '<br/>')}` : '');

        logger.log('Sending invoice email to:', formData.email);
        logger.log('Email subject:', emailSubject);
        logger.log('PDF size (base64 length):', pdfBase64?.length || 0);
        
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
        
        const emailResponse = await fetch('/.netlify/functions/send-invoice-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: formData.email,
            from: user?.email || profile?.email || organization?.email, // Use logged-in user's email as sender
            subject: emailSubject,
            body: emailBody,
            pdfBase64: pdfBase64,
            pdfFileName: pdfFileName,
            invoiceNumber: invoiceNumber
          }),
          signal: controller.signal
        }).finally(() => clearTimeout(timeoutId));

        logger.log('Email response status:', emailResponse.status);
        logger.log('Email response headers:', Object.fromEntries(emailResponse.headers.entries()));
        
        // Check if response has content before parsing JSON
        let responseText;
        try {
          responseText = await emailResponse.text();
        } catch (textError) {
          logger.error('Failed to read email response:', textError);
          throw new Error('Email service did not return a valid response. The service may be unavailable or timed out. Please check your email configuration in Netlify environment variables.');
        }
        
        logger.log('Email response text length:', responseText?.length || 0);
        logger.log('Email response text (first 500 chars):', responseText?.substring(0, 500));
        
        let emailResult;
        try {
          if (!responseText || responseText.trim() === '') {
            // Empty response usually means the function crashed or timed out
            logger.error('Empty response from email service. This usually means:');
            logger.error('1. Email service is not configured (missing SMTP2GO_USER, SMTP2GO_PASSWORD, etc.)');
            logger.error('2. Netlify function crashed or timed out');
            logger.error('3. Network error');
            throw new Error('Email service returned empty response. Please check: 1) Email configuration in Netlify (SMTP2GO_USER, SMTP2GO_PASSWORD, SMTP2GO_FROM), 2) Netlify function logs, 3) Network connectivity.');
          }
          emailResult = JSON.parse(responseText);
        } catch (parseError) {
          logger.error('Failed to parse email response JSON:', parseError);
          logger.error('Response text:', responseText);
          throw new Error(`Email service returned invalid response: ${responseText?.substring(0, 200) || 'empty response'}. Please check Netlify function logs.`);
        }
        
        logger.log('Email response parsed:', emailResult);

        if (!emailResponse.ok) {
          const errorMsg = emailResult.error || emailResult.details || `Email service returned status ${emailResponse.status}`;
          logger.error('Email sending failed:', errorMsg, emailResult);
          
          // Provide helpful error message based on status code
          if (emailResponse.status === 500) {
            throw new Error(`Email service error: ${errorMsg}. Please check your email configuration in Netlify environment variables (SMTP2GO_USER, SMTP2GO_PASSWORD, SMTP2GO_FROM).`);
          } else if (emailResponse.status === 400) {
            throw new Error(`Invalid email request: ${errorMsg}`);
          } else {
            throw new Error(`Email sending failed (${emailResponse.status}): ${errorMsg}`);
          }
        }

        // Update invoice to mark email as sent
        await supabase
          .from('invoices')
          .update({ 
            email_sent: true,
            email_sent_at: new Date().toISOString()
          })
          .eq('id', invoiceRecord.id);

        setSuccess(`Invoice ${invoiceNumber} generated and emailed successfully to ${formData.email}!`);
        
        setTimeout(() => {
          onClose();
        }, 2000);
      } catch (emailError) {
        logger.error('Error sending email:', emailError);
        
        // Check if it's a timeout/abort error
        const isTimeout = emailError.name === 'AbortError' || emailError.message.includes('timeout');
        const errorMessage = isTimeout 
          ? 'Email service timed out. Please check your email configuration or try again later.'
          : emailError.message;
        
        // Show error and still download PDF
        setError(`Invoice ${invoiceNumber} saved successfully! However, email sending failed: ${errorMessage}. PDF downloaded for your records.`);
        doc.save(pdfFileName);
        
        // Don't close dialog on error so user can see the error message
        setTimeout(() => {
          setError(''); // Clear error after 5 seconds
        }, 5000);
        return; // Don't close dialog
      }
    } catch (error) {
      logger.error('Error sending invoice:', error);
      setError('Failed to send invoice: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!customer || !rentals) return null;

  const invoiceData = calculateInvoiceData();

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Generate Invoice for {customer?.name}</Typography>
            <Box>
              <Chip 
                label={invoiceTemplate?.name || 'Modern'} 
                size="small" 
                color="primary" 
                variant="outlined"
                sx={{ mr: 1 }}
              />
              <IconButton 
                size="small" 
                onClick={() => setTemplateManagerOpen(true)}
                title="Customize Template"
              >
                <SettingsIcon />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Click the ⚙️ icon to customize your invoice template (colors, fields, layout)
          </Alert>

          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Invoice Date"
                type="date"
                value={formData.invoice_date}
                onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Period Start"
                type="date"
                value={formData.period_start}
                onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Period End"
                type="date"
                value={formData.period_end}
                onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {invoiceData && (
              <Grid item xs={12}>
                <Box sx={{ p: 2, backgroundColor: 'grey.100', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>Invoice Summary:</Typography>
                  <Typography variant="body2">Billing Period: {formatDate(formData.period_start)} - {formatDate(formData.period_end)} ({invoiceData.rentalMonths} month{invoiceData.rentalMonths !== 1 ? 's' : ''})</Typography>
                  <Typography variant="body2">Cylinders: {invoiceData.numBottles} × ${invoiceData.monthlyRate.toFixed(2)}/month × {invoiceData.rentalMonths} month{invoiceData.rentalMonths !== 1 ? 's' : ''}</Typography>
                  <Typography variant="body2">Subtotal: ${invoiceData.subtotal.toFixed(2)}</Typography>
                  <Typography variant="body2">Tax ({(invoiceData.taxRate * 100).toFixed(0)}%): ${invoiceData.taxAmount.toFixed(2)}</Typography>
                  <Typography variant="body1" fontWeight="bold">Amount Due: ${invoiceData.total.toFixed(2)}</Typography>
                </Box>
              </Grid>
            )}

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.send_email}
                    onChange={(e) => setFormData({ ...formData, send_email: e.target.checked })}
                  />
                }
                label="Send invoice via email"
              />
            </Grid>

            {formData.send_email && (
              <>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Customer Email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    helperText={customer.email ? "Email from customer profile. Will be saved if changed." : "Email will be saved to customer profile."}
                    required
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Custom Message (Optional)"
                    value={formData.custom_message}
                    onChange={(e) => setFormData({ ...formData, custom_message: e.target.value })}
                    placeholder="Add a custom message to the email..."
                  />
                </Grid>
              </>
            )}
          </Grid>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {success}
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleDownload}
          disabled={loading}
        >
          Download PDF
        </Button>
        {formData.send_email && (
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={20} /> : <EmailIcon />}
            onClick={handleEmailInvoice}
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Generate & Email'}
          </Button>
        )}
      </DialogActions>
    </Dialog>

    {/* Template Manager Dialog */}
    <InvoiceTemplateManager
      open={templateManagerOpen}
      onClose={() => setTemplateManagerOpen(false)}
      currentTemplate={invoiceTemplate}
      onSave={(newTemplate) => {
        setInvoiceTemplate(newTemplate);
        setSuccess('Template updated! Changes will be applied to this invoice.');
      }}
    />
  </>
  );
}
