import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box,
  Typography, Checkbox, Alert, CircularProgress, LinearProgress,
  FormControlLabel, TextField, List, ListItem, ListItemText, ListItemIcon,
  Chip, Divider, IconButton, InputAdornment, FormControl, InputLabel, Select, MenuItem, Grid
} from '@mui/material';
import { 
  Email as EmailIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase/client';
import logger from '../utils/logger';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function BulkInvoiceEmailDialog({ open, onClose, customers }) {
  const { organization, user, profile } = useAuth();
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState([]);
  const [invoiceTemplate, setInvoiceTemplate] = useState(null);
  const [editingEmails, setEditingEmails] = useState({}); // { customerId: email }
  const [emailInputs, setEmailInputs] = useState({}); // { customerId: email }
  const [savingEmail, setSavingEmail] = useState({}); // { customerId: true/false }
  const [formData, setFormData] = useState({
    invoice_date: new Date().toISOString().split('T')[0],
    period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    period_end: new Date().toISOString().split('T')[0],
    custom_message: '',
    sender_email: '' // Selected sender email
  });
  const [invoiceEmails, setInvoiceEmails] = useState([]);

  useEffect(() => {
    if (open && organization) {
      // Load invoice template
      try {
        const savedTemplate = localStorage.getItem(`invoiceTemplate_${organization.id}`);
        if (savedTemplate) {
          setInvoiceTemplate(JSON.parse(savedTemplate));
        } else {
          setInvoiceTemplate({
            primary_color: '#000000',
            secondary_color: '#666666',
            tax_rate: 0.11,
            payment_terms: 'CREDIT CARD',
            email_subject: `Your Invoice from ${organization.name}`,
            email_body: 'Please find your invoice attached.'
          });
        }
      } catch (error) {
        logger.error('Error loading invoice template:', error);
      }

      // Load invoice emails from organization
      const loadInvoiceEmails = async () => {
        try {
          const { data: orgData, error: orgError } = await supabase
            .from('organizations')
            .select('invoice_emails, default_invoice_email, email')
            .eq('id', organization.id)
            .single();

          if (!orgError && orgData) {
            // Get invoice emails array, fallback to organization.email if empty
            let emails = [];
            if (orgData.invoice_emails && Array.isArray(orgData.invoice_emails)) {
              emails = orgData.invoice_emails;
            } else if (orgData.email) {
              emails = [orgData.email];
            }
            
            // Also include user email and profile email as options
            const allEmails = new Set(emails);
            if (user?.email) allEmails.add(user.email);
            if (profile?.email) allEmails.add(profile.email);
            if (orgData.email) allEmails.add(orgData.email);
            
            const emailList = Array.from(allEmails).filter(Boolean);
            setInvoiceEmails(emailList);
            
            // Set default sender email
            const defaultEmail = orgData.default_invoice_email || 
                                 orgData.email || 
                                 user?.email || 
                                 profile?.email || 
                                 emailList[0] || '';
            
            setFormData(prev => ({
              ...prev,
              sender_email: defaultEmail
            }));
          }
        } catch (error) {
          logger.error('Error loading invoice emails:', error);
          // Fallback to user/profile/organization email
          const fallbackEmail = user?.email || profile?.email || organization?.email || '';
          setInvoiceEmails(fallbackEmail ? [fallbackEmail] : []);
          setFormData(prev => ({
            ...prev,
            sender_email: fallbackEmail
          }));
        }
      };

      loadInvoiceEmails();

      // Select all customers by default
      if (customers && customers.length > 0) {
        setSelectedCustomers(customers.map(c => c.customer?.CustomerListID || c.CustomerListID).filter(Boolean));
      }
      
      // Reset email editing state
      setEditingEmails({});
      setEmailInputs({});
      setSavingEmail({});
    }
  }, [open, organization, customers, user, profile]);

  const handleToggleCustomer = (customerId) => {
    setSelectedCustomers(prev => 
      prev.includes(customerId)
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const handleSelectAll = () => {
    if (selectedCustomers.length === customers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(customers.map(c => c.customer?.CustomerListID || c.CustomerListID).filter(Boolean));
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
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

  const generateInvoiceForCustomer = async (customerData) => {
    let customer = customerData.customer || customerData;
    const rentals = customerData.rentals || [];
    
    // Check if email was updated in emailInputs (for customers that just had email added)
    const customerId = customer.CustomerListID;
    if (emailInputs[customerId] && !customer.email) {
      // Use the email from input if customer doesn't have one yet
      customer = { ...customer, email: emailInputs[customerId] };
    }

    if (!rentals || rentals.length === 0) {
      return { success: false, error: 'No active rentals' };
    }

    try {
      const startDate = new Date(formData.period_start);
      const endDate = new Date(formData.period_end);
      const startMonth = startDate.getMonth();
      const startYear = startDate.getFullYear();
      const endMonth = endDate.getMonth();
      const endYear = endDate.getFullYear();
      const rentalMonths = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
      const defaultMonthlyRate = 10;
      const subtotal = rentals.reduce((sum, r) => {
        const rate = parseFloat(r.rental_amount) > 0 ? parseFloat(r.rental_amount) : defaultMonthlyRate;
        return sum + rate * rentalMonths;
      }, 0);
      
      // Get tax rate from location
      let taxRate = invoiceTemplate?.tax_rate || 0.11;
      if (rentals[0]?.location) {
        const { data: locationData } = await supabase
          .from('locations')
          .select('total_tax_rate')
          .eq('name', rentals[0].location)
          .eq('organization_id', organization.id)
          .single();
        if (locationData) {
          taxRate = locationData.total_tax_rate / 100;
        }
      }
      
      const taxAmount = subtotal * taxRate;
      const total = subtotal + taxAmount;

      // Generate invoice number
      let invoiceNumber = null;
      let invoiceSettings;
      try {
        let { data: settingsData, error: settingsError } = await supabase
          .from('invoice_settings')
          .select('invoice_prefix, next_invoice_number')
          .eq('organization_id', organization.id)
          .single();

        if (settingsError && settingsError.code === 'PGRST116') {
          // No settings exist, create default
          const { data: newSettings, error: createError } = await supabase
            .from('invoice_settings')
            .insert({
              organization_id: organization.id,
              invoice_prefix: 'W',
              next_invoice_number: 1
            })
            .select()
            .single();
          
          if (createError) {
            throw new Error('Failed to create invoice settings: ' + createError.message);
          }
          settingsData = newSettings;
        } else if (settingsError) {
          throw new Error('Failed to fetch invoice settings: ' + settingsError.message);
        }

        invoiceSettings = settingsData;
        const prefix = invoiceSettings?.invoice_prefix || 'W';
        const nextNumber = invoiceSettings?.next_invoice_number || 1;
        
        // Ensure we have a valid number (if it's null or 0, start from 1)
        const validNumber = nextNumber > 0 ? nextNumber : 1;
        
        // Format: W00001, W00002, etc. (5 digits)
        invoiceNumber = `${prefix}${String(validNumber).padStart(5, '0')}`;
        
        logger.log(`Generated invoice number: ${invoiceNumber} (next number was: ${validNumber})`);

        // Increment invoice number BEFORE saving invoice
        const { error: updateError } = await supabase
          .from('invoice_settings')
          .update({ next_invoice_number: validNumber + 1 })
          .eq('organization_id', organization.id);
        
        if (updateError) {
          logger.error('Failed to increment invoice number:', updateError);
          // Non-critical, continue with invoice generation, but log error
        }
      } catch (settingsErr) {
        logger.error('Error with invoice settings:', settingsErr);
        throw new Error('Failed to generate invoice number: ' + settingsErr.message);
      }

      // Generate PDF with proper formatting
      const doc = new jsPDF();
      const primaryColor = invoiceTemplate?.primary_color || '#000000';
      const colorRgb = primaryColor.startsWith('#') 
        ? [
            parseInt(primaryColor.slice(1, 3), 16),
            parseInt(primaryColor.slice(3, 5), 16),
            parseInt(primaryColor.slice(5, 7), 16)
          ]
        : [0, 0, 0];

      // Header - Black bar
      doc.setFillColor(colorRgb[0], colorRgb[1], colorRgb[2]);
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
      doc.text(`$${total.toFixed(2)}`, 155, 18);

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

      // Bill To
      doc.setFont(undefined, 'bold');
      doc.text('BILL TO:', 15, y);
      doc.setFont(undefined, 'normal');
      doc.text(customer.name, 15, y + 7);
      const customerAddress = formatAddress(customer);
      if (customerAddress) {
        doc.text(customerAddress, 15, y + 14);
      }
      y += 30;

      // Rental Period Table
      autoTable(doc, {
        startY: y,
        head: [['RENTAL PERIOD', 'BILL TO ACCT #', 'SHIP TO ACCT #', 'TERMS', 'DUE DATE']],
        body: [[
          `${formatDate(formData.period_start)} - ${formatDate(formData.period_end)}`,
          customer.CustomerListID || '',
          customer.CustomerListID || '',
          invoiceTemplate?.payment_terms || 'CREDIT CARD',
          formatDate(new Date(new Date(formData.invoice_date).getTime() + 30 * 24 * 60 * 60 * 1000))
        ]],
        theme: 'plain',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
      });

      y = doc.lastAutoTable.finalY + 10;

      // Rental Summary Table
      const rentalsData = rentals.map(rental => {
        // Calculate actual days held from delivery date to period end (same logic as InvoiceGenerator)
        const rentalStartDate = rental.rental_start_date 
          ? new Date(rental.rental_start_date) 
          : (rental.bottles?.delivery_date ? new Date(rental.bottles.delivery_date) : startDate);
        // Calculate days from the earliest date (rental start or period start) to period end
        const actualStartDate = rentalStartDate < startDate ? rentalStartDate : startDate;
        const daysHeld = Math.ceil((endDate - actualStartDate) / (1000 * 60 * 60 * 24)) + 1;
        
        return [
          rental.product_code || rental.product_type || rental.description || 'Cylinder',
          '1',
          daysHeld,
          `$${monthlyRate.toFixed(3)}`,
          `$${(monthlyRate * rentalMonths).toFixed(2)}`
        ];
      });

      autoTable(doc, {
        startY: y,
        head: [['ITEM', 'QTY', 'DAYS', 'RATE/MONTH', 'TOTAL']],
        body: rentalsData,
        theme: 'plain',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
      });

      y = doc.lastAutoTable.finalY + 10;

      // Financial Summary
      const summaryX = 140;
      doc.setFontSize(10);
      
      doc.text('Subtotal:', summaryX, y);
      doc.text(`$${subtotal.toFixed(2)}`, 180, y, { align: 'right' });
      y += 7;
      
      doc.text('Tax:', summaryX, y);
      doc.text(`$${taxAmount.toFixed(2)}`, 180, y, { align: 'right' });
      y += 7;

      // Amount Due - Black bar
      doc.setFillColor(colorRgb[0], colorRgb[1], colorRgb[2]);
      doc.rect(summaryX - 5, y - 5, 55, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.text('AMOUNT DUE', summaryX, y);
      doc.text(`$${total.toFixed(2)}`, 180, y, { align: 'right' });
      
      // Reset
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');

      // Get PDF as base64 for email
      const pdfBase64 = doc.output('base64');
      const pdfFileName = `Invoice_${invoiceNumber}_${formData.invoice_date}.pdf`;
      
      // Convert base64 to blob for download
      const base64Data = pdfBase64;
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const pdfBlob = new Blob([byteArray], { type: 'application/pdf' });

      // Save invoice to database
      logger.log(`Saving invoice ${invoiceNumber} for customer ${customer.name}...`);
      const { data: invoiceRecord, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          organization_id: organization.id,
          customer_id: customer.CustomerListID,
          customer_name: customer.name,
          customer_email: customer.email,
          invoice_number: invoiceNumber,
          invoice_date: formData.invoice_date,
          period_start: formData.period_start,
          period_end: formData.period_end,
          subtotal,
          tax_amount: taxAmount,
          total_amount: total,
          rental_days: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)),
          cylinders_count: numBottles
        })
        .select()
        .single();

      if (invoiceError) {
        logger.error(`Failed to save invoice ${invoiceNumber} for ${customer.name}:`, invoiceError);
        throw new Error('Failed to save invoice: ' + invoiceError.message);
      }

      // Ensure we have the invoice number from the record (fallback)
      const finalInvoiceNumber = invoiceNumber || invoiceRecord.invoice_number;
      if (!finalInvoiceNumber) {
        logger.error(`No invoice number found for customer ${customer.name} - invoiceNumber: ${invoiceNumber}, record: ${invoiceRecord.invoice_number}`);
        throw new Error('Invoice number is missing after saving invoice');
      }
      
      logger.log(`Invoice ${finalInvoiceNumber} saved successfully for customer ${customer.name}. Invoice ID: ${invoiceRecord.id}`);

      // Save line items
      logger.log(`Saving ${rentals.length} line items for invoice ${finalInvoiceNumber}...`);
      for (const rental of rentals) {
        // Calculate actual days held from delivery date to period end (same logic as InvoiceGenerator)
        const rentalStartDate = rental.rental_start_date 
          ? new Date(rental.rental_start_date) 
          : (rental.bottles?.delivery_date ? new Date(rental.bottles.delivery_date) : startDate);
        // Calculate days from the earliest date (rental start or period start) to period end
        const actualStartDate = rentalStartDate < startDate ? rentalStartDate : startDate;
        const daysHeld = Math.ceil((endDate - actualStartDate) / (1000 * 60 * 60 * 24)) + 1;
        
        const dailyRate = monthlyRate / 30; // Convert monthly rate to daily rate
        const lineTotal = monthlyRate * rentalMonths;
        
        const { error: lineItemError } = await supabase
          .from('invoice_line_items')
          .insert({
            invoice_id: invoiceRecord.id,
            item_description: rental.product_code || rental.product_type || rental.description || 'Cylinder',
            barcode: rental.barcode || rental.bottles?.barcode_number || rental.bottle_barcode || null,
            serial_number: rental.serial_number || rental.bottles?.serial_number || null,
            quantity: 1,
            rental_days: daysHeld,
            daily_rate: dailyRate,
            line_total: lineTotal
          });
        
        if (lineItemError) {
          logger.warn(`Failed to save line item for invoice ${finalInvoiceNumber}:`, lineItemError);
          // Non-critical, continue
        }
      }
      logger.log(`Line items saved for invoice ${finalInvoiceNumber}`);

      // Send email if customer has email
      if (customer.email) {
        const emailSubject = (invoiceTemplate?.email_subject || `Invoice ${finalInvoiceNumber} from ${organization.name}`)
          .replace('{company_name}', organization.name);
        
        const emailBody = (invoiceTemplate?.email_body || 'Please find your invoice attached.')
          .replace('{company_name}', organization.name)
          .replace('{invoice_number}', finalInvoiceNumber)
          .replace('{customer_name}', customer.name)
          .replace('{total_amount}', `$${total.toFixed(2)}`)
          + (formData.custom_message ? `<br/><br/>${formData.custom_message.replace(/\n/g, '<br/>')}` : '');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        try {
          // Check if we're in local development
          const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
          
          // Use the selected sender email from form, with fallback
          let senderEmail = formData.sender_email || user?.email || profile?.email || organization?.email;
          if (!senderEmail) {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            senderEmail = authUser?.email;
          }
          
          if (!senderEmail) {
            throw new Error('Unable to determine sender email. Please select a sender email address.');
          }

          const emailResponse = await fetch('/.netlify/functions/send-invoice-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: customer.email,
              from: senderEmail,
              subject: emailSubject,
              body: emailBody,
              pdfBase64,
              pdfFileName,
              invoiceNumber: finalInvoiceNumber
            }),
            signal: controller.signal
          }).catch((fetchError) => {
            // Handle network errors, aborts, etc.
            logger.error('Fetch error:', fetchError);
            
            // Check if this is a local development issue
            if (isLocalDev && (fetchError.message.includes('Failed to fetch') || fetchError.message.includes('NetworkError'))) {
              throw new Error('Netlify functions are not available. To test email functionality locally, please run "netlify dev" instead of "npm run dev". Alternatively, deploy to Netlify to use email functionality in production.');
            }
            
            if (fetchError.name === 'AbortError') {
              throw new Error('Email request timed out after 60 seconds. The PDF might be too large or the email service is slow.');
            }
            throw new Error(`Network error while sending email: ${fetchError.message}. Please check your internet connection and try again.`);
          }).finally(() => clearTimeout(timeoutId));

          if (!emailResponse.ok) {
            let errorText = '';
            let errorDetails = null;
            try {
              const errorData = await emailResponse.json();
              errorText = errorData.error || errorData.details || 'Unknown error';
              errorDetails = errorData;
            } catch (parseError) {
              // If JSON parsing fails, try to get text
              errorText = await emailResponse.text() || `HTTP ${emailResponse.status}: ${emailResponse.statusText}`;
            }
            
            logger.error('Email response error:', {
              status: emailResponse.status,
              statusText: emailResponse.statusText,
              error: errorText,
              details: errorDetails
            });
            
            throw new Error(`Email failed (${emailResponse.status}): ${errorText}`);
          }

          // Update invoice as sent
          await supabase
            .from('invoices')
            .update({ email_sent: true, email_sent_at: new Date().toISOString() })
            .eq('id', invoiceRecord.id);

          logger.log(`Invoice ${finalInvoiceNumber} sent successfully to ${customer.email} for customer ${customer.name}`);
          return { 
            success: true, 
            invoiceNumber: finalInvoiceNumber, 
            email: customer.email,
            customer: customer,
            pdfBlob: pdfBlob,
            pdfFileName: pdfFileName
          };
        } catch (emailError) {
          logger.error('Email error for customer:', customer.name, emailError);
          logger.log(`Invoice ${finalInvoiceNumber} was created but email failed for customer ${customer.name}`);
          return { 
            success: false, 
            error: 'Email failed: ' + emailError.message, 
            invoiceNumber: finalInvoiceNumber,
            customer: customer,
            pdfBlob: pdfBlob,
            pdfFileName: pdfFileName
          };
        }
      } else {
        logger.warn(`Customer ${customer.name} has no email address. Invoice ${finalInvoiceNumber} was created but not sent.`);
        return { 
          success: false, 
          error: 'No email address', 
          invoiceNumber: finalInvoiceNumber,
          customer: customer,
          pdfBlob: pdfBlob,
          pdfFileName: pdfFileName
        };
      }
    } catch (error) {
      logger.error('Error generating invoice for customer:', customer.name, error);
      // Always include invoiceNumber if it was generated before the error
      return { 
        success: false, 
        error: error.message,
        invoiceNumber: invoiceNumber || undefined,
        customer: customer,
        pdfBlob: undefined,
        pdfFileName: undefined
      };
    }
  };

  const handleDownloadInvoice = (result) => {
    if (!result.pdfBlob) {
      alert('PDF not available for download');
      return;
    }
    
    const url = URL.createObjectURL(result.pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = result.pdfFileName || `Invoice_${result.invoiceNumber || 'invoice'}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleBulkEmail = async () => {
    if (selectedCustomers.length === 0) {
      alert('Please select at least one customer');
      return;
    }

    setLoading(true);
    setProcessing(true);
    setResults([]);
    
    const customersToProcess = customers.filter(c => {
      const id = c.customer?.CustomerListID || c.CustomerListID;
      return selectedCustomers.includes(id);
    });

    setProgress({ current: 0, total: customersToProcess.length });

    const batchResults = [];
    
    // Process in batches of 5 to avoid overwhelming the system
    const BATCH_SIZE = 5;
    for (let i = 0; i < customersToProcess.length; i += BATCH_SIZE) {
      const batch = customersToProcess.slice(i, i + BATCH_SIZE);
      
      const batchPromises = batch.map(async (customerData) => {
        const result = await generateInvoiceForCustomer(customerData);
        setProgress(prev => ({ ...prev, current: prev.current + 1 }));
        return {
          customer: customerData.customer || customerData,
          ...result
        };
      });

      const batchResultsData = await Promise.all(batchPromises);
      batchResults.push(...batchResultsData);
      setResults([...batchResults]);

      // Small delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < customersToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    setLoading(false);
    setProcessing(false);
  };

  const handleStartEditEmail = (customerId, currentEmail) => {
    setEditingEmails(prev => ({ ...prev, [customerId]: true }));
    setEmailInputs(prev => ({ ...prev, [customerId]: currentEmail || '' }));
  };

  const handleCancelEditEmail = (customerId) => {
    setEditingEmails(prev => {
      const newState = { ...prev };
      delete newState[customerId];
      return newState;
    });
    setEmailInputs(prev => {
      const newState = { ...prev };
      delete newState[customerId];
      return newState;
    });
  };

  const handleSaveEmail = async (customerId, customerData) => {
    const customer = customerData.customer || customerData;
    const email = emailInputs[customerId]?.trim();
    
    if (!email) {
      alert('Please enter a valid email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('Please enter a valid email address');
      return;
    }

    setSavingEmail(prev => ({ ...prev, [customerId]: true }));
    
    try {
      const { error } = await supabase
        .from('customers')
        .update({ email })
        .eq('CustomerListID', customerId)
        .eq('organization_id', organization.id);

      if (error) {
        throw error;
      }

      // Update the customer object in the customers array
      customer.email = email;
      
      // Close edit mode
      setEditingEmails(prev => {
        const newState = { ...prev };
        delete newState[customerId];
        return newState;
      });
      
      logger.log(`Email saved for customer ${customer.name}: ${email}`);
    } catch (error) {
      logger.error('Error saving email:', error);
      alert('Failed to save email: ' + error.message);
    } finally {
      setSavingEmail(prev => {
        const newState = { ...prev };
        delete newState[customerId];
        return newState;
      });
    }
  };

  const customersToShow = customers || [];
  const selectedCount = selectedCustomers.length;
  const customersWithEmail = customersToShow.filter(c => {
    const customer = c.customer || c;
    return customer.email && selectedCustomers.includes(customer.CustomerListID);
  }).length;
  const customersWithoutEmail = selectedCount - customersWithEmail;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <EmailIcon />
          <Typography variant="h6">Bulk Email Invoices</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        {!processing ? (
          <>
            <Alert severity="info" sx={{ mb: 2 }}>
              Select customers to email invoices to. Only customers with email addresses will receive emails.
            </Alert>

            <Box mb={2}>
              <TextField
                fullWidth
                type="date"
                label="Invoice Date"
                value={formData.invoice_date}
                onChange={(e) => setFormData(prev => ({ ...prev, invoice_date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                sx={{ mb: 2 }}
              />
              <Box display="flex" gap={2}>
                <TextField
                  fullWidth
                  type="date"
                  label="Period Start"
                  value={formData.period_start}
                  onChange={(e) => setFormData(prev => ({ ...prev, period_start: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  fullWidth
                  type="date"
                  label="Period End"
                  value={formData.period_end}
                  onChange={(e) => setFormData(prev => ({ ...prev, period_end: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Send From Email</InputLabel>
                <Select
                  value={formData.sender_email || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, sender_email: e.target.value }))}
                  label="Send From Email"
                >
                  {invoiceEmails.map((email) => (
                    <MenuItem key={email} value={email}>
                      {email}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Select which email address will send all invoices. Manage invoice emails in Settings.
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Custom Message (optional)"
                value={formData.custom_message}
                onChange={(e) => setFormData(prev => ({ ...prev, custom_message: e.target.value }))}
                sx={{ mt: 2 }}
                placeholder="This message will be added to all emails"
              />
            </Box>

            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1">
                {selectedCount} of {customersToShow.length} customers selected
              </Typography>
              <Button size="small" onClick={handleSelectAll}>
                {selectedCount === customersToShow.length ? 'Deselect All' : 'Select All'}
              </Button>
            </Box>

            {customersWithoutEmail > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                {customersWithoutEmail} selected customer(s) don't have email addresses and will be skipped. 
                You can add email addresses by clicking the edit icon next to each customer.
              </Alert>
            )}

            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
              <List>
                {customersToShow.map((customerData, index) => {
                  const customer = customerData.customer || customerData;
                  const customerId = customer.CustomerListID;
                  const isSelected = selectedCustomers.includes(customerId);
                  const hasEmail = !!customer.email;
                  const rentalCount = customerData.rentals?.length || 0;

                  return (
                    <React.Fragment key={customerId || index}>
                      <ListItem>
                        <ListItemIcon>
                          <Checkbox
                            checked={isSelected}
                            onChange={() => handleToggleCustomer(customerId)}
                            disabled={rentalCount === 0}
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography>{customer.name}</Typography>
                              {!hasEmail && <Chip label="No Email" size="small" color="warning" />}
                              {rentalCount === 0 && <Chip label="No Rentals" size="small" color="error" />}
                            </Box>
                          }
                          secondary={
                            <Box>
                              {editingEmails[customerId] ? (
                                <Box display="flex" alignItems="center" gap={1} sx={{ mt: 1 }}>
                                  <TextField
                                    size="small"
                                    type="email"
                                    placeholder="Enter email address"
                                    value={emailInputs[customerId] || ''}
                                    onChange={(e) => setEmailInputs(prev => ({ ...prev, [customerId]: e.target.value }))}
                                    sx={{ flex: 1, minWidth: 200 }}
                                    InputProps={{
                                      endAdornment: (
                                        <InputAdornment position="end">
                                          <IconButton
                                            size="small"
                                            onClick={() => handleSaveEmail(customerId, customerData)}
                                            disabled={savingEmail[customerId]}
                                            color="primary"
                                          >
                                            {savingEmail[customerId] ? (
                                              <CircularProgress size={16} />
                                            ) : (
                                              <SaveIcon fontSize="small" />
                                            )}
                                          </IconButton>
                                          <IconButton
                                            size="small"
                                            onClick={() => handleCancelEditEmail(customerId)}
                                            disabled={savingEmail[customerId]}
                                          >
                                            <CancelIcon fontSize="small" />
                                          </IconButton>
                                        </InputAdornment>
                                      )
                                    }}
                                  />
                                </Box>
                              ) : (
                                <Box display="flex" alignItems="center" gap={1}>
                                  <Typography variant="body2" color="text.secondary">
                                    {customer.email || 'No email address'}
                                  </Typography>
                                  {!hasEmail && (
                                    <IconButton
                                      size="small"
                                      onClick={() => handleStartEditEmail(customerId, customer.email)}
                                      sx={{ ml: 0.5 }}
                                      title="Add email address"
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  )}
                                </Box>
                              )}
                              <Typography variant="body2" color="text.secondary">
                                {rentalCount} active rental(s)
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < customersToShow.length - 1 && <Divider />}
                    </React.Fragment>
                  );
                })}
              </List>
            </Box>
          </>
        ) : (
          <Box>
            <Typography variant="h6" gutterBottom>
              Processing Invoices...
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={(progress.current / progress.total) * 100} 
              sx={{ mb: 2 }}
            />
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {progress.current} of {progress.total} customers processed
            </Typography>

            {results.length > 0 && (
              <Box sx={{ mt: 3, maxHeight: 400, overflow: 'auto' }}>
                <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                  Results ({results.length} processed):
                </Typography>
                {results.map((result, index) => (
                  <Box 
                    key={index} 
                    display="flex" 
                    alignItems="flex-start" 
                    gap={1.5} 
                    mb={1.5}
                    p={1.5}
                    sx={{ 
                      bgcolor: result.success ? 'success.light' : 'error.light',
                      borderRadius: 1,
                      border: `1px solid ${result.success ? 'success.main' : 'error.main'}`
                    }}
                  >
                    {result.success ? (
                      <CheckCircleIcon color="success" fontSize="small" sx={{ mt: 0.5 }} />
                    ) : (
                      <ErrorIcon color="error" fontSize="small" sx={{ mt: 0.5 }} />
                    )}
                    <Box flex={1}>
                      <Typography variant="body2" fontWeight="medium">
                        {result.customer.name}
                      </Typography>
                      {result.success ? (
                        <Typography variant="body2" color="text.secondary">
                          ✅ Invoice <strong>{result.invoiceNumber || 'N/A'}</strong> sent to {result.email}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="error">
                          ❌ {result.error}
                          {result.invoiceNumber ? (
                            <span> (Invoice <strong>{result.invoiceNumber}</strong> was created but email failed)</span>
                          ) : (
                            <span> (No invoice was created)</span>
                          )}
                        </Typography>
                      )}
                    </Box>
                    {result.pdfBlob && result.invoiceNumber && (
                      <IconButton
                        size="small"
                        onClick={() => handleDownloadInvoice(result)}
                        title="Download invoice PDF"
                        color="primary"
                      >
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={processing}>
          {processing ? 'Processing...' : 'Cancel'}
        </Button>
        {!processing && (
          <Button
            variant="contained"
            onClick={handleBulkEmail}
            disabled={selectedCount === 0 || loading}
            startIcon={loading ? <CircularProgress size={20} /> : <EmailIcon />}
          >
            Send Invoices ({selectedCount})
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}


