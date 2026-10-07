import { Fragment } from "react";
import type { ReactNode } from "react";
import { isMarked, rxLines } from "@/lib/prescription-drive";
import type { DriveBlock, DriveEntry } from "@/lib/prescription-drive";

/** Markdown mínimo do Drive: **negrito** e *itálico*. */
export function Md({ text }: { text: string }): ReactNode {
  return text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g).map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={i} className="font-bold text-pine-950">{part.slice(2, -2)}</strong>;
    if (/^\*[^*]+\*$/.test(part)) return <em key={i}>{part.slice(1, -1)}</em>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

/**
 * Uma entrada do Drive revisado: a receita como sai no papel, depois criança,
 * cuidados e a fonte. O que mudou depois de o Drive entrar no app vai com
 * marca-texto (`marks`); o card original e cada mudança ficam no carrossel
 * embaixo da entrada.
 */
export function DriveEntryBody({ entry, marks = [] }: { entry: DriveEntry; marks?: readonly string[] }) {
  return (
    <div className="min-w-0 space-y-3 text-[14.5px] leading-relaxed [overflow-wrap:anywhere] text-pine-900/85">
      {entry.blocks.map((block, i) => (
        <DriveBlockView key={i} block={block} marks={marks} />
      ))}
      {entry.source ? (
        <p className="text-[12.5px] text-pine-900/55">
          <Marked on={isMarked(`Fonte: ${entry.source}`, marks)}>
            <b className="text-pine-900/70">Fonte:</b> <Md text={entry.source} />
          </Marked>
        </p>
      ) : null}
    </div>
  );
}

/** Marca-texto no trecho que mudou depois de o Drive entrar no app. */
function Marked({ on, children }: { on: boolean; children: ReactNode }) {
  return on ? <mark className="rev-mark">{children}</mark> : <>{children}</>;
}

function DriveBlockView({ block, marks }: { block: DriveBlock; marks: readonly string[] }) {
  switch (block.k) {
    case "rx":
      return <RxCard text={block.t} marks={marks} />;
    case "warn":
      return (
        <p className="rounded-xl border border-rose-200 bg-rose-50/70 px-3 py-2 text-[13.5px] text-rose-950">
          <span aria-hidden className="mr-1">⚠️</span>
          <Marked on={isMarked(block.t, marks)}>
            <Md text={block.t} />
          </Marked>
        </p>
      );
    case "ul":
    case "ol": {
      const List = block.k === "ol" ? "ol" : "ul";
      return (
        <List className={`space-y-1 pl-5 ${block.k === "ol" ? "list-decimal" : "list-disc"}`}>
          {block.items.map((item, i) => (
            <li key={i}>
              <Marked on={isMarked(item, marks)}>
                <Md text={item} />
              </Marked>
            </li>
          ))}
        </List>
      );
    }
    case "table":
      return (
        <div className="scroll-x rounded-xl border border-pine-900/10">
          <table className="w-full min-w-[34rem] border-collapse text-left text-[12.5px]">
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r} className={r === 0 ? "bg-pine-50 font-bold text-pine-900" : "border-t border-pine-900/10"}>
                  {row.map((cell, c) => (
                    <td key={c} className={`px-2.5 py-2 align-top ${c === 0 && r > 0 ? "font-bold text-pine-950" : ""}`}>
                      <Marked on={isMarked(cell, marks)}>
                        <Md text={cell} />
                      </Marked>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    default:
      return (
        <p>
          <Marked on={isMarked(block.t, marks)}>
            <Md text={block.t} />
          </Marked>
        </p>
      );
  }
}

/** A receita do .md como um receituário: cabeçalho da via, item, quantidade e posologia. */
function RxCard({ text, marks }: { text: string; marks: readonly string[] }) {
  const items = rxLines(text);
  return (
    <div className="rounded-2xl border border-pine-900/10 bg-white px-3.5 py-3 shadow-[0_1px_0_rgba(0,0,0,0.02)] sm:px-4">
      <ol className="space-y-2.5">
        {items.map((item, i) => {
          return (
            <li key={i}>
              {item.heading ? (
                <p className={`text-[11px] font-extrabold tracking-[0.1em] text-pine-700 uppercase ${i > 0 ? "mt-3" : ""}`}>{item.heading}</p>
              ) : null}
              {item.name ? (
                <div className="mt-1 flex gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-pine-100 text-[11px] font-extrabold text-pine-800">
                    {item.n}
                  </span>
                  <div className="min-w-0 text-sm">
                    <p className="font-bold text-pine-950">
                      <Marked on={isMarked(`${item.name} ${item.quantity ?? ""}`, marks)}>
                        {item.name}
                        {item.quantity ? <span className="font-semibold text-pine-900/45"> · {item.quantity}</span> : null}
                      </Marked>
                    </p>
                    {item.posology.map((line, k) =>
                      /^—\s*ou\s*—$/.test(line) ? (
                        <p key={k} className="my-1 text-[11px] font-extrabold tracking-[0.1em] text-pine-900/40 uppercase">
                          ou
                        </p>
                      ) : (
                        <p key={k} className="mt-0.5 leading-snug text-pine-900/70">
                          <Marked on={isMarked(line, marks)}>{line}</Marked>
                        </p>
                      )
                    )}
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
