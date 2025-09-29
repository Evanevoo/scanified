import React, { useState } from 'react';
import { supabase } from '../../supabase/client';
import { useAuth } from '../../hooks/useAuth';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip
} from '@mui/material';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SecurityIcon from '@mui/icons-material/Security';
import BackupIcon from '@mui/icons-material/Backup';

export default function OrganizationBackup() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [backupStats, setBackupStats] = useState(null);

  const createBackup = async () => {
    if (!profile?.organization_id) {
      setMessage({ type: 'error', text: 'No organization found' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // Get backup statistics
      const { data: stats, error: statsError } = await supabase
        .rpc('backup_organization_data', { org_id: profile.organization_id });

      if (statsError) throw statsError;
      setBackupStats(stats);

      // Export customers
      const { data: customers, error: customersError } = await supabase
        .rpc('export_organization_customers', { org_id: profile.organization_id });

      if (customersError) throw customersError;

      // Export bottles  
      const { data: bottles, error: bottlesError } = await supabase
        .rpc('export_organization_bottles', { org_id: profile.organization_id });

      if (bottlesError) throw bottlesError;

      // Create backup file
      const backupData = {
        organization_id: profile.organization_id,
        backup_timestamp: new Date().toISOString(),
        customers: customers || [],
        bottles: bottles || [],
        stats: stats || []
      };

      // Download as JSON file
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `organization_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage({ 
        type: 'success', 
        text: 'Backup created successfully! File downloaded to your computer.' 
      });

    } catch (error) {
      console.error('Backup error:', error);
      setMessage({ 
        type: 'error', 
        text: `Backup failed: ${error.message}` 
      });
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = async (dataType) => {
    if (!profile?.organization_id) {
      setMessage({ type: 'error', text: 'No organization found' });
      return;
    }

    setLoading(true);
    try {
      let data, filename;
      
      if (dataType === 'customers') {
        const { data: customers, error } = await supabase
          .rpc('export_organization_customers', { org_id: profile.organization_id });
        if (error) throw error;
        data = customers;
        filename = `customers_${new Date().toISOString().slice(0, 10)}.csv`;
      } else if (dataType === 'bottles') {
        const { data: bottles, error } = await supabase
          .rpc('export_organization_bottles', { org_id: profile.organization_id });
        if (error) throw error;
        data = bottles;
        filename = `bottles_${new Date().toISOString().slice(0, 10)}.csv`;
      }

      if (!data || data.length === 0) {
        setMessage({ type: 'warning', text: `No ${dataType} found to export` });
        return;
      }

      // Convert to CSV
      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => 
            `"${(row[header] || '').toString().replace(/"/g, '""')}"`
          ).join(',')
        )
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage({ 
        type: 'success', 
        text: `${dataType} exported successfully!` 
      });

    } catch (error) {
      console.error('Export error:', error);
      setMessage({ 
        type: 'error', 
        text: `Export failed: ${error.message}` 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" fontWeight={800} color="primary" mb={3}>
        <BackupIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
        Organization Backup & Security
      </Typography>

      {message && (
        <Alert severity={message.type} sx={{ mb: 3 }}>
          {message.text}
        </Alert>
      )}

      {/* Data Isolation Info */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <SecurityIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Data Privacy & Isolation
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Your organization's data is completely isolated from other organizations. 
            All backups contain only your data and cannot be accessed by other users.
          </Typography>
          <List dense>
            <ListItem>
              <ListItemIcon><Chip label="✓" color="success" size="small" /></ListItemIcon>
              <ListItemText primary="Row-Level Security (RLS) enabled" />
            </ListItem>
            <ListItem>
              <ListItemIcon><Chip label="✓" color="success" size="small" /></ListItemIcon>
              <ListItemText primary="Organization-specific data isolation" />
            </ListItem>
            <ListItem>
              <ListItemIcon><Chip label="✓" color="success" size="small" /></ListItemIcon>
              <ListItemText primary="Encrypted data transmission" />
            </ListItem>
          </List>
        </CardContent>
      </Card>

      {/* Backup Stats */}
      {backupStats && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Backup Summary</Typography>
            {backupStats.map((stat, index) => (
              <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>{stat.table_name}</Typography>
                <Chip label={`${stat.record_count} records`} size="small" />
              </Box>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Backup Actions */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Backup & Export Options
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<CloudDownloadIcon />}
              onClick={createBackup}
              disabled={loading}
              size="large"
            >
              {loading ? <CircularProgress size={20} /> : 'Create Complete Backup'}
            </Button>

            <Divider />

            <Typography variant="subtitle2" color="text.secondary">
              Export Specific Data:
            </Typography>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={() => exportCSV('customers')}
                disabled={loading}
              >
                Export Customers (CSV)
              </Button>
              
              <Button
                variant="outlined"
                onClick={() => exportCSV('bottles')}
                disabled={loading}
              >
                Export Bottles (CSV)
              </Button>
            </Box>
          </Box>

          <Alert severity="info" sx={{ mt: 3 }}>
            <strong>Backup Recommendations:</strong>
            <ul>
              <li>Create backups regularly (weekly/monthly)</li>
              <li>Store backup files in a secure location</li>
              <li>Test restore procedures periodically</li>
              <li>Keep multiple backup versions</li>
            </ul>
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
}
