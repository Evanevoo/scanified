import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { TableSkeleton } from '../components/SmoothLoading';

export default function LotReports() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [lots, setLots] = useState([]);

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setLots([]); // TODO: Replace with real fetch
      setLoading(false);
    }, 1200);
  }, []);

  return (
    <Box sx={{ p: 4 }}>
      <button onClick={() => navigate(-1)} className="mb-4 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded">Back</button>
      <Typography variant="h4" fontWeight={700} mb={3}>Lot Reports</Typography>
      {loading ? (
        <TableSkeleton rows={4} columns={5} />
      ) : lots.length === 0 ? (
        <Card sx={{ mt: 4 }}><CardContent>No lot reports found.</CardContent></Card>
      ) : (
        <div> {/* Render lots here */} </div>
      )}
    </Box>
  );
} 