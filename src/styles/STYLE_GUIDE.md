# Scanified Style Guide

## Overview
This guide documents the standardized styling approach for the Scanified application. All new components should follow these guidelines to ensure consistency across the application.

## Theme Colors
```javascript
primary: '#40B5AD'    // Teal - Main brand color
secondary: '#8B7BA8'  // Purple - Secondary brand color
success: '#10B981'    // Green - Success states
warning: '#F59E0B'    // Amber - Warning states
error: '#EF4444'      // Red - Error states
info: '#3B82F6'       // Blue - Info states
```

## Using Styled Components

### Basic Card
```jsx
import { StyledCard } from '../components/ui/StyledComponents';

<StyledCard>
  <Typography variant="h6">Card Title</Typography>
  <Typography>Card content goes here</Typography>
</StyledCard>
```

### Section with Title
```jsx
import { Section } from '../components/ui/StyledComponents';

<Section title="Section Title">
  <Typography>Section content</Typography>
</Section>
```

### Status Chips
```jsx
import { StatusChip } from '../components/ui/StyledComponents';

<StatusChip status="active" />
<StatusChip status="rented" label="Currently Rented" />
```

### Page Headers
```jsx
import { PageHeader, PrimaryButton } from '../components/ui/StyledComponents';

<PageHeader 
  title="Page Title"
  subtitle="Optional subtitle text"
  actions={[
    <PrimaryButton onClick={handleAdd}>
      Add New
    </PrimaryButton>
  ]}
/>
```

### Form Sections
```jsx
import { FormSection, StyledTextField } from '../components/ui/StyledComponents';

<FormSection title="Customer Information">
  <StyledTextField 
    label="Name" 
    value={name} 
    onChange={(e) => setName(e.target.value)} 
  />
  <StyledTextField 
    label="Email" 
    value={email} 
    onChange={(e) => setEmail(e.target.value)} 
  />
</FormSection>
```

### Empty States
```jsx
import { EmptyState, PrimaryButton } from '../components/ui/StyledComponents';
import { Inventory } from '@mui/icons-material';

<EmptyState
  icon={<Inventory sx={{ fontSize: 48 }} />}
  title="No items found"
  subtitle="Start by adding your first inventory item"
  action={
    <PrimaryButton onClick={handleAdd}>
      Add Item
    </PrimaryButton>
  }
/>
```

### Info Cards (Statistics)
```jsx
import { InfoCard } from '../components/ui/StyledComponents';
import { TrendingUp, Inventory } from '@mui/icons-material';

<InfoCard
  title="Total Inventory"
  value="1,234"
  subtitle="Last updated 5 min ago"
  icon={<Inventory />}
  color="primary"
  trend={
    <>
      <TrendingUp sx={{ fontSize: 16, color: 'success.main' }} />
      <Typography variant="caption" color="success.main">
        12% increase
      </Typography>
    </>
  }
/>
```

## Common Patterns

### Loading States
```jsx
import { LoadingCard } from '../components/ui/StyledComponents';

{loading ? (
  <LoadingCard message="Loading customers..." />
) : (
  // Your content
)}
```

### Grid Layouts
```jsx
import { GridContainer } from '../components/ui/StyledComponents';

<GridContainer columns={3} gap={3}>
  <InfoCard title="Card 1" value="123" />
  <InfoCard title="Card 2" value="456" />
  <InfoCard title="Card 3" value="789" />
</GridContainer>
```

### Action Bars
```jsx
import { ActionBar, PrimaryButton, SecondaryButton } from '../components/ui/StyledComponents';

<ActionBar>
  <StyledTextField placeholder="Search..." size="small" />
  <SecondaryButton>Filter</SecondaryButton>
  <PrimaryButton>Add New</PrimaryButton>
</ActionBar>
```

### Alerts
```jsx
import { StyledAlert } from '../components/ui/StyledComponents';

<StyledAlert severity="success">
  Operation completed successfully!
</StyledAlert>
```

## Migration Guide

### Old Pattern → New Pattern

#### Cards
```jsx
// OLD
<Card sx={{ p: 2, mb: 2, borderRadius: 2 }}>
  
// NEW
<StyledCard>
```

#### Buttons
```jsx
// OLD
<Button variant="contained" sx={{ borderRadius: 2 }}>

// NEW
<PrimaryButton>
```

#### Status Display
```jsx
// OLD
<Chip label="Active" color="success" size="small" />

// NEW
<StatusChip status="active" />
```

#### Page Headers
```jsx
// OLD
<Box sx={{ mb: 3 }}>
  <Typography variant="h4">Title</Typography>
  <Typography variant="body2" color="text.secondary">Subtitle</Typography>
</Box>

// NEW
<PageHeader title="Title" subtitle="Subtitle" />
```

## Best Practices

1. **Use semantic component names**: Choose components based on their purpose, not just appearance
2. **Consistent spacing**: Use the theme spacing units (multiples of 8px)
3. **Responsive design**: All components are mobile-first and responsive by default
4. **Accessibility**: All interactive elements have proper ARIA labels and keyboard support
5. **Performance**: Components use CSS-in-JS efficiently with minimal re-renders

## Component Checklist

Before creating a new component, check if one of these existing components fits your needs:
- [ ] StyledCard - For any card-based content
- [ ] Section - For page sections with optional titles
- [ ] PageHeader - For page titles with actions
- [ ] StatusChip - For status indicators
- [ ] InfoCard - For statistics and metrics
- [ ] EmptyState - For empty data states
- [ ] LoadingCard - For loading states
- [ ] FormSection - For grouping form fields
- [ ] ActionBar - For action buttons and filters
- [ ] GridContainer - For responsive grid layouts

## Need Help?

If you need a component that doesn't exist yet:
1. Check if it can be composed from existing components
2. Follow the patterns in `StyledComponents.jsx`
3. Add it to the component library for reuse
4. Update this guide with usage examples
