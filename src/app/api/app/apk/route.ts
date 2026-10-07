import { canUseGuide, requestSession } from "@/lib/request-session";
import { apkFile, apkReleases } from "@/lib/app-releases";

/**
 * Baixa o APK do app Android: o mais novo, ou `?v=1.0.10` para uma versão
 * anterior. Só para quem usa o guia (administrador e profissional), pela
 * sessão do site. O arquivo vem de `android-releases/` (ver app-releases.ts).
 */
export async function GET(request: Request) {
  const session = await requestSession(request);
  if (!session) return Response.redirect(new URL("/login", request.url), 303);
  if (!canUseGuide(session)) return Response.json({ error: "O app é para quem atende." }, { status: 403 });

  const releases = apkReleases();
  const wanted = new URL(request.url).searchParams.get("v");
  const release = wanted ? releases.find((r) => r.version === wanted) : releases[0];
  if (!release) return Response.json({ error: wanted ? `Versão ${wanted} não encontrada.` : "Nenhum APK disponível." }, { status: 404 });

  const file = apkFile(release);
  if (!file) return Response.json({ error: "O arquivo do APK não está neste servidor." }, { status: 404 });
  return new Response(new Uint8Array(file), {
    headers: {
      "content-type": "application/vnd.android.package-archive",
      "content-disposition": `attachment; filename="${release.fileName}"`,
      "content-length": String(file.length),
      "cache-control": "private, no-store",
    },
  });
}
