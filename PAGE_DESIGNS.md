# Complete Page Design Guide - Scanified

## Design System Overview

### Color Palette
- **Primary**: `#40B5AD` (Teal)
- **Primary Dark**: `#2E9B94` (Hover states)
- **Secondary**: `#48C9B0` (Turquoise)
- **Light Teal**: `#5FCDC5` (Highlights)
- **Text**: `#111827` (Gray 900) / `#6B7280` (Gray 600)
- **Borders**: `#E5E7EB` (Gray 200)
- **Backgrounds**: `#FFFFFF` / `#F9FAFB` (Gray 50)

### Typography Scale
- **H1**: `text-5xl md:text-6xl lg:text-7xl font-bold`
- **H2**: `text-4xl md:text-5xl font-bold`
- **H3**: `text-2xl md:text-3xl font-semibold`
- **Body**: `text-base text-gray-600`
- **Small**: `text-sm text-gray-500`

### Spacing
- **Section Padding**: `py-24` (96px)
- **Card Padding**: `p-6` (24px)
- **Gap**: `gap-6` (24px)

---

## Page Designs

### 1. Landing Page (`/`)
**Status**: ✅ Complete

**Design Elements**:
- Hero section with gradient background
- Trust indicators (500+ businesses, 50K+ assets)
- Feature cards grid (3 columns)
- Benefits section with checkmarks
- Final CTA with gradient background
- Footer with links

**Key Components**:
- `FeatureCard` - Hover effects, gradient icon backgrounds
- `TrustIndicator` - Icon + value + label
- `BenefitItem` - Checkmark + text
- Gradient CTA section

---

### 2. Login Page (`/login`)
**Status**: 🔄 Needs Update

**Design Pattern**:
```
┌─────────────────────────────────┐
│                                 │
│   [Logo] Scanified              │
│                                 │
│   Welcome Back                  │
│   Sign in to your account       │
│                                 │
│   ┌─────────────────────────┐   │
│   │ Email                   │   │
│   └─────────────────────────┘   │
│                                 │
│   ┌─────────────────────────┐   │
│   │ Password                 │   │
│   └─────────────────────────┘   │
│                                 │
│   Forgot password?              │
│                                 │
│   ┌─────────────────────────┐   │
│   │   Sign In               │   │
│   └─────────────────────────┘   │
│                                 │
│   ───────── OR ─────────        │
│                                 │
│   ┌─────────────────────────┐   │
│   │ Create Free Account      │   │
│   └─────────────────────────┘   │
│                                 │
│   ← Back to Home                │
└─────────────────────────────────┘
```

**Design Specs**:
- Centered card: `max-w-md mx-auto`
- Card: `border border-gray-200 bg-white rounded-2xl shadow-lg`
- Input fields: `border-2 border-gray-300 rounded-xl`
- Primary button: `bg-[#40B5AD] hover:bg-[#2E9B94]`
- Background: `bg-gradient-to-b from-white via-gray-50/50 to-white`

---

### 3. Dashboard/Home Page (`/home`)
**Status**: 🔄 Needs Update

