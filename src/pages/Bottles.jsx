import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, Button } from '@mui/material';

export default function Bottles() {
  const [bottles, setBottles] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBottles = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('bottles').select('*').order('barcode_number');
      if (!error && data) setBottles(data);
      setLoading(false);
    };
    fetchBottles();
  }, []);

  if (loading) return <Box p={4} textAlign="center"><CircularProgress /></Box>;

  return (
    <Box p={4}>
      <Typography variant="h4" fontWeight={700} mb={3}>All Bottles</Typography>
      <Paper elevation={2}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Barcode</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Serial Number</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Gas Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Location</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bottles.map(bottle => (
                <TableRow key={bottle.id}>
                  <TableCell>
                    {bottle.barcode_number ? (
                      <a
                        href={`/bottles/${bottle.barcode_number}`}
                        style={{ color: '#1976d2', textDecoration: 'underline', cursor: 'pointer' }}
                        onClick={e => {
                          e.preventDefault();
                          navigate(`/bottles/${bottle.barcode_number}`);
                        }}
                      >
                        {bottle.barcode_number}
                      </a>
                    ) : ''}
                  </TableCell>
                  <TableCell>{bottle.serial_number}</TableCell>
                  <TableCell>{bottle.type}</TableCell>
                  <TableCell>{bottle.gas_type}</TableCell>
                  <TableCell>{bottle.location}</TableCell>
                  <TableCell>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => navigate(`/bottles/${bottle.barcode_number}`)}
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
} 