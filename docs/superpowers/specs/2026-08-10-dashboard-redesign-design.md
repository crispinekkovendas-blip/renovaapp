# Renova — Dashboard/app-shell redesign (Skool/OnlyFans-inspired)

**Date:** 2026-08-10 · **Status:** approved, not yet implemented

## Goal

The current staff-facing app (dashboard + agenda/pacientes/financeiro/relatórios/configurações) feels cluttered and dated. Redesign it around the navigation clarity and card-based visual language of Skool.com and OnlyFans, while keeping the app appropriate for daily use by clinic staff (readability, print support) and without over-engineering a single-clinic internal tool.

A full backup of the pre-redesign state exists: git tag `pre-redesign-baseline` (commit `5360785`) and archive `../RenovaAPP-backup-2026-08-10.tar.gz`.

## Scope

Covers the entire app: the staff app shell (all routes under `src/app/(app)/`), `/login`, and the public booking flow `/agendar`. The one explicit exclusion is the patient-record print view (`src/app/(app)/pacientes/[id]/imprimir/[encounterId]/page.tsx`) — it's a printable document, not part of the interactive shell, and stays as-is.

## Decisions

### 1. Navigation & shell

Replace the current full-width dark sidebar with two pieces, both living in `(app)/layout.tsx` so they persist across navigation without remounting:

- **Icon rail** (far left, ~50px, dark `pine-950`): brand mark at top, section icons as small rounded tiles (active = filled `pine-700`), user avatar pinned at the bottom (replaces today's name/role/logout card — clicking it opens the logout affordance).
- **Top bar** (white, full width of the remaining space): section label + pill-shaped tabs for that section's sub-navigation where one exists (e.g. Financeiro: Pagamentos / Convênios). Active tab = filled `pine-900` pill, matches the validated mockup.

Content area is full-width on every screen **except** Dashboard, which uses a centered column (~760px max-width) for a feed-like feel.

### 2. Interaction model — Next.js-native, not a client SPA rewrite

The app currently is deliberately zero-client-JS (Server Components + Server Actions, one client component for the active nav link). We are *not* rewriting it as a client-rendered SPA with global state/SWR — that's unnecessary complexity for a single-clinic internal tool. Instead:

- **Persistent shell**: rail + top bar mount once in the layout; regular App Router behavior already keeps them mounted across child navigations.
- **Instant nav**: internal links use `<Link>` (default prefetch). Every route segment gets a `loading.tsx` skeleton shaped like its content (stat-row skeleton for Dashboard, table-row skeleton for Pacientes/Financeiro, calendar-grid skeleton for Agenda) so a slow query never shows a blank flash.
- **Modals via intercepting routes**: the three query-param side panels that exist today — Agenda's `?novo=1` (new appointment), Pacientes' `?novo=1` (new patient), and Agenda's waitlist-add — convert to `@modal` intercepting routes. Navigated to from inside the app, they render as an overlay; landed on directly (or refreshed), they render as a normal full page. Existing `?erro=...` validation-error rendering is preserved unchanged inside the modal.
- **Optimistic updates**: limited to the two highest-frequency actions — appointment status transitions on Agenda (Confirmar/Iniciar/Concluir/Faltou) and "marcar como pago" on Financeiro — via `useOptimistic` wrapping the existing Server Actions. On failure, the UI reverts and a small inline `<Alert>` shows near the affected row (no toast library).
- **Live search**: the Pacientes search box becomes a small client component that updates results as-you-type (debounced `router.replace` against the existing server query — no new data-fetching library).

Everything not listed above (all detail pages, all forms not mentioned, Relatórios, Configurações) stays exactly as it is today: full Server Component, full Server Action, full page navigation. This list is intentionally the complete set of interactivity added — do not add client components or optimistic updates beyond it without discussing scope first.

### 3. Visual system

- **Surfaces**: drop the cream "paper" texture and radial-gradient body background. Surfaces go neutral white/near-white (`#fff` / `#f7f7f8`-equivalent), borders lighter/flatter than today.
- **Accent color**: unchanged — the existing `pine-*` scale remains the single accent (buttons, active states, links), used more sparingly against the neutral backdrop. `clay-*` remains, but strictly for its current functional role (pending/warning status), not decoration.
- **Typography**: unchanged font stack. Fraunces stays for page titles/greetings/section headings; Karla stays for body/UI/tables/labels. No new fonts.
- **Shape**: buttons (`.btn`, `.btn-primary`, `.btn-outline`, `.btn-ghost`) move from `rounded-xl` to `rounded-full` (pill). Chips are already pill-shaped — unchanged. Cards remain `rounded-2xl`.
- **New shared components** (in `src/components/`): the rail+top-bar shell (replacing the current sidebar `<aside>` in `(app)/layout.tsx`), a `<Modal>` client wrapper for the intercepting-route overlays (backdrop, close-on-escape, close-on-backdrop-click), a small `<Alert>` primitive for optimistic-update failure messages.

### 4. Page-by-page

| Page | Treatment |
|---|---|
| Dashboard (`/dashboard`) | Centered feed column. Stat tiles as a row at top; "Agenda de hoje" and "Pacientes recentes" stacked vertically as feed-style card lists (currently side-by-side — column is narrower now). |
| Agenda (`/agenda`) | Full-width (calendar grid needs the space). "Novo agendamento" → modal. Waitlist add-form stays as its current `<details>` expand-in-place — not broken, not touched. |
| Pacientes (`/pacientes`) | Full-width table. Search becomes live-as-you-type. "Novo paciente" → modal. |
| Financeiro (`/financeiro`, `/financeiro/convenios`) | Full-width. "Marcar como pago" gets the optimistic update. Convênios becomes a top-bar pill tab alongside Pagamentos. |
| Relatórios, Configurações (+ `horarios`, `api` subpages) | Visual reskin only (new tokens/shapes) — no structural or interaction changes; not the pages the user flagged. |
| Paciente detail/resumo (`/pacientes/[id]`, `/resumo`) | Visual reskin only. |
| Paciente print view (`/imprimir/[encounterId]`) | **Untouched** — printable document, outside the app shell. |
| Login (`/login`) | Keep the dark pine hero panel + Fraunces italic headline (brand personality intentionally preserved on this surface) and neutral white form panel. Pill button. |
| Public booking (`/agendar`) | Most Skool/OnlyFans-flavored surface, since it's consumer-facing: big rounded tappable cards for professional/date/time selection. No rail/top-bar — minimal branded header only. Same color tokens and pill buttons as the rest. |

### 5. Error handling & loading states

- `loading.tsx` per route segment (see §2).
- New `error.tsx` at the `(app)` segment root — none exists today, so an unhandled error currently falls through to Next.js's default error screen. Adds a branded minimal error view with a retry action.
- Modal validation errors reuse the existing `?erro=...` server-side pattern unchanged; it just renders inside the overlay instead of triggering a full reload.
- Optimistic-update failures revert the UI and show a local `<Alert>` near the affected row.

### 6. Testing

No automated test framework exists in this project today. This redesign does not introduce one. Verification is manual: click through every redesigned screen (nav, modal open/close/deep-link/refresh, optimistic toggle including a simulated failure, live search, responsive check) in the browser before calling any part of the implementation done.

## Out of scope

Automated testing infrastructure, dark mode, any change to the data model or Server Actions' business logic, telemedicine/TISS/multi-clinic items already out of scope per the original MVP spec.
