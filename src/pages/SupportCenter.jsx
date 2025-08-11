import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, Grid, Card, CardContent, CardActions,
  Chip, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem, Alert, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  LinearProgress, Divider, Accordion, AccordionSummary, AccordionDetails,
  List, ListItem, ListItemText, ListItemIcon, Switch, FormControlLabel,
  TextareaAutosize, Snackbar
} from '@mui/material';
import {
  Support as SupportIcon,
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Visibility as ViewIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  HourglassEmpty as PendingIcon,
  Refresh as RefreshIcon,
  Help as HelpIcon,
  Article as ArticleIcon,
  VideoLibrary as VideoIcon,
  Chat as ChatIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  ExpandMore as ExpandMoreIcon,
  Delete as DeleteIcon,
  Restore as RestoreIcon
} from '@mui/icons-material';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import { NotificationService } from '../services/notificationService';

export default function SupportCenter() {
  const { profile, organization } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [newTicketDialog, setNewTicketDialog] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketDialog, setTicketDialog] = useState(false);
  const [replyDialog, setReplyDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // New ticket form state
  const [newTicket, setNewTicket] = useState({
    subject: '',
    category: '',
    priority: 'medium',
    description: ''
  });

  // Reply form state
  const [replyMessage, setReplyMessage] = useState('');
  const [ticketMessages, setTicketMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchTickets();
    }
  }, [profile]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      if (!organization) {
        setTickets([]);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`*, profiles(email, full_name)`)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      setSnackbar({ open: true, message: 'Error loading tickets', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTicket = async () => {
    setLoading(true);
    try {
      if (!organization || !profile) throw new Error('Missing organization or profile');
      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          subject: newTicket.subject,
          status: 'open',
          category: newTicket.category,
          priority: newTicket.priority,
          description: newTicket.description,
          organization_id: organization.id,
          user_id: profile.id
        })
        .select()
        .single();
      if (error) throw error;
      setTickets(prev => [data, ...prev]);
      setNewTicketDialog(false);
      setNewTicket({ subject: '', category: '', priority: 'medium', description: '' });
      setSnackbar({ open: true, message: 'Ticket submitted successfully', severity: 'success' });
      
      // Notify owners of new ticket
      try {
        // Create notification for new support ticket
        await NotificationService.createNotification({
          organizationId: organization.id,
          type: 'support_ticket',
          title: `New Support Ticket: ${data.title}`,
          message: `A new support ticket has been created by ${profile.email}. Priority: ${data.priority}`,
          data: {
            ticket_id: data.id,
            customer_email: profile.email,
            priority: data.priority,
            action: 'new_ticket'
          },
          priority: data.priority === 'urgent' ? 'urgent' : 'high',
          actionUrl: `/owner-portal/support?ticket=${data.id}`,
          actionText: 'View Ticket'
        });
      } catch (error) {
        console.error('Error notifying owners:', error);
      }
    } catch (error) {
      console.error('Error submitting ticket:', error);
      setSnackbar({ open: true, message: 'Error submitting ticket', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async () => {
    if (!replyMessage.trim() || !selectedTicket) return;
    setLoading(true);
    try {
      if (!profile) throw new Error('Missing profile');
      const { error } = await supabase
        .from('support_ticket_messages')
        .insert({
          ticket_id: selectedTicket.id,
          sender: 'user',
          message: replyMessage,
          sender_email: profile.email
        });
      if (error) throw error;
      // Optionally update ticket status
      await supabase
        .from('support_tickets')
        .update({ status: 'pending', updated_at: new Date().toISOString() })
        .eq('id', selectedTicket.id);
      setReplyMessage('');
      setReplyDialog(false);
      setSnackbar({ open: true, message: 'Reply sent successfully', severity: 'success' });
      
      // Refresh messages if ticket dialog is open
      if (selectedTicket) {
        await fetchTicketMessages(selectedTicket.id);
      }
      fetchTickets();
    } catch (error) {
      console.error('Error sending reply:', error);
      setSnackbar({ open: true, message: 'Error sending reply', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleViewTicket = async (ticket) => {
    setSelectedTicket(ticket);
    setTicketDialog(true);
    await fetchTicketMessages(ticket.id);
  };

  const fetchTicketMessages = async (ticketId) => {
    setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('support_ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setTicketMessages(data || []);
    } catch (error) {
      console.error('Error fetching ticket messages:', error);
      setSnackbar({ open: true, message: 'Error loading messages', severity: 'error' });
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleDeleteTicket = (ticket) => {
    setTicketToDelete(ticket);
    setDeleteDialog(true);
  };

  const handleReopenTicket = async (ticketId) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ 
          status: 'open',
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId);

      if (error) throw error;

      setSnackbar({ open: true, message: 'Ticket reopened successfully', severity: 'success' });
      fetchTickets();
      
      // Update selected ticket if it's the current one
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket(prev => ({ ...prev, status: 'open' }));
      }
    } catch (error) {
      console.error('Error reopening ticket:', error);
      setSnackbar({ open: true, message: 'Error reopening ticket', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteTicket = async () => {
    setLoading(true);
    try {
      if (!ticketToDelete) return;
      const { error } = await supabase
        .from('support_tickets')
        .delete()
        .eq('id', ticketToDelete.id);
      if (error) throw error;
      setTickets(tickets.filter(ticket => ticket.id !== ticketToDelete.id));
      setDeleteDialog(false);
      setTicketToDelete(null);
      setSnackbar({ open: true, message: 'Ticket deleted successfully', severity: 'success' });
    } catch (error) {
      console.error('Error deleting ticket:', error);
      setSnackbar({ open: true, message: 'Error deleting ticket', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'error';
      case 'pending': return 'warning';
      case 'closed': return 'success';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open': return <ErrorIcon />;
      case 'pending': return <PendingIcon />;
      case 'closed': return <CheckCircleIcon />;
      default: return <ErrorIcon />;
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !selectedStatus || ticket.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight={800} color="primary" mb={3}>
        Support Center
      </Typography>

      {/* Header with actions */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6}>
            <Typography variant="h6" fontWeight={700}>
              Support Tickets
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Get help with your gas cylinder management system
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} sx={{ textAlign: 'right' }}>
            <Button
              onClick={() => setNewTicketDialog(true)}
              variant="contained"
              startIcon={<AddIcon />}
              sx={{ borderRadius: 2, fontWeight: 700 }}
            >
              New Ticket
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Search and filters */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                label="Status"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="open">Open</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="closed">Closed</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Button
              onClick={fetchTickets}
              startIcon={<RefreshIcon />}
              variant="outlined"
              fullWidth
            >
              Refresh
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Tickets list */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={2}>
          {filteredTickets.map((ticket) => (
            <Grid item xs={12} key={ticket.id}>
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={8}>
                      <Typography variant="h6" fontWeight={700} gutterBottom>
                        {ticket.subject}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                        <Chip
                          icon={getStatusIcon(ticket.status)}
                          label={ticket.status}
                          color={getStatusColor(ticket.status)}
                          size="small"
                        />
                        <Chip
                          label={ticket.priority}
                          color={getPriorityColor(ticket.priority)}
                          size="small"
                        />
                        <Chip
                          label={ticket.category}
                          variant="outlined"
                          size="small"
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Created: {ticket.created_at}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={4} sx={{ textAlign: 'right' }}>
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                        <Button
                          onClick={() => handleViewTicket(ticket)}
                          variant="outlined"
                          startIcon={<ViewIcon />}
                          size="small"
                        >
                          View Details
                        </Button>
                        {ticket.status === 'closed' && (
                          <Button
                            onClick={() => handleReopenTicket(ticket.id)}
                            variant="outlined"
                            color="primary"
                            startIcon={<RestoreIcon />}
                            size="small"
                          >
                            Reopen
                          </Button>
                        )}
                        <IconButton
                          onClick={() => handleDeleteTicket(ticket)}
                          color="error"
                          size="small"
                          title="Delete ticket"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* New Ticket Dialog */}
      <Dialog open={newTicketDialog} onClose={() => setNewTicketDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h6" fontWeight={700}>
            Create New Support Ticket
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Subject"
                value={newTicket.subject}
                onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={newTicket.category}
                  onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                  label="Category"
                >
                  <MenuItem value="technical">Technical Issue</MenuItem>
                  <MenuItem value="billing">Billing</MenuItem>
                  <MenuItem value="feature">Feature Request</MenuItem>
                  <MenuItem value="general">General</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={newTicket.priority}
                  onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                  label="Priority"
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={4}
                value={newTicket.description}
                onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewTicketDialog(false)}>Cancel</Button>
          <Button
            onClick={handleSubmitTicket}
            variant="contained"
            disabled={loading || !newTicket.subject || !newTicket.description}
          >
            {loading ? <CircularProgress size={20} /> : 'Submit Ticket'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Ticket Details Dialog */}
      <Dialog open={ticketDialog} onClose={() => setTicketDialog(false)} maxWidth="md" fullWidth>
        {selectedTicket && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    {selectedTicket.subject}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <Chip
                      icon={getStatusIcon(selectedTicket.status)}
                      label={selectedTicket.status}
                      color={getStatusColor(selectedTicket.status)}
                      size="small"
                    />
                    <Chip
                      label={selectedTicket.priority}
                      color={getPriorityColor(selectedTicket.priority)}
                      size="small"
                    />
                    <Chip
                      label={selectedTicket.category}
                      variant="outlined"
                      size="small"
                    />
                  </Box>
                </Box>
                {selectedTicket.status === 'closed' && (
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={() => handleReopenTicket(selectedTicket.id)}
                    disabled={loading}
                    startIcon={<RestoreIcon />}
                  >
                    Reopen
                  </Button>
                )}
              </Box>
            </DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Created: {selectedTicket.created_at} | Updated: {selectedTicket.updated_at}
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                Chat History
              </Typography>
              
              <Box sx={{ maxHeight: 400, overflow: 'auto', mb: 2 }}>
                {loadingMessages ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                    <CircularProgress />
                  </Box>
                ) : ticketMessages.length === 0 ? (
                  <Typography variant="body2" sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    {selectedTicket.description}
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {/* Original ticket description */}
                    <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                      <Typography variant="body2" fontWeight={500} color="text.secondary" sx={{ mb: 1 }}>
                        You - {new Date(selectedTicket.created_at).toLocaleString()}
                      </Typography>
                      <Typography variant="body2">
                        {selectedTicket.description}
                      </Typography>
                    </Box>
                    
                    {/* Chat messages */}
                    {ticketMessages.map((message) => (
                      <Box
                        key={message.id}
                        sx={{
                          p: 2,
                          bgcolor: message.sender === 'support' ? 'primary.50' : 'grey.50',
                          borderRadius: 1,
                          alignSelf: message.sender === 'support' ? 'flex-end' : 'flex-start',
                          maxWidth: '80%'
                        }}
                      >
                        <Typography variant="body2" fontWeight={500} color="text.secondary" sx={{ mb: 1 }}>
                          {message.sender === 'support' ? 'Support Team' : 'You'} - {new Date(message.created_at).toLocaleString()}
                        </Typography>
                        <Typography variant="body2">
                          {message.message}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setTicketDialog(false)}>Close</Button>
              {selectedTicket.status !== 'closed' && (
                <Button
                  onClick={() => {
                    setTicketDialog(false);
                    setReplyDialog(true);
                  }}
                  variant="contained"
                >
                  Reply
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Reply Dialog */}
      <Dialog open={replyDialog} onClose={() => setReplyDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h6" fontWeight={700}>
            Reply to Ticket
          </Typography>
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Your message"
            multiline
            rows={4}
            value={replyMessage}
            onChange={(e) => setReplyMessage(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReplyDialog(false)}>Cancel</Button>
          <Button
            onClick={handleReply}
            variant="contained"
            disabled={loading || !replyMessage.trim()}
          >
            {loading ? <CircularProgress size={20} /> : 'Send Reply'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h6" fontWeight={700} color="error">
            Delete Ticket
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mt: 1 }}>
            Are you sure you want to delete the ticket "{ticketToDelete?.subject}"?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
          <Button
            onClick={confirmDeleteTicket}
            variant="contained"
            color="error"
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Delete Ticket'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 