# Memed Digital Prescription Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A doctor logged into Renova can issue a legally signed digital prescription through Memed from the patient's prontuário, and the resulting prescription is recorded in Renova with links to its PDF and its patient-facing page.

**Architecture:** Renova's backend registers each professional as a Memed *prescritor* and fetches that prescriber's short-lived access token on demand (the secret key never reaches the browser). A client component injects Memed's `sinapse-prescricao` script with that token, pushes the patient via `setPaciente`, and opens Memed's fullscreen module. Memed handles drug search, posology and ICP-Brasil signing. When Memed fires `prescricaoImpressa` in the browser, we call a Server Action that fetches the PDF and patient link and stores a row in `memed_prescriptions`. The existing local A4 receituário stays as fallback.

**Tech Stack:** Next.js 15 App Router, TypeScript, postgres.js against Supabase Postgres, Server Actions, `node --test` (built into Node 24, no dependency) for pure-function tests.

**Spec:** `docs/superpowers/specs/2026-08-18-memed-prescricao-design.md` — read it before Task 1. The two facts that shape everything: the prescriber token is **not static**, and Memed has **no webhooks**.

**Scope:** This plan covers Phase 0 (prescriber data) and Phase 1 (prescribe and persist) from the spec. **Phase 2 (reconciliation cron + prescription history screen) is deliberately excluded** and needs its own plan — it depends on Phase 1 running in production long enough to see how often the browser event is lost. Task 11 delivers the manual reconciliation that makes Phase 1 safe to ship without the cron.

## Global Constraints

- **The app's database role has NO DDL privilege in production.** `src/lib/db.ts` only runs `SCHEMA` when tables are missing. Every schema change in this plan ships as a `.sql` file that a human runs via Supabase. Never add DDL to a Server Action.
- **`secret-key` must never appear in client code, client components, or `NEXT_PUBLIC_*` env vars.** Memed's docs are explicit about this.
- **Memed auth is via query params** `api-key` and `secret-key` — not headers.
- **JSON:API request bodies** for prescriber routes: `{"data":{"type":"usuarios","attributes":{…}}}` with headers `Accept: application/vnd.api+json` and `Content-Type: application/json`.
- **Staging base URLs:** API `https://integrations.api.memed.com.br/v1`, script `https://integrations.memed.com.br/modulos/plataforma.sinapse-prescricao/build/sinapse-prescricao.min.js`. Never hardcode — always read from `MEMED_API_URL` / `MEMED_SCRIPT_URL`.
- **Staging is offline 00:00–06:00 on weekdays and all weekend.** Plan browser verification inside business hours.
- **Set env vars with `vercel env add NAME production --value "…"`.** Piping from PowerShell 5.1 injects a UTF-8 BOM and corrupts the value.
- **Inside `src/lib/memed/`, relative imports between modules MUST carry the `.ts` extension**
  (`from "./prescriber.ts"`). Node's ESM resolver does no extension guessing, so an extensionless
  import makes every `.mjs` test that loads the module transitively fail with `ERR_MODULE_NOT_FOUND`.
  `allowImportingTsExtensions: true` is set in `tsconfig.json` for this reason. Imports of modules
  outside this folder (e.g. `import type { Professional } from "../db"`) are type-only and erased,
  so they stay extensionless.
- **Server-action POSTs in verification scripts must be `multipart/form-data` (curl `-F`), not urlencoded.**
  Next 15 emits progressive-enhancement forms with `encType="multipart/form-data"`; an urlencoded POST is
  silently ignored — the server returns 200 with the rendered page and the action never runs, which reads
  as "the action is broken". A recognised action POST answers 303 with a `Location` header.
- **`curl -F` corrupts non-ASCII values in this shell.** A specialty sent as `Clínica Geral` landed in
  Postgres as `Cl\ufffdnica Geral` (`efbfbd`, the replacement char, instead of `c3ad`). Keep verification
  payloads ASCII, or send them from a Node script using `FormData`, which is UTF-8 by construction.
  This matters for Task 9/10, where patient names carry accents.
- **Test prescriber:** `professionals` id **3**, `Dr. Teste Memed`, `active = 0` (kept out of the agenda and
  the public booking portal), CPF `390.533.447-05` (valid check digits), CRM 999999/SP, born 15/05/1985 —
  so `external_id` is `renova-prof-3`. The two real professionals (ids 1 and 2) deliberately have every
  Memed column NULL. Delete row 3 when real prescriber data replaces it.
- **UI copy is pt-BR.** Match the existing tone in `src/app/(app)/configuracoes/page.tsx`.
- **Every task ends with `npx tsc --noEmit` and `npm run build` passing.** This repo has no CI; those two commands are the safety net.
- **Memed's own docs disagree on the module-loaded event name.** The "primeiros passos" page says `core:moduleInit`; the events page lists `moduloCarregado`. Task 8 subscribes to `moduloCarregado` **and** resolves on a short timeout, so it works either way. Do not "simplify" that fallback away without testing both names against staging.
- **Sex vocabulary differs between the two Memed endpoints** — patient `setPaciente` takes `"Feminino"`/`"Masculino"`; prescriber registration takes `"M"`/`"F"`. Do not share one normalizer between them.

---

## File Structure

**Created:**

| Path | Responsibility |
|---|---|
| `migrations/2026-08-18-memed.sql` | DDL for prescriber columns + `memed_prescriptions`. Run by a human via Supabase. |
| `src/lib/memed/board.ts` | Parse free-text `council` ("CRM-SP 123456") into `{code, number, state}`. Pure. |
| `src/lib/memed/board.test.mjs` | Tests for the above. |
| `src/lib/memed/prescriber.ts` | `isMemedReady()` + `toMemedPrescriberPayload()`. Pure. |
| `src/lib/memed/prescriber.test.mjs` | Tests for the above. |
| `src/lib/memed/patient.ts` | `toMemedPatient()` — sex vocabulary + ISO→dd/mm/yyyy. Pure. |
| `src/lib/memed/patient.test.mjs` | Tests for the above. |
| `src/lib/memed/client.ts` | HTTP calls to Memed. Takes an injectable `fetch` so it is testable. |
| `src/lib/memed/client.test.mjs` | Tests with a fake fetch. |
| `src/lib/actions-memed.ts` | Server Actions: token fetch, persist prescription, manual sync. |
| `src/components/memed/prescribe-button.tsx` | Client component: script injection, MdHub events, module open. |

**Modified:**

| Path | Change |
|---|---|
| `package.json` | Add `"test"` script. |
| `src/lib/db.ts` | Mirror the migration in `SCHEMA` (fresh installs) + extend `Professional`, add `MemedPrescription` type. |
| `src/app/(app)/configuracoes/page.tsx` | Prescriber identity fields per professional. |
| `src/lib/actions.ts` | Extend `createProfessionalAction` / add `updateProfessionalMemedAction`. |
| `src/app/(app)/pacientes/[id]/page.tsx` | "Prescrever" button + Memed prescriptions in the timeline. |

---

### Task 1: Migration and schema types

**Files:**
- Create: `migrations/2026-08-18-memed.sql`
- Modify: `src/lib/db.ts` (the `SCHEMA` template string, and the `Professional` interface)

**Interfaces:**
- Consumes: nothing.
- Produces: columns `professionals.cpf`, `.board_code`, `.board_number`, `.board_state`, `.birth_date`, `.memed_external_id`; table `memed_prescriptions`; TS types `Professional` (extended) and `MemedPrescription`.

