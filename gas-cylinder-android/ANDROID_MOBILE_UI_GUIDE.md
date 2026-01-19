# Android Mobile UI Design Guide

This guide covers the mobile-optimized UI components for the React Native Android app.

## Overview

The mobile UI system provides:
- ✅ Smooth animations with React Native Reanimated
- ✅ Proper touch targets (minimum 48x48px)
- ✅ 3D touch effects with press feedback
- ✅ Gradient support
- ✅ Theme integration
- ✅ Accessibility support
- ✅ Performance optimizations

## Mobile Components

### `MobileCard`

Enhanced card component with 3D touch effects and animations.

```tsx
import { MobileCard } from '../components/design-system';

<MobileCard
  onPress={handlePress}
  elevated
  intensity="medium"
  gradient={false}
>
  <Text>Card Content</Text>
</MobileCard>
```

**Props:**
- `onPress` - Press handler
- `elevated` - Add shadow/elevation (default: true)
- `gradient` - Use gradient background (default: false)
- `intensity` - Touch effect intensity: 'light' | 'medium' | 'strong' (default: 'medium')
- `disabled` - Disable interactions (default: false)

### `MobileButton`

Button component with smooth animations and proper touch targets.

```tsx
import { MobileButton } from '../components/design-system';

<MobileButton
  title="Click Me"
  onPress={handlePress}
  variant="primary"
  size="medium"
  loading={false}
  fullWidth
  gradient
/>
```

**Props:**
- `title` - Button text (required)
- `onPress` - Press handler
- `variant` - 'primary' | 'secondary' | 'outline' | 'ghost' (default: 'primary')
- `size` - 'small' | 'medium' | 'large' (default: 'medium')
- `loading` - Show loading indicator (default: false)
- `disabled` - Disable button (default: false)
- `fullWidth` - Full width button (default: false)
- `gradient` - Use gradient for primary variant (default: false)
- `icon` - Optional icon component

**Sizes:**
- Small: 40px height
- Medium: 48px height (recommended for touch targets)
- Large: 56px height

### `MobileInput`

Enhanced input component with animations and proper mobile behavior.

```tsx
import { MobileInput } from '../components/design-system';

<MobileInput
  label="Email"
  value={email}
  onChangeText={setEmail}
  placeholder="Enter your email"
  keyboardType="email-address"
  autoCapitalize="none"
  leftIcon="mail"
  error={emailError}
/>
```

**Props:**
- `label` - Input label
- `value` - Input value (required)
- `onChangeText` - Change handler (required)
- `placeholder` - Placeholder text
- `secureTextEntry` - Password input (default: false)
- `error` - Error message
- `disabled` - Disable input (default: false)
- `multiline` - Multi-line input (default: false)
- `keyboardType` - Keyboard type (default: 'default')
- `autoCapitalize` - Auto capitalization (default: 'none')
- `leftIcon` - Ionicons name for left icon
- `rightIcon` - Ionicons name for right icon
- `onRightIconPress` - Right icon press handler

**Features:**
- Animated label that moves up on focus
- Animated border color change
- Minimum 48px height for touch targets
- 16px font size to prevent iOS zoom
- Password visibility toggle

### `MobileFab`

Floating Action Button with smooth animations.

```tsx
import { MobileFab } from '../components/design-system';

<MobileFab
  icon="add"
  onPress={handleAdd}
  position="bottom-right"
  size="medium"
  gradient
/>
```

**Props:**
- `icon` - Ionicons name (required)
- `onPress` - Press handler (required)
- `position` - 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' (default: 'bottom-right')
- `size` - 'small' | 'medium' | 'large' (default: 'medium')
- `color` - Custom color
- `gradient` - Use gradient background (default: false)
- `disabled` - Disable FAB (default: false)

## Usage Examples

### Login Screen

```tsx
import { MobileInput, MobileButton } from '../components/design-system';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <View style={styles.container}>
      <MobileInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="Enter your email"
        keyboardType="email-address"
        autoCapitalize="none"
        leftIcon="mail"
      />
      
      <MobileInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="Enter your password"
        secureTextEntry
        leftIcon="lock-closed"
      />

      <MobileButton
        title="Sign In"
        onPress={handleLogin}
        loading={loading}
        fullWidth
        gradient
      />
    </View>
  );
}
```

### Home Screen with Cards

