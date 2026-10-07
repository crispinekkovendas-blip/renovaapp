import type { ReactNode } from "react";
import { blockHistory } from "@/lib/emergency-guide";
import type { GuideBlock } from "@/lib/emergency-guide";
import { RevisionCarousel } from "./revision-carousel";

/**
 * Um tópico do guia de plantão, na ordem da página. O texto já é o corrigido
 * pela revisão Renova. Cada trecho que mudou (ou ganhou aviso) vai com
 * marca-texto e, logo embaixo, o carrossel do histórico: o texto do PDF
 * primeiro, depois cada mudança. Aviso pendente aparece no carrossel como
 * "⚠ conferir", sempre visível.
 */
export function GuideTopicBody({ blocks, page }: { blocks: readonly GuideBlock[]; page: number }) {
  return (
    <div className="min-w-0 text-[14.5px] leading-relaxed [overflow-wrap:anywhere] text-pine-900/85">
      {blocks.map((block, i) => (
        <GuideBlockView key={i} block={block} page={page} />
      ))}
    </div>
  );
}

/** Recuo do carrossel para alinhar com o trecho de cima. */
const INDENT: Partial<Record<GuideBlock["k"], string>> = { text: "ml-4", strong: "ml-4", ped: "ml-4" };

function GuideBlockView({ block, page }: { block: GuideBlock; page: number }) {
  const history = blockHistory(block, page);
  const text: ReactNode = history ? <mark className="rev-mark">{block.t}</mark> : block.t;
  const carousel = history ? (
    <RevisionCarousel slides={history.slides} alert={history.alert} className={INDENT[block.k] ?? ""} />
  ) : null;
  switch (block.k) {
    case "sub":
      return (
        <>
          <h3 className="mt-6 mb-1 border-b border-pine-900/10 pb-1 text-[13px] font-extrabold tracking-wide text-pine-700 uppercase first:mt-0">
            {text}
          </h3>
          {carousel}
        </>
      );
    case "route":
      return (
        <>
          <div className="mt-3 text-xs font-semibold text-pine-900/50 italic">{text}</div>
          {carousel}
        </>
      );
    case "drug":
      return (
        <>
          <div className="mt-4 flex gap-2 text-[15px] leading-snug font-extrabold text-pine-950">
            <span aria-hidden className="mt-[7px] h-2 w-2 shrink-0 rounded-full bg-sun-400" />
            <span className="min-w-0">{text}</span>
          </div>
          {carousel}
        </>
      );
    case "drugnote":
      return (
        <>
          <div className="mt-2 font-semibold text-pine-800">{text}</div>
          {carousel}
        </>
      );
    case "strong":
      return (
        <>
          <div className="mt-1 pl-4 font-bold text-pine-950">{text}</div>
          {carousel}
        </>
      );
    case "ped":
      return (
        <>
          <div className="mt-1 ml-4 rounded-lg bg-sky-50 px-2.5 py-1 text-[13px] text-sky-950">
            <span className="mr-1.5 rounded bg-sky-100 px-1 text-[10px] font-extrabold tracking-wide text-sky-800 uppercase">
              Ped.
            </span>
            {text}
          </div>
          {carousel}
        </>
      );
    case "tip":
      return (
        <>
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[13.5px] text-amber-950">
            <span className="mr-1 font-extrabold">💡</span>
            {text}
          </div>
          {carousel}
        </>
      );
    case "plus":
      return (
        <div aria-label="associado a" className="my-1 pl-4 text-lg leading-none font-extrabold text-pine-400">
          +
        </div>
      );
    case "grid":
      return (
        <>
          <figure className="mt-4">
            <figcaption className="mb-2 text-xs font-bold text-pine-900/60">{text}</figcaption>
            <div className="scroll-x rounded-xl border border-pine-900/10">
              <table className="w-full min-w-[36rem] border-collapse text-left text-[12.5px]">
                <tbody>
                  {(block.rows ?? []).map((row, r) => (
                    <tr key={r} className={r === 0 ? "bg-pine-50 font-bold text-pine-900" : "border-t border-pine-900/10"}>
                      {row.map((cell, c) => (
                        <td key={c} className={`px-2.5 py-2 align-top ${c === 0 ? "font-bold text-pine-950" : ""}`}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </figure>
          {carousel}
        </>
      );
    default:
      return (
        <>
          <div className="mt-1 pl-4">{text}</div>
          {carousel}
        </>
      );
  }
}
