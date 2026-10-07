import { installLibraryAction } from "@/lib/actions-documents";
import { DOCUMENT_LIBRARY, libraryByGroup } from "@/lib/document-library";

/** Convite para instalar os modelos prontos que ainda não viraram modelos da clínica. */
export function LibraryBanner({ clinicNames, missing }: { clinicNames: ReadonlySet<string>; missing: number }) {
  const total = DOCUMENT_LIBRARY.length;
  return (
    <section className="xl:col-span-2">
      <div className="card border-peach-200 bg-peach-100/40 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-extrabold text-pine-950">{total} modelos prontos para instalar</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-pine-900/70">
              Atestados, declarações, encaminhamentos, relatórios e orientações ao paciente já
              escritos, com os campos que se preenchem sozinhos. Entram como modelos{" "}
              <strong>da clínica</strong> e podem ser editados ou apagados depois.
            </p>
            <p className="mt-2 text-xs text-pine-900/55">
              {missing === total ? "Nenhum deles está instalado ainda." : `${total - missing} já instalados; faltam ${missing}.`}{" "}
              Instalar de novo não sobrescreve o que você editou.
            </p>
          </div>
          <form action={installLibraryAction} className="w-full sm:w-auto">
            <button type="submit" className="btn btn-primary w-full justify-center whitespace-nowrap sm:w-auto">
              Instalar modelos prontos
            </button>
          </form>
        </div>

        <details className="group mt-4">
          <summary className="flex min-h-11 cursor-pointer list-none items-center text-xs font-bold text-pine-600 hover:underline sm:block sm:min-h-0 [&::-webkit-details-marker]:hidden">
            Ver o que será instalado
          </summary>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {libraryByGroup().map((group) => (
              <div key={group.group}>
                <p className="text-[11px] font-bold uppercase tracking-wider text-pine-900/45">
                  {group.group} · {group.items.length}
                </p>
                <ul className="mt-1 space-y-0.5">
                  {group.items.map((item) => (
                    <li key={item.name} className="text-[12.5px] text-pine-900/70">
                      {clinicNames.has(item.name) ? "✓ " : "• "}
                      {item.name}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </details>
      </div>
    </section>
  );
}
