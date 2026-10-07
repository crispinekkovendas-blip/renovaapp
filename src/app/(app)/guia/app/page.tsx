import { headers } from "next/headers";
import { requireRole } from "@/lib/auth";
import { apkReleases } from "@/lib/app-releases";
import type { ApkRelease } from "@/lib/app-releases";
import { qrSvg } from "@/lib/qr-svg";
import { Accordion } from "@/components/ui";
import { GuideHeader } from "@/components/guide/guide-header";

export const metadata = { title: "App Android" };

const DOWNLOAD = "/api/app/apk";

function sizeMB(bytes: number): string {
  return `${(bytes / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}

function day(iso: string): string {
  return iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" }) : "";
}

/**
 * O app Android do Guia clínico sempre à mão: o APK mais novo (de
 * android-releases/, que o GitHub Actions atualiza ao publicar), as versões
 * anteriores e como instalar. No computador, um QR leva o celular a esta
 * página.
 */
export default async function AppAndroidPage() {
  await requireRole("admin", "profissional");
  const releases = apkReleases();
  const latest: ApkRelease | undefined = releases[0];
  const host = (await headers()).get("host");
  const pageUrl = host ? `${host.startsWith("localhost") ? "http" : "https"}://${host}/guia/app` : null;
  const qr = pageUrl ? await qrSvg(pageUrl, 160) : null;

  return (
    <div className="mx-auto max-w-3xl">
      <GuideHeader title="App Android">
        O Guia clínico no celular: receitas prontas, plantão e Drive sem internet, a mesma busca do site, a Super Inteligência e o
        “Escutar o paciente”. Entre com a mesma conta do site.
      </GuideHeader>

      {latest ? (
        <section className="card flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-pine-900/50">Versão mais nova</p>
            <p className="mt-1 text-xl font-extrabold text-pine-950">Guia Renova {latest.version}</p>
            <p className="mt-0.5 text-sm text-pine-900/60">
              {day(latest.publishedAt)} · {sizeMB(latest.size)} · Android 8 ou mais novo
            </p>
            <a href={DOWNLOAD} className="btn btn-primary mt-4 min-h-12 w-full sm:w-auto" download={latest.fileName}>
              Baixar o APK
            </a>
          </div>
          {qr ? (
            <div className="hidden shrink-0 flex-col items-center gap-1 sm:flex">
              <div className="rounded-xl bg-white p-2" dangerouslySetInnerHTML={{ __html: qr }} />
              <p className="max-w-40 text-center text-xs text-pine-900/50">No computador? Aponte a câmera do celular.</p>
            </div>
          ) : null}
        </section>
      ) : (
        <section className="card p-5 text-sm text-pine-900/70">
          <p>O download ainda não está disponível neste servidor. Peça ao administrador da clínica.</p>
        </section>
      )}

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-pine-900/50">Como instalar</h2>
        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-pine-900/80">
          <li>Abra esta página no celular (Android) e toque em “Baixar o APK”.</li>
          <li>Abra o arquivo baixado. Se o Android pedir, permita “instalar apps desta fonte” para o navegador ou o gerenciador de arquivos.</li>
          <li>Entre com o e-mail e a senha do Renova. O guia é baixado uma vez e depois abre sem internet.</li>
          <li>Versão nova: baixe aqui e instale por cima — não precisa desinstalar nem entrar de novo.</li>
        </ol>
      </section>

      {releases.length > 1 ? (
        <section className="mt-6">
          <Accordion title={`Versões anteriores (${releases.length - 1})`}>
            <ul className="divide-y divide-pine-900/10 text-sm">
              {releases.slice(1).map((r) => (
                <li key={r.version} className="flex items-center justify-between gap-3 py-2">
                  <span>
                    <span className="font-bold text-pine-950">{r.version}</span>{" "}
                    <span className="text-pine-900/60">· {day(r.publishedAt)}</span>
                  </span>
                  <a href={`${DOWNLOAD}?v=${encodeURIComponent(r.version)}`} className="font-bold text-pine-700 hover:underline">
                    Baixar
                  </a>
                </li>
              ))}
            </ul>
          </Accordion>
        </section>
      ) : null}
    </div>
  );
}
