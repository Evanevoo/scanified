# Signed-In Redesign Plan

## Purpose

This document defines the recommended redesign direction for the signed-in Scanified web app. It is intended to guide product, design, and engineering through a full post-login refresh that improves clarity, usability, consistency, and perceived quality without losing the operational power of the current system.

The goal is not a cosmetic reskin. The goal is to turn the product into a cohesive operations platform with:

- a clear information architecture
- a consistent signed-in shell
- stronger hierarchy on data-heavy screens
- better role-based UX
- a reusable design system for future work

---

## Product Positioning

### Recommended design posture

The signed-in app should feel like an **operations control system**, not a generic startup dashboard.

It should communicate:

- reliability
- speed
- trust
- clarity under complexity
- strong operational awareness

It should not feel:

- overly playful
- over-animated
- marketing-driven
- card-stacked and shallow
- visually noisy from too many patterns

### Design thesis

The best fit for this product is:

**Industrial executive software**

That means:

- calm, high-contrast structure
- compact but readable density
- deliberate use of color
- strong data presentation
- polished navigation and workflow control

---

## Current Experience Assessment

Based on the current signed-in app structure:

- `src/components/MainLayout.jsx`
- `src/components/Sidebar.jsx`
- `src/pages/Home.jsx`
- `src/pages/Settings.jsx`
- `src/App.jsx`

the current post-login experience has these structural problems:

1. The shell mixes multiple navigation models.
   The app uses a large sidebar, top navigation links, page-level actions, and route-driven feature access in ways that compete with each other.

2. The sidebar has too many concepts at the same level.
   Core workflows, admin tools, one-off utilities, reports, and advanced features are all mixed into a large menu tree.

3. The dashboard is trying to do too many jobs.
   It is part launcher, part stats page, part activity list, and part role-based portal.

4. Settings is overloaded.
   It is carrying too many responsibilities inside one destination and does not feel like a clear admin workspace.

5. Page anatomy is inconsistent.
   Different pages use different header patterns, action layouts, content grouping styles, and surface treatments.

6. Advanced features do not feel integrated into the main product story.
   They appear as extra routes rather than belonging to a clear operational model.

---

## Redesign Goals

### Primary goals

1. Make the app easier to understand after sign-in.
2. Reduce navigation complexity without reducing capability.
3. Make data-heavy screens feel intentional and professional.
4. Create a design system that can support continued growth.
5. Improve role-based clarity for admin, manager, and user experiences.

### Secondary goals

1. Improve perceived performance through cleaner layout and state feedback.
2. Make high-frequency workflows faster.
3. Reduce cognitive load on settings and administration surfaces.
4. Create a more premium, trustworthy visual identity.

---

## Visual Direction

### Core aesthetic

Use a restrained, modern operational aesthetic:

- neutral background
- bright working surfaces
- subtle borders
- medium radius
- strong typography hierarchy
- minimal shadows
- controlled accent color use

### Tone

The signed-in app should feel:

- polished
- mature
- efficient
- high-signal
- enterprise-capable

### Avoid

- giant colorful cards everywhere
- too many surface variants
- decorative gradients in the core workspace
- excessive empty space
- overly rounded consumer-app styling
- marketing-style typography inside the product

---

## Color Strategy

### Palette model

Use a semantic system:

- neutral
- accent
- success
- warning
- error
- info

### Recommended behavior

- The app canvas should be a soft neutral, not pure white.
- Main content surfaces should be white or near-white.
- Borders should be visible but understated.
- Accent color should be the organization color, but used sparingly.
- Status colors should be reserved for real status and alerts, not decoration.

### Surface tiers

1. App canvas
   Used for the overall shell background.

2. Primary surface
   Used for content panels, tables, forms, and dialogs.

3. Secondary surface
   Used for filters, toolbars, and soft-emphasis sections.

---

## Typography

### Principles

- prioritize legibility over personality
- create clear visual hierarchy
- use consistent scale across screens
- support dense data presentation

### Usage model

- page title
- section title
- subsection label
- body copy
- helper text
- numeric/stat treatment

### Data styling

Use tabular numeric styling for:

- KPIs
- counts
- billing values
- quantities
- timestamps

---

## Layout Principles

1. One primary task per screen.
2. One page header pattern across the product.
3. One filter pattern across list screens.
4. One data table pattern across the product.
5. One configuration pattern across settings/admin areas.
6. One detail-page anatomy for record views.

---

## New Information Architecture

The global navigation should be simplified to the main domains of work.

### Primary navigation

- Dashboard
- Operations
- Customers
- Inventory
- Billing
- Reports
- Admin

### Dashboard

- Overview
- Alerts
- Activity
- Favorites

### Operations

- Bottles for Day
- Scanned Orders
- Import Approvals
- Workflow Automation
- Truck Reconciliation
- Route Optimization

### Customers

- Customer List
- Customer Detail
- Lease Agreements
- Join Codes

### Inventory

- Assets
- Bottle Management
- Ownership Management
- Asset History
- Recent Cylinders

### Billing

- Billing
- Payments
- Lease Billing Dashboard
- Invoice Templates

