import logger from '../utils/logger';
/**
 * Notification Service for Support Tickets
 * Handles sending email notifications when support tickets are created
 */

const SITE_URL = import.meta.env.MODE === 'production' 
  ? 'https://www.scanified.com' 
  : 'http://localhost:5174';

/**
 * Send email notification for new support ticket
 * @param {Object} ticketData - The ticket data
 * @param {Object} userData - The user who created the ticket
 * @param {Object} organizationData - The organization data
 */
export const sendSupportTicketNotification = async (ticketData, userData, organizationData) => {
  try {
    logger.log('Sending support ticket notification:', {
      ticketId: ticketData.id,
      subject: ticketData.subject,
      userEmail: userData.email,
      organizationName: organizationData.name
    });

    // Get owner email from environment or use a default
    const ownerEmail = import.meta.env.VITE_OWNER_EMAIL || 'support@scanified.com';
    
    const response = await fetch('/.netlify/functions/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: ownerEmail,
        subject: `🔔 New Support Ticket: ${ticketData.subject}`,
        template: 'support_ticket',
        data: {
          ticketId: ticketData.id,
          subject: ticketData.subject,
          description: ticketData.description,
          priority: ticketData.priority,
          category: ticketData.category,
          status: ticketData.status,
          createdAt: ticketData.created_at,
          userEmail: userData.email,
          userName: userData.full_name || userData.email,
          organizationName: organizationData.name,
          organizationId: organizationData.id,
          ticketUrl: `${SITE_URL}/owner-portal/support?ticket=${ticketData.id}`,
          supportUrl: `${SITE_URL}/owner-portal/support`
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Email service error: ${errorData.error || 'Unknown error'}`);
    }

    const result = await response.json();
    logger.log('Support ticket notification sent successfully:', result);
    return result;

  } catch (error) {
    logger.error('Error sending support ticket notification:', error);
    throw error;
  }
};

/**
 * Send email notification for ticket reply
 * @param {Object} ticketData - The ticket data
 * @param {Object} replyData - The reply data
 * @param {Object} userData - The user who replied
 */
export const sendSupportTicketReplyNotification = async (ticketData, replyData, userData) => {
  try {
    logger.log('Sending support ticket reply notification:', {
      ticketId: ticketData.id,
      subject: ticketData.subject,
      userEmail: userData.email
    });

    // Get owner email from environment or use a default
    const ownerEmail = import.meta.env.VITE_OWNER_EMAIL || 'support@scanified.com';
    
    const response = await fetch('/.netlify/functions/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: ownerEmail,
        subject: `💬 Reply to Support Ticket: ${ticketData.subject}`,
        template: 'support_ticket_reply',
        data: {
          ticketId: ticketData.id,
          subject: ticketData.subject,
          replyMessage: replyData.message,
          replyCreatedAt: replyData.created_at,
          userEmail: userData.email,
          userName: userData.full_name || userData.email,
          ticketUrl: `${SITE_URL}/owner-portal/support?ticket=${ticketData.id}`,
          supportUrl: `${SITE_URL}/owner-portal/support`
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Email service error: ${errorData.error || 'Unknown error'}`);
    }

    const result = await response.json();
    logger.log('Support ticket reply notification sent successfully:', result);
    return result;

  } catch (error) {
    logger.error('Error sending support ticket reply notification:', error);
    throw error;
  }
};
