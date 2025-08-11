import React, { useState, useEffect } from 'react';
import {
  IconButton, Badge, Menu, MenuItem, Typography, Box, List, ListItem,
  ListItemText, ListItemIcon, Divider, Button, Chip, CircularProgress
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Clear as ClearIcon,
  Invoice as InvoiceIcon,
  Payment as PaymentIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { NotificationService } from '../services/notificationService';
import { useNavigate } from 'react-router-dom';

export default function NotificationCenter() {
  const { profile, organization } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [realtimeChannel, setRealtimeChannel] = useState(null);

  useEffect(() => {
    if (organization?.id) {
      loadNotifications();
      
      // Set up real-time subscription
      const channel = NotificationService.subscribeToNotifications(
        organization.id,
        handleRealtimeUpdate
      );
      setRealtimeChannel(channel);

      // Refresh notifications every 60 seconds as backup
      const interval = setInterval(loadNotifications, 60000);
      
      return () => {
        clearInterval(interval);
        if (channel) {
          NotificationService.unsubscribeFromNotifications(channel);
        }
      };
    }
  }, [organization?.id]);

  const handleRealtimeUpdate = (payload) => {
    console.log('Real-time notification update:', payload);
    // Reload notifications when we get real-time updates
    loadNotifications();
  };

  const loadNotifications = async () => {
    if (!organization?.id) return;
    
    try {
      const [notificationsResult, countResult] = await Promise.all([
        NotificationService.getNotifications(organization.id, { limit: 20 }),
        NotificationService.getUnreadCount(organization.id)
      ]);
      
      if (notificationsResult.success) {
        setNotifications(notificationsResult.notifications);
      }
      
      if (countResult.success) {
        setUnreadCount(countResult.count);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAsRead = async (notificationId, event) => {
    event.stopPropagation(); // Prevent notification click
    
    try {
      setLoading(true);
      const result = await NotificationService.markAsRead(notificationId);
      if (result.success) {
        // Update local state immediately for better UX
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId ? { ...n, is_read: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notification) => {
    try {
      // Mark as read if not already read
      if (!notification.is_read) {
        const result = await NotificationService.markAsRead(notification.id);
        if (result.success) {
          setNotifications(prev => 
            prev.map(n => 
              n.id === notification.id ? { ...n, is_read: true } : n
            )
          );
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }

      // Handle navigation based on notification type and action
      if (notification.action_url) {
        navigate(notification.action_url);
      } else {
        // Handle specific notification types
        switch (notification.type) {
          case 'yearly_invoice':
            navigate('/rentals?tab=yearly');
            break;
          case 'monthly_invoice':
            navigate('/rentals?tab=monthly');
            break;
          case 'support_ticket':
            if (notification.data?.action === 'new_ticket' && profile?.role === 'owner') {
              navigate('/owner-portal/support');
            } else {
              navigate('/support');
            }
            break;
          case 'payment_due':
            navigate('/billing');
            break;
          default:
            // Do nothing for other types
            break;
        }
      }

      handleClose();
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!organization?.id) return;
    
    try {
      setLoading(true);
      const result = await NotificationService.markAllAsRead(organization.id);
      if (result.success) {
        await loadNotifications(); // Refresh the list
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNotificationIcon = (type, priority) => {
    // Use the NotificationService helper methods
    const typeIcon = NotificationService.getTypeIcon(type);
    const priorityColor = NotificationService.getPriorityColor(priority);
    
    switch (type) {
      case 'yearly_invoice':
      case 'monthly_invoice':
        return <InvoiceIcon sx={{ color: priorityColor }} />;
      case 'payment_due':
        return <PaymentIcon sx={{ color: priorityColor }} />;
      case 'support_ticket':
        return <CheckCircleIcon sx={{ color: priorityColor }} />;
      case 'success':
        return <CheckCircleIcon color="success" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <InfoIcon sx={{ color: priorityColor }} />;
    }
  };

  const getPriorityChip = (priority) => {
    const colors = {
      low: 'default',
      normal: 'primary', 
      high: 'warning',
      urgent: 'error'
    };
    
    if (priority === 'normal') return null; // Don't show chip for normal priority
    
    return (
      <Chip 
        label={priority.toUpperCase()} 
        size="small" 
        color={colors[priority] || 'primary'}
        sx={{ ml: 1, fontSize: '0.7rem', height: '20px' }}
      />
    );
  };

  const open = Boolean(anchorEl);

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleClick}
        sx={{ ml: 1 }}
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 400,
            maxHeight: 500
          }
        }}
      >
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Notifications</Typography>
            {unreadCount > 0 && (
              <Button
                size="small"
                onClick={handleMarkAllAsRead}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={16} /> : <ClearIcon />}
              >
                Mark all read
              </Button>
            )}
          </Box>
        </Box>

        {notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No notifications
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {notifications.map((notification, index) => (
              <React.Fragment key={notification.id}>
                <ListItem
                  onClick={() => handleNotificationClick(notification)}
                  sx={{
                    backgroundColor: notification.is_read ? 'transparent' : 'action.hover',
                    '&:hover': {
                      backgroundColor: 'action.selected'
                    },
                    cursor: 'pointer',
                    borderLeft: `4px solid ${NotificationService.getPriorityColor(notification.priority)}`,
                    borderRadius: 1,
                    mb: 0.5
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {getNotificationIcon(notification.type, notification.priority)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontWeight: notification.is_read ? 'normal' : 'bold',
                              color: notification.is_read ? 'text.secondary' : 'text.primary'
                            }}
                          >
                            {notification.title}
                          </Typography>
                          {getPriorityChip(notification.priority)}
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                          {NotificationService.formatNotificationTime(notification.created_at)}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {notification.message}
                        </Typography>
                        
                        {/* Show action button if available */}
                        {notification.action_text && notification.action_url && (
                          <Button
                            size="small"
                            variant="outlined"
                            sx={{ mr: 1, mb: 1 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(notification.action_url);
                              handleClose();
                            }}
                          >
                            {notification.action_text}
                          </Button>
                        )}
                        
                        {/* Show additional data for yearly invoice notifications */}
                        {notification.type === 'yearly_invoice' && notification.data && (
                          <Box sx={{ mt: 1, p: 1, backgroundColor: 'action.hover', borderRadius: 1 }}>
                            <Typography variant="caption" display="block">
                              Year: {notification.data.year} | Customers: {notification.data.customer_count}
                            </Typography>
                            <Typography variant="caption" display="block">
                              Total Amount: ${notification.data.total_amount}
                            </Typography>
                            {notification.data.due_date && (
                              <Typography variant="caption" display="block" color="warning.main">
                                Due: {notification.data.due_date}
                              </Typography>
                            )}
                          </Box>
                        )}
                        
                        {!notification.is_read && (
                          <Chip
                            label="New"
                            size="small"
                            color="primary"
                            sx={{ mt: 1 }}
                          />
                        )}
                      </Box>
                    }
                  />
                  {!notification.is_read && (
                    <IconButton
                      size="small"
                      onClick={(e) => handleMarkAsRead(notification.id, e)}
                      disabled={loading}
                      sx={{ ml: 1 }}
                    >
                      <CheckCircleIcon fontSize="small" />
                    </IconButton>
                  )}
                </ListItem>
                {index < notifications.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}

        {notifications.length > 0 && (
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', textAlign: 'center' }}>
            <Button
              variant="text"
              size="small"
              onClick={handleClose}
            >
              View All Notifications
            </Button>
          </Box>
        )}
      </Menu>
    </>
  );
} 