### Reports

- Custom Reports
- Report Library
- Saved Reports

### Admin

- Team
- Roles & Permissions
- Organization Settings
- Format Configuration
- Branding
- Support
- Data Utilities

### Remove from the global nav

The global nav should not directly expose:

- every report endpoint
- low-frequency utility screens
- duplicate legacy paths
- experimental or owner-only concepts mixed into org-user navigation

---

## Signed-In Shell Redesign

## Left Rail

Replace the current oversized navigation tree with a cleaner workspace rail.

### Expanded state

- organization identity at top
- primary nav only
- optional active section summary
- bottom utility cluster for search, notifications, profile, help

### Collapsed state

- icons only
- tooltips/flyout labels
- preserve active-state clarity

### Rules

- no deep nesting in the global rail
- no more than one secondary expansion level
- section-specific links should move into local page navigation

## Top Workspace Bar

Every page should share a consistent workspace header with:

- page title
- short description or context label
- optional breadcrumb
- global search / command palette trigger
- notifications
- profile actions
- page-level primary action

This should replace the current mixed model of top links and ad hoc page controls.

## Command Palette

Elevate global search into a proper command surface.

Support:

- jump to customer
- jump to asset
- jump to order
- open reports
- quick-create actions
- recent items
- favorites

The existing global search behavior in `MainLayout.jsx` is directionally useful, but the redesign should formalize it into a first-class interaction model.

---

## Page Templates

All signed-in pages should adopt one of the following templates.

## 1. Index Page

Use for:

- customers
- assets
- reports
- approvals
- lists of operational records

Structure:

- page header
- action row
- sticky filter bar
- result summary
- content table or grid
- optional detail drawer

## 2. Detail Page

Use for:

- customer detail
- asset detail
- invoice detail
- agreement detail

Structure:

- breadcrumb
- title block with status
- summary strip
- tabbed or sectional body
- side action panel

## 3. Workflow Page

Use for:

- scanning flows
- approvals
- truck reconciliation
- route optimization

Structure:

- strong task header
- main workflow canvas
- exception or context panel
- recent actions / queue / history

## 4. Configuration Page

Use for:

- settings
- roles
- formats
- billing configuration
- organization branding

Structure:

- left local nav
- content body
- grouped sections
- persistent save state
- isolated danger zone

## 5. Reporting Page

Use for:

- custom reports
- dashboards
- exports

Structure:

- report selector
- filters
- summary metrics
- chart/table output
- export and save actions

---

## Dashboard Blueprint

The signed-in dashboard should become a real command center.

### Layout

1. Summary strip
   - customers
   - assets
   - active rentals
   - pending approvals
   - overdue billing
   - exceptions

2. Action row
   - process order
   - scan workflow
   - add customer
   - create report
   - view exceptions

3. Operational health
   - today’s movement
   - pending approvals
   - failed/suspicious actions
   - integration or sync health where relevant

4. Work queues
   - orders needing review
   - items awaiting action
   - expiring agreements
   - missing or problematic data

5. Activity timeline
   - grouped and translated into business language
   - not just raw mixed events

6. Pinned views
   - recent destinations
   - favorite tools
   - saved reports

### Role emphasis

Admin:

- organization health
- billing exceptions
- team and permissions visibility

Manager:

- operational throughput
- queue management
- routing/reconciliation visibility

User:

- today’s tasks
- customer and inventory lookup
- recent work context

---

## Screen Priorities

### 1. Dashboard

This should be the first major redesign target because it sets the tone of the product.

### 2. Customers

Needed improvements:

- clearer list/detail relationship
- better customer status visibility
- stronger summary cards
- cleaner action placement

### 3. Inventory / Assets

This should become a flagship area of the app.

Requirements:

- excellent filtering
- dense but readable table
- quick detail access
- location, ownership, and status clarity
- bulk operations where relevant

### 4. Orders / Approvals

This should feel like a queue-driven review workspace, not a generic table.

Requirements:

- priority ordering
- exception emphasis
- split-pane review
- fast approve/reject workflows

### 5. Rentals / Agreements

This area should feel more structured and contractual.

Requirements:

- agreement summary
- billing state
- customer-linked context
- renewal and exception visibility

### 6. Settings / Admin

Break `Settings` into a real admin workspace.

Recommended structure:

- Organization
- Team
- Roles
- Branding
- Formats
- Billing
- Support
- Danger Zone

The current single-destination settings model should be reduced or split into clearer subpages.

---

## Sidebar and Navigation Recommendations

The current sidebar in `src/components/Sidebar.jsx` contains too many sections and too many role-specific exceptions.

### Recommended navigation rules

1. Keep global nav domain-based.
2. Move local tools into page-level subnav or module nav.
3. Hide low-frequency admin/config links from non-admin users entirely.
4. Reduce the number of always-visible items.
5. Use “Recent” and “Favorites” for power-user speed instead of exposing everything.

### Rename strategy

- remove generic labels like `Core`
- keep concrete user-facing domains
- make labels business-oriented, not internal

### Suggested nav labels

- Dashboard
- Operations
- Customers
- Inventory
- Billing
- Reports
- Admin

