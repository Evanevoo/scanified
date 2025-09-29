import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Alert, Grid, Card, CardContent, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Chip, Button, TextField, MenuItem,
  FormControl, InputLabel, Select, IconButton, Tooltip, LinearProgress, Badge,
  Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText,
  ListItemIcon, Divider, Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import {
  Security as SecurityIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Visibility as VisibilityIcon,
  Block as BlockIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Timeline as TimelineIcon,
  Person as PersonIcon,
  Computer as ComputerIcon,
  Lock as LockIcon,
  VpnKey as VpnKeyIcon,
  Shield as ShieldIcon,
  Gavel as GavelIcon,
  ExpandMore as ExpandMoreIcon,
  LocationOn as LocationIcon,
  AccessTime as AccessTimeIcon,
  DeviceUnknown as DeviceIcon
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { useOwnerAccess } from '../../hooks/useOwnerAccess';

export default function SecurityEvents() {
  const { profile } = useAuth();
  useOwnerAccess(profile);

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventDialog, setEventDialog] = useState(false);
  const [securityStats, setSecurityStats] = useState({
    totalEvents: 0,
    criticalEvents: 0,
    blockedAttempts: 0,
    suspiciousActivity: 0
  });

  // Mock security events data
  const mockEvents = [
    {
      id: 1,
      timestamp: '2024-01-15T14:30:00Z',
      type: 'failed_login',
      severity: 'high',
      user: 'john.doe@abcgas.com',
      organization: 'ABC Gas Solutions',
      description: 'Multiple failed login attempts detected',
      ip: '192.168.1.100',
      location: 'New York, NY',
      device: 'Chrome on Windows',
      action: 'Account temporarily locked',
      status: 'resolved'
    },
    {
      id: 2,
      timestamp: '2024-01-15T13:45:00Z',
      type: 'suspicious_access',
      severity: 'critical',
      user: 'admin@metrogas.com',
      organization: 'Metro Gas Distribution',
      description: 'Access from unusual location detected',
      ip: '203.0.113.45',
      location: 'Moscow, Russia',
      device: 'Firefox on Linux',
      action: 'Access blocked, MFA required',
      status: 'blocked'
    },
    {
      id: 3,
      timestamp: '2024-01-15T12:20:00Z',
      type: 'data_export',
      severity: 'medium',
      user: 'manager@quickgas.com',
      organization: 'Quick Gas Express',
      description: 'Large data export initiated',
      ip: '10.0.0.50',
      location: 'Dallas, TX',
      device: 'Safari on MacOS',
      action: 'Export logged and monitored',
      status: 'monitored'
    },
    {
      id: 4,
      timestamp: '2024-01-15T11:15:00Z',
      type: 'privilege_escalation',
      severity: 'high',
      user: 'user@coastalgas.com',
      organization: 'Coastal Gas Services',
      description: 'User attempted to access admin functions',
      ip: '172.16.0.25',
      location: 'Miami, FL',
      device: 'Safari on iOS',
      action: 'Access denied, security team notified',
      status: 'investigated'
    },
    {
      id: 5,
      timestamp: '2024-01-15T10:30:00Z',
      type: 'api_abuse',
      severity: 'medium',
      user: 'api@industrialgas.com',
      organization: 'Industrial Gas Co',
      description: 'API rate limit exceeded',
      ip: '198.51.100.10',
      location: 'Chicago, IL',
      device: 'API Client',
      action: 'Rate limiting applied',
      status: 'resolved'
    },
    {
      id: 6,
      timestamp: '2024-01-15T09:45:00Z',
      type: 'password_reset',
      severity: 'low',
      user: 'support@gasexpress.com',
      organization: 'Gas Express',
      description: 'Password reset requested',
      ip: '192.0.2.100',
      location: 'Phoenix, AZ',
      device: 'Chrome on Windows',
      action: 'Reset email sent',
      status: 'completed'
    },
    {
      id: 7,
      timestamp: '2024-01-15T08:20:00Z',
      type: 'brute_force',
      severity: 'critical',
      user: 'unknown',
      organization: 'Multiple',
      description: 'Coordinated brute force attack detected',
      ip: '198.51.100.200',
      location: 'Unknown',
      device: 'Automated Bot',
      action: 'IP blocked, WAF rules updated',
      status: 'blocked'
    },
    {
      id: 8,
      timestamp: '2024-01-15T07:10:00Z',
      type: 'session_hijack',
      severity: 'high',
      user: 'admin@northerngas.com',
      organization: 'Northern Gas Systems',
      description: 'Potential session hijacking attempt',
      ip: '203.0.113.100',
      location: 'Toronto, Canada',
      device: 'Chrome on Windows',
      action: 'Session terminated, user notified',
      status: 'resolved'
    }
  ];

  useEffect(() => {
    // Simulate loading security events
    setTimeout(() => {
      setEvents(mockEvents);
      setFilteredEvents(mockEvents);
      setSecurityStats({
        totalEvents: mockEvents.length,
        criticalEvents: mockEvents.filter(e => e.severity === 'critical').length,
        blockedAttempts: mockEvents.filter(e => e.status === 'blocked').length,
        suspiciousActivity: mockEvents.filter(e => e.type === 'suspicious_access' || e.type === 'brute_force').length
      });
      setLoading(false);
    }, 1000);
  }, []);

  useEffect(() => {
    let filtered = events;

    if (searchTerm) {
      filtered = filtered.filter(event =>
        event.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.organization.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (severityFilter !== 'all') {
      filtered = filtered.filter(event => event.severity === severityFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(event => event.type === typeFilter);
    }

    setFilteredEvents(filtered);
  }, [events, searchTerm, severityFilter, typeFilter]);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return <ErrorIcon />;
      case 'high': return <WarningIcon />;
      case 'medium': return <InfoIcon />;
      case 'low': return <CheckCircleIcon />;
      default: return <SecurityIcon />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'blocked': return 'error';
      case 'resolved': return 'success';
      case 'investigated': return 'warning';
      case 'monitored': return 'info';
      default: return 'default';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'failed_login': return <LockIcon />;
      case 'suspicious_access': return <ShieldIcon />;
      case 'data_export': return <DownloadIcon />;
      case 'privilege_escalation': return <VpnKeyIcon />;
      case 'api_abuse': return <ComputerIcon />;
      case 'password_reset': return <PersonIcon />;
      case 'brute_force': return <GavelIcon />;
      case 'session_hijack': return <SecurityIcon />;
      default: return <SecurityIcon />;
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setEventDialog(true);
  };

  const refreshEvents = () => {
    setLoading(true);
    // Simulate refresh
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  const StatCard = ({ title, value, icon, color, description }) => (
    <Card sx={{ height: '100%', border: '1px solid #e2e8f0' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ color: `${color}.main` }}>
            {icon}
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: `${color}.main` }}>
            {value}
          </Typography>
        </Box>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>Loading Security Events...</Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
      <Typography variant="h4" gutterBottom>
        Security Events
      </Typography>
          <Typography variant="body1" color="text.secondary">
            Monitor security events, threats, and system access across all organizations
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => alert('Export functionality coming soon!')}
          >
            Export Report
          </Button>
          <IconButton onClick={refreshEvents} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Security Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Events"
            value={securityStats.totalEvents}
            icon={<SecurityIcon />}
            color="primary"
            description="All security events today"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Critical Events"
            value={securityStats.criticalEvents}
            icon={<ErrorIcon />}
            color="error"
            description="Require immediate attention"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Blocked Attempts"
            value={securityStats.blockedAttempts}
            icon={<BlockIcon />}
            color="warning"
            description="Suspicious activities blocked"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Suspicious Activity"
            value={securityStats.suspiciousActivity}
            icon={<ShieldIcon />}
            color="info"
            description="Potential security threats"
          />
        </Grid>
      </Grid>

      {/* Critical Alerts */}
      {events.filter(e => e.severity === 'critical').length > 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Critical Security Alerts
          </Typography>
          <List dense>
            {events.filter(e => e.severity === 'critical').map((event) => (
              <ListItem key={event.id}>
                <ListItemIcon>
                  {getSeverityIcon(event.severity)}
                </ListItemIcon>
                <ListItemText
                  primary={event.description}
                  secondary={`${event.organization} - ${formatTimestamp(event.timestamp)}`}
                />
              </ListItem>
            ))}
          </List>
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Severity</InputLabel>
              <Select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                label="Severity"
              >
                <MenuItem value="all">All Severities</MenuItem>
                <MenuItem value="critical">Critical</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Event Type</InputLabel>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                label="Event Type"
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="failed_login">Failed Login</MenuItem>
                <MenuItem value="suspicious_access">Suspicious Access</MenuItem>
                <MenuItem value="data_export">Data Export</MenuItem>
                <MenuItem value="privilege_escalation">Privilege Escalation</MenuItem>
                <MenuItem value="api_abuse">API Abuse</MenuItem>
                <MenuItem value="brute_force">Brute Force</MenuItem>
                <MenuItem value="session_hijack">Session Hijack</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={() => {
                setSearchTerm('');
                setSeverityFilter('all');
                setTypeFilter('all');
              }}
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Events Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Time</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Severity</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Organization</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredEvents.map((event) => (
                <TableRow key={event.id} hover>
                  <TableCell>
                    <Typography variant="body2">
                      {formatTimestamp(event.timestamp)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getTypeIcon(event.type)}
                      <Typography variant="body2">
                        {event.type.replace('_', ' ').toUpperCase()}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={getSeverityIcon(event.severity)}
                      label={event.severity.toUpperCase()}
                      color={getSeverityColor(event.severity)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{event.user}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{event.organization}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{event.description}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={event.status.toUpperCase()}
                      color={getStatusColor(event.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleEventClick(event)}
                    >
                      <VisibilityIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Event Details Dialog */}
      <Dialog
        open={eventDialog}
        onClose={() => setEventDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Security Event Details
        </DialogTitle>
        <DialogContent>
          {selectedEvent && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>Event Information</Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon><AccessTimeIcon /></ListItemIcon>
                      <ListItemText
                        primary="Timestamp"
                        secondary={formatTimestamp(selectedEvent.timestamp)}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>{getTypeIcon(selectedEvent.type)}</ListItemIcon>
                      <ListItemText
                        primary="Event Type"
                        secondary={selectedEvent.type.replace('_', ' ').toUpperCase()}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>{getSeverityIcon(selectedEvent.severity)}</ListItemIcon>
                      <ListItemText
                        primary="Severity"
                        secondary={selectedEvent.severity.toUpperCase()}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><PersonIcon /></ListItemIcon>
                      <ListItemText
                        primary="User"
                        secondary={selectedEvent.user}
                      />
                    </ListItem>
                  </List>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>Technical Details</Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon><ComputerIcon /></ListItemIcon>
                      <ListItemText
                        primary="IP Address"
                        secondary={selectedEvent.ip}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><LocationIcon /></ListItemIcon>
                      <ListItemText
                        primary="Location"
                        secondary={selectedEvent.location}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><DeviceIcon /></ListItemIcon>
                      <ListItemText
                        primary="Device"
                        secondary={selectedEvent.device}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><ShieldIcon /></ListItemIcon>
                      <ListItemText
                        primary="Action Taken"
                        secondary={selectedEvent.action}
                      />
                    </ListItem>
                  </List>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Description</Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {selectedEvent.description}
                  </Typography>
                  <Typography variant="h6" gutterBottom>Organization</Typography>
                  <Typography variant="body1">
                    {selectedEvent.organization}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEventDialog(false)}>Close</Button>
          <Button variant="contained" onClick={() => alert('Investigation tools coming soon!')}>
            Investigate
          </Button>
        </DialogActions>
      </Dialog>

      {/* Security Recommendations */}
      <Accordion sx={{ mt: 3 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Security Recommendations</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Alert severity="info">
                <Typography variant="h6" gutterBottom>Immediate Actions</Typography>
                <List dense>
                  <ListItem>
                    <ListItemText primary="Review critical security events daily" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Implement MFA for all admin accounts" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Set up automated threat detection" />
                  </ListItem>
                </List>
              </Alert>
            </Grid>
            <Grid item xs={12} md={6}>
              <Alert severity="warning">
                <Typography variant="h6" gutterBottom>Best Practices</Typography>
                <List dense>
                  <ListItem>
                    <ListItemText primary="Regular security audits and penetration testing" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Employee security awareness training" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Keep all systems and software updated" />
                  </ListItem>
                </List>
      </Alert>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
} 