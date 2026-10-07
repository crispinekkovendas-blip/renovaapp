import { EmitScreen } from "./emit-screen";
import type { EmitQuery } from "./emit-screen";

/**
 * "Emitir documentos" como página inteira: o que abre num F5 ou num link
 * direto. Pela ficha, a mesma tela abre como pop-up (rota interceptada em
 * `@modal/(.)pacientes/[id]/emitir`).
 */
export default function EmitPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<EmitQuery>;
}) {
  return <EmitScreen params={params} searchParams={searchParams} presentation="page" />;
}
