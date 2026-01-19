# Design System Components

## Mobile-Optimized Components

All mobile components automatically adapt based on screen size and provide:
- Proper touch targets (minimum 44x44px)
- Optimized spacing and typography
- Touch-friendly interactions
- Performance optimizations

### `MobileCard`
Card component optimized for mobile with proper touch targets.

```jsx
import { MobileCard } from '../components/design-system';

<MobileCard onClick={handleClick}>
  <Typography>Card content</Typography>
</MobileCard>
```

### `MobileButton`
Button with mobile-optimized touch targets and feedback.

```jsx
import { MobileButton } from '../components/design-system';

<MobileButton variant="contained" fullWidth onClick={handleClick}>
  Click Me
</MobileButton>
```

### `MobileLayout`
Responsive container with mobile-optimized padding.

```jsx
import { MobileLayout } from '../components/design-system';

<MobileLayout maxWidth="lg">
  Content here
</MobileLayout>
```

### `MobileGrid`
Responsive grid with mobile-optimized spacing.

```jsx
import { MobileGrid } from '../components/design-system';

<MobileGrid columns={{ xs: 1, sm: 2, md: 3 }} spacing={{ xs: 2, sm: 3 }}>
  {items.map(item => <Grid item key={item.id}>...</Grid>)}
</MobileGrid>
```

### `MobileStack`
Responsive stack with mobile-optimized spacing and direction.

```jsx
import { MobileStack } from '../components/design-system';

<MobileStack 
  direction={{ xs: 'column', sm: 'row' }}
  spacing={{ xs: 2, sm: 3 }}
>
  <Button>Button 1</Button>
  <Button>Button 2</Button>
</MobileStack>
```

### `MobileTypography`
Responsive typography that scales appropriately on mobile.

```jsx
import { MobileTypography } from '../components/design-system';

<MobileTypography variant="h1" mobileVariant="h2">
  Responsive Heading
</MobileTypography>
```

### `MobileBottomSheet`
Bottom sheet drawer optimized for mobile devices.

```jsx
import { MobileBottomSheet } from '../components/design-system';

<MobileBottomSheet open={open} onClose={handleClose} title="Menu">
  Content here
</MobileBottomSheet>
```

### `MobileFab`
Floating Action Button optimized for mobile.

```jsx
import { MobileFab } from '../components/design-system';
import { Add as AddIcon } from '@mui/icons-material';

<MobileFab color="primary" onClick={handleAdd}>
  <AddIcon />
</MobileFab>
```

## 3D Touch Effects

The design system includes reusable 3D touch effect components that add depth and interactivity to UI elements.

### Components

#### `Touch3D`
A wrapper component that adds 3D hover/touch effects to any element.

**Props:**
- `intensity` - `'light' | 'medium' | 'strong'` - Controls the intensity of the 3D effect (default: `'medium'`)
- `perspective` - `number` - CSS perspective value (default: `1000`)
- `enablePress` - `boolean` - Enable press-down animation on click/touch (default: `true`)
- `sx` - Material-UI sx prop for custom styling

**Example:**
```jsx
import { Touch3D } from '../components/design-system';

<Touch3D intensity="medium">
  <Box sx={{ p: 3, bgcolor: 'background.paper' }}>
    Content with 3D effect
  </Box>
</Touch3D>
```

#### `Card3D`
A Card component with built-in 3D touch effects.

**Props:**
- `intensity` - `'light' | 'medium' | 'strong'` - Controls the intensity (default: `'medium'`)
- All standard Material-UI Card props

**Example:**
```jsx
import { Card3D } from '../components/design-system';

<Card3D intensity="medium">
  <Typography variant="h6">Card Title</Typography>
  <Typography>Card content</Typography>
</Card3D>
```

#### `Button3D`
A Button component with built-in 3D touch effects.

**Props:**
- `intensity` - `'light' | 'medium' | 'strong'` - Controls the intensity (default: `'medium'`)
- All standard Material-UI Button props

**Example:**
```jsx
import { Button3D } from '../components/design-system';

<Button3D variant="contained" onClick={handleClick}>
  Click Me
</Button3D>
```

### Usage Examples

#### Applying to Feature Cards
```jsx
import { Card3D } from '../components/design-system';

{features.map((feature) => (
  <Grid item xs={12} md={6} key={feature.id}>
    <Card3D intensity="medium">
      <Typography variant="h5">{feature.title}</Typography>
      <Typography>{feature.description}</Typography>
    </Card3D>
  </Grid>
))}
```

#### Applying to Navigation Buttons
```jsx
import { Touch3D } from '../components/design-system';

<Touch3D intensity="light">
  <Button onClick={() => navigate('/page')}>
    Navigate
  </Button>
</Touch3D>
```

#### Custom Wrapper
```jsx
import { Touch3D } from '../components/design-system';

<Touch3D intensity="strong" sx={{ width: '100%' }}>
  <Paper sx={{ p: 4 }}>
    Custom content with strong 3D effect
  </Paper>
</Touch3D>
```

### Intensity Levels

- **light**: Subtle lift effect, good for navigation items and small buttons
- **medium**: Balanced effect, good for cards and feature sections (default)
- **strong**: Pronounced effect, good for hero CTAs and important elements

### Browser Support

The 3D touch effects use CSS transforms and work on all modern browsers. On mobile devices, touch events trigger the press animation, while hover effects work on desktop.