**Design Pattern**:
```
┌─────────────────────────────────────────────┐
│ Welcome back, [Name]                        │
│ Here's what's happening today               │
├─────────────────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐        │
│ │ 500+ │ │ 50K+ │ │ 40%  │ │ 4.9/5│        │
│ │Cust. │ │Assets│ │Loss  │ │Rating│        │
│ └──────┘ └──────┘ └──────┘ └──────┘        │
├─────────────────────────────────────────────┤
│ Quick Actions                                │
│ ┌────────┐ ┌────────┐ ┌────────┐          │
│ │ Add    │ │ Scan   │ │ Report │          │
│ │ Asset  │ │ Barcode│ │ View   │          │
│ └────────┘ └────────┘ └────────┘          │
├─────────────────────────────────────────────┤
│ Recent Activity                              │
│ ┌──────────────────────────────────────┐   │
│ │ • Customer ABC added                  │   │
│ │ • Asset XYZ scanned                  │   │
│ │ • Delivery scheduled                 │   │
│ └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

**Design Specs**:
- Stat cards: `bg-white border border-gray-200 rounded-xl p-6`
- Stat icons: `w-12 h-12 rounded-xl bg-gradient-to-br from-[#40B5AD] to-[#48C9B0]`
- Quick action cards: `hover:border-[#40B5AD]/30 hover:shadow-lg`
- Grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6`

---

### 4. Customers Page (`/customers`)
**Status**: 🔄 Needs Update

**Design Pattern**:
```
┌─────────────────────────────────────────────┐
│ Customers                                    │
│ ┌───────────────────────────────────────┐   │
│ │ 🔍 Search customers...        [+ Add] │   │
│ └───────────────────────────────────────┘   │
├─────────────────────────────────────────────┤
│ Name      │ Email      │ Phone    │ Actions │
├─────────────────────────────────────────────┤
│ ABC Corp  │ abc@...    │ 555-...  │ [Edit]  │
│ XYZ Inc   │ xyz@...    │ 555-...  │ [Edit]  │
│ ...       │ ...        │ ...      │ ...     │
├─────────────────────────────────────────────┤
│ Showing 1-10 of 50        [<] 1 2 3 [>]    │
└─────────────────────────────────────────────┘
```

**Design Specs**:
- Header: `flex justify-between items-center mb-6`
- Search bar: `border border-gray-300 rounded-xl px-4 py-2`
- Table: `border border-gray-200 rounded-xl overflow-hidden`
- Table header: `bg-gray-50 text-gray-900 font-semibold`
- Table rows: `hover:bg-gray-50 border-b border-gray-200`
- Action buttons: `text-[#40B5AD] hover:text-[#2E9B94]`
- Add button: `bg-[#40B5AD] hover:bg-[#2E9B94] text-white`

---

### 5. Settings Page (`/settings`)
**Status**: 🔄 Needs Update

**Design Pattern**:
```
┌─────────────────────────────────────────────┐
│ Settings                                     │
├─────────────────────────────────────────────┤
│ [Profile] [Organization] [Security] [Theme] │
├─────────────────────────────────────────────┤
│ Profile Settings                             │
│                                              │
│ ┌───────────────────────────────────────┐   │
│ │ Full Name                              │   │
│ │ ┌───────────────────────────────────┐ │   │
│ │ │ John Doe                           │ │   │
│ │ └───────────────────────────────────┘ │   │
│ │                                       │   │
│ │ Email                                 │   │
│ │ ┌───────────────────────────────────┐ │   │
│ │ │ john@example.com                  │ │   │
│ │ └───────────────────────────────────┘ │   │
│ │                                       │   │
│ │        [Save Changes]                 │   │
│ └───────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

**Design Specs**:
- Tabs: `border-b border-gray-200`
- Active tab: `border-b-2 border-[#40B5AD] text-[#40B5AD]`
- Settings card: `bg-white border border-gray-200 rounded-xl p-6`
- Form inputs: `border-2 border-gray-300 rounded-xl`
- Save button: `bg-[#40B5AD] hover:bg-[#2E9B94]`
- Section dividers: `border-t border-gray-200 pt-6 mt-6`

---

### 6. Assets/Inventory Page (`/assets`)
**Status**: 🔄 Needs Update

**Design Pattern**:
```
┌─────────────────────────────────────────────┐
│ Assets                                       │
│ ┌───────────────────────────────────────┐   │
│ │ 🔍 Search... [Filter] [+ Add Asset]   │   │
│ └───────────────────────────────────────┘   │
├─────────────────────────────────────────────┤
│ ┌────────┐ ┌────────┐ ┌────────┐           │
│ │ Total  │ │ Active │ │ Rented │           │
│ │ 5,000  │ │ 3,500  │ │ 1,200  │           │
│ └────────┘ └────────┘ └────────┘           │
├─────────────────────────────────────────────┤
│ Barcode  │ Status  │ Location │ Actions    │
├─────────────────────────────────────────────┤
│ ABC123   │ Active  │ Warehouse│ [View]     │
│ ...      │ ...     │ ...      │ ...         │
└─────────────────────────────────────────────┘
```

**Design Specs**:
- Stat cards: Same as dashboard
- Filter chips: `bg-gray-100 text-gray-700 rounded-full px-3 py-1`
- Active filter: `bg-[#40B5AD] text-white`
- Table: Same as customers page

---

### 7. Pricing Page (`/pricing`)
**Status**: 🔄 Needs Update

**Design Pattern**:
```
┌─────────────────────────────────────────────┐
│ Simple, Transparent Pricing                   │
│ Choose the plan that fits your needs         │
├─────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│ │ Starter  │ │  Pro     │ │Enterprise│     │
│ │          │ │ [Popular]│ │          │     │
│ │ $49/mo   │ │ $149/mo  │ │ Custom   │     │
│ │          │ │          │ │          │     │
│ │ ✓ 5K     │ │ ✓ 10K    │ │ ✓ Unlimited │ │
│ │ ✓ 15     │ │ ✓ 25     │ │ ✓ Unlimited │ │
│ │   users  │ │   users  │ │   users  │     │
│ │          │ │          │ │          │     │
│ │ [Start]  │ │ [Start]  │ │ [Contact]│     │
│ └──────────┘ └──────────┘ └──────────┘     │
└─────────────────────────────────────────────┘
```

**Design Specs**:
- Plan cards: `border-2 border-gray-200 rounded-2xl p-8`
- Popular badge: `bg-[#40B5AD] text-white rounded-full px-4 py-1`
- Popular card: `border-2 border-[#40B5AD] shadow-xl`
- Price: `text-4xl font-bold text-gray-900`
- Feature list: `text-gray-600 space-y-2`
- CTA button: `bg-[#40B5AD] hover:bg-[#2E9B94] w-full`

---

### 8. Contact Page (`/contact`)
**Status**: 🔄 Needs Update

**Design Pattern**:
```
┌─────────────────────────────────────────────┐
│ Get in Touch                                 │
│ Ready to modernize your operations?         │
├─────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────────────┐  │
│ │ Contact      │ │ Contact Form          │  │
│ │ Methods      │ │                       │  │
│ │              │ │ Name: [________]      │  │
│ │ 📞 Sales     │ │ Email: [________]     │  │
│ │ ✉️ Support   │ │ Message: [________]   │  │
│ │ 💬 Chat      │ │                       │  │
│ │              │ │ [Send Message]        │  │
│ └──────────────┘ └──────────────────────┘  │
└─────────────────────────────────────────────┘
```

**Design Specs**:
- Contact method cards: `border border-gray-200 rounded-xl p-4`
- Form card: `border border-gray-200 rounded-xl p-6`
- Form inputs: `border-2 border-gray-300 rounded-xl`
- Submit button: `bg-[#40B5AD] hover:bg-[#2E9B94]`

---

## Component Library

### Buttons
```jsx
// Primary
<Button className="bg-[#40B5AD] hover:bg-[#2E9B94] text-white rounded-xl px-6 py-3">

// Secondary
<Button className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl px-6 py-3">

// Ghost
<Button className="text-[#40B5AD] hover:text-[#2E9B94] hover:bg-[#40B5AD]/10 rounded-xl px-4 py-2">
```

### Cards
```jsx
<Card className="bg-white border border-gray-200 rounded-xl p-6 hover:border-[#40B5AD]/30 hover:shadow-lg transition-all">
```

### Inputs
```jsx
<input className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:border-[#40B5AD] focus:ring-2 focus:ring-[#40B5AD]/20 outline-none transition-all" />
```

### Badges
```jsx
<Badge className="bg-[#40B5AD]/10 text-[#40B5AD] border border-[#40B5AD]/20 rounded-full px-3 py-1">
```

---

## Implementation Checklist

### ✅ Completed
- [x] Landing Page design
- [x] Design system documentation
- [x] Color palette defined
- [x] Typography scale

### 🔄 In Progress
- [ ] Login Page redesign
- [ ] Dashboard redesign
- [ ] Customers Page redesign
- [ ] Settings Page redesign
- [ ] Pricing Page redesign
- [ ] Contact Page redesign
- [ ] Assets Page redesign

### 📋 To Do
- [ ] All other pages
- [ ] Component library updates
- [ ] Mobile responsive adjustments
- [ ] Accessibility audit
- [ ] Performance optimization

---

## Next Steps

1. **Update Login Page** - Convert from Material-UI to Tailwind, match landing page style
2. **Update Dashboard** - Modern stat cards, clean layout
3. **Update Customers Page** - Modern table with search/filter
4. **Update Settings Page** - Tabbed interface, clean forms
5. **Update All Other Pages** - Apply consistent design system

Each page should:
- Use the same color palette (`#40B5AD` primary)
- Follow spacing guidelines (`py-24` sections, `gap-6` grids)
- Use consistent typography scale
- Include hover states and transitions
- Be fully responsive (mobile-first)
- Meet WCAG AA accessibility standards
