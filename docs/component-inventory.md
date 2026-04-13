# Frontend Component Inventory

This document inventories the current frontend UI building blocks and classifies them for phased design-system adoption.

## Purpose

- identify reusable UI patterns already present in the codebase
- separate production-ready patterns from demo or unstable ones
- define migration priority without rewriting the whole app

## Status Labels

- `Keep`: usable as-is with minor cleanup
- `Refactor`: keep behavior, rebuild structure/styling on shared patterns
- `Replace`: current version should not become a system pattern
- `Extract`: good candidate to convert into a shared reusable component

## App Surface Inventory

### Customer Surface

| Area | File | Current role | Status | Notes |
| --- | --- | --- | --- | --- |
| Header | `/Users/dinaba/Documents/ss new site /src/components/Header.jsx` | storefront navigation and quick actions | `Refactor` | many links are placeholders; good shell but not stable IA |
| Home hero | `/Users/dinaba/Documents/ss new site /src/pages/Home.jsx` | brand landing experience | `Refactor` | visually strong but content and category logic are not data-driven |
| Product grid card | `/Users/dinaba/Documents/ss new site /src/pages/Home.jsx` | inline storefront product card | `Extract` | should become shared product-card pattern |
| ProductCard | `/Users/dinaba/Documents/ss new site /src/components/ProductCard.jsx` | reusable product card candidate | `Extract` | better foundation than inline home card; should be aligned into one variant system |
| Cart drawer | `/Users/dinaba/Documents/ss new site /src/components/Cart.jsx` | shopping cart and coupon panel | `Refactor` | useful pattern but mixed language and incomplete checkout flow |
| Loyalty page | `/Users/dinaba/Documents/ss new site /src/pages/Loyalty.jsx` | loyalty marketing and tier communication | `Refactor` | should reuse standard cards, section headers, and tier styles |
| Hero component | `/Users/dinaba/Documents/ss new site /src/components/Hero.jsx` | unused or alternate hero | `Replace` | duplicates home hero direction and should not become parallel design language |

### Account Surface

| Area | File | Current role | Status | Notes |
| --- | --- | --- | --- | --- |
| Profile auth card | `/Users/dinaba/Documents/ss new site /src/pages/Profile.jsx` | sign-in and sign-up entry | `Extract` | good candidate for shared auth form shell |
| Profile sidebar nav | `/Users/dinaba/Documents/ss new site /src/pages/Profile.jsx` | account navigation | `Refactor` | interaction is usable but not yet a shared vertical-nav pattern |
| Stats cards | `/Users/dinaba/Documents/ss new site /src/pages/Profile.jsx` | overview KPIs | `Extract` | should align with admin metric-card conventions |
| Orders list cards | `/Users/dinaba/Documents/ss new site /src/pages/Profile.jsx` | order history summary | `Refactor` | currently mock-data driven |
| Settings form | `/Users/dinaba/Documents/ss new site /src/pages/Profile.jsx` | account editing | `Refactor` | looks real but lacks persistence and shared form patterns |

### Admin Surface

| Area | File | Current role | Status | Notes |
| --- | --- | --- | --- | --- |
| Admin layout shell | `/Users/dinaba/Documents/ss new site /src/components/admin/AdminLayout.jsx` | page frame, top bar, outlet | `Keep` | good shell to standardize around |
| Sidebar | `/Users/dinaba/Documents/ss new site /src/components/admin/Sidebar.jsx` | primary navigation | `Refactor` | strong structure; should be adopted as the main nav pattern |
| Admin login card | `/Users/dinaba/Documents/ss new site /src/pages/admin/AdminLogin.jsx` | staff auth screen | `Extract` | strong candidate to share rules with profile auth card |
| Metric cards | `/Users/dinaba/Documents/ss new site /src/pages/admin/Dashboard.jsx` | dashboard KPIs | `Extract` | should become reusable card pattern |
| Chart cards | `/Users/dinaba/Documents/ss new site /src/pages/admin/Dashboard.jsx` | analytics modules | `Refactor` | visual hierarchy should be standardized |
| Data tables | `/Users/dinaba/Documents/ss new site /src/pages/admin/Orders.jsx` and related pages | operational lists and records | `Extract` | shared table system needed |
| Form dialogs | `/Users/dinaba/Documents/ss new site /src/pages/admin/Products.jsx`, `/Users/dinaba/Documents/ss new site /src/pages/admin/Promotions.jsx` | edit/create flows | `Refactor` | many local input classes; unify into shared form primitives |
| Sticky note | `/Users/dinaba/Documents/ss new site /src/components/admin/StickyNote.jsx` | floating annotation tool | `Keep` | niche tool; should consume token layer only |
| Team chat | `/Users/dinaba/Documents/ss new site /src/components/admin/TeamChat.jsx` | collaboration module | `Refactor` | likely needs shared input, list item, and status patterns |

### Staff Surface

| Area | File | Current role | Status | Notes |
| --- | --- | --- | --- | --- |
| Staff workspace | `/Users/dinaba/Documents/ss new site /src/pages/staff/StaffWorkspace.jsx` | role-based launcher | `Refactor` | should reuse admin shell and dashboard card patterns |
| Sales module | `/Users/dinaba/Documents/ss new site /src/components/staff/SalesModule.jsx` | POS-style flow | `Refactor` | high-value workflow; needs systemized controls and summaries |

## Cross-Cutting Pattern Inventory

### Buttons

Observed in:

- storefront add-to-cart
- admin login
- profile auth
- sidebar logout
- dashboard save/cancel controls

Assessment:

- many visual variants exist
- naming is inconsistent
- not yet a shared system component

Decision:

- create shared `Button` component
- migrate high-traffic screens first

### Inputs

Observed in:

- profile auth and settings
- admin login
- admin header search
- orders and products forms
- cart coupon field

Assessment:

- same behavior appears with several unrelated class patterns
- focus behavior is inconsistent

Decision:

- create shared `Input`, `Select`, and `Textarea`

### Cards

Observed in:

- product cards
- cart summary card
- profile stat cards
- admin metric cards
- loyalty benefit cards

Assessment:

- cards are the strongest repeated pattern in the codebase
- spacing and shadow rules vary too much

Decision:

- create a shared `Card` primitive with variants

### Navigation

Observed in:

- customer header
- profile sidebar
- admin sidebar

Assessment:

- three separate navigation systems exist
- they should not look identical, but should share spacing, states, and focus logic

Decision:

- standardize interaction rules, not exact layout

### Feedback States

Observed in:

- loading text
- auth alerts
- coupon messages
- empty cart
- table loading rows

Assessment:

- feedback exists but is inconsistent in tone, appearance, and placement

Decision:

- define shared `EmptyState`, `InlineAlert`, and `LoadingState`

## Components To Build First

These should be the first shared system components:

1. `Button`
2. `Input`
3. `Select`
4. `Textarea`
5. `Card`
6. `Badge`
7. `Tabs`
8. `Drawer`
9. `InlineAlert`
10. `EmptyState`
11. `PageHeader`
12. `SectionHeader`

## Components To Defer

- map-specific markers
- custom chart internals
- sticky note drag behavior
- highly page-specific spreadsheet import widgets

These are better handled after the foundation and shared primitives are stable.

## Migration Sequence

1. Shared controls
   - button, input, select, textarea
2. Shared structure
   - card, badge, page header, section header
3. Shared interaction
   - tabs, drawer, alerts, empty states
4. Domain patterns
   - product card, metric card, table, filter bar

## Exit Criteria

This inventory is considered actionable when:

- each item has an explicit keep/refactor/replace decision
- first-wave shared components are agreed
- migration order is clear
