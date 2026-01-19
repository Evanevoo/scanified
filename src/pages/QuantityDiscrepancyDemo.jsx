import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Grid,
  Card,
  CardContent,
  Alert,
  Divider
} from '@mui/material';
import QuantityDiscrepancyDetector from '../components/QuantityDiscrepancyDetector';

export default function QuantityDiscrepancyDemo() {
  const [demoData, setDemoData] = useState({
    orderNumber: 'DEMO-001',
    customerId: 'demo-customer-123',
    organizationId: 'demo-org-456'
  });

  const [showDemo, setShowDemo] = useState(false);

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Quantity Discrepancy Detector - Demo
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        This feature automatically detects when shipped quantities equal returned quantities and compares them 
        with actual scanned quantities to identify discrepancies.
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          How It Works
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" color="primary" gutterBottom>
                  🎯 Business Logic
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>When:</strong> Ship Quantity = Return Quantity
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Show:</strong> Quantity Scanned vs Quantity Invoiced
                </Typography>
                <Typography variant="body2">
                  <strong>Purpose:</strong> Identify scanning vs billing discrepancies
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" color="warning.main" gutterBottom>
                  ⚠️ Common Discrepancies
                </Typography>
                <Typography variant="body2" paragraph>
                  • <strong>Missing Scans:</strong> Bottles not scanned during delivery
                </Typography>
                <Typography variant="body2" paragraph>
                  • <strong>Billing Errors:</strong> Wrong quantities on invoices
                </Typography>
                <Typography variant="body2">
                  • <strong>Data Sync Issues:</strong> Scans not properly recorded
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Demo Configuration
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Order Number"
              value={demoData.orderNumber}
              onChange={(e) => setDemoData(prev => ({ ...prev, orderNumber: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Customer ID"
              value={demoData.customerId}
              onChange={(e) => setDemoData(prev => ({ ...prev, customerId: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Organization ID"
              value={demoData.organizationId}
              onChange={(e) => setDemoData(prev => ({ ...prev, organizationId: e.target.value }))}
            />
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 2 }}>
          <Button
            variant="contained"
            onClick={() => setShowDemo(true)}
            disabled={!demoData.orderNumber || !demoData.customerId || !demoData.organizationId}
          >
            Run Demo Analysis
          </Button>
        </Box>
      </Paper>

      {showDemo && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Live Demo Results
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Note:</strong> This demo will attempt to fetch real data from your database. 
              Make sure you have the required data in your system.
            </Typography>
          </Alert>
          
          <Divider sx={{ my: 2 }} />
          
          <QuantityDiscrepancyDetector
            orderNumber={demoData.orderNumber}
            customerId={demoData.customerId}
            organizationId={demoData.organizationId}
          />
        </Paper>
      )}

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Integration Points
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              ✅ Already Integrated
            </Typography>
            <Typography variant="body2" component="ul">
              <li>Import Approvals workflow</li>
              <li>Invoice verification process</li>
              <li>Dashboard statistics</li>
              <li>Grid view quick access</li>
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              🔄 Future Enhancements
            </Typography>
            <Typography variant="body2" component="ul">
              <li>Automated discrepancy alerts</li>
              <li>Bulk discrepancy reports</li>
              <li>Historical trend analysis</li>
              <li>Mobile app integration</li>
            </Typography>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}
