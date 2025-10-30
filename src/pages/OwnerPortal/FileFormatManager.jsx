import logger from '../../utils/logger';
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tabs,
  Tab,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  FormControlLabel,
  Divider,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileCopy as FileIcon,
  Settings as SettingsIcon,
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
  Visibility as PreviewIcon,
  CheckCircle as ValidIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  Code as CodeIcon,
  TableChart as TableIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../supabase/client';

const FILE_TYPES = [
  { value: 'csv', label: 'CSV (Comma Separated)', extension: '.csv', mimeType: 'text/csv' },
  { value: 'tsv', label: 'TSV (Tab Separated)', extension: '.tsv', mimeType: 'text/tab-separated-values' },
  { value: 'xlsx', label: 'Excel (.xlsx)', extension: '.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  { value: 'xls', label: 'Excel (.xls)', extension: '.xls', mimeType: 'application/vnd.ms-excel' },
  { value: 'txt', label: 'Text File', extension: '.txt', mimeType: 'text/plain' },
  { value: 'json', label: 'JSON', extension: '.json', mimeType: 'application/json' },
  { value: 'xml', label: 'XML', extension: '.xml', mimeType: 'application/xml' }
];

const IMPORT_CATEGORIES = [
  { value: 'assets', label: 'Assets/Inventory', description: 'Asset information, inventory data' },
  { value: 'customers', label: 'Customers', description: 'Customer information, contacts' },
  { value: 'invoices', label: 'Invoices', description: 'Invoice data, billing information' },
  { value: 'sales_receipts', label: 'Sales Receipts', description: 'Sales transaction data' },
  { value: 'maintenance', label: 'Maintenance', description: 'Maintenance records, schedules' },
  { value: 'compliance', label: 'Compliance', description: 'Compliance records, certifications' },
  { value: 'custom', label: 'Custom', description: 'Organization-specific data' }
];

const VALIDATION_TYPES = [
  { value: 'required', label: 'Required Field', description: 'Field must not be empty' },
  { value: 'unique', label: 'Unique Value', description: 'Value must be unique across records' },
  { value: 'regex', label: 'Pattern Match', description: 'Value must match regex pattern' },
  { value: 'numeric', label: 'Numeric Only', description: 'Value must be a number' },
  { value: 'date', label: 'Date Format', description: 'Value must be a valid date' },
  { value: 'email', label: 'Email Format', description: 'Value must be a valid email' },
  { value: 'length', label: 'Length Constraint', description: 'Value length must be within range' }
];

export default function FileFormatManager() {
  const { organization, profile } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [formats, setFormats] = useState([]);
  const [selectedFormat, setSelectedFormat] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewData, setPreviewData] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    fileTypes: [],
    delimiter: ',',
    hasHeader: true,
    encoding: 'utf-8',
    columnMappings: [],
    validationRules: [],
    transformations: [],
    isActive: true
  });

  useEffect(() => {
    loadFileFormats();
  }, [organization]);

  const loadFileFormats = async () => {
    try {
      const { data, error } = await supabase
        .from('file_formats')
        .select('*')
        .eq('organization_id', organization?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFormats(data || []);
    } catch (error) {
      logger.error('Error loading file formats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFormat = async () => {
    try {
      const formatData = {
        ...formData,
        organization_id: organization?.id,
        created_by: profile?.id,
        updated_at: new Date().toISOString()
      };

      let result;
      if (editMode && selectedFormat) {
        const { data, error } = await supabase
          .from('file_formats')
          .update(formatData)
          .eq('id', selectedFormat.id)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      } else {
        const { data, error } = await supabase
          .from('file_formats')
          .insert([formatData])
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      }

      await loadFileFormats();
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      logger.error('Error saving file format:', error);
      alert('Error saving file format: ' + error.message);
    }
  };

  const handleDeleteFormat = async (formatId) => {
    if (!confirm('Are you sure you want to delete this file format?')) return;

    try {
      const { error } = await supabase
        .from('file_formats')
        .delete()
        .eq('id', formatId);

      if (error) throw error;
      await loadFileFormats();
    } catch (error) {
      logger.error('Error deleting file format:', error);
      alert('Error deleting file format: ' + error.message);
    }
  };

  const handleEditFormat = (format) => {
    setSelectedFormat(format);
    setFormData({
      name: format.name,
      description: format.description,
      category: format.category,
      fileTypes: format.file_types || [],
      delimiter: format.delimiter || ',',
      hasHeader: format.has_header !== false,
      encoding: format.encoding || 'utf-8',
      columnMappings: format.column_mappings || [],
      validationRules: format.validation_rules || [],
      transformations: format.transformations || [],
      isActive: format.is_active !== false
    });
    setEditMode(true);
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      fileTypes: [],
      delimiter: ',',
      hasHeader: true,
      encoding: 'utf-8',
      columnMappings: [],
      validationRules: [],
      transformations: [],
      isActive: true
    });
    setSelectedFormat(null);
    setEditMode(false);
  };

  const addColumnMapping = () => {
    setFormData(prev => ({
      ...prev,
      columnMappings: [
        ...prev.columnMappings,
        {
          sourceColumn: '',
          targetField: '',
          dataType: 'string',
          required: false,
          defaultValue: '',
          description: ''
        }
      ]
    }));
  };

  const updateColumnMapping = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      columnMappings: prev.columnMappings.map((mapping, i) =>
        i === index ? { ...mapping, [field]: value } : mapping
      )
    }));
  };

  const removeColumnMapping = (index) => {
    setFormData(prev => ({
      ...prev,
      columnMappings: prev.columnMappings.filter((_, i) => i !== index)
    }));
  };

  const addValidationRule = () => {
    setFormData(prev => ({
      ...prev,
      validationRules: [
        ...prev.validationRules,
        {
          field: '',
          type: 'required',
          value: '',
          message: '',
          enabled: true
        }
      ]
    }));
  };

  const updateValidationRule = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      validationRules: prev.validationRules.map((rule, i) =>
        i === index ? { ...rule, [field]: value } : rule
      )
    }));
  };

  const removeValidationRule = (index) => {
    setFormData(prev => ({
      ...prev,
      validationRules: prev.validationRules.filter((_, i) => i !== index)
    }));
  };

  const generateSampleFile = (format) => {
    let sampleContent = '';
    
    if (format.has_header && format.column_mappings?.length) {
      const headers = format.column_mappings.map(m => m.sourceColumn).join(format.delimiter);
      const sampleRow = format.column_mappings.map(m => m.defaultValue || 'SampleValue').join(format.delimiter);
      sampleContent = headers + '\n' + sampleRow;
    } else {
      sampleContent = 'SampleValue1,SampleValue2,SampleValue3';
    }

    setPreviewData(sampleContent);
    setSelectedFormat(format);
    setPreviewDialogOpen(true);
  };

  const downloadSampleFile = () => {
    const blob = new Blob([previewData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedFormat.name}_sample.${selectedFormat.file_types[0] || 'csv'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Box p={3}>
        <Typography variant="h4" gutterBottom>
          File Format Manager
        </Typography>
        <Typography>Loading file formats...</Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            File Format Manager
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Configure custom file formats for your organization's data imports
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            resetForm();
            setDialogOpen(true);
          }}
        >
          Create Format
        </Button>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="File Formats" />
          {/* <Tab label="Import Templates" />
          <Tab label="Validation Rules" /> */}
        </Tabs>
      </Paper>

      {/* File Formats Tab */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {formats.map((format) => (
            <Grid item xs={12} md={6} lg={4} key={format.id}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <FileIcon color={format.is_active ? 'primary' : 'disabled'} />
                    <Box flex={1}>
                      <Typography variant="h6">{format.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {format.category} • {format.file_types?.join(', ')}
                      </Typography>
                    </Box>
                    <Chip
                      label={format.is_active ? 'Active' : 'Inactive'}
                      color={format.is_active ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    {format.description}
                  </Typography>

                  <Box mb={2}>
                    <Typography variant="caption" display="block">
                      Columns: {format.column_mappings?.length || 0}
                    </Typography>
                    <Typography variant="caption" display="block">
                      Validations: {format.validation_rules?.length || 0}
                    </Typography>
                  </Box>
                </CardContent>
                
                <CardActions>
                  <Button
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => handleEditFormat(format)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="small"
                    startIcon={<PreviewIcon />}
                    onClick={() => generateSampleFile(format)}
                  >
                    Sample
                  </Button>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDeleteFormat(format.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
          
          {formats.length === 0 && (
            <Grid item xs={12}>
              <Alert severity="info">
                No file formats configured yet. Create your first custom file format to get started.
              </Alert>
            </Grid>
          )}
        </Grid>
      )}

      {/* Create/Edit Format Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editMode ? 'Edit File Format' : 'Create File Format'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Basic Information */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Format Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Customer Import Format"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  label="Category"
                >
                  {IMPORT_CATEGORIES.map((cat) => (
                    <MenuItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what this format is used for..."
              />
            </Grid>

            {/* File Settings */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>File Settings</Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Supported File Types</InputLabel>
                <Select
                  multiple
                  value={formData.fileTypes}
                  onChange={(e) => setFormData({ ...formData, fileTypes: e.target.value })}
                  label="Supported File Types"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value.toUpperCase()} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {FILE_TYPES.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Delimiter"
                value={formData.delimiter}
                onChange={(e) => setFormData({ ...formData, delimiter: e.target.value })}
                placeholder=","
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Encoding</InputLabel>
                <Select
                  value={formData.encoding}
                  onChange={(e) => setFormData({ ...formData, encoding: e.target.value })}
                  label="Encoding"
                >
                  <MenuItem value="utf-8">UTF-8</MenuItem>
                  <MenuItem value="utf-16">UTF-16</MenuItem>
                  <MenuItem value="iso-8859-1">ISO-8859-1</MenuItem>
                  <MenuItem value="windows-1252">Windows-1252</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.hasHeader}
                    onChange={(e) => setFormData({ ...formData, hasHeader: e.target.checked })}
                  />
                }
                label="File has header row"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                }
                label="Active format"
              />
            </Grid>

            {/* Column Mappings */}
            <Grid item xs={12}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Column Mappings</Typography>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={addColumnMapping}
                >
                  Add Column
                </Button>
              </Box>
              
              {formData.columnMappings.map((mapping, index) => (
                <Paper key={index} sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Source Column"
                        value={mapping.sourceColumn}
                        onChange={(e) => updateColumnMapping(index, 'sourceColumn', e.target.value)}
                        placeholder="Column name in file"
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Target Field"
                        value={mapping.targetField}
                        onChange={(e) => updateColumnMapping(index, 'targetField', e.target.value)}
                        placeholder="Database field name"
                      />
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Data Type</InputLabel>
                        <Select
                          value={mapping.dataType}
                          onChange={(e) => updateColumnMapping(index, 'dataType', e.target.value)}
                          label="Data Type"
                        >
                          <MenuItem value="string">String</MenuItem>
                          <MenuItem value="number">Number</MenuItem>
                          <MenuItem value="date">Date</MenuItem>
                          <MenuItem value="boolean">Boolean</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Default Value"
                        value={mapping.defaultValue}
                        onChange={(e) => updateColumnMapping(index, 'defaultValue', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} md={1}>
                      <Switch
                        checked={mapping.required}
                        onChange={(e) => updateColumnMapping(index, 'required', e.target.checked)}
                      />
                    </Grid>
                    <Grid item xs={12} md={1}>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => removeColumnMapping(index)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Grid>
                  </Grid>
                </Paper>
              ))}
            </Grid>

            {/* Validation Rules */}
            <Grid item xs={12}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Validation Rules</Typography>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={addValidationRule}
                >
                  Add Rule
                </Button>
              </Box>
              
              {formData.validationRules.map((rule, index) => (
                <Paper key={index} sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Field"
                        value={rule.field}
                        onChange={(e) => updateValidationRule(index, 'field', e.target.value)}
                        placeholder="Field to validate"
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Validation Type</InputLabel>
                        <Select
                          value={rule.type}
                          onChange={(e) => updateValidationRule(index, 'type', e.target.value)}
                          label="Validation Type"
                        >
                          {VALIDATION_TYPES.map((type) => (
                            <MenuItem key={type.value} value={type.value}>
                              {type.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Value/Pattern"
                        value={rule.value}
                        onChange={(e) => updateValidationRule(index, 'value', e.target.value)}
                        placeholder="Validation value"
                      />
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Error Message"
                        value={rule.message}
                        onChange={(e) => updateValidationRule(index, 'message', e.target.value)}
                        placeholder="Custom error message"
                      />
                    </Grid>
                    <Grid item xs={12} md={1}>
                      <Switch
                        checked={rule.enabled}
                        onChange={(e) => updateValidationRule(index, 'enabled', e.target.checked)}
                      />
                    </Grid>
                    <Grid item xs={12} md={1}>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => removeValidationRule(index)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Grid>
                  </Grid>
                </Paper>
              ))}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSaveFormat}
            variant="contained"
            disabled={!formData.name || !formData.category}
          >
            {editMode ? 'Update' : 'Create'} Format
          </Button>
        </DialogActions>
      </Dialog>

      {/* Sample File Preview Dialog */}
      <Dialog open={previewDialogOpen} onClose={() => setPreviewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Sample File Preview - {selectedFormat?.name}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            This is a sample file based on your format configuration:
          </Typography>
          <Paper sx={{ p: 2, bgcolor: 'grey.50', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
            {previewData}
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialogOpen(false)}>Close</Button>
          <Button
            onClick={downloadSampleFile}
            variant="contained"
            startIcon={<DownloadIcon />}
          >
            Download Sample
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 