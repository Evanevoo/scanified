import logger from '../../utils/logger';
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, Grid, Card, CardContent, CardActions,
  Chip, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem, Alert, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  LinearProgress, Divider, Accordion, AccordionSummary, AccordionDetails,
  List, ListItem, ListItemText, ListItemIcon
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  NetworkCheck as NetworkIcon,
  ExpandMore as ExpandMoreIcon,
  Notifications as NotificationsIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  Build as BuildIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import { supabase } from '../../supabase/client';
import { useAuth } from '../../hooks/useAuth';
import { useOwnerAccess } from '../../hooks/useOwnerAccess';

export default function SystemHealth() {
  const { profile } = useAuth();
  useOwnerAccess(profile); // Restrict access to owners

  const [loading, setLoading] = useState(false);
  const [systemHealth, setSystemHealth] = useState({
    overall: 'healthy',
    components: {},
    alerts: [],
    metrics: {},
    performance: {}
  });
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);

  useEffect(() => {
    loadSystemHealth();
    
    if (autoRefresh) {
      const interval = setInterval(loadSystemHealth, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const loadSystemHealth = async () => {
    setLoading(true);
    try {
      // Simulate API calls - in production these would be real system health checks
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setSystemHealth({
        overall: 'healthy',
        components: {
          database: { status: 'healthy', responseTime: 45, uptime: 99.98 },
          api: { status: 'healthy', responseTime: 120, uptime: 99.95 },
          storage: { status: 'healthy', usage: 67, uptime: 99.99 },
          authentication: { status: 'healthy', responseTime: 25, uptime: 99.97 },
          email: { status: 'warning', responseTime: 300, uptime: 99.5 },
          sms: { status: 'healthy', responseTime: 150, uptime: 99.8 }
        },
        alerts: [
          { id: 1, type: 'warning', component: 'Email Service', message: 'Email delivery delays detected', timestamp: new Date(Date.now() - 300000) },
          { id: 2, type: 'info', component: 'Database', message: 'Scheduled maintenance completed', timestamp: new Date(Date.now() - 3600000) },
          { id: 3, type: 'error', component: 'API Gateway', message: 'High latency detected in region US-East', timestamp: new Date(Date.now() - 1800000) }
        ],
        metrics: {
          activeUsers: 234,
          concurrentConnections: 89,
          databaseConnections: 45,
          apiRequestsPerMinute: 1250,
          averageResponseTime: 180,
          errorRate: 0.02
        },
        performance: {
          cpu: 23,
          memory: 67,
          disk: 45,
          network: 12
        }
      });
    } catch (error) {
      logger.error('Error loading system health:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return <CheckCircleIcon color="success" />;
      case 'warning': return <WarningIcon color="warning" />;
      case 'error': return <ErrorIcon color="error" />;
      default: return <InfoIcon color="info" />;
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'error': return <ErrorIcon color="error" />;
      case 'warning': return <WarningIcon color="warning" />;
      case 'info': return <InfoIcon color="info" />;
      default: return <InfoIcon color="info" />;
    }
  };

  const formatUptime = (uptime) => {
    return `${uptime.toFixed(2)}%`;
  };

  const formatResponseTime = (time) => {
    return `${time}ms`;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          System Health Monitor
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Auto Refresh</InputLabel>
            <Select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(e.target.value)}
              label="Auto Refresh"
            >
              <MenuItem value={15}>15 seconds</MenuItem>
              <MenuItem value={30}>30 seconds</MenuItem>
              <MenuItem value={60}>1 minute</MenuItem>
              <MenuItem value={300}>5 minutes</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadSystemHealth}
            disabled={loading}
          >
            Refresh Now
          </Button>
        </Box>
      </Box>

      {/* Overall Status */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            {getStatusIcon(systemHealth.overall)}
            <Typography variant="h5" sx={{ ml: 1 }}>
              System Status: {systemHealth.overall.toUpperCase()}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Last updated: {new Date().toLocaleString()}
          </Typography>
        </CardContent>
      </Card>

      {/* System Metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SpeedIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Response Time</Typography>
              </Box>
              <Typography variant="h4" gutterBottom>
                {systemHealth.metrics.averageResponseTime}ms
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Average API response time
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <NetworkIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">API Requests</Typography>
              </Box>
              <Typography variant="h4" gutterBottom>
                {systemHealth.metrics.apiRequestsPerMinute?.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Requests per minute
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PeopleIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Active Users</Typography>
              </Box>
              <Typography variant="h4" gutterBottom>
                {systemHealth.metrics.activeUsers?.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Currently active users
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ErrorIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Error Rate</Typography>
              </Box>
              <Typography variant="h4" gutterBottom>
                {(systemHealth.metrics.errorRate * 100).toFixed(2)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                API error rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Component Health */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Components
              </Typography>
              <List>
                {Object.entries(systemHealth.components || {}).map(([name, component]) => (
                  <ListItem key={name} divider>
                    <ListItemIcon>
                      {getStatusIcon(component.status)}
                    </ListItemIcon>
                    <ListItemText
                      primary={name.charAt(0).toUpperCase() + name.slice(1)}
                      secondary={
                        <Box>
                          <Typography variant="body2">
                            Status: {component.status} | Uptime: {formatUptime(component.uptime)}
                          </Typography>
                          {component.responseTime && (
                            <Typography variant="body2">
                              Response Time: {formatResponseTime(component.responseTime)}
                            </Typography>
                          )}
                          {component.usage && (
                            <Typography variant="body2">
                              Usage: {component.usage}%
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance Metrics
              </Typography>
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">CPU Usage</Typography>
                  <Typography variant="body2">{systemHealth.performance.cpu}%</Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={systemHealth.performance.cpu} 
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Memory Usage</Typography>
                  <Typography variant="body2">{systemHealth.performance.memory}%</Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={systemHealth.performance.memory} 
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Disk Usage</Typography>
                  <Typography variant="body2">{systemHealth.performance.disk}%</Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={systemHealth.performance.disk} 
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Network Usage</Typography>
                  <Typography variant="body2">{systemHealth.performance.network}%</Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={systemHealth.performance.network} 
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* System Alerts */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            System Alerts
          </Typography>
          {systemHealth.alerts?.length > 0 ? (
            systemHealth.alerts.map((alert) => (
              <Alert 
                key={alert.id} 
                severity={getStatusColor(alert.type)} 
                sx={{ mb: 1 }}
                action={
                  <Chip 
                    label={alert.component} 
                    size="small" 
                    variant="outlined"
                  />
                }
              >
                <Box>
                  <Typography variant="body2">
                    {alert.message}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(alert.timestamp).toLocaleString()}
                  </Typography>
                </Box>
              </Alert>
            ))
          ) : (
            <Alert severity="success">
              No active alerts - all systems are operating normally
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Database Connections */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Database Connections
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Connection Type</TableCell>
                  <TableCell align="right">Active Connections</TableCell>
                  <TableCell align="right">Max Connections</TableCell>
                  <TableCell align="right">Utilization</TableCell>
                  <TableCell align="center">Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Primary Database</TableCell>
                  <TableCell align="right">{systemHealth.metrics.databaseConnections}</TableCell>
                  <TableCell align="right">100</TableCell>
                  <TableCell align="right">
                    <LinearProgress 
                      variant="determinate" 
                      value={(systemHealth.metrics.databaseConnections / 100) * 100} 
                      sx={{ width: 60, height: 6, borderRadius: 3 }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip label="Healthy" color="success" size="small" />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Read Replicas</TableCell>
                  <TableCell align="right">12</TableCell>
                  <TableCell align="right">50</TableCell>
                  <TableCell align="right">
                    <LinearProgress 
                      variant="determinate" 
                      value={24} 
                      sx={{ width: 60, height: 6, borderRadius: 3 }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip label="Healthy" color="success" size="small" />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
} 