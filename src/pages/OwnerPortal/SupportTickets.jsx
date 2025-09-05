import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Alert, CircularProgress,
  Chip, IconButton, Tooltip, FormControl, InputLabel, Select, MenuItem, Grid, Card, CardContent,
  Divider, Snackbar, Badge
} from '@mui/material';
import {
  Support as SupportIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Visibility as ViewIcon,
  Reply as ReplyIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  HourglassEmpty as PendingIcon,
  Refresh as RefreshIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Restore as RestoreIcon
} from '@mui/icons-material';
import { supabase } from '../../supabase/client';
import { useAuth } from '../../hooks/useAuth';
import { useOwnerAccess } from '../../hooks/useOwnerAccess';
// import { NotificationService } from '../../services/notificationService'; // Removed

export default function SupportTickets() {
  const { profile } = useAuth();
  useOwnerAccess(profile); // Restrict access to owners

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketDialog, setTicketDialog] = useState(false);
  const [replyDialog, setReplyDialog] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [ticketMessages, setTicketMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      // Fetch tickets from the support_tickets table
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (ticketsError) throw ticketsError;

      // Fetch profiles for the user_ids
      const userIds = [...new Set(ticketsData?.map(ticket => ticket.user_id) || [])];
      let profilesData = [];
      
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds);
        
        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        } else {
          profilesData = profiles || [];
        }
      }

      // Fetch organizations for the organization_ids
      const organizationIds = [...new Set(ticketsData?.map(ticket => ticket.organization_id) || [])];
      let organizationsData = [];
      
      if (organizationIds.length > 0) {
        const { data: organizations, error: organizationsError } = await supabase
          .from('organizations')
          .select('id, name')
          .in('id', organizationIds);
        
        if (organizationsError) {
          console.error('Error fetching organizations:', organizationsError);
        } else {
          organizationsData = organizations || [];
        }
      }

      // Join tickets with profiles and organizations
      const ticketsWithData = (ticketsData || []).map(ticket => ({
        ...ticket,
        profiles: profilesData.find(profile => profile.id === ticket.user_id) || null,
        organizations: organizationsData.find(org => org.id === ticket.organization_id) || null
      }));

      setTickets(ticketsWithData);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      setSnackbar({ open: true, message: 'Error loading tickets', severity: 'error' });
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

  const handleReply = async () => {
    if (!replyMessage.trim() || !selectedTicket) return;
    
    setLoading(true);
    try {
      // Add reply to the ticket
      const { error } = await supabase
        .from('support_ticket_messages')
        .insert({
          ticket_id: selectedTicket.id,
          sender: 'support',
          message: replyMessage,
          sender_email: profile.email
        });

      if (error) throw error;

      // Update ticket status to pending
      await supabase
        .from('support_tickets')
        .update({ 
          status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedTicket.id);

      setReplyMessage('');
      setReplyDialog(false);
      setSnackbar({ open: true, message: 'Reply sent successfully', severity: 'success' });
      
      // Notify the ticket creator of the reply
      try {
        // Create notification for ticket reply (notification service removed)
        console.log(`Support ticket reply sent for: ${selectedTicket.title}`);
      } catch (error) {
        console.error('Error notifying user of reply:', error);
      }
      
      // Refresh messages if ticket dialog is open
      if (selectedTicket) {
        await fetchTicketMessages(selectedTicket.id);
      }
      
      // Refresh tickets
      fetchTickets();
    } catch (error) {
      console.error('Error sending reply:', error);
      setSnackbar({ open: true, message: 'Error sending reply', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (ticketId, newStatus) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId);

      if (error) throw error;

      setSnackbar({ open: true, message: 'Ticket status updated', severity: 'success' });
      fetchTickets();
      
      // Update selected ticket if it's the current one
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket(prev => ({ ...prev, status: newStatus }));
      }
    } catch (error) {
      console.error('Error updating ticket status:', error);
      setSnackbar({ open: true, message: 'Error updating ticket status', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseTicket = async (ticketId) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ 
          status: 'closed',
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId);

      if (error) throw error;

      setSnackbar({ open: true, message: 'Ticket closed successfully', severity: 'success' });
      fetchTickets();
      
      // Update selected ticket if it's the current one
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket(prev => ({ ...prev, status: 'closed' }));
      }
    } catch (error) {
      console.error('Error closing ticket:', error);
      setSnackbar({ open: true, message: 'Error closing ticket', severity: 'error' });
    } finally {
      setLoading(false);
    }
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

  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.organizations?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !selectedStatus || ticket.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  if (loading && tickets.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Support Tickets
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          View and manage support tickets from all organizations. You can reply to tickets, 
          update their status, and track customer inquiries.
        </Typography>
      </Alert>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Tickets
              </Typography>
              <Typography variant="h4" color="primary">
                {tickets.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Open Tickets
              </Typography>
              <Typography variant="h4" color="error">
                {tickets.filter(t => t.status === 'open').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Pending Tickets
              </Typography>
              <Typography variant="h4" color="warning">
                {tickets.filter(t => t.status === 'pending').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Closed Tickets
              </Typography>
              <Typography variant="h4" color="success">
                {tickets.filter(t => t.status === 'closed').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Search tickets"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                label="Status"
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="open">Open</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="closed">Closed</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
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

      {/* Tickets Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Organization</TableCell>
              <TableCell>Subject</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredTickets.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <BusinessIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2">
                      {ticket.organizations?.name || 'Unknown'}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {ticket.subject}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    by {ticket.profiles?.email || 'Unknown'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    icon={getStatusIcon(ticket.status)}
                    label={ticket.status}
                    color={getStatusColor(ticket.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={ticket.priority}
                    color={getPriorityColor(ticket.priority)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {formatDate(ticket.created_at)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="View details">
                      <IconButton
                        size="small"
                        onClick={() => handleViewTicket(ticket)}
                      >
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                    {ticket.status !== 'closed' ? (
                      <Tooltip title="Reply">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedTicket(ticket);
                            setReplyDialog(true);
                          }}
                        >
                          <ReplyIcon />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Tooltip title="Reopen ticket">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleReopenTicket(ticket.id)}
                        >
                          <RestoreIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredTickets.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No support tickets found
          </Typography>
        </Box>
      )}

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
                {selectedTicket.status !== 'closed' ? (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => handleCloseTicket(selectedTicket.id)}
                    disabled={loading}
                  >
                    Close Ticket
                  </Button>
                ) : (
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={() => handleReopenTicket(selectedTicket.id)}
                    disabled={loading}
                  >
                    Reopen Ticket
                  </Button>
                )}
              </Box>
            </DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Organization: {selectedTicket.organizations?.name || 'Unknown'} | 
                Created by: {selectedTicket.profiles?.email || 'Unknown'} | 
                Created: {formatDate(selectedTicket.created_at)} | 
                Updated: {formatDate(selectedTicket.updated_at)}
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
                        {selectedTicket.profiles?.email || 'Unknown'} - {formatDate(selectedTicket.created_at)}
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
                          {message.sender === 'support' ? 'Support Team' : message.sender_email || 'User'} - {formatDate(message.created_at)}
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
            label="Your reply"
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