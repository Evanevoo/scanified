import logger from '../utils/logger';
import React, { useEffect, useState, useMemo, useCallback, memo } from 'react';
import { supabase } from '../supabase/client';
import { useDebounce } from '../utils/performance';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Card, CardContent, Grid, Chip, IconButton, TextField, FormControl, InputLabel, Select, MenuItem,
  Alert, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Tabs, Tab,
  Tooltip, Badge, Collapse, FormControlLabel, Checkbox, Switch, Menu, ListItemIcon, ListItemText
} from '@mui/material';
import {
  Person as PersonIcon,
  Home as HomeIcon,
  Edit as EditIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  MonetizationOn as MoneyIcon,
  Assignment as AssignmentIcon,
  Receipt as InvoiceIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Email as EmailIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import InvoiceGenerator from '../components/InvoiceGenerator';
import BulkInvoiceEmailDialog from '../components/BulkInvoiceEmailDialog';
import { getNextInvoiceNumbers, getNextAgreementNumbers, toCsv, downloadFile } from '../utils/invoiceUtils';
import { formatLocationDisplay } from '../utils/locationDisplay';
import { fetchBillingWorkspaceData } from '../services/billingWorkspaceService';
import { processBillingWorkspaceToFilteredRentals } from '../services/rentalWorkspaceMerge';

// Business logic functions to determine asset status
const getAssetStatus = (assignedCustomer, customerType) => {
  if (!assignedCustomer) return 'IN-HOUSE';
  if (customerType === 'VENDOR') return 'IN-HOUSE';     // Vendors are considered in-house
  if (customerType === 'CUSTOMER') return 'RENTED';     // Customers are rented out
  if (customerType === 'TEMPORARY') return 'RENTED';    // Temporary customers also rent items
  // If customer_type doesn't exist yet (migration not run), default to RENTED for assigned items
  if (assignedCustomer && !customerType) return 'RENTED';
  return 'IN-HOUSE'; // Default fallback
};

const getStatusDescription = (assignedCustomer, customerType) => {
  if (!assignedCustomer) return 'Available for assignment';
  if (customerType === 'VENDOR') return 'In-house with vendor - no rental charge';
  if (customerType === 'CUSTOMER') return 'Rented to customer';
  if (customerType === 'TEMPORARY') return 'Rented to temporary customer (needs account setup)';
  // If customer_type doesn't exist yet, assume it's a customer
  if (assignedCustomer && !customerType) return 'Rented to customer';
  return 'Available for assignment';
};

// RNB = Return not on balance – do not count or bill (exception only)
const isRNB = (r) => r?.is_dns === true && (r?.dns_description || '').includes('Return not on balance');
// RNS = Return not scanned – reduces customer total, not billable
const isRNS = (r) => r?.is_dns === true && (r?.dns_description || '').includes('Return not scanned');

const isMonthlyRental = (r) => (r.rental_type || 'monthly') === 'monthly';
const isYearlyRental = (r) => r.rental_type === 'yearly';

const partitionRentalsByBillingType = (rentals) => {
  const monthly = [];
  const yearly = [];
  for (const r of rentals) {
    if (isYearlyRental(r)) yearly.push(r);
    else monthly.push(r);
  }
  return { monthly, yearly };
};

// Enhanced status mapping with colors and descriptions
const ASSET_STATUS = {
  'IN-HOUSE': { 
    color: 'default', 
    icon: <HomeIcon />, 
    description: 'Available in warehouse or with vendors (no charge)',
    billable: false 
  },
  'RENTED': { 
    color: 'primary', 
    icon: <PersonIcon />, 
    description: 'Rented to customer',
    billable: true 
  }
};

// Memoized table body so search input doesn't re-render the whole table on every keystroke
const RentalsTableBody = memo(function RentalsTableBody({
  currentCustomers,
  expandedCustomers,
  toggleExpanded,
  navigate,
  setInvoiceDialog,
  setEditDialog,
  isRNB,
  isRNS,
  rentalListMode,
}) {
  const renderAssetChips = (rentalList) =>
    rentalList.map((rental, idx) => {
      const barcode = rental.bottles?.barcode_number || rental.bottles?.barcode || rental.bottle_barcode;
      const displayLabel = barcode || (rental.is_dns ? `${rental.dns_product_code || 'DNS'} - ${rental.dns_description || 'Not Scanned'}` : `Asset ${idx + 1}`);
      const bottleId = rental.bottles?.id || rental.bottle_id;
      return (
        <Chip
          key={rental.id || `${displayLabel}-${idx}`}
          label={displayLabel}
          size="small"
          variant="outlined"
          onClick={() => {
            if (bottleId) navigate(`/bottle/${bottleId}`);
          }}
          sx={{
            fontSize: 11,
            cursor: 'pointer',
            '&:hover': {
              bgcolor: 'primary.light',
              color: 'primary.contrastText',
              borderColor: 'primary.main'
            }
          }}
        />
      );
    });

  return (
    <>
      {currentCustomers.length === 0 ? (
        <TableRow>
          <TableCell colSpan={8} align="center">
            <Typography variant="body1" color="text.secondary" py={4}>
              No customers found matching your filters
            </Typography>
          </TableCell>
        </TableRow>
      ) : (
        currentCustomers.map(({ customer, rentals }, index) => (
          <React.Fragment key={customer.CustomerListID}>
            <TableRow
              hover
              sx={{
                borderBottom: index < currentCustomers.length - 1 ? '3px solid #e0e0e0' : 'none',
                '&:hover': {
                  bgcolor: '#fafafa'
                }
              }}
            >
              <TableCell sx={{ py: 2.5 }}>
                <Typography variant="body2" fontWeight="bold">
                  {customer.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ({customer.CustomerListID})
                </Typography>
                {customer.customer_type === 'VENDOR' && (
                  <Chip
                    label="NO CHARGE"
                    size="small"
                    color="secondary"
                    sx={{ ml: 1, fontSize: 10, height: 20 }}
                  />
                )}
              </TableCell>
              <TableCell sx={{ py: 2.5 }}>
                <Chip
                  label={customer.customer_type || 'CUSTOMER'}
                  color={customer.customer_type === 'VENDOR' ? 'secondary' : 'primary'}
                  size="small"
                  variant="outlined"
                />
              </TableCell>
              <TableCell sx={{ py: 2.5 }}>
                <Typography variant="h6" fontWeight="bold" color="primary">
                  {rentals.filter(r => !isRNB(r) && !isRNS(r)).length}
                </Typography>
              </TableCell>
              <TableCell sx={{ py: 2.5 }}>
                <Typography variant="body2">
                  {(() => {
                    const billableRentals = rentals.filter(r => !isRNB(r) && !isRNS(r));
                    const monthly = billableRentals.filter(r => r.rental_type === 'monthly').length;
                    const yearly = billableRentals.filter(r => r.rental_type === 'yearly').length;
                    if (monthly > 0 && yearly > 0) {
                      return `${monthly} monthly, ${yearly} yearly`;
                    }
                    return billableRentals[0]?.rental_type || 'monthly';
                  })()}
                </Typography>
              </TableCell>
              <TableCell sx={{ py: 2.5 }}>
                <Typography variant="body2" fontWeight="bold">
                  {(() => {
                    const amounts = [...new Set(rentals.map(r => (parseFloat(r.rental_amount) || 10).toFixed(2)))];
                    const formatted = amounts.map(a => `$${a}`);
                    return formatted.length > 1 ? formatted.join(', ') : formatted[0] || '$10.00';
                  })()}
                </Typography>
              </TableCell>
              <TableCell sx={{ py: 2.5 }}>
                <Typography variant="body2">
                  {rentals[0]?.tax_code || 'GST+PST'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ({(rentals[0]?.tax_rate || 0.11) * 100}% tax)
                </Typography>
              </TableCell>
              <TableCell sx={{ py: 2.5 }}>
                <Typography variant="body2">
                  {formatLocationDisplay(rentals[0]?.location || 'SASKATOON')}
                </Typography>
              </TableCell>
              <TableCell sx={{ py: 2.5 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => navigate(`/customer/${customer.CustomerListID}`)}
                  sx={{ mr: 1 }}
                >
                  View Details
                </Button>
                {rentals.length > 0 && customer.customer_type !== 'VENDOR' && (
                  <Tooltip title="Generate & Email Invoice">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => setInvoiceDialog({ open: true, customer, rentals: rentals.filter((r) => !isRNB(r) && !isRNS(r)) })}
                      sx={{ mr: 1 }}
                    >
                      <InvoiceIcon />
                    </IconButton>
                  </Tooltip>
                )}
                <Tooltip title="Edit Rentals">
                  <IconButton
                    size="small"
                    onClick={() => setEditDialog({
                      open: true,
                      customer,
                      rentals,
                      location: customer?.location || rentals?.[0]?.location,
                      tax_code: rentals?.[0]?.tax_code
                    })}
                  >
                    <EditIcon />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell
                colSpan={8}
                sx={{
                  p: 0,
                  borderBottom: index < currentCustomers.length - 1 ? '3px solid #e0e0e0' : 'none'
                }}
              >
                <Box>
                  <Box
                    onClick={() => toggleExpanded(customer.CustomerListID)}
                    sx={{
                      p: 1.5,
                      bgcolor: '#f5f5f5',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      '&:hover': {
                        bgcolor: '#eeeeee'
                      }
                    }}
                  >
                    {expandedCustomers.has(customer.CustomerListID) ? (
                      <ExpandLessIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    ) : (
                      <ExpandMoreIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    )}
                    <Typography variant="caption" color="text.secondary" fontWeight="medium">
                      {(() => {
                        const { monthly, yearly } = partitionRentalsByBillingType(rentals);
                        if (rentalListMode === 'all' && monthly.length > 0 && yearly.length > 0) {
                          return `Individual assets — ${monthly.length} monthly · ${yearly.length} yearly`;
                        }
                        return `Individual Assets (${rentals.length})`;
                      })()}
                    </Typography>
                  </Box>
                  <Collapse in={expandedCustomers.has(customer.CustomerListID)}>
                    {expandedCustomers.has(customer.CustomerListID) ? (
                      <Box sx={{ p: 1.5, bgcolor: '#fafafa' }}>
                        {rentalListMode === 'all' ? (
                          (() => {
                            const { monthly, yearly } = partitionRentalsByBillingType(rentals);
                            return (
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {monthly.length > 0 && (
                                  <Box>
                                    <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 1, letterSpacing: '0.02em' }}>
                                      Monthly ({monthly.length})
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                                      {renderAssetChips(monthly)}
                                    </Box>
                                  </Box>
                                )}
                                {yearly.length > 0 && (
                                  <Box>
                                    <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 1, letterSpacing: '0.02em' }}>
                                      Yearly / lease ({yearly.length})
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                                      {renderAssetChips(yearly)}
                                    </Box>
                                  </Box>
                                )}
                              </Box>
                            );
                          })()
                        ) : (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                            {renderAssetChips(rentals)}
                          </Box>
                        )}
                      </Box>
                    ) : null}
                  </Collapse>
                </Box>
              </TableCell>
            </TableRow>
          </React.Fragment>
        ))
      )}
    </>
  );
});

