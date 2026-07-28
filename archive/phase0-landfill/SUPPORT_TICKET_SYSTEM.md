# Support Ticket System

## Overview

The Gas Cylinder App includes a comprehensive support ticket system that allows organizations to submit and track support requests, while owners can manage and respond to all tickets across organizations.

## How Organizations Submit Tickets

### 1. Access Support Center
- Organizations can access the Support Center from the main navigation sidebar
- Click on "Support Center" in the left menu
- This is available to all users (admin, user, manager, owner) within an organization

### 2. Submit New Ticket
- Click the "Submit New Ticket" button in the Support Center
- Fill out the ticket form with:
  - **Subject**: Brief description of the issue
  - **Category**: Choose from Technical Issue, Billing Question, Feature Request, Account Management, or General Inquiry
  - **Priority**: Low, Medium, or High
  - **Description**: Detailed explanation of the issue or question

### 3. Track Existing Tickets
- View all tickets submitted by your organization
- Filter by status (Open, Pending, Closed)
- Search through ticket subjects
- Click "View" to see ticket details and conversation history

### 4. Reply to Tickets
- For open or pending tickets, click "Reply" to add additional information
- All replies are tracked in the conversation history
- Support team responses will appear in the conversation

## Owner Portal Support Management

### 1. View All Tickets
- Owners can access the Support Tickets page in the Owner Portal
- See tickets from all organizations
- Filter by organization, status, or search terms

### 2. Respond to Tickets
- Click on any ticket to view details
- Use the "Reply" button to respond to organizations
- Update ticket status (Open → Pending → Closed)

### 3. Ticket Management Features
- **Status Updates**: Change ticket status to track progress
- **Organization Filtering**: View tickets by specific organization
- **Search**: Find tickets by subject, requester, or organization
- **Conversation History**: Full audit trail of all communications

## Database Schema

### Tables
- `support_tickets`: Main ticket information
- `support_ticket_messages`: Conversation history for each ticket

### Security
- Row Level Security (RLS) ensures organizations only see their own tickets
- Owners have access to all tickets across organizations
- Users can only create tickets for their organization

## Categories

1. **Technical Issue**: Problems with the application, bugs, errors
2. **Billing Question**: Questions about charges, invoices, payments
3. **Feature Request**: Suggestions for new features or improvements
4. **Account Management**: User access, permissions, organization settings
5. **General Inquiry**: Other questions or concerns

## Priority Levels

- **Low**: General questions, feature requests, non-urgent issues
- **Medium**: Important issues that need attention but aren't critical
- **High**: Critical issues affecting business operations

## Status Workflow

1. **Open**: New ticket submitted, awaiting initial response
2. **Pending**: Support team has responded, waiting for user follow-up
3. **Closed**: Issue resolved or ticket completed

## Contact Information

Organizations can also contact support through:
- Email: support@gascylinderapp.com
- Phone: 1-800-GAS-HELP
- Live Chat: Available in Support Center
- Documentation: User guides and tutorials

## Implementation Notes

- Currently using mock data for demonstration
- In production, tickets are stored in Supabase database
- Real-time notifications can be added for ticket updates
- File attachments can be added for screenshots and documents
- Email notifications can be sent for ticket updates

## Future Enhancements

- File attachment support
- Email notifications
- Ticket templates for common issues
- Knowledge base integration
- SLA tracking and escalation
- Ticket assignment to specific support agents
- Customer satisfaction surveys 