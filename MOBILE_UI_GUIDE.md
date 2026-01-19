# Mobile UI Design Guide

This guide covers the mobile-optimized components and best practices for building mobile-friendly interfaces in the Gas Cylinder App.

## Overview

The mobile UI system provides:
- ✅ Proper touch targets (minimum 44x44px)
- ✅ Responsive typography and spacing
- ✅ Touch-optimized interactions
- ✅ Performance optimizations
- ✅ Safe area support for notched devices
- ✅ Prevention of common mobile issues (double-tap zoom, etc.)

## Mobile Components

### Core Components

#### `MobileCard`
Card component optimized for mobile with proper touch targets and spacing.

```jsx
import { MobileCard } from '../components/design-system';

<MobileCard onClick={handleClick} intensity="medium">
  <Typography>Card content</Typography>
</MobileCard>
```

**Props:**
- `intensity` - 3D effect intensity ('light' | 'medium' | 'strong')
- `onClick` - Click handler
- All standard Card props

#### `MobileButton`
Button with mobile-optimized touch targets (48x48px minimum).

```jsx
import { MobileButton } from '../components/design-system';

<MobileButton variant="contained" fullWidth onClick={handleClick}>
  Click Me
</MobileButton>
```

**Features:**
- Minimum 48px height for easy tapping
- Optimized font size (1rem)
- Better touch feedback
- Full width option for mobile

#### `MobileLayout`
Responsive container with mobile-optimized padding.

```jsx
import { MobileLayout } from '../components/design-system';

<MobileLayout maxWidth="lg">
  Your content here
</MobileLayout>
```

**Breakpoints:**
- Mobile (< 600px): 16px padding
- Tablet (600-900px): 24px padding
- Desktop (> 900px): 32px padding

#### `MobileGrid`
Responsive grid with mobile-optimized spacing.

```jsx
import { MobileGrid } from '../components/design-system';

<MobileGrid 
  columns={{ xs: 1, sm: 2, md: 3 }}
  spacing={{ xs: 2, sm: 3 }}
>
  {items.map(item => (
    <Grid item key={item.id}>
      <MobileCard>{item.content}</MobileCard>
    </Grid>
  ))}
</MobileGrid>
```

#### `MobileStack`
Responsive stack with mobile-optimized spacing and direction.

```jsx
import { MobileStack } from '../components/design-system';

<MobileStack 
  direction={{ xs: 'column', sm: 'row' }}
  spacing={{ xs: 2, sm: 3 }}
>
  <MobileButton>Button 1</MobileButton>
  <MobileButton>Button 2</MobileButton>
</MobileStack>
```

#### `MobileTypography`
Responsive typography that scales appropriately on mobile.

```jsx
import { MobileTypography } from '../components/design-system';

<MobileTypography variant="h1" mobileVariant="h2">
  Responsive Heading
</MobileTypography>
```

**Auto-scaling:**
- h1 → h2 on mobile
- h2 → h3 on mobile
- h3 → h4 on mobile
- etc.

#### `MobileBottomSheet`
Bottom sheet drawer optimized for mobile devices.

```jsx
import { MobileBottomSheet } from '../components/design-system';

const [open, setOpen] = useState(false);

<MobileBottomSheet 
  open={open} 
  onClose={() => setOpen(false)} 
  title="Menu"
  height="80vh"
>
  <List>
    <ListItem>Item 1</ListItem>
    <ListItem>Item 2</ListItem>
  </List>
</MobileBottomSheet>
```

#### `MobileFab`
Floating Action Button optimized for mobile.

```jsx
import { MobileFab } from '../components/design-system';
import { Add as AddIcon } from '@mui/icons-material';

<MobileFab color="primary" onClick={handleAdd}>
  <AddIcon />
</MobileFab>
```

## Mobile Utilities

### `mobileUtils.js`

Helper functions for mobile-specific logic:

```jsx
import { 
  isMobileDevice, 
  isTabletDevice, 
  isTouchDevice,
  getTouchTargetSize,
  getSafeAreaInsets 
} from '../utils/mobileUtils';

// Check if device is mobile
const isMobile = isMobileDevice(theme);

// Check if device supports touch
const supportsTouch = isTouchDevice();

// Get optimal touch target size
const buttonSize = getTouchTargetSize(48); // Returns max(48, 44)

// Get safe area insets for notched devices
const insets = getSafeAreaInsets();
```

## Mobile CSS

Global mobile styles are in `src/styles/mobile.css`:

- Touch target optimization
- Form input improvements (prevents iOS zoom)
- Typography scaling
- Safe area support
- Scrollbar optimization
- Focus states

## Best Practices

