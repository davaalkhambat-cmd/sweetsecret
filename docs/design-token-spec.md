# Frontend Design Token Spec

This document defines the first stable design-token layer for the Sweet Secret frontend.

## Purpose

- Create one shared UI foundation for customer, profile, admin, and staff surfaces.
- Reduce ad hoc styling and inconsistent page-level decisions.
- Give engineering a safe standard that can be adopted incrementally without rewriting the whole app.

## Scope

This token spec covers:

- color
- typography
- spacing
- radius
- shadow
- motion
- layout
- z-index
- interaction states

This token spec does not yet cover:

- illustration style
- icon library replacement
- data-visualization palette rules
- brand photography rules

## Current Baseline

Current global tokens start in:

- `/Users/dinaba/Documents/ss new site /src/index.css`

Current issues in the baseline:

- token naming is partially consistent but incomplete
- some tokens are referenced without being defined
- state styles are not standardized across customer, profile, and admin surfaces
- focus handling is not accessible enough for keyboard usage

## Token Principles

1. Tokens are the source of truth, not page-level hardcoded values.
2. Semantic tokens should be preferred over raw colors in components.
3. Customer and admin can look different while still using the same token system.
4. Interaction states must be predictable across all views.
5. New UI work should consume tokens before adding new custom values.

## Naming Model

Use a three-layer token model:

1. Primitive
   - raw values such as hex colors and spacing sizes
2. Semantic
   - intent-based tokens such as `--color-text-primary`
3. Component
   - optional local aliases for complex components only

## Color Tokens

### Primitive Colors

```css
:root {
  --base-white: #ffffff;
  --base-black: #111111;

  --stone-50: #faf7f2;
  --stone-100: #f3ede4;
  --stone-200: #e4d8c6;
  --stone-300: #d0bea3;
  --stone-400: #b59b77;
  --stone-500: #947751;
  --stone-700: #604a33;
  --stone-900: #2f241a;

  --rose-500: #b91c1c;
  --rose-600: #a11616;

  --violet-500: #7f00ff;
  --violet-600: #6b00d7;

  --green-500: #15803d;
  --amber-500: #d97706;
  --red-500: #dc2626;
  --blue-500: #2563eb;

  --gray-50: #f8fafc;
  --gray-100: #f1f5f9;
  --gray-200: #e2e8f0;
  --gray-300: #cbd5e1;
  --gray-500: #64748b;
  --gray-700: #334155;
  --gray-900: #0f172a;
}
```

### Semantic Colors

```css
:root {
  --color-bg-canvas: var(--stone-50);
  --color-bg-surface: var(--base-white);
  --color-bg-subtle: var(--gray-50);
  --color-bg-brand: var(--rose-500);
  --color-bg-brand-strong: var(--rose-600);

  --color-text-primary: var(--gray-900);
  --color-text-secondary: var(--gray-700);
  --color-text-muted: var(--gray-500);
  --color-text-inverse: var(--base-white);

  --color-border-default: var(--gray-200);
  --color-border-strong: var(--gray-300);

  --color-action-primary: var(--rose-500);
  --color-action-primary-hover: var(--rose-600);
  --color-action-secondary: var(--base-white);

  --color-state-success: var(--green-500);
  --color-state-warning: var(--amber-500);
  --color-state-danger: var(--red-500);
  --color-state-info: var(--blue-500);

  --color-focus-ring: rgba(37, 99, 235, 0.35);
  --color-overlay: rgba(15, 23, 42, 0.55);
}
```

## Typography Tokens

```css
:root {
  --font-family-display: 'Playfair Display', serif;
  --font-family-body: 'Outfit', sans-serif;

  --font-size-12: 0.75rem;
  --font-size-14: 0.875rem;
  --font-size-16: 1rem;
  --font-size-18: 1.125rem;
  --font-size-20: 1.25rem;
  --font-size-24: 1.5rem;
  --font-size-32: 2rem;
  --font-size-40: 2.5rem;
  --font-size-56: 3.5rem;

  --line-height-tight: 1.2;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.7;

  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  --font-weight-extrabold: 800;
}
```

