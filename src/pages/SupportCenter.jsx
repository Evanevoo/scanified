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
  Delete as DeleteIcon
} from '@mui/icons-material';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';

const mockTickets = [
  {
    id: 1,
    subject: 'Cannot access cylinder data',
    status: 'open',
    category: 'technical',
    priority: 'high',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toLocaleString(),
  },
  {
    id: 2,
    subject: 'Billing question',
    status: 'pending',
    category: 'billing',
    priority: 'medium',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toLocaleString(),
  },
  {
    id: 3,
    subject: 'Feature request: Mobile app improvements',
    status: 'closed',
    category: 'feature',
    priority: 'low',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toLocaleString(),
  }
];

export default function SupportCenter() {
  const { profile } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState(mockTickets);
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

  useEffect(() => {
    if (profile) {
      fetchTickets();
    }
  }, [profile]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      // In production, this would fetch tickets for the current organization
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data - in production this would come from Supabase
      const mockTickets = [
        {
          id: 1,
          subject: 'Cannot access cylinder data',
          status: 'open',
          category: 'technical',
          priority: 'high',
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toLocaleString(),
          updated_at: new Date(Date.now() - 1000 * 60 * 30).toLocaleString(),
          messages: [
            { 
              id: 1,
              sender: 'user', 
              message: 'I cannot access the cylinder data in my dashboard. Getting an error message.', 
              timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toLocaleString() 
            },
            { 
              id: 2,
              sender: 'support', 
              message: 'We are investigating this issue. Can you provide more details about the error message?', 
              timestamp: new Date(Date.now() - 1000 * 60 * 30).toLocaleString() 
            }
          ]
        },
        {
          id: 2,
          subject: 'Billing question',
          status: 'pending',
          category: 'billing',
          priority: 'medium',
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toLocaleString(),
          updated_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toLocaleString(),
          messages: [
            { 
              id: 1,
              sender: 'user', 
              message: 'I have a question about my monthly billing. Can you explain the charges?', 
              timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toLocaleString() 
            },
            { 
              id: 2,
              sender: 'support', 
              message: 'I\'ll review your billing statement and get back to you with a detailed breakdown.', 
              timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12).toLocaleString() 
            }
          ]
        },
        {
          id: 3,
          subject: 'Feature request: Mobile app improvements',
          status: 'closed',
          category: 'feature',
          priority: 'low',
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toLocaleString(),
          updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toLocaleString(),
          messages: [
            { 
              id: 1,
              sender: 'user', 
              message: 'It would be great to have offline scanning capabilities in the mobile app.', 
              timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toLocaleString() 
            },
            { 
              id: 2,
              sender: 'support', 
              message: 'Thank you for the suggestion! This feature is on our roadmap for Q2 2024.', 
              timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toLocaleString() 
            }
          ]
        }
      ];
      
      setTickets(mockTickets);
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
      // In production, this would submit to Supabase
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const newTicketData = {
        id: Date.now(),
        subject: newTicket.subject,
        status: 'open',
        category: newTicket.category,
        priority: newTicket.priority,
        created_at: new Date().toLocaleString(),
        updated_at: new Date().toLocaleString(),
        messages: [
          {
            id: 1,
            sender: 'user',
            message: newTicket.description,
            timestamp: new Date().toLocaleString()
          }
        ]
      };
      
      setTickets(prev => [newTicketData, ...prev]);
      setNewTicketDialog(false);
      setNewTicket({ subject: '', category: '', priority: 'medium', description: '' });
      setSnackbar({ open: true, message: 'Ticket submitted successfully', severity: 'success' });
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
      // In production, this would submit to Supabase
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newMessage = {
        id: Date.now(),
        sender: 'user',
        message: replyMessage,
        timestamp: new Date().toLocaleString()
      };
      
      setTickets(prev => prev.map(ticket => 
        ticket.id === selectedTicket.id 
          ? { 
              ...ticket, 
              messages: [...ticket.messages, newMessage],
              updated_at: new Date().toLocaleString()
            }
          : ticket
      ));
      
      setReplyMessage('');
      setReplyDialog(false);
      setSnackbar({ open: true, message: 'Reply sent successfully', severity: 'success' });
    } catch (error) {
      console.error('Error sending reply:', error);
      setSnackbar({ open: true, message: 'Error sending reply', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTicket = (ticket) => {
    setTicketToDelete(ticket);
    setDeleteDialog(true);
  };

  const confirmDeleteTicket = async () => {
    setLoading(true);
    try {
      // In production, this would delete from Supabase
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const updatedTickets = tickets.filter(ticket => ticket.id !== ticketToDelete.id);
      setTickets(updatedTickets);
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
                          onClick={() => {
                            setSelectedTicket(ticket);
                            setTicketDialog(true);
                          }}
                          variant="outlined"
                          startIcon={<ViewIcon />}
                          size="small"
                        >
                          View Details
                        </Button>
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
            </DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Created: {selectedTicket.created_at} | Updated: {selectedTicket.updated_at}
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                Messages
              </Typography>
              
              <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                {selectedTicket.messages?.map((message, index) => (
                  <Box key={index} sx={{ mb: 2 }}>
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                      mb: 1
                    }}>
                      <Chip
                        label={message.sender === 'user' ? 'You' : 'Support'}
                        color={message.sender === 'user' ? 'primary' : 'secondary'}
                        size="small"
                      />
                    </Box>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        backgroundColor: message.sender === 'user' ? 'primary.light' : 'grey.50',
                        ml: message.sender === 'user' ? 4 : 0,
                        mr: message.sender === 'user' ? 0 : 4,
                      }}
                    >
                      <Typography variant="body2">{message.message}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        {message.timestamp}
                      </Typography>
                    </Paper>
                  </Box>
                ))}
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