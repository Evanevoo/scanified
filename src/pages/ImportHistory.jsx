import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';
import {
  Box, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody, TableContainer, TextField, Button, Alert, CircularProgress, IconButton
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export default function ImportHistory() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');
  const [expandedRows, setExpandedRows] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('import_history')
        .select('*')
        .order('started_at', { ascending: false });
      if (error) setError(error.message);
      else setLogs(data || []);
      setLoading(false);
    }
    fetchLogs();
  }, []);

  const filtered = logs.filter(row =>
    (!filter ||
      (row.file_name && row.file_name.toLowerCase().includes(filter.toLowerCase())) ||
      (row.import_type && row.import_type.toLowerCase().includes(filter.toLowerCase())) ||
      (row.user_email && row.user_email.toLowerCase().includes(filter.toLowerCase())) ||
      (row.status && row.status.toLowerCase().includes(filter.toLowerCase()))
    )
  );

  return (
    <Box maxWidth="lg" mx="auto" mt={6}>
      <Paper elevation={4} sx={{ p: 4, borderRadius: 4 }}>
        <Box display="flex" alignItems="center" mb={2}>
          <IconButton onClick={() => navigate(-1)} color="primary" sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" fontWeight={700}>Import History</Typography>
        </Box>
        <Box mb={3}>
          <TextField
            label="Filter by file, type, user, or status..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            variant="outlined"
            size="small"
            sx={{ width: 350 }}
          />
        </Box>
        {loading ? (
          <Box p={4} textAlign="center"><CircularProgress /></Box>
        ) : error ? (
          <Alert severity="error">Error: {error}</Alert>
        ) : (
          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>File Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Started</TableCell>
                  <TableCell>Finished</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Summary</TableCell>
                  <TableCell>Error</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map(row => {
                  const errorMsg = row.error_message || '';
                  const firstLine = errorMsg.split('\n')[0];
                  const isLong = errorMsg.split('\n').length > 1 || errorMsg.length > 120;
                  const expanded = expandedRows[row.id];
                  return (
                    <TableRow key={row.id} sx={{ backgroundColor: row.status === 'error' ? 'rgba(255,0,0,0.07)' : row.status === 'success' ? 'rgba(0,128,0,0.04)' : undefined }}>
                      <TableCell>{row.file_name}</TableCell>
                      <TableCell>{row.import_type}</TableCell>
                      <TableCell>{row.user_email}</TableCell>
                      <TableCell>{row.started_at ? new Date(row.started_at).toLocaleString() : ''}</TableCell>
                      <TableCell>{row.finished_at ? new Date(row.finished_at).toLocaleString() : ''}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{row.status}</TableCell>
                      <TableCell sx={{ whiteSpace: 'pre-wrap', maxWidth: 200 }}>{row.summary ? JSON.stringify(row.summary, null, 2) : ''}</TableCell>
                      <TableCell sx={{ color: 'error.main', maxWidth: 200 }}>
                        {isLong && !expanded ? (
                          <>
                            {firstLine}
                            <Button size="small" color="primary" onClick={() => setExpandedRows(r => ({ ...r, [row.id]: true }))}>View All</Button>
                          </>
                        ) : isLong && expanded ? (
                          <>
                            <Box sx={{ whiteSpace: 'pre-wrap' }}>{errorMsg}</Box>
                            <Button size="small" color="primary" onClick={() => setExpandedRows(r => ({ ...r, [row.id]: false }))}>Hide</Button>
                          </>
                        ) : (
                          errorMsg
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {filtered.length === 0 && <Typography color="text.secondary" mt={2} align="center">No import logs found.</Typography>}
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
} 