function RentalsImproved() {
  const { profile, organization } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // State management
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [editDialog, setEditDialog] = useState({ open: false, customer: null, rentals: [] });
  const [showBottleDetailsInEdit, setShowBottleDetailsInEdit] = useState(true);
  const [invoiceDialog, setInvoiceDialog] = useState({ open: false, customer: null, rentals: [] });
  const [bulkEmailDialogOpen, setBulkEmailDialogOpen] = useState(false);
  const [updatingRentals, setUpdatingRentals] = useState(false);
  const [exportingInvoices, setExportingInvoices] = useState(false);
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null);
  const [error, setError] = useState(null);
  const [filters] = useState({
    status: 'all',
    customer_type: 'all'
  });
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);
  const [locations, setLocations] = useState([]);
  const [expandedCustomers, setExpandedCustomers] = useState(() => new Set());

  // Statistics
  const [stats, setStats] = useState({
    inHouse: 0,
    withVendors: 0,
  });

  const fetchRentals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!organization?.id) {
        setError('No organization assigned to user');
        setLoading(false);
        return;
      }

      const workspaceData = await fetchBillingWorkspaceData(organization.id);
      const {
        filteredRentals,
        allCustomers,
        locationsData: locData,
        bottlesWithVendors,
        inHouseTotal,
      } = processBillingWorkspaceToFilteredRentals(workspaceData);

      setAssets(filteredRentals);
      setCustomers(allCustomers);
      setLocations(locData || []);
      setStats({
        inHouse: inHouseTotal,
        withVendors: bottlesWithVendors,
      });

    } catch (err) {
      logger.error('Error in fetchRentals:', err);
      setError(err.message);
    }
    setLoading(false);
  }, [organization?.id]);

  useEffect(() => {
    if (organization?.id) fetchRentals();
  }, [organization?.id, fetchRentals]);

  // Stable expand/collapse by customer id (avoids inline handlers creating new Sets every render)
  const toggleExpanded = useCallback((customerId) => {
    setExpandedCustomers((prev) => {
      const next = new Set(prev);
      if (next.has(customerId)) next.delete(customerId);
      else next.add(customerId);
      return next;
    });
  }, []);

  // Memoized: Group rentals by customer (includes DNS for billing)
  const customersWithRentals = useMemo(() => {
    const list = [];
    const customerMap = {};
    for (const rental of assets) {
      const custId = rental.customer?.CustomerListID || rental.customer_id;
      if (!custId) continue;
      if (!customerMap[custId]) {
        customerMap[custId] = {
          customer: rental.customer || {
            CustomerListID: custId,
            name: rental.customer_name || `Customer ${custId}`,
            customer_type: 'CUSTOMER',
          },
          rentals: [],
        };
        list.push(customerMap[custId]);
      }
      customerMap[custId].rentals.push(rental);
    }
    return list;
  }, [assets]);

  // Memoized: Filter customers (full list including DNS – used for billing so customer is billed for all bottles)
  const filteredCustomers = useMemo(() => {
    return customersWithRentals
      .filter(({ customer, rentals }) => {
        if (rentals.length === 0) return false;
        const custType = customer.customer_type || 'CUSTOMER';
        if (filters.customer_type !== 'all' && custType !== filters.customer_type) return false;
        if (filters.status !== 'all') {
          const isVendor = custType === 'VENDOR';
          if (filters.status === 'IN-HOUSE' && !isVendor) return false;
          if (filters.status === 'RENTED' && isVendor) return false;
        }
        const searchText = debouncedSearch.toLowerCase();
        if (debouncedSearch) {
          return customer.name?.toLowerCase().includes(searchText) ||
            customer.CustomerListID?.toLowerCase().includes(searchText) ||
            rentals.some(r => {
              const barcode = r.bottles?.barcode_number || r.bottles?.barcode || r.bottle_barcode;
              const dnsLabel = r.is_dns ? `${r.dns_product_code || 'DNS'} - ${r.dns_description || 'Not Scanned'}` : '';
              return (barcode?.toLowerCase().includes(searchText) || dnsLabel.toLowerCase().includes(searchText));
            });
        }
        return true;
      });
  }, [customersWithRentals, filters.customer_type, filters.status, debouncedSearch]);

  // Same rows as the table/tabs: monthly = non-yearly (matches partitionRentalsByBillingType), yearly = yearly
  const workspaceRentedLineCount = useMemo(
    () => filteredCustomers.reduce((c, x) => c + x.rentals.length, 0),
    [filteredCustomers]
  );

  const tabs = useMemo(() => {
    const monthly = filteredCustomers.reduce(
      (c, x) => c + x.rentals.filter((r) => !isYearlyRental(r)).length,
      0
    );
    const yearly = filteredCustomers.reduce(
      (c, x) => c + x.rentals.filter((r) => isYearlyRental(r)).length,
      0
    );
    return [
      { label: 'All Customers', value: 'all', count: filteredCustomers.length },
      { label: 'Monthly Rentals', value: 'monthly', count: monthly },
      { label: 'Yearly Rentals', value: 'yearly', count: yearly },
    ];
  }, [filteredCustomers]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleUpdateAsset = async (assetId, updates) => {
    try {
      const { error } = await supabase
        .from('bottles')
        .update(updates)
        .eq('id', assetId);

      if (error) throw error;

      await fetchRentals();
      setEditDialog({ open: false, customer: null, rentals: [] });
    } catch (error) {
      logger.error('Error updating asset:', error);
    }
  };

  const exportToCSV = (customers) => {
    const rows = [];
    const cols = ['Customer', 'CustomerID', 'Barcode', 'RentalType', 'RentalRate', 'TaxCode', 'Location', 'StartDate', 'EndDate', 'TotalBottles'];
    customers.forEach(({ customer, rentals }) => {
      rentals.forEach((rental) => {
        const barcode = rental.bottles?.barcode_number || rental.bottles?.barcode || rental.bottle_barcode;
        const dnsLabel = rental.is_dns ? `${rental.dns_product_code || 'DNS'} - ${rental.dns_description || 'Not Scanned'}` : '';
        rows.push({
          Customer: customer.name,
          CustomerID: customer.CustomerListID,
          Barcode: barcode || dnsLabel || '',
          RentalType: rental.rental_type,
          RentalRate: rental.rental_amount,
          TaxCode: rental.tax_code,
          Location: rental.location,
          StartDate: rental.rental_start_date,
          EndDate: rental.rental_end_date,
          TotalBottles: rentals.length,
        });
      });
    });
    if (rows.length === 0) return;
    const csv = toCsv(rows, cols);
    const filename = `rentals_export_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadFile(csv, filename);
  };

  const exportInvoices = async (customers) => {
    if (!customers.length || !organization?.id) return;
    setExportingInvoices(true);
    try {
      const now = new Date();
      const invoiceDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const dueDate = new Date(invoiceDate.getFullYear(), invoiceDate.getMonth() + 1, 1);
      const fmt = (d) => d.toISOString().slice(0, 10);
      const invoiceDateStr = fmt(invoiceDate);
      const dueDateStr = fmt(dueDate);

      // Split each customer's rentals into monthly and yearly (exclude RNB and RNS from billing)
      const monthlyEntries = [];
      const yearlyEntries = [];
      customers.forEach(({ customer, rentals }) => {
        const billable = rentals.filter((r) => !isRNB(r) && !isRNS(r));
        const monthlyRentals = billable.filter((r) => (r.rental_type || 'monthly') === 'monthly');
        const yearlyRentals = billable.filter((r) => r.rental_type === 'yearly');
        if (monthlyRentals.length > 0) {
          monthlyEntries.push({ customer, rentals: monthlyRentals });
        }
        if (yearlyRentals.length > 0) {
          yearlyEntries.push({ customer, rentals: yearlyRentals });
        }
      });

      const totalRows = monthlyEntries.length + yearlyEntries.length;
      if (totalRows === 0) {
        setError('No rentals to export.');
        return;
      }

      const invoiceNumbers = await getNextInvoiceNumbers(organization.id, totalRows);
      if (invoiceNumbers.length < totalRows) {
        setError('Could not reserve invoice numbers. Please try again.');
        return;
      }

      const cols = ['Invoice#', 'Customer Number', 'Name', 'Total', 'Date', 'TX', 'TX code', 'Due date', 'Rate', '# of Bottles', 'Type'];
      let numberIdx = 0;

      if (monthlyEntries.length > 0) {
        const monthlyNumbers = invoiceNumbers.slice(numberIdx, numberIdx + monthlyEntries.length);
        numberIdx += monthlyEntries.length;
        const monthlyRows = monthlyEntries.map(({ customer, rentals }, i) => {
          const base = rentals.reduce((sum, r) => sum + (parseFloat(r.rental_amount) || 0), 0);
          const totalWithTax = rentals.reduce((sum, r) => {
            const amt = parseFloat(r.rental_amount) || 0;
            const taxRate = r.tax_rate || 0.11;
            return sum + amt + amt * taxRate;
          }, 0);
          const tax = +(totalWithTax - base).toFixed(2);
          const total = +(base + tax).toFixed(2);
          const avgRate = rentals.length > 0 ? (base / rentals.length).toFixed(2) : '0.00';
          return {
            'Invoice#': monthlyNumbers[i] || `W${String(i + 1).padStart(5, '0')}`,
            'Customer Number': customer.CustomerListID,
            Name: customer.name,
            Total: total,
            Date: invoiceDateStr,
            TX: tax,
            'TX code': 'G',
            'Due date': dueDateStr,
            Rate: avgRate,
            '# of Bottles': rentals.length,
            Type: 'Monthly',
          };
        });
        const monthlyCsv = toCsv(monthlyRows, cols);
        downloadFile(monthlyCsv, `quickbooks_invoices_monthly_${invoiceDateStr}.csv`);
      }

      if (yearlyEntries.length > 0) {
        const yearlyNumbers = invoiceNumbers.slice(numberIdx, numberIdx + yearlyEntries.length);
        const yearlyRows = yearlyEntries.map(({ customer, rentals }, i) => {
          const base = rentals.reduce((sum, r) => sum + (parseFloat(r.rental_amount) || 0), 0);
          const totalWithTax = rentals.reduce((sum, r) => {
            const amt = parseFloat(r.rental_amount) || 0;
            const taxRate = r.tax_rate || 0.11;
            return sum + amt + amt * taxRate;
          }, 0);
          const tax = +(totalWithTax - base).toFixed(2);
          const total = +(base + tax).toFixed(2);
          const avgRate = rentals.length > 0 ? (base / rentals.length).toFixed(2) : '0.00';
          return {
            'Invoice#': yearlyNumbers[i] || `W${String(i + 1).padStart(5, '0')}`,
            'Customer Number': customer.CustomerListID,
            Name: customer.name,
            Total: total,
            Date: invoiceDateStr,
            TX: tax,
            'TX code': 'G',
            'Due date': dueDateStr,
            Rate: avgRate,
            '# of Bottles': rentals.length,
            Type: 'Yearly',
          };
        });
        const yearlyCsv = toCsv(yearlyRows, cols);
        downloadFile(yearlyCsv, `quickbooks_invoices_yearly_${invoiceDateStr}.csv`);
      }

      setError(null);
    } catch (err) {
      logger.error('exportInvoices error:', err);
      setError(err.message || 'Export failed');
    } finally {
      setExportingInvoices(false);
    }
  };

  const currentCustomers = useMemo(() => {
    if (activeTab === 0) return filteredCustomers;
    if (activeTab === 1) {
      return filteredCustomers
        .map((c) => ({ ...c, rentals: c.rentals.filter((r) => isMonthlyRental(r)) }))
        .filter((c) => c.rentals.length > 0);
    }
    if (activeTab === 2) {
      return filteredCustomers
        .map((c) => ({ ...c, rentals: c.rentals.filter((r) => isYearlyRental(r)) }))
        .filter((c) => c.rentals.length > 0);
    }
    return filteredCustomers;
  }, [filteredCustomers, activeTab]);

  const rentalListMode = activeTab === 0 ? 'all' : activeTab === 1 ? 'monthly' : 'yearly';

  // Open edit dialog when navigated from CustomerDetail "Edit rental rates (per asset)"
  useEffect(() => {
    if (loading || !location.state?.openEditForCustomerId) return;
    const customerId = location.state.openEditForCustomerId;
    const found = filteredCustomers.find(
      ({ customer }) => (customer?.CustomerListID || customer?.customer_id) === customerId
    );
    if (found) {
      setEditDialog({
        open: true,
        customer: found.customer,
        rentals: found.rentals || [],
        location: found.customer?.location || found.rentals?.[0]?.location,
        tax_code: found.rentals?.[0]?.tax_code
      });
      navigate('/rentals', { replace: true, state: {} });
    }
  }, [loading, location.state?.openEditForCustomerId, filteredCustomers, navigate]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, md: 3 },
          mb: 3,
          borderRadius: 3,
          border: '1px solid rgba(15, 23, 42, 0.08)',
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.25 }}>
              <Chip label="Billing" color="primary" size="small" sx={{ borderRadius: 999, fontWeight: 700 }} />
              <Chip label="Rentals" size="small" variant="outlined" sx={{ borderRadius: 999 }} />
            </Box>
            <Typography variant="h4" fontWeight="bold" sx={{ color: '#0f172a', letterSpacing: '-0.03em' }}>
              Rental operations workspace
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: 760 }}>
              Track active rentals, review billable inventory, and move directly into invoicing or per-customer rate adjustments from one billing workspace.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              <Link to="/rental/invoice-search" style={{ color: 'inherit', textDecoration: 'none', fontWeight: 500 }}>
                Billing & accounting →
              </Link>
              {' '}Invoice search, QuickBooks export, lease billing
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
            <Button
              variant="outlined"
              size="medium"
              onClick={(e) => setExportMenuAnchor(e.currentTarget)}
              endIcon={<KeyboardArrowDownIcon />}
              startIcon={<DownloadIcon />}
              disabled={filteredCustomers.length === 0}
            >
              Export
            </Button>
            <Menu
              anchorEl={exportMenuAnchor}
              open={Boolean(exportMenuAnchor)}
              onClose={() => setExportMenuAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            >
              <MenuItem
                onClick={() => {
                  exportToCSV(filteredCustomers);
                  setExportMenuAnchor(null);
                }}
                disabled={filteredCustomers.length === 0}
              >
                <ListItemIcon><DownloadIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Rentals CSV</ListItemText>
              </MenuItem>
              <MenuItem
                onClick={() => {
                  exportInvoices(filteredCustomers);
                  setExportMenuAnchor(null);
                }}
                disabled={filteredCustomers.length === 0 || exportingInvoices}
              >
                <ListItemIcon>{exportingInvoices ? <CircularProgress size={18} /> : <MoneyIcon fontSize="small" />}</ListItemIcon>
                <ListItemText>{exportingInvoices ? 'Exporting…' : 'QuickBooks CSV'}</ListItemText>
              </MenuItem>
            </Menu>
            <Button
              variant="outlined"
              size="medium"
              component={Link}
              to="/send-yearly-lease-emails"
              startIcon={<EmailIcon />}
            >
              Yearly lease emails
            </Button>
            <Button
              variant="contained"
              size="medium"
              startIcon={<EmailIcon />}
              onClick={() => {
                const customersWithRentals = filteredCustomers.filter(c => c.rentals && c.rentals.length > 0 && c.customer?.customer_type !== 'VENDOR');
                if (customersWithRentals.length === 0) {
                  alert('No customers with active rentals found');
                  return;
                }
                setBulkEmailDialogOpen(true);
              }}
              disabled={filteredCustomers.filter(c => c.rentals && c.rentals.length > 0 && c.customer?.customer_type !== 'VENDOR').length === 0}
            >
              Bulk Email Invoices
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={6}>
          <Card elevation={0} sx={{ height: '100%', borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
            <CardContent sx={{ p: 2.25 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="primary">
                    {stats.inHouse}
                  </Typography>
                  <Tooltip title="Unassigned bottles + bottles with vendor customers">
                    <Typography variant="body2" color="text.secondary" sx={{ cursor: 'help' }}>
                      Available Assets
                    </Typography>
                  </Tooltip>
                </Box>
                <HomeIcon sx={{ fontSize: 40, color: '#9e9e9e' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={6}>
          <Card elevation={0} sx={{ height: '100%', borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
            <CardContent sx={{ p: 2.25 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="success.main">
                    {workspaceRentedLineCount}
                  </Typography>
                  <Tooltip title="Rental rows in the workspace below (same list as Monthly + Yearly). Updates when you search. Not the same as bottle status in inventory.">
                    <Typography variant="body2" color="text.secondary" sx={{ cursor: 'help' }}>
                      Rented assets
                    </Typography>
                  </Tooltip>
                  <Typography variant="caption" color="success.main">
                    Monthly + yearly lines
                  </Typography>
                </Box>
                <PersonIcon sx={{ fontSize: 40, color: '#4caf50' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card elevation={0} sx={{ mb: 4, borderRadius: 2.5, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
        <CardContent sx={{ pt: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>Filters</Typography>
          <Grid container spacing={2} alignItems="flex-end">
            <Grid item xs={12} sm={12} md={6} lg={5}>
              <TextField
                fullWidth
                label="Search by barcode or customer"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                size="small"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3, overflowX: 'auto' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            minHeight: 48,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontSize: { xs: '0.85rem', sm: '0.95rem' },
              fontWeight: 700,
              minHeight: 48,
              px: { xs: 1.5, sm: 2, md: 3 },
              py: 1.5,
              '&.Mui-selected': {
                fontWeight: 600,
              }
            }
          }}
        >
          {tabs.map((tab, index) => (
            <Tab
              key={index}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>{tab.label}</span>
                  <Chip 
                    label={tab.count} 
                    size="small" 
                    color={tab.color || 'default'}
                    sx={{ 
                      height: 20,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      minWidth: 24,
                      '& .MuiChip-label': {
                        px: 1
                      }
                    }}
                  />
                </Box>
              }
            />
          ))}
        </Tabs>
      </Box>

      {/* Customer Rentals Table */}
      <TableContainer component={Paper} sx={{ overflowX: 'auto', borderRadius: 3, border: '1px solid rgba(15, 23, 42, 0.08)', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)' }}>
        <Table sx={{ minWidth: 640 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f8fafc' }}>
              <TableCell><strong>Customer</strong></TableCell>
              <TableCell><strong>Account Type</strong></TableCell>
              <TableCell><strong>Total Assets</strong></TableCell>
              <TableCell><strong>Rental Type</strong></TableCell>
              <TableCell><strong>Rental Rate</strong></TableCell>
              <TableCell><strong>Tax Code</strong></TableCell>
              <TableCell><strong>Location</strong></TableCell>
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <RentalsTableBody
              currentCustomers={currentCustomers}
              expandedCustomers={expandedCustomers}
              toggleExpanded={toggleExpanded}
              navigate={navigate}
              setInvoiceDialog={setInvoiceDialog}
              setEditDialog={setEditDialog}
              isRNB={isRNB}
              isRNS={isRNS}
              rentalListMode={rentalListMode}
            />
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit Customer Rentals Dialog - per-bottle: each bottle has its own Monthly/Yearly (one lease per bottle) */}
      <Dialog
        open={editDialog.open}
        onClose={() => setEditDialog({ open: false, customer: null, rentals: [] })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Rental Settings</DialogTitle>
        <DialogContent>
          {editDialog.customer && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="h6" gutterBottom>
                {editDialog.customer.name} ({editDialog.customer.CustomerListID})
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Set rental type and rate per asset. You can use different amounts per bottle (e.g. $10 for one, $9 for another).
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={showBottleDetailsInEdit}
                    onChange={(e) => setShowBottleDetailsInEdit(e.target.checked)}
                    color="primary"
                  />
                }
                label="Show bottle details"
                sx={{ mt: 1, mb: 0.5 }}
              />

              <Grid container spacing={2} sx={{ mt: 1 }}>
                {editDialog.rentals?.map((rental) => {
                  const barcode = rental.bottles?.barcode_number || rental.bottles?.barcode || rental.bottle_barcode || rental.id;
                  const displayLabel = barcode || (rental.is_dns ? `${rental.dns_product_code || 'DNS'} – ${rental.dns_description || 'Not Scanned'}` : 'Bottle');
                  const rentalType = rental.rental_type || 'monthly';
                  const amountStr = rental.rental_amount != null && rental.rental_amount !== '' ? String(rental.rental_amount) : '10';
                  const b = rental.bottles;
                  const detailParts = showBottleDetailsInEdit
                    ? b
                      ? [
                          b.gas_type && `Gas: ${b.gas_type}`,
                          b.product_code && `Product: ${b.product_code}`,
                          b.size && `Size: ${b.size}`,
                          b.serial_number && `Serial: ${b.serial_number}`,
                          (b.description || b.type) && `Description: ${b.description || b.type}`,
                        ].filter(Boolean)
                      : rental.is_dns
                        ? [
                            rental.dns_product_code && `Product: ${rental.dns_product_code}`,
                            rental.dns_description && `${rental.dns_description}`,
                          ].filter(Boolean)
                        : []
                    : [];
                  return (
                    <Grid item xs={12} key={rental.id}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
                        <Box sx={{ minWidth: 100, flex: '1 1 160px' }}>
                          <Typography variant="body2" fontWeight={600}>
                            {displayLabel}
                          </Typography>
                          {detailParts.length > 0 && (
                            <Typography variant="caption" color="text.secondary" component="div" sx={{ display: 'block', mt: 0.5, lineHeight: 1.5 }}>
                              {detailParts.join(' · ')}
                            </Typography>
                          )}
                        </Box>
                        <TextField
                          size="small"
                          label="Rate ($)"
                          type="number"
                          inputProps={{ min: 0, step: 0.01 }}
                          sx={{ width: 100 }}
                          value={amountStr}
                          onChange={(e) => setEditDialog(prev => ({
                            ...prev,
                            rentals: prev.rentals.map(r => r.id === rental.id ? { ...r, rental_amount: e.target.value } : r)
                          }))}
                        />
                        <FormControl size="small" sx={{ minWidth: 140 }}>
                          <InputLabel>Rental Type</InputLabel>
                          <Select
                            value={rentalType}
                            onChange={(e) => setEditDialog(prev => ({
                              ...prev,
                              rentals: prev.rentals.map(r => r.id === rental.id ? { ...r, rental_type: e.target.value } : r)
                            }))}
                            label="Rental Type"
                          >
                            <MenuItem value="monthly">Monthly</MenuItem>
                            <MenuItem value="yearly">Yearly</MenuItem>
                          </Select>
                        </FormControl>
                        {rentalType === 'yearly' && rental.lease_agreement_id && (
                          <Chip size="small" label="Lease linked" color="success" />
                        )}
                        {rental.rental_rate_meta?.shortLabel && (
                          <Tooltip title={rental.rental_rate_meta.label || ''}>
                            <Chip
                              size="small"
                              variant="outlined"
                              color="secondary"
                              label={rental.rental_rate_meta.shortLabel}
                              sx={{ fontWeight: 600 }}
                            />
                          </Tooltip>
                        )}
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>

              <Grid container spacing={3} sx={{ mt: 2 }}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Tax Code</InputLabel>
                    <Select
                      value={editDialog.tax_code ?? editDialog.rentals?.[0]?.tax_code ?? 'GST+PST'}
                      onChange={(e) => setEditDialog(prev => ({ ...prev, tax_code: e.target.value }))}
                      label="Tax Code"
                    >
                      <MenuItem value="GST">GST Only</MenuItem>
                      <MenuItem value="PST">PST Only</MenuItem>
                      <MenuItem value="GST+PST">GST+PST</MenuItem>
                      <MenuItem value="None">No Tax</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Location</InputLabel>
                    <Select
                      value={editDialog.location ?? editDialog.rentals?.[0]?.location ?? 'SASKATOON'}
                      onChange={(e) => setEditDialog(prev => ({ ...prev, location: e.target.value }))}
                      label="Location"
                    >
                      {locations.map((location) => (
                        <MenuItem key={location.id} value={location.name.toUpperCase()}>
                          {location.name} ({location.province})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              {editDialog.customer.customer_type === 'VENDOR' && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Note:</strong> This is a VENDOR account. No rental charges will be applied regardless of rate settings.
                  </Typography>
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, customer: null, rentals: [] })}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={updatingRentals}
            onClick={async () => {
              try {
                setUpdatingRentals(true);
                const customerId = editDialog.customer.CustomerListID;
                const customerName = editDialog.customer.name;
                const sharedTaxCode = editDialog.tax_code ?? editDialog.rentals?.[0]?.tax_code ?? 'GST+PST';
                const sharedLocation = editDialog.location ?? editDialog.rentals?.[0]?.location ?? 'SASKATOON';

                for (const rental of editDialog.rentals || []) {
                  // Skip bottle-only entries that don't have a rentals table row yet
                  const rentalId = rental.id;
                  if (typeof rentalId === 'string' && rentalId.startsWith('bottle_')) continue;

                  const newType = rental.rental_type || 'monthly';
                  const bottleId = rental.bottle_id || rental.bottles?.id;
                  let leaseAgreementId = rental.lease_agreement_id || null;
                  const rentalAmount = parseFloat(rental.rental_amount) || 10;

                  if (newType === 'yearly' && !leaseAgreementId && bottleId) {
                    // Create a per-bottle yearly lease for this rental (use this asset's rate)
                    const [numberData] = await getNextAgreementNumbers(organization?.id, 1);
                    if (!numberData) {
                      alert('Error creating lease: Failed to generate agreement number');
                      setUpdatingRentals(false);
                      return;
                    }
                    const startDate = new Date();
                    const endDate = new Date();
                    endDate.setFullYear(endDate.getFullYear() + 1);
                    const annualAmount = Math.round(rentalAmount * 12 * 100) / 100;
                    const nextBilling = new Date();
                    nextBilling.setFullYear(nextBilling.getFullYear() + 1);
                    const { data: newLease, error: insertLeaseError } = await supabase
                      .from('lease_agreements')
                      .insert({
                        organization_id: organization?.id,
                        customer_id: customerId,
                        customer_name: customerName,
                        agreement_number: numberData,
                        title: 'Annual Lease Agreement (per bottle)',
                        start_date: startDate.toISOString().split('T')[0],
                        end_date: endDate.toISOString().split('T')[0],
                        annual_amount: annualAmount,
                        billing_frequency: 'annual',
                        payment_terms: editDialog.customer?.payment_terms || 'Net 30',
                        tax_rate: 0.11,
                        bottle_id: bottleId,
                        status: 'active',
                        next_billing_date: nextBilling.toISOString().split('T')[0],
                        created_by: profile?.id,
                        updated_by: profile?.id,
                      })
                      .select('id')
                      .single();
                    if (insertLeaseError) {
                      logger.error('Error creating lease agreement:', insertLeaseError);
                      alert('Error creating lease: ' + insertLeaseError.message);
                      setUpdatingRentals(false);
                      return;
                    }
                    leaseAgreementId = newLease?.id;
                  } else if (newType === 'monthly') {
                    leaseAgreementId = null;
                  }

                  const { error } = await supabase
                    .from('rentals')
                    .update({
                      rental_type: newType,
                      lease_agreement_id: leaseAgreementId,
                      rental_amount: rentalAmount,
                      tax_code: sharedTaxCode,
                      location: sharedLocation,
                    })
                    .eq('id', rentalId);

                  if (error) {
                    logger.error('Error updating rental:', error);
                    alert('Error updating rental: ' + error.message);
                    setUpdatingRentals(false);
                    return;
                  }
                }

                setEditDialog({ open: false, customer: null, rentals: [] });
                await fetchRentals();
                alert(`Successfully updated rental settings for ${editDialog.customer?.name}`);
              } catch (error) {
                logger.error('Error updating rentals:', error);
                alert('Error updating rentals: ' + error.message);
              } finally {
                setUpdatingRentals(false);
              }
            }}
          >
            {updatingRentals ? 'Updating...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Invoice Generator Dialog */}
      <InvoiceGenerator
        open={invoiceDialog.open}
        onClose={() => setInvoiceDialog({ open: false, customer: null, rentals: [] })}
        customer={invoiceDialog.customer}
        rentals={invoiceDialog.rentals}
      />

      {/* Bulk Email Dialog */}
      <BulkInvoiceEmailDialog
        open={bulkEmailDialogOpen}
        onClose={() => setBulkEmailDialogOpen(false)}
        customers={filteredCustomers.filter(c => c.rentals && c.rentals.length > 0 && c.customer?.customer_type !== 'VENDOR')}
      />
    </Box>
  );
}

export default RentalsImproved;