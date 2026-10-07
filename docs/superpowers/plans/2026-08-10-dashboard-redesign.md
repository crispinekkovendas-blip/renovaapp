# Skool/OnlyFans-Inspired Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Renova's dark full-width sidebar with an icon-rail + top-pill-tab shell, move the visual system from the warm cream/serif "editorial" look to a neutral white surface with pine green as the sole accent, and add targeted Next.js-native interactivity (intercepting-route modals, optimistic status updates, live search) — without introducing a client-state library or rewriting the app as an SPA.

**Architecture:** Server Components and Server Actions remain the default for every page (unchanged). A persistent client-rendered rail+top-bar shell lives in `(app)/layout.tsx`. Three query-param side panels (new appointment, new patient) become real routes intercepted as modals via Next.js parallel/intercepting routes (`@modal`, `(.)segment`). Two high-frequency actions (appointment status, mark payment paid) get `useOptimistic` wrappers around their existing, unchanged Server Actions. Pacientes search becomes a small client component debouncing into `router.replace`.

**Tech Stack:** Next.js 15 (App Router) + React 19 + TypeScript + Tailwind v4. No new npm dependencies are introduced by this plan.

## Global Constraints

- No new npm dependencies (spec: "no new dependencies added" — everything here uses React 19 / Next 15 built-ins: `useOptimistic`, `useTransition`, intercepting routes, `unstable_rethrow`).
- All UI copy stays in pt-BR, matching existing strings exactly in tone.
- Every existing Server Action keeps its exact name and parameter shape; only two `redirect()` target strings change (documented in Task 5 and Task 7).
- The print view `src/app/(app)/pacientes/[id]/imprimir/[encounterId]/page.tsx` is explicitly out of scope — do not touch it.
- No automated test framework exists in this project and this plan does not add one (per approved spec §6). **Verification for every task is: `npx tsc --noEmit` (must pass with zero errors) + `npm run build` (must succeed) + a manual click-through in the dev server (`npm run dev`) described in that task's steps.** Where a step says "verify", it means do this by hand in the browser and confirm the described behavior before checking the box.
- Backup exists: git tag `pre-redesign-baseline`, archive `../RenovaAPP-backup-2026-08-10.tar.gz`. If a task goes sideways, `git diff` / `git checkout pre-redesign-baseline -- <file>` recovers the pre-redesign version of any single file.

---

## File Structure

**New files:**
- `src/components/app-shell/nav-config.ts` — shared nav item/tab data consumed by both rail and top bar
- `src/components/app-shell/icon-rail.tsx` — client, the dark left icon rail
- `src/components/app-shell/top-bar.tsx` — client, the white top pill-tab bar
- `src/components/modal.tsx` — client, generic overlay wrapper for intercepted routes
- `src/components/alert.tsx` — small shared inline error message primitive
- `src/app/(app)/@modal/default.tsx` — required empty slot fallback
- `src/app/(app)/@modal/(.)agenda/novo/page.tsx` — intercepted "new appointment" modal
- `src/app/(app)/agenda/novo/page.tsx` — non-intercepted fallback (direct nav / refresh)
- `src/components/agenda/new-appointment-data.ts` — shared data loader for both agenda/novo pages
- `src/components/agenda/new-appointment-form.tsx` — shared form JSX for both agenda/novo pages
- `src/components/agenda/appointment-status-buttons.tsx` — client, optimistic status badge+actions
- `src/app/(app)/@modal/(.)pacientes/novo/page.tsx` — intercepted "new patient" modal
- `src/app/(app)/pacientes/novo/page.tsx` — non-intercepted fallback
- `src/components/pacientes/new-patient-form.tsx` — shared form JSX for both pacientes/novo pages
- `src/components/pacientes/patient-search-input.tsx` — client, debounced live search
- `src/components/financeiro/payment-actions-cell.tsx` — client, optimistic pay action
- `src/app/(app)/dashboard/loading.tsx`, `agenda/loading.tsx`, `pacientes/loading.tsx`, `financeiro/loading.tsx`
- `src/app/(app)/error.tsx` — client, branded error boundary

**Modified files:**
- `src/app/globals.css` — neutral surfaces, pill buttons
- `src/app/(app)/layout.tsx` — rail+top-bar shell, `modal` slot
- `src/app/(app)/dashboard/page.tsx` — centered feed column
- `src/app/(app)/agenda/page.tsx` — modal links, optimistic status buttons
- `src/app/(app)/pacientes/page.tsx` — modal link, live search
- `src/app/(app)/financeiro/page.tsx` — optimistic pay cell, drop redundant Convênios button
- `src/app/agendar/page.tsx` — card-grid date/time selection
- `src/lib/actions.ts` — two `redirect()` targets updated

**Deleted files:**
- `src/components/nav-links.tsx` — superseded by `icon-rail.tsx`/`top-bar.tsx`

---

### Task 1: Design tokens — neutral surfaces & pill buttons

**Files:**
- Modify: `src/app/globals.css`

**Interfaces:** None (pure CSS/token change; no component signatures affected).

- [ ] **Step 1: Update the theme token and body background**

In `src/app/globals.css`, change the `--color-paper` token and remove the decorative gradient:

```css
@theme {
  --font-display: "Fraunces Variable", ui-serif, Georgia, serif;
  --font-sans: "Karla Variable", ui-sans-serif, system-ui, sans-serif;

  --color-paper: #f7f7f8;
  --color-ink: #21302b;

  /* ...pine-* and clay-* scales stay exactly as they are... */
}

body {
  @apply bg-paper text-ink font-sans antialiased;
}
```

Remove the two `background-image:` / `background-attachment:` lines that followed `@apply bg-paper ...` in the original file — the cream radial-gradient texture goes away entirely.

- [ ] **Step 2: Flatten the card and pill the buttons**

In the same file's `@layer components` block, change `.card` and the four `.btn*` rules:

```css
@layer components {
  .card {
    @apply rounded-2xl border border-stone-200 bg-white shadow-[0_1px_2px_rgba(15,23,20,0.05)];
  }

  .btn {
    @apply inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-colors;
  }
  .btn-primary {
    @apply bg-pine-700 text-pine-50 hover:bg-pine-800;
  }
  .btn-outline {
    @apply border border-pine-900/15 bg-white text-pine-900 hover:border-pine-500 hover:text-pine-700;
  }
  .btn-ghost {
    @apply text-pine-800 hover:bg-pine-100;
  }

  /* .input, .label, .chip, .table-base stay exactly as they are */
}
```

- [ ] **Step 3: Verify**