### 1. Touch Targets
Always ensure interactive elements are at least 44x44px:

```jsx
// ✅ Good
<MobileButton>Click Me</MobileButton>

// ❌ Bad - too small
<IconButton size="small" /> // Use MobileFab instead
```

### 2. Spacing
Use responsive spacing:

```jsx
// ✅ Good
<MobileStack spacing={{ xs: 2, sm: 3 }}>
  <Button>1</Button>
  <Button>2</Button>
</MobileStack>

// ❌ Bad - fixed spacing
<Stack spacing={3}>
  <Button>1</Button>
  <Button>2</Button>
</Stack>
```

### 3. Typography
Use MobileTypography for responsive text:

```jsx
// ✅ Good
<MobileTypography variant="h1">
  Title
</MobileTypography>

// ❌ Bad - fixed size
<Typography variant="h1" sx={{ fontSize: '3rem' }}>
  Title
</Typography>
```

### 4. Forms
Always use 16px font size for inputs to prevent iOS zoom:

```jsx
// ✅ Good - MobileButton handles this automatically
<MobileButton>Submit</MobileButton>

// For custom inputs
<TextField 
  sx={{ 
    '& input': { fontSize: '16px' } // Prevents iOS zoom
  }} 
/>
```

### 5. Navigation
Use MobileBottomSheet for mobile menus:

```jsx
// ✅ Good
<MobileBottomSheet open={menuOpen} onClose={handleClose}>
  <NavigationMenu />
</MobileBottomSheet>

// ❌ Bad - regular drawer on mobile
<Drawer anchor="left" open={menuOpen}>
  <NavigationMenu />
</Drawer>
```

## Responsive Breakpoints

The app uses Material-UI breakpoints:

- `xs`: 0px - Extra small devices (phones)
- `sm`: 600px - Small devices (tablets)
- `md`: 900px - Medium devices (small laptops)
- `lg`: 1200px - Large devices (desktops)
- `xl`: 1536px - Extra large devices (large desktops)

## Testing on Mobile

### iOS Safari
- Test on actual device or iOS Simulator
- Check safe area insets on notched devices
- Verify touch targets are tappable
- Test form inputs don't trigger zoom

### Android Chrome
- Test on actual device or Android Emulator
- Verify touch feedback is visible
- Check scrolling performance
- Test bottom navigation

## Common Issues & Solutions

### Issue: Double-tap zoom on buttons
**Solution:** Use `MobileButton` or add `touch-action: manipulation` CSS

### Issue: Input fields zoom on iOS
**Solution:** Ensure font-size is at least 16px (MobileButton handles this)

### Issue: Small touch targets
**Solution:** Use MobileButton or ensure min-height/min-width of 44px

### Issue: Text too small on mobile
**Solution:** Use MobileTypography which auto-scales

### Issue: Cards too close together
**Solution:** Use MobileGrid with proper spacing prop

## Examples

### Mobile-Optimized Page

```jsx
import { 
  MobileLayout, 
  MobileGrid, 
  MobileCard, 
  MobileButton,
  MobileTypography 
} from '../components/design-system';

export default function MyPage() {
  return (
    <MobileLayout>
      <MobileTypography variant="h1" sx={{ mb: 3 }}>
        Page Title
      </MobileTypography>

      <MobileGrid columns={{ xs: 1, sm: 2 }} spacing={{ xs: 2, sm: 3 }}>
        {items.map(item => (
          <Grid item key={item.id}>
            <MobileCard onClick={() => handleClick(item)}>
              <MobileTypography variant="h6">{item.title}</MobileTypography>
            </MobileCard>
          </Grid>
        ))}
      </MobileGrid>

      <MobileStack 
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 2, sm: 3 }}
        sx={{ mt: 4 }}
      >
        <MobileButton variant="contained" fullWidth>
          Primary Action
        </MobileButton>
        <MobileButton variant="outlined" fullWidth>
          Secondary Action
        </MobileButton>
      </MobileStack>
    </MobileLayout>
  );
}
```

## Performance Tips

1. **Lazy load heavy components** on mobile
2. **Use MobileBottomSheet** instead of full-screen modals
3. **Optimize images** for mobile screens
4. **Reduce animations** on low-end devices
5. **Use Touch3D** with 'light' intensity on mobile

## Accessibility

All mobile components include:
- Proper ARIA labels
- Keyboard navigation support
- Focus indicators
- Screen reader compatibility
- High contrast support

## Resources

- [Material-UI Breakpoints](https://mui.com/material-ui/customization/breakpoints/)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Material Design Mobile Guidelines](https://material.io/design/usability/accessibility.html)

