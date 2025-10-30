import React, { useState, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  IconButton,
  Tooltip,
  Box,
  Typography
} from '@mui/material';
import {
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';
import { ariaLabels, keyboardNavigation, screenReader } from '../utils/accessibility';

/**
 * Accessible Table Component
 * Provides WCAG 2.1 AA compliant table with proper ARIA labels and keyboard navigation
 */
const AccessibleTable = ({
  data = [],
  columns = [],
  loading = false,
  error = null,
  totalCount = 0,
  page = 0,
  rowsPerPage = 25,
  onPageChange,
  onRowsPerPageChange,
  onSort,
  sortBy,
  sortOrder = 'asc',
  onRowClick,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  keyField = 'id',
  title = 'Data Table',
  ...props
}) => {
  const [focusedRow, setFocusedRow] = useState(null);
  const [focusedColumn, setFocusedColumn] = useState(null);

  // Handle keyboard navigation for table
  const handleKeyDown = useCallback((event, rowIndex, columnIndex) => {
    const { key } = event;
    const maxRows = data.length - 1;
    const maxColumns = columns.length - 1;

    switch (key) {
      case keyboardNavigation.keys.ARROW_UP:
        event.preventDefault();
        if (rowIndex > 0) {
          setFocusedRow(rowIndex - 1);
          setFocusedColumn(columnIndex);
        }
        break;
      case keyboardNavigation.keys.ARROW_DOWN:
        event.preventDefault();
        if (rowIndex < maxRows) {
          setFocusedRow(rowIndex + 1);
          setFocusedColumn(columnIndex);
        }
        break;
      case keyboardNavigation.keys.ARROW_LEFT:
        event.preventDefault();
        if (columnIndex > 0) {
          setFocusedColumn(columnIndex - 1);
        }
        break;
      case keyboardNavigation.keys.ARROW_RIGHT:
        event.preventDefault();
        if (columnIndex < maxColumns) {
          setFocusedColumn(columnIndex + 1);
        }
        break;
      case keyboardNavigation.keys.ENTER:
      case keyboardNavigation.keys.SPACE:
        event.preventDefault();
        if (onRowClick && data[rowIndex]) {
          onRowClick(data[rowIndex]);
        }
        break;
      case keyboardNavigation.keys.HOME:
        event.preventDefault();
        setFocusedRow(0);
        setFocusedColumn(0);
        break;
      case keyboardNavigation.keys.END:
        event.preventDefault();
        setFocusedRow(maxRows);
        setFocusedColumn(maxColumns);
        break;
    }
  }, [data, columns, onRowClick]);

  // Handle row selection
  const handleRowSelection = useCallback((rowId, event) => {
    if (!onSelectionChange) return;
    
    const newSelected = [...selectedRows];
    const index = newSelected.indexOf(rowId);
    
    if (index > -1) {
      newSelected.splice(index, 1);
    } else {
      newSelected.push(rowId);
    }
    
    onSelectionChange(newSelected);
    
    // Announce selection change
    const isSelected = newSelected.includes(rowId);
    screenReader.announce(
      `Row ${isSelected ? 'selected' : 'deselected'}`,
      'polite'
    );
  }, [selectedRows, onSelectionChange]);

  // Handle column sorting
  const handleSort = useCallback((column, event) => {
    if (!onSort) return;
    
    event.preventDefault();
    const newOrder = sortBy === column ? (sortOrder === 'asc' ? 'desc' : 'asc') : 'asc';
    onSort(column, newOrder);
    
    // Announce sort change
    screenReader.announce(
      `Sorted by ${column} ${newOrder}`,
      'polite'
    );
  }, [sortBy, sortOrder, onSort]);

  // Render table header
  const renderHeader = () => (
    <TableHead>
      <TableRow role="row">
        {selectable && (
          <TableCell
            role="columnheader"
            aria-label="Select all rows"
            sx={{ width: 50 }}
          >
            <input
              type="checkbox"
              aria-label="Select all rows"
              checked={selectedRows.length === data.length && data.length > 0}
              onChange={(e) => {
                if (e.target.checked) {
                  onSelectionChange(data.map(row => row[keyField]));
                } else {
                  onSelectionChange([]);
                }
              }}
            />
          </TableCell>
        )}
        {columns.map((column, index) => (
          <TableCell
            key={index}
            role="columnheader"
            aria-label={ariaLabels.table.header(column.header)}
            aria-sort={
              sortBy === column.field
                ? sortOrder === 'asc' ? 'ascending' : 'descending'
                : 'none'
            }
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === keyboardNavigation.keys.ENTER || e.key === keyboardNavigation.keys.SPACE) {
                handleSort(column.field, e);
              }
            }}
            onClick={() => handleSort(column.field, { preventDefault: () => {} })}
            sx={{
              cursor: column.sortable ? 'pointer' : 'default',
              '&:focus': {
                outline: '2px solid #1976d2',
                outlineOffset: '2px'
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {column.header}
              {column.sortable && (
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  {sortBy === column.field ? (
                    sortOrder === 'asc' ? <ArrowUpIcon fontSize="small" /> : <ArrowDownIcon fontSize="small" />
                  ) : (
                    <Box sx={{ opacity: 0.3 }}>
                      <ArrowUpIcon fontSize="small" />
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );

  // Render table body
  const renderBody = () => (
    <TableBody>
      {loading ? (
        <TableRow>
          <TableCell
            colSpan={columns.length + (selectable ? 1 : 0)}
            role="cell"
            aria-label={ariaLabels.table.loading()}
          >
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Typography>Loading data...</Typography>
            </Box>
          </TableCell>
        </TableRow>
      ) : data.length === 0 ? (
        <TableRow>
          <TableCell
            colSpan={columns.length + (selectable ? 1 : 0)}
            role="cell"
            aria-label={ariaLabels.table.empty()}
          >
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Typography>No data available</Typography>
            </Box>
          </TableCell>
        </TableRow>
      ) : (
        data.map((row, rowIndex) => (
          <TableRow
            key={row[keyField]}
            role="row"
            aria-selected={selectedRows.includes(row[keyField])}
            tabIndex={0}
            onKeyDown={(e) => handleKeyDown(e, rowIndex, 0)}
            onClick={() => onRowClick && onRowClick(row)}
            sx={{
              cursor: onRowClick ? 'pointer' : 'default',
              '&:focus': {
                outline: '2px solid #1976d2',
                outlineOffset: '2px'
              },
              '&[aria-selected="true"]': {
                backgroundColor: 'action.selected'
              }
            }}
          >
            {selectable && (
              <TableCell
                role="cell"
                aria-label={`Select row ${rowIndex + 1}`}
              >
                <input
                  type="checkbox"
                  aria-label={`Select row ${rowIndex + 1}`}
                  checked={selectedRows.includes(row[keyField])}
                  onChange={(e) => handleRowSelection(row[keyField], e)}
                  onClick={(e) => e.stopPropagation()}
                />
              </TableCell>
            )}
            {columns.map((column, columnIndex) => (
              <TableCell
                key={columnIndex}
                role="cell"
                aria-label={ariaLabels.table.cell(
                  rowIndex + 1,
                  column.header,
                  row[column.field] || ''
                )}
                tabIndex={0}
                onKeyDown={(e) => handleKeyDown(e, rowIndex, columnIndex)}
                sx={{
                  '&:focus': {
                    outline: '2px solid #1976d2',
                    outlineOffset: '2px'
                  }
                }}
              >
                {column.render ? column.render(row[column.field], row) : row[column.field] || '-'}
              </TableCell>
            ))}
          </TableRow>
        ))
      )}
    </TableBody>
  );

  return (
    <Box>
      {/* Table title for screen readers */}
      <Typography variant="h2" sx={{ srOnly: true }}>
        {title}
      </Typography>
      
      <TableContainer component={Paper}>
        <Table
          role="table"
          aria-label={title}
          aria-rowcount={data.length}
          aria-colcount={columns.length + (selectable ? 1 : 0)}
          {...props}
        >
          {renderHeader()}
          {renderBody()}
        </Table>
      </TableContainer>

      {/* Accessible pagination */}
      {onPageChange && (
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={onPageChange}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={onRowsPerPageChange}
          rowsPerPageOptions={[10, 25, 50, 100]}
          labelRowsPerPage="Rows per page:"
          labelDisplayedRows={({ from, to, count }) => 
            ariaLabels.table.pagination(page + 1, Math.ceil(count / rowsPerPage))
          }
          aria-label="Table pagination"
        />
      )}
    </Box>
  );
};

export default AccessibleTable;
