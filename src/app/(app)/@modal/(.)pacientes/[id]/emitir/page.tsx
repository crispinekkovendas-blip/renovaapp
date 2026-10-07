import { EmitScreen } from "../../../../pacientes/[id]/emitir/emit-screen";
import type { EmitQuery } from "../../../../pacientes/[id]/emitir/emit-screen";

/**
 * O compositor aberto pela ficha: a mesma tela, como pop-up por cima dela.
 * Fechar guarda o rascunho e volta à ficha (emit-composer.tsx).
 */
export default function EmitModal({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<EmitQuery>;
}) {
  return <EmitScreen params={params} searchParams={searchParams} presentation="modal" />;
}
