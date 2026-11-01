import { EmitScreen } from "./emit-screen";
import type { EmitQuery } from "./emit-screen";

/**
 * "Emitir documentos": o compositor como telas do app, com voltar
 * (tipo → montar → nesta emissão → revisar). Antes abria como pop-up por cima
 * da ficha; agora é sempre esta página.
 */
export default function EmitPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<EmitQuery>;
}) {
  return <EmitScreen params={params} searchParams={searchParams} />;
}
