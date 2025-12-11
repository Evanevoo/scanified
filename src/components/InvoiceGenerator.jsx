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

export default function InvoiceGenerator({ open, onClose, customer, rentals, existingInvoiceNumber = null }) {
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
    custom_message: '',
    territory: '',
    purchase_order: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [locationTaxRate, setLocationTaxRate] = useState(null);
  const [customerLeaseAgreement, setCustomerLeaseAgreement] = useState(null);

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
            show_territory: false,
            show_terms: true,
            show_due_date: true,
            show_purchase_order: false,
            show_rental_summary: true,
            show_serialized_assets: true,
            show_transactions: true,
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

      // Fetch lease agreements for this customer and attach to rentals if not already attached
      if (customer?.CustomerListID && rentals && rentals.length > 0) {
        const fetchLeaseAgreement = async () => {
          try {
            // Try to find lease agreement by customer_id or customer_name
            logger.log('Fetching lease agreement for customer:', customer.CustomerListID, customer.name);
            
            // Try multiple query strategies
            let leaseAgreements = null;
            
            // Strategy 1: Try with customer_id
            if (customer.CustomerListID) {
              const { data, error } = await supabase
                .from('lease_agreements')
                .select('*')
                .eq('organization_id', organization.id)
                .eq('status', 'active')
                .eq('customer_id', customer.CustomerListID)
                .maybeSingle();
              
              if (data && !error) {
                leaseAgreements = data;
                logger.log('Found lease agreement by customer_id:', leaseAgreements);
              }
            }
            
            // Strategy 2: Try with customer_name if not found
            if (!leaseAgreements && customer.name) {
              const { data, error } = await supabase
                .from('lease_agreements')
                .select('*')
                .eq('organization_id', organization.id)
                .eq('status', 'active')
                .eq('customer_name', customer.name)
                .maybeSingle();
              
              if (data && !error) {
                leaseAgreements = data;
                logger.log('Found lease agreement by customer_name:', leaseAgreements);
              }
            }
            
            // Strategy 3: Try with customer_name matching CustomerListID
            if (!leaseAgreements && customer.CustomerListID) {
              const { data, error } = await supabase
                .from('lease_agreements')
                .select('*')
                .eq('organization_id', organization.id)
                .eq('status', 'active')
                .eq('customer_name', customer.CustomerListID)
                .maybeSingle();
              
              if (data && !error) {
                leaseAgreements = data;
                logger.log('Found lease agreement by customer_name (matching CustomerListID):', leaseAgreements);
              }
            }
            
            if (leaseAgreements) {
              const billingFreq = (leaseAgreements.billing_frequency || '').toLowerCase();
              logger.log('Lease agreement billing_frequency:', billingFreq);
              if (billingFreq === 'annual' || billingFreq === 'yearly' || billingFreq === 'annually' || billingFreq === 'semi-annual') {
                logger.log('Found active yearly lease agreement for customer, storing in state', leaseAgreements);
                // Store lease agreement in state so calculateInvoiceData can use it
                setCustomerLeaseAgreement(leaseAgreements);
                // Also attach to rentals if not already attached
                rentals.forEach(r => {
                  if (!r.lease_agreement) {
                    r.lease_agreement = leaseAgreements;
                    r.rental_type = 'yearly';
                  }
                });
              } else {
                logger.log('Lease agreement found but billing_frequency is not yearly:', billingFreq);
              }
            } else {
              logger.log('No lease agreement found for customer:', customer.CustomerListID, customer.name);
            }
          } catch (error) {
            // Not found or error - that's okay, customer might not have a lease agreement
            logger.error('Error fetching lease agreement:', error);
          }
        };

        fetchLeaseAgreement();
      } else {
        logger.log('Skipping lease agreement fetch - missing customer ID or rentals');
        // Clear lease agreement state if no customer
        setCustomerLeaseAgreement(null);
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
  
  // Recalculate when customerLeaseAgreement changes (after async fetch completes)
  // This ensures the invoice data updates when the lease agreement is found
  useEffect(() => {
    if (customerLeaseAgreement && open) {
      logger.log('customerLeaseAgreement state changed, should trigger recalculation');
      // The calculation will automatically use the updated state on next render
      // Force a re-render by updating a dummy state or the calculation will pick it up
    }
  }, [customerLeaseAgreement, open]);

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
    
    // Use customerLeaseAgreement from state if available
    // This ensures we have the latest lease agreement data

    const startDate = new Date(formData.period_start);
    const endDate = new Date(formData.period_end);
    
    // Calculate number of days in billing period (for display purposes only - not used in calculation)
    const rentalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    
    // Calculate number of months in billing period (this is what they're paying for)
    // Invoice is generated at end of month, paying for the upcoming month
    // Example: Nov 1 - Nov 30 = 1 month (paying for December)
    const startMonth = startDate.getMonth();
    const startYear = startDate.getFullYear();
    const endMonth = endDate.getMonth();
    const endYear = endDate.getFullYear();
    
    // Calculate months difference
    // For monthly rentals: typically 1 month (paying for upcoming month)
    // For yearly rentals: 12 months (paying for upcoming year)
    // Example: Oct 31 - Nov 20 should be 1 month (same calendar month)
    // Example: Nov 1 - Nov 30 = 1 month
    // Example: Jan 1 - Dec 31 = 12 months
    let rentalMonths;
    if (startYear === endYear && startMonth === endMonth) {
      // Same month = 1 month
      rentalMonths = 1;
    } else {
      // Different months: calculate difference
      rentalMonths = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
    }
    
    // Check if this is a yearly rental (check rental_type/billing_frequency first, then check if period is 12 months)
    // Priority: rental_type or lease_agreement billing_frequency overrides period length
    logger.log('=== YEARLY RENTAL DETECTION ===');
    logger.log('Customer:', customer?.CustomerListID, customer?.name);
    logger.log('Rentals:', rentals.map(r => ({ 
      rental_type: r.rental_type, 
      has_lease_agreement: !!r.lease_agreement,
      billing_frequency: r.lease_agreement?.billing_frequency,
      lease_agreement_id: r.lease_agreement_id
    })));
    logger.log('Customer lease agreement from state:', customerLeaseAgreement);
    
    let isYearlyRental = rentals.some(r => {
      // Check if rental has yearly type
      if (r.rental_type === 'yearly') {
        logger.log('✓ Yearly rental detected: rental_type = yearly', r);
        return true;
      }
      // Check if rental has lease agreement with yearly billing frequency
      const billingFreq = r.lease_agreement?.billing_frequency?.toLowerCase();
      if (billingFreq === 'annual' || billingFreq === 'yearly' || billingFreq === 'annually' || billingFreq === 'semi-annual') {
        logger.log('✓ Yearly rental detected: lease_agreement billing_frequency =', billingFreq, r.lease_agreement);
        return true;
      }
      return false;
    });
    
    // If not detected from rentals, check the customerLeaseAgreement from state
    if (!isYearlyRental && customerLeaseAgreement) {
      const billingFreq = (customerLeaseAgreement.billing_frequency || '').toLowerCase();
      logger.log('Checking customerLeaseAgreement from state. billing_frequency:', billingFreq);
      if (billingFreq === 'annual' || billingFreq === 'yearly' || billingFreq === 'annually' || billingFreq === 'semi-annual') {
        isYearlyRental = true;
        logger.log('✓ Yearly rental detected: customerLeaseAgreement from state, billing_frequency =', billingFreq);
        // Attach to rentals for use in calculation
        rentals.forEach(r => {
          if (!r.lease_agreement) {
            r.lease_agreement = customerLeaseAgreement;
            r.rental_type = 'yearly';
          }
        });
      } else {
        logger.log('✗ Lease agreement found but billing_frequency is not yearly:', billingFreq);
      }
    } else if (!isYearlyRental) {
      logger.log('✗ No customerLeaseAgreement in state. Yearly rental not detected.');
    }
    
    // Fallback: if period is exactly 12 months, treat as yearly
    if (!isYearlyRental && rentalMonths === 12) {
      isYearlyRental = true;
      logger.log('✓ Yearly rental detected: billing period is 12 months');
    }
    
    logger.log('=== RESULT: isYearlyRental =', isYearlyRental, '===');
    
    if (isYearlyRental) {
      logger.log('Invoice is for yearly rental. Billing period months:', rentalMonths);
    } else {
      logger.log('Invoice is for monthly rental. Billing period months:', rentalMonths);
    }
    
    // Monthly rate per bottle (for monthly rentals)
    const monthlyRate = 10; // Default monthly rate per bottle
    const numBottles = rentals.length;
    
    // Calculate subtotal:
    // - Monthly rentals: $10/month × 1 month (paying for upcoming month)
    // - Yearly rentals: 
    //   * If during lease period: charge for remaining months until lease end
    //   * If new year (after lease end): charge for full 12 months
    let subtotal;
    if (isYearlyRental) {
      // Get lease agreement dates - check rentals first, then state
      const yearlyRental = rentals.find(r => r.lease_agreement || r.rental_type === 'yearly');
      const leaseAgreement = yearlyRental?.lease_agreement || customerLeaseAgreement;
      const leaseStartDate = leaseAgreement?.start_date ? new Date(leaseAgreement.start_date) : null;
      const leaseEndDate = leaseAgreement?.end_date ? new Date(leaseAgreement.end_date) : null;
      const invoiceDate = new Date(formData.invoice_date);
      
      logger.log('Yearly rental calculation - leaseAgreement:', leaseAgreement);
      logger.log('Yearly rental calculation - leaseStartDate:', leaseStartDate, 'leaseEndDate:', leaseEndDate, 'invoiceDate:', invoiceDate);
      
      let monthsToCharge = 12; // Default: full year
      
      if (leaseEndDate && invoiceDate) {
        // Check if invoice date is after lease end date (new year)
        if (invoiceDate > leaseEndDate) {
          // New year: charge for full 12 months
          monthsToCharge = 12;
          logger.log('Yearly rental - new year: charging for full 12 months');
        } else if (leaseStartDate && leaseEndDate) {
          // During lease period: calculate remaining months starting from the month AFTER invoice date
          const invoiceYear = invoiceDate.getFullYear();
          const invoiceMonth = invoiceDate.getMonth();
          const leaseEndYear = leaseEndDate.getFullYear();
          const leaseEndMonth = leaseEndDate.getMonth();
          
          // Start from the month AFTER invoice date
          // If invoice is in November (month 10), start from December (month 11)
          let startYear = invoiceYear;
          let startMonth = invoiceMonth + 1;
          
          // If we go past December, move to next year
          if (startMonth > 11) {
            startMonth = 0; // January
            startYear += 1;
          }
          
          // Calculate months from the month after invoice date to lease end date
          monthsToCharge = (leaseEndYear - startYear) * 12 + (leaseEndMonth - startMonth) + 1;
          
          // Ensure we don't charge more than 12 months
          if (monthsToCharge > 12) monthsToCharge = 12;
          if (monthsToCharge < 1) monthsToCharge = 1;
          
          logger.log('Yearly rental - during lease period: charging for', monthsToCharge, 'remaining months (starting from month after invoice date)');
        }
      }
      
      // Calculate: monthly rate × months to charge × number of cylinders
      subtotal = numBottles * monthlyRate * monthsToCharge;
      logger.log('Yearly rental calculation:', numBottles, 'cylinders × $', monthlyRate, '/month ×', monthsToCharge, 'months = $', subtotal);
      
      // Store monthsToCharge for use in PDF generation
      rentalMonths = monthsToCharge;
    } else {
      // Monthly rental: $10/month × 1 month (paying for upcoming month)
      // Always charge for 1 month, regardless of period dates
      subtotal = numBottles * monthlyRate * 1;
      logger.log('Monthly rental calculation:', numBottles, 'cylinders × $', monthlyRate, '/month × 1 month = $', subtotal);
      
      // Calculate billing period for display: upcoming month (month after invoice date)
      const invoiceDate = new Date(formData.invoice_date);
      let billingStartYear = invoiceDate.getFullYear();
      let billingStartMonth = invoiceDate.getMonth() + 1; // Month after invoice date
      
      // If we go past December, move to next year
      if (billingStartMonth > 11) {
        billingStartMonth = 0; // January
        billingStartYear += 1;
      }
      
      // First day of upcoming month
      const billingPeriodStart = new Date(billingStartYear, billingStartMonth, 1);
      // Last day of upcoming month
      const billingPeriodEnd = new Date(billingStartYear, billingStartMonth + 1, 0);
      
      // Store billing period dates for display
      // These will be used instead of formData.period_start/period_end for monthly rentals
    }
    
    // Use tax rate from location (priority), then rental record, then template, then default to 11%
    const taxRate = locationTaxRate !== null 
      ? locationTaxRate 
      : (rentals[0]?.tax_rate || invoiceTemplate?.tax_rate || 0.11);
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount;

    // Calculate billing period for display
    let displayBillingPeriodStart, displayBillingPeriodEnd;
    if (!isYearlyRental) {
      // For monthly rentals, use the upcoming month
      const invoiceDate = new Date(formData.invoice_date);
      let billingStartYear = invoiceDate.getFullYear();
      let billingStartMonth = invoiceDate.getMonth() + 1; // Month after invoice date
      
      if (billingStartMonth > 11) {
        billingStartMonth = 0;
        billingStartYear += 1;
      }
      
      displayBillingPeriodStart = new Date(billingStartYear, billingStartMonth, 1);
      displayBillingPeriodEnd = new Date(billingStartYear, billingStartMonth + 1, 0);
    } else {
      // For yearly rentals, calculate the actual billing period based on months being charged
      const invoiceDate = new Date(formData.invoice_date);
      const yearlyRental = rentals.find(r => r.lease_agreement || r.rental_type === 'yearly');
      const leaseAgreement = yearlyRental?.lease_agreement || customerLeaseAgreement;
      const leaseEndDate = leaseAgreement?.end_date ? new Date(leaseAgreement.end_date) : null;
      
      if (leaseEndDate && invoiceDate) {
        if (invoiceDate > leaseEndDate) {
          // New year: billing period is full year (Jan 1 - Dec 31 of next year)
          const nextYear = invoiceDate.getFullYear();
          displayBillingPeriodStart = new Date(nextYear, 0, 1); // January 1
          displayBillingPeriodEnd = new Date(nextYear, 11, 31); // December 31
        } else {
          // During lease period: billing period starts from month after invoice date
          // and ends on the last day of the last month being charged
          let billingStartYear = invoiceDate.getFullYear();
          let billingStartMonth = invoiceDate.getMonth() + 1; // Month after invoice date
          
          if (billingStartMonth > 11) {
            billingStartMonth = 0;
            billingStartYear += 1;
          }
          
          displayBillingPeriodStart = new Date(billingStartYear, billingStartMonth, 1);
          
          // Calculate end date: start month + (monthsToCharge - 1) months, last day of that month
          let billingEndYear = billingStartYear;
          let billingEndMonth = billingStartMonth + (rentalMonths - 1);
          
          // Handle year rollover
          while (billingEndMonth > 11) {
            billingEndMonth -= 12;
            billingEndYear += 1;
          }
          
          // Last day of the end month
          displayBillingPeriodEnd = new Date(billingEndYear, billingEndMonth + 1, 0);
        }
      } else {
        // Fallback: use entered period dates
        displayBillingPeriodStart = startDate;
        displayBillingPeriodEnd = endDate;
      }
    }

    return {
      subtotal,
      taxAmount,
      taxRate,
      total,
      rentalDays, // Days in billing period
      rentalMonths: isYearlyRental ? rentalMonths : 1, // Months being charged (remaining months for yearly, always 1 for monthly)
      monthlyRate,
      numBottles,
      isYearlyRental, // Include this so PDF generation can use it
      billingPeriodStart: displayBillingPeriodStart, // Billing period start for display
      billingPeriodEnd: displayBillingPeriodEnd, // Billing period end for display
      rentals: rentals.map(rental => {
        // Calculate actual days they've had the bottle (from rental start to period end)
        // This is for display purposes only (RENT DAYS column)
        const rentalStartDate = rental.rental_start_date 
          ? new Date(rental.rental_start_date) 
          : (rental.bottles?.delivery_date ? new Date(rental.bottles.delivery_date) : startDate);
        // Calculate days from the earliest date (rental start or period start) to period end
        const actualStartDate = rentalStartDate < startDate ? rentalStartDate : startDate;
        const daysHeld = Math.ceil((endDate - actualStartDate) / (1000 * 60 * 60 * 24)) + 1;
        
        // Calculate line total based on rental type
        let lineTotal;
        if (isYearlyRental) {
          // Yearly rental: calculate months to charge (remaining months or full year)
          const yearlyRental = rentals.find(r => r.lease_agreement || r.rental_type === 'yearly');
          const leaseEndDate = yearlyRental?.lease_agreement?.end_date ? new Date(yearlyRental.lease_agreement.end_date) : null;
          const invoiceDate = new Date(formData.invoice_date);
          
          let monthsToCharge = 12; // Default: full year
          
          if (leaseEndDate && invoiceDate) {
            if (invoiceDate > leaseEndDate) {
              // New year: charge for full 12 months
              monthsToCharge = 12;
            } else if (yearlyRental?.lease_agreement?.start_date) {
              const leaseStartDate = new Date(yearlyRental.lease_agreement.start_date);
              const invoiceYear = invoiceDate.getFullYear();
              const invoiceMonth = invoiceDate.getMonth();
              const leaseEndYear = leaseEndDate.getFullYear();
              const leaseEndMonth = leaseEndDate.getMonth();
              
              // Calculate remaining months
              monthsToCharge = (leaseEndYear - invoiceYear) * 12 + (leaseEndMonth - invoiceMonth) + 1;
              if (monthsToCharge > 12) monthsToCharge = 12;
              if (monthsToCharge < 1) monthsToCharge = 1;
            }
          }
          
          lineTotal = monthlyRate * monthsToCharge;
        } else {
          // Monthly rental: $10/month × 1 month (paying for upcoming month)
          // Always charge for 1 month, regardless of period dates
          lineTotal = monthlyRate * 1;
        }
        
        return {
          ...rental,
          monthlyRate: monthlyRate,
          lineTotal: lineTotal,
          daysHeld: daysHeld, // Actual days they've had the bottle (for RENT DAYS display)
          product_code: rental.product_code || rental.bottles?.product_code || rental.bottle?.product_code || rental.product_type || rental.bottles?.product_type || rental.bottle?.product_type
        };
      })
    };
  };

  const generatePDF = async (invoiceNumberOverride = null) => {
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
      // Use provided invoice number, existing invoice number, or generate a preview one
      const invoiceNumber = invoiceNumberOverride || existingInvoiceNumber || `W${String(Date.now()).slice(-6)}`;

      // Calculate total with hazmat fee if applicable
      const hazmatFee = invoiceTemplate.hazmat_fee || 0;
      const subtotalWithHazmat = invoiceData.subtotal + hazmatFee;
      const taxAmount = subtotalWithHazmat * invoiceData.taxRate;
      const totalWithHazmat = subtotalWithHazmat + taxAmount;

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
    doc.text(`$${totalWithHazmat.toFixed(2)}`, 155, 18);

    // Reset text color
    doc.setTextColor(0, 0, 0);
    
    let y = 35;

    // Load and add company logo if available
    const logoUrl = invoiceTemplate.logo_url || organization.logo_url;
    if (logoUrl) {
      try {
        // Load image and convert to base64 for jsPDF
        const response = await fetch(logoUrl);
        if (!response.ok) throw new Error('Failed to fetch logo');
        
        const blob = await response.blob();
        const reader = new FileReader();
        
        const imageData = await new Promise((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        
        // Create image element to get dimensions
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = imageData;
        });
        
        // Add logo to PDF (max width 50mm, maintain aspect ratio)
        const maxWidth = 50;
        const maxHeight = 25;
        let logoWidth = img.width;
        let logoHeight = img.height;
        const aspectRatio = logoWidth / logoHeight;
        
        // Convert pixels to mm (assuming 96 DPI: 1mm = 3.779527559 pixels)
        const pxToMm = 0.264583;
        logoWidth = logoWidth * pxToMm;
        logoHeight = logoHeight * pxToMm;
        
        if (logoWidth > maxWidth) {
          logoWidth = maxWidth;
          logoHeight = logoWidth / aspectRatio;
        }
        if (logoHeight > maxHeight) {
          logoHeight = maxHeight;
          logoWidth = logoHeight * aspectRatio;
        }
        
        // Determine image format from data URL
        let format = 'PNG';
        if (imageData.startsWith('data:image/jpeg') || imageData.startsWith('data:image/jpg')) {
          format = 'JPEG';
        } else if (imageData.startsWith('data:image/png')) {
          format = 'PNG';
        }
        
        // Add logo at top left (before company name)
        doc.addImage(imageData, format, 15, y, logoWidth, logoHeight);
        y += logoHeight + 5; // Add spacing after logo
      } catch (logoError) {
        logger.warn('Could not load logo, continuing without it:', logoError);
        // Continue without logo
      }
    }

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

    // Use the isYearlyRental from invoiceData (already calculated correctly)
    const isYearlyRental = invoiceData.isYearlyRental;

    // Rental Period Table
    if (invoiceTemplate.show_rental_period) {
      // Build header based on template settings
      // Use the calculated billing period dates (for both monthly and yearly)
      const displayPeriodStart = invoiceData.billingPeriodStart 
        ? (invoiceData.billingPeriodStart instanceof Date 
            ? invoiceData.billingPeriodStart.toISOString().split('T')[0]
            : invoiceData.billingPeriodStart)
        : formData.period_start;
      const displayPeriodEnd = invoiceData.billingPeriodEnd
        ? (invoiceData.billingPeriodEnd instanceof Date
            ? invoiceData.billingPeriodEnd.toISOString().split('T')[0]
            : invoiceData.billingPeriodEnd)
        : formData.period_end;
      
      const periodHeaders = ['RENTAL PERIOD', 'BILL TO ACCT #', 'SHIP TO ACCT #'];
      const periodValues = [
        `${formatDate(displayPeriodStart)} - ${formatDate(displayPeriodEnd)}`,
        customer.CustomerListID || '',
        customer.CustomerListID || ''
      ];
      
      // Add TERRITORY if enabled
      if (invoiceTemplate.show_territory) {
        periodHeaders.push('TERRITORY');
        periodValues.push(formData.territory || '');
      }
      
      // Add TERMS
      periodHeaders.push('TERMS');
      periodValues.push(invoiceTemplate.payment_terms);
      
      // Add DUE DATE
      periodHeaders.push('DUE DATE');
      periodValues.push(formatDate(new Date(new Date(formData.invoice_date).getTime() + 30 * 24 * 60 * 60 * 1000)));
      
      // Add PURCHASE ORDER if enabled
      if (invoiceTemplate.show_purchase_order) {
        periodHeaders.push('PURCHASE ORDER');
        periodValues.push(formData.purchase_order || '');
      }
      
      autoTable(doc, {
        startY: y,
        head: [periodHeaders],
        body: [periodValues],
        theme: 'plain',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
      });

      y = doc.lastAutoTable.finalY + 10;
    }

    // LEASE SUMMARY section for yearly rentals (12 months)
    if (isYearlyRental) {
      // Generate lease number from invoice number (e.g., R43405 -> L001069 format)
      // For now, use a simple format: L + last 6 digits of invoice number
      const leaseNumber = invoiceNumber.replace(/[^0-9]/g, '').slice(-6);
      const formattedLeaseNumber = `L${leaseNumber.padStart(6, '0')}`;
      
      // Calculate rate per cylinder (total rental amount / number of cylinders)
      const ratePerCylinder = invoiceData.subtotal / invoiceData.numBottles;
      
      // LEASE SUMMARY table - use proper table structure
      autoTable(doc, {
        startY: y,
        head: [['LEASE SUMMARY']],
        body: [],
        theme: 'plain',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        styles: { fontSize: 10 }
      });
      
      y = doc.lastAutoTable.finalY + 5;
      
      // LEASE SUMMARY details table
      autoTable(doc, {
        startY: y,
        head: [['TYPE', 'NUMBER', 'DATE', 'DURATION', 'ASSETS', 'RATE', 'TOTAL']],
        body: [[
          'Lease',
          formattedLeaseNumber,
          formatDate(formData.invoice_date),
          `${invoiceData.rentalMonths} Months`, // Show actual months being charged (remaining or full year)
          `${invoiceData.numBottles} Industrial Cylinder${invoiceData.numBottles !== 1 ? 's' : ''}`,
          `$${ratePerCylinder.toFixed(2)}`,
          `$${invoiceData.subtotal.toFixed(2)}`
        ]],
        theme: 'plain',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        styles: { fontSize: 10 }
      });

      y = doc.lastAutoTable.finalY + 10;
    }

    // Rental Summary Table (only show if not yearly rental, or if template requires it)
    if (invoiceTemplate.show_rental_summary && !isYearlyRental) {
      // Group rentals by product type/description
      const groupedRentals = {};
      invoiceData.rentals.forEach(rental => {
        // Create a key for grouping - use product description
        const productKey = rental.product_code || rental.product_type || rental.description || rental.gas_type || rental.size || 'Cylinder';
        
        // Format description to match example: "Industrial Cylinders // INDUSTRIAL CYLINDERS :: GAS_TYPE :: SIZE"
        let fullDescription = '';
        if (rental.product_code) {
          // If we have a product code, use it as the first part
          fullDescription = rental.product_code;
        } else {
          // Otherwise use product type or description
          fullDescription = rental.product_type || rental.description || 'Industrial Cylinders';
        }
        
        // Add the full description part
        const gasType = rental.gas_type || '';
        const size = rental.size || '';
        if (gasType || size) {
          const typePart = rental.product_type || 'INDUSTRIAL CYLINDERS';
          const parts = [typePart, gasType, size].filter(Boolean);
          fullDescription += ` // ${parts.join(' :: ')}`;
        }
        
        if (!groupedRentals[productKey]) {
          groupedRentals[productKey] = {
            description: fullDescription,
            startCount: 0,
            ship: 0,
            return: 0,
            endCount: 0,
            rate: invoiceData.monthlyRate,
            total: 0,
            maxDaysHeld: 0 // Track the maximum days held for this product group
          };
        }
        
        // Aggregate counts (for now, assume 1 per rental, but could be enhanced)
        groupedRentals[productKey].startCount += 1;
        groupedRentals[productKey].endCount += 1;
        groupedRentals[productKey].total += rental.lineTotal;
        // Track maximum days held (for display in RENT DAYS column)
        if (rental.daysHeld > groupedRentals[productKey].maxDaysHeld) {
          groupedRentals[productKey].maxDaysHeld = rental.daysHeld;
        }
      });
      
      // Convert grouped rentals to table rows
      const rentalsData = Object.values(groupedRentals).map(group => [
        group.description,
        group.startCount,
        group.ship,
        group.return,
        group.endCount,
        group.maxDaysHeld, // RENT DAYS - actual number of days they've had the bottle (informational only)
        `$${group.rate.toFixed(3)}`, // RENT RATE per month with 3 decimal places (e.g., $10.000/month)
        `$${group.total.toFixed(2)}` // TOTAL - based on billing period months, not days
      ]);

      autoTable(doc, {
        startY: y,
        head: [['ITEM', 'START COUNT', 'SHIP', 'RTN', 'END COUNT', 'RENT DAYS', 'RENT RATE', 'TOTAL']],
        body: rentalsData,
        theme: 'plain',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
      });

      y = doc.lastAutoTable.finalY + 10;
    }

    // Financial Summary
    const summaryX = 140;
    doc.setFontSize(10);
    
    // Show subtotal (rental amount)
    doc.text('Subtotal:', summaryX, y);
    doc.text(`$${invoiceData.subtotal.toFixed(2)}`, 180, y, { align: 'right' });
    y += 7;
    
    // Show hazmat fee if applicable (hazmatFee, subtotalWithHazmat, taxAmount, and totalWithHazmat are calculated at the top)
    if (hazmatFee > 0) {
      doc.text('Regulatory compliance hazmat fee:', summaryX, y);
      doc.text(`$${hazmatFee.toFixed(2)}`, 180, y, { align: 'right' });
      y += 7;
      doc.text('Subtotal:', summaryX, y);
      doc.text(`$${subtotalWithHazmat.toFixed(2)}`, 180, y, { align: 'right' });
      y += 7;
    }
    
    doc.text('Tax:', summaryX, y);
    doc.text(`$${taxAmount.toFixed(2)}`, 180, y, { align: 'right' });
    y += 7;

    // Amount Due - Black bar
    doc.setFillColor(invoiceTemplate.primary_color);
    doc.rect(summaryX - 5, y - 5, 55, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.text('AMOUNT DUE', summaryX, y);
    doc.text(`$${totalWithHazmat.toFixed(2)}`, 180, y, { align: 'right' });
    
    // Reset
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    y += 15;

    // Serialized Asset Balance Table
    if (invoiceTemplate.show_serialized_assets && rentals.length > 0) {
      const assetsData = invoiceData.rentals.map(rental => {
        // Format asset type to match example: "INDUSTRIAL CYLINDERS: OXYGEN: BOX300"
        const productCode = rental.product_code || rental.product_type || '';
        const gasType = rental.gas_type || '';
        const size = rental.size || '';
        
        // Build asset type description
        let assetType = 'INDUSTRIAL CYLINDERS';
        if (gasType) {
          assetType += `: ${gasType.toUpperCase()}`;
        }
        if (size || productCode) {
          assetType += `: ${(size || productCode).toUpperCase()}`;
        }
        if (!gasType && !size && !productCode) {
          assetType = 'Industrial Cylinders';
        }
        
        return [
          'Industrial Cylinders',
          assetType,
          formatDate(rental.rental_start_date || rental.bottles?.delivery_date || formData.period_start),
          rental.daysHeld || 0, // Use days_at_location from the rental object
          rental.bottle_barcode || rental.barcode_number || rental.bottles?.barcode_number || '',
          rental.serial_number || rental.bottles?.serial_number || ''
        ];
      });

      autoTable(doc, {
        startY: y,
        head: [['RENTAL CLASS', 'ASSET TYPE', 'DELIVERED', 'DAYS HELD', 'BARCODE', 'SERIAL NUMBER']],
        body: assetsData,
        theme: 'plain',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        styles: { fontSize: 8 },
        columnStyles: {
          1: { cellWidth: 60 } // Asset Type column wider for full descriptions
        }
      });

      y = doc.lastAutoTable.finalY + 10;
    }

    // TRANSACTIONS Table (for monthly rentals)
    if (!isYearlyRental && invoiceTemplate.show_transactions) {
      // Try to get transaction data from rentals (shipments/returns during period)
      // This would ideally come from bottle_scans or order data
      const transactions = [];
      
      // For now, we'll check if rentals have order_number or scan data
      // In a real implementation, you'd query bottle_scans for the period
      rentals.forEach(rental => {
        if (rental.order_number || rental.shipment_date) {
          const transactionDate = rental.shipment_date || rental.rental_start_date || formData.period_start;
          const orderNum = rental.order_number || '';
          const productDesc = rental.product_code 
            ? `${rental.product_type || 'Industrial Cylinders'} // ${rental.product_type || 'INDUSTRIAL CYLINDERS'} :: ${rental.gas_type || ''} :: ${rental.size || ''}`.replace(/::\s*::/g, '::').replace(/^\s*::|::\s*$/g, '').trim()
            : (rental.product_type || rental.description || 'Industrial Cylinders');
          
          // Check if there are shipments (SHIP > 0) or returns (RETURN > 0)
          const shipQty = rental.ship_qty || 0;
          const returnQty = rental.return_qty || 0;
          
          if (shipQty > 0 || returnQty > 0) {
            transactions.push([
              formatDate(transactionDate),
              orderNum,
              productDesc,
              shipQty > 0 ? shipQty : 0,
              returnQty > 0 ? returnQty : 0
            ]);
          }
        }
      });
      
      // Only show transactions table if there are transactions
      if (transactions.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [['TRANSACTIONS']],
          body: [['DATE', 'ORDER', 'TYPE', 'SHIP', 'RETURN']],
          theme: 'plain',
          headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
          bodyStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        });
        
        y = doc.lastAutoTable.finalY;
        
        autoTable(doc, {
          startY: y,
          body: transactions,
          theme: 'plain',
          headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
          styles: { fontSize: 8 }
        });
        
        y = doc.lastAutoTable.finalY + 10;
      }
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

  const handleDownload = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      // Generate sequential invoice number (same logic as handleEmailInvoice)
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
          // Check what the highest invoice number is in the database to set next_invoice_number correctly
          const { data: maxInvoice } = await supabase
            .from('invoices')
            .select('invoice_number')
            .eq('organization_id', organization.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          let startingNumber = 1;
          if (maxInvoice?.invoice_number) {
            // Extract number from existing invoice (e.g., "W00001" -> 1, "W343651" -> 343651)
            const match = maxInvoice.invoice_number.match(/\d+$/);
            if (match) {
              startingNumber = parseInt(match[0], 10) + 1;
            }
          }
          
          const { data: newSettings, error: createError } = await supabase
            .from('invoice_settings')
            .insert({
              organization_id: organization.id,
              invoice_prefix: 'W',
              next_invoice_number: startingNumber
            })
            .select()
            .single();
          
          if (!createError && newSettings) {
            invoiceSettings = newSettings;
            settingsError = null;
          }
        } else if (settingsError) {
          // If there's an error other than "not found", try to get the max invoice number
          const { data: maxInvoice } = await supabase
            .from('invoices')
            .select('invoice_number')
            .eq('organization_id', organization.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          let startingNumber = 1;
          if (maxInvoice?.invoice_number) {
            const match = maxInvoice.invoice_number.match(/\d+$/);
            if (match) {
              startingNumber = parseInt(match[0], 10) + 1;
            }
          }
          
          // Try to create settings again
          const { data: newSettings, error: createError } = await supabase
            .from('invoice_settings')
            .insert({
              organization_id: organization.id,
              invoice_prefix: 'W',
              next_invoice_number: startingNumber
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
          let nextNumber = invoiceSettings.next_invoice_number || 1;
          
          // Ensure next_invoice_number is at least as high as the highest existing invoice
          // This fixes cases where next_invoice_number was set incorrectly
          const { data: maxInvoice } = await supabase
            .from('invoices')
            .select('invoice_number')
            .eq('organization_id', organization.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          if (maxInvoice?.invoice_number) {
            // Extract number from existing invoice (e.g., "W00001" -> 1, "W343651" -> 343651)
            const match = maxInvoice.invoice_number.match(/\d+$/);
            if (match) {
              const maxNumber = parseInt(match[0], 10);
              // If next_invoice_number is less than max, update it
              if (nextNumber <= maxNumber) {
                nextNumber = maxNumber + 1;
                // Update the settings to fix the sequence
                await supabase
                  .from('invoice_settings')
                  .update({ next_invoice_number: nextNumber })
                  .eq('organization_id', organization.id);
                logger.log(`Fixed next_invoice_number to ${nextNumber} (was ${invoiceSettings.next_invoice_number})`);
              }
            }
          }
          
          // Ensure we have a valid number (if it's null or 0, start from 1)
          const validNumber = nextNumber > 0 ? nextNumber : 1;
          
          // Format: W00001, W00002, etc. (5 digits)
          invoiceNumber = `${prefix}${String(validNumber).padStart(5, '0')}`;
          
          logger.log(`Generated invoice number for download: ${invoiceNumber} (next number was: ${validNumber})`);
          
          // Increment the next invoice number BEFORE generating PDF
          const { error: updateError } = await supabase
            .from('invoice_settings')
            .update({ next_invoice_number: validNumber + 1 })
            .eq('organization_id', organization.id);
          
          if (updateError) {
            logger.error('Failed to increment invoice number:', updateError);
            // Don't throw - we'll still use the number, but log the error
          }
        } else {
          // Fallback: use timestamp-based number (shouldn't happen if settings work)
          logger.warn('Could not get/create invoice settings, using fallback');
          invoiceNumber = `W${String(Date.now()).slice(-6)}`;
        }
      } catch (error) {
        logger.error('Error getting invoice settings:', error);
        // Fallback: use timestamp-based number
        invoiceNumber = `W${String(Date.now()).slice(-6)}`;
      }

      // Generate PDF with the sequential invoice number
      const doc = await generatePDF(invoiceNumber);
      if (doc) {
        doc.save(`Invoice_${customer.CustomerListID}_${formData.invoice_date}.pdf`);
        setSuccess('Invoice downloaded successfully!');
      }
      setLoading(false);
    } catch (error) {
      logger.error('Error generating PDF:', error);
      setError('Failed to generate PDF: ' + error.message);
      setLoading(false);
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
      
      // Generate invoice number using invoice_settings - always sequential
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
          // Check what the highest invoice number is in the database to set next_invoice_number correctly
          const { data: maxInvoice } = await supabase
            .from('invoices')
            .select('invoice_number')
            .eq('organization_id', organization.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          let startingNumber = 1;
          if (maxInvoice?.invoice_number) {
            // Extract number from existing invoice (e.g., "W00001" -> 1, "W343651" -> 343651)
            const match = maxInvoice.invoice_number.match(/\d+$/);
            if (match) {
              startingNumber = parseInt(match[0], 10) + 1;
            }
          }
          
          const { data: newSettings, error: createError } = await supabase
            .from('invoice_settings')
            .insert({
              organization_id: organization.id,
              invoice_prefix: 'W',
              next_invoice_number: startingNumber
            })
            .select()
            .single();
          
          if (!createError && newSettings) {
            invoiceSettings = newSettings;
            settingsError = null;
          }
        } else if (settingsError) {
          // If there's an error other than "not found", try to get the max invoice number
          const { data: maxInvoice } = await supabase
            .from('invoices')
            .select('invoice_number')
            .eq('organization_id', organization.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          let startingNumber = 1;
          if (maxInvoice?.invoice_number) {
            const match = maxInvoice.invoice_number.match(/\d+$/);
            if (match) {
              startingNumber = parseInt(match[0], 10) + 1;
            }
          }
          
          // Try to create settings again
          const { data: newSettings, error: createError } = await supabase
            .from('invoice_settings')
            .insert({
              organization_id: organization.id,
              invoice_prefix: 'W',
              next_invoice_number: startingNumber
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
          let nextNumber = invoiceSettings.next_invoice_number || 1;
          
          // Ensure next_invoice_number is at least as high as the highest existing invoice
          // This fixes cases where next_invoice_number was set incorrectly
          const { data: maxInvoice } = await supabase
            .from('invoices')
            .select('invoice_number')
            .eq('organization_id', organization.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          if (maxInvoice?.invoice_number) {
            // Extract number from existing invoice (e.g., "W00001" -> 1, "W343651" -> 343651)
            const match = maxInvoice.invoice_number.match(/\d+$/);
            if (match) {
              const maxNumber = parseInt(match[0], 10);
              // If next_invoice_number is less than max, update it
              if (nextNumber <= maxNumber) {
                nextNumber = maxNumber + 1;
                // Update the settings to fix the sequence
                await supabase
                  .from('invoice_settings')
                  .update({ next_invoice_number: nextNumber })
                  .eq('organization_id', organization.id);
                logger.log(`Fixed next_invoice_number to ${nextNumber} (was ${invoiceSettings.next_invoice_number})`);
              }
            }
          }
          
          // Ensure we have a valid number (if it's null or 0, start from 1)
          const validNumber = nextNumber > 0 ? nextNumber : 1;
          
          // Format: W00001, W00002, etc. (5 digits)
          invoiceNumber = `${prefix}${String(validNumber).padStart(5, '0')}`;
          
          logger.log(`Generated invoice number: ${invoiceNumber} (next number was: ${validNumber})`);
          
          // Increment the next invoice number BEFORE saving invoice
          const { error: updateError } = await supabase
            .from('invoice_settings')
            .update({ next_invoice_number: validNumber + 1 })
            .eq('organization_id', organization.id);
          
          if (updateError) {
            logger.error('Failed to increment invoice number:', updateError);
            // Don't throw - we'll still use the number, but log the error
          }
        } else {
          // Fallback: use timestamp-based number (shouldn't happen if settings work)
          logger.warn('Could not get/create invoice settings, using fallback');
          invoiceNumber = `W${String(Date.now()).slice(-6)}`;
        }
      } catch (error) {
        logger.error('Error getting invoice settings:', error);
        // Fallback: use timestamp-based number
        invoiceNumber = `W${String(Date.now()).slice(-6)}`;
      }

      // Generate PDF with the actual invoice number (now async for logo loading)
      const doc = await generatePDF(invoiceNumber);
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

      // Check if invoice with this number already exists (to avoid duplicates)
      const { data: existingInvoiceRecord } = await supabase
        .from('invoices')
        .select('id, invoice_number')
        .eq('organization_id', organization.id)
        .eq('invoice_number', invoiceNumber)
        .single();
      
      let invoiceRecord;
      if (existingInvoiceRecord) {
        // Update existing invoice (in case of re-generation)
        logger.log(`Updating existing invoice ${invoiceNumber}...`);
        const { data: updatedRecord, error: updateError } = await supabase
          .from('invoices')
          .update({
            customer_id: customer.CustomerListID,
            customer_name: customer.name,
            customer_email: formData.email,
            invoice_date: formData.invoice_date,
            period_start: formData.period_start,
            period_end: formData.period_end,
            subtotal: invoiceData.subtotal,
            tax_amount: invoiceData.taxAmount,
            total_amount: invoiceData.total,
            rental_days: invoiceData.rentalDays,
            cylinders_count: rentals.length,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingInvoiceRecord.id)
          .select()
          .single();
        
        if (updateError) {
          logger.error('Error updating invoice:', updateError);
          throw new Error('Failed to update invoice: ' + updateError.message);
        }
        invoiceRecord = updatedRecord;
      } else {
        // Insert new invoice
        const { data: newRecord, error: invoiceError } = await supabase
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
        invoiceRecord = newRecord;
      }

      // Store the invoice number for use in email and success messages
      const savedInvoiceNumber = invoiceNumber;

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
      
      const pdfFileName = `Invoice_${savedInvoiceNumber}_${formData.invoice_date}.pdf`;

      // Upload PDF to Supabase Storage
      let pdfUrl = null;
      try {
        const pdfBlob = doc.output('blob');
        if (!pdfBlob) {
          throw new Error('Failed to generate PDF blob');
        }
        
        const storagePath = `${organization.id}/${savedInvoiceNumber}.pdf`;
        
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
        
        // Get the current user's email from Supabase auth to ensure we always have it
        let senderEmail = user?.email || profile?.email || organization?.email;
        if (!senderEmail) {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          senderEmail = authUser?.email;
        }
        
        if (!senderEmail) {
          throw new Error('Unable to determine sender email. Please ensure you are logged in.');
        }
        
        // Log request details (without full PDF base64)
        // Estimate size: base64 is ~33% larger than binary, so length * 0.75 gives approximate binary size
        const estimatedSizeKB = pdfBase64 ? ((pdfBase64.length * 0.75) / 1024).toFixed(2) : 0;
        logger.log('Email request details:', {
          to: formData.email,
          from: senderEmail,
          subject: emailSubject,
          pdfBase64Length: pdfBase64?.length || 0,
          pdfEstimatedSizeKB: estimatedSizeKB,
          pdfFileName: pdfFileName,
          invoiceNumber: invoiceNumber
        });

        // Check if we're in local development
        const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isLocalDev) {
          logger.warn('Local development detected. Netlify functions require "netlify dev" to work locally.');
        }

        let emailResponse;
        try {
          emailResponse = await fetch('/.netlify/functions/send-invoice-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: formData.email,
            from: senderEmail, // Use logged-in user's email as sender
            subject: emailSubject,
            body: emailBody,
            pdfBase64: pdfBase64,
            pdfFileName: pdfFileName,
            invoiceNumber: invoiceNumber
          }),
          signal: controller.signal
          }).catch((fetchError) => {
            // Handle network errors, aborts, etc.
            logger.error('Fetch error:', fetchError);
            if (fetchError.name === 'AbortError') {
              throw new Error('Email request timed out after 60 seconds. The PDF might be too large or the email service is slow.');
            }
            throw new Error(`Network error while sending email: ${fetchError.message}. Please check your internet connection and try again.`);
          }).finally(() => clearTimeout(timeoutId));
        } catch (fetchError) {
          // Check if this is a local development issue
          if (isLocalDev && (fetchError.message.includes('Failed to fetch') || fetchError.message.includes('NetworkError'))) {
            throw new Error('Netlify functions are not available. To test email functionality locally, please run "netlify dev" instead of "npm run dev". Alternatively, deploy to Netlify to use email functionality in production.');
          }
          throw fetchError;
        }

        logger.log('Email response status:', emailResponse.status);
        logger.log('Email response statusText:', emailResponse.statusText);
        logger.log('Email response ok:', emailResponse.ok);
        logger.log('Email response headers:', Object.fromEntries(emailResponse.headers.entries()));
        
        // Check if response has content before parsing JSON
        let responseText;
        try {
          responseText = await emailResponse.text();
          logger.log('Email response text received, length:', responseText?.length || 0);
        } catch (textError) {
          logger.error('Failed to read email response text:', textError);
          logger.error('Response status:', emailResponse.status);
          logger.error('Response statusText:', emailResponse.statusText);
          throw new Error('Email service did not return a valid response. The service may be unavailable or timed out. Please check your email configuration in Netlify environment variables.');
        }
        
        // Log response preview (first 500 chars)
        if (responseText) {
          logger.log('Email response text (first 500 chars):', responseText.substring(0, 500));
        } else {
          logger.error('Email response text is null or undefined');
        }
        
        let emailResult;
        try {
          if (!responseText || responseText.trim() === '') {
            // Empty response usually means the function crashed or timed out
            logger.error('Empty response from email service. Status:', emailResponse.status);
            logger.error('Possible causes:');
            logger.error('1. Email service is not configured (missing SMTP2GO_USER, SMTP2GO_PASSWORD, etc.)');
            logger.error('2. Netlify function crashed or timed out');
            logger.error('3. Network error or CORS issue');
            logger.error('4. PDF file too large (exceeds 6MB limit)');
            throw new Error('Email service returned empty response. Please check: 1) Email configuration in Netlify (SMTP2GO_USER, SMTP2GO_PASSWORD, SMTP2GO_FROM), 2) Netlify function logs, 3) Network connectivity, 4) PDF file size.');
          }
          emailResult = JSON.parse(responseText);
          logger.log('Email response parsed successfully:', emailResult);
        } catch (parseError) {
          logger.error('Failed to parse email response JSON:', parseError);
          logger.error('Response status:', emailResponse.status);
          logger.error('Response text (first 1000 chars):', responseText?.substring(0, 1000));
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

        setSuccess(`Invoice ${savedInvoiceNumber} generated and emailed successfully to ${formData.email}!`);
        
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
        setError(`Invoice ${savedInvoiceNumber} saved successfully! However, email sending failed: ${errorMessage}. PDF downloaded for your records.`);
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
            
            {invoiceTemplate?.show_territory && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Territory"
                  value={formData.territory}
                  onChange={(e) => setFormData({ ...formData, territory: e.target.value })}
                />
              </Grid>
            )}
            
            {invoiceTemplate?.show_purchase_order && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Purchase Order"
                  value={formData.purchase_order}
                  onChange={(e) => setFormData({ ...formData, purchase_order: e.target.value })}
                />
              </Grid>
            )}
            
            {invoiceData && (
              <Grid item xs={12}>
                <Box sx={{ p: 2, backgroundColor: 'grey.100', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>Invoice Summary:</Typography>
                  <Typography variant="body2">Billing Period: {(() => {
                    // Use the calculated billing period dates (for both monthly and yearly)
                    if (invoiceData.billingPeriodStart && invoiceData.billingPeriodEnd) {
                      const startStr = invoiceData.billingPeriodStart instanceof Date 
                        ? invoiceData.billingPeriodStart.toISOString().split('T')[0]
                        : invoiceData.billingPeriodStart;
                      const endStr = invoiceData.billingPeriodEnd instanceof Date
                        ? invoiceData.billingPeriodEnd.toISOString().split('T')[0]
                        : invoiceData.billingPeriodEnd;
                      return `${formatDate(startStr)} - ${formatDate(endStr)}`;
                    }
                    // Fallback: use entered period dates
                    return `${formatDate(formData.period_start)} - ${formatDate(formData.period_end)}`;
                  })()} ({invoiceData.rentalMonths || 0} month{(invoiceData.rentalMonths || 0) !== 1 ? 's' : ''})</Typography>
                  <Typography variant="body2">Cylinders: {invoiceData.numBottles || 0} × ${(invoiceData.monthlyRate || 0).toFixed(2)}/month × {invoiceData.rentalMonths || 0} month{(invoiceData.rentalMonths || 0) !== 1 ? 's' : ''}</Typography>
                  <Typography variant="body2">Subtotal: ${(invoiceData.subtotal || 0).toFixed(2)}</Typography>
                  <Typography variant="body2">Tax ({((invoiceData.taxRate || 0) * 100).toFixed(0)}%): ${(invoiceData.taxAmount || 0).toFixed(2)}</Typography>
                  <Typography variant="body1" fontWeight="bold">Amount Due: ${(invoiceData.total || 0).toFixed(2)}</Typography>
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
