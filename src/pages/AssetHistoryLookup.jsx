import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, TextField, Button, Card, CardContent,
  IconButton, Stack
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Search as SearchIcon,
  History as HistoryIcon
} from '@mui/icons-material';

export default function AssetHistoryLookup() {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const handleSearch = () => {
    if (search.trim()) {
      navigate(`/assets/${search.trim()}/history`);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate(-1)}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" fontWeight={800} color="primary">
          Asset History Lookup
        </Typography>
      </Box>

      {/* Search Card */}
      <Card variant="outlined" sx={{ maxWidth: 600, mx: 'auto' }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <HistoryIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" fontWeight={600} color="text.secondary" gutterBottom>
              Quick Asset History Search
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Enter a barcode or serial number to view the complete history and details of any asset
            </Typography>
          </Box>

          <Stack spacing={3}>
            <TextField
              fullWidth
              placeholder="Enter barcode or serial number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={handleKeyPress}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
              size="large"
            />
            
            <Button
              variant="contained"
              size="large"
              startIcon={<SearchIcon />}
              onClick={handleSearch}
              disabled={!search.trim()}
              fullWidth
            >
              Lookup Asset History
            </Button>
          </Stack>

          <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
            <Typography variant="caption" color="info.contrastText">
              💡 Tip: You can search by any asset identifier including barcodes, serial numbers, or asset IDs
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
} 