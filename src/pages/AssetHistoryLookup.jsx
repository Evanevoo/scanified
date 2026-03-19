import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, TextField, Button, Card, CardContent,
  IconButton, Stack, Autocomplete, CircularProgress
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Search as SearchIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';

export default function AssetHistoryLookup() {
  const [search, setSearch] = useState('');
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const navigate = useNavigate();
  const { organization } = useAuth();

  // Fetch assets for suggestions
  useEffect(() => {
    const fetchAssets = async () => {
      if (!organization?.id) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('bottles')
          .select('id, barcode_number, serial_number, description, gas_type, product_code')
          .eq('organization_id', organization.id)
          .order('barcode_number')
          .limit(500); // Limit to 500 most recent assets for performance
        
        if (error) throw error;
        setAssets(data || []);
      } catch (error) {
        console.error('Error fetching assets:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssets();
  }, [organization?.id]);

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
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3 }, mb: 3, borderRadius: 3, border: '1px solid rgba(15, 23, 42, 0.08)', background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate(-1)}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em' }}>
            Asset History Lookup
          </Typography>
        </Box>
      </Paper>

      <Card elevation={0} sx={{ width: '100%', borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <HistoryIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" fontWeight={600} color="text.secondary" gutterBottom>
              Quick Asset History Search
            </Typography>
          </Box>

          <Stack spacing={3}>
            <Autocomplete
              freeSolo
              fullWidth
              options={assets}
              value={search}
              inputValue={inputValue}
              onInputChange={(event, newInputValue) => {
                setInputValue(newInputValue);
                setSearch(newInputValue);
              }}
              onChange={(event, newValue) => {
                if (typeof newValue === 'string') {
                  setSearch(newValue);
                } else if (newValue) {
                  setSearch(newValue.barcode_number || newValue.serial_number || '');
                }
              }}
              getOptionLabel={(option) => {
                if (typeof option === 'string') return option;
                return option.barcode_number || option.serial_number || '';
              }}
              renderOption={(props, option) => (
                <Box component="li" {...props}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Typography variant="body1" fontWeight={600}>
                        {option.barcode_number || option.serial_number}
                      </Typography>
                      {option.barcode_number && option.serial_number && (
                        <Typography variant="body2" color="text.secondary">
                          (S/N: {option.serial_number})
                        </Typography>
                      )}
                    </Box>
                    {(option.description || option.gas_type || option.product_code) && (
                      <Typography variant="caption" color="text.secondary">
                        {[option.gas_type, option.product_code, option.description]
                          .filter(Boolean)
                          .join(' • ')}
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}
              loading={loading}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Enter barcode or serial number..."
                  onKeyPress={handleKeyPress}
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        {params.InputProps.startAdornment}
                      </>
                    ),
                    endAdornment: (
                      <>
                        {loading ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                  size="large"
                />
              )}
            />
            
            <Button
              variant="contained"
              size="large"
              startIcon={<SearchIcon />}
              onClick={handleSearch}
              disabled={!search.trim()}
              fullWidth
              sx={{ borderRadius: 999, fontWeight: 700, textTransform: 'none' }}
            >
              Lookup Asset History
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
} 