import React, { useState } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  useMediaQuery,
  useTheme,
  IconButton,
  Collapse,
  Typography,
  Card,
  CardContent,
  Chip,
  Stack,
  Divider
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';

const ResponsiveTable = ({ 
  columns, 
  data, 
  renderActions, 
  renderExpandedContent,
  keyField = 'id',
  title = 'Data Table',
  searchable = false,
  onRowClick
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));
  const [expandedRows, setExpandedRows] = useState(new Set());

  const handleExpandRow = (rowId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rowId)) {
      newExpanded.delete(rowId);
    } else {
      newExpanded.add(rowId);
    }
    setExpandedRows(newExpanded);
  };

  // Mobile Card View
  const renderMobileCard = (row) => {
    const isExpanded = expandedRows.has(row[keyField]);
    
    return (
      <Card 
        key={row[keyField]} 
        sx={{ 
          mb: 2, 
          cursor: onRowClick ? 'pointer' : 'default',
          '&:hover': onRowClick ? {
            boxShadow: theme.shadows[4],
            transform: 'translateY(-2px)',
            transition: 'all 0.2s ease-in-out'
          } : {}
        }}
        onClick={() => onRowClick && onRowClick(row)}
      >
        <CardContent sx={{ p: 2 }}>
          {/* Primary Info */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              {columns.slice(0, 2).map((column, index) => (
                <Typography 
                  key={index}
                  variant={index === 0 ? 'subtitle1' : 'body2'}
                  color={index === 0 ? 'text.primary' : 'text.secondary'}
                  sx={{ mb: index === 0 ? 0.5 : 0 }}
                >
                  {column.render ? column.render(row[column.field], row) : row[column.field]}
                </Typography>
              ))}
            </Box>
            
            {/* Status/Action Chips */}
            <Stack direction="row" spacing={1} alignItems="center">
              {columns.slice(2, 4).map((column, index) => {
                if (column.chip) {
                  return (
                    <Chip
                      key={index}
                      label={column.render ? column.render(row[column.field], row) : row[column.field]}
                      size="small"
                      color={column.chipColor || 'default'}
                      variant="outlined"
                    />
                  );
                }
                return null;
              })}
              
              {renderActions && (
                <Box sx={{ ml: 1 }}>
                  {renderActions(row)}
                </Box>
              )}
            </Stack>
          </Box>

          {/* Secondary Info */}
          <Box sx={{ mb: 2 }}>
            {columns.slice(4, 6).map((column, index) => (
              <Typography 
                key={index}
                variant="body2" 
                color="text.secondary"
                sx={{ mb: 0.5 }}
              >
                <strong>{column.header}:</strong> {column.render ? column.render(row[column.field], row) : row[column.field]}
              </Typography>
            ))}
          </Box>

          {/* Expandable Content */}
          {renderExpandedContent && (
            <>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  {isExpanded ? 'Show less' : 'Show more details'}
                </Typography>
                <IconButton 
                  size="small" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExpandRow(row[keyField]);
                  }}
                >
                  {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Box>
              
              <Collapse in={isExpanded}>
                <Box sx={{ mt: 2 }}>
                  {renderExpandedContent(row)}
                </Box>
              </Collapse>
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  // Tablet Optimized View
  const renderTabletTable = () => {
    // Show fewer columns on tablet
    const tabletColumns = columns.slice(0, 6);
    
    return (
      <TableContainer component={Paper} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              {tabletColumns.map((column, index) => (
                <TableCell 
                  key={index}
                  sx={{ 
                    fontWeight: 600,
                    backgroundColor: theme.palette.grey[50],
                    fontSize: '0.875rem'
                  }}
                >
                  {column.header}
                </TableCell>
              ))}
              <TableCell sx={{ 
                fontWeight: 600,
                backgroundColor: theme.palette.grey[50],
                fontSize: '0.875rem'
              }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row) => (
              <React.Fragment key={row[keyField]}>
                <TableRow 
                  hover
                  sx={{ 
                    cursor: onRowClick ? 'pointer' : 'default',
                    '&:hover': {
                      backgroundColor: theme.palette.action.hover
                    }
                  }}
                  onClick={() => onRowClick && onRowClick(row)}
                >
                  {tabletColumns.map((column, index) => (
                    <TableCell 
                      key={index}
                      sx={{ 
                        fontSize: '0.875rem',
                        py: 1.5
                      }}
                    >
                      {column.render ? column.render(row[column.field], row) : row[column.field]}
                    </TableCell>
                  ))}
                  <TableCell sx={{ py: 1.5 }}>
                    {renderActions && renderActions(row)}
                  </TableCell>
                </TableRow>
                
                {/* Expandable row for additional details */}
                {renderExpandedContent && (
                  <TableRow>
                    <TableCell 
                      colSpan={tabletColumns.length + 1} 
                      sx={{ py: 0, border: 0 }}
                    >
                      <Collapse in={expandedRows.has(row[keyField])}>
                        <Box sx={{ p: 2, backgroundColor: theme.palette.grey[25] }}>
                          {renderExpandedContent(row)}
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // Desktop Full Table
  const renderDesktopTable = () => (
    <TableContainer component={Paper} sx={{ borderRadius: 2, overflow: 'hidden' }}>
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            {columns.map((column, index) => (
              <TableCell 
                key={index}
                sx={{ 
                  fontWeight: 600,
                  backgroundColor: theme.palette.grey[50],
                  fontSize: '0.875rem'
                }}
              >
                {column.header}
              </TableCell>
            ))}
            {renderActions && (
              <TableCell sx={{ 
                fontWeight: 600,
                backgroundColor: theme.palette.grey[50],
                fontSize: '0.875rem'
              }}>
                Actions
              </TableCell>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row) => (
            <TableRow 
              key={row[keyField]}
              hover
              sx={{ 
                cursor: onRowClick ? 'pointer' : 'default',
                '&:hover': {
                  backgroundColor: theme.palette.action.hover
                }
              }}
              onClick={() => onRowClick && onRowClick(row)}
            >
              {columns.map((column, index) => (
                <TableCell 
                  key={index}
                  sx={{ fontSize: '0.875rem', py: 1.5 }}
                >
                  {column.render ? column.render(row[column.field], row) : row[column.field]}
                </TableCell>
              ))}
              {renderActions && (
                <TableCell sx={{ py: 1.5 }}>
                  {renderActions(row)}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Box>
      {isMobile ? (
        <Box>
          {data.map(renderMobileCard)}
        </Box>
      ) : isTablet ? (
        renderTabletTable()
      ) : (
        renderDesktopTable()
      )}
    </Box>
  );
};

export default ResponsiveTable;
