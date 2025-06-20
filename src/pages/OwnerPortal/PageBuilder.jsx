import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Paper, List, ListItem, ListItemText, ListItemSecondaryAction, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Switch, FormControlLabel } from '@mui/material';
import { supabase } from '../../supabase/client';
import { useAppStore } from '../../store/appStore';
import { Link as RouterLink } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

function PageBuilder() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPage, setCurrentPage] = useState(null);
  const { addNotification } = useAppStore();
  const { user } = supabase.auth.user() || {};

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('custom_pages').select('*').order('title');
    if (error) {
      addNotification({ type: 'error', title: 'Error fetching pages', message: error.message });
    } else {
      setPages(data);
    }
    setLoading(false);
  };

  const handleOpen = (page = null) => {
    if (page) {
      setCurrentPage(page);
      setIsEditing(true);
    } else {
      setCurrentPage({ title: '', slug: '', content: '', is_published: false, author_id: user?.id });
      setIsEditing(false);
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setCurrentPage(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'title' && !isEditing) {
      const slug = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      setCurrentPage(prev => ({ ...prev, title: value, slug }));
    } else {
      setCurrentPage(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }
  };

  const handleSave = async () => {
    let error;
    if (isEditing) {
      ({ error } = await supabase.from('custom_pages').update(currentPage).eq('id', currentPage.id));
    } else {
      ({ error } = await supabase.from('custom_pages').insert(currentPage));
    }

    if (error) {
      addNotification({ type: 'error', title: 'Error saving page', message: error.message });
    } else {
      addNotification({ type: 'success', title: 'Page saved successfully' });
      fetchPages();
      handleClose();
    }
  };

  const handleDelete = async (pageId) => {
    if (window.confirm('Are you sure you want to delete this page?')) {
      const { error } = await supabase.from('custom_pages').delete().eq('id', pageId);
      if (error) {
        addNotification({ type: 'error', title: 'Error deleting page', message: error.message });
      } else {
        addNotification({ type: 'success', title: 'Page deleted' });
        fetchPages();
      }
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">Page Builder</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
          Create New Page
        </Button>
      </Box>
      <Paper>
        <List>
          {pages.map(page => (
            <ListItem key={page.id} divider>
              <ListItemText
                primary={page.title}
                secondary={`/${page.is_published ? 'p' : 'draft'}/${page.slug}`}
              />
              <ListItemSecondaryAction>
                <RouterLink to={`/p/${page.slug}`} target="_blank">
                  <IconButton edge="end" aria-label="view">
                    <EditIcon />
                  </IconButton>
                </RouterLink>
                <IconButton edge="end" aria-label="edit" onClick={() => handleOpen(page)}>
                  <EditIcon />
                </IconButton>
                <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(page.id)}>
                  <DeleteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </Paper>

      {currentPage && (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="lg">
          <DialogTitle>{isEditing ? 'Edit Page' : 'Create New Page'}</DialogTitle>
          <DialogContent>
            <TextField label="Page Title" name="title" value={currentPage.title} onChange={handleChange} fullWidth margin="normal" />
            <TextField label="URL Slug" name="slug" value={currentPage.slug} onChange={handleChange} fullWidth margin="normal" helperText="Determines the page URL (e.g., /p/your-slug)" />
            <TextField label="Content (Markdown)" name="content" multiline rows={15} value={currentPage.content} onChange={handleChange} fullWidth margin="normal" />
            <FormControlLabel control={<Switch name="is_published" checked={currentPage.is_published} onChange={handleChange} />} label="Published" />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button onClick={handleSave} variant="contained">Save Page</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}

export default PageBuilder; 