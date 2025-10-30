import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Chip
} from '@mui/material';
import { 
  Update as UpdateIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';

export default function DailyUpdateAdmin() {
  const { organization } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [bottleStats, setBottleStats] = useState(null);

  useEffect(() => {
    fetchLastUpdateInfo();
    fetchBottleStats();
  }, []);

  const fetchLastUpdateInfo = async () => {
    try {
      // Get the most recent last_location_update from any bottle
      const { data, error } = await supabase
        .from('bottles')
        .select('last_location_update')
        .not('last_location_update', 'is', null)
        .order('last_location_update', { ascending: false })
        .limit(1);

      if (error) throw error;
      
      if (data && data.length > 0) {
        setLastUpdate(data[0].last_location_update);
      }
    } catch (error) {
      console.error('Error fetching last update info:', error);
    }
  };

  const fetchBottleStats = async () => {
    try {
      const { data, error } = await supabase
        .from('bottles')
        .select('days_at_location, last_location_update')
        .not('days_at_location', 'is', null);

      if (error) throw error;

      if (data) {
        const stats = {
          total: data.length,
          updatedToday: data.filter(b => {
            if (!b.last_location_update) return false;
            const lastUpdate = new Date(b.last_location_update).toISOString().split('T')[0];
            const today = new Date().toISOString().split('T')[0];
            return lastUpdate === today;
          }).length,
          averageDays: Math.round(data.reduce((sum, b) => sum + (b.days_at_location || 0), 0) / data.length),
          maxDays: Math.max(...data.map(b => b.days_at_location || 0))
        };
        setBottleStats(stats);
      }
    } catch (error) {
      console.error('Error fetching bottle stats:', error);
    }
  };

  const runDailyUpdate = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get all bottles that have a days_at_location value
      const { data: bottles, error: fetchError } = await supabase
        .from('bottles')
        .select('id, days_at_location, last_location_update')
        .not('days_at_location', 'is', null);

      if (fetchError) throw fetchError;

      if (!bottles || bottles.length === 0) {
        setResult({
          success: true,
          updated: 0,
          skipped: 0,
          total: 0,
          message: 'No bottles found to update'
        });
        return;
      }

      let updatedCount = 0;
      let skippedCount = 0;

      // Update each bottle individually
      for (const bottle of bottles) {
        const lastUpdate = bottle.last_location_update 
          ? new Date(bottle.last_location_update).toISOString().split('T')[0]
          : today;

        // Only update if we haven't already updated today
        if (lastUpdate !== today) {
          const { error: updateError } = await supabase
            .from('bottles')
            .update({
              days_at_location: (bottle.days_at_location || 0) + 1,
              last_location_update: today
            })
            .eq('id', bottle.id);

          if (updateError) {
            console.error(`Error updating bottle ${bottle.id}:`, updateError);
          } else {
            updatedCount++;
          }
        } else {
          skippedCount++;
        }
      }

      setResult({
        success: true,
        updated: updatedCount,
        skipped: skippedCount,
        total: bottles.length,
        date: today
      });

      // Refresh the stats
      fetchLastUpdateInfo();
      fetchBottleStats();

    } catch (error) {
      console.error('Error running daily update:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString();
  };

  const isToday = (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    return date === today;
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'var(--bg-main)', py: 8, borderRadius: 0, overflow: 'visible' }}>
      <Paper elevation={0} sx={{ width: '100%', p: { xs: 2, md: 5 }, borderRadius: 0, boxShadow: '0 2px 12px 0 rgba(16,24,40,0.04)', border: '1px solid var(--divider)', bgcolor: 'var(--bg-main)', overflow: 'visible' }}>
        
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Box>
            <Typography variant="h3" fontWeight={900} color="primary" sx={{ letterSpacing: -1 }}>
              📅 Daily Update Admin
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Organization: <strong>{organization?.name}</strong>
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={loading ? <CircularProgress size={20} /> : <UpdateIcon />}
            onClick={runDailyUpdate}
            disabled={loading}
            size="large"
          >
            {loading ? 'Updating...' : 'Run Daily Update'}
          </Button>
        </Box>

        {/* Stats Cards */}
        {bottleStats && (
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h4" color="primary" fontWeight="bold">
                    {bottleStats.total}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Bottles
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h4" color="success.main" fontWeight="bold">
                    {bottleStats.updatedToday}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Updated Today
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h4" color="info.main" fontWeight="bold">
                    {bottleStats.averageDays}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Avg Days at Location
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h4" color="warning.main" fontWeight="bold">
                    {bottleStats.maxDays}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Max Days at Location
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Last Update Status */}
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            <ScheduleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Last Update Status
          </Typography>
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="body1">
              Last Update: <strong>{formatDate(lastUpdate)}</strong>
            </Typography>
            {lastUpdate && (
              <Chip
                icon={isToday(lastUpdate) ? <CheckCircleIcon /> : <ErrorIcon />}
                label={isToday(lastUpdate) ? 'Updated Today' : 'Needs Update'}
                color={isToday(lastUpdate) ? 'success' : 'warning'}
                size="small"
              />
            )}
          </Box>
        </Paper>

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="body1">
              <strong>Error:</strong> {error}
            </Typography>
          </Alert>
        )}

        {/* Result Display */}
        {result && (
          <Alert 
            severity={result.success ? 'success' : 'error'} 
            sx={{ mb: 3 }}
          >
            <Typography variant="body1">
              <strong>Update Result:</strong>
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {result.message || (
                <>
                  Updated: <strong>{result.updated}</strong> bottles<br/>
                  Skipped: <strong>{result.skipped}</strong> bottles<br/>
                  Total: <strong>{result.total}</strong> bottles<br/>
                  Date: <strong>{result.date}</strong>
                </>
              )}
            </Typography>
          </Alert>
        )}

        {/* Instructions */}
        <Paper elevation={1} sx={{ p: 3, bgcolor: 'grey.50' }}>
          <Typography variant="h6" gutterBottom>
            📋 How It Works
          </Typography>
          <Typography variant="body2" paragraph>
            The daily update system automatically increments the "Days at Location" counter for all bottles that haven't been updated today.
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>When to run:</strong> Once per day, preferably in the morning or as part of your daily routine.
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>What it does:</strong> Increases the days_at_location by 1 for each bottle that hasn't been updated today.
          </Typography>
          <Typography variant="body2">
            <strong>Note:</strong> Bottles that were already updated today will be skipped to prevent double-counting.
          </Typography>
        </Paper>
      </Paper>
    </Box>
  );
}