- [ ] **Step 1: Write the migration file**

Create `migrations/2026-08-18-memed.sql`:

```sql
-- Memed digital prescription — Phase 0 schema.
-- Run via Supabase SQL editor. The app role has no DDL privilege.

ALTER TABLE professionals ADD COLUMN IF NOT EXISTS cpf text;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS board_code text;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS board_number text;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS board_state text;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS birth_date text;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS memed_external_id text;

CREATE TABLE IF NOT EXISTS memed_prescriptions (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  encounter_id bigint REFERENCES encounters(id),
  patient_id bigint NOT NULL REFERENCES patients(id),
  professional_id bigint NOT NULL REFERENCES professionals(id),
  memed_prescription_id text NOT NULL UNIQUE,
  patient_link text,
  pdf_url text,
  status text NOT NULL DEFAULT 'emitida' CHECK (status IN ('emitida','excluida')),
  created_at text NOT NULL DEFAULT to_char(timezone('America/Sao_Paulo', now()), 'YYYY-MM-DD HH24:MI:SS')
);

CREATE INDEX IF NOT EXISTS idx_memed_presc_patient ON memed_prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_memed_presc_encounter ON memed_prescriptions(encounter_id);

GRANT SELECT, INSERT, UPDATE ON memed_prescriptions TO renova_app;
GRANT USAGE, SELECT ON SEQUENCE memed_prescriptions_id_seq TO renova_app;
```

- [ ] **Step 2: Mirror it in `SCHEMA` so fresh installs match**

In `src/lib/db.ts`, inside the `SCHEMA` template string, add the six columns to the `CREATE TABLE IF NOT EXISTS professionals (…)` block (`cpf text`, `board_code text`, `board_number text`, `board_state text`, `birth_date text`, `memed_external_id text`) and append the `CREATE TABLE IF NOT EXISTS memed_prescriptions (…)` statement plus both indexes, copied verbatim from Step 1 minus the two `GRANT` lines (a fresh install runs as owner).

- [ ] **Step 3: Extend the TypeScript types**

In `src/lib/db.ts`, add to `interface Professional`:

```ts
  cpf: string | null;
  board_code: string | null;
  board_number: string | null;
  board_state: string | null;
  birth_date: string | null;
  memed_external_id: string | null;
```

And add:

```ts
export interface MemedPrescription {
  id: number;
  encounter_id: number | null;
  patient_id: number;
  professional_id: number;
  memed_prescription_id: string;
  patient_link: string | null;
  pdf_url: string | null;
  status: "emitida" | "excluida";
  created_at: string;
}
```

- [ ] **Step 4: Verify types compile**

Run: `npx tsc --noEmit`
Expected: exit 0. (Nothing reads the new fields yet, so nothing else should break.)

- [ ] **Step 5: STOP — hand the migration to a human**

The app cannot run this DDL. Tell the user:

> "`migrations/2026-08-18-memed.sql` is ready. Run it in the Supabase SQL editor for project `renova`, then tell me. Everything after this task fails without it."

Write this verification script and run it after they confirm — do not proceed on their word alone:

```js
// data/check-migration.mjs  (data/ is gitignored)
import fs from "node:fs";
import postgres from "postgres";
const url = fs.readFileSync(".env.local","utf8").match(/DATABASE_URL=(.+)/)[1].trim().replace(/^["']|["']$/g,"");
const sql = postgres(url,{max:1});
try {
  const cols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name='professionals'
      AND column_name IN ('cpf','board_code','board_number','board_state','birth_date','memed_external_id')`;
  const tbl = await sql`SELECT to_regclass('public.memed_prescriptions') IS NOT NULL AS present`;
  console.log("colunas novas:", cols.length, "de 6");
  console.log("tabela memed_prescriptions:", tbl[0].present);
  console.log(cols.length === 6 && tbl[0].present ? "OK" : "MIGRAÇÃO INCOMPLETA");
} finally { await sql.end(); }
```

Run: `node data/check-migration.mjs`
Expected: `colunas novas: 6 de 6`, `tabela memed_prescriptions: true`, `OK`. Then `rm data/check-migration.mjs`.

- [ ] **Step 6: Commit**

```bash
git add migrations/2026-08-18-memed.sql src/lib/db.ts
git commit -m "feat(memed): schema for prescriber identity and prescriptions"
```

---

### Task 2: Parse the free-text council field

**Files:**
- Create: `src/lib/memed/board.ts`, `src/lib/memed/board.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: nothing.
- Produces: `parseCouncil(council: string): { code: string; number: string; state: string } | null` — used to pre-fill the new board fields from the existing `professionals.council` text so admins don't retype what we already have.

- [ ] **Step 1: Add the test script to `package.json`**

In `"scripts"`, add:

```json
    "test": "node --test \"src/**/*.test.mjs\""
```

Node 24 strips TypeScript types natively, so `.test.mjs` files can import `.ts` sources directly with no build step and no new dependency. You will see a `MODULE_TYPELESS_PACKAGE_JSON` warning on each run — it is harmless; do **not** add `"type": "module"` to `package.json` to silence it, because that changes module resolution for the whole Next.js app.

- [ ] **Step 2: Write the failing test**

Create `src/lib/memed/board.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCouncil } from "./board.ts";

test("parses the common hyphenated form", () => {
  assert.deepEqual(parseCouncil("CRM-SP 123456"), { code: "CRM", number: "123456", state: "SP" });
});

test("parses without a separator", () => {
  assert.deepEqual(parseCouncil("CRO SP 98765"), { code: "CRO", number: "98765", state: "SP" });
});

test("parses with a slash and no space", () => {
  assert.deepEqual(parseCouncil("CRM/RJ 4321"), { code: "CRM", number: "4321", state: "RJ" });
});

test("uppercases lowercase input", () => {
  assert.deepEqual(parseCouncil("crm-mg 777"), { code: "CRM", number: "777", state: "MG" });
});

test("returns null for text it cannot understand", () => {
  assert.equal(parseCouncil("registro pendente"), null);
  assert.equal(parseCouncil(""), null);
});

test("returns null when the state is missing", () => {
  assert.equal(parseCouncil("CRM 123456"), null);
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `./board.ts`.

- [ ] **Step 4: Write the implementation**

Create `src/lib/memed/board.ts`:

```ts
/** Conselhos aceitos pela Memed no campo board_code. */
export const BOARD_CODES = [
  "CRM", "CRO", "COREN", "CRMV", "CRF", "CRN", "CREFITO", "CRP", "CRFA", "CREF",
] as const;

/**
 * Extrai conselho, número e UF do campo `professionals.council`, que é texto
 * livre ("CRM-SP 123456"). Serve só para pré-preencher os campos novos — o
 * admin confirma. Retorna null quando não dá para ter certeza, porque um
 * palpite errado aqui vira registro errado numa receita assinada.
 */
