# UX Remediation Backlog

This backlog turns the current UX audit into a phased implementation plan that improves the frontend without breaking live flows.

## Priority Model

- `P0`: trust, accessibility, or production UX blockers
- `P1`: high-value consistency and design-system work
- `P2`: polish and secondary refinements

## Phase Model

- Phase 1: stabilize current behavior
- Phase 2: establish system foundations
- Phase 3: migrate high-value surfaces
- Phase 4: polish and harden

## P0 Backlog

### P0-1 Remove False Affordances

Problem:

- multiple visible links and actions look real but do not perform a real task

Targets:

- `/Users/dinaba/Documents/ss new site /src/components/Header.jsx`
- `/Users/dinaba/Documents/ss new site /src/pages/Home.jsx`
- `/Users/dinaba/Documents/ss new site /src/pages/Profile.jsx`

Actions:

- replace `#` links with real routes where available
- hide or disable unfinished actions that do not yet have a route
- remove fake “view more” actions until category pages exist

Outcome:

- users stop hitting dead ends

### P0-2 Fix Accessibility Baseline

Problem:

- focus visibility is weak or removed in multiple forms and search controls

Targets:

- `/Users/dinaba/Documents/ss new site /src/index.css`
- `/Users/dinaba/Documents/ss new site /src/pages/Profile.css`

Actions:

- introduce global `:focus-visible` styling
- remove `outline: none` patterns without replacement
- verify keyboard navigation on header, auth, cart, and admin sidebar

Outcome:

- baseline keyboard usability and stronger compliance posture

### P0-3 Remove Demo-Looking Production Data

Problem:

- several screens show hardcoded data that appears real

Targets:

- `/Users/dinaba/Documents/ss new site /src/pages/Profile.jsx`
- `/Users/dinaba/Documents/ss new site /src/components/Cart.jsx`
- `/Users/dinaba/Documents/ss new site /src/pages/Home.jsx`

Actions:

- replace hardcoded order, points, and reward content with real data or explicit placeholder states
- remove fake discount tags that do not come from data
- hide nonfunctional reorder and save actions until wired

Outcome:

- better product trust and less user confusion

### P0-4 Normalize Customer-Facing Language

Problem:

- Mongolian and English are mixed inside the same customer flow

Targets:

- `/Users/dinaba/Documents/ss new site /src/components/Cart.jsx`
- `/Users/dinaba/Documents/ss new site /src/pages/Profile.jsx`
- `/Users/dinaba/Documents/ss new site /src/pages/Home.jsx`

Actions:

- define default customer language as Mongolian
- translate cart titles, reward copy, inventory labels, and summary copy
- reserve English only for approved brand or product names

Outcome:

- stronger perceived quality and clarity

## P1 Backlog

### P1-1 Establish Design Tokens

Inputs:

- `/Users/dinaba/Documents/ss new site /docs/design-token-spec.md`

Actions:

- implement primitive and semantic tokens in global CSS
- remove undefined token references
- align existing page CSS to token usage

Outcome:

- one stable foundation for future UI work

### P1-2 Build Shared Core Components

Inputs:

- `/Users/dinaba/Documents/ss new site /docs/component-inventory.md`

Actions:

- build `Button`, `Input`, `Select`, `Textarea`, `Card`, `Badge`, `Tabs`, `Drawer`
- document allowed variants in code comments or a local docs file

Outcome:

- fewer duplicated interaction patterns

### P1-3 Stabilize Storefront UX

Targets:

- `/Users/dinaba/Documents/ss new site /src/components/Header.jsx`
- `/Users/dinaba/Documents/ss new site /src/pages/Home.jsx`
- `/Users/dinaba/Documents/ss new site /src/components/Cart.jsx`

Actions:

- make tabs change actual content
- make promotional sections data-driven
- standardize product card behavior
- connect checkout CTA to a real next step or remove it for now

Outcome:

- higher storefront trust and clearer purchase flow

### P1-4 Stabilize Profile UX

Targets:

- `/Users/dinaba/Documents/ss new site /src/pages/Profile.jsx`
- `/Users/dinaba/Documents/ss new site /src/pages/Profile.css`

Actions:

- wire settings save flow to real persistence
- load real orders and loyalty history
- unify auth card with admin login standards

Outcome:

- profile becomes a real account surface instead of a demo panel

## P2 Backlog

### P2-1 Standardize Admin Information Hierarchy

Targets:

- `/Users/dinaba/Documents/ss new site /src/components/admin/AdminLayout.jsx`
- `/Users/dinaba/Documents/ss new site /src/components/admin/Sidebar.jsx`
- `/Users/dinaba/Documents/ss new site /src/pages/admin/Dashboard.jsx`
- `/Users/dinaba/Documents/ss new site /src/pages/admin/Orders.jsx`
- `/Users/dinaba/Documents/ss new site /src/pages/admin/Products.jsx`

Actions:

- align page headers, filter bars, tables, and cards
- reduce visual noise on dense admin screens
- standardize empty/loading/error handling

Outcome:

- faster scanning and less cognitive load for staff

### P2-2 Harden Responsive Behavior

Targets:

- storefront header and grids
- cart drawer
- profile sidebar/content layout
- admin sidebar and data tables

Actions:

- test primary screens at mobile, tablet, and desktop widths
- remove overflow traps and awkward breakpoint jumps

Outcome:

- more reliable cross-device use

### P2-3 Add UX Quality Guardrails

Actions:

- add a frontend checklist for every new screen
- require no placeholder action before release
- require focus-visible support and empty/loading/error states

Outcome:

- debt grows more slowly after cleanup

## Recommended Execution Order

1. P0-1 Remove false affordances
2. P0-2 Fix accessibility baseline
3. P0-4 Normalize customer-facing language
4. P0-3 Remove demo-looking production data
5. P1-1 Establish design tokens
6. P1-2 Build shared core components
7. P1-3 Stabilize storefront UX
8. P1-4 Stabilize profile UX
9. P2 admin and responsive refinements

## Definition of Done

A backlog item is done only when:

- visual change and behavior are both verified
- placeholder actions are removed
- loading, empty, and error states are covered where relevant
- keyboard focus remains visible
- copy is consistent with the surface language standard

## Next Implementation Step

The first engineering step after approving this backlog should be:

1. fix global focus and state styling
2. remove dead links from header and storefront
3. define and apply the token layer
