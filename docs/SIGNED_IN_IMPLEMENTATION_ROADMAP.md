# Signed-In Redesign Implementation Roadmap

## Goal

This roadmap translates the redesign direction from `docs/SIGNED_IN_REDESIGN_PLAN.md` into an implementation sequence that can be shipped safely.

The approach is:

1. establish the signed-in shell
2. simplify navigation
3. redesign the dashboard
4. standardize major page templates
5. restructure settings and admin

The first implementation slice should focus on the highest-leverage shared surfaces:

- shell
- header
- sidebar
- dashboard
- settings

---

## Delivery Strategy

### Phase 1: Shell Foundation

Target files:

- `src/components/MainLayout.jsx`
- `src/components/Sidebar.jsx`
- shared shell/header UI components as needed

Goals:

- replace mixed top-nav + sidebar behavior with a cleaner workspace shell
- introduce a clearer page header model
- reduce nav clutter
- improve visual hierarchy across all signed-in pages immediately

Deliverables:

- redesigned left rail
- redesigned top workspace header
- cleaner search / command area
- better profile / utility area
- more consistent page framing

Success criteria:

- users understand where they are faster
- top-level destinations are reduced and clearer
- the app feels more premium before any individual page redesign lands

---

## Screen-By-Screen Plan

## 1. Shell and Navigation

### Problems to solve

- top nav and sidebar compete
- too many destinations are exposed globally
- navigation categories are inconsistent
- page chrome feels generic rather than intentional

### Implementation tasks

1. Replace the current top nav links with a workspace header.
2. Reduce the global nav to:
   - Dashboard
   - Operations
   - Customers
   - Inventory
   - Billing
   - Reports
   - Admin
3. Move low-frequency items out of the main nav where possible.
4. Add stronger organization identity to the rail.
5. Make the search experience feel like a command surface.
6. Standardize utility actions:
   - notifications
   - settings
   - profile
   - sign out

### Notes

- This phase should not try to redesign every page.
- The shell should be able to ship first and improve perceived quality immediately.

---

## 2. Dashboard

Target file:

- `src/pages/Home.jsx`

### Problems to solve

- too many equally weighted cards
- dashboard acts as both launcher and summary surface
- activity is present but not organized
- role-based messaging exists, but layout is not strong enough

### Implementation tasks

1. Build a top KPI strip.
2. Add a focused action row.
3. Group operational health into one section.
4. Create a real work-queue section.
5. Refactor recent activity into a more readable timeline.
6. Separate role emphasis by layout priority, not by forking the page.

### Success criteria

- dashboard feels like a command center
- users can identify priority work quickly
- less visual noise, stronger hierarchy

---

## 3. Sidebar

Target file:

- `src/components/Sidebar.jsx`

### Problems to solve

- too many sections
- too many leaf items always exposed
- labels are inconsistent
- advanced/admin routes are mixed too early

### Implementation tasks

1. Rebuild section taxonomy around product domains.
2. Remove or hide duplicate and low-frequency routes.
3. Add clearer section headers and spacing.
4. Improve collapsed state clarity.
5. Improve organization and user identity presentation.

### Success criteria

- users can scan the menu quickly
- fewer destinations feel “lost” or overly buried
- nav matches the product story

---

## 4. Settings / Admin

Target file:

- `src/pages/Settings.jsx`

Related:

- `src/pages/UserManagement.jsx`
- role and billing settings surfaces

### Problems to solve

- settings is overloaded
- administration concerns are mixed into one surface
- “team”, “roles”, “billing”, and “formats” should feel like proper modules

### Implementation tasks

1. Redesign settings into an admin workspace structure.
2. Introduce local navigation for:
   - Organization
   - Team
   - Roles
   - Branding
   - Formats
   - Billing
   - Support
   - Danger Zone
3. Standardize section cards and save behavior.
4. Isolate destructive actions clearly.

### Success criteria

- settings becomes easier to reason about
- admin tasks feel deliberate
- fewer unrelated controls compete on one page

---

## 5. Customers

Key screens:

- `src/pages/Customers.jsx`
- `src/pages/CustomerDetail.jsx`

### Implementation tasks

1. Improve customer list filtering and summary.
2. Redesign customer detail summary block.
3. Make tabs/sections cleaner and more consistent.
4. Strengthen relationship between customer actions and related modules.

---

## 6. Inventory

Key screens:

- `src/pages/Assets.jsx`
- `src/pages/AssetDetail.jsx`
- `src/pages/BottleManagement.jsx`
- `src/pages/OwnershipManagement.jsx`

### Implementation tasks

1. Standardize list/table layout.
2. Improve filter bars.
3. Add clearer status chips and summary panels.
4. Make detail access faster and more contextual.

---

## 7. Orders and Workflow Screens

Key screens:

- `src/pages/ImportApprovals.jsx`
- `src/pages/ScannedOrders.jsx`
- `src/pages/TruckReconciliation.jsx`
- `src/pages/RouteOptimization.jsx`

### Implementation tasks

1. Redesign these as workflow pages, not generic pages.
2. Create queue-first layouts.
3. Add clearer task headers and exception handling surfaces.
4. Improve split-pane review where appropriate.

---

## 8. Reports

Key screens:

- `src/pages/CustomReports.jsx`
- report-specific pages under `src/pages`

### Implementation tasks

1. Create a reporting template.
2. Standardize filters and result layout.
3. Improve export and saved-view presentation.

---

## Component Work Needed

Before or alongside screen redesigns, establish shared building blocks for:

- workspace header
- page section header
- KPI tile
- filter bar
- data table wrapper
- empty state
- detail drawer
- settings section panel
- save status bar

---

## Recommended Build Order

### Sprint 1

- shell
- sidebar
- workspace header

### Sprint 2

- dashboard
- customers list
- assets list

### Sprint 3

- customer detail
- asset detail
- workflow screens

### Sprint 4

- settings/admin restructure
- team and role surfaces

### Sprint 5

- reports and advanced modules

---

## Definition of Done for the First Slice

The first redesign slice is successful when:

1. the shell looks materially better
2. navigation is simpler and more professional
3. the app feels more coherent after sign-in
4. the dashboard and settings have a clear path for the next redesign passes

---

## Immediate Next Implementation

Implement now:

1. signed-in shell refresh
2. sidebar/navigation simplification
3. improved workspace header

Implement next:

1. dashboard redesign
2. settings redesign