Run `npx tsc --noEmit` (should pass — this is a CSS-only change but confirms nothing else broke). Run `npm run dev`, open any page, confirm: body background is neutral light gray (not cream), buttons are fully pill-shaped, cards have a thin neutral gray border instead of a tinted green one.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "style: neutral surfaces and pill-shaped buttons"
```

---

### Task 2: Nav config + icon rail + top bar components

**Files:**
- Create: `src/components/app-shell/nav-config.ts`
- Create: `src/components/app-shell/icon-rail.tsx`
- Create: `src/components/app-shell/top-bar.tsx`

**Interfaces:**
- Produces: `NAV_ITEMS: NavItem[]` from `nav-config.ts`, where `NavItem = { href: string; label: string; icon: ComponentType<SVGProps<SVGSVGElement>>; adminOnly?: boolean; tabs?: { href: string; label: string }[] }`.
- Produces: `IconRail({ name, role }: { name: string; role: Role })` — default export not used, named export `IconRail`.
- Produces: `TopBar()` — named export, no props.
- Consumes: `Role` type from `@/lib/db`, icon components from `@/components/icons`, `logoutAction` from `@/lib/actions`.

- [ ] **Step 1: Write the nav config**

Create `src/components/app-shell/nav-config.ts`:

```ts
import type { ComponentType, SVGProps } from "react";
import {
  IconCalendar,
  IconFileText,
  IconHome,
  IconSettings,
  IconUsers,
  IconWallet,
} from "@/components/icons";

export interface NavTab {
  href: string;
  label: string;
}

export interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  adminOnly?: boolean;
  tabs?: NavTab[];
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Início", icon: IconHome },
  { href: "/agenda", label: "Agenda", icon: IconCalendar },
  { href: "/pacientes", label: "Pacientes", icon: IconUsers },
  {
    href: "/financeiro",
    label: "Financeiro",
    icon: IconWallet,
    tabs: [
      { href: "/financeiro", label: "Pagamentos" },
      { href: "/financeiro/convenios", label: "Convênios" },
    ],
  },
  { href: "/relatorios", label: "Relatórios", icon: IconFileText },
  { href: "/configuracoes", label: "Configurações", icon: IconSettings, adminOnly: true },
];
```

- [ ] **Step 2: Write the icon rail**

Create `src/components/app-shell/icon-rail.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/lib/actions";
import { IconLogout } from "@/components/icons";
import type { Role } from "@/lib/db";
import { NAV_ITEMS } from "./nav-config";

const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrador",
  recepcao: "Recepção",
  profissional: "Profissional",
};

export function IconRail({ name, role }: { name: string; role: Role }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || role === "admin");
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <aside className="sticky top-0 flex h-screen w-16 shrink-0 flex-col items-center gap-1 bg-pine-950 py-4">
      <Link
        href="/dashboard"
        className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-pine-700 font-display text-lg font-semibold italic text-pine-50"
      >
        R
      </Link>

      <nav className="flex flex-1 flex-col items-center gap-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              aria-label={item.label}
              className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                active ? "bg-pine-700 text-pine-50" : "text-pine-300/70 hover:bg-pine-900 hover:text-pine-50"
              }`}
            >
              <Icon className="h-[18px] w-[18px]" />
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col items-center gap-2 pt-2">
        <div
          title={`${name} · ${ROLE_LABEL[role]}`}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-clay-500 text-sm font-bold text-white"
        >
          {initial}
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            title="Sair"
            aria-label="Sair"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-pine-300/60 transition-colors hover:bg-pine-900 hover:text-pine-50"
          >
            <IconLogout className="h-4 w-4" />
          </button>
        </form>
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: Write the top bar**

Create `src/components/app-shell/top-bar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav-config";

