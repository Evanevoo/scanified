import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  IconButton,
  Typography,
  TextField,
  Button,
  Avatar,
  Stack,
  Chip,
  Fade,
  Zoom,
  Badge,
  Collapse,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  Tooltip
} from '@mui/material';
import {
  Chat as ChatIcon,
  Close as CloseIcon,
  Send as SendIcon,
  SupportAgent as AgentIcon,
  AttachFile as AttachIcon,
  EmojiEmotions as EmojiIcon,
  MoreVert as MoreIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';

// Default configuration (fallback if website content is not available)
const defaultConfig = {
  enabled: true,
  welcomeMessage: 'Hi there! 👋 Welcome to Scanified. How can I help you today?',
  quickResponses: [
    'Tell me about pricing',
    'How does cylinder tracking work?',
    'What mobile features do you have?',
    'Schedule a demo'
  ],
  responses: {
    pricing: 'Our pricing starts at $49/month for the Starter plan (up to 100 assets, 3 users), Professional at $149/month (up to 1,000 assets, 10 users), and Enterprise with custom pricing (unlimited assets and users). All plans include a free trial and mobile app access!',
    scanning: 'Scanning is super easy! Just open the app on any smartphone, point the camera at a barcode or QR code, and it automatically captures the data. No special hardware needed!',
    support: 'I\'d be happy to help with technical support. Could you describe the issue you\'re experiencing?',
    demo: 'I can schedule a personalized demo for you! Please share your email and preferred time, and our team will reach out within 24 hours.',
    features: 'Our platform includes barcode scanning, real-time inventory tracking, customer management, route optimization, advanced analytics, API access, and mobile app support. What specific feature would you like to know more about?',
    cylinders: 'Our system is specifically designed for gas cylinder management with features like cylinder tracking, delivery routes, customer management, safety compliance, and maintenance scheduling.',
    mobile: 'Yes! Our mobile app works on both iOS and Android. Field workers can scan cylinders, update delivery status, and access customer information offline. All data syncs automatically when connected.',
    default: 'Thanks for your message! I can help you with pricing information, scanning features, technical support, scheduling a demo, or information about our gas cylinder management system. What would you like to know more about?'
  }
};

export default function LiveChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [chatConfig, setChatConfig] = useState(defaultConfig);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load chat configuration from website content
  useEffect(() => {
    const loadChatConfig = async () => {
      try {
        // Try to load website content from localStorage or API
        const storedContent = localStorage.getItem('websiteContent');
        if (storedContent) {
          const websiteContent = JSON.parse(storedContent);
          if (websiteContent.liveChat) {
            setChatConfig(websiteContent.liveChat);
          }
        }
      } catch (error) {
        console.log('Using default chat configuration');
      }
    };

    loadChatConfig();
  }, []);

  // Initialize messages with welcome message from config
  useEffect(() => {
    if (chatConfig.welcomeMessage) {
      setMessages([
        {
          id: 1,
          type: 'agent',
          text: chatConfig.welcomeMessage,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  }, [chatConfig.welcomeMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Show chat widget after 3 seconds
    const timer = setTimeout(() => {
      setHasNewMessage(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Add keyboard listener for Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  // Focus input field when chat is opened and not minimized
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          // Also try to focus the input element directly
          const inputElement = inputRef.current.querySelector('input, textarea');
          if (inputElement) {
            inputElement.focus();
          }
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isMinimized]);

  const handleOpen = () => {
    setIsOpen(true);
    setIsMinimized(false);
    setHasNewMessage(false);
    // Focus the input field after the component has rendered
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        // Also try to focus the input element directly
        const inputElement = inputRef.current.querySelector('input, textarea');
        if (inputElement) {
          inputElement.focus();
        }
      }
    }, 200);
  };

  const handleClose = () => {
    console.log('Close button clicked');
    setIsOpen(false);
    setIsMinimized(false);
  };

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const handleSendMessage = () => {
    if (inputValue.trim()) {
      const newMessage = {
        id: messages.length + 1,
        type: 'user',
        text: inputValue,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setMessages([...messages, newMessage]);
      setInputValue('');
      
      // Simulate agent typing
      setIsTyping(true);
      
      // Simulate agent response
      setTimeout(() => {
        let responseText = chatConfig.responses.default;
        
        const lowerInput = inputValue.toLowerCase();
        if (lowerInput.includes('pricing') || lowerInput.includes('cost') || lowerInput.includes('price') || lowerInput.includes('plan')) {
          responseText = chatConfig.responses.pricing;
        } else if (lowerInput.includes('scan') || lowerInput.includes('barcode') || lowerInput.includes('qr')) {
          responseText = chatConfig.responses.scanning;
        } else if (lowerInput.includes('support') || lowerInput.includes('help') || lowerInput.includes('issue') || lowerInput.includes('problem')) {
          responseText = chatConfig.responses.support;
        } else if (lowerInput.includes('demo') || lowerInput.includes('trial') || lowerInput.includes('test')) {
          responseText = chatConfig.responses.demo;
        } else if (lowerInput.includes('feature') || lowerInput.includes('functionality') || lowerInput.includes('capability')) {
          responseText = chatConfig.responses.features;
        } else if (lowerInput.includes('cylinder') || lowerInput.includes('gas') || lowerInput.includes('bottle')) {
          responseText = chatConfig.responses.cylinders;
        } else if (lowerInput.includes('mobile') || lowerInput.includes('app') || lowerInput.includes('phone') || lowerInput.includes('android') || lowerInput.includes('ios')) {
          responseText = chatConfig.responses.mobile;
        }
        
        const agentMessage = {
          id: messages.length + 2,
          type: 'agent',
          text: responseText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        setIsTyping(false);
        setMessages(prev => [...prev, agentMessage]);
      }, 1500);
    }
  };

  const handleQuickResponse = (response) => {
    setInputValue(response);
    setTimeout(() => handleSendMessage(), 100);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Don't render if chat is disabled
  if (!chatConfig.enabled) {
    return null;
  }

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <Zoom in={true}>
          <Box
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: 1300
            }}
          >
            <Badge
              color="error"
              variant="dot"
              invisible={!hasNewMessage}
              sx={{
                '& .MuiBadge-dot': {
                  width: 12,
                  height: 12,
                  border: '2px solid white',
                  animation: hasNewMessage ? 'pulse 2s infinite' : 'none',
                  '@keyframes pulse': {
                    '0%': { transform: 'scale(1)', opacity: 1 },
                    '50%': { transform: 'scale(1.2)', opacity: 0.7 },
                    '100%': { transform: 'scale(1)', opacity: 1 }
                  }
                }
              }}
            >
              <IconButton
                onClick={handleOpen}
                sx={{
                  bgcolor: 'primary.main',
                  color: 'white',
                  width: 60,
                  height: 60,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                    transform: 'scale(1.05)'
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                <ChatIcon />
              </IconButton>
            </Badge>
          </Box>
        </Zoom>
      )}

      {/* Backdrop */}
      {isOpen && (
        <Box
          onClick={handleClose}
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0,0,0,0.3)',
            zIndex: 1299
          }}
        />
      )}

      {/* Chat Window */}
      {isOpen && (
        <Fade in={isOpen}>
          <Paper
            elevation={10}
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              width: { xs: 'calc(100% - 48px)', sm: 380 },
              maxWidth: 380,
              height: isMinimized ? 'auto' : { xs: 'calc(100vh - 48px)', sm: 600 },
              maxHeight: { xs: 'calc(100vh - 48px)', sm: 600 },
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 3,
              overflow: 'hidden',
              zIndex: 1300,
              transition: 'height 0.3s ease'
            }}
          >
            {/* Header */}
            <Box
              sx={{
                bgcolor: 'primary.main',
                color: 'white',
                p: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer'
              }}
              onClick={handleMinimize}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Badge
                  overlap="circular"
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  badgeContent={
                    <Box sx={{
                      width: 10,
                      height: 10,
                      bgcolor: '#10B981',
                      borderRadius: '50%',
                      border: '2px solid white'
                    }} />
                  }
                >
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                    <AgentIcon />
                  </Avatar>
                </Badge>
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Scanified Support
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.9 }}>
                    We typically reply instantly
                  </Typography>
                </Box>
              </Box>
              
              <Stack direction="row" spacing={1}>
                <Tooltip title="Close chat" placement="bottom">
                  <IconButton
                    size="medium"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClose();
                    }}
                    sx={{ 
                      color: 'white',
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.1)'
                      },
                      minWidth: 40,
                      minHeight: 40
                    }}
                  >
                    <CloseIcon />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>

            <Collapse in={!isMinimized}>
              <>
                {/* Messages */}
                <Box
                  sx={{
                    flexGrow: 1,
                    overflowY: 'auto',
                    p: 2,
                    bgcolor: 'grey.50'
                  }}
                >
                  <List>
                    {messages.map((message, index) => (
                      <ListItem
                        key={message.id}
                        sx={{
                          flexDirection: message.type === 'user' ? 'row-reverse' : 'row',
                          gap: 1,
                          px: 0
                        }}
                      >
                        {message.type === 'agent' && (
                          <ListItemAvatar sx={{ minWidth: 40 }}>
                            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                              <AgentIcon sx={{ fontSize: 20 }} />
                            </Avatar>
                          </ListItemAvatar>
                        )}
                        
                        <Box
                          sx={{
                            maxWidth: '70%',
                            bgcolor: message.type === 'user' ? 'primary.main' : 'white',
                            color: message.type === 'user' ? 'white' : 'text.primary',
                            p: 2,
                            borderRadius: 2,
                            boxShadow: 1
                          }}
                        >
                          <Typography variant="body2">
                            {message.text}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              display: 'block',
                              mt: 0.5,
                              opacity: 0.7
                            }}
                          >
                            {message.time}
                          </Typography>
                        </Box>
                      </ListItem>
                    ))}
                    
                    {isTyping && (
                      <ListItem sx={{ gap: 1, px: 0 }}>
                        <ListItemAvatar sx={{ minWidth: 40 }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                            <AgentIcon sx={{ fontSize: 20 }} />
                          </Avatar>
                        </ListItemAvatar>
                        <Box
                          sx={{
                            bgcolor: 'white',
                            p: 2,
                            borderRadius: 2,
                            boxShadow: 1
                          }}
                        >
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            {[0, 1, 2].map((dot) => (
                              <Box
                                key={dot}
                                sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  bgcolor: 'grey.400',
                                  animation: `typing 1.4s infinite ease-in-out ${dot * 0.2}s`,
                                  '@keyframes typing': {
                                    '0%, 60%, 100%': { transform: 'translateY(0)' },
                                    '30%': { transform: 'translateY(-10px)' }
                                  }
                                }}
                              />
                            ))}
                          </Box>
                        </Box>
                      </ListItem>
                    )}
                  </List>
                  <div ref={messagesEndRef} />
                </Box>

                {/* Quick Responses */}
                {messages.length === 1 && (
                  <Box sx={{ p: 2, bgcolor: 'white', borderTop: 1, borderColor: 'divider' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                      Quick responses:
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {chatConfig.quickResponses.map((response, index) => (
                        <Chip
                          key={index}
                          label={response}
                          onClick={() => handleQuickResponse(response)}
                          sx={{
                            cursor: 'pointer',
                            '&:hover': { bgcolor: 'primary.main', color: 'white' }
                          }}
                        />
                      ))}
                    </Stack>
                  </Box>
                )}

                                 {/* Input Area */}
                 <Box
                   onClick={() => {
                     console.log('Input area clicked');
                     if (inputRef.current) {
                       inputRef.current.focus();
                     }
                   }}
                   sx={{
                     p: 2,
                     bgcolor: 'white',
                     borderTop: 1,
                     borderColor: 'divider',
                     cursor: 'text'
                   }}
                 >
                  <Stack direction="row" spacing={1} alignItems="flex-end">
                                         <TextField
                       ref={inputRef}
                       fullWidth
                       multiline
                       maxRows={3}
                       placeholder="Type your message..."
                       value={inputValue}
                       onChange={(e) => setInputValue(e.target.value)}
                       onKeyPress={handleKeyPress}
                       variant="outlined"
                       size="small"
                       autoFocus={isOpen && !isMinimized}
                       sx={{
                         '& .MuiOutlinedInput-root': {
                           borderRadius: 3
                         }
                       }}
                       onFocus={() => console.log('Input field focused')}
                       onBlur={() => console.log('Input field blurred')}
                       onClick={() => {
                         console.log('Input field clicked');
                         if (inputRef.current) {
                           inputRef.current.focus();
                         }
                       }}
                     />
                    <IconButton
                      color="primary"
                      onClick={handleSendMessage}
                      disabled={!inputValue.trim()}
                      sx={{
                        bgcolor: inputValue.trim() ? 'primary.main' : 'grey.300',
                        color: 'white',
                        '&:hover': {
                          bgcolor: inputValue.trim() ? 'primary.dark' : 'grey.300'
                        },
                        '&.Mui-disabled': {
                          color: 'white'
                        }
                      }}
                    >
                      <SendIcon />
                    </IconButton>
                  </Stack>
                  
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mt: 1, textAlign: 'center' }}
                  >
                    Powered by Scanified AI Assistant
                  </Typography>
                </Box>
              </>
            </Collapse>
          </Paper>
        </Fade>
      )}
    </>
  );
}