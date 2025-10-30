import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  Chip,
  CircularProgress,
  Alert,
  Collapse,
  Typography,
  Card,
  CardContent,
  Stack,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { usePagination } from '../hooks/usePagination';
import { useLazyLoading } from '../hooks/useLazyLoading';
import { performanceMonitor } from '../utils/queryOptimizer';

const OptimizedTable = ({
  data = [],
  columns = [],
  loading = false,
  error = null,
  totalCount = 0,
  onRefresh,
  onExport,
  searchable = true,
  filterable = true,
  expandable = false,
  renderExpandedContent,
  onRowClick,
  keyField = 'id',
  title = 'Data Table',
  subtitle,
  actions,
  serverSidePagination = false,
  searchFields = [],
  filters = {},
  onFiltersChange,
  dense = false,
  stickyHeader = true,
  selectable = false,
  selectedRows = [],
  onSelectionChange
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [sortBy, setSortBy] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');

  const {
    page,
    rowsPerPage,
    handleChangePage,
    handleChangeRowsPerPage,
    getPaginationInfo
  } = usePagination(0, 25);

  // Client-side filtering and sorting
  const processedData = useMemo(() => {
    let filtered = data;

    // Apply search filter
    if (searchTerm && searchFields.length > 0) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(row =>
        searchFields.some(field => {
          const value = row[field];
          return value && value.toString().toLowerCase().includes(searchLower);
        })
      );
    }

    // Apply sorting
    if (sortBy) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];
        
        if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [data, searchTerm, searchFields, sortBy, sortOrder]);

  // Paginate data (client-side)
  const paginatedData = useMemo(() => {
    if (serverSidePagination) {
      return processedData;
    }
    
    const start = page * rowsPerPage;
    return processedData.slice(start, start + rowsPerPage);
  }, [processedData, page, rowsPerPage, serverSidePagination]);

  const handleSort = useCallback((column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  }, [sortBy, sortOrder]);

  const handleExpandRow = useCallback((rowId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rowId)) {
      newExpanded.delete(rowId);
    } else {
      newExpanded.add(rowId);
    }
    setExpandedRows(newExpanded);
  }, [expandedRows]);

  const handleSelectRow = useCallback((rowId) => {
    if (!onSelectionChange) return;
    
    const newSelected = [...selectedRows];
    const index = newSelected.indexOf(rowId);
    
    if (index > -1) {
      newSelected.splice(index, 1);
    } else {
      newSelected.push(rowId);
    }
    
    onSelectionChange(newSelected);
  }, [selectedRows, onSelectionChange]);

  const handleSelectAll = useCallback(() => {
    if (!onSelectionChange) return;
    
    if (selectedRows.length === paginatedData.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(paginatedData.map(row => row[keyField]));
    }
  }, [selectedRows, paginatedData, keyField, onSelectionChange]);

  const paginationInfo = getPaginationInfo(
    serverSidePagination ? totalCount : processedData.length
  );

  const renderCell = useCallback((column, row) => {
    if (column.render) {
      return column.render(row[column.field], row);
    }
    
    if (column.chip) {
      return (
        <Chip
          label={row[column.field]}
          size="small"
          color={column.chipColor || 'default'}
          variant="outlined"
        />
      );
    }
    
    return row[column.field] || '-';
  }, []);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
          <Box>
            <Typography variant="h5" fontWeight={600} sx={{ mb: 0.5 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          
          <Stack direction="row" spacing={1}>
            {onRefresh && (
              <Tooltip title="Refresh">
                <IconButton onClick={onRefresh} disabled={loading}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            )}
            {onExport && (
              <Tooltip title="Export">
                <IconButton onClick={onExport}>
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
            )}
            {actions}
          </Stack>
        </Box>

        {/* Search and Filters */}
        {(searchable || filterable) && (
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            {searchable && (
              <TextField
                size="small"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: 200 }}
              />
            )}
            {filterable && (
              <IconButton size="small">
                <FilterIcon />
              </IconButton>
            )}
          </Box>
        )}
      </Box>

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Table stickyHeader={stickyHeader} size={dense ? 'small' : 'medium'}>
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === paginatedData.length && paginatedData.length > 0}
                    onChange={handleSelectAll}
                  />
                </TableCell>
              )}
              {expandable && <TableCell padding="checkbox" />}
              {columns.map((column, index) => (
                <TableCell
                  key={index}
                  sx={{ 
                    fontWeight: 600,
                    backgroundColor: 'grey.50',
                    fontSize: '0.875rem',
                    cursor: column.sortable ? 'pointer' : 'default',
                    '&:hover': column.sortable ? { backgroundColor: 'grey.100' } : {}
                  }}
                  onClick={column.sortable ? () => handleSort(column.field) : undefined}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {column.header}
                    {column.sortable && sortBy === column.field && (
                      <Typography variant="caption" color="primary">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length + (selectable ? 1 : 0) + (expandable ? 1 : 0)}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                </TableCell>
              </TableRow>
            ) : paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (selectable ? 1 : 0) + (expandable ? 1 : 0)}>
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography color="text.secondary">
                      No data found
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row) => (
                <React.Fragment key={row[keyField]}>
                  <TableRow
                    hover
                    sx={{ 
                      cursor: onRowClick ? 'pointer' : 'default',
                      '&:hover': {
                        backgroundColor: 'action.hover'
                      }
                    }}
                    onClick={() => onRowClick && onRowClick(row)}
                  >
                    {selectable && (
                      <TableCell padding="checkbox">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(row[keyField])}
                          onChange={() => handleSelectRow(row[keyField])}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>
                    )}
                    {expandable && (
                      <TableCell padding="checkbox">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExpandRow(row[keyField]);
                          }}
                        >
                          {expandedRows.has(row[keyField]) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                      </TableCell>
                    )}
                    {columns.map((column, index) => (
                      <TableCell key={index} sx={{ fontSize: '0.875rem' }}>
                        {renderCell(column, row)}
                      </TableCell>
                    ))}
                  </TableRow>
                  
                  {/* Expandable Content */}
                  {expandable && renderExpandedContent && (
                    <TableRow>
                      <TableCell 
                        colSpan={columns.length + (selectable ? 1 : 0) + 1} 
                        sx={{ py: 0, border: 0 }}
                      >
                        <Collapse in={expandedRows.has(row[keyField])}>
                          <Box sx={{ p: 2, backgroundColor: 'grey.25' }}>
                            {renderExpandedContent(row)}
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        component="div"
        count={serverSidePagination ? totalCount : processedData.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[10, 25, 50, 100]}
        labelRowsPerPage="Rows per page:"
        labelDisplayedRows={({ from, to, count }) => 
          `${from}-${to} of ${count !== -1 ? count : `more than ${to}`}`
        }
      />
    </Box>
  );
};

export default OptimizedTable;
