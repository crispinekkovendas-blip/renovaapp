import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getPublicClinic, publicMetadata } from "@/lib/marketing-stats";
import { normalizeDocumentCode } from "@/lib/documents";
import { ValidateForm, ValidateShell } from "@/components/documents/validate-shell";

export async function generateMetadata(): Promise<Metadata> {
  const { name } = await getPublicClinic();
  return publicMetadata({
    title: "Validar documento",
    description: `Confira se um atestado, encaminhamento ou laudo emitido pela ${name} é verdadeiro.`,
    path: "/validar",
  });
}

/**
 * Página pública: digite o código do rodapé do documento. O formulário é GET
 * (`?codigo=`) e a página manda para /validar/<código>, que mostra o resultado.
 */
export default async function ValidatePage({
  searchParams,
}: {
  searchParams: Promise<{ codigo?: string; erro?: string }>;
}) {
  const { codigo, erro } = await searchParams;
  if (codigo !== undefined) {
    const code = normalizeDocumentCode(codigo);
    redirect(code ? `/validar/${code}` : "/validar?erro=formato");
  }

  const clinic = await getPublicClinic();

  return (
    <ValidateShell clinicName={clinic.name}>
      <ValidateForm error={erro} />
      <div className="mt-6 space-y-2 text-sm text-pine-900/65">
        <p>
          Todo atestado, encaminhamento, laudo e orientação emitido pela {clinic.name} sai com um código único e um QR.
          Aponte a câmera para o QR ou digite o código aqui.
        </p>
        <p>
          A resposta mostra só o essencial — tipo do documento, data, iniciais do paciente e quem assinou. Nada do
          conteúdo, nenhum dado pessoal.
        </p>
      </div>
    </ValidateShell>
  );
}
