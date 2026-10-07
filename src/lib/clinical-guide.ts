import { ORIENTACOES } from "./document-library/orientacoes.ts";
import { RX_PROTOCOL_GROUPS } from "./rx-library/types.ts";
import type { RxProtocolGroup } from "./rx-library/types.ts";
import { RX_PROTOCOLS } from "./rx-library/protocols.ts";
import { ORIENTATION_CHANGES, RX_CHANGES } from "./rx-library/review.ts";
import history from "./rx-library/history.json" with { type: "json" };
import { CURRENT_REVISION, revisionLabel } from "./guide-revisions.ts";
import { protocolItems } from "./rx-suggestions.ts";
import type { PrescriptionItem } from "./prescription.ts";
import { conciseItems, headline, headlineLine } from "./revision-diff.ts";
import type { ConciseLine } from "./revision-diff.ts";
import type { RevisionHistory, RevisionSlide } from "./revision-slides.ts";
import { termsFor } from "./clinical-terms.ts";

/**
 * Guia clínico: as receitas prontas para consultar fora da ficha, cada uma
 * com a orientação ao paciente que combina com ela. É só leitura — emitir
 * continua sendo pela ficha (Emitir documento › Receituário › Receitas
 * prontas), onde tudo é revisado para aquele paciente.
 */

const ANTIBIOTICO = "Orientações — como tomar o antibiótico";
const IST = "Orientações — infecção sexualmente transmissível";
const URINA = "Orientações — infecção urinária";
const INTESTINO = "Orientações — diarreia e vômito";
const CABECA = "Orientações — dor de cabeça e enxaqueca";

/** Receita pronta → nome da orientação da biblioteca que vai junto. */
export const GUIDE_ORIENTATION: Readonly<Record<string, string>> = {
  "Resfriado / gripe": "Orientações — resfriado e gripe",
  "Faringoamigdalite bacteriana": ANTIBIOTICO,
  "Faringoamigdalite — penicilina benzatina": ANTIBIOTICO,
  "Sinusite bacteriana aguda": ANTIBIOTICO,
  "Otite média aguda": ANTIBIOTICO,
  "Pneumonia comunitária (ambulatorial)": ANTIBIOTICO,
  "Pneumonia comunitária com comorbidade": ANTIBIOTICO,
  "Cistite (ITU baixa não complicada)": URINA,
  "Cistite — fosfomicina dose única": URINA,
  "Pielonefrite (ambulatorial)": "Orientações — pielonefrite",
  "Cólica renal (cálculo)": "Orientações — cólica renal (pedra nos rins)",
  "Uretrite (gonococo e clamídia)": IST,
  "Sífilis recente": IST,
  "Sífilis tardia / duração ignorada": IST,
  "Tricomoníase": IST,
  "Herpes genital — primeiro episódio": "Orientações — herpes genital",
  "Herpes genital — recorrência": "Orientações — herpes genital",
  "Doença inflamatória pélvica (ambulatorial)": IST,
  "Orquiepididimite (IST)": IST,
  "Gastroenterite aguda": INTESTINO,
  "Náusea e vômitos": INTESTINO,
  "Diarreia aguda (sem sangue)": INTESTINO,
  "H. pylori — erradicação": ANTIBIOTICO,
  "Crise hemorroidária": "Orientações — hemorroidas",
  "Lombalgia aguda": "Orientações — dor nas costas (lombalgia)",
  "Cefaleia tensional": CABECA,
  "Crise de enxaqueca": CABECA,
  "Erisipela / celulite": ANTIBIOTICO,
  "Furúnculo / abscesso (após drenagem)": "Orientações — cuidados com o curativo",
  "Hipertensão — início": "Orientações — pressão alta (hipertensão)",
  "Diabetes tipo 2 — início": "Orientações — diabetes",
  "Colesterol alto": "Orientações — coração e vasos (risco cardiovascular)",
  "Ansiedade / depressão — início": "Orientações — início de antidepressivo",
  "Crise de asma leve": "Orientações — crise de asma",
  "Escabiose (sarna)": "Orientações — sarna e piolho",
  "Pediculose (piolho)": "Orientações — sarna e piolho",
  "Urticária aguda": "Orientações — urticária (alergia na pele)",
  "Dermatite de contato": "Orientações — cuidados com a pele",
  "Conjuntivite bacteriana": "Orientações — conjuntivite",
  "Dengue (sem sinais de alarme)": "Orientações — dengue",
};

export interface GuideEntry {
  name: string;
  cid: string;
  group: RxProtocolGroup;
  items: PrescriptionItem[];
  orientation: { name: string; text: string } | null;
  /** O que mudou, da revisão mais nova para a mais antiga, com a receita de antes e a de depois. */
  changes: GuideChange[];
  /** O carrossel embaixo da receita: a publicada e cada mudança depois; null se nunca mudou. */
  history: RevisionHistory | null;
  /** Por remédio da receita de agora: true se ele é diferente do original (vai com marca-texto). */
  marked: boolean[];
  /** Outros nomes da condição e sintomas, para a busca (clinical-terms.ts). */
  terms: { names: string[]; symptoms: string[] };
}

