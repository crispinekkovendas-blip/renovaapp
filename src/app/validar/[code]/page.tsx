import Link from "next/link";
import type { Metadata } from "next";
import { getPublicClinic, publicMetadata } from "@/lib/marketing-stats";
import { getDocumentByCode } from "@/lib/documents-db";
import {
  ATESTADO_SUBKIND_LABEL,
  DOCUMENT_KIND_LABEL,
  isAtestadoSubkind,
  normalizeDocumentCode,
  patientInitials,
} from "@/lib/documents";
import { fmtDate } from "@/lib/format";
import { ValidateForm, ValidateShell } from "@/components/documents/validate-shell";

/** Cada código é uma URL própria; nenhuma delas deve ir para o índice dos buscadores. */
export async function generateMetadata(): Promise<Metadata> {
  return publicMetadata({
    title: "Validar documento",
    description: "Resultado da validação de um documento emitido pela clínica.",
    path: "/validar",
    index: false,
  });
}

/**
 * Resultado da validação. Mostra só o que prova que o documento existe e vale:
 * clínica, tipo, data, iniciais do paciente e quem assinou. Nada do texto,
 * nem CPF, nem telefone. Código desconhecido → "não encontrado".
 */
export default async function ValidateCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }
  const code = normalizeDocumentCode(decoded);

  const [clinic, doc] = await Promise.all([getPublicClinic(), code ? getDocumentByCode(code) : Promise.resolve(null)]);

  if (!doc) {
    return (
      <ValidateShell clinicName={clinic.name}>
        <div className="card p-6 text-center" role="status">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-clay-100 text-clay-800">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7" aria-hidden>
              <path d="M12 8v5M12 16.5v.5" />
            </svg>
          </span>
          <p className="mt-5 font-display text-2xl font-semibold tracking-tight text-pine-950">Código não encontrado</p>
          <p className="mt-3 text-sm text-pine-900/60">
            Nenhum documento da {clinic.name} tem o código{" "}
            <span className="break-all font-mono font-bold text-pine-950">{code ?? decoded}</span>. Confira se digitou certo — o
            código não usa as letras O e I nem os números 0 e 1.
          </p>
        </div>
        <div className="mt-6">
          <ValidateForm defaultValue={code ?? ""} />
        </div>
      </ValidateShell>
    );
  }

  const revoked = Boolean(doc.revoked_at);
  const kindLabel =
    doc.kind === "atestado" && isAtestadoSubkind(doc.subkind) ? ATESTADO_SUBKIND_LABEL[doc.subkind] : DOCUMENT_KIND_LABEL[doc.kind];

  return (
    <ValidateShell clinicName={clinic.name}>
      <div className="card overflow-hidden">
        <div
          role="status"
          className={`px-5 py-5 sm:px-6 ${revoked ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-900"}`}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-70">Resultado</p>
          <p className="mt-1 font-display text-2xl font-semibold tracking-tight">
            {revoked ? `Documento revogado em ${fmtDate(doc.revoked_at)}` : "Documento válido"}
          </p>
          <p className="mt-1 text-sm opacity-80">
            {revoked
              ? "Este documento foi emitido pela clínica, mas não vale mais. Em caso de dúvida, fale com a clínica."
              : `Emitido pela ${clinic.name} e confere com o registro da clínica.`}
          </p>
        </div>
        <dl className="divide-y divide-pine-900/5 px-5 text-sm sm:px-6">
          {(
            [
              { label: "Código", value: doc.code, mono: true },
              { label: "Clínica", value: clinic.name },
              { label: "Documento", value: kindLabel },
              { label: "Emitido em", value: fmtDate(doc.issued_at) },
              { label: "Paciente", value: patientInitials(doc.patient_name) },
              {
                label: "Assinado por",
                value: [doc.professional_name, doc.professional_council].filter(Boolean).join(" · "),
              },
            ] satisfies { label: string; value: string; mono?: boolean }[]
          ).map(({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
            <div key={label} className="flex justify-between gap-4 py-3">
              <dt className="shrink-0 text-pine-900/50">{label}</dt>
              <dd className={`min-w-0 break-words text-right font-semibold text-pine-950 ${mono ? "font-mono tracking-wider" : ""}`}>{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <p className="mt-4 text-xs text-pine-900/50">
        Só as iniciais do paciente aparecem aqui: o conteúdo do documento é assunto entre ele e a clínica.
      </p>

      <p className="mt-6">
        <Link href="/validar" className="inline-flex min-h-11 items-center text-sm font-bold text-pine-700 hover:underline sm:min-h-0">
          Conferir outro código →
        </Link>
      </p>
    </ValidateShell>
  );
}