export function parseCouncil(council: string): { code: string; number: string; state: string } | null {
  const match = council.trim().match(/^([A-Za-z]{3,7})\s*[-/]?\s*([A-Za-z]{2})\s+(\d+)$/);
  if (!match) return null;

  const code = match[1].toUpperCase();
  if (!BOARD_CODES.includes(code as (typeof BOARD_CODES)[number])) return null;

  return { code, number: match[3], state: match[2].toUpperCase() };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test`
Expected: 6 tests pass, 0 fail.

- [ ] **Step 6: Typecheck and commit**

```bash
npx tsc --noEmit
git add package.json src/lib/memed/board.ts src/lib/memed/board.test.mjs
git commit -m "feat(memed): parse free-text council into structured board fields"
```

---

### Task 3: Prescriber readiness and payload

**Files:**
- Create: `src/lib/memed/prescriber.ts`, `src/lib/memed/prescriber.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `memedExternalId(professionalId: number): string` → `"renova-prof-<id>"`
  - `missingMemedFields(p: Professional): string[]` → human-readable pt-BR labels of what is missing; empty array means ready
  - `toMemedPrescriberPayload(p: Professional): object` → the JSON:API body for `POST /sinapse-prescricao/usuarios`

- [ ] **Step 1: Write the failing test**

Create `src/lib/memed/prescriber.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { memedExternalId, missingMemedFields, toMemedPrescriberPayload } from "./prescriber.ts";

const complete = {
  id: 7,
  name: "Marina Costa Silva",
  specialty: "Clínica Geral",
  council: "CRM-SP 123456",
  cpf: "39053344705",
  board_code: "CRM",
  board_number: "123456",
  board_state: "SP",
  birth_date: "1985-05-15",
};

test("external id is stable and prefixed", () => {
  assert.equal(memedExternalId(7), "renova-prof-7");
});

test("a complete professional is missing nothing", () => {
  assert.deepEqual(missingMemedFields(complete), []);
});

test("reports each missing field in pt-BR", () => {
  const missing = missingMemedFields({ ...complete, cpf: null, board_state: "" });
  assert.deepEqual(missing, ["CPF", "UF do conselho"]);
});

test("payload uses JSON:API shape with usuarios type", () => {
  const body = toMemedPrescriberPayload(complete);
  assert.equal(body.data.type, "usuarios");
  assert.equal(body.data.attributes.external_id, "renova-prof-7");
});

test("splits the name into first name and the rest", () => {
  const attrs = toMemedPrescriberPayload(complete).data.attributes;
  assert.equal(attrs.nome, "Marina");
  assert.equal(attrs.sobrenome, "Costa Silva");
});

test("a single-word name still yields a non-empty sobrenome", () => {
  const attrs = toMemedPrescriberPayload({ ...complete, name: "Marina" }).data.attributes;
  assert.equal(attrs.nome, "Marina");
  assert.equal(attrs.sobrenome, "Marina");
});

test("strips punctuation from cpf and board number", () => {
  const attrs = toMemedPrescriberPayload({
    ...complete, cpf: "390.533.447-05", board_number: "12.34-56",
  }).data.attributes;
  assert.equal(attrs.cpf, "39053344705");
  assert.equal(attrs.board_number, "123456");
});

test("converts birth date from ISO to dd/mm/YYYY", () => {
  const attrs = toMemedPrescriberPayload(complete).data.attributes;
  assert.equal(attrs.data_nascimento, "15/05/1985");
});

test("throws rather than sending an incomplete prescriber", () => {
  assert.throws(() => toMemedPrescriberPayload({ ...complete, cpf: null }), /CPF/);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `./prescriber.ts`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/memed/prescriber.ts`:

```ts
import type { Professional } from "../db";

export function memedExternalId(professionalId: number): string {
  return `renova-prof-${professionalId}`;
}

const REQUIRED: { key: keyof Professional; label: string }[] = [
  { key: "cpf", label: "CPF" },
  { key: "board_code", label: "conselho" },
  { key: "board_number", label: "número do conselho" },
  { key: "board_state", label: "UF do conselho" },
  { key: "birth_date", label: "data de nascimento" },
];

/** Campos que a Memed exige e que ainda faltam. Vazio = pronto para prescrever. */
export function missingMemedFields(professional: Professional): string[] {
  return REQUIRED.filter(({ key }) => {
    const value = professional[key];
    return value === null || value === undefined || String(value).trim() === "";
  }).map(({ label }) => label);
}

const digits = (value: string) => value.replace(/\D/g, "");

/** ISO (YYYY-MM-DD) → dd/mm/YYYY, o formato que a Memed espera. */
function toBrDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

export function toMemedPrescriberPayload(professional: Professional) {
  const missing = missingMemedFields(professional);
  if (missing.length > 0) {
    // Falhar aqui, não na Memed: erro deles volta genérico e sem dizer o campo.
    throw new Error(`Profissional sem dados obrigatórios da Memed: ${missing.join(", ")}`);
  }

  const parts = professional.name.trim().split(/\s+/);
  const nome = parts[0];
  // A Memed exige sobrenome; nome de uma palavra repete o próprio nome.
  const sobrenome = parts.length > 1 ? parts.slice(1).join(" ") : parts[0];

  return {
    data: {
      type: "usuarios",
      attributes: {
        external_id: memedExternalId(professional.id),
        nome,
        sobrenome,
        cpf: digits(professional.cpf as string),
        board_code: (professional.board_code as string).toUpperCase(),
        board_number: digits(professional.board_number as string),
        board_state: (professional.board_state as string).toUpperCase(),
        data_nascimento: toBrDate(professional.birth_date as string),
      },
    },
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test`
Expected: all tests pass (Task 2's 6 plus these 9).

- [ ] **Step 5: Typecheck and commit**

```bash
npx tsc --noEmit
git add src/lib/memed/prescriber.ts src/lib/memed/prescriber.test.mjs
git commit -m "feat(memed): prescriber readiness check and JSON:API payload"
```

---

### Task 4: Patient payload for setPaciente

**Files:**
- Create: `src/lib/memed/patient.ts`, `src/lib/memed/patient.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `toMemedPatient(patient: Patient): { idExterno: string; nome: string; cpf?: string; data_nascimento?: string; sexo?: "Feminino" | "Masculino" }`

⚠ This endpoint's sex vocabulary is `"Feminino"`/`"Masculino"` — **different from** the prescriber API's `"M"`/`"F"`. Do not reuse Task 3's helpers.

- [ ] **Step 1: Write the failing test**

Create `src/lib/memed/patient.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { toMemedPatient } from "./patient.ts";

const base = { id: 42, name: "Ana Beatriz Souza", cpf: "412.658.790-01", birth_date: "1988-03-02", sex: "F" };

test("maps the core fields", () => {
  const p = toMemedPatient(base);
  assert.equal(p.idExterno, "renova-pac-42");
  assert.equal(p.nome, "Ana Beatriz Souza");
  assert.equal(p.cpf, "41265879001");
  assert.equal(p.data_nascimento, "02/03/1988");
});

test("expands single-letter sex to Memed's vocabulary", () => {
  assert.equal(toMemedPatient({ ...base, sex: "F" }).sexo, "Feminino");
  assert.equal(toMemedPatient({ ...base, sex: "M" }).sexo, "Masculino");
});

test("accepts already-spelled and lowercase values", () => {
  assert.equal(toMemedPatient({ ...base, sex: "feminino" }).sexo, "Feminino");
  assert.equal(toMemedPatient({ ...base, sex: "MASCULINO" }).sexo, "Masculino");
});

test("omits sexo entirely when unknown rather than guessing", () => {
  assert.equal("sexo" in toMemedPatient({ ...base, sex: null }), false);
  assert.equal("sexo" in toMemedPatient({ ...base, sex: "outro" }), false);
});

test("omits cpf and birth date when absent instead of sending empty strings", () => {
  const p = toMemedPatient({ ...base, cpf: null, birth_date: null });
  assert.equal("cpf" in p, false);
  assert.equal("data_nascimento" in p, false);
  assert.equal(p.nome, "Ana Beatriz Souza");
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `./patient.ts`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/memed/patient.ts`:

```ts
import type { Patient } from "../db";

export interface MemedPatient {
  idExterno: string;
  nome: string;
  cpf?: string;
  data_nascimento?: string;
  sexo?: "Feminino" | "Masculino";
}

/**
 * `patients.sex` é texto livre no banco (sem CHECK), então normalizamos aqui.
 * Vocabulário desta rota é "Feminino"/"Masculino" — diferente do cadastro de
 * prescritor, que usa "M"/"F". Valor desconhecido é omitido: a Memed deixa o
 * campo em branco e o médico corrige, o que é melhor que chutar sexo.
 */
function normalizeSex(sex: string | null): "Feminino" | "Masculino" | undefined {
  const value = (sex ?? "").trim().toUpperCase();
  if (value === "F" || value === "FEMININO") return "Feminino";
  if (value === "M" || value === "MASCULINO") return "Masculino";
  return undefined;
}

function toBrDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

export function toMemedPatient(patient: Patient): MemedPatient {
  const result: MemedPatient = {
    idExterno: `renova-pac-${patient.id}`,
    nome: patient.name,
  };

  const cpf = (patient.cpf ?? "").replace(/\D/g, "");
  if (cpf) result.cpf = cpf;
  if (patient.birth_date) result.data_nascimento = toBrDate(patient.birth_date);

  const sexo = normalizeSex(patient.sex);
  if (sexo) result.sexo = sexo;

  return result;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test`
Expected: all pass.

- [ ] **Step 5: Typecheck and commit**

```bash
npx tsc --noEmit
git add src/lib/memed/patient.ts src/lib/memed/patient.test.mjs
git commit -m "feat(memed): patient payload mapping for setPaciente"
```

---

### Task 5: Memed HTTP client

**Files:**
- Create: `src/lib/memed/client.ts`, `src/lib/memed/client.test.mjs`

**Interfaces:**
- Consumes: `memedExternalId`, `toMemedPrescriberPayload` (Task 3).
- Produces:
  - `memedConfig(): { apiUrl: string; scriptUrl: string; apiKey: string; secretKey: string } | null` — `null` when env is unset, which is how the UI stays hidden
  - `getOrCreatePrescriberToken(professional: Professional, deps?: { fetch?: typeof fetch }): Promise<string>`
  - `getPrescriptionLinks(prescriptionId: string, token: string, deps?): Promise<{ pdfUrl: string | null; patientLink: string | null }>`
  - `listPrescriptions(token: string, deps?): Promise<{ id: string; created_at: string | null }[]>`

The `deps` parameter exists so tests inject a fake `fetch`. Never call the network in a test.

- [ ] **Step 1: Write the failing test**

Create `src/lib/memed/client.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { getOrCreatePrescriberToken, getPrescriptionLinks } from "./client.ts";

const professional = {
  id: 7, name: "Marina Costa", specialty: "Clínica Geral", council: "CRM-SP 123456",
  cpf: "39053344705", board_code: "CRM", board_number: "123456", board_state: "SP",
  birth_date: "1985-05-15",
};

const env = {
  apiUrl: "https://api.test/v1", scriptUrl: "https://script.test/x.js",
  apiKey: "AK", secretKey: "SK",
};

function fakeFetch(routes) {
  const calls = [];
  const fn = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method ?? "GET" });
    for (const [pattern, response] of routes) {
      if (String(url).includes(pattern) && (init.method ?? "GET") === response.method) {
        return { ok: response.status < 400, status: response.status, json: async () => response.body };
      }
    }
    throw new Error(`fake fetch: no route for ${init.method ?? "GET"} ${url}`);
  };
  return { fn, calls };
}

test("returns the token of an existing prescriber without creating one", async () => {
  const { fn, calls } = fakeFetch([
    ["/sinapse-prescricao/usuarios/renova-prof-7", { method: "GET", status: 200, body: { data: { attributes: { token: "TOK-EXIST" } } } }],
  ]);
  const token = await getOrCreatePrescriberToken(professional, { fetch: fn, config: env });
  assert.equal(token, "TOK-EXIST");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, "GET");
});

test("registers the prescriber when not found, then uses that token", async () => {
  const { fn, calls } = fakeFetch([
    ["/sinapse-prescricao/usuarios/renova-prof-7", { method: "GET", status: 404, body: {} }],
    ["/sinapse-prescricao/usuarios?", { method: "POST", status: 200, body: { data: { attributes: { token: "TOK-NEW" } } } }],
  ]);
  const token = await getOrCreatePrescriberToken(professional, { fetch: fn, config: env });
  assert.equal(token, "TOK-NEW");
  assert.equal(calls.length, 2);
  assert.equal(calls[1].method, "POST");
});

test("sends credentials as query params, never as a body or header", async () => {
  const { fn, calls } = fakeFetch([
    ["/sinapse-prescricao/usuarios/renova-prof-7", { method: "GET", status: 200, body: { data: { attributes: { token: "T" } } } }],
  ]);
  await getOrCreatePrescriberToken(professional, { fetch: fn, config: env });
  assert.match(calls[0].url, /api-key=AK/);
  assert.match(calls[0].url, /secret-key=SK/);
});

test("throws a clear error when Memed fails, so the UI can say something useful", async () => {
  const { fn } = fakeFetch([
    ["/sinapse-prescricao/usuarios/renova-prof-7", { method: "GET", status: 500, body: {} }],
  ]);
  await assert.rejects(
    () => getOrCreatePrescriberToken(professional, { fetch: fn, config: env }),
    /Memed/
  );
});

test("collects pdf and patient link, tolerating one of them failing", async () => {
  const { fn } = fakeFetch([
    ["/url-document/full", { method: "GET", status: 200, body: { data: { attributes: { url: "https://pdf" } } } }],
    ["/get-digital-prescription-link", { method: "GET", status: 500, body: {} }],
  ]);
  const links = await getPrescriptionLinks("999", "TOK", { fetch: fn, config: env });
  assert.equal(links.pdfUrl, "https://pdf");
  assert.equal(links.patientLink, null);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `./client.ts`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/memed/client.ts`:

```ts
import type { Professional } from "../db";
import { memedExternalId, toMemedPrescriberPayload } from "./prescriber";

export interface MemedConfig {
  apiUrl: string;
  scriptUrl: string;
  apiKey: string;
  secretKey: string;
}

interface Deps {
  fetch?: typeof fetch;
  config?: MemedConfig;
}

/** null quando o ambiente não está configurado — é assim que a UI se esconde. */
export function memedConfig(): MemedConfig | null {
  const apiUrl = process.env.MEMED_API_URL;
  const scriptUrl = process.env.MEMED_SCRIPT_URL;
  const apiKey = process.env.MEMED_API_KEY;
  const secretKey = process.env.MEMED_SECRET_KEY;
  if (!apiUrl || !scriptUrl || !apiKey || !secretKey) return null;
  return { apiUrl, scriptUrl, apiKey, secretKey };
}

function resolve(deps: Deps): { doFetch: typeof fetch; config: MemedConfig } {
  const config = deps.config ?? memedConfig();
  if (!config) throw new Error("Memed não configurada (MEMED_* ausentes).");
  return { doFetch: deps.fetch ?? fetch, config };
}

/** Credenciais vão como query param — é o que a Memed especifica. */
function withCredentials(base: string, config: MemedConfig): string {
  const joiner = base.includes("?") ? "&" : "?";
  return `${base}${joiner}api-key=${encodeURIComponent(config.apiKey)}&secret-key=${encodeURIComponent(config.secretKey)}`;
}

const JSON_API_HEADERS = {
  Accept: "application/vnd.api+json",
  "Content-Type": "application/json",
};

/**
 * O token do prescritor NÃO é estático — a doc manda buscar o mais recente a
 * cada uso. Então: sempre GET primeiro; só registra se não existir.
 */
export async function getOrCreatePrescriberToken(
  professional: Professional,
  deps: Deps = {}
): Promise<string> {
  const { doFetch, config } = resolve(deps);
  const externalId = memedExternalId(professional.id);

  const getUrl = withCredentials(
    `${config.apiUrl}/sinapse-prescricao/usuarios/${encodeURIComponent(externalId)}`,
    config
  );
  const existing = await doFetch(getUrl, { headers: JSON_API_HEADERS });

  if (existing.ok) {
    const body = await existing.json();
    const token = body?.data?.attributes?.token;
    if (token) return token as string;
    throw new Error("Memed devolveu prescritor sem token.");
  }

  if (existing.status !== 404) {
    throw new Error(`Memed falhou ao buscar prescritor (HTTP ${existing.status}).`);
  }

  const created = await doFetch(withCredentials(`${config.apiUrl}/sinapse-prescricao/usuarios`, config), {
    method: "POST",
    headers: JSON_API_HEADERS,
    body: JSON.stringify(toMemedPrescriberPayload(professional)),
  });
  if (!created.ok) {
    throw new Error(`Memed falhou ao registrar prescritor (HTTP ${created.status}).`);
  }
  const body = await created.json();
  const token = body?.data?.attributes?.token;
  if (!token) throw new Error("Memed registrou o prescritor mas não devolveu token.");
  return token as string;
}

async function tryJson(doFetch: typeof fetch, url: string): Promise<Record<string, unknown> | null> {
  try {
    const response = await doFetch(url, { headers: JSON_API_HEADERS });
    if (!response.ok) return null;
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * PDF e link do paciente são buscas independentes: uma pode falhar sem
 * derrubar a outra. Melhor gravar a receita com um link só do que perder a
 * referência inteira.
 */
export async function getPrescriptionLinks(
  prescriptionId: string,
  token: string,
  deps: Deps = {}
): Promise<{ pdfUrl: string | null; patientLink: string | null }> {
  const { doFetch, config } = resolve(deps);
  const query = `token=${encodeURIComponent(token)}`;

  const pdf = await tryJson(doFetch, `${config.apiUrl}/prescricoes/${prescriptionId}/url-document/full?${query}`);
  const link = await tryJson(doFetch, `${config.apiUrl}/prescricoes/${prescriptionId}/get-digital-prescription-link?${query}`);

  const pick = (body: Record<string, unknown> | null): string | null => {
    if (!body) return null;
    const data = body.data as { attributes?: Record<string, unknown> } | undefined;
    const attributes = data?.attributes ?? {};
    const value = attributes.url ?? attributes.link ?? body.url ?? body.link;
    return typeof value === "string" ? value : null;
  };

  return { pdfUrl: pick(pdf), patientLink: pick(link) };
}

/** Usado pela reconciliação manual (Task 11). */
export async function listPrescriptions(
  token: string,
  deps: Deps = {}
): Promise<{ id: string; created_at: string | null }[]> {
  const { doFetch, config } = resolve(deps);
  const response = await doFetch(`${config.apiUrl}/prescricoes?token=${encodeURIComponent(token)}`, {
    headers: JSON_API_HEADERS,
  });
  if (!response.ok) throw new Error(`Memed falhou ao listar receitas (HTTP ${response.status}).`);
  const body = await response.json();
  const rows = Array.isArray(body?.data) ? body.data : [];
  return rows.map((row: { id?: string; attributes?: { created_at?: string } }) => ({
    id: String(row.id ?? ""),
    created_at: row.attributes?.created_at ?? null,
  }));
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test`
Expected: all pass, including the five new client tests.

- [ ] **Step 5: Typecheck and commit**

```bash
npx tsc --noEmit
git add src/lib/memed/client.ts src/lib/memed/client.test.mjs
git commit -m "feat(memed): API client with injectable fetch"
```

---

### Task 6: Prescriber identity UI in Configurações

**Files:**
- Modify: `src/app/(app)/configuracoes/page.tsx`, `src/lib/actions.ts`

**Interfaces:**
- Consumes: `parseCouncil` (Task 2), `missingMemedFields` (Task 3).
- Produces: Server Action `updateProfessionalMemedAction(formData)` reading `id`, `cpf`, `board_code`, `board_number`, `board_state`, `birth_date`.

- [ ] **Step 1: Add the Server Action**

In `src/lib/actions.ts`, after `toggleProfessionalAction`:

```ts
export async function updateProfessionalMemedAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  if (session.role !== "admin") redirect("/configuracoes");

  const id = Number(str(formData, "id"));
  if (!id) redirect("/configuracoes");

  const cpf = str(formData, "cpf").replace(/\D/g, "");
  const boardNumber = str(formData, "board_number").replace(/\D/g, "");
  const boardCode = str(formData, "board_code").toUpperCase();
  const boardState = str(formData, "board_state").toUpperCase();
  const birthDate = str(formData, "birth_date");

  if (cpf && cpf.length !== 11) redirect("/configuracoes?erro=cpf_prof");

  await sql`
    UPDATE professionals SET
      cpf = ${cpf || null},
      board_code = ${boardCode || null},
      board_number = ${boardNumber || null},
      board_state = ${boardState || null},
      birth_date = ${birthDate || null}
    WHERE id = ${id}`;
  revalidatePath("/", "layout");
  redirect("/configuracoes?ok=prescritor");
}
```

- [ ] **Step 2: Add the form to the professionals list**

In `src/app/(app)/configuracoes/page.tsx`, import `updateProfessionalMemedAction` from `@/lib/actions`, `parseCouncil` from `@/lib/memed/board`, and `missingMemedFields` from `@/lib/memed/prescriber`. Inside the professionals `.map()`, after the existing activate/deactivate form, add a `<details>` panel per professional:

```tsx
<details className="mt-1">
  <summary className="cursor-pointer text-[11px] font-bold text-pine-700">
    Dados para prescrição digital
    {missingMemedFields(prof).length > 0 ? (
      <span className="ml-1 chip bg-clay-100 text-clay-800">incompleto</span>
    ) : (
      <span className="ml-1 chip bg-pine-100 text-pine-800">pronto</span>
    )}
  </summary>
  <form action={updateProfessionalMemedAction} className="mt-2 grid gap-2 sm:grid-cols-2">
    <input type="hidden" name="id" value={prof.id} />
    <div>
      <label className="label" htmlFor={`cpf-${prof.id}`}>CPF</label>
      <input className="input" id={`cpf-${prof.id}`} name="cpf" defaultValue={prof.cpf ?? ""} inputMode="numeric" />
    </div>
    <div>
      <label className="label" htmlFor={`nasc-${prof.id}`}>Nascimento</label>
      <input className="input" type="date" id={`nasc-${prof.id}`} name="birth_date" defaultValue={prof.birth_date ?? ""} />
    </div>
    <div>
      <label className="label" htmlFor={`bc-${prof.id}`}>Conselho</label>
      <input className="input" id={`bc-${prof.id}`} name="board_code"
        defaultValue={prof.board_code ?? parseCouncil(prof.council)?.code ?? ""} placeholder="CRM" />
    </div>
    <div>
      <label className="label" htmlFor={`bs-${prof.id}`}>UF</label>
      <input className="input" id={`bs-${prof.id}`} name="board_state" maxLength={2}
        defaultValue={prof.board_state ?? parseCouncil(prof.council)?.state ?? ""} placeholder="SP" />
    </div>
    <div className="sm:col-span-2">
      <label className="label" htmlFor={`bn-${prof.id}`}>Número do conselho</label>
      <input className="input" id={`bn-${prof.id}`} name="board_number"
        defaultValue={prof.board_number ?? parseCouncil(prof.council)?.number ?? ""} inputMode="numeric" />
    </div>
    <div className="sm:col-span-2">
      <button type="submit" className="btn btn-primary w-full py-1 text-xs">Salvar dados de prescrição</button>
    </div>
  </form>
</details>
```

- [ ] **Step 3: Add the two new messages**

In the same file's `ok`/`erro` blocks, add `ok === "prescritor"` → `"Dados de prescrição salvos."` and `erro === "cpf_prof"` → `"CPF do profissional deve ter 11 dígitos."`, following the existing ternary chain style.

- [ ] **Step 4: Verify it renders and saves**

```bash
npx tsc --noEmit && npm run build
npx next start -p 3050 &
```

Mint an admin cookie (the local HMAC secret is in `data/secret.key`) and assert the panel is present:

```bash
COOKIE=$(node -e '
const crypto=require("crypto"),fs=require("fs");
const s=fs.readFileSync("data/secret.key","utf8").trim();
const p=Buffer.from(JSON.stringify({userId:1,name:"Admin",role:"admin",professionalId:null})).toString("base64url");
console.log("renova_session="+p+"."+crypto.createHmac("sha256",s).update(p).digest("base64url"));')
curl -s -H "cookie: $COOKIE" http://localhost:3050/configuracoes | grep -c "Dados para prescrição digital"
```

Expected: at least `2` (one panel per seeded professional). Then fill the fields in a browser for one professional and confirm the chip flips from `incompleto` to `pronto`.

Kill the server when done — on Windows the child survives a plain kill, so use:
`powershell -Command "Get-NetTCPConnection -LocalPort 3050 -State Listen | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force }"`

- [ ] **Step 5: Commit**

```bash
git add src/app/(app)/configuracoes/page.tsx src/lib/actions.ts
git commit -m "feat(memed): capture prescriber identity in Configurações"
```

---

### Task 7: Server Actions for token and persistence

**Files:**
- Create: `src/lib/actions-memed.ts`

**Interfaces:**
- Consumes: `getOrCreatePrescriberToken`, `getPrescriptionLinks`, `memedConfig` (Task 5); `missingMemedFields` (Task 3); `toMemedPatient` (Task 4).
- Produces:
  - `startPrescriptionAction(formData)` → `{ token: string; scriptUrl: string; patient: MemedPatient } | { error: string }`
  - `recordPrescriptionAction(formData)` → `string | null` (error message or null)

- [ ] **Step 1: Write the file**

Create `src/lib/actions-memed.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { sql } from "./db";
import type { Patient, Professional } from "./db";
import { requireSession } from "./auth";
import { memedConfig, getOrCreatePrescriberToken, getPrescriptionLinks } from "./memed/client";
import { missingMemedFields } from "./memed/prescriber";
import { toMemedPatient, type MemedPatient } from "./memed/patient";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export type StartPrescriptionResult =
  | { token: string; scriptUrl: string; patient: MemedPatient }
  | { error: string };

/**
 * Só o próprio prescritor prescreve. A receita é assinada por uma pessoa com
 * registro no conselho, então admin NÃO pode prescrever em nome de ninguém —
 * é o único lugar do app onde admin não passa.
 */
export async function startPrescriptionAction(formData: FormData): Promise<StartPrescriptionResult> {
  const session = await requireSession();
  const config = memedConfig();
  if (!config) return { error: "Prescrição digital não está configurada nesta instalação." };
  if (!session.professionalId) {
    return { error: "Apenas o profissional com registro no conselho pode prescrever." };
  }

  const patientId = Number(str(formData, "patient_id"));
  if (!patientId) return { error: "Paciente inválido." };

  const [professional] = await sql<Professional>`
    SELECT * FROM professionals WHERE id = ${session.professionalId} AND active = 1`;
  if (!professional) return { error: "Profissional não encontrado ou inativo." };

  const missing = missingMemedFields(professional);
  if (missing.length > 0) {
    return { error: `Complete em Configurações → Profissionais: ${missing.join(", ")}.` };
  }

  const [patient] = await sql<Patient>`SELECT * FROM patients WHERE id = ${patientId}`;
  if (!patient) return { error: "Paciente não encontrado." };

  try {
    const token = await getOrCreatePrescriberToken(professional);
    return { token, scriptUrl: config.scriptUrl, patient: toMemedPatient(patient) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Falha ao falar com a Memed." };
  }
}

/**
 * Chamada no evento `prescricaoImpressa`. Idempotente por
 * `memed_prescription_id`, porque o evento pode disparar mais de uma vez.
 */
export async function recordPrescriptionAction(formData: FormData): Promise<string | null> {
  const session = await requireSession();
  if (!session.professionalId) return "Sessão sem profissional vinculado.";

  const prescriptionId = str(formData, "memed_prescription_id");
  const patientId = Number(str(formData, "patient_id"));
  const encounterId = Number(str(formData, "encounter_id")) || null;
  if (!prescriptionId || !patientId) return "Dados incompletos da receita.";

  const [existing] = await sql`
    SELECT id FROM memed_prescriptions WHERE memed_prescription_id = ${prescriptionId}`;
  if (existing) return null;

  const [professional] = await sql<Professional>`
    SELECT * FROM professionals WHERE id = ${session.professionalId}`;
  if (!professional) return "Profissional não encontrado.";

  // Os links são bônus: se a Memed não responder, gravamos a receita mesmo
  // assim. Perder o vínculo é pior que ficar sem o PDF por enquanto.
  let pdfUrl: string | null = null;
  let patientLink: string | null = null;
  try {
    const token = await getOrCreatePrescriberToken(professional);
    const links = await getPrescriptionLinks(prescriptionId, token);
    pdfUrl = links.pdfUrl;
    patientLink = links.patientLink;
  } catch {
    // Segue com os links nulos; a sincronização manual (Task 11) preenche depois.
  }

  await sql`
    INSERT INTO memed_prescriptions
      (encounter_id, patient_id, professional_id, memed_prescription_id, patient_link, pdf_url)
    VALUES (${encounterId}, ${patientId}, ${professional.id}, ${prescriptionId}, ${patientLink}, ${pdfUrl})
    ON CONFLICT (memed_prescription_id) DO NOTHING`;

  revalidatePath("/", "layout");
  return null;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit && npm run build`
Expected: both succeed. Nothing imports these yet.

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions-memed.ts
git commit -m "feat(memed): server actions for prescriber token and prescription recording"
```

---

### Task 8: Prescribe button client component

**Files:**
- Create: `src/components/memed/prescribe-button.tsx`

**Interfaces:**
- Consumes: `startPrescriptionAction`, `recordPrescriptionAction` (Task 7).
- Produces: `<PrescribeButton patientId={number} encounterId={number | null} />`

- [ ] **Step 1: Write the component**

Create `src/components/memed/prescribe-button.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { unstable_rethrow } from "next/navigation";
import { startPrescriptionAction, recordPrescriptionAction } from "@/lib/actions-memed";
import { Alert } from "@/components/alert";

declare global {
  interface Window {
    MdHub?: {
      command: { send: (module: string, command: string, payload: unknown) => Promise<unknown> };
      module: { show: (module: string) => Promise<unknown> };
      event: { add: (event: string, handler: (payload: unknown) => void) => void };
    };
  }
}

const MODULE = "plataforma.prescricao";
const SCRIPT_ID = "memed-sinapse-prescricao";

/** Resolve quando o MdHub existe: ou o script já carregou, ou esperamos o evento. */
function loadMemed(scriptUrl: string, token: string): Promise<void> {
  if (document.getElementById(SCRIPT_ID)) {
    return window.MdHub ? Promise.resolve() : waitForHub();
  }
  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.type = "text/javascript";
  script.src = scriptUrl;
  script.setAttribute("data-token", token);
  document.body.appendChild(script);
  return waitForHub();
}

/**
 * A doc manda esperar o evento de módulo carregado antes de qualquer comando.
 * Como o evento vive no próprio MdHub, fazemos poll curto até ele existir e só
 * então assinamos — com teto de 20s para não travar a UI para sempre.
 */
function waitForHub(): Promise<void> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + 20_000;
    const tick = () => {
      if (window.MdHub) {
        window.MdHub.event.add("moduloCarregado", () => resolve());
        // Alguns carregamentos disparam antes de assinarmos; resolve no timeout curto.
        setTimeout(resolve, 1_500);
        return;
      }
      if (Date.now() > deadline) {
        reject(new Error("A Memed não carregou. Verifique a conexão e tente de novo."));
        return;
      }
      setTimeout(tick, 200);
    };
    tick();
  });
}

export function PrescribeButton({
  patientId,
  encounterId,
}: {
  patientId: number;
  encounterId: number | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function open() {
    setError(null);
    startTransition(async () => {
      const form = new FormData();
      form.set("patient_id", String(patientId));

      let result;
      try {
        result = await startPrescriptionAction(form);
      } catch (err) {
        unstable_rethrow(err);
        setError("Não foi possível iniciar a prescrição.");
        return;
      }
      if ("error" in result) {
        setError(result.error);
        return;
      }

      try {
        await loadMemed(result.scriptUrl, result.token);
        const hub = window.MdHub;
        if (!hub) throw new Error("A Memed não carregou.");

        hub.event.add("prescricaoImpressa", (payload: unknown) => {
          const prescriptionId = extractPrescriptionId(payload);
          if (!prescriptionId) return;
          const record = new FormData();
          record.set("memed_prescription_id", prescriptionId);
          record.set("patient_id", String(patientId));
          if (encounterId) record.set("encounter_id", String(encounterId));
          // Sem webhook, este é o único aviso de que a receita existe.
          void recordPrescriptionAction(record);
        });

        await hub.command.send(MODULE, "setPaciente", result.patient);
        await hub.module.show(MODULE);
      } catch (err) {
        unstable_rethrow(err);
        setError(err instanceof Error ? err.message : "Falha ao abrir a Memed.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        disabled={isPending}
        className="btn btn-primary disabled:opacity-50"
      >
        {isPending ? "Abrindo…" : "Prescrever"}
      </button>
      {error ? <Alert>{error}</Alert> : null}
    </>
  );
}

/** O payload varia de formato entre versões; aceitamos as formas conhecidas. */
function extractPrescriptionId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const candidate =
    record.id ??
    (record.prescricao as Record<string, unknown> | undefined)?.id ??
    (record.data as Record<string, unknown> | undefined)?.id;
  return candidate === undefined || candidate === null ? null : String(candidate);
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit && npm run build`
Expected: both succeed.

- [ ] **Step 3: Commit**

```bash
git add src/components/memed/prescribe-button.tsx
git commit -m "feat(memed): client component to open the prescription module"
```

---

### Task 9: Wire it into the prontuário

**Files:**
- Modify: `src/app/(app)/pacientes/[id]/page.tsx`

**Interfaces:**
- Consumes: `PrescribeButton` (Task 8); `memedConfig` (Task 5); `MemedPrescription` type (Task 1).
- Produces: prescriptions visible in the patient page.

- [ ] **Step 1: Load the prescriptions and the config flag**

In the page's data loading, add:

```ts
const memedEnabled = memedConfig() !== null;
const memedPrescriptions = memedEnabled
  ? await sql<MemedPrescription>`
      SELECT * FROM memed_prescriptions
      WHERE patient_id = ${patient.id} AND status = 'emitida'
      ORDER BY id DESC`
  : [];
```

Import `memedConfig` from `@/lib/memed/client`, `PrescribeButton` from `@/components/memed/prescribe-button`, and add `MemedPrescription` to the type import from `@/lib/db`.

- [ ] **Step 2: Add the button to the clinical action bar**

Next to the existing "Receituário" action, render the Memed button only when configured, keeping the local A4 as the visible fallback:

```tsx
{memedEnabled ? (
  <PrescribeButton patientId={patient.id} encounterId={latestEncounter?.id ?? null} />
) : null}
```

- [ ] **Step 3: Show issued prescriptions**

Above the encounters timeline, add:

```tsx
{memedPrescriptions.length > 0 ? (
  <section className="mb-6">
    <SectionTitle>Receitas digitais</SectionTitle>
    <div className="card divide-y divide-pine-900/5">
      {memedPrescriptions.map((prescription) => (
        <div key={prescription.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
          <p className="text-sm text-pine-900/70">
            Emitida em {fmtDate(prescription.created_at.slice(0, 10))}
          </p>
          <div className="flex gap-2 text-xs font-bold">
            {prescription.pdf_url ? (
              <a href={prescription.pdf_url} target="_blank" rel="noopener noreferrer" className="text-pine-700 hover:underline">
                Abrir PDF
              </a>
            ) : null}
            {prescription.patient_link ? (
              <a href={prescription.patient_link} target="_blank" rel="noopener noreferrer" className="text-pine-700 hover:underline">
                Link do paciente
              </a>
            ) : null}
            {!prescription.pdf_url && !prescription.patient_link ? (
              <span className="text-pine-900/40">links pendentes — use Sincronizar</span>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  </section>
) : null}
```

- [ ] **Step 4: Verify in a browser (staging hours only)**

```bash
npx tsc --noEmit && npm run build
```

Set the staging env vars locally in `.env.local` (`MEMED_API_URL`, `MEMED_SCRIPT_URL`, `MEMED_API_KEY`, `MEMED_SECRET_KEY`), start `npx next start -p 3050`, sign in as a user whose `professional_id` points at a professional with complete Memed data, open that patient, and click **Prescrever**.

Expected: Memed's fullscreen module opens with the patient already filled in. Issue a test prescription, then confirm the row landed:

```sql
SELECT memed_prescription_id, pdf_url IS NOT NULL AS has_pdf FROM memed_prescriptions ORDER BY id DESC LIMIT 1;
```

If the module does not open, read the browser console before changing code — the most likely causes are a stale token, an unset env var, or staging being in its 00:00–06:00 window.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/pacientes/[id]/page.tsx"
git commit -m "feat(memed): prescribe from the prontuário and list issued prescriptions"
```

---

### Task 10: Manual reconciliation

**Files:**
- Modify: `src/lib/actions-memed.ts`, `src/app/(app)/pacientes/[id]/page.tsx`

**Interfaces:**
- Consumes: `listPrescriptions`, `getPrescriptionLinks` (Task 5).
- Produces: `syncPrescriptionsAction(formData)` → `string | null`.

This is what makes Phase 1 safe to ship without the Phase 2 cron: it recovers prescriptions whose browser event never reached us, and backfills links that failed the first time.

- [ ] **Step 1: Add the action**

Append to `src/lib/actions-memed.ts`:

```ts
import { listPrescriptions } from "./memed/client";

/**
 * Sem webhook, uma receita assinada some do nosso lado se o navegador fechar
 * antes do POST. Isto puxa a lista da Memed e reconcilia.
 */
export async function syncPrescriptionsAction(formData: FormData): Promise<string | null> {
  const session = await requireSession();
  if (!session.professionalId) return "Sessão sem profissional vinculado.";

  const patientId = Number(str(formData, "patient_id"));
  if (!patientId) return "Paciente inválido.";

  const [professional] = await sql<Professional>`
    SELECT * FROM professionals WHERE id = ${session.professionalId}`;
  if (!professional) return "Profissional não encontrado.";

  try {
    const token = await getOrCreatePrescriberToken(professional);
    const remote = await listPrescriptions(token);

    for (const prescription of remote) {
      if (!prescription.id) continue;
      const [known] = await sql<{ id: number; pdf_url: string | null }>`
        SELECT id, pdf_url FROM memed_prescriptions
        WHERE memed_prescription_id = ${prescription.id}`;
      if (known && known.pdf_url) continue;

      const links = await getPrescriptionLinks(prescription.id, token);
      if (known) {
        await sql`
          UPDATE memed_prescriptions
          SET pdf_url = ${links.pdfUrl}, patient_link = ${links.patientLink}
          WHERE id = ${known.id}`;
      } else {
        await sql`
          INSERT INTO memed_prescriptions
            (patient_id, professional_id, memed_prescription_id, patient_link, pdf_url)
          VALUES (${patientId}, ${professional.id}, ${prescription.id}, ${links.patientLink}, ${links.pdfUrl})
          ON CONFLICT (memed_prescription_id) DO NOTHING`;
      }
    }
  } catch (error) {
    return error instanceof Error ? error.message : "Falha ao sincronizar com a Memed.";
  }

  revalidatePath("/", "layout");
  return null;
}
```

⚠ Known limitation to state in the UI copy: `GET /prescricoes` returns the **prescriber's** recent prescriptions, not the patient's, so a newly discovered prescription is attributed to the patient whose page you synced from. That is why the button lives on the patient page and its label says so. Narrowing this properly needs the structured-document fields and belongs to Phase 2.

- [ ] **Step 2: Add the button**

In the "Receitas digitais" section from Task 9 Step 3, add a small client form that calls `syncPrescriptionsAction` with `patient_id` and surfaces the returned message via `Alert`, labelled **"Sincronizar receitas deste paciente"** with helper text `"Busca na Memed receitas emitidas por você que não apareceram aqui."`. Follow the same `useTransition` + `Alert` shape as `PrescribeButton` (Task 8) rather than a plain `<form action>`, so the error text renders inline.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit && npm run build`, then with staging configured: issue a prescription in Memed, delete the local row by hand (`DELETE FROM memed_prescriptions WHERE memed_prescription_id = '…'`), click Sincronizar, and confirm the row comes back with a PDF link.

- [ ] **Step 4: Commit**

```bash
git add src/lib/actions-memed.ts "src/app/(app)/pacientes/[id]/page.tsx"
git commit -m "feat(memed): manual reconciliation for prescriptions the event missed"
```

---

### Task 11: Environment, docs and knowledge base

**Files:**
- Modify: `README.md`; the Obsidian vault at `C:\Users\admin\Obsidian\Business\Medapp\`

- [ ] **Step 1: Set the env vars**

```bash
vercel env add MEMED_API_URL production --value "https://integrations.api.memed.com.br/v1"
vercel env add MEMED_SCRIPT_URL production --value "https://integrations.memed.com.br/modulos/plataforma.sinapse-prescricao/build/sinapse-prescricao.min.js"
vercel env add MEMED_API_KEY production --value "<key>"
vercel env add MEMED_SECRET_KEY production --value "<secret>"
```

Use `--value`. Never pipe from PowerShell — it injects a BOM and the value arrives corrupted.

- [ ] **Step 2: Verify the vars round-trip**

Run: `vercel env pull .env.vercel-check && grep -c MEMED .env.vercel-check && rm .env.vercel-check`
Expected: `4`.

- [ ] **Step 3: Update the vault**

In `Business\Medapp\`: mark the Memed item done in `Roadmap.md`; add the release to `Sessions.md`; record in `Quirks and gotchas.md` that the prescriber token is non-static and that Memed has no webhooks (so a lost browser event means a missing prescription); add the four env vars to `URLs and access.md`; note in `Pendings.md` that Phase 2 (cron reconciliation + prescription history) is still open, and that the DPA with Memed is a compliance prerequisite tied to the existing LGPD item.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs(memed): environment variables and setup notes"
```

---

## Self-Review

**Spec coverage:** Objetivo → Tasks 8–9. Verified API facts → Tasks 5, 8. "Somar, não substituir" → Task 9 Step 2 keeps the A4. "Atestado continua local" → untouched by design; no task modifies the atestado route. Fullscreen → Task 8 uses `MdHub.module.show`. "Só o próprio prescritor" → Task 7 rejects sessions without `professionalId`. Token per session → Task 5 always GETs first. `external_id` → Task 3. Prescriber data gap → Tasks 1, 2, 6. Modelo de dados → Task 1. Fluxo steps 1–7 → Tasks 7–9. Confiabilidade → Task 10. Env vars → Task 11. LGPD → Task 11 Step 3 (documentation only; the DPA is not a coding task). **Gap accepted:** `prescricaoExcluida` handling is in the spec's Fluxo step 7 but has no task — it belongs with Phase 2's history screen, and the `status` column exists for it. Stated here rather than silently dropped.

**Placeholder scan:** No TBDs. `<key>`/`<secret>` in Task 11 are values only the user holds. Task 6 Step 3 and Task 10 Step 2 describe edits in prose rather than full code because they extend existing ternary chains and reuse a shape given verbatim in Task 8 — both name the exact file, anchor, copy and component pattern.

**Type consistency:** `MemedPatient` defined in Task 4 and consumed in Task 7. `Professional` extended in Task 1 and used in Tasks 3, 5, 7. `missingMemedFields` consistent across Tasks 3, 6, 7. `getOrCreatePrescriberToken`/`getPrescriptionLinks`/`listPrescriptions` signatures identical in Tasks 5, 7, 10. `memed_prescription_id` is the unique key in Task 1's DDL and in Tasks 7 and 10.
