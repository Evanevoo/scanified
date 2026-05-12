# Scanified Android — App Design Specification

This document defines how the **gas-cylinder-android** (Expo / React Native) app should look, behave, and be structured for **Android-first** field use. Implementation tokens live in `context/ThemeContext.tsx`; component APIs live in `ANDROID_MOBILE_UI_GUIDE.md`.

---

## 1. Design principles

| Principle | Application in this app |
|-----------|-------------------------|
| **Clarity under stress** | High contrast for status (success / warning / error), large tap targets, minimal steps to scan and confirm. |
| **One-handed use** | Primary actions in the **lower third** on tall phones; avoid sole reliance on top app bar for critical tasks. |
| **Trust through feedback** | Loading on async work, haptic/audio where already integrated, clear errors with recovery (retry, go back). |
| **Brand consistency** | Teal primary `#40B5AD`, purple secondary `#8B7BA8`, semantic colors aligned with web — do not introduce new primaries without updating `mobileThemes` in `ThemeContext.tsx`. |
| **Accessibility** | WCAG 2.1 AA contrast for text on surfaces; semantic labels; respect system font scale and high-contrast settings via `useAccessibility` / `ThemeProvider`. |

---

## 2. Users and context

- **Primary users**: Staff scanning cylinders, looking up customers, updating cylinder state, sometimes on poor networks.
- **Environment**: Bright sunlight, gloves, walking — favor **legible type**, **obvious CTAs**, and **forgiving touch areas** (minimum **48×48 dp**; prefer **56 dp** for destructive or scan-adjacent actions).
- **Platform**: Android-only package; follow **Material 3** spacing and motion habits where they do not conflict with brand gradients.

---

## 3. Information architecture (current stack)

The app uses a **single native stack** with **Home** as the hub (`App.tsx`). Unauthenticated users see **Login** only.

### 3.1 Sitemap (authenticated)

```
Home (Dashboard, header hidden)
├── ScanCylinders — Scan customer number
├── EnhancedScan — Enhanced scan
├── EditCylinder — Edit cylinder (header hidden)
├── CylinderDetails
├── CustomerDetails
├── Settings
├── FillCylinder — Locate cylinder
├── AddCylinder
├── Customization
├── OrganizationJoin
├── History
├── RecentScans
├── SupportTicket
├── UserManagement
├── Analytics
└── NotificationSettings
```

### 3.2 Content grouping (mental model for users)

| Area | Screens | User goal |
|------|---------|-----------|
| **Operations** | ScanCylinders, EnhancedScan, FillCylinder, AddCylinder, EditCylinder | Move inventory, record scans, locate/add/edit assets |
| **Insight** | History, RecentScans, Analytics, CylinderDetails, CustomerDetails | Review what happened, drill into records |
| **Account & org** | Settings, Customization, OrganizationJoin, UserManagement, NotificationSettings | Preferences, org membership, users, alerts |
| **Support** | SupportTicket | Get help |

**Design implication**: **Home** should surface **Operations** first (tiles or cards), then secondary entry points to **Insight** and **Settings**, using the same vocabulary as stack titles to avoid cognitive mismatch.

---

## 4. Navigation and interaction

- **Pattern**: Native stack — **depth = task steps**. Prefer **short stacks** (Home → task → back) over deep nesting.
- **Android back**: Must return to a predictable parent; avoid trapping users without a visible back affordance when `headerShown: false`.
- **Predictive back** (Android 13+): Avoid full-screen overlays that break back preview unless necessary.
- **Global modals**: Update and session-timeout flows are overlays — keep **primary action** obvious (extend session vs log out).

**Future consideration (not required for spec)**: A **bottom bar** for Home / Scan / History / Settings reduces trips through Home if product agrees; today the spec assumes **hub-and-spoke** from Home.

---

## 5. Visual foundation

All values below are the **canonical Scanified light theme** in code (`mobileThemes.light`). Dark and accent themes (`blue`, `green`, …) follow the same **role** names.

### 5.1 Color roles

| Role | Light hex | Usage |
|------|-----------|--------|
| Primary | `#40B5AD` | Main CTAs, key links, active emphasis |
| Primary dark | `#2E9B94` | Pressed / darker end of gradients |
| Primary light | `#5FCDC5` | Highlights, dark-mode primary |
| Secondary | `#8B7BA8` | Secondary actions, accents, gradient end |
| Background | `#F4F2FA` | App canvas behind cards |
| Surface | `#FFFFFF` | Cards, sheets, primary panels |
| Text | `#1F2937` | Headings and body |
| Text secondary | `#6B7280` | Captions, metadata |
| Border | `#E5E7EB` | Dividers, input borders |
| Success / Warning / Error / Info | `#10B981` / `#F59E0B` / `#EF4444` / `#3B82F6` | Status chips, banners, validation |

**Gradients**: Primary CTA emphasis — `buttonGradient` or full `gradient` (teal → purple) **sparingly** (one strong gradient per viewport when possible).

### 5.2 Typography (recommended scale)

Use **system** or **Inter** if bundled; sizes in **dp** (React Native):