export interface GuideChange {
  rev: number;
  text: string;
  /** "orientacao": a mudança foi na orientação ao paciente; a receita ficou igual. */
  kind: "receita" | "orientacao";
  /** A receita antes desta revisão, uma linha por medicamento; null se a receita entrou nela. */
  before: string[] | null;
  after: string[];
  /** Mudança numa orientação compartilhada (nome do modelo): aparece em todas as receitas ligadas a ela. */
  template?: string;
  /** Só o que mudou, para o resumo: o trecho trocado em cada remédio, o que entrou e o que saiu. */
  concise: ConciseLine[];
}

/** "Amoxicilina 500 mg · 21 cápsulas — Tomar…": o formato de history.json. */
function itemLine(item: PrescriptionItem): string {
  return `${item.name} · ${item.quantity} — ${item.posology}`;
}

const SNAPSHOTS = history as Record<string, Record<string, string[]>>;

/** As mudanças de uma receita, com as fotos de history.json (a revisão atual usa a receita de agora). */
export function protocolChanges(name: string, current: string[]): GuideChange[] {
  return [...(RX_CHANGES[name] ?? [])]
    .sort((a, b) => b.rev - a.rev)
    .map((c) => {
      const prev = SNAPSHOTS[String(c.rev - 1)]?.[c.from ?? name] ?? null;
      const after = c.rev === CURRENT_REVISION ? current : (SNAPSHOTS[String(c.rev)]?.[name] ?? current);
      if (c.kind === "orientacao") {
        return { rev: c.rev, text: c.text, kind: "orientacao" as const, before: null, after, concise: [headlineLine(c.text, "Orientação")] };
      }
      const before = c.rev === 1 ? null : prev;
      const lines = before ? conciseItems(before, after) : [];
      return { rev: c.rev, text: c.text, kind: "receita" as const, before, after, concise: lines.length ? lines : [headlineLine(c.text)] };
    });
}

/** A orientação como o paciente lê, sem a linha do nome e com "a clínica" no lugar do campo. */
export function orientationText(body: string): string {
  return body
    .replace(/^Orientações para \{\{paciente\}\}\n+/, "")
    .replaceAll("{{clinica}}", "clínica")
    .replace(/\{\{[a-z_]+\}\}/g, "")
    .trim();
}

const ORIENTATION_BY_NAME = new Map(ORIENTACOES.map((t) => [t.name, t]));

/**
 * O histórico de uma receita para o carrossel: o original (a receita como foi
 * publicada em 30/09 — ou como entrou, se veio depois) e cada mudança das
 * revisões seguintes, da mais antiga para a mais nova.
 */
function recipeHistory(name: string, current: string[], changes: readonly GuideChange[]): { history: RevisionHistory | null; marked: boolean[] } {
  const names = [name, ...(RX_CHANGES[name] ?? []).flatMap((c) => (c.from ? [c.from] : []))];
  let originRev = CURRENT_REVISION;
  let origin = current;
  for (let rev = 1; rev < CURRENT_REVISION; rev++) {
    const lines = names.map((n) => SNAPSHOTS[String(rev)]?.[n]).find(Boolean);
    if (lines) {
      originRev = rev;
      origin = lines;
      break;
    }
  }
  const later = [...changes].filter((c) => c.rev > originRev).sort((a, b) => a.rev - b.rev);
  if (later.length === 0) return { history: null, marked: current.map(() => false) };
  const atOrigin = changes.filter((c) => c.rev <= originRev && !c.template).map((c) => headline(c.text));
  const slides: RevisionSlide[] = [
    {
      kind: "original",
      source: originRev === 1 ? "Receita pronta como foi publicada (30/09)" : `Receita como entrou na ${revisionLabel(originRev)}`,
      lines: origin,
      note: atOrigin.length ? `Na ${originRev === 1 ? "publicação" : revisionLabel(originRev)}: ${atOrigin.join(" ")}` : undefined,
    },
    ...later.map((c): RevisionSlide => ({ kind: "change", rev: c.rev, concise: c.concise, why: c.text, tone: "fix" })),
  ];
  return { history: { slides, alert: null }, marked: current.map((line) => !origin.includes(line)) };
}

export function guideEntries(): GuideEntry[] {
  return RX_PROTOCOLS.map((protocol) => {
    const template = ORIENTATION_BY_NAME.get(GUIDE_ORIENTATION[protocol.name] ?? "");
    const items = protocolItems(protocol);
    const lines = items.map(itemLine);
    const changes: GuideChange[] = [
      ...protocolChanges(protocol.name, lines),
      // Mudanças na orientação que acompanha a receita (registradas uma vez por orientação).
      ...(template ? (ORIENTATION_CHANGES[template.name] ?? []) : []).map((c) => ({
        rev: c.rev,
        text: `Na orientação ao paciente (${template!.title}): ${c.text}`,
        kind: "orientacao" as const,
        before: null,
        after: [] as string[],
        template: template!.name,
        concise: [headlineLine(c.text, "Orientação")],
      })),
    ].sort((a, b) => b.rev - a.rev);
    return {
      name: protocol.name,
      cid: protocol.cid,
      group: protocol.group,
      items,
      orientation: template ? { name: template.title, text: orientationText(template.body) } : null,
      changes,
      ...recipeHistory(protocol.name, lines, changes),
      terms: termsFor(protocol.name),
    };
  });
}

export const GUIDE_GROUPS = RX_PROTOCOL_GROUPS;
