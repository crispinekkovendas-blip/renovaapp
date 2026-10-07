import EmitDonePage from "../../../../../pacientes/[id]/emitir/pronto/page";
import { RouteSheet } from "@/components/documents/composer/sheet";

/**
 * Depois de emitir pelo pop-up, o "tudo certo" aparece no mesmo pop-up: o
 * médico vê que a tarefa terminou. Fechar leva à ficha, na aba Documentos.
 */
export default async function EmitDoneModal({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ids?: string; wa?: string }>;
}) {
  const { id } = await params;
  return (
    <RouteSheet closeHref={`/pacientes/${Number(id)}?aba=documentos`} label="Documentos emitidos">
      <EmitDonePage params={params} searchParams={searchParams} />
    </RouteSheet>
  );
}
