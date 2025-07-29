import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Button, TextField, 
  Switch, FormControlLabel, Accordion, AccordionSummary, AccordionDetails,
  Snackbar, Divider, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, List, ListItem, ListItemText, ListItemSecondaryAction,
  Chip, Avatar, Paper, Tabs, Tab, FormControl, InputLabel, Select, MenuItem,
  TextareaAutosize, Tooltip, Stack, Badge, Drawer, ListItemIcon, Fab,
  Zoom, Fade, Slide, Collapse, Backdrop, CircularProgress
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Preview as PreviewIcon,
  Business as BusinessIcon,
  Navigation as NavigationIcon,
  ViewModule as HeroIcon,
  Widgets as FeaturesIcon,
  AttachMoney as PricingIcon,
  ViewList as FooterIcon,
  Search as SEOIcon,
  Analytics as AnalyticsIcon,
  Link as LinkIcon,
  Image as ImageIcon,
  Palette as ColorIcon,
  Code as CodeIcon,
  Visibility as VisibilityIcon,
  Settings as SettingsIcon,
  Public as PublicIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Schedule as ScheduleIcon,
  Security as SecurityIcon,
  Star as StarIcon,
  People as PeopleIcon,
  Refresh as RefreshIcon,
  Launch as LaunchIcon,
  Build as BuildIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  TextFields as TypographyIcon,
  VideoLibrary as VideoIcon,
  ViewModule as LayoutIcon,
  Style as StyleIcon,
  Tune as TuneIcon,
  Smartphone as MobileIcon,
  Computer as DesktopIcon,
  Tablet as TabletIcon,
  VisibilityOff as HideIcon,
  Close as CloseIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Error as ErrorIcon,
  Help as HelpIcon,
  AutoAwesome as AutoAwesomeIcon
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { useOwnerAccess } from '../../hooks/useOwnerAccess';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