### Type Scale Usage

| Token | Usage |
| --- | --- |
| `--font-size-56` | hero statements |
| `--font-size-40` | page titles |
| `--font-size-32` | section titles |
| `--font-size-24` | card titles |
| `--font-size-20` | secondary headings |
| `--font-size-16` | default body text |
| `--font-size-14` | meta labels, helper text |
| `--font-size-12` | badges, captions |

## Spacing Tokens

```css
:root {
  --space-2: 0.125rem;
  --space-4: 0.25rem;
  --space-8: 0.5rem;
  --space-12: 0.75rem;
  --space-16: 1rem;
  --space-20: 1.25rem;
  --space-24: 1.5rem;
  --space-32: 2rem;
  --space-40: 2.5rem;
  --space-48: 3rem;
  --space-64: 4rem;
  --space-80: 5rem;
}
```

### Spacing Rules

- Components should prefer token spacing over custom pixel values.
- Card padding should default to `--space-16` or `--space-24`.
- Page sections should default to `--space-32`, `--space-48`, or `--space-64`.

## Radius Tokens

```css
:root {
  --radius-4: 4px;
  --radius-8: 8px;
  --radius-12: 12px;
  --radius-16: 16px;
  --radius-24: 24px;
  --radius-full: 9999px;
}
```

## Shadow Tokens

```css
:root {
  --shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.06);
  --shadow-md: 0 8px 24px rgba(15, 23, 42, 0.10);
  --shadow-lg: 0 16px 40px rgba(15, 23, 42, 0.14);
}
```

Rule:

- Remove references to undefined shadows such as `--shadow-xl`.

## Motion Tokens

```css
:root {
  --duration-fast: 120ms;
  --duration-base: 200ms;
  --duration-slow: 320ms;

  --ease-standard: ease;
  --ease-emphasized: cubic-bezier(0.2, 0, 0, 1);
}
```

Rule:

- Remove references to undefined transition tokens such as `--transition-main`.

## Layout Tokens

```css
:root {
  --container-sm: 640px;
  --container-md: 960px;
  --container-lg: 1200px;
  --container-xl: 1320px;
}
```

## Breakpoints

```css
:root {
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
}
```

Usage guidance:

- mobile first
- avoid adding new one-off breakpoints unless a layout really needs it

## Z-Index Tokens

```css
:root {
  --z-base: 1;
  --z-sticky: 100;
  --z-dropdown: 300;
  --z-drawer: 500;
  --z-modal: 700;
  --z-toast: 900;
}
```

## Interaction Tokens

```css
:root {
  --control-height-sm: 36px;
  --control-height-md: 44px;
  --control-height-lg: 52px;
}
```

### Interaction Rules

- Every interactive control must expose a visible focus state.
- Use `:focus-visible` instead of removing the browser outline without replacement.
- Disabled state must reduce opacity and block pointer affordance.
- Error and success states must use the semantic state tokens.

Recommended baseline:

```css
:focus-visible {
  outline: 3px solid var(--color-focus-ring);
  outline-offset: 2px;
}
```

## Surface Model

The system should support two surface modes without splitting the design language:

- brand surface
  - storefront hero, campaign areas, promotional sections
- product surface
  - cards, forms, tables, drawers, admin screens

## Adoption Rules

1. No new component should introduce raw hex values unless added to tokens first.
2. No new page should define its own focus model.
3. Page-level CSS can consume tokens but should not redefine them.
4. Existing screens can migrate incrementally.

## Immediate Refactor Targets

- replace undefined token usage in `/Users/dinaba/Documents/ss new site /src/index.css`
- normalize global color and spacing usage
- introduce one accessible focus style across profile, cart, admin, and storefront
- remove page-specific state styling conflicts

## Exit Criteria

This token layer is considered adopted when:

- core primitives are defined once
- undefined token references are removed
- new reusable components consume semantic tokens
- customer and admin surfaces share the same spacing and state rules
