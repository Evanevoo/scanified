import logger from '../utils/logger';
import { supabase } from '../supabase/client';

export class LeaseBillingService {
  
  /**
   * Process billing for all due lease agreements
   */
  static async processDueBilling() {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get all agreements due for billing
      const { data: dueAgreements, error } = await supabase
        .from('lease_agreements')
        .select('*')
        .eq('status', 'active')
        .lte('next_billing_date', today);

      if (error) throw error;

      const results = [];
      
      for (const agreement of dueAgreements) {
        try {
          const billingResult = await this.createBillingRecord(agreement);
          results.push({ success: true, agreement: agreement.agreement_number, ...billingResult });
        } catch (error) {
          results.push({ success: false, agreement: agreement.agreement_number, error: error.message });
        }
      }

      return results;
    } catch (error) {
      logger.error('Error processing due billing:', error);
      throw error;
    }
  }

  /**
   * Create a billing record for a specific agreement
   */
  static async createBillingRecord(agreement) {
    try {
      // Calculate billing period
      const billingPeriod = this.calculateBillingPeriod(
        agreement.next_billing_date,
        agreement.billing_frequency
      );

      // Calculate amounts
      const subtotal = this.calculatePeriodAmount(
        agreement.annual_amount,
        agreement.billing_frequency
      );
      const taxAmount = subtotal * (agreement.tax_rate || 0);
      const totalAmount = subtotal + taxAmount;

      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber(agreement.organization_id);

      // Create billing record
      const billingRecord = {
        lease_agreement_id: agreement.id,
        organization_id: agreement.organization_id,
        billing_period_start: billingPeriod.start,
        billing_period_end: billingPeriod.end,
        billing_date: new Date().toISOString().split('T')[0],
        due_date: this.calculateDueDate(agreement.payment_terms),
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        payment_status: 'pending',
        invoice_number: invoiceNumber,
        invoice_sent_date: new Date().toISOString().split('T')[0]
      };

      const { data: billing, error: billingError } = await supabase
        .from('lease_billing_history')
        .insert([billingRecord])
        .select()
        .single();

      if (billingError) throw billingError;

      // Update agreement's next billing date
      const nextBillingDate = this.calculateNextBillingDate(
        agreement.next_billing_date,
        agreement.billing_frequency
      );

      const { error: updateError } = await supabase
        .from('lease_agreements')
        .update({
          next_billing_date: nextBillingDate,
          last_billing_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', agreement.id);

      if (updateError) throw updateError;

      return {
        billingRecord: billing,
        nextBillingDate
      };
    } catch (error) {
      logger.error('Error creating billing record:', error);
      throw error;
    }
  }

  /**
   * Calculate billing period based on frequency
   */
  static calculateBillingPeriod(startDate, frequency) {
    const start = new Date(startDate);
    const end = new Date(start);

    switch (frequency) {
      case 'monthly':
        end.setMonth(end.getMonth() + 1);
        end.setDate(end.getDate() - 1);
        break;
      case 'quarterly':
        end.setMonth(end.getMonth() + 3);
        end.setDate(end.getDate() - 1);
        break;
      case 'semi-annual':
        end.setMonth(end.getMonth() + 6);
        end.setDate(end.getDate() - 1);
        break;
      case 'annual':
        end.setFullYear(end.getFullYear() + 1);
        end.setDate(end.getDate() - 1);
        break;
      default:
        end.setMonth(end.getMonth() + 1);
        end.setDate(end.getDate() - 1);
    }

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  }

  /**
   * Calculate the amount for a billing period
   */
  static calculatePeriodAmount(annualAmount, frequency) {
    const amount = parseFloat(annualAmount) || 0;
    
    switch (frequency) {
      case 'monthly':
        return amount / 12;
      case 'quarterly':
        return amount / 4;
      case 'semi-annual':
        return amount / 2;
      case 'annual':
        return amount;
      default:
        return amount / 12;
    }
  }

  /**
   * Calculate next billing date
   */
  static calculateNextBillingDate(currentDate, frequency) {
    const date = new Date(currentDate);
    
    switch (frequency) {
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'quarterly':
        date.setMonth(date.getMonth() + 3);
        break;
      case 'semi-annual':
        date.setMonth(date.getMonth() + 6);
        break;
      case 'annual':
        date.setFullYear(date.getFullYear() + 1);
        break;
      default:
        date.setMonth(date.getMonth() + 1);
    }

    return date.toISOString().split('T')[0];
  }

  /**
   * Calculate due date based on payment terms
   */
  static calculateDueDate(paymentTerms) {
    const today = new Date();
    let daysToAdd = 30; // Default to Net 30

    if (paymentTerms) {
      const match = paymentTerms.match(/Net (\d+)/i);
      if (match) {
        daysToAdd = parseInt(match[1]);
      }
    }

    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + daysToAdd);
    return dueDate.toISOString().split('T')[0];
  }

  /**
   * Generate invoice number
   */
  static async generateInvoiceNumber(organizationId) {
    try {
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      
      // Get the last invoice number for this organization and month
      const { data: lastInvoice, error } = await supabase
        .from('lease_billing_history')
        .select('invoice_number')
        .eq('organization_id', organizationId)
        .like('invoice_number', `INV-${year}${month}-%`)
        .order('invoice_number', { ascending: false })
        .limit(1);

      if (error) throw error;

      let nextNumber = 1;
      if (lastInvoice && lastInvoice.length > 0) {
        const lastNumber = parseInt(lastInvoice[0].invoice_number.split('-')[2]);
        nextNumber = lastNumber + 1;
      }

      return `INV-${year}${month}-${String(nextNumber).padStart(4, '0')}`;
    } catch (error) {
      logger.error('Error generating invoice number:', error);
      // Fallback to timestamp-based number
      return `INV-${Date.now()}`;
    }
  }

  /**
   * Mark a billing record as paid
   */
  static async markBillingAsPaid(billingId, paymentMethod, paymentReference) {
    try {
      const { data, error } = await supabase
        .from('lease_billing_history')
        .update({
          payment_status: 'paid',
          payment_date: new Date().toISOString().split('T')[0],
          payment_method,
          payment_reference
        })
        .eq('id', billingId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error marking billing as paid:', error);
      throw error;
    }
  }

  /**
   * Get overdue billing records
   */
  static async getOverdueBilling(organizationId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('lease_billing_history')
        .select(`
          *,
          lease_agreements (
            customer_name,
            agreement_number
          )
        `)
        .eq('organization_id', organizationId)
        .eq('payment_status', 'pending')
        .lt('due_date', today);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error getting overdue billing:', error);
      throw error;
    }
  }

  /**
   * Get billing summary for a date range
   */
  static async getBillingSummary(organizationId, startDate, endDate) {
    try {
      const { data, error } = await supabase
        .from('lease_billing_history')
        .select('*')
        .eq('organization_id', organizationId)
        .gte('billing_date', startDate)
        .lte('billing_date', endDate);

      if (error) throw error;

      const summary = {
        totalBilled: 0,
        totalPaid: 0,
        totalPending: 0,
        totalOverdue: 0,
        recordCount: data.length
      };

      const today = new Date().toISOString().split('T')[0];

      data.forEach(record => {
        summary.totalBilled += parseFloat(record.total_amount);
        
        if (record.payment_status === 'paid') {
          summary.totalPaid += parseFloat(record.total_amount);
        } else if (record.payment_status === 'pending') {
          if (record.due_date < today) {
            summary.totalOverdue += parseFloat(record.total_amount);
          } else {
            summary.totalPending += parseFloat(record.total_amount);
          }
        }
      });

      return summary;
    } catch (error) {
      logger.error('Error getting billing summary:', error);
      throw error;
    }
  }

  /**
   * Renew an expired agreement
   */
  static async renewAgreement(agreementId, newEndDate, newAnnualAmount) {
    try {
      const { data: agreement, error: fetchError } = await supabase
        .from('lease_agreements')
        .select('*')
        .eq('id', agreementId)
        .single();

      if (fetchError) throw fetchError;

      // Update the agreement
      const { data: updated, error: updateError } = await supabase
        .from('lease_agreements')
        .update({
          end_date: newEndDate,
          annual_amount: newAnnualAmount || agreement.annual_amount,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', agreementId)
        .select()
        .single();

      if (updateError) throw updateError;

      return updated;
    } catch (error) {
      logger.error('Error renewing agreement:', error);
      throw error;
    }
  }

  /**
   * Get agreements expiring soon
   */
  static async getExpiringSoon(organizationId, daysAhead = 30) {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);
      
      const { data, error } = await supabase
        .from('lease_agreements')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .lte('end_date', futureDate.toISOString().split('T')[0]);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error getting expiring agreements:', error);
      throw error;
    }
  }
}

export default LeaseBillingService; 