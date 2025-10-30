import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResponsiveTable from '../../components/ResponsiveTable';

describe('ResponsiveTable', () => {
  const mockData = [
    { id: 1, name: 'Bottle 1', status: 'active', location: 'Warehouse A' },
    { id: 2, name: 'Bottle 2', status: 'rented', location: 'Customer Site' },
    { id: 3, name: 'Bottle 3', status: 'maintenance', location: 'Service Center' },
  ];

  const mockColumns = [
    { field: 'id', header: 'ID', sortable: true },
    { field: 'name', header: 'Name', sortable: true },
    { field: 'status', header: 'Status', sortable: true, chip: true },
    { field: 'location', header: 'Location', sortable: false },
  ];

  const defaultProps = {
    data: mockData,
    columns: mockColumns,
    loading: false,
    onRowClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders table with data', () => {
    render(<ResponsiveTable {...defaultProps} />);
    
    expect(screen.getByText('Bottle 1')).toBeInTheDocument();
    expect(screen.getByText('Bottle 2')).toBeInTheDocument();
    expect(screen.getByText('Bottle 3')).toBeInTheDocument();
  });

  it('renders column headers', () => {
    render(<ResponsiveTable {...defaultProps} />);
    
    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Location')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<ResponsiveTable {...defaultProps} loading={true} />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows empty state when no data', () => {
    render(<ResponsiveTable {...defaultProps} data={[]} />);
    
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('handles row clicks', () => {
    render(<ResponsiveTable {...defaultProps} />);
    
    const firstRow = screen.getByText('Bottle 1').closest('tr');
    fireEvent.click(firstRow);
    
    expect(defaultProps.onRowClick).toHaveBeenCalledWith(mockData[0]);
  });

  it('renders status chips', () => {
    render(<ResponsiveTable {...defaultProps} />);
    
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('rented')).toBeInTheDocument();
    expect(screen.getByText('maintenance')).toBeInTheDocument();
  });

  it('handles sorting', () => {
    render(<ResponsiveTable {...defaultProps} />);
    
    const nameHeader = screen.getByText('Name');
    fireEvent.click(nameHeader);
    
    // Check if sort indicator appears
    expect(nameHeader).toHaveClass('sortable');
  });

  it('renders custom cell content', () => {
    const customColumns = [
      ...mockColumns,
      {
        field: 'custom',
        header: 'Custom',
        render: (value, row) => `Custom ${row.name}`,
      },
    ];

    render(<ResponsiveTable {...defaultProps} columns={customColumns} />);
    
    expect(screen.getByText('Custom Bottle 1')).toBeInTheDocument();
  });

  it('handles responsive design', () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 600,
    });

    render(<ResponsiveTable {...defaultProps} />);
    
    // Should render mobile card layout
    expect(screen.getByText('Bottle 1')).toBeInTheDocument();
  });

  it('handles pagination', () => {
    const largeDataset = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      name: `Bottle ${i + 1}`,
      status: 'active',
      location: 'Warehouse',
    }));

    render(
      <ResponsiveTable 
        {...defaultProps} 
        data={largeDataset}
        pagination={{
          page: 1,
          pageSize: 10,
          totalCount: 100,
          onPageChange: jest.fn(),
          onPageSizeChange: jest.fn(),
        }}
      />
    );
    
    expect(screen.getByText('1-10 of 100')).toBeInTheDocument();
  });

  it('handles search functionality', () => {
    render(
      <ResponsiveTable 
        {...defaultProps}
        search={{
          value: 'Bottle 1',
          onChange: jest.fn(),
          placeholder: 'Search bottles...',
        }}
      />
    );
    
    expect(screen.getByPlaceholderText('Search bottles...')).toBeInTheDocument();
  });

  it('handles selection', () => {
    const onSelectionChange = jest.fn();
    
    render(
      <ResponsiveTable 
        {...defaultProps}
        selectable={true}
        onSelectionChange={onSelectionChange}
      />
    );
    
    const firstCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(firstCheckbox);
    
    expect(onSelectionChange).toHaveBeenCalled();
  });

  it('handles expandable rows', () => {
    const expandableContent = (row) => (
      <div data-testid={`expand-${row.id}`}>
        Expanded content for {row.name}
      </div>
    );

    render(
      <ResponsiveTable 
        {...defaultProps}
        expandable={true}
        expandableContent={expandableContent}
      />
    );
    
    const expandButton = screen.getAllByRole('button')[0];
    fireEvent.click(expandButton);
    
    expect(screen.getByTestId('expand-1')).toBeInTheDocument();
  });
});