export default function VisualPageBuilder() {
  const { profile } = useAuth();
  useOwnerAccess(profile);

  const [activeTab, setActiveTab] = useState('visual');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [previewMode, setPreviewMode] = useState(false);
  const [fullscreenPreview, setFullscreenPreview] = useState(false);
  const [selectedElement, setSelectedElement] = useState(null);
  const [elementDialog, setElementDialog] = useState(false);
  const [widgetsPanel, setWidgetsPanel] = useState(true);
  const [propertiesPanel, setPropertiesPanel] = useState(true);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [zoom, setZoom] = useState(100);
  const [deviceMode, setDeviceMode] = useState('desktop'); // desktop, tablet, mobile
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  // Page structure with sections and elements
  const [pageStructure, setPageStructure] = useState({
    sections: [
      {
        id: 'hero',
        type: 'hero',
        title: 'Hero Section',
        visible: true,
        elements: [
          {
            id: 'hero-title',
            type: 'heading',
            content: 'Streamline Your Gas Cylinder Management',
            style: {
              fontSize: '3rem',
              fontWeight: 'bold',
              color: '#1976d2',
              textAlign: 'center'
            },
            position: { x: 0, y: 0 }
          },
          {
            id: 'hero-subtitle',
            type: 'text',
            content: 'Track, manage, and optimize your gas cylinder operations with our comprehensive management system.',
            style: {
              fontSize: '1.2rem',
              color: '#666',
              textAlign: 'center',
              maxWidth: '600px'
            },
            position: { x: 0, y: 100 }
          },
          {
            id: 'hero-cta',
            type: 'button',
            content: 'Start Free Trial',
            style: {
              backgroundColor: '#1976d2',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '1.1rem',
              fontWeight: 'bold'
            },
            position: { x: 0, y: 200 }
          }
        ]
      },
      {
        id: 'features',
        type: 'features',
        title: 'Features Section',
        visible: true,
        elements: [
          {
            id: 'features-title',
            type: 'heading',
            content: 'Everything You Need to Manage Your Gas Cylinders',
            style: {
              fontSize: '2.5rem',
              fontWeight: 'bold',
              textAlign: 'center',
              marginBottom: '2rem'
            },
            position: { x: 0, y: 0 }
          }
        ]
      }
    ]
  });

  // Available widgets/components
  const availableWidgets = [
    {
      id: 'heading',
      name: 'Heading',
      icon: <TypographyIcon />,
      category: 'text',
      defaultContent: 'New Heading',
      defaultStyle: {
        fontSize: '2rem',
        fontWeight: 'bold',
        color: '#333'
      }
    },
    {
      id: 'text',
      name: 'Text Block',
      icon: <TypographyIcon />,
      category: 'text',
      defaultContent: 'Add your text here...',
      defaultStyle: {
        fontSize: '1rem',
        color: '#666',
        lineHeight: '1.6'
      }
    },
    {
      id: 'button',
      name: 'Button',
      icon: <LinkIcon />,
      category: 'interactive',
      defaultContent: 'Click Here',
      defaultStyle: {
        backgroundColor: '#1976d2',
        color: 'white',
        padding: '12px 24px',
        borderRadius: '8px',
        fontSize: '1rem',
        fontWeight: 'bold',
        cursor: 'pointer'
      }
    },
    {
      id: 'image',
      name: 'Image',
      icon: <ImageIcon />,
      category: 'media',
      defaultContent: 'https://via.placeholder.com/400x300',
      defaultStyle: {
        maxWidth: '100%',
        height: 'auto'
      }
    },
    {
      id: 'video',
      name: 'Video',
      icon: <VideoIcon />,
      category: 'media',
      defaultContent: '',
      defaultStyle: {
        maxWidth: '100%',
        height: 'auto'
      }
    },
    {
      id: 'card',
      name: 'Card',
      icon: <BusinessIcon />,
      category: 'layout',
      defaultContent: 'Card Content',
      defaultStyle: {
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }
    },
    {
      id: 'grid',
      name: 'Grid Layout',
      icon: <LayoutIcon />,
      category: 'layout',
      defaultContent: '',
      defaultStyle: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px'
      }
    },
    {
      id: 'form',
      name: 'Contact Form',
      icon: <EmailIcon />,
      category: 'interactive',
      defaultContent: '',
      defaultStyle: {
        padding: '20px',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px'
      }
    },
    {
      id: 'testimonial',
      name: 'Testimonial',
      icon: <StarIcon />,
      category: 'content',
      defaultContent: 'Customer testimonial here...',
      defaultStyle: {
        padding: '20px',
        backgroundColor: '#f9f9f9',
        borderRadius: '8px',
        borderLeft: '4px solid #1976d2'
      }
    },
    {
      id: 'pricing-card',
      name: 'Pricing Card',
      icon: <PricingIcon />,
      category: 'content',
      defaultContent: '',
      defaultStyle: {
        padding: '30px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        textAlign: 'center'
      }
    }
  ];

  // Style presets
  const stylePresets = {
    colors: [
      '#1976d2', '#dc004e', '#2e7d32', '#ed6c02', '#9c27b0',
      '#f57c00', '#388e3c', '#7b1fa2', '#c62828', '#1565c0'
    ],
    fonts: [
      'Inter, sans-serif',
      'Roboto, sans-serif',
      'Open Sans, sans-serif',
      'Lato, sans-serif',
      'Poppins, sans-serif'
    ],
    spacing: [8, 16, 24, 32, 48, 64],
    borderRadius: [0, 4, 8, 12, 16, 24]
  };

  useEffect(() => {
    loadPageStructure();
  }, []);

  const loadPageStructure = () => {
    const saved = localStorage.getItem('visualPageStructure');
    if (saved) {
      setPageStructure(JSON.parse(saved));
    }
  };

  const savePageStructure = () => {
    setLoading(true);
    try {
      localStorage.setItem('visualPageStructure', JSON.stringify(pageStructure));
      setUnsavedChanges(false);
      setSnackbar({ open: true, message: 'Page structure saved successfully!', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Error saving page structure', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const addToUndoStack = (action) => {
    setUndoStack(prev => [...prev, { action, timestamp: Date.now() }]);
    setRedoStack([]);
  };

  const undo = () => {
    if (undoStack.length > 0) {
      const lastAction = undoStack[undoStack.length - 1];
      setRedoStack(prev => [...prev, { action: 'undo', data: pageStructure }]);
      // Apply undo logic here
      setUndoStack(prev => prev.slice(0, -1));
      setUnsavedChanges(true);
    }
  };

  const redo = () => {
    if (redoStack.length > 0) {
      const lastAction = redoStack[redoStack.length - 1];
      setUndoStack(prev => [...prev, { action: 'redo', data: pageStructure }]);
      // Apply redo logic here
      setRedoStack(prev => prev.slice(0, -1));
      setUnsavedChanges(true);
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const { source, destination } = result;
    
    if (source.droppableId === 'widgets' && destination.droppableId.startsWith('section-')) {
      // Adding new widget
      const widget = availableWidgets.find(w => w.id === result.draggableId);
      const sectionId = destination.droppableId.replace('section-', '');
      
      if (widget) {
        const newElement = {
          id: `${widget.id}-${Date.now()}`,
          type: widget.id,
          content: widget.defaultContent,
          style: { ...widget.defaultStyle },
          position: { x: 0, y: 0 }
        };

        setPageStructure(prev => ({
          ...prev,
          sections: prev.sections.map(section => 
            section.id === sectionId 
              ? { ...section, elements: [...section.elements, newElement] }
              : section
          )
        }));

        addToUndoStack('add-widget');
        setUnsavedChanges(true);
      }
    } else if (source.droppableId.startsWith('section-') && destination.droppableId.startsWith('section-')) {
      // Moving element within or between sections
      const sourceSectionId = source.droppableId.replace('section-', '');
      const destSectionId = destination.droppableId.replace('section-', '');
      
      setPageStructure(prev => {
        const newStructure = { ...prev };
        const sourceSection = newStructure.sections.find(s => s.id === sourceSectionId);
        const destSection = newStructure.sections.find(s => s.id === destSectionId);
        
        const [movedElement] = sourceSection.elements.splice(source.index, 1);
        destSection.elements.splice(destination.index, 0, movedElement);
        
        return newStructure;
      });

      addToUndoStack('move-element');
      setUnsavedChanges(true);
    }
  };

  const selectElement = (element) => {
    setSelectedElement(element);
    setPropertiesPanel(true);
  };

  const updateElement = (elementId, updates) => {
    setPageStructure(prev => ({
      ...prev,
      sections: prev.sections.map(section => ({
        ...section,
        elements: section.elements.map(element => 
          element.id === elementId ? { ...element, ...updates } : element
        )
      }))
    }));
    setUnsavedChanges(true);
  };

  const deleteElement = (elementId) => {
    setPageStructure(prev => ({
      ...prev,
      sections: prev.sections.map(section => ({
        ...section,
        elements: section.elements.filter(element => element.id !== elementId)
      }))
    }));
    setSelectedElement(null);
    setUnsavedChanges(true);
  };

  const renderElement = (element) => {
    const baseStyle = {
      ...element.style,
      position: 'relative',
      cursor: selectedElement?.id === element.id ? 'pointer' : 'default',
      border: selectedElement?.id === element.id ? '2px solid #1976d2' : '2px solid transparent',
      padding: '8px',
      margin: '4px',
      minHeight: '40px'
    };

    switch (element.type) {
      case 'heading':
        return (
          <div style={baseStyle} onClick={() => selectElement(element)}>
            <h1 style={{ margin: 0, ...element.style }}>{element.content}</h1>
          </div>
        );
      case 'text':
        return (
          <div style={baseStyle} onClick={() => selectElement(element)}>
            <p style={{ margin: 0, ...element.style }}>{element.content}</p>
          </div>
        );
      case 'button':
        return (
          <div style={baseStyle} onClick={() => selectElement(element)}>
            <button style={{ ...element.style, border: 'none' }}>
              {element.content}
            </button>
          </div>
        );
      case 'image':
        return (
          <div style={baseStyle} onClick={() => selectElement(element)}>
            <img 
              src={element.content} 
              alt="Content" 
              style={{ ...element.style, maxWidth: '100%' }}
              onError={(e) => e.target.src = 'https://via.placeholder.com/400x300?text=Image'}
            />
          </div>
        );
      case 'video':
        return (
          <div style={baseStyle} onClick={() => selectElement(element)}>
            <video 
              controls 
              style={{ ...element.style, maxWidth: '100%' }}
              src={element.content}
            >
              Your browser does not support the video tag.
            </video>
          </div>
        );
      case 'card':
        return (
          <div style={baseStyle} onClick={() => selectElement(element)}>
            <Card style={{ ...element.style }}>
              <CardContent>{element.content}</CardContent>
            </Card>
          </div>
        );
      case 'form':
        return (
          <div style={baseStyle} onClick={() => selectElement(element)}>
            <form style={{ ...element.style }}>
              <TextField fullWidth label="Name" margin="normal" />
              <TextField fullWidth label="Email" margin="normal" />
              <TextField fullWidth multiline rows={3} label="Message" margin="normal" />
              <Button variant="contained" style={{ marginTop: '16px' }}>
                Send Message
              </Button>
            </form>
          </div>
        );
      case 'testimonial':
        return (
          <div style={baseStyle} onClick={() => selectElement(element)}>
            <div style={{ ...element.style }}>
              <Typography variant="body1" style={{ fontStyle: 'italic' }}>
                "{element.content}"
              </Typography>
              <Typography variant="subtitle2" style={{ marginTop: '8px', fontWeight: 'bold' }}>
                - Customer Name
              </Typography>
            </div>
          </div>
        );
      default:
        return (
          <div style={baseStyle} onClick={() => selectElement(element)}>
            <div style={{ ...element.style }}>{element.content}</div>
          </div>
        );
    }
  };

  const renderPropertiesPanel = () => (
    <Drawer
      anchor="right"
      open={propertiesPanel}
      onClose={() => setPropertiesPanel(false)}
      sx={{
        '& .MuiDrawer-paper': {
          width: 320,
          p: 2
        }
      }}
    >
      <Typography variant="h6" gutterBottom>
        Element Properties
      </Typography>
      
      {selectedElement ? (
        <Box>
          <TextField
            fullWidth
            label="Content"
            value={selectedElement.content}
            onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })}
            margin="normal"
            multiline
            rows={3}
          />

          <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
            Typography
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Font Size"
                value={selectedElement.style.fontSize || ''}
                onChange={(e) => updateElement(selectedElement.id, {
                  style: { ...selectedElement.style, fontSize: e.target.value }
                })}
                size="small"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Font Weight"
                value={selectedElement.style.fontWeight || ''}
                onChange={(e) => updateElement(selectedElement.id, {
                  style: { ...selectedElement.style, fontWeight: e.target.value }
                })}
                size="small"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Color"
                type="color"
                value={selectedElement.style.color || '#000000'}
                onChange={(e) => updateElement(selectedElement.id, {
                  style: { ...selectedElement.style, color: e.target.value }
                })}
                size="small"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Background Color"
                type="color"
                value={selectedElement.style.backgroundColor || '#ffffff'}
                onChange={(e) => updateElement(selectedElement.id, {
                  style: { ...selectedElement.style, backgroundColor: e.target.value }
                })}
                size="small"
              />
            </Grid>
          </Grid>

          <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
            Spacing
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Padding"
                value={selectedElement.style.padding || ''}
                onChange={(e) => updateElement(selectedElement.id, {
                  style: { ...selectedElement.style, padding: e.target.value }
                })}
                size="small"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Margin"
                value={selectedElement.style.margin || ''}
                onChange={(e) => updateElement(selectedElement.id, {
                  style: { ...selectedElement.style, margin: e.target.value }
                })}
                size="small"
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              color="error"
              fullWidth
              onClick={() => deleteElement(selectedElement.id)}
            >
              Delete Element
            </Button>
          </Box>
        </Box>
      ) : (
        <Typography color="text.secondary">
          Select an element to edit its properties
        </Typography>
      )}
    </Drawer>
  );

  const renderWidgetsPanel = () => (
    <Drawer
      anchor="left"
      open={widgetsPanel}
      onClose={() => setWidgetsPanel(false)}
      sx={{
        '& .MuiDrawer-paper': {
          width: 280,
          p: 2
        }
      }}
    >
      <Typography variant="h6" gutterBottom>
        Widgets
      </Typography>
      
      <Droppable droppableId="widgets" isDropDisabled={true}>
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef}>
            {availableWidgets.map((widget, index) => (
              <Draggable key={widget.id} draggableId={widget.id} index={index}>
                {(provided, snapshot) => (
                  <Card
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    sx={{
                      mb: 1,
                      cursor: 'grab',
                      '&:active': { cursor: 'grabbing' },
                      transform: snapshot.isDragging ? 'rotate(5deg)' : 'none'
                    }}
                  >
                    <CardContent sx={{ py: 1, px: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {widget.icon}
                        <Typography variant="body2" sx={{ ml: 1 }}>
                          {widget.name}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </Drawer>
  );

  const renderPreview = () => (
    <Box
      sx={{
        flex: 1,
        backgroundColor: '#f5f5f5',
        overflow: 'auto',
        position: 'relative',
        transform: `scale(${zoom / 100})`,
        transformOrigin: 'top left',
        minHeight: '100vh'
      }}
    >
      <Box
        sx={{
          maxWidth: deviceMode === 'mobile' ? '375px' : 
                    deviceMode === 'tablet' ? '768px' : '100%',
          margin: '0 auto',
          backgroundColor: 'white',
          minHeight: '100vh',
          boxShadow: deviceMode !== 'desktop' ? '0 0 20px rgba(0,0,0,0.1)' : 'none'
        }}
      >
        {pageStructure.sections.map((section) => (
          <Box key={section.id} sx={{ p: 2 }}>
            <Droppable droppableId={`section-${section.id}`}>
              {(provided, snapshot) => (
                <Box
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  sx={{
                    minHeight: '100px',
                    border: snapshot.isDraggingOver ? '2px dashed #1976d2' : '2px dashed transparent',
                    borderRadius: '8px',
                    p: 1
                  }}
                >
                  {section.elements.map((element, index) => (
                    <Draggable key={element.id} draggableId={element.id} index={index}>
                      {(provided, snapshot) => (
                        <Box
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          sx={{
                            transform: snapshot.isDragging ? 'rotate(5deg)' : 'none'
                          }}
                        >
                          {renderElement(element)}
                        </Box>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </Box>
              )}
            </Droppable>
          </Box>
        ))}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Toolbar */}
      <Box sx={{ 
        p: 2, 
        borderBottom: 1, 
        borderColor: 'divider',
        backgroundColor: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="h5">
          <BuildIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Visual Page Builder
        </Typography>
          
          <Chip 
            label={deviceMode} 
            size="small" 
            color="primary"
            icon={deviceMode === 'mobile' ? <MobileIcon /> : 
                  deviceMode === 'tablet' ? <TabletIcon /> : <DesktopIcon />}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => setZoom(Math.max(50, zoom - 10))}>
            <ZoomOutIcon />
          </IconButton>
          <Typography variant="body2" sx={{ minWidth: '60px', textAlign: 'center' }}>
            {zoom}%
          </Typography>
          <IconButton onClick={() => setZoom(Math.min(200, zoom + 10))}>
            <ZoomInIcon />
          </IconButton>
          
          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
          
          <IconButton 
            onClick={() => setDeviceMode('mobile')}
            color={deviceMode === 'mobile' ? 'primary' : 'default'}
          >
            <MobileIcon />
          </IconButton>
          <IconButton 
            onClick={() => setDeviceMode('tablet')}
            color={deviceMode === 'tablet' ? 'primary' : 'default'}
          >
            <TabletIcon />
          </IconButton>
          <IconButton 
            onClick={() => setDeviceMode('desktop')}
            color={deviceMode === 'desktop' ? 'primary' : 'default'}
          >
            <DesktopIcon />
          </IconButton>
          
          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
          
          <IconButton onClick={undo} disabled={undoStack.length === 0}>
            <UndoIcon />
          </IconButton>
          <IconButton onClick={redo} disabled={redoStack.length === 0}>
            <RedoIcon />
          </IconButton>
          
          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
          
          <Button
            variant="outlined"
            startIcon={<PreviewIcon />}
            onClick={() => setPreviewMode(!previewMode)}
          >
            {previewMode ? 'Edit Mode' : 'Preview'}
          </Button>
          
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={savePageStructure}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex' }}>
        <DragDropContext onDragEnd={handleDragEnd}>
          {renderWidgetsPanel()}
          
          <Box sx={{ flex: 1, position: 'relative' }}>
            {previewMode ? (
              <Box sx={{ height: '100%', overflow: 'auto' }}>
                {renderPreview()}
              </Box>
            ) : (
              <Box sx={{ height: '100%', overflow: 'auto' }}>
                {renderPreview()}
              </Box>
            )}
          </Box>
          
          {renderPropertiesPanel()}
        </DragDropContext>
      </Box>

      {/* Floating Action Buttons */}
      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setWidgetsPanel(!widgetsPanel)}
      >
        <BuildIcon />
      </Fab>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Box>
  );
} 