---

## Home Page Recommendations

The current home page in `src/pages/Home.jsx` already contains useful elements:

- role-aware summaries
- recent activity
- quick actions
- KPIs

However, these need restructuring.

### Recommended changes

- reduce the number of equally weighted cards
- create a clear top-to-bottom hierarchy
- move quick actions into a tighter action band
- improve activity grouping
- use clearer section ownership
- avoid making the dashboard feel like a launcher wall

---

## Settings Redesign

The current settings page in `src/pages/Settings.jsx` is too broad to remain a single tab-heavy destination long term.

### Recommended structure

#### Organization

- company name
- branding
- org-level preferences

#### Team

- members
- invites
- role assignment

#### Roles & Permissions

- role list
- permission editing
- access previews

#### Formats

- asset formats
- order formats
- barcode formats

#### Billing

- invoice templates
- payment settings
- billing preferences

#### Support

- support configuration
- help resources

#### Danger Zone

- delete/export/reset actions

### Interaction model

- left local nav
- structured sections
- clear save state
- visible last-saved or unsaved state

---

## Role-Based Experience Model

The redesign should use one product framework with scoped complexity.

### Admin

- sees full admin surfaces
- sees billing and organization health
- sees team/roles/configuration controls

### Manager

- sees advanced operations tools
- sees reports and workflow management
- does not see unnecessary org-level configuration

### User

- sees daily workflows and lookup tools
- sees simpler nav
- does not encounter dead-end admin destinations

### Principle

Do not design three separate products.
Design one product with role-based reveal and emphasis.

---

## Design System Specification

## Foundations

### Spacing

Use an 8px base spacing system.

Suggested scale:

- 4
- 8
- 12
- 16
- 24
- 32
- 40
- 48

### Radius

Use only three radii:

- small
- medium
- large

Avoid many random corner treatments.

### Elevation

Use only three levels:

- flat
- raised
- focus/overlay

Do not rely on heavy shadowing.

### Borders

Use borders consistently:

- tables
- cards
- inputs
- panels
- section grouping

---

## Core Components

Standardize these first:

- app shell
- left rail
- workspace header
- filter bar
- search/command field
- KPI tile
- table
- status chip
- badge
- panel
- drawer
- modal
- empty state
- timeline
- save bar

---

## Table System

Tables should become a product strength.

### Requirements

- compact row height
- sticky header
- clear active sort state
- filter chips above table
- row selection
- bulk actions
- strong status rendering
- overflow-safe long values
- side drawer detail view when useful

### Visual priorities

- strong column labels
- readable status cells
- minimal row chrome
- obvious hover/focus states

---

## Forms System

### Rules

- keep simple forms single-column
- use two columns only for strongly related data
- group fields into sections
- show helper text where needed
- isolate destructive actions
- use a sticky save bar for long forms

### Validation

- inline errors
- concise messages
- field-level guidance first
- avoid overuse of top-level alerts

---

## Status and Feedback

Create a single status system across the app.

### Semantic states

- success
- warning
- error
- info
- neutral

### Use for

- records
- workflows
- sync states
- approvals
- invoices
- rentals

### Feedback model

- inline success when possible
- toast for lightweight confirmation
- dialog for destructive confirmation
- banner only for cross-page or blocking states

---

## Motion

Use motion lightly and purposefully.

Allowed uses:

- panel expand/collapse
- drawer open/close
- hover emphasis
- loading transitions
- tab and filter transitions

Avoid:

- animated decoration
- large entrance effects
- motion that slows down dense workflows

---

## Accessibility

The redesign should deliberately improve:

- contrast
- focus visibility
- keyboard navigation
- readable status states
- table usability
- form error clarity
- hit area sizes

---

## Implementation Strategy

## Phase 1: Foundations and shell

- redesign left rail
- redesign top workspace bar
- add command palette pattern
- establish spacing/surface/typography tokens
- standardize page headers

## Phase 2: Dashboard and index screens

- dashboard
- customers list
- assets list
- approvals/orders list

## Phase 3: detail and workflow screens

- customer detail
- asset detail
- scanning-related workflows
- review/approval workflows

## Phase 4: settings and admin

- settings restructure
- team management
- roles and permissions
- organization and billing settings

## Phase 5: advanced and reporting modules

- reports
- route optimization
- workflow automation
- advanced operational tools

---

## Success Criteria

The redesign should be considered successful when:

1. New users understand the signed-in structure faster.
2. Managers can reach common workflows in fewer steps.
3. Admin tools feel organized instead of hidden in a large menu tree.
4. Tables and detail pages feel consistent across modules.
5. The app looks and feels like one product, not a collection of legacy screens.

---

## Final Recommendation

The best redesign for Scanified is:

- not a flashy reskin
- not a marketing-style dashboard
- not an ultra-minimal empty enterprise UI

It should become a **high-trust operational workspace with executive polish**.

That means:

- fewer navigation decisions
- stronger page hierarchy
- cleaner role-based experiences
- more consistent templates
- better handling of dense operational data

This is the right long-term foundation for both usability and future product growth.
