# Mobile App Design System Guide

This guide explains how to apply the modern, conversion-focused UI/UX design to the React Native mobile app.

## Design Principles

1. **Clean Information Hierarchy** - Clear headings, readable text, strong visual cues
2. **Touch-First Design** - Large tap targets, smooth animations
3. **Modern Typography** - Purposeful whitespace, high-contrast CTAs
4. **Gradient Accents** - Subtle gradients for depth and visual interest
5. **Micro-Interactions** - Smooth animations, haptic feedback

## Reusable Components

### ModernCard
```tsx
import { ModernCard } from '../components/design-system';

<ModernCard gradient={false} elevated={true}>
  {/* Your content */}
</ModernCard>
```

### ModernButton
```tsx
import { ModernButton } from '../components/design-system';

<ModernButton
  title="Start Scanning"
  onPress={() => {}}
  variant="primary"
  size="large"
  fullWidth
/>
```

### StatCard
```tsx
import { StatCard } from '../components/design-system';

<StatCard
  label="Total Scans"
  value="100"
  icon="📊"
  color="#3B82F6"
/>
```

## Theme Colors

### Light Theme (Default)
- Primary: `#3B82F6` (Modern Blue)
- Secondary: `#8B5CF6` (Purple)
- Success: `#10B981` (Green)
- Warning: `#F59E0B` (Orange)
- Error: `#EF4444` (Red)
- Background: `#F8FAFC`
- Surface: `#FFFFFF`

### Gradient Colors
- Primary Gradient: `['#3B82F6', '#8B5CF6']`
- Available via `colors.gradient` in theme context

## Screen Template Structure

### Dashboard/Home Screens
```tsx
import { View, ScrollView, SafeAreaView } from 'react-native';
import { StatCard, ModernCard } from '../components/design-system';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

export default function YourScreen() {
  const { colors } = useTheme();
  
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView>
        {/* Gradient Header */}
        <LinearGradient
          colors={colors.gradient || [colors.primary, colors.secondary]}
          style={styles.header}
        >
          {/* Header content */}
        </LinearGradient>
        
        {/* Stats */}
        <View style={styles.statsContainer}>
          <StatCard label="Total" value="100" color={colors.primary} />
        </View>
        
        {/* Content */}
        <ModernCard elevated>
          {/* Your content */}
        </ModernCard>
      </ScrollView>
    </SafeAreaView>
  );
}
```

## Styling Guidelines

### Spacing
- Container padding: `paddingHorizontal: 20`
- Card padding: `padding: 16-20`
- Section spacing: `marginBottom: 24`

### Typography
- Headings: Font weight 700-800
- Body: Font weight 400-500
- Buttons: Font weight 700

### Borders & Shadows
- Border radius: `16` for cards
- Border radius: `12` for buttons
- Shadow: Use `elevated` prop on ModernCard

### Colors
- Use theme colors from `useTheme()` hook
- Gradient backgrounds for headers and CTAs
- High contrast for text readability

## Animation Guidelines

### Touch Feedback
- Use `activeOpacity={0.8}` on TouchableOpacity
- Haptic feedback for important actions
- Smooth transitions (0.3s)

### Card Interactions
- Slight scale on press: `transform: [{ scale: 0.98 }]`
- Elevation changes on press

## Mobile-Specific Considerations

### Platform Differences
```tsx
import { Platform } from 'react-native';

const padding = Platform.OS === 'ios' && Platform.isPad ? 40 : 20;
```

### Safe Areas
Always use `SafeAreaView` for full-screen content:
```tsx
import { SafeAreaView } from 'react-native-safe-area-context';
```

### Touch Targets
- Minimum 44x44 points for touch targets
- Adequate spacing between interactive elements

## Checklist for Screen Updates

- [ ] Use ModernCard for content containers
- [ ] Use ModernButton for primary actions
- [ ] Use StatCard for statistics
- [ ] Add gradient headers where appropriate
- [ ] Use theme colors from useTheme hook
- [ ] Ensure proper spacing and padding
- [ ] Test on both iOS and Android
- [ ] Verify touch target sizes
- [ ] Add haptic feedback for actions
- [ ] Test with accessibility features

## Examples

See updated screens:
- `gas-cylinder-mobile/screens/HomeScreen.tsx` - Full redesign example
- `gas-cylinder-mobile/components/design-system/` - Reusable components