```tsx
import { MobileCard, MobileButton } from '../components/design-system';

export default function HomeScreen() {
  return (
    <ScrollView>
      <MobileCard
        onPress={() => navigation.navigate('Scan')}
        elevated
        intensity="medium"
      >
        <Text style={styles.cardTitle}>Scan Cylinders</Text>
        <Text style={styles.cardSubtitle}>Scan barcodes quickly</Text>
      </MobileCard>

      <MobileCard
        onPress={() => navigation.navigate('Add')}
        elevated
        gradient
      >
        <Text style={styles.cardTitle}>Add Cylinder</Text>
        <Text style={styles.cardSubtitle}>Add new to inventory</Text>
      </MobileCard>
    </ScrollView>
  );
}
```

### Action Sheet with FAB

```tsx
import { MobileFab } from '../components/design-system';

export default function ListScreen() {
  return (
    <View style={styles.container}>
      {/* List content */}
      
      <MobileFab
        icon="add"
        onPress={handleAdd}
        position="bottom-right"
        size="large"
        gradient
      />
    </View>
  );
}
```

## Best Practices

### 1. Touch Targets
Always ensure interactive elements are at least 48x48px:

```tsx
// ✅ Good
<MobileButton size="medium" /> // 48px height

// ❌ Bad - too small
<TouchableOpacity style={{ height: 32 }} />
```

### 2. Animations
Use the built-in animations rather than custom ones:

```tsx
// ✅ Good - uses built-in animations
<MobileCard onPress={handlePress} intensity="medium" />

// ❌ Bad - custom animation may conflict
<Animated.View style={customAnimation}>
  <Card onPress={handlePress} />
</Animated.View>
```

### 3. Loading States
Always show loading states for async operations:

```tsx
// ✅ Good
<MobileButton
  title="Submit"
  loading={isSubmitting}
  disabled={isSubmitting}
/>

// ❌ Bad - no feedback
<MobileButton title="Submit" onPress={handleSubmit} />
```

### 4. Error Handling
Use MobileInput's error prop:

```tsx
// ✅ Good
<MobileInput
  value={email}
  onChangeText={setEmail}
  error={emailError}
/>

// ❌ Bad - error shown elsewhere
<MobileInput value={email} onChangeText={setEmail} />
<Text style={styles.error}>{emailError}</Text>
```

### 5. Gradients
Use gradients sparingly for emphasis:

```tsx
// ✅ Good - primary CTA
<MobileButton title="Sign In" gradient />

// ❌ Bad - too many gradients
<MobileButton title="Cancel" gradient />
<MobileButton title="Save" gradient />
```

## Theme Integration

All components automatically use the theme from `ThemeContext`:

```tsx
import { useTheme } from '../context/ThemeContext';

const { colors } = useTheme();
// colors.primary, colors.secondary, colors.background, etc.
```

## Performance Tips

1. **Use `useCallback` for handlers** to prevent unnecessary re-renders
2. **Memoize expensive components** with `React.memo`
3. **Avoid inline styles** - use StyleSheet.create
4. **Use `key` prop** for lists to optimize re-renders
5. **Lazy load** heavy screens/components

## Accessibility

All components include:
- Minimum touch targets (48x48px)
- Proper contrast ratios
- Screen reader support
- Keyboard navigation support
- High contrast mode support

## Common Issues & Solutions

### Issue: Button not responding to touches
**Solution:** Ensure button has minimum 48px height and is not covered by other views

### Issue: Input zooming on iOS
**Solution:** MobileInput uses 16px font size automatically - don't override it

### Issue: Animations stuttering
**Solution:** Use `useCallback` for handlers and avoid inline functions

### Issue: Gradient not showing
**Solution:** Ensure `gradient` prop is set to `true` and theme has gradient colors

## Migration Guide

### From ModernCard to MobileCard

```tsx
// Old
<ModernCard onPress={handlePress} elevated>
  <Text>Content</Text>
</ModernCard>

// New
<MobileCard 
  onPress={handlePress} 
  elevated 
  intensity="medium"
>
  <Text>Content</Text>
</MobileCard>
```

### From TouchableOpacity to MobileButton

```tsx
// Old
<TouchableOpacity onPress={handlePress} style={styles.button}>
  <Text>Click Me</Text>
</TouchableOpacity>

// New
<MobileButton title="Click Me" onPress={handlePress} />
```

## Resources

- [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)
- [Material Design Guidelines](https://material.io/design)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Android Material Design](https://material.io/design)

