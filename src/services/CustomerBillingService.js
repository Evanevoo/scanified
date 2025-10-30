import logger from '../utils/logger';
import { supabase } from '../supabase/client';

/**
 * Customer Billing Service
 * Handles customer billing, invoices, and payment tracking
 */

export class CustomerBillingService {
  /**
   * Get customer's invoice history
   */
  static async getCustomerInvoices(customerId, organizationId, filters = {}) {
    try {
      let query = supabase
        .from('invoices')
        .select(`
          *,
          customers (name, email, phone)
        `)
        .eq('organization_id', organizationId);

      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.dateFrom) {
        query = query.gte('invoice_date', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte('invoice_date', filters.dateTo);
      }

      query = query.order('invoice_date', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      return data;

    } catch (error) {
      logger.error('Error fetching customer invoices:', error);
      throw error;
    }
  }

  /**
   * Get invoice details
   */
  static async getInvoiceDetails(invoiceId) {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customers (name, email, phone, address),
          organizations (name, address, phone, email, logo_url)
        `)
        .eq('id', invoiceId)
        .single();

      if (error) throw error;

      // Parse line items if stored as JSON
      if (typeof data.line_items === 'string') {
        data.line_items = JSON.parse(data.line_items);
      }

      return data;

    } catch (error) {
      logger.error('Error fetching invoice details:', error);
      throw error;
    }
  }

  /**
   * Get customer's payment history
   */
  static async getPaymentHistory(customerId, organizationId) {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          invoices (invoice_number, invoice_date, total_amount)
        `)
        .eq('customer_id', customerId)
        .eq('organization_id', organizationId)
        .order('payment_date', { ascending: false });

      if (error) throw error;

      return data;

    } catch (error) {
      logger.error('Error fetching payment history:', error);
      throw error;
    }
  }

  /**
   * Record a customer payment
   */
  static async recordPayment(paymentData) {
    try {
      const { data, error } = await supabase
        .from('payments')
        .insert({
          organization_id: paymentData.organizationId,
          customer_id: paymentData.customerId,
          invoice_id: paymentData.invoiceId,
          payment_date: paymentData.paymentDate || new Date().toISOString(),
          amount: paymentData.amount,
          payment_method: paymentData.paymentMethod,
          reference_number: paymentData.referenceNumber,
          notes: paymentData.notes
        })
        .select()
        .single();

      if (error) throw error;

      // Update invoice status if fully paid
      const invoice = await this.getInvoiceDetails(paymentData.invoiceId);
      const totalPaid = (invoice.amount_paid || 0) + paymentData.amount;

      await supabase
        .from('invoices')
        .update({
          amount_paid: totalPaid,
          status: totalPaid >= invoice.total_amount ? 'paid' : 'partial'
        })
        .eq('id', paymentData.invoiceId);

      logger.log('✅ Payment recorded successfully');
      return data;

    } catch (error) {
      logger.error('❌ Error recording payment:', error);
      throw error;
    }
  }

  /**
   * Get customer billing summary
   */
  static async getCustomerBillingSummary(customerId, organizationId) {
    try {
      // Get all invoices for this customer
      const invoices = await this.getCustomerInvoices(customerId, organizationId);

      const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
      const totalPaid = invoices.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0);
      const totalOutstanding = totalInvoiced - totalPaid;

      const paidInvoices = invoices.filter(inv => inv.status === 'paid').length;
      const pendingInvoices = invoices.filter(inv => inv.status === 'pending').length;
      const overdueInvoices = invoices.filter(inv => 
        inv.status !== 'paid' && 
        inv.due_date && 
        new Date(inv.due_date) < new Date()
      ).length;

      return {
        totalInvoices: invoices.length,
        totalInvoiced,
        totalPaid,
        totalOutstanding,
        paidInvoices,
        pendingInvoices,
        overdueInvoices,
        recentInvoices: invoices.slice(0, 5)
      };

    } catch (error) {
      logger.error('Error fetching billing summary:', error);
      return {
        totalInvoices: 0,
        totalInvoiced: 0,
        totalPaid: 0,
        totalOutstanding: 0,
        paidInvoices: 0,
        pendingInvoices: 0,
        overdueInvoices: 0,
        recentInvoices: []
      };
    }
  }

  /**
   * Generate invoice PDF (placeholder for actual PDF generation)
   */
  static async generateInvoicePDF(invoiceId) {
    try {
      const invoice = await this.getInvoiceDetails(invoiceId);

      // This is a placeholder. In production, you would:
      // 1. Use a PDF generation library like jsPDF or PDFKit
      // 2. Or call a serverless function to generate the PDF
      // 3. Or use a third-party service like DocRaptor, PDF.co, etc.

      logger.log('📄 Generating PDF for invoice:', invoice.invoice_number);

      // For now, return the invoice data
      return {
        success: true,
        message: 'PDF generation feature coming soon',
        invoice
      };

    } catch (error) {
      logger.error('Error generating invoice PDF:', error);
      throw error;
    }
  }

  /**
   * Send invoice reminder email
   */
  static async sendInvoiceReminder(invoiceId) {
    try {
      const invoice = await this.getInvoiceDetails(invoiceId);

      // This would integrate with your email service
      logger.log('📧 Sending invoice reminder for:', invoice.invoice_number);

      // Create a notification record
      await supabase
        .from('notifications')
        .insert({
          organization_id: invoice.organization_id,
          user_id: invoice.customer_id,
          type: 'invoice_reminder',
          title: 'Invoice Payment Reminder',
          message: `Your invoice ${invoice.invoice_number} is due. Amount: $${invoice.total_amount}`,
          data: {
            invoice_id: invoiceId,
            invoice_number: invoice.invoice_number,
            amount: invoice.total_amount
          },
          is_read: false
        });

      logger.log('✅ Invoice reminder sent');
      return { success: true };

    } catch (error) {
      logger.error('Error sending invoice reminder:', error);
      throw error;
    }
  }

  /**
   * Get customer's account statement
   */
  static async getAccountStatement(customerId, organizationId, dateFrom, dateTo) {
    try {
      const invoices = await this.getCustomerInvoices(customerId, organizationId, {
        dateFrom,
        dateTo
      });

      const payments = await this.getPaymentHistory(customerId, organizationId);

      // Combine and sort by date
      const transactions = [
        ...invoices.map(inv => ({
          date: inv.invoice_date,
          type: 'invoice',
          description: `Invoice ${inv.invoice_number}`,
          amount: inv.total_amount,
          reference: inv.invoice_number,
          status: inv.status
        })),
        ...payments.map(pay => ({
          date: pay.payment_date,
          type: 'payment',
          description: `Payment ${pay.reference_number}`,
          amount: -pay.amount,
          reference: pay.reference_number,
          status: 'completed'
        }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date));

      // Calculate running balance
      let balance = 0;
      transactions.forEach(txn => {
        balance += txn.amount;
        txn.balance = balance;
      });

      return {
        transactions,
        currentBalance: balance,
        period: { from: dateFrom, to: dateTo }
      };

    } catch (error) {
      logger.error('Error generating account statement:', error);
      throw error;
    }
  }

  /**
   * Request payment plan for an invoice
   */
  static async requestPaymentPlan(invoiceId, proposedPlan) {
    try {
      const { data, error } = await supabase
        .from('payment_plans')
        .insert({
          invoice_id: invoiceId,
          total_amount: proposedPlan.totalAmount,
          installments: proposedPlan.installments,
          frequency: proposedPlan.frequency,
          start_date: proposedPlan.startDate,
          status: 'pending_approval',
          requested_at: new Date().toISOString(),
          notes: proposedPlan.notes
        })
        .select()
        .single();

      if (error) throw error;

      logger.log('✅ Payment plan requested');
      return data;

    } catch (error) {
      logger.error('Error requesting payment plan:', error);
      throw error;
    }
  }

  /**
   * Get customer's active payment plans
   */
  static async getPaymentPlans(customerId, organizationId) {
    try {
      const { data, error } = await supabase
        .from('payment_plans')
        .select(`
          *,
          invoices (invoice_number, total_amount, customer_id)
        `)
        .eq('invoices.customer_id', customerId)
        .in('status', ['active', 'pending_approval'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data;

    } catch (error) {
      logger.error('Error fetching payment plans:', error);
      throw error;
    }
  }
}

export default CustomerBillingService;

