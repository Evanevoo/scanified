import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, CircularProgress, Alert, Button } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { supabase } from '../supabase/client';
import ReactMarkdown from 'react-markdown';

function CustomPageViewer() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPage();
  }, [slug]);

  const fetchPage = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('custom_pages')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setError('Page not found');
        } else {
          setError('Error loading page');
        }
      } else {
        setPage(data);
      }
    } catch (err) {
      setError('Error loading page');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/')}
          sx={{ mb: 2 }}
        >
          Back to Home
        </Button>
        <Alert severity="error">
          {error === 'Page not found' ? 'This page could not be found.' : error}
        </Alert>
      </Box>
    );
  }

  if (!page) {
    return (
      <Box sx={{ p: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/')}
          sx={{ mb: 2 }}
        >
          Back to Home
        </Button>
        <Alert severity="warning">
          This page is not available.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: '800px', margin: '0 auto' }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/')}
        sx={{ mb: 3 }}
      >
        Back to Home
      </Button>
      
      <Paper sx={{ p: 4 }}>
        <Typography variant="h3" gutterBottom>
          {page.title}
        </Typography>
        
        <Box sx={{ mt: 3 }}>
          <ReactMarkdown>
            {page.content}
          </ReactMarkdown>
        </Box>
        
        <Box sx={{ mt: 4, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary">
            Last updated: {new Date(page.updated_at || page.created_at).toLocaleDateString()}
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}

export default CustomPageViewer; 