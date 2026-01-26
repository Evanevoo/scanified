# Design System - Scanified

## Color Palette

### Primary Colors
- **Primary Teal**: `#40B5AD` - Main brand color (buttons, links, accents)
- **Primary Dark**: `#2E9B94` - Hover states
- **Secondary Turquoise**: `#48C9B0` - Accent color
- **Light Teal**: `#5FCDC5` - Highlights and gradients

### Neutral Colors
- **Black**: `#000000` - Headlines, primary text
- **Gray 900**: `#111827` - Primary text
- **Gray 700**: `#374151` - Secondary text
- **Gray 600**: `#4B5563` - Tertiary text
- **Gray 500**: `#6B7280` - Muted text
- **Gray 200**: `#E5E7EB` - Borders
- **Gray 50**: `#F9FAFB` - Backgrounds
- **White**: `#FFFFFF` - Backgrounds, cards

### Usage Guidelines
- Primary buttons: `bg-[#40B5AD]` with `hover:bg-[#2E9B94]`
- Text links: `text-[#40B5AD]` with `hover:text-[#2E9B94]`
- Borders: `border-gray-200` for subtle, `border-[#40B5AD]/30` for accent
- Backgrounds: `bg-white` for cards, `bg-gray-50` for sections

## Typography

### Headings
- **H1**: `text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900`
- **H2**: `text-4xl md:text-5xl font-bold text-gray-900`
- **H3**: `text-2xl md:text-3xl font-semibold text-gray-900`
- **H4**: `text-xl font-semibold text-gray-900`

### Body Text
- **Large**: `text-xl md:text-2xl text-gray-600`
- **Base**: `text-base text-gray-600`
- **Small**: `text-sm text-gray-600`
- **Muted**: `text-sm text-gray-500`

## Spacing Scale
- **Section Padding**: `py-24` (96px) for major sections
- **Card Padding**: `p-6` (24px) for card content
- **Gap**: `gap-6` (24px) for grids, `gap-4` (16px) for flex items
- **Margin Bottom**: `mb-8` (32px) for headings, `mb-4` (16px) for paragraphs

## Components

### Buttons
```jsx
// Primary Button
<Button className="bg-[#40B5AD] hover:bg-[#2E9B94] text-white shadow-lg hover:shadow-xl">

// Secondary Button  
<Button variant="outline" className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50">

// Gradient CTA Button
<Button className="bg-gradient-to-br from-[#40B5AD] to-[#48C9B0] text-white">
```

### Cards
```jsx
<Card className="border border-gray-200 bg-white hover:border-[#40B5AD]/30 hover:shadow-lg transition-all">
```

### Badges
```jsx
<Badge className="border border-[#40B5AD]/20 bg-[#40B5AD]/10 text-[#40B5AD]">
```

## Layout Patterns

### Hero Section
- Background: `bg-gradient-to-b from-white via-gray-50/50 to-white`
- Container: `container mx-auto px-4`
- Max width: `max-w-5xl mx-auto` for content
- Text alignment: `text-center`

### Section Spacing
- Between sections: `py-24`
- Internal spacing: `mb-16` for section headers, `mb-8` for content

### Grid Layouts
- Features: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`
- Benefits: `grid grid-cols-1 md:grid-cols-2 gap-6`

## Animations
- Fade in: `opacity: 0 → 1` with `y: 20 → 0`
- Duration: `0.5s - 0.6s` for most animations
- Stagger: `delay: index * 0.1` for lists

## Accessibility
- Focus states: `focus-visible:ring-2 focus-visible:ring-[#40B5AD]/50`
- Contrast: All text meets WCAG AA standards
- Interactive elements: Minimum 44x44px touch targets
