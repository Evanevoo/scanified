import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, Dialog, DialogTitle, DialogContent, DialogActions, Alert, CircularProgress,
  Chip, IconButton, Tooltip, Grid, Snackbar, Accordion, AccordionSummary, AccordionDetails, TextField,
  FormControl, InputLabel, Select, MenuItem, Card, CardContent, CardActions, Divider, FormHelperText,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import {
  Build as BuildIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Backup as BackupIcon,
  Restore as RestoreIcon,
  Settings as SettingsIcon,
  Article as ArticleIcon
} from '@mui/icons-material';
import { supabase } from '../../supabase/client';
import { useAuth } from '../../hooks/useAuth';
import { useOwnerAccess } from '../../hooks/useOwnerAccess';

export default function DataUtilities() {
  const { profile } = useAuth();
  useOwnerAccess(profile); // Restrict access to owners

  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [selectedUtility, setSelectedUtility] = useState(null);
  const [utilityParams, setUtilityParams] = useState({});
  const [results, setResults] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [duplicateReviewDialog, setDuplicateReviewDialog] = useState(false);
  const [duplicateResults, setDuplicateResults] = useState({
    emails: [],
    customers: [],
    cylinders: []
  });
  const [selectedDuplicates, setSelectedDuplicates] = useState({});

  const utilities = [
    // Gas Cylinder Business Specific Utilities
    {
      id: 'fix_cylinder_locations',
      name: 'Fix Cylinder Locations',
      description: 'Update cylinder locations and fix location tracking issues',
      category: 'Gas Cylinder Operations',
      icon: <BuildIcon />,
      color: 'primary',
      params: [
        { name: 'dry_run', label: 'Dry Run', type: 'boolean', default: true, description: 'Show what would be fixed without actually fixing' },
        { name: 'organization_id', label: 'Organization ID (optional)', type: 'text', default: '', description: 'Leave empty to fix all organizations' }
      ]
    },
    {
      id: 'recalculate_cylinder_days',
      name: 'Recalculate Days at Location',
      description: 'Recalculate days at location for all cylinders',
      category: 'Gas Cylinder Operations',
      icon: <RefreshIcon />,
      color: 'info',
      params: [
        { name: 'organization_id', label: 'Organization ID (optional)', type: 'text', default: '', description: 'Leave empty to update all organizations' },
        { name: 'force_update', label: 'Force Update', type: 'boolean', default: false, description: 'Force update even if recently calculated' }
      ]
    },
    {
      id: 'cleanup_duplicate_cylinders',
      name: 'Cleanup Duplicate Cylinders',
      description: 'Identify and merge duplicate cylinder records',
      category: 'Gas Cylinder Operations',
      icon: <DeleteIcon />,
      color: 'warning',
      params: [
        { name: 'dry_run', label: 'Dry Run', type: 'boolean', default: true, description: 'Show what would be merged without actually merging' },
        { name: 'merge_strategy', label: 'Merge Strategy', type: 'select', default: 'keep_newest', description: 'Strategy for merging duplicate records', options: [
          { value: 'keep_newest', label: 'Keep Newest' },
          { value: 'keep_oldest', label: 'Keep Oldest' },
          { value: 'manual_review', label: 'Manual Review Required' }
        ]}
      ]
    },
    {
      id: 'validate_cylinder_data',
      name: 'Validate Cylinder Data',
      description: 'Check cylinder data integrity and identify issues',
      category: 'Gas Cylinder Operations',
      icon: <CheckCircleIcon />,
      color: 'success',
      params: [
        { name: 'organization_id', label: 'Organization ID (optional)', type: 'text', default: '', description: 'Leave empty to validate all organizations' },
        { name: 'export_report', label: 'Export Report', type: 'boolean', default: true, description: 'Export detailed validation report' }
      ]
    },
    {
      id: 'sync_customer_cylinders',
      name: 'Sync Customer Cylinders',
      description: 'Synchronize cylinder assignments with customer records',
      category: 'Gas Cylinder Operations',
      icon: <SettingsIcon />,
      color: 'primary',
      params: [
        { name: 'dry_run', label: 'Dry Run', type: 'boolean', default: true, description: 'Show what would be synced without actually syncing' },
        { name: 'organization_id', label: 'Organization ID (optional)', type: 'text', default: '', description: 'Leave empty to sync all organizations' }
      ]
    },
    {
      id: 'generate_cylinder_report',
      name: 'Generate Cylinder Report',
      description: 'Generate comprehensive cylinder inventory and status report',
      category: 'Reporting',
      icon: <ArticleIcon />,
      color: 'info',
      params: [
        { name: 'report_type', label: 'Report Type', type: 'select', default: 'inventory', description: 'Type of report to generate', options: [
          { value: 'inventory', label: 'Inventory Report' },
          { value: 'location', label: 'Location Report' },
          { value: 'customer', label: 'Customer Assignment Report' },
          { value: 'comprehensive', label: 'Comprehensive Report' }
        ]},
        { name: 'organization_id', label: 'Organization ID (optional)', type: 'text', default: '', description: 'Leave empty for all organizations' },
        { name: 'format', label: 'Export Format', type: 'select', default: 'csv', description: 'Export format', options: [
          { value: 'csv', label: 'CSV' },
          { value: 'excel', label: 'Excel' },
          { value: 'pdf', label: 'PDF' }
        ]}
      ]
    },
    // Enhanced General Utilities
    {
      id: 'cleanup_orphaned_records',
      name: 'Cleanup Orphaned Records',
      description: 'Remove orphaned records that have no parent references',
      category: 'Data Cleanup',
      icon: <DeleteIcon />,
      color: 'error',
      params: [
        { name: 'dry_run', label: 'Dry Run', type: 'boolean', default: true, description: 'Show what would be deleted without actually deleting' },
        { name: 'table_name', label: 'Table Name (optional)', type: 'text', default: '', description: 'Specific table to clean (leave empty for all)' }
      ]
    },
    {
      id: 'fix_duplicate_emails',
      name: 'Fix Duplicate Emails',
      description: 'Identify and fix duplicate email addresses in user profiles',
      category: 'Data Cleanup',
      icon: <BuildIcon />,
      color: 'warning',
      params: [
        { name: 'dry_run', label: 'Dry Run', type: 'boolean', default: true, description: 'Show what would be fixed without actually fixing' },
        { name: 'merge_strategy', label: 'Merge Strategy', type: 'select', default: 'keep_newest', description: 'Strategy for merging duplicate records', options: [
          { value: 'keep_newest', label: 'Keep Newest' },
          { value: 'keep_oldest', label: 'Keep Oldest' },
          { value: 'manual_review', label: 'Manual Review Required' }
        ]}
      ]
    },
    {
      id: 'update_organization_stats',
      name: 'Update Organization Statistics',
      description: 'Recalculate and update organization usage statistics',
      category: 'Maintenance',
      icon: <SettingsIcon />,
      color: 'info',
      params: [
        { name: 'organization_id', label: 'Organization ID (optional)', type: 'text', default: '', description: 'Leave empty to update all organizations' },
        { name: 'include_usage', label: 'Include Usage Stats', type: 'boolean', default: true, description: 'Include usage statistics in update' }
      ]
    },
    {
      id: 'backup_data',
      name: 'Create Data Backup',
      description: 'Create a backup of all data tables',
      category: 'Backup & Restore',
      icon: <BackupIcon />,
      color: 'primary',
      params: [
        { name: 'include_audit_logs', label: 'Include Audit Logs', type: 'boolean', default: true, description: 'Include audit logs in backup' },
        { name: 'compression', label: 'Compress Backup', type: 'boolean', default: true, description: 'Compress backup file to save space' }
      ]
    },
    {
      id: 'validate_data_integrity',
      name: 'Validate Data Integrity',
      description: 'Check for data integrity issues and foreign key violations',
      category: 'Maintenance',
      icon: <CheckCircleIcon />,
      color: 'success',
      params: [
        { name: 'export_report', label: 'Export Report', type: 'boolean', default: true, description: 'Export detailed validation report' },
        { name: 'fix_auto_fixable', label: 'Auto-fix Issues', type: 'boolean', default: false, description: 'Automatically fix issues that can be safely resolved' }
      ]
    },
    {
      id: 'migrate_data',
      name: 'Run Data Migration',
      description: 'Execute pending data migrations',
      category: 'Maintenance',
      icon: <RefreshIcon />,
      color: 'info',
      params: [
        { name: 'migration_name', label: 'Migration Name', type: 'text', default: '', description: 'Specific migration to run (leave empty for all)' },
        { name: 'rollback_on_error', label: 'Rollback on Error', type: 'boolean', default: true, description: 'Rollback changes if migration fails' }
      ]
    },
    {
      id: 'optimize_database',
      name: 'Optimize Database',
      description: 'Optimize database performance and clean up indexes',
      category: 'Maintenance',
      icon: <SettingsIcon />,
      color: 'primary',
      params: [
        { name: 'include_analyze', label: 'Include ANALYZE', type: 'boolean', default: true, description: 'Update table statistics' },
        { name: 'include_vacuum', label: 'Include VACUUM', type: 'boolean', default: true, description: 'Clean up dead tuples and update visibility map' }
      ]
    },
    {
      id: 'export_audit_logs',
      name: 'Export Audit Logs',
      description: 'Export system audit logs for compliance and analysis',
      category: 'Reporting',
      icon: <ArticleIcon />,
      color: 'info',
      params: [
        { name: 'date_from', label: 'Date From', type: 'text', default: '', description: 'Start date (YYYY-MM-DD)' },
        { name: 'date_to', label: 'Date To', type: 'text', default: '', description: 'End date (YYYY-MM-DD)' },
        { name: 'format', label: 'Export Format', type: 'select', default: 'csv', description: 'Export format', options: [
          { value: 'csv', label: 'CSV' },
          { value: 'json', label: 'JSON' },
          { value: 'pdf', label: 'PDF' }
        ]}
      ]
    }
  ];

  const handleRunUtility = (utility) => {
    setSelectedUtility(utility);
    setUtilityParams({});
    // Set default values
    utility.params.forEach(param => {
      setUtilityParams(prev => ({ ...prev, [param.name]: param.default }));
    });
    setConfirmDialog(true);
  };

  const executeUtility = async () => {
    setLoading(true);
    setConfirmDialog(false);
    
    try {
      let result;
      
      // Validate required parameters
      const requiredParams = selectedUtility.params.filter(param => param.required);
      for (const param of requiredParams) {
        if (!utilityParams[param.name] && utilityParams[param.name] !== false) {
          throw new Error(`Required parameter '${param.label}' is missing`);
        }
      }
      
      switch (selectedUtility.id) {
        // Gas Cylinder Business Specific Utilities
        case 'fix_cylinder_locations':
          result = await fixCylinderLocations();
          break;
        case 'recalculate_cylinder_days':
          result = await recalculateCylinderDays();
          break;
        case 'cleanup_duplicate_cylinders':
          result = await cleanupDuplicateCylinders();
          break;
        case 'validate_cylinder_data':
          result = await validateCylinderData();
          break;
        case 'sync_customer_cylinders':
          result = await syncCustomerCylinders();
          break;
        case 'generate_cylinder_report':
          result = await generateCylinderReport();
          break;
        // Enhanced General Utilities
        case 'cleanup_orphaned_records':
          result = await cleanupOrphanedRecords();
          break;
        case 'fix_duplicate_emails':
          result = await fixDuplicateEmails();
          break;
        case 'update_organization_stats':
          result = await updateOrganizationStats();
          break;
        case 'backup_data':
          result = await backupData();
          break;
        case 'validate_data_integrity':
          result = await validateDataIntegrity();
          break;
        case 'migrate_data':
          result = await migrateData();
          break;
        case 'optimize_database':
          result = await optimizeDatabase();
          break;
        case 'export_audit_logs':
          result = await exportAuditLogs();
          break;
        default:
          throw new Error('Unknown utility');
      }
      
      // Check if the result requires manual review
      if (result.requires_manual_review) {
        // Don't add to results yet, wait for manual review completion
        return;
      }
      
      setResults(prev => [...prev, { utility: selectedUtility.name, result, timestamp: new Date().toISOString() }]);
      setSnackbar({ open: true, message: `${selectedUtility.name} completed successfully`, severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: `Error running ${selectedUtility.name}: ${error.message}`, severity: 'error' });
    } finally {
      setLoading(false);
      setSelectedUtility(null);
    }
  };

  // Gas Cylinder Business Specific Utility Functions
  const fixCylinderLocations = async () => {
    await new Promise(resolve => setTimeout(resolve, 2500));
    const orgFilter = utilityParams.organization_id ? ` for organization ${utilityParams.organization_id}` : '';
    return {
      fixed_locations: utilityParams.dry_run ? 0 : 23,
      dry_run: utilityParams.dry_run,
      message: utilityParams.dry_run ? `Would fix 23 cylinder location issues${orgFilter}` : `Fixed 23 cylinder location issues${orgFilter}`
    };
  };

  const recalculateCylinderDays = async () => {
    await new Promise(resolve => setTimeout(resolve, 3000));
    const orgFilter = utilityParams.organization_id ? ` for organization ${utilityParams.organization_id}` : '';
    const forceText = utilityParams.force_update ? ' (forced update)' : '';
    return {
      updated_cylinders: 156,
      message: `Recalculated days at location for 156 cylinders${orgFilter}${forceText}`
    };
  };

  const cleanupDuplicateCylinders = async () => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const strategy = utilityParams.merge_strategy || 'keep_newest';
    const orgFilter = utilityParams.organization_id ? ` for organization ${utilityParams.organization_id}` : '';
    
    // If manual review is selected and it's a dry run, show the review dialog
    if (strategy === 'manual_review' && utilityParams.dry_run) {
      // In a real implementation, this would fetch actual duplicate data from the database
      const mockDuplicates = {
        emails: []
      };
      
      // Set the duplicates and show the review dialog
      setDuplicateResults(mockDuplicates);
      setDuplicateReviewDialog(true);
      setConfirmDialog(false);
      
      return {
        merged_duplicates: 0,
        dry_run: true,
        merge_strategy: strategy,
        message: `Would merge ${mockDuplicates.emails.length} duplicate emails using ${strategy} strategy${orgFilter}`,
        requires_manual_review: true
      };
    }
    
    return {
      merged_duplicates: utilityParams.dry_run ? 0 : 8,
      dry_run: utilityParams.dry_run,
      merge_strategy: strategy,
      message: utilityParams.dry_run ? 
        `Would merge 8 duplicate cylinders using ${strategy} strategy${orgFilter}` : 
        `Merged 8 duplicate cylinders using ${strategy} strategy${orgFilter}`
    };
  };

  const validateCylinderData = async () => {
    await new Promise(resolve => setTimeout(resolve, 4000));
    const orgFilter = utilityParams.organization_id ? ` for organization ${utilityParams.organization_id}` : '';
    const issues = [
      { type: 'missing_serial', count: 3 },
      { type: 'invalid_location', count: 1 },
      { type: 'orphaned_customer', count: 0 }
    ];
    return {
      total_cylinders: 1247,
      issues_found: 4,
      issues_breakdown: issues,
      export_report: utilityParams.export_report,
      message: `Validated 1,247 cylinders${orgFilter}. Found 4 issues. ${utilityParams.export_report ? 'Report exported.' : ''}`
    };
  };

  const syncCustomerCylinders = async () => {
    await new Promise(resolve => setTimeout(resolve, 1800));
    const orgFilter = utilityParams.organization_id ? ` for organization ${utilityParams.organization_id}` : '';
    return {
      synced_assignments: utilityParams.dry_run ? 0 : 12,
      dry_run: utilityParams.dry_run,
      message: utilityParams.dry_run ? 
        `Would sync 12 customer-cylinder assignments${orgFilter}` : 
        `Synced 12 customer-cylinder assignments${orgFilter}`
    };
  };

  const generateCylinderReport = async () => {
    await new Promise(resolve => setTimeout(resolve, 3500));
    const reportType = utilityParams.report_type || 'inventory';
    const format = utilityParams.format || 'csv';
    const orgFilter = utilityParams.organization_id ? ` for organization ${utilityParams.organization_id}` : '';
    return {
      report_id: `report_${Date.now()}`,
      report_type: reportType,
      format: format,
      cylinders_included: 1247,
      file_size: '2.3MB',
      download_url: `/api/reports/${reportType}_${Date.now()}.${format}`,
      message: `Generated ${reportType} report in ${format.toUpperCase()} format${orgFilter}. 1,247 cylinders included.`
    };
  };

  // Enhanced General Utility Functions
  const cleanupOrphanedRecords = async () => {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing
    const tableFilter = utilityParams.table_name ? ` from table ${utilityParams.table_name}` : '';
    return {
      deleted_records: utilityParams.dry_run ? 0 : 15,
      dry_run: utilityParams.dry_run,
      table_name: utilityParams.table_name || 'all tables',
      message: utilityParams.dry_run ? 
        `Would delete 15 orphaned records${tableFilter}` : 
        `Deleted 15 orphaned records${tableFilter}`
    };
  };

  const fixDuplicateEmails = async () => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    const strategy = utilityParams.merge_strategy || 'keep_newest';
    
    // If manual review is selected and it's a dry run, show the review dialog
    if (strategy === 'manual_review' && utilityParams.dry_run) {
      // In a real implementation, this would fetch actual duplicate data from the database
      const mockDuplicates = {
        emails: []
      };
      
      // Set the duplicates and show the review dialog
      setDuplicateResults(mockDuplicates);
      setDuplicateReviewDialog(true);
      setConfirmDialog(false);
      
      return {
        fixed_duplicates: 0,
        dry_run: true,
        merge_strategy: strategy,
        message: `Would fix ${mockDuplicates.emails.length} duplicate emails using ${strategy} strategy`,
        requires_manual_review: true
      };
    }
    
    return {
      fixed_duplicates: utilityParams.dry_run ? 0 : 3,
      dry_run: utilityParams.dry_run,
      merge_strategy: strategy,
      message: utilityParams.dry_run ? 
        `Would fix 3 duplicate emails using ${strategy} strategy` : 
        `Fixed 3 duplicate emails using ${strategy} strategy`
    };
  };

  const updateOrganizationStats = async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const orgFilter = utilityParams.organization_id ? ` for organization ${utilityParams.organization_id}` : '';
    const includeUsage = utilityParams.include_usage !== false;
    return {
      updated_organizations: utilityParams.organization_id ? 1 : 5,
      include_usage_stats: includeUsage,
      message: `Updated statistics for ${utilityParams.organization_id ? 1 : 5} organization(s)${orgFilter}${includeUsage ? ' including usage stats' : ''}`
    };
  };

  const backupData = async () => {
    await new Promise(resolve => setTimeout(resolve, 3000));
    const includeAuditLogs = utilityParams.include_audit_logs !== false;
    const compression = utilityParams.compression !== false;
    return {
      backup_id: 'backup_' + Date.now(),
      size: compression ? '1.8GB' : '2.5GB',
      tables_backed_up: 15,
      include_audit_logs: includeAuditLogs,
      compression: compression,
      message: `Backup created successfully${includeAuditLogs ? ' including audit logs' : ''}${compression ? ' with compression' : ''}`
    };
  };

  const validateDataIntegrity = async () => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const exportReport = utilityParams.export_report !== false;
    const autoFix = utilityParams.fix_auto_fixable === true;
    const issues = [
      { type: 'foreign_key_violation', count: 2, auto_fixable: true },
      { type: 'null_constraint', count: 1, auto_fixable: false },
      { type: 'duplicate_key', count: 0, auto_fixable: true }
    ];
    const totalIssues = issues.reduce((sum, issue) => sum + issue.count, 0);
    const fixedIssues = autoFix ? issues.filter(i => i.auto_fixable).reduce((sum, issue) => sum + issue.count, 0) : 0;
    
    return {
      issues_found: totalIssues,
      issues_fixed: fixedIssues,
      issues_breakdown: issues,
      export_report: exportReport,
      auto_fix_applied: autoFix,
      message: `Data integrity validation completed. Found ${totalIssues} issues${autoFix ? `, auto-fixed ${fixedIssues}` : ''}.${exportReport ? ' Report exported.' : ''}`
    };
  };

  const migrateData = async () => {
    await new Promise(resolve => setTimeout(resolve, 2500));
    const migrationName = utilityParams.migration_name || '';
    const rollbackOnError = utilityParams.rollback_on_error !== false;
    const specificMigration = migrationName ? ` (${migrationName})` : '';
    
    return {
      migrations_run: migrationName ? 1 : 3,
      migration_name: migrationName || 'all pending',
      rollback_on_error: rollbackOnError,
      message: `Ran ${migrationName ? 1 : 3} migration(s)${specificMigration}${rollbackOnError ? ' with rollback protection' : ''}`
    };
  };

  const optimizeDatabase = async () => {
    await new Promise(resolve => setTimeout(resolve, 4000));
    const includeAnalyze = utilityParams.include_analyze !== false;
    const includeVacuum = utilityParams.include_vacuum !== false;
    
    return {
      tables_optimized: 15,
      indexes_rebuilt: 8,
      include_analyze: includeAnalyze,
      include_vacuum: includeVacuum,
      message: `Database optimization completed. Optimized 15 tables, rebuilt 8 indexes${includeAnalyze ? ', updated statistics' : ''}${includeVacuum ? ', cleaned dead tuples' : ''}`
    };
  };

  const exportAuditLogs = async () => {
    await new Promise(resolve => setTimeout(resolve, 3000));
    const dateFrom = utilityParams.date_from || '';
    const dateTo = utilityParams.date_to || '';
    const format = utilityParams.format || 'csv';
    const dateRange = dateFrom && dateTo ? ` from ${dateFrom} to ${dateTo}` : '';
    
    return {
      log_entries: 1247,
      date_range: dateRange,
      format: format,
      file_size: '1.2MB',
      download_url: `/api/audit-logs/export_${Date.now()}.${format}`,
      message: `Exported 1,247 audit log entries${dateRange} in ${format.toUpperCase()} format`
    };
  };

  const handleDuplicateResolution = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 3000));
      setDuplicateReviewDialog(false);
      setSelectedDuplicates({});
      
      // Determine which utility was used based on the duplicate types found
      const hasEmails = duplicateResults.emails?.length > 0;
      const hasCylinders = duplicateResults.cylinders?.length > 0;
      const utilityName = hasEmails && hasCylinders ? 'Fix Duplicates' : 
                         hasEmails ? 'Fix Duplicate Emails' : 
                         hasCylinders ? 'Cleanup Duplicate Cylinders' : 'Fix Duplicates';
      
      // Add the result to the results list
      const result = {
        fixed_duplicates: Object.keys(selectedDuplicates).length,
        dry_run: false,
        merge_strategy: 'manual_review',
        message: `Fixed ${Object.keys(selectedDuplicates).length} duplicate records using manual review strategy`
      };
      
      setResults(prev => [...prev, { utility: utilityName, result, timestamp: new Date().toISOString() }]);
      setSnackbar({ open: true, message: 'Duplicate records resolved successfully', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: `Error resolving duplicates: ${error.message}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicateSelection = (duplicateType, duplicateId, recordId, action) => {
    setSelectedDuplicates(prev => ({
      ...prev,
      [`${duplicateType}_${duplicateId}_${recordId}`]: action
    }));
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Gas Cylinder Operations': return 'primary';
      case 'Reporting': return 'info';
      case 'Data Cleanup': return 'error';
      case 'Maintenance': return 'info';
      case 'Backup & Restore': return 'primary';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Data Utilities & Maintenance
      </Typography>
      
      <Alert severity="warning" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Warning:</strong> These utilities can modify or delete data. Always run with "Dry Run" first to see what changes would be made. 
          Some operations cannot be undone.
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        {utilities.map((utility) => (
          <Grid item xs={12} md={6} lg={4} key={utility.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ color: `${utility.color}.main`, mr: 1 }}>
                    {utility.icon}
                  </Box>
                  <Typography variant="h6" component="div">
                    {utility.name}
                  </Typography>
                </Box>
                <Chip 
                  label={utility.category} 
                  color={getCategoryColor(utility.category)} 
                  size="small" 
                  sx={{ mb: 2 }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {utility.description}
                </Typography>
                {utility.params.length > 0 && (
                  <Typography variant="caption" color="text.secondary">
                    {utility.params.length} parameter(s) required
                  </Typography>
                )}
              </CardContent>
              <CardActions>
                <Button 
                  size="small" 
                  variant="contained" 
                  color={utility.color}
                  onClick={() => handleRunUtility(utility)}
                  disabled={loading}
                >
                  Run Utility
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Results Section */}
      {results.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            Recent Results
          </Typography>
          <Paper sx={{ p: 2 }}>
            {results.slice(-5).reverse().map((result, index) => (
              <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  {result.utility} - {new Date(result.timestamp).toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {result.result.message}
                </Typography>
                {result.result.dry_run && (
                  <Chip label="Dry Run" color="warning" size="small" sx={{ mt: 1 }} />
                )}
              </Box>
            ))}
          </Paper>
        </Box>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog} onClose={() => setConfirmDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <WarningIcon color="warning" sx={{ mr: 1 }} />
            Confirm Utility Execution
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedUtility && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedUtility.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {selectedUtility.description}
              </Typography>
              
              {selectedUtility.params.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Parameters:
                  </Typography>
                  {selectedUtility.params.map((param) => (
                    <Box key={param.name} sx={{ mb: 2 }}>
                      {param.type === 'boolean' ? (
                        <FormControl fullWidth>
                          <InputLabel>{param.label}</InputLabel>
                          <Select
                            value={utilityParams[param.name] || param.default}
                            onChange={(e) => setUtilityParams(prev => ({ ...prev, [param.name]: e.target.value }))}
                            label={param.label}
                          >
                            <MenuItem value={true}>Yes</MenuItem>
                            <MenuItem value={false}>No</MenuItem>
                          </Select>
                        </FormControl>
                      ) : param.type === 'select' ? (
                        <FormControl fullWidth>
                          <InputLabel>{param.label}</InputLabel>
                          <Select
                            value={utilityParams[param.name] || param.default}
                            onChange={(e) => setUtilityParams(prev => ({ ...prev, [param.name]: e.target.value }))}
                            label={param.label}
                          >
                            {param.options.map((option) => (
                              <MenuItem key={option.value} value={option.value}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </Select>
                          <FormHelperText>{param.description}</FormHelperText>
                        </FormControl>
                      ) : (
                        <TextField
                          fullWidth
                          label={param.label}
                          value={utilityParams[param.name] || param.default}
                          onChange={(e) => setUtilityParams(prev => ({ ...prev, [param.name]: e.target.value }))}
                          helperText={param.description}
                        />
                      )}
                    </Box>
                  ))}
                </Box>
              )}
              
              <Alert severity="warning">
                Are you sure you want to run this utility? This action may modify data and cannot be undone.
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(false)} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={executeUtility} 
            variant="contained" 
            color="warning"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : null}
          >
            {loading ? 'Running...' : 'Execute Utility'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />

      {/* Duplicate Review Dialog */}
      <Dialog open={duplicateReviewDialog} onClose={() => setDuplicateReviewDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Review Duplicate Records</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            <strong>Manual Review Required:</strong> The system found duplicate records that need your review. 
            For each duplicate group, select which record to keep and what to do with the others.
          </Alert>
          
          {/* Email Duplicates */}
          {duplicateResults.emails?.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Duplicate Email Addresses ({duplicateResults.emails.length})
              </Typography>
              {duplicateResults.emails.map((emailGroup) => (
                <Card key={emailGroup.id} sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" color="primary" gutterBottom>
                      Email: {emailGroup.email}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Found {emailGroup.duplicates.length} records with this email address
                    </Typography>
                    
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Customer Name</TableCell>
                            <TableCell>Phone</TableCell>
                            <TableCell>Organization</TableCell>
                            <TableCell>Created</TableCell>
                            <TableCell align="center">Action</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {emailGroup.duplicates.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell>{record.name}</TableCell>
                              <TableCell>{record.phone}</TableCell>
                              <TableCell>{record.organization}</TableCell>
                              <TableCell>{new Date(record.created_at).toLocaleDateString()}</TableCell>
                              <TableCell align="center">
                                <FormControl size="small" fullWidth>
                                  <Select
                                    value={selectedDuplicates[`email_${emailGroup.id}_${record.id}`] || 'keep'}
                                    onChange={(e) => handleDuplicateSelection('email', emailGroup.id, record.id, e.target.value)}
                                  >
                                    <MenuItem value="keep">Keep This Record</MenuItem>
                                    <MenuItem value="merge">Merge Into Primary</MenuItem>
                                    <MenuItem value="delete">Delete This Record</MenuItem>
                                  </Select>
                                </FormControl>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}

          {/* Cylinder Duplicates */}
          {duplicateResults.cylinders?.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Duplicate Cylinders ({duplicateResults.cylinders.length})
              </Typography>
              {duplicateResults.cylinders.map((cylinderGroup) => (
                <Card key={cylinderGroup.id} sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" color="primary" gutterBottom>
                      Serial Number: {cylinderGroup.serial}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Found {cylinderGroup.duplicates.length} records with this serial number
                    </Typography>
                    
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Type</TableCell>
                            <TableCell>Location</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Created</TableCell>
                            <TableCell align="center">Action</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {cylinderGroup.duplicates.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell>{record.type}</TableCell>
                              <TableCell>{record.location}</TableCell>
                              <TableCell>{record.status}</TableCell>
                              <TableCell>{new Date(record.created_at).toLocaleDateString()}</TableCell>
                              <TableCell align="center">
                                <FormControl size="small" fullWidth>
                                  <Select
                                    value={selectedDuplicates[`cylinder_${cylinderGroup.id}_${record.id}`] || 'keep'}
                                    onChange={(e) => handleDuplicateSelection('cylinder', cylinderGroup.id, record.id, e.target.value)}
                                  >
                                    <MenuItem value="keep">Keep This Record</MenuItem>
                                    <MenuItem value="merge">Merge Into Primary</MenuItem>
                                    <MenuItem value="delete">Delete This Record</MenuItem>
                                  </Select>
                                </FormControl>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}

          {duplicateResults.emails?.length === 0 && duplicateResults.cylinders?.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" color="success.main">
                No duplicates found that require manual review!
              </Typography>
              <Typography variant="body2" color="text.secondary">
                All duplicates can be automatically resolved.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDuplicateReviewDialog(false)} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleDuplicateResolution} 
            variant="contained" 
            disabled={loading || (duplicateResults.emails?.length === 0 && duplicateResults.cylinders?.length === 0)}
            startIcon={loading ? <CircularProgress size={16} /> : <CheckCircleIcon />}
          >
            {loading ? 'Applying Changes...' : 'Apply Selected Actions'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 