# Gas Cylinder Management System - Component Documentation

## Overview

This document provides comprehensive documentation for all React components in the Gas Cylinder Management System. Components are organized by category and include props, usage examples, and implementation details.

## Table of Contents

- [Core Components](#core-components)
- [Layout Components](#layout-components)
- [Form Components](#form-components)
- [Data Display Components](#data-display-components)
- [Navigation Components](#navigation-components)
- [Utility Components](#utility-components)
- [Accessibility Components](#accessibility-components)
- [Owner Portal Components](#owner-portal-components)

## Core Components

### AuthProvider

Authentication context provider that manages user state, profile, and organization data.

**Location:** `src/hooks/useAuth.jsx`

**Props:**
- `children` (ReactNode) - Child components

**Usage:**
```jsx
import { AuthProvider } from './hooks/useAuth';

function App() {
  return (
    <AuthProvider>
      <YourApp />
    </AuthProvider>
  );
}
```

**Context Value:**
```typescript
interface AuthContext {
  user: User | null;
  profile: Profile | null;
  organization: Organization | null;
  loading: boolean;
  trialExpired: boolean;
  signOut: () => Promise<void>;
}
```

### ProtectedRoute

Route wrapper that requires authentication.

**Location:** `src/components/ProtectedRoute.jsx`

**Props:**
- `children` (ReactNode) - Child components to render when authenticated
- `fallback` (ReactNode, optional) - Component to render when not authenticated

**Usage:**
```jsx
import ProtectedRoute from './components/ProtectedRoute';

<Route path="/dashboard" element={
  <ProtectedRoute>
    <Dashboard />
  </ProtectedRoute>
} />
```

### RoleProtectedRoute

Route wrapper that requires specific user roles.

**Location:** `src/components/RoleProtectedRoute.jsx`

**Props:**
- `children` (ReactNode) - Child components to render when role matches
- `allowedRoles` (string[]) - Array of allowed roles
- `fallback` (ReactNode, optional) - Component to render when role doesn't match

**Usage:**
```jsx
import RoleProtectedRoute from './components/RoleProtectedRoute';

<Route path="/admin" element={
  <RoleProtectedRoute allowedRoles={['admin', 'owner']}>
    <AdminPanel />
  </RoleProtectedRoute>
} />
```

## Layout Components

### MainLayout

Main application layout with sidebar and content area.

**Location:** `src/components/MainLayout.jsx`

**Props:**
- `children` (ReactNode) - Main content
- `title` (string, optional) - Page title
- `breadcrumbs` (BreadcrumbItem[], optional) - Breadcrumb navigation
- `actions` (ReactNode, optional) - Action buttons in header

**Usage:**
```jsx
import MainLayout from './components/MainLayout';

function Dashboard() {
  return (
    <MainLayout 
      title="Dashboard"
      breadcrumbs={[
        { label: 'Home', href: '/home' },
        { label: 'Dashboard', href: '/dashboard' }
      ]}
    >
      <DashboardContent />
    </MainLayout>
  );
}
```

### Sidebar

Navigation sidebar component.

**Location:** `src/components/Sidebar.jsx`

**Props:**
- `open` (boolean) - Whether sidebar is open
- `onClose` (function) - Callback when sidebar closes
- `items` (SidebarItem[]) - Navigation items

**Usage:**
```jsx
import Sidebar from './components/Sidebar';

const sidebarItems = [
  { label: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
  { label: 'Bottles', href: '/bottles', icon: 'bottle' },
  { label: 'Customers', href: '/customers', icon: 'customers' }
];

<Sidebar 
  open={sidebarOpen} 
  onClose={() => setSidebarOpen(false)}
  items={sidebarItems}
/>
```

## Form Components

### AccessibleForm

Accessible form wrapper with validation and error handling.

**Location:** `src/components/AccessibleForm.jsx`

**Props:**
- `onSubmit` (function) - Form submission handler
- `initialValues` (object) - Initial form values
- `validationSchema` (object) - Validation rules
- `children` (ReactNode) - Form fields

**Usage:**
```jsx
import AccessibleForm from './components/AccessibleForm';

function CustomerForm() {
  const handleSubmit = (values) => {
    console.log('Form submitted:', values);
  };

  return (
    <AccessibleForm
      onSubmit={handleSubmit}
      initialValues={{ name: '', email: '' }}
      validationSchema={{
        name: { required: true, minLength: 2 },
        email: { required: true, type: 'email' }
      }}
    >
      <input name="name" placeholder="Customer Name" />
      <input name="email" placeholder="Email Address" />
      <button type="submit">Save Customer</button>
    </AccessibleForm>
  );
}
```

### AccessibleButton

Accessible button component with ARIA support.

**Location:** `src/components/AccessibleButton.jsx`

**Props:**
- `children` (ReactNode) - Button content
- `onClick` (function) - Click handler
- `variant` (string) - Button variant (primary, secondary, danger)
- `size` (string) - Button size (sm, md, lg)
- `disabled` (boolean) - Whether button is disabled
- `loading` (boolean) - Whether button is in loading state
- `ariaLabel` (string) - ARIA label for screen readers

**Usage:**
```jsx
import AccessibleButton from './components/AccessibleButton';

<AccessibleButton
  variant="primary"
  size="lg"
  onClick={handleSave}
  ariaLabel="Save customer information"
>
  Save Customer
</AccessibleButton>
```

## Data Display Components

### ResponsiveTable

Responsive table component that adapts to different screen sizes.

**Location:** `src/components/ResponsiveTable.jsx`

**Props:**
- `data` (array) - Table data
- `columns` (TableColumn[]) - Column definitions
- `loading` (boolean) - Loading state
- `onRowClick` (function) - Row click handler
- `pagination` (PaginationProps, optional) - Pagination configuration
- `search` (SearchProps, optional) - Search configuration
- `selectable` (boolean) - Whether rows are selectable
- `onSelectionChange` (function) - Selection change handler

**Usage:**
```jsx
import ResponsiveTable from './components/ResponsiveTable';

const columns = [
  { field: 'id', header: 'ID', sortable: true },
  { field: 'name', header: 'Name', sortable: true },
  { field: 'status', header: 'Status', chip: true, chipColor: 'success' }
];

const data = [
  { id: 1, name: 'Bottle 1', status: 'active' },
  { id: 2, name: 'Bottle 2', status: 'rented' }
];

<ResponsiveTable
  data={data}
  columns={columns}
  loading={false}
  onRowClick={(row) => console.log('Row clicked:', row)}
  pagination={{
    page: 1,
    pageSize: 10,
    totalCount: 100,
    onPageChange: (page) => setPage(page),
    onPageSizeChange: (size) => setPageSize(size)
  }}
/>
```

### ResponsiveGrid

Responsive grid component for displaying cards.

**Location:** `src/components/ResponsiveGrid.jsx`

**Props:**
- `data` (array) - Grid data
- `renderItem` (function) - Function to render each item
- `loading` (boolean) - Loading state
- `emptyMessage` (string) - Message when no data
- `columns` (object) - Column configuration for different breakpoints

**Usage:**
```jsx
import ResponsiveGrid from './components/ResponsiveGrid';

const renderBottleCard = (bottle) => (
  <div key={bottle.id} className="p-4 border rounded-lg">
    <h3>{bottle.name}</h3>
    <p>Status: {bottle.status}</p>
  </div>
);

<ResponsiveGrid
  data={bottles}
  renderItem={renderBottleCard}
  loading={loading}
  emptyMessage="No bottles found"
  columns={{
    mobile: 1,
    tablet: 2,
    desktop: 3
  }}
/>
```

### OptimizedTable

Table component with built-in pagination and query optimization.

**Location:** `src/components/OptimizedTable.jsx`

**Props:**
- `query` (function) - Query function for data fetching
- `columns` (TableColumn[]) - Column definitions
- `filters` (object) - Initial filters
- `sorting` (object) - Initial sorting
- `pageSize` (number) - Items per page

**Usage:**
```jsx
import OptimizedTable from './components/OptimizedTable';

const fetchBottles = async (params) => {
  return supabase
    .from('bottles')
    .select('*')
    .eq('organization_id', organization.id)
    .range(params.offset, params.offset + params.limit - 1);
};

<OptimizedTable
  query={fetchBottles}
  columns={columns}
  filters={{ status: 'active' }}
  sorting={{ field: 'name', direction: 'asc' }}
  pageSize={20}
/>
```

## Navigation Components

### AccessibleNavigation

Accessible navigation component with keyboard support.

**Location:** `src/components/AccessibleNavigation.jsx`

**Props:**
- `items` (NavItem[]) - Navigation items
- `orientation` (string) - Navigation orientation (horizontal, vertical)
- `ariaLabel` (string) - ARIA label for navigation

**Usage:**
```jsx
import AccessibleNavigation from './components/AccessibleNavigation';

const navItems = [
  { label: 'Home', href: '/home' },
  { label: 'Bottles', href: '/bottles' },
  { label: 'Customers', href: '/customers' }
];

<AccessibleNavigation
  items={navItems}
  orientation="horizontal"
  ariaLabel="Main navigation"
/>
```

## Utility Components

### LazyImage

Lazy loading image component.

**Location:** `src/components/LazyImage.jsx`

**Props:**
- `src` (string) - Image source URL
- `alt` (string) - Alt text for accessibility
- `placeholder` (string, optional) - Placeholder image URL
- `className` (string, optional) - CSS classes

**Usage:**
```jsx
import LazyImage from './components/LazyImage';

<LazyImage
  src="/images/bottle.jpg"
  alt="Gas cylinder"
  placeholder="/images/placeholder.jpg"
  className="w-full h-64 object-cover"
/>
```

### AccessibleDialog

Accessible dialog/modal component.

**Location:** `src/components/AccessibleDialog.jsx`

**Props:**
- `open` (boolean) - Whether dialog is open
- `onClose` (function) - Close handler
- `title` (string) - Dialog title
- `children` (ReactNode) - Dialog content
- `size` (string) - Dialog size (sm, md, lg, xl)

**Usage:**
```jsx
import AccessibleDialog from './components/AccessibleDialog';

<AccessibleDialog
  open={dialogOpen}
  onClose={() => setDialogOpen(false)}
  title="Confirm Action"
  size="md"
>
  <p>Are you sure you want to delete this item?</p>
  <div className="flex gap-2 mt-4">
    <button onClick={handleConfirm}>Confirm</button>
    <button onClick={() => setDialogOpen(false)}>Cancel</button>
  </div>
</AccessibleDialog>
```

## Accessibility Components

### AccessibleTable

Accessible table component with keyboard navigation.

**Location:** `src/components/AccessibleTable.jsx`

**Props:**
- `data` (array) - Table data
- `columns` (TableColumn[]) - Column definitions
- `onRowSelect` (function) - Row selection handler
- `ariaLabel` (string) - ARIA label for table

**Usage:**
```jsx
import AccessibleTable from './components/AccessibleTable';

<AccessibleTable
  data={bottles}
  columns={columns}
  onRowSelect={(row) => console.log('Selected:', row)}
  ariaLabel="Bottle inventory table"
/>
```

## Owner Portal Components

### OwnerProtectedRoute

Route wrapper for owner-only pages.

**Location:** `src/components/OwnerProtectedRoute.jsx`

**Props:**
- `children` (ReactNode) - Child components
- `fallback` (ReactNode, optional) - Fallback component

**Usage:**
```jsx
import OwnerProtectedRoute from './components/OwnerProtectedRoute';

<Route path="/owner-portal" element={
  <OwnerProtectedRoute>
    <OwnerPortal />
  </OwnerProtectedRoute>
} />
```

## Custom Hooks

### usePagination

Hook for managing pagination state.

**Location:** `src/hooks/usePagination.js`

**Props:**
- `initialPage` (number, optional) - Initial page number
- `initialPageSize` (number, optional) - Initial page size
- `initialTotalCount` (number, optional) - Initial total count

**Returns:**
```typescript
interface PaginationState {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  startIndex: number;
  endIndex: number;
  handlePageChange: (page: number) => void;
  handlePageSizeChange: (size: number) => void;
  handleNextPage: () => void;
  handlePreviousPage: () => void;
  setTotalCount: (count: number) => void;
  getPaginationInfo: () => PaginationInfo;
}
```

**Usage:**
```jsx
import { usePagination } from './hooks/usePagination';

function BottleList() {
  const pagination = usePagination({
    initialPage: 1,
    initialPageSize: 20,
    initialTotalCount: 100
  });

  return (
    <div>
      <ResponsiveTable
        data={bottles}
        columns={columns}
        pagination={pagination}
      />
    </div>
  );
}
```

### useLazyLoading

Hook for implementing lazy loading.

**Location:** `src/hooks/useLazyLoading.js`

**Props:**
- `threshold` (number, optional) - Intersection threshold
- `rootMargin` (string, optional) - Root margin for intersection observer

**Returns:**
```typescript
interface LazyLoadingState {
  isVisible: boolean;
  ref: RefObject<HTMLElement>;
}
```

**Usage:**
```jsx
import { useLazyLoading } from './hooks/useLazyLoading';

function LazyComponent() {
  const { isVisible, ref } = useLazyLoading();

  return (
    <div ref={ref}>
      {isVisible ? <ExpensiveComponent /> : <Placeholder />}
    </div>
  );
}
```

## Type Definitions

### TableColumn

```typescript
interface TableColumn {
  field: string;
  header: string;
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
  chip?: boolean;
  chipColor?: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
}
```

### PaginationProps

```typescript
interface PaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}
```

### SearchProps

```typescript
interface SearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSearch?: (value: string) => void;
  onClear?: () => void;
}
```

## Best Practices

1. **Accessibility First**: Always include ARIA labels and keyboard navigation
2. **Responsive Design**: Use responsive components for mobile compatibility
3. **Performance**: Implement lazy loading and pagination for large datasets
4. **Error Handling**: Include error boundaries and fallback states
5. **Type Safety**: Use TypeScript interfaces for component props
6. **Testing**: Write comprehensive tests for all components
7. **Documentation**: Document all props and usage examples

## Contributing

When adding new components:

1. Follow the existing naming conventions
2. Include TypeScript interfaces for props
3. Add accessibility features (ARIA labels, keyboard navigation)
4. Write comprehensive tests
5. Update this documentation
6. Follow the component structure guidelines

## Support

For component-related questions:
- Email: components@gascylinderapp.com
- Documentation: https://docs.gascylinderapp.com/components
- GitHub Issues: https://github.com/gascylinderapp/issues