| Style | Size | Weight | Use |
|-------|------|--------|-----|
| Display | 28–32 | 700 | Rare hero moments only |
| Title | 22–24 | 600 | Screen titles (when custom header) |
| Headline | 18–20 | 600 | Section headers |
| Body | 16 | 400–500 | Default body; **inputs ≥16** to avoid unwanted zoom behavior |
| Caption | 13–14 | 400 | Timestamps, hints |
| Label | 12–13 | 500 | Uppercase or small caps only if legible; prefer sentence case |

**Line height**: ~1.35–1.5 for body on small widths.

### 5.3 Shape and elevation

- **Corner radius**: **12** for cards and panels; **8** for buttons and fields (aligns with web `commonStyles` intent).
- **Elevation**: Use `elevated` on `MobileCard` / `ModernCard` for hierarchy; avoid stacking many heavy shadows.
- **Dividers**: `border` or 1dp `hairlineWidth` between list rows.

### 5.4 Spacing (8-point grid)

| Token | dp | Use |
|-------|-----|-----|
| xs | 4 | Tight icon padding |
| sm | 8 | Inline gaps |
| md | 16 | Screen horizontal padding, card padding |
| lg | 24 | Section separation |
| xl | 32 | Major section breaks |

Safe areas: always wrap scrollable content in `SafeAreaView` / `useSafeAreaInsets` so **notches and gesture bars** do not clip CTAs.

---

## 6. Component strategy

| Need | Preferred component |
|------|---------------------|
| Primary / secondary press actions | `MobileButton` (`ANDROID_MOBILE_UI_GUIDE.md`) |
| Tappable surfaces / list heroes | `MobileCard` or `ModernCard` |
| Forms | `MobileInput` (errors inline; loading on submit via button) |
| Single dominant action (e.g. add) | `MobileFab` |
| Status | Reuse `StatusIndicator` / semantic colors — never rely on color alone (pair icon + text). |

**Rule**: New screens should **compose** these primitives before adding one-off styled `TouchableOpacity` blocks.

---

## 7. Screen archetypes

1. **Hub (Home)** — Grid or vertical list of **large touch cards**; optional summary stats; avoid cluttering above the fold with settings-level links.
2. **Scanner / camera** — Full-bleed camera where needed; controls in **thumb reach**; flash/torch and cancel clearly labeled.
3. **List + detail** — Lists: consistent row height (≥48 dp tap row); detail: title + actions in app bar or sticky footer for primary action.
4. **Form (add/edit)** — Single column, labels clear, sticky **Save** when possible, destructive actions separated and confirmable.
5. **Settings** — Grouped sections with headers; toggles with visible state; deep links to Notifications, Customization, etc.

---

## 8. Motion

Use `theme.motion` from `ThemeContext` for consistency:

- **Press**: subtle scale (~0.96) and opacity — already aligned in theme definitions.
- **Transitions**: Prefer **short** (120–200 ms) for UI chrome; avoid long decorative animations on repeated tasks (scanning).

---

## 9. Accessibility (non-negotiable)

- **Touch targets**: Minimum **48×48 dp**; document **44px** minimum only where platform forces legacy — Android HIG and WCAG 2.5.5 favor 48.
- **Contrast**: Body text on `surface` / `background` must meet **AA** (4.5:1); large text 3:1.
- **Focus / TalkBack**: Every interactive control needs `accessibilityLabel` (and `hint` where the action is non-obvious).
- **Dynamic type**: Avoid fixed heights that clip text when font scale increases; use `minHeight` and padding.
- **High contrast**: Honor `ThemeProvider` high-contrast branch when enabled.

---

## 10. Performance and resilience

- **Lists**: `FlatList` / `FlashList` with stable `keyExtractor`; windowing for long history.
- **Images**: Appropriate resolution; cache where used for org assets.
- **Offline**: Loading and empty states for sync — user should always know **queued vs failed**.

---

## 11. Analytics and iteration (recommended)

- Instrument **task success** (scan completed, cylinder saved) and **drop-off** (back without save).
- A/B test **only** high-impact hub layouts or CTA copy — not one-off pixel tweaks without hypothesis.

---

## 12. Documentation map

| Document | Purpose |
|----------|---------|
| `ANDROID_APP_DESIGN_SPEC.md` (this file) | IA, visual system, behaviors, Android-specific guidance |
| `ANDROID_MOBILE_UI_GUIDE.md` | Component props, examples, migration |
| `context/ThemeContext.tsx` | Source of truth for color and motion tokens |
| `ANDROID_SETUP.md` | Build and platform setup |

---

## 13. Implementation checklist (per screen)

- [ ] Uses `useTheme()` for colors — no stray hex for brand roles  
- [ ] Primary action visible without scrolling on common phone heights (where feasible)  
- [ ] Loading and error states for async operations  
- [ ] Tap targets ≥ 48 dp  
- [ ] Back navigation and TalkBack labels verified  
- [ ] Inputs ≥ 16 dp font size  

This spec should be updated when navigation structure or primary user tasks change.
