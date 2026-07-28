# Modern Design System Guide

This guide explains how to apply the modern, conversion-focused UI/UX design across all pages in the application.

## Design Principles

1. **Clean Information Hierarchy** - Clear headings, short text blocks, strong visual cues
2. **Mobile-First Responsive** - Works seamlessly on all devices
3. **Modern Typography** - Purposeful whitespace, high-contrast CTAs
4. **3D-Inspired UI** - Subtle depth, perspective layering, interactive elements
5. **Micro-Interactions** - Smooth animations, hover states, scroll-based reveals

## Reusable Components

### ModernCard
```jsx
import { ModernCard } from '../components/design-system';

<ModernCard hover3D={true}>
  {/* Your content */}
</ModernCard>
```

### ModernButton
```jsx
import { ModernButton } from '../components/design-system';

<ModernButton variant="contained" showArrow={true}>
  Start Free Trial
</ModernButton>
```

### PageHeader
```jsx
import { PageHeader } from '../components/design-system';

<PageHeader
  title="Page Title"
  subtitle="Page description"
  breadcrumbs={[
    { label: 'Home', to: '/home' },
    { label: 'Current Page', to: '/current' }
  ]}
  actions={<Button>Action</Button>}
/>
```

### StatCard
```jsx
import { StatCard } from '../components/design-system';
import { People as PeopleIcon } from '@mui/icons-material';

<StatCard
  label="Active Users"
  value="10K+"
  icon={<PeopleIcon />}
  color="#3B82F6"
/>
```

## Page Template Structure

### Dashboard/List Pages
```jsx
import { Box, Container } from '@mui/material';
import { PageHeader, ModernCard, StatCard } from '../components/design-system';
import AnimatedSection from '../components/AnimatedSection';

export default function YourPage() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Container maxWidth="lg">
        <PageHeader
          title="Page Title"
          subtitle="Page description"
          actions={<ModernButton>New Item</ModernButton>}
        />
        
        {/* Stats Section */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard label="Total" value="100" icon={<Icon />} />
          </Grid>
          {/* More stats... */}
        </Grid>
        
        {/* Content Section */}
        <AnimatedSection animation="fadeInUp">
          <ModernCard>
            {/* Your content */}
          </ModernCard>
        </AnimatedSection>
      </Container>
    </Box>
  );
}
```

### Detail Pages
```jsx
import { Box, Container, Grid } from '@mui/material';
import { PageHeader, ModernCard } from '../components/design-system';

export default function DetailPage() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Container maxWidth="lg">
        <PageHeader
          title="Item Name"
          subtitle="Item description"
          breadcrumbs={[
            { label: 'Home', to: '/home' },
            { label: 'Items', to: '/items' },
            { label: 'Item Name', to: '/items/1' }
          ]}
        />
        
        <Grid container spacing={4}>
          <Grid item xs={12} md={8}>
            <ModernCard>
              {/* Main content */}
            </ModernCard>
          </Grid>
          <Grid item xs={12} md={4}>
            <ModernCard>
              {/* Sidebar content */}
            </ModernCard>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
```

## Styling Guidelines

### Colors
- Primary: `#3B82F6` (Modern Blue)
- Secondary: `#8B5CF6` (Purple)
- Success: `#10B981` (Green)
- Warning: `#F59E0B` (Orange)
- Error: `#EF4444` (Red)

### Typography
- Headings: Font weight 700-800, gradient text for h1
- Body: Line height 1.7, readable font sizes
- Buttons: Font weight 700, no text transform

### Spacing
- Container padding: `py: 4` (vertical), `px: 3` (horizontal)
- Card padding: `p: 4`
- Grid spacing: `spacing={4}`

### 3D Effects
- Use `transformStyle: 'preserve-3d'` on containers
- Hover transforms: `perspective(1000px) rotateY(5deg) rotateX(-5deg) translateY(-8px)`
- Transition: `cubic-bezier(0.175, 0.885, 0.32, 1.275)`

## Animation Guidelines

### Scroll Animations
```jsx
import AnimatedSection from '../components/AnimatedSection';

<AnimatedSection animation="fadeInUp" delay={0.2}>
  {/* Content */}
</AnimatedSection>
```

### Hover Effects
- Cards: 3D rotation and elevation
- Buttons: Scale and translateZ
- Icons: TranslateZ in 3D space

## Mobile Responsiveness

Always use responsive breakpoints:
- `xs`: Mobile (< 600px)
- `sm`: Tablet (600px - 960px)
- `md`: Desktop (960px - 1280px)
- `lg`: Large Desktop (> 1280px)

Example:
```jsx
sx={{
  fontSize: { xs: '1rem', md: '1.25rem' },
  p: { xs: 2, md: 4 }
}}
```

## Checklist for Page Updates

- [ ] Use PageHeader component
- [ ] Replace Card with ModernCard
- [ ] Replace Button with ModernButton for CTAs
- [ ] Add AnimatedSection wrappers
- [ ] Use StatCard for statistics
- [ ] Add responsive breakpoints
- [ ] Use modern color palette
- [ ] Add 3D hover effects
- [ ] Ensure mobile-first design
- [ ] Test on all screen sizes

## Examples

See updated pages:
- `src/pages/LandingPage.jsx` - Full redesign example
- `src/pages/Home.jsx` - Dashboard template
- `src/components/MainLayout.jsx` - Navigation update

