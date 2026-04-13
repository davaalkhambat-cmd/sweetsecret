# Backoffice Access Baseline

This document records the current access-control baseline for the back office before any hardening changes.

## Purpose

- Freeze the current route-to-permission model.
- Map each screen to the collections it reads or writes.
- Compare UI-level RBAC with current Firestore and Storage enforcement.
- Give the team a safe baseline for phased changes without breaking production behavior.

## Current Route Inventory

| Route | Screen | UI required permission | Main data access |
| --- | --- | --- | --- |
| `/admin` | Admin home redirect | Staff login only | No direct data; redirects by role |
| `/admin/delivery-dashboard` | Dashboard | `view_operations` | `orders`, `sales`, `products` |
| `/admin/orders` | Orders | `view_orders` | `orders`, `products`, `promotions`, `users` |
| `/admin/products` | Products | `view_products` | `products`, `catalog_categories` |
| `/admin/inventory` | Inventory | `view_inventory` | Not baseline-mapped yet in this pass |
| `/admin/sales-revenue` | Sales Revenue | `view_finance` | Not baseline-mapped yet in this pass |
| `/admin/users` | Users | `view_customers` | `users`, `orders` |
| `/admin/promotions` | Promotions | `view_marketing` | `coupons`, `giftCards`, `promotions`, `products` |
| `/admin/social-business-suite` | Social Business Suite | `view_marketing` | External API token flow, no Firestore baseline dependency found in this pass |
| `/admin/staff-roles` | Staff Roles | `view_roles` | `users`, `role_definitions` |
| `/admin/settings` | Settings | `view_settings` | No data access yet; placeholder |
| `/workspace` | Staff workspace | Staff login only | Module visibility only; actual module access depends on child pages |
| `/admin/login` | Admin login | None | Auth flow, `users`, `role_definitions` via auth context |

## Collection Inventory

| Collection | Read from | Write from | Current Firestore rule behavior |
| --- | --- | --- | --- |
| `users` | Auth context, Orders, Users, Staff Roles | Auth context, Staff Roles | Owner read/write own doc; `isAdmin()` can read/write all |
| `role_definitions` | Auth context, Staff Roles | Staff Roles | Public read, `isAdmin()` write |
| `orders` | Dashboard, Orders, Users | Orders | Signed-in users can create; owner or `isAdmin()` can read; `isAdmin()` can update/delete |
| `products` | Home, Dashboard, Orders, Products, Promotions | Products | Public read; `isAdmin()` write |
| `catalog_categories` | Products | Products | Public read; `isAdmin()` write |
| `coupons` | Cart, Promotions | Promotions | `isAdmin()` read/write |
| `giftCards` | Promotions | Promotions | `isAdmin()` read/write |
| `promotions` | Orders, Promotions | Promotions | `isAdmin()` read/write |
| `sales` | Dashboard | Sales module | `isStaff()` or `isAdmin()` read/write |
| `team_chats` | TeamChat | TeamChat | `isStaff()` or `isAdmin()` read/write |
| `team_chat_meta` | TeamChat | TeamChat | `isStaff()` or `isAdmin()` read/write |
| `sticky_notes` | StickyNote | StickyNote | `isStaff()` or `isAdmin()` read/write |

## UI RBAC Source of Truth

Current UI permissions are defined in:

- `/Users/dinaba/Documents/ss new site/src/config/roles.js`
- `/Users/dinaba/Documents/ss new site/src/App.jsx`
- `/Users/dinaba/Documents/ss new site/src/components/admin/RequireAdmin.jsx`

Current backend authorization is defined in:

- `/Users/dinaba/Documents/ss new site/firestore.rules`
- `/Users/dinaba/Documents/ss new site/storage.rules`

## Current Mismatch Register

| Area | UI expectation | Current backend behavior | Risk |
| --- | --- | --- | --- |
| User self-update | User should update only profile-safe fields | Owner can update almost all fields as long as `uid` and `email` stay unchanged | Critical privilege escalation risk |
| Admin definition | Permissions should decide module authority | Rules use coarse role-name-based `isAdmin()` | High mismatch between matrix and enforcement |
| Status control | `inactive` should eventually block access | Rules and route guard do not enforce status | High operational control gap |
| Dynamic roles | New roles can be created in UI | Role resolver falls back to `customer` for non-default roles | High governance and usability risk |
| Scoped roles | `branch`, `team`, `assigned` imply limited data access | No scope enforcement found in rules | High overexposure risk |
| Users page permission | `/admin/users` looks like CRM/customer access | Route uses `view_customers`, not `view_users` | Medium taxonomy inconsistency |
| Audit capability | `view_audit` exists as permission | No dedicated immutable audit log model found | Medium auditability gap |

## Baseline Rules Summary

### Firestore

- `products` and `catalog_categories`: public read, coarse admin write.
- `users`: owner self-service plus coarse admin full access.
- `orders`: authenticated create, owner/coarse-admin read, coarse-admin update/delete.
- `role_definitions`: public read, coarse admin write.
- `sales`, `team_chats`, `team_chat_meta`, `sticky_notes`: any staff can read/write.

### Storage

- `users/{uid}/**`: owner or coarse admin.
- `products/**`: public read, coarse admin write.
- `team_chats/**`: any staff can read/write.

## Safe Next Steps

The next implementation step should not change rules first. It should:

1. Refactor auth/profile sync so login no longer depends on writing sensitive user fields.
2. Separate user-owned profile fields from admin-managed security fields.
3. Add logging around role/status changes before enforcing stricter rules.

## File References

- `/Users/dinaba/Documents/ss new site/src/config/roles.js`
- `/Users/dinaba/Documents/ss new site/src/context/AuthContext.jsx`
- `/Users/dinaba/Documents/ss new site/src/App.jsx`
- `/Users/dinaba/Documents/ss new site/src/components/admin/RequireAdmin.jsx`
- `/Users/dinaba/Documents/ss new site/firestore.rules`
- `/Users/dinaba/Documents/ss new site/storage.rules`
