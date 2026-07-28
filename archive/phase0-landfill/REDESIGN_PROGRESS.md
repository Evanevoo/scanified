# Website Redesign Implementation Plan

## Phase 1: Component Library Expansion ✅ COMPLETE
- [x] Select component
- [x] Dialog/Modal component  
- [x] Switch component
- [x] Form components (Label, FormField, FormLabel, etc.)
- [x] Table component (already exists)
- [x] Tabs component (already exists)

## Phase 2: Core Pages Redesign - IN PROGRESS

### Settings Page Redesign
**Status**: Ready to implement
**Current**: Uses Material-UI (2428 lines)
**Target**: Tailwind + shadcn/ui components

**Key Changes**:
- Replace MUI Tabs with custom Tabs component
- Replace MUI TextField with Input component
- Replace MUI Switch with Switch component
- Replace MUI Select with Select component
- Replace MUI Dialog with Dialog component
- Update all styling to match design system
- Add animations with framer-motion
- Improve mobile responsiveness

**Tabs to Redesign**:
1. Profile - User profile settings
2. Security - Password, 2FA, session settings
3. Appearance - Theme, colors
4. Billing - Payment, plans
5. Help & Support - Support form
6. Invoice Template (Admin)
7. Team (Admin)
8. Assets (Admin)
9. Barcodes (Admin)

### Next Steps:
1. Create redesigned Settings page component
2. Test all functionality
3. Migrate to production

## Phase 3: Additional Pages (After Settings)

### Customers Page
- Modern table with search/filter
- Card layout for mobile
- Improved action buttons

### Assets Page  
- Similar to Customers page
- Status filters
- Bulk actions

### Deliveries Page
- Calendar integration
- Status management
- Route visualization

---

## Implementation Notes

All redesigned pages should:
- Use design system colors (#40B5AD primary)
- Follow spacing guidelines (py-24 sections, gap-6 grids)
- Use consistent typography scale
- Include hover states and transitions
- Be fully responsive (mobile-first)
- Meet WCAG AA accessibility standards
- Have loading and error states