export function TopBar() {
  const pathname = usePathname();
  const activeItem = NAV_ITEMS.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );

  return (
    <header className="flex items-center gap-2 border-b border-stone-200 bg-white px-6 py-3">
      <span className="mr-2 font-display text-base font-semibold italic text-pine-950">Renova</span>
      {activeItem?.tabs
        ? activeItem.tabs.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                  active ? "bg-pine-900 text-white" : "text-pine-900/60 hover:bg-pine-50"
                }`}
              >
                {tab.label}
              </Link>
            );
          })
        : activeItem
          ? (
            <span className="rounded-full bg-pine-900 px-3 py-1.5 text-xs font-bold text-white">
              {activeItem.label}
            </span>
          )
          : null}
    </header>
  );
}
```

- [ ] **Step 4: Verify**

Run `npx tsc --noEmit`. Expected: passes (these components aren't wired into the app yet, so nothing renders them — this just confirms they compile standalone).

- [ ] **Step 5: Commit**

```bash
git add src/components/app-shell/
git commit -m "feat: add icon rail and top bar components"
```

---

### Task 3: Wire the shell into the layout + modal slot plumbing

**Files:**
- Modify: `src/app/(app)/layout.tsx`
- Create: `src/app/(app)/@modal/default.tsx`
- Create: `src/components/modal.tsx`
- Create: `src/components/alert.tsx`
- Delete: `src/components/nav-links.tsx`

**Interfaces:**
- Consumes: `IconRail`, `TopBar` from Task 2.
- Produces: `Modal({ children }: { children: ReactNode })` — client wrapper every intercepted-route page (Tasks 5, 7) will import from `@/components/modal`.
- Produces: `Alert({ children }: { children: ReactNode })` — small inline error message, used by Tasks 6 and 9 for optimistic-update failures.
- Produces: `(app)/layout.tsx` now accepts a second prop `modal: React.ReactNode` in addition to `children` — any new parallel route slot under `(app)/` must be named `@modal` to match.

- [ ] **Step 1: Replace the layout's sidebar with the rail + top bar**

Rewrite `src/app/(app)/layout.tsx`:

```tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { IconRail } from "@/components/app-shell/icon-rail";
import { TopBar } from "@/components/app-shell/top-bar";

export default async function AppLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <IconRail name={session.name} role={session.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="min-w-0 flex-1 px-8 py-8">{children}</main>
      </div>
      {modal}
    </div>
  );
}
```

- [ ] **Step 2: Add the required empty modal-slot fallback**

Create `src/app/(app)/@modal/default.tsx`:

```tsx
export default function Default() {
  return null;
}
```

This is required by Next.js: whenever a route under `(app)/` doesn't have a matching intercepted page in `@modal`, this renders instead (i.e. nothing).

- [ ] **Step 3: Write the generic Modal wrapper**

Create `src/components/modal.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

export function Modal({ children }: { children: ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") router.back();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-pine-950/40 px-4 py-10 backdrop-blur-sm">
      <div className="absolute inset-0" aria-hidden="true" onClick={() => router.back()} />
      <div className="card relative w-full max-w-lg p-6">{children}</div>
    </div>
  );
}
```

- [ ] **Step 4: Write the shared Alert primitive**

Create `src/components/alert.tsx`:

```tsx
import type { ReactNode } from "react";

export function Alert({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-[11px] font-bold text-rose-600">{children}</p>;
}
```

- [ ] **Step 5: Delete the now-unused NavLink component**

Delete `src/components/nav-links.tsx` (its only consumer was the old sidebar in `layout.tsx`, just replaced).

- [ ] **Step 6: Verify**

Run `npx tsc --noEmit` — expect zero errors (the `modal` prop has no route producing content yet, so Next.js will pass `null` via the `default.tsx` from Step 2, which is valid). Run `npm run build` — expect success. Run `npm run dev`, log in, confirm: dark icon rail on the left with working nav (hover shows tooltips, active section highlighted), white top bar showing the current section's label (and pill tabs when on Financeiro), page content unchanged otherwise, logout button in the rail still logs out.

- [ ] **Step 7: Commit**

```bash
git add src/app/\(app\)/layout.tsx src/app/\(app\)/@modal/default.tsx src/components/modal.tsx src/components/alert.tsx
git rm src/components/nav-links.tsx
git commit -m "feat: replace sidebar with icon-rail/top-bar shell, add modal slot"
```

---

### Task 4: Dashboard — centered feed column

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx`

**Interfaces:** None new — only layout/JSX restructuring of an existing page.

- [ ] **Step 1: Restructure the page**

In `src/app/(app)/dashboard/page.tsx`, change the root fragment to a centered `<div>`, the stat grid's column classes, and un-nest the two list sections from their side-by-side grid into stacked sections. Change the "Novo agendamento" link target from `/agenda?novo=1` to `/agenda/novo` (the new modal route from Task 5). Full replacement for the `return (...)` block:

```tsx
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        subtitle={fmtDateLong(today)}
        action={
          <Link href="/agenda/novo" className="btn btn-primary">
            Novo agendamento
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Consultas hoje"
          value={String(active.length)}
          hint={`${todayAppointments.filter((a) => a.status === "concluido").length} concluídas`}
        />
        <StatCard label="Pacientes cadastrados" value={String(patientCount)} />
        <StatCard label="Recebido no mês" value={moneyBR(monthRevenue)} />
        <StatCard label="A receber" value={moneyBR(pendingTotal)} accent={pendingTotal > 0} />
      </div>

      <section className="mt-8">
        <SectionTitle>Agenda de hoje</SectionTitle>
        {todayAppointments.length === 0 ? (
          <EmptyState
            title="Nenhuma consulta hoje"
            hint="Use “Novo agendamento” para marcar a primeira."
          />
        ) : (
          <div className="card divide-y divide-pine-900/5">
            {todayAppointments.map((a) => (
              <Link
                key={a.id}
                href="/agenda"
                className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-pine-50/60"
              >
                <span className="w-12 font-display text-lg font-semibold text-pine-950">
                  {a.start_time}
                </span>
                <span
                  className="h-8 w-1 rounded-full"
                  style={{ backgroundColor: a.professional_color }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{a.patient_name}</span>
                  <span className="block truncate text-xs text-pine-900/55">
                    {a.procedure} · {a.professional_name}
                  </span>
                </span>
                <StatusBadge status={a.status} />
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <SectionTitle>Pacientes recentes</SectionTitle>
        {recentPatients.length === 0 ? (
          <EmptyState title="Nenhum paciente ainda" />
        ) : (
          <div className="card divide-y divide-pine-900/5">
            {recentPatients.map((p) => (
              <Link
                key={p.id}
                href={`/pacientes/${p.id}`}
                className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-pine-50/60"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">{p.name}</span>
                  <span className="block text-xs text-pine-900/55">
                    {p.insurance ?? "Particular"} · desde {fmtDate(p.created_at.slice(0, 10))}
                  </span>
                </span>
                <span className="text-xs font-bold text-pine-600">ver ficha →</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
```

Note: `/agenda/novo` doesn't exist until Task 5 — that's fine, this task can be committed first; the link will 404 until Task 5 lands. If you're executing tasks out of order, do Task 5 before clicking that link.

- [ ] **Step 2: Verify**

Run `npx tsc --noEmit` and `npm run build` — both must pass. In the dev server, open `/dashboard`: content should be centered in a ~768px column, stat tiles 2-across on narrow viewports and 4-across from `sm:` up, "Agenda de hoje" and "Pacientes recentes" stacked vertically (not side-by-side).

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/dashboard/page.tsx
git commit -m "feat: centered feed-column layout for dashboard"
```

---

### Task 5: Agenda — "Novo agendamento" as an intercepted modal

**Files:**
- Create: `src/components/agenda/new-appointment-data.ts`
- Create: `src/components/agenda/new-appointment-form.tsx`
- Create: `src/app/(app)/agenda/novo/page.tsx`
- Create: `src/app/(app)/@modal/(.)agenda/novo/page.tsx`
- Modify: `src/app/(app)/agenda/page.tsx`
- Modify: `src/lib/actions.ts`

**Interfaces:**
- Consumes: `Modal` from `@/components/modal` (Task 3).
- Produces: `loadNewAppointmentOptions(): Promise<{ professionals: Professional[]; patients: Patient[] }>`.
- Produces: `NewAppointmentForm` props: `{ date: string; time?: string; professionalId?: string; patients: Patient[]; professionals: Professional[]; error?: string; closeHref: string }`.
- Modifies: `createAppointmentAction`'s two error-path `redirect()` targets (was `/agenda?date=...&novo=1&erro=...`, becomes `/agenda/novo?date=...&erro=...`). Success-path redirect (`/agenda?date=${date}`) is unchanged.

- [ ] **Step 1: Shared data loader**

Create `src/components/agenda/new-appointment-data.ts`:

```ts
import { sql } from "@/lib/db";
import type { Patient, Professional } from "@/lib/db";

export async function loadNewAppointmentOptions() {
  const [professionals, patients] = await Promise.all([
    sql<Professional>`SELECT * FROM professionals WHERE active = 1 ORDER BY name`,
    sql<Patient>`SELECT id, name FROM patients ORDER BY name`,
  ]);
  return { professionals, patients };
}
```

- [ ] **Step 2: Shared form component**

Create `src/components/agenda/new-appointment-form.tsx` (this is the existing aside form's JSX, extracted verbatim with `date`/`time`/`professionalId`/`error`/`closeHref` as props instead of reading `params` directly):

```tsx
import Link from "next/link";
import { createAppointmentAction } from "@/lib/actions";
import type { Patient, Professional } from "@/lib/db";

export function NewAppointmentForm({
  date,
  time,
  professionalId,
  patients,
  professionals,
  error,
  closeHref,
}: {
  date: string;
  time?: string;
  professionalId?: string;
  patients: Patient[];
  professionals: Professional[];
  error?: string;
  closeHref: string;
}) {
  return (
    <>
      <h2 className="font-display text-xl font-semibold text-pine-950">Novo agendamento</h2>
      {error === "conflito" ? (
        <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          Conflito de horário: o profissional já tem um agendamento nesse intervalo.
        </p>
      ) : null}
      {error === "campos" ? (
        <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          Preencha paciente, profissional e horário para agendar.
        </p>
      ) : null}
      <form action={createAppointmentAction} className="mt-4 space-y-3">
        <input type="hidden" name="date" value={date} />
        <div>
          <label className="label" htmlFor="patient_id">
            Paciente
          </label>
          <select className="input" id="patient_id" name="patient_id" required defaultValue="">
            <option value="" disabled>
              Selecione…
            </option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-pine-900/50">
            Paciente novo?{" "}
            <Link href="/pacientes/novo" className="font-bold text-pine-600 hover:underline">
              Cadastrar
            </Link>
          </p>
        </div>
        <div>
          <label className="label" htmlFor="professional_id">
            Profissional
          </label>
          <select
            className="input"
            id="professional_id"
            name="professional_id"
            required
            defaultValue={professionalId ?? ""}
          >
            <option value="" disabled>
              Selecione…
            </option>
            {professionals.map((prof) => (
              <option key={prof.id} value={prof.id}>
                {prof.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="start_time">
              Horário
            </label>
            <input
              className="input"
              type="time"
              id="start_time"
              name="start_time"
              required
              defaultValue={time ?? "09:00"}
              step={300}
            />
          </div>
          <div>
            <label className="label" htmlFor="duration">
              Duração
            </label>
            <select className="input" id="duration" name="duration" defaultValue="30">
              <option value="15">15 min</option>
              <option value="30">30 min</option>
              <option value="45">45 min</option>
              <option value="60">1 hora</option>
              <option value="90">1h30</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="procedure">
            Procedimento
          </label>
          <input className="input" id="procedure" name="procedure" placeholder="Consulta" defaultValue="Consulta" />
        </div>
        <div>
          <label className="label" htmlFor="price">
            Valor (R$)
          </label>
          <input className="input" id="price" name="price" placeholder="250,00" inputMode="decimal" />
        </div>
        <div>
          <label className="label" htmlFor="notes">
            Observações
          </label>
          <textarea className="input" id="notes" name="notes" rows={2} />
        </div>
        <div className="flex gap-2 pt-1">
          <button type="submit" className="btn btn-primary flex-1">
            Agendar
          </button>
          <Link href={closeHref} className="btn btn-outline">
            Fechar
          </Link>
        </div>
      </form>
    </>
  );
}
```

- [ ] **Step 3: Non-intercepted fallback page**

Create `src/app/(app)/agenda/novo/page.tsx`:

```tsx
import { todayISO } from "@/lib/format";
import { loadNewAppointmentOptions } from "@/components/agenda/new-appointment-data";
import { NewAppointmentForm } from "@/components/agenda/new-appointment-form";

export default async function NewAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; time?: string; prof?: string; erro?: string }>;
}) {
  const params = await searchParams;
  const date = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : todayISO();
  const { professionals, patients } = await loadNewAppointmentOptions();

  return (
    <div className="mx-auto max-w-lg">
      <div className="card p-6">
        <NewAppointmentForm
          date={date}
          time={params.time}
          professionalId={params.prof}
          patients={patients}
          professionals={professionals}
          error={params.erro}
          closeHref={`/agenda?date=${date}`}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Intercepted modal page**

Create `src/app/(app)/@modal/(.)agenda/novo/page.tsx` (note: the folder literally named `(.)agenda` — parentheses and dot are Next.js's intercepting-route syntax, matching the sibling `agenda` segment):

```tsx
import { todayISO } from "@/lib/format";
import { loadNewAppointmentOptions } from "@/components/agenda/new-appointment-data";
import { NewAppointmentForm } from "@/components/agenda/new-appointment-form";
import { Modal } from "@/components/modal";

export default async function NewAppointmentModal({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; time?: string; prof?: string; erro?: string }>;
}) {
  const params = await searchParams;
  const date = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : todayISO();
  const { professionals, patients } = await loadNewAppointmentOptions();

  return (
    <Modal>
      <NewAppointmentForm
        date={date}
        time={params.time}
        professionalId={params.prof}
        patients={patients}
        professionals={professionals}
        error={params.erro}
        closeHref={`/agenda?date=${date}`}
      />
    </Modal>
  );
}
```

- [ ] **Step 5: Update Agenda page links and remove the old inline aside**

In `src/app/(app)/agenda/page.tsx`:

1. Change the header "Agendar" link from `href={`/agenda?date=${date}&novo=1`}` to `href={`/agenda/novo?date=${date}`}`.
2. Change the empty-slot hover link from `href={`/agenda?date=${date}&novo=1&time=${label}&prof=${prof.id}`}` to `href={`/agenda/novo?date=${date}&time=${label}&prof=${prof.id}`}`.
3. Delete the entire `{showForm ? (<aside className="card h-fit p-5">...</aside>) : null}` block and the `showForm` variable/its usage — remove `const showForm = params.novo === "1";` and simplify `<div className={`grid gap-6 ${showForm ? "xl:grid-cols-[1fr_340px]" : ""}`}>` down to `<div className="grid gap-6">` (the calendar grid is now always the sole column; the modal renders as an overlay instead).
4. Remove the now-unused `createAppointmentAction` import from this file (it's only used inside `new-appointment-form.tsx` now) — keep `setAppointmentStatusAction` and the other imports that are still used.

- [ ] **Step 6: Update the Server Action's error redirects**

In `src/lib/actions.ts`, inside `createAppointmentAction`, change:

```ts
  if (!patientId || !professionalId || !startTime) {
    redirect(`/agenda/novo?date=${date}&erro=campos`);
  }
```

and:

```ts
  if (conflict) {
    redirect(`/agenda/novo?date=${date}&erro=conflito`);
  }
```

(Only the redirect target strings change, from `/agenda?date=${date}&novo=1&erro=...` to `/agenda/novo?date=${date}&erro=...`. The success-path `redirect(`/agenda?date=${date}`)` at the end of the function is unchanged.)

- [ ] **Step 7: Verify**

Run `npx tsc --noEmit` and `npm run build` — both must pass. In the dev server:
- From `/agenda`, click "Agendar" (or click an empty slot) — a modal should overlay the current Agenda page (URL becomes `/agenda/novo?...`).
- Press Escape, or click the dark backdrop — modal closes, back to `/agenda`.
- Reopen the modal, submit with no patient selected — the modal should stay open and show the "Preencha paciente..." error inline (not a full page navigation).
- Submit a valid appointment — modal closes and the new appointment appears in the grid.
- Copy the URL `/agenda/novo?date=<today>` and open it directly in a new tab — should render as a normal full page (not an overlay), with the same form, and a working "Fechar" link back to `/agenda`.

- [ ] **Step 8: Commit**

```bash
git add src/components/agenda/new-appointment-data.ts src/components/agenda/new-appointment-form.tsx \
  src/app/\(app\)/agenda/novo/page.tsx "src/app/(app)/@modal/(.)agenda/novo/page.tsx" \
  src/app/\(app\)/agenda/page.tsx src/lib/actions.ts
git commit -m "feat: new-appointment modal via intercepting route"
```

---

### Task 6: Agenda — optimistic status updates

**Files:**
- Create: `src/components/agenda/appointment-status-buttons.tsx`
- Modify: `src/app/(app)/agenda/page.tsx`

**Interfaces:**
- Consumes: `setAppointmentStatusAction` from `@/lib/actions` (unchanged signature), `StatusBadge` from `@/components/ui`, `Alert` from `@/components/alert` (Task 3), `AppointmentStatus` type from `@/lib/db`.
- Produces: `AppointmentStatusButtons({ appointmentId, patientId, status, backUrl }: { appointmentId: number; patientId: number; status: AppointmentStatus; backUrl: string })` — replaces the inline `<StatusBadge>` + quick-action `<form>` buttons previously rendered directly in `agenda/page.tsx`.

- [ ] **Step 1: Write the client component**

Create `src/components/agenda/appointment-status-buttons.tsx`:

```tsx
"use client";

import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { setAppointmentStatusAction } from "@/lib/actions";
import { StatusBadge } from "@/components/ui";
import { Alert } from "@/components/alert";
import type { AppointmentStatus } from "@/lib/db";

const QUICK_ACTIONS: Partial<Record<AppointmentStatus, { status: AppointmentStatus; label: string }[]>> = {
  agendado: [
    { status: "confirmado", label: "Confirmar" },
    { status: "faltou", label: "Faltou" },
    { status: "cancelado", label: "Cancelar" },
  ],
  confirmado: [
    { status: "em_atendimento", label: "Iniciar" },
    { status: "faltou", label: "Faltou" },
    { status: "cancelado", label: "Cancelar" },
  ],
  em_atendimento: [{ status: "concluido", label: "Concluir" }],
};

export function AppointmentStatusButtons({
  appointmentId,
  patientId,
  status,
  backUrl,
}: {
  appointmentId: number;
  patientId: number;
  status: AppointmentStatus;
  backUrl: string;
}) {
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(
    status,
    (_current: AppointmentStatus, next: AppointmentStatus) => next
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function apply(next: AppointmentStatus) {
    setError(null);
    startTransition(async () => {
      setOptimisticStatus(next);
      const formData = new FormData();
      formData.set("id", String(appointmentId));
      formData.set("status", next);
      formData.set("back", backUrl);
      try {
        await setAppointmentStatusAction(formData);
      } catch (err) {
        unstable_rethrow(err);
        setError("Não foi possível atualizar. Tente novamente.");
      }
    });
  }

  const actions = QUICK_ACTIONS[optimisticStatus];

  return (
    <>
      <StatusBadge status={optimisticStatus} />
      {error ? <Alert>{error}</Alert> : null}
      {actions ? (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {optimisticStatus === "em_atendimento" ? (
            <Link
              href={`/pacientes/${patientId}?atender=1#novo-atendimento`}
              className="rounded-md bg-clay-100 px-1.5 py-0.5 text-[11px] font-bold text-clay-800 transition-colors hover:bg-clay-200"
            >
              Abrir prontuário
            </Link>
          ) : null}
          {actions.map((action) => (
            <button
              key={action.status}
              type="button"
              disabled={isPending}
              onClick={() => apply(action.status)}
              className={`cursor-pointer rounded-md px-1.5 py-0.5 text-[11px] font-bold transition-colors disabled:opacity-50 ${
                action.status === "concluido" || action.status === "confirmado" || action.status === "em_atendimento"
                  ? "bg-pine-100 text-pine-800 hover:bg-pine-200"
                  : "bg-stone-100 text-stone-500 hover:bg-rose-100 hover:text-rose-700"
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}
```

- [ ] **Step 2: Use it in the Agenda page**

In `src/app/(app)/agenda/page.tsx`, inside the appointment-card rendering (the `cellAppointments.map((a) => { ... })` block):

1. Remove the top-level module-scope `QUICK_ACTIONS` constant (it now lives in the new component) and the `AppointmentStatus` import if it becomes unused elsewhere in the file (it's still needed for the `searchParams` type? check — if unused after this change, remove it).
2. Change:

```tsx
<div className="flex items-start justify-between gap-2">
  <Link
    href={`/pacientes/${a.patient_id}`}
    className="truncate text-sm font-bold text-pine-950 hover:text-pine-600"
  >
    {a.patient_name}
  </Link>
  <StatusBadge status={a.status} />
</div>
<p className="mt-0.5 text-xs text-pine-900/55">
  {a.start_time}–{a.end_time} · {a.procedure}
  {a.price_cents > 0 ? ` · ${moneyBR(a.price_cents)}` : ""}
</p>
{QUICK_ACTIONS[a.status] ? (
  <div className="mt-1.5 flex flex-wrap gap-1">
    {/* ... old inline buttons ... */}
  </div>
) : null}
```

to:

```tsx
<div className="flex items-start justify-between gap-2">
  <Link
    href={`/pacientes/${a.patient_id}`}
    className="truncate text-sm font-bold text-pine-950 hover:text-pine-600"
  >
    {a.patient_name}
  </Link>
</div>
<p className="mt-0.5 text-xs text-pine-900/55">
  {a.start_time}–{a.end_time} · {a.procedure}
  {a.price_cents > 0 ? ` · ${moneyBR(a.price_cents)}` : ""}
</p>
<AppointmentStatusButtons
  appointmentId={a.id}
  patientId={a.patient_id}
  status={a.status}
  backUrl={backUrl}
/>
```

3. Add the import: `import { AppointmentStatusButtons } from "@/components/agenda/appointment-status-buttons";`
4. Remove the now-unused `StatusBadge` import from this file if it's no longer referenced elsewhere in it (the waitlist section doesn't use it — check before removing).

- [ ] **Step 3: Verify**

Run `npx tsc --noEmit` and `npm run build` — both must pass. In the dev server, on `/agenda` with a few appointments: click "Confirmar" on an `agendado` appointment — the badge and button row should update **immediately** (no page flash), before the network request even resolves on a throttled connection (use browser devtools "Slow 3G" throttling to see the gap clearly). To verify the failure path, temporarily add `throw new Error("test")` at the top of `setAppointmentStatusAction` in `src/lib/actions.ts`, click a status button, confirm the badge reverts and the inline error message appears, then remove the test line.

- [ ] **Step 4: Commit**

```bash
git add src/components/agenda/appointment-status-buttons.tsx src/app/\(app\)/agenda/page.tsx
git commit -m "feat: optimistic appointment status updates"
```

---

### Task 7: Pacientes — "Novo paciente" as an intercepted modal

**Files:**
- Create: `src/components/pacientes/new-patient-form.tsx`
- Create: `src/app/(app)/pacientes/novo/page.tsx`
- Create: `src/app/(app)/@modal/(.)pacientes/novo/page.tsx`
- Modify: `src/app/(app)/pacientes/page.tsx`
- Modify: `src/lib/actions.ts`

**Interfaces:**
- Consumes: `Modal` from `@/components/modal` (Task 3).
- Produces: `NewPatientForm` props: `{ error?: string; closeHref: string }` (no data loader needed — this form has no dependent selects).
- Modifies: `createPatientAction`'s error-path `redirect()` target (was `/pacientes?novo=1&erro=nome"`, becomes `/pacientes/novo?erro=nome`). Success-path redirect is unchanged.

- [ ] **Step 1: Shared form component**

Create `src/components/pacientes/new-patient-form.tsx`:

```tsx
import Link from "next/link";
import { createPatientAction } from "@/lib/actions";

export function NewPatientForm({ error, closeHref }: { error?: string; closeHref: string }) {
  return (
    <>
      <h2 className="font-display text-xl font-semibold text-pine-950">Novo paciente</h2>
      {error === "nome" ? (
        <p className="mt-2 text-sm font-semibold text-rose-700">Informe ao menos o nome.</p>
      ) : null}
      <form action={createPatientAction} className="mt-4 space-y-3">
        <div>
          <label className="label" htmlFor="name">
            Nome completo *
          </label>
          <input className="input" id="name" name="name" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="cpf">
              CPF
            </label>
            <input className="input" id="cpf" name="cpf" placeholder="000.000.000-00" />
          </div>
          <div>
            <label className="label" htmlFor="birth_date">
              Nascimento
            </label>
            <input className="input" type="date" id="birth_date" name="birth_date" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="sex">
              Sexo
            </label>
            <select className="input" id="sex" name="sex" defaultValue="">
              <option value="">—</option>
              <option value="F">Feminino</option>
              <option value="M">Masculino</option>
              <option value="Outro">Outro</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="phone">
              Telefone
            </label>
            <input className="input" id="phone" name="phone" placeholder="(11) 90000-0000" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="email">
            E-mail
          </label>
          <input className="input" type="email" id="email" name="email" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="insurance">
              Convênio
            </label>
            <input className="input" id="insurance" name="insurance" placeholder="Particular" />
          </div>
          <div>
            <label className="label" htmlFor="insurance_number">
              Nº carteirinha
            </label>
            <input className="input" id="insurance_number" name="insurance_number" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="city">
            Cidade
          </label>
          <input className="input" id="city" name="city" />
        </div>
        <div>
          <label className="label" htmlFor="notes">
            Observações
          </label>
          <textarea className="input" id="notes" name="notes" rows={2} />
        </div>
        <div className="flex gap-2 pt-1">
          <button type="submit" className="btn btn-primary flex-1">
            Cadastrar
          </button>
          <Link href={closeHref} className="btn btn-outline">
            Fechar
          </Link>
        </div>
      </form>
    </>
  );
}
```

- [ ] **Step 2: Non-intercepted fallback page**

Create `src/app/(app)/pacientes/novo/page.tsx`:

```tsx
import { NewPatientForm } from "@/components/pacientes/new-patient-form";

export default async function NewPatientPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  return (
    <div className="mx-auto max-w-lg">
      <div className="card p-6">
        <NewPatientForm error={erro} closeHref="/pacientes" />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Intercepted modal page**

Create `src/app/(app)/@modal/(.)pacientes/novo/page.tsx`:

```tsx
import { NewPatientForm } from "@/components/pacientes/new-patient-form";
import { Modal } from "@/components/modal";

export default async function NewPatientModal({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  return (
    <Modal>
      <NewPatientForm error={erro} closeHref="/pacientes" />
    </Modal>
  );
}
```

- [ ] **Step 4: Update Pacientes page link and remove the old inline aside**

In `src/app/(app)/pacientes/page.tsx`:

1. Change `<Link href="/pacientes?novo=1" className="btn btn-primary">` to `<Link href="/pacientes/novo" className="btn btn-primary">`.
2. Delete the `{showForm ? (<aside className="card h-fit p-5">...</aside>) : null}` block, the `showForm` variable, and simplify `<div className={`grid gap-6 ${showForm ? "xl:grid-cols-[1fr_360px]" : ""}`}>` to `<div>` (single column now — Task 8 will touch the search form inside this same `<div>`, so leave that part alone for now).
3. Remove the now-unused `createPatientAction` import from this file.

- [ ] **Step 5: Update the Server Action's error redirect**

In `src/lib/actions.ts`, inside `createPatientAction`, change:

```ts
  if (!name) redirect("/pacientes/novo?erro=nome");
```

(was `redirect("/pacientes?novo=1&erro=nome");`). The success-path redirect to `/pacientes/${row.id}` is unchanged.

- [ ] **Step 6: Verify**

Run `npx tsc --noEmit` and `npm run build` — both must pass. In the dev server: click "Novo paciente" from `/pacientes` — modal overlays the list. Submit with an empty name — modal stays open showing "Informe ao menos o nome." inline. Submit a valid name — modal closes and you land on the new patient's detail page. Open `/pacientes/novo` directly in a new tab — renders as a full page, not an overlay.

- [ ] **Step 7: Commit**

```bash
git add src/components/pacientes/new-patient-form.tsx src/app/\(app\)/pacientes/novo/page.tsx \
  "src/app/(app)/@modal/(.)pacientes/novo/page.tsx" src/app/\(app\)/pacientes/page.tsx src/lib/actions.ts
git commit -m "feat: new-patient modal via intercepting route"
```

---

### Task 8: Pacientes — live search

**Files:**
- Create: `src/components/pacientes/patient-search-input.tsx`
- Modify: `src/app/(app)/pacientes/page.tsx`

**Interfaces:**
- Produces: `PatientSearchInput({ initialQuery }: { initialQuery: string })` — replaces the existing native `<form>` search box.

- [ ] **Step 1: Write the client component**

Create `src/components/pacientes/patient-search-input.tsx`:

```tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { IconSearch } from "@/components/icons";

export function PatientSearchInput({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialQuery);
  const [, startTransition] = useTransition();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function handleChange(next: string) {
    setValue(next);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (next) params.set("q", next);
      else params.delete("q");
      startTransition(() => {
        router.replace(`/pacientes?${params.toString()}`, { scroll: false });
      });
    }, 250);
  }

  return (
    <div className="relative mb-4 max-w-md">
      <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pine-900/40" />
      <input
        className="input pl-9"
        type="search"
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        placeholder="Buscar por nome, CPF ou telefone…"
      />
    </div>
  );
}
```

- [ ] **Step 2: Use it in the Pacientes page**

In `src/app/(app)/pacientes/page.tsx`:

1. Replace:

```tsx
<form className="relative mb-4 max-w-md">
  <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pine-900/40" />
  <input
    className="input pl-9"
    type="search"
    name="q"
    defaultValue={q}
    placeholder="Buscar por nome, CPF ou telefone…"
  />
</form>
```

with:

```tsx
<Suspense fallback={<div className="input mb-4 max-w-md" />}>
  <PatientSearchInput initialQuery={q} />
</Suspense>
```

2. Add imports: `import { Suspense } from "react";` and `import { PatientSearchInput } from "@/components/pacientes/patient-search-input";`.
3. Remove the now-unused `IconSearch` import from this file (it moved into the new client component).

- [ ] **Step 3: Verify**

Run `npx tsc --noEmit` and `npm run build` — both must pass. In the dev server, on `/pacientes`, type a partial patient name — the list should filter after a brief pause (~250ms) without a full page reload (watch the URL bar update with `?q=...` and the browser's loading indicator behave like a soft navigation, not a hard reload). Clear the box — full list returns.

- [ ] **Step 4: Commit**

```bash
git add src/components/pacientes/patient-search-input.tsx src/app/\(app\)/pacientes/page.tsx
git commit -m "feat: live search on Pacientes"
```

---

### Task 9: Financeiro — optimistic "marcar como pago"

**Files:**
- Create: `src/components/financeiro/payment-actions-cell.tsx`
- Modify: `src/app/(app)/financeiro/page.tsx`

**Interfaces:**
- Consumes: `payPaymentAction` from `@/lib/actions` (unchanged signature), `PaymentBadge` from `@/components/ui`, `Alert` from `@/components/alert` (Task 3), `PaymentStatus` type and `PAYMENT_METHOD_LABEL`/`fmtDate` from existing modules.
- Produces: `PaymentActionsCell({ paymentId, status, paidAt, defaultMethod, backUrl }: { paymentId: number; status: PaymentStatus; paidAt: string | null; defaultMethod: string; backUrl: string })` — a component that renders **two** `<td>` elements (situação + ação), replacing both existing cells for a row.

- [ ] **Step 1: Write the client component**

Create `src/components/financeiro/payment-actions-cell.tsx`:

```tsx
"use client";

import { unstable_rethrow } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { payPaymentAction } from "@/lib/actions";
import { PaymentBadge } from "@/components/ui";
import { Alert } from "@/components/alert";
import { fmtDate, PAYMENT_METHOD_LABEL } from "@/lib/format";
import type { PaymentStatus } from "@/lib/db";

interface PaymentState {
  status: PaymentStatus;
  paidAt: string | null;
}

export function PaymentActionsCell({
  paymentId,
  status,
  paidAt,
  defaultMethod,
  backUrl,
}: {
  paymentId: number;
  status: PaymentStatus;
  paidAt: string | null;
  defaultMethod: string;
  backUrl: string;
}) {
  const [optimistic, setOptimistic] = useOptimistic(
    { status, paidAt } as PaymentState,
    (_current: PaymentState, next: PaymentState) => next
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handlePay(formData: FormData) {
    setError(null);
    startTransition(async () => {
      setOptimistic({ status: "pago", paidAt: new Date().toISOString().slice(0, 10) });
      try {
        await payPaymentAction(formData);
      } catch (err) {
        unstable_rethrow(err);
        setError("Não foi possível confirmar o pagamento.");
      }
    });
  }

  return (
    <>
      <td>
        <PaymentBadge status={optimistic.status} />
        {optimistic.status === "pago" && optimistic.paidAt ? (
          <span className="block text-[11px] text-pine-900/45">em {fmtDate(optimistic.paidAt)}</span>
        ) : null}
      </td>
      <td className="text-right">
        {optimistic.status === "pendente" ? (
          <form action={handlePay} className="flex items-center justify-end gap-1.5">
            <input type="hidden" name="id" value={paymentId} />
            <input type="hidden" name="back" value={backUrl} />
            <select name="method" className="input w-auto px-2 py-1 text-xs" defaultValue={defaultMethod}>
              {Object.entries(PAYMENT_METHOD_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <button type="submit" disabled={isPending} className="btn btn-primary px-2.5 py-1 text-xs disabled:opacity-50">
              Receber
            </button>
          </form>
        ) : null}
        {error ? <Alert>{error}</Alert> : null}
      </td>
    </>
  );
}
```

- [ ] **Step 2: Use it in the Financeiro page, and drop the redundant Convênios button**

In `src/app/(app)/financeiro/page.tsx`:

1. In the `PageHeader` `action` prop, remove the `<Link href={`/financeiro/convenios?mes=${month}`} className="btn btn-outline">Convênios</Link>` entry (Convênios is now reachable via the top bar's pill tab, added in Task 2's `nav-config.ts`).
2. Replace the table row's last two cells:

```tsx
<td>
  <PaymentBadge status={payment.status} />
  {payment.status === "pago" && payment.paid_at ? (
    <span className="block text-[11px] text-pine-900/45">em {fmtDate(payment.paid_at)}</span>
  ) : null}
</td>
<td className="text-right">
  {payment.status === "pendente" ? (
    <form action={payPaymentAction} className="flex items-center justify-end gap-1.5">
      <input type="hidden" name="id" value={payment.id} />
      <input type="hidden" name="back" value={backUrl} />
      <select name="method" className="input w-auto px-2 py-1 text-xs" defaultValue={payment.method ?? "pix"}>
        {Object.entries(PAYMENT_METHOD_LABEL).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <button type="submit" className="btn btn-primary px-2.5 py-1 text-xs">
        Receber
      </button>
    </form>
  ) : null}
</td>
```

with:

```tsx
<PaymentActionsCell
  paymentId={payment.id}
  status={payment.status}
  paidAt={payment.paid_at}
  defaultMethod={payment.method ?? "pix"}
  backUrl={backUrl}
/>
```

3. Add the import: `import { PaymentActionsCell } from "@/components/financeiro/payment-actions-cell";`
4. Remove the now-unused `payPaymentAction` and `PaymentBadge` imports from this file if they're no longer referenced elsewhere in it (check first — `PaymentBadge` was only used in the block you just replaced).

- [ ] **Step 3: Verify**

Run `npx tsc --noEmit` and `npm run build` — both must pass. In the dev server, on `/financeiro` with a pending payment: click "Receber" — the badge should flip to "Pago" immediately (before the round trip resolves, visible under network throttling), the Receber form should disappear. Confirm the "Convênios" button is gone from the page header and that the top-bar pill tab still navigates to `/financeiro/convenios`.

- [ ] **Step 4: Commit**

```bash
git add src/components/financeiro/payment-actions-cell.tsx src/app/\(app\)/financeiro/page.tsx
git commit -m "feat: optimistic mark-as-paid on Financeiro"
```

---

### Task 10: Loading skeletons + error boundary

**Files:**
- Create: `src/app/(app)/dashboard/loading.tsx`
- Create: `src/app/(app)/agenda/loading.tsx`
- Create: `src/app/(app)/pacientes/loading.tsx`
- Create: `src/app/(app)/financeiro/loading.tsx`
- Create: `src/app/(app)/error.tsx`

**Interfaces:** None new — these are Next.js file-convention special files (`loading.tsx`, `error.tsx`), auto-wired by the framework to their route segment.

- [ ] **Step 1: Dashboard skeleton**

Create `src/app/(app)/dashboard/loading.tsx`:

```tsx
export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse">
      <div className="mb-6 h-9 w-64 rounded-lg bg-pine-900/10" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card h-24" />
        ))}
      </div>
      <div className="card mt-8 h-64" />
      <div className="card mt-8 h-48" />
    </div>
  );
}
```

- [ ] **Step 2: Agenda skeleton**

Create `src/app/(app)/agenda/loading.tsx`:

```tsx
export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 h-9 w-48 rounded-lg bg-pine-900/10" />
      <div className="card h-[480px]" />
    </div>
  );
}
```

- [ ] **Step 3: Pacientes skeleton**

Create `src/app/(app)/pacientes/loading.tsx`:

```tsx
export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 h-9 w-40 rounded-lg bg-pine-900/10" />
      <div className="mb-4 h-10 w-full max-w-md rounded-full bg-pine-900/10" />
      <div className="card h-96" />
    </div>
  );
}
```

- [ ] **Step 4: Financeiro skeleton**

Create `src/app/(app)/financeiro/loading.tsx`:

```tsx
export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 h-9 w-40 rounded-lg bg-pine-900/10" />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card h-24" />
        ))}
      </div>
      <div className="card mt-6 h-80" />
    </div>
  );
}
```

- [ ] **Step 5: Error boundary**

Create `src/app/(app)/error.tsx`:

```tsx
"use client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="font-display text-2xl font-semibold text-pine-950">Algo deu errado</p>
      <p className="mt-2 max-w-sm text-sm text-pine-900/60">
        Não foi possível carregar esta página. Tente novamente — se o problema continuar, avise a equipe técnica.
      </p>
      <button type="button" onClick={reset} className="btn btn-primary mt-6">
        Tentar novamente
      </button>
    </div>
  );
}
```

(`error` is required by Next.js's `error.tsx` prop contract even though this component doesn't display its message to end users — clinic staff shouldn't see raw stack traces.)

- [ ] **Step 6: Verify**

Run `npx tsc --noEmit` and `npm run build` — both must pass. In the dev server, throttle network to "Slow 3G" in devtools and navigate to `/dashboard`, `/agenda`, `/pacientes`, `/financeiro` — confirm each briefly shows its skeleton (matching that page's rough shape) instead of a blank screen. To test the error boundary, temporarily add `throw new Error("test")` at the top of `DashboardPage` in `src/app/(app)/dashboard/page.tsx`, reload `/dashboard`, confirm the branded "Algo deu errado" screen appears with a working "Tentar novamente" button, then remove the test line.

- [ ] **Step 7: Commit**

```bash
git add src/app/\(app\)/dashboard/loading.tsx src/app/\(app\)/agenda/loading.tsx \
  src/app/\(app\)/pacientes/loading.tsx src/app/\(app\)/financeiro/loading.tsx src/app/\(app\)/error.tsx
git commit -m "feat: loading skeletons and error boundary for app shell"
```

---

### Task 11: Public booking — card-grid date/time selection

**Files:**
- Modify: `src/app/agendar/page.tsx`

**Interfaces:** None new — JSX-only change to two existing conditional sections.

- [ ] **Step 1: Convert the date-picker step to a card grid**

In `src/app/agendar/page.tsx`, replace the step-2 block:

```tsx
<div className="mt-5 flex flex-wrap gap-2">
  {availableDays.map((day) => (
    <Link key={day} href={`/agendar?prof=${professional.id}&date=${day}`} className="btn btn-outline flex-col px-4 py-2">
      <span className="text-[11px] font-bold uppercase text-pine-900/50">
        {WEEKDAY_SHORT[weekdayOf(day)]}
      </span>
      <span>{day.slice(8, 10)}/{day.slice(5, 7)}</span>
    </Link>
  ))}
  {availableDays.length === 0 ? (
    <p className="text-sm text-pine-900/60">
      Este profissional está sem agenda aberta no momento. Tente outro.
    </p>
  ) : null}
</div>
```

with:

```tsx
<div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4">
  {availableDays.map((day) => (
    <Link
      key={day}
      href={`/agendar?prof=${professional.id}&date=${day}`}
      className="card flex flex-col items-center gap-0.5 px-3 py-4 text-center transition-colors hover:border-pine-500"
    >
      <span className="text-[11px] font-bold uppercase text-pine-900/50">
        {WEEKDAY_SHORT[weekdayOf(day)]}
      </span>
      <span className="font-display text-lg font-semibold text-pine-950">
        {day.slice(8, 10)}/{day.slice(5, 7)}
      </span>
    </Link>
  ))}
  {availableDays.length === 0 ? (
    <p className="text-sm text-pine-900/60">
      Este profissional está sem agenda aberta no momento. Tente outro.
    </p>
  ) : null}
</div>
```

- [ ] **Step 2: Convert the time-picker step to a card grid**

Replace the step-3 block:

```tsx
<div className="mt-5 flex flex-wrap gap-2">
  {slots.map((slot) => (
    <Link
      key={slot}
      href={`/agendar?prof=${professional.id}&date=${date}&time=${slot}`}
      className="btn btn-outline min-w-20"
    >
      {slot}
    </Link>
  ))}
  {slots.length === 0 ? (
    <p className="text-sm text-pine-900/60">
      Nenhum horário livre neste dia — escolha outra data.
    </p>
  ) : null}
</div>
```

with:

```tsx
<div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4">
  {slots.map((slot) => (
    <Link
      key={slot}
      href={`/agendar?prof=${professional.id}&date=${date}&time=${slot}`}
      className="card px-3 py-4 text-center font-display text-lg font-semibold text-pine-950 transition-colors hover:border-pine-500"
    >
      {slot}
    </Link>
  ))}
  {slots.length === 0 ? (
    <p className="text-sm text-pine-900/60">
      Nenhum horário livre neste dia — escolha outra data.
    </p>
  ) : null}
</div>
```

- [ ] **Step 3: Verify**

Run `npx tsc --noEmit` and `npm run build` — both must pass. In the dev server, open `/agendar`, pick a professional, confirm the date step shows a grid of rounded tappable day cards (not a wrapped row of pill buttons), pick a date, confirm the time step is the same card-grid treatment. Complete a full booking end-to-end to confirm nothing broke in the flow. Check on a narrow (mobile-width) viewport in devtools — cards should stay comfortably tappable (3-across minimum).

- [ ] **Step 4: Commit**

```bash
git add src/app/agendar/page.tsx
git commit -m "style: card-grid date/time selection on public booking"
```

---

### Task 12: Final manual QA pass

**Files:** None (verification-only task; fix forward in whichever file if something's broken).

**Interfaces:** None.

- [ ] **Step 1: Full build check**

Run `npx tsc --noEmit` and `npm run build` from a clean state — both must succeed with zero errors.

- [ ] **Step 2: Click through every screen**

Using `npm run dev`, log in as `admin@renova.app` / `admin123` and check each item; fix forward and re-check any that fail before considering the task done:

- [ ] Login (`/login`): dark hero panel with Fraunces italic headline still reads well against the neutral-adjacent form panel; submit button is pill-shaped; wrong-credentials error still shows.
- [ ] Dashboard: centered column, stat tiles readable, "Agenda de hoje"/"Pacientes recentes" stacked, "Novo agendamento" opens the modal.
- [ ] Agenda: rail highlights "Agenda", top bar shows "Agenda" label, day navigation works, modal open/close/deep-link/refresh (from Task 5), optimistic status buttons (from Task 6), waitlist add still works via its `<details>` panel (untouched).
- [ ] Pacientes: modal open/close/deep-link/refresh (Task 7), live search filters as you type (Task 8), table still links to patient detail pages.
- [ ] Pacientes detail/resumo pages: visually consistent (neutral surfaces, pill buttons) with no structural changes — spot-check one patient.
- [ ] Print view (`/pacientes/[id]/imprimir/[...]`): confirm it is unchanged from before this redesign (open it and compare against memory/backup — no rail, no top bar, same as pre-redesign).
- [ ] Financeiro: top bar shows "Pagamentos"/"Convênios" pill tabs, switching between them works, optimistic "Receber" (Task 9), Convênios page itself unchanged.
- [ ] Relatórios: renders with the new neutral/pill visual system, no structural change, all existing controls (month nav) still work.
- [ ] Configurações (+ `horarios`, `api` subpages): same — visual-only change, all forms still submit correctly. Confirm "Configurações" only appears in the rail for an admin session (log in as a non-admin role if a seeded one exists, or check `session.role` logic reading the code, to confirm the `adminOnly` filter in `nav-config.ts` works).
- [ ] Public booking (`/agendar`): full flow from professional → date → time → confirm, card-grid steps (Task 11), "Área da clínica" link back to `/login` still works.
- [ ] Every route segment's `loading.tsx` shows briefly under network throttling (Task 10); the `error.tsx` boundary was verified in Task 10's own step and doesn't need re-testing here.
- [ ] Resize the browser to a narrow (mobile) width and spot-check Dashboard, Agenda, Pacientes, and `/agendar` — nothing should overflow horizontally or become unusable (the rail alone is fine at 64px; full-width tables scrolling horizontally inside their `card` wrapper, as they did before this redesign, is acceptable and unchanged).

- [ ] **Step 3: Final commit**

If Step 2 required any fixes, commit them:

```bash
git add -A
git commit -m "fix: address issues found in final redesign QA pass"
```

If no fixes were needed, there is nothing to commit — the task is done once every item in Step 2 is checked off.
