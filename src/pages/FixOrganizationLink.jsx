import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Divider,
  Chip
} from '@mui/material';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';

export default function FixOrganizationLink() {
  const { user, profile, organization, loading } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [fixing, setFixing] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  const [diagnosticInfo, setDiagnosticInfo] = useState(null);

  useEffect(() => {
    if (user) {
      fetchDiagnosticInfo();
      fetchOrganizations();
    }
  }, [user]);

  const fetchDiagnosticInfo = async () => {
    if (!user) return;

    try {
      // Get current profile info
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // Get organization info if linked
      let orgData = null;
      if (profileData?.organization_id) {
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', profileData.organization_id)
          .single();
        
        if (!orgError) {
          orgData = org;
        }
      }

      setDiagnosticInfo({
        profile: profileData,
        organization: orgData,
        profileError,
        hasOrganizationLink: !!profileData?.organization_id,
        organizationExists: !!orgData
      });

    } catch (error) {
      console.error('Error fetching diagnostic info:', error);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, slug, subscription_status, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error) {
      console.error('Error fetching organizations:', error);
    }
  };

  const handleFixLink = async () => {
    if (!selectedOrgId || !user) return;

    setFixing(true);
    setMessage('');

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ organization_id: selectedOrgId })
        .eq('id', user.id);

      if (error) throw error;

      setMessage('✅ Successfully linked your profile to the organization! Please refresh the page.');
      setMessageType('success');
      
      // Refresh diagnostic info
      await fetchDiagnosticInfo();

    } catch (error) {
      setMessage(`❌ Error linking to organization: ${error.message}`);
      setMessageType('error');
    } finally {
      setFixing(false);
    }
  };

  const handleCreateAndLink = async () => {
    setFixing(true);
    setMessage('');

    try {
      // Create a new organization
      const orgName = `${user.email.split('@')[0]}'s Organization`;
      const orgSlug = orgName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: orgName,
          slug: orgSlug,
          subscription_status: 'trial',
          subscription_plan: 'starter',
          trial_end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Link profile to new organization
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          organization_id: newOrg.id,
          role: 'admin' // Make them admin of their own org
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      setMessage(`✅ Created new organization "${orgName}" and linked your profile! Please refresh the page.`);
      setMessageType('success');
      
      // Refresh data
      await fetchDiagnosticInfo();
      await fetchOrganizations();

    } catch (error) {
      setMessage(`❌ Error creating organization: ${error.message}`);
      setMessageType('error');
    } finally {
      setFixing(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return (
      <Alert severity="warning">
        Please log in to use this tool.
      </Alert>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        🔧 Fix Organization Link
      </Typography>
      
      <Typography variant="body1" color="text.secondary" gutterBottom>
        This tool helps fix issues where your user profile is not properly linked to an organization.
      </Typography>

      {message && (
        <Alert severity={messageType} sx={{ mb: 3 }}>
          {message}
        </Alert>
      )}

      {/* Diagnostic Information */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            📊 Current Status
          </Typography>
          
          {diagnosticInfo && (
            <Box>
              <Typography variant="body2" gutterBottom>
                <strong>User Email:</strong> {user.email}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>User ID:</strong> {user.id}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Profile Exists:</strong> {diagnosticInfo.profile ? '✅ Yes' : '❌ No'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Organization Link:</strong> {diagnosticInfo.hasOrganizationLink ? '✅ Linked' : '❌ Not Linked'}
              </Typography>
              {diagnosticInfo.organization && (
                <Typography variant="body2" gutterBottom>
                  <strong>Organization:</strong> {diagnosticInfo.organization.name}
                </Typography>
              )}
              <Typography variant="body2" gutterBottom>
                <strong>Auth Context:</strong> {organization ? `✅ ${organization.name}` : '❌ No Organization'}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Fix Options */}
      {diagnosticInfo && !diagnosticInfo.hasOrganizationLink && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              🔧 Fix Options
            </Typography>
            
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Your profile is not linked to any organization. Choose one of the options below:
            </Typography>

            <Box mt={2}>
              <Typography variant="subtitle1" gutterBottom>
                Option 1: Link to Existing Organization
              </Typography>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Select Organization</InputLabel>
                <Select
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                  label="Select Organization"
                >
                  {organizations.map((org) => (
                    <MenuItem key={org.id} value={org.id}>
                      {org.name} ({org.slug})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <Button
                variant="contained"
                onClick={handleFixLink}
                disabled={!selectedOrgId || fixing}
                sx={{ mr: 2 }}
              >
                {fixing ? <CircularProgress size={20} /> : 'Link to Organization'}
              </Button>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle1" gutterBottom>
                Option 2: Create New Organization
              </Typography>
              
              <Typography variant="body2" color="text.secondary" gutterBottom>
                This will create a new organization and make you the admin.
              </Typography>
              
              <Button
                variant="outlined"
                onClick={handleCreateAndLink}
                disabled={fixing}
              >
                {fixing ? <CircularProgress size={20} /> : 'Create New Organization'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Available Organizations */}
      {organizations.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              📋 Available Organizations
            </Typography>
            
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Slug</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {organizations.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell>{org.name}</TableCell>
                      <TableCell>{org.slug}</TableCell>
                      <TableCell>
                        <Chip 
                          label={org.subscription_status} 
                          color={org.subscription_status === 'active' ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(org.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Success State */}
      {diagnosticInfo && diagnosticInfo.hasOrganizationLink && organization && (
        <Alert severity="success">
          ✅ Your profile is properly linked to "{organization.name}". Everything looks good!
        </Alert>
      )}
    </Box>
  );